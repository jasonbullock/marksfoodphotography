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
