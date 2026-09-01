"""Reads from the Creative Force Gateway API.

The webhook tells us what changed as it happens; this asks what is true right
now. It is the better source for anything historical - a webhook only ever
carries events we were listening for, and the in-memory log does not survive a
restart, so cycle times and backfills have to come from here.

Client Credentials, because there is nobody at a keyboard when the dashboard
refreshes: the app acts as a registered application rather than on behalf of a
signed-in person.

    CREATIVE_FORCE_CLIENT_ID / CREATIVE_FORCE_CLIENT_SECRET  in backend/.env
    and in Render's environment. Never in a VITE_ variable - those are compiled
    into the public bundle.

Without credentials every call raises CreativeForceNotConfigured, which callers
treat as "fall back to what we already store" rather than as a failure.
"""
import threading
import time

import requests

from config import Config as C

TIMEOUT_SECONDS = 20
# The gateway allows 20 requests per second per IP. A dashboard nowhere near
# that, but a backfill would be, so requests are spaced rather than trusted to
# stay polite on their own.
MIN_SECONDS_BETWEEN_CALLS = 0.06
# Tokens last an hour; renewing a minute early avoids losing a race with a call
# already in flight.
TOKEN_EXPIRY_MARGIN_SECONDS = 60


class CreativeForceError(Exception):
    pass


class CreativeForceNotConfigured(CreativeForceError):
    pass


_token = {"value": "", "expires_at": 0.0}
_token_lock = threading.Lock()
_last_call_at = 0.0
_call_lock = threading.Lock()


def configured():
    return bool(C.CREATIVE_FORCE_CLIENT_ID and C.CREATIVE_FORCE_CLIENT_SECRET)


def reset_token():
    """Forget the cached token - used when the gateway rejects it."""
    with _token_lock:
        _token["value"] = ""
        _token["expires_at"] = 0.0


def _fetch_token():
    response = requests.post(
        C.CREATIVE_FORCE_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "scope": "cfgateway",
            "client_id": C.CREATIVE_FORCE_CLIENT_ID,
            "client_secret": C.CREATIVE_FORCE_CLIENT_SECRET,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code >= 400:
        # Deliberately without the body: a failed token response can echo the
        # request back, and the secret is in the request.
        raise CreativeForceError(
            f"Creative Force refused the credentials ({response.status_code})."
        )
    payload = response.json()
    value = str(payload.get("access_token") or "")
    if not value:
        raise CreativeForceError("Creative Force returned no access token.")
    expires_in = float(payload.get("expires_in") or 3600)
    return value, time.time() + max(0.0, expires_in - TOKEN_EXPIRY_MARGIN_SECONDS)


def access_token():
    """A valid token, fetched once and reused until it is nearly expired."""
    if not configured():
        raise CreativeForceNotConfigured("No Creative Force API credentials are set.")
    with _token_lock:
        if _token["value"] and time.time() < _token["expires_at"]:
            return _token["value"]
        value, expires_at = _fetch_token()
        _token["value"] = value
        _token["expires_at"] = expires_at
        return value


def _throttle():
    global _last_call_at
    with _call_lock:
        wait = MIN_SECONDS_BETWEEN_CALLS - (time.time() - _last_call_at)
        if wait > 0:
            time.sleep(wait)
        _last_call_at = time.time()


def get(path, params=None, _retrying=False):
    """One GET against the gateway, returning parsed JSON."""
    _throttle()
    url = f"{C.CREATIVE_FORCE_API_BASE.rstrip('/')}/{str(path).lstrip('/')}"
    response = requests.get(
        url,
        params=params or {},
        headers={"Authorization": f"Bearer {access_token()}", "Accept": "application/json"},
        timeout=TIMEOUT_SECONDS,
    )
    if response.status_code in (401, 403) and not _retrying:
        # The token may have been revoked or expired early. Worth one retry with
        # a fresh one before deciding the credentials are wrong.
        reset_token()
        return get(path, params=params, _retrying=True)
    if response.status_code == 429:
        raise CreativeForceError("Creative Force rate limit reached; try again shortly.")
    if response.status_code >= 400:
        raise CreativeForceError(f"Creative Force returned {response.status_code} for {path}.")
    try:
        return response.json()
    except ValueError as error:
        raise CreativeForceError(f"Creative Force returned a non-JSON body for {path}.") from error


def to_iso(value):
    """Gateway timestamps are Unix milliseconds in UTC; everything here is ISO."""
    try:
        millis = float(value)
    except (TypeError, ValueError):
        return ""
    if millis <= 0:
        return ""
    from datetime import datetime, timezone
    return datetime.fromtimestamp(millis / 1000, tz=timezone.utc).isoformat()


def to_millis(value):
    """The other direction, for date filters the gateway expects in its own units."""
    from datetime import datetime, timezone
    if isinstance(value, datetime):
        moment = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        return int(moment.timestamp() * 1000)
    try:
        parsed = datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except ValueError:
        return None
    if not parsed.tzinfo:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return int(parsed.timestamp() * 1000)


# ── Reading our own corner of the studio ────────────────────────────────────
# Every Marks Food product lives under one job, so that job is the root of every
# read here. The studio holds eleven other workspaces and hundreds of thousands
# of productions; none of them are ours.

_production_types = {"at": 0.0, "value": {}}
# Production types are studio configuration - they change when someone adds a new
# kind of shoot, which is not often.
PRODUCTION_TYPE_CACHE_SECONDS = 600


def production_types():
    """{id: name} for every production type, e.g. {1031: "Packaging", 1032: "Ecomm"}."""
    if _production_types["value"] and time.time() - _production_types["at"] < PRODUCTION_TYPE_CACHE_SECONDS:
        return _production_types["value"]
    page = get("productiontypes", {"pageSize": 200})
    value = {
        int(row.get("productionTypeId")): str(row.get("productionTypeName") or "")
        for row in page.get("pageData", []) if row.get("productionTypeId") is not None
    }
    _production_types.update({"at": time.time(), "value": value})
    return value


def step_name(step_id):
    """A step's name, or its id when nobody has told us what it is called."""
    try:
        number = int(step_id)
    except (TypeError, ValueError):
        return str(step_id or "")
    return C.CREATIVE_FORCE_STEP_NAMES.get(number) or f"Step {number}"


def _pages(path, params=None, page_size=100, limit=2000):
    """Every page of a listing, stopping at a limit rather than running forever."""
    collected = []
    page_number = 1
    while len(collected) < limit:
        page = get(path, {**(params or {}), "pageNumber": page_number, "pageSize": page_size})
        rows = page.get("pageData") if isinstance(page, dict) else page
        if not rows:
            break
        collected.extend(rows)
        if len(rows) < page_size:
            break
        page_number += 1
    return collected[:limit]


def job(job_code=None):
    """The job our products are created under, by its code."""
    wanted = str(job_code or C.CREATIVE_FORCE_JOB_CODE or "").strip()
    for row in _pages("jobs", page_size=100):
        if str(row.get("jobCode") or "").strip() == wanted:
            return row
    return None


def products(job_id):
    return _pages("products", {"jobId": job_id})


def work_units_for_product(product_id):
    """Every production Creative Force built for one product, disabled ones included."""
    rows = get("workunits/get-production-state", {"productId": product_id})
    return rows if isinstance(rows, list) else []


def work_unit(work_unit_id):
    """One production with its step timeline."""
    return get(f"workunits/{work_unit_id}")


def job_status_overview(job_id):
    rows = get(f"jobs/{job_id}/get-job-status-overview")
    return rows if isinstance(rows, list) else []


def _step_timeline(raw_steps):
    """Each step as ready / started / finished, in the order the gateway gave them."""
    timeline = []
    for step in raw_steps or []:
        ready = to_iso(step.get("readyToStartDatetimeUtc"))
        started = to_iso(step.get("startedDatetimeUtc"))
        finished = to_iso(step.get("finishedDatetimeUtc"))
        timeline.append({
            "stepId": step.get("stepId"),
            "step": step_name(step.get("stepId")),
            "taskId": step.get("taskId", ""),
            "stepStatusId": step.get("stepStatusId"),
            "readyAt": ready,
            "startedAt": started,
            "finishedAt": finished,
            # Waiting and working are different problems: one is a queue, the other
            # is the work itself, and a single "time in step" hides which it was.
            "waitedSeconds": _elapsed(ready, started),
            "workedSeconds": _elapsed(started, finished),
        })
    return timeline


def _elapsed(start, end):
    if not start or not end:
        return None
    first, last = to_millis(start), to_millis(end)
    if first is None or last is None or last < first:
        return None
    return round((last - first) / 1000)


def production_snapshot(job_code=None):
    """Every product in our job with its productions and their step timelines.

    One call per product and one per production, which is fine at our volume and
    would not be at the studio's - the gateway allows 20 requests a second and this
    walks the job rather than filtering server-side.
    """
    found = job(job_code)
    if not found:
        return {"job": None, "products": []}

    types = production_types()
    rows = []
    for product in products(found["jobId"]):
        entry = {
            "productId": product.get("productId", ""),
            "productCode": product.get("productCode", ""),
            "productName": product.get("productName", ""),
            "category": (product.get("category") or {}).get("categoryName", ""),
            "styleGuide": (product.get("styleGuide") or {}).get("styleGuideName", ""),
            "createdAt": to_iso(product.get("productCreatedDateUtc")),
            "displayImages": product.get("productDisplayImages") or [],
            "productions": [],
        }
        for unit in work_units_for_product(entry["productId"]):
            detail = work_unit(unit.get("workUnitId")) or {}
            timeline = _step_timeline(detail.get("steps"))
            current = next((step for step in timeline if not step["finishedAt"]), None)
            shot = next(
                (step["finishedAt"] for step in timeline
                 if step["stepId"] == C.CREATIVE_FORCE_SHOOT_STEP_ID and step["finishedAt"]),
                "",
            )
            entry["productions"].append({
                "workUnitId": unit.get("workUnitId", ""),
                "productionType": unit.get("productionTypeName")
                or types.get(unit.get("productionTypeId"), ""),
                "isDisabled": bool(unit.get("isDisabled")),
                "statusId": detail.get("workUnitStatusId"),
                "currentStep": (current or {}).get("step", ""),
                "currentStepSince": (current or {}).get("readyAt", ""),
                "shotAt": shot,
                "steps": timeline,
            })
        rows.append(entry)
    return {"job": {"jobId": found["jobId"], "jobCode": found.get("jobCode", "")}, "products": rows}
