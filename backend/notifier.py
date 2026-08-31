"""Teams notifications for merchandise arrivals.

Posting is optional by design. A client with no webhook is simply not notified,
and a channel that is unreachable never stops a shipment being logged - the
merchandise has arrived either way, and receiving must not depend on Teams.

Microsoft Graph is deliberately not used: it needs tenant admin consent, which
SGS IT declined. A Power Automate "when a webhook request is received" flow needs
none - the channel owner creates it and hands over a URL.
"""
from datetime import datetime, timezone, timedelta

import requests

from config import Config as C

TIMEOUT_SECONDS = 10
# Beyond this the card is unreadable and Teams truncates it anyway.
MAX_LISTED_ITEMS = 12
# The studio is in Chicago and everyone reading this is too, so times are shown
# there rather than in the UTC the records are stored in.
STUDIO_UTC_OFFSETS = {"CST": timedelta(hours=-6), "CDT": timedelta(hours=-5)}
# A row of thumbnails reads at a glance; a wall of photos does not.
MAX_SHOWN_IMAGES = 6


def _fact(name, value):
    return {"title": name, "value": str(value)}


def _studio_time(value):
    """Render a stored UTC timestamp in the studio's own clock."""
    text = str(value or "").strip()
    if not text:
        return ""
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return text
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    utc = parsed.astimezone(timezone.utc)
    # Central daylight time runs from the second Sunday in March to the first in
    # November. Close enough to the rule without taking on a tz dependency.
    label = "CDT" if 3 <= utc.month <= 10 else "CST"
    local = utc + STUDIO_UTC_OFFSETS[label]
    return f"{local.strftime('%b %-d, %-I:%M %p')} {label}"


def _shipment_url(shipment_id):
    if not C.APP_BASE_URL or not shipment_id:
        return ""
    return f"{C.APP_BASE_URL}/shipments?shipmentId={shipment_id}"


def _planning_url(merchandise_id=""):
    if not C.APP_BASE_URL:
        return ""
    if merchandise_id:
        return f"{C.APP_BASE_URL}/planning?item={merchandise_id}"
    return f"{C.APP_BASE_URL}/planning"


def build_arrival_card(*, client_name, shipment_name, shipment_id, carrier, tracking,
                       received, items, image_urls=None):
    """An Adaptive Card describing one arrival, listing what came in."""
    listed = items[:MAX_LISTED_ITEMS]
    remaining = len(items) - len(listed)
    lines = []
    for item in listed:
        # Each line links at its own card, so the reader lands on the thing the
        # line describes rather than on the board to hunt for it.
        label, merchandise_id = item if isinstance(item, tuple) else (item, "")
        url = _planning_url(merchandise_id)
        lines.append(f"- [{label}]({url})" if url else f"- {label}")
    if remaining > 0:
        lines.append(f"- and {remaining} more")

    facts = [_fact("Client", client_name or "Unknown client")]
    if carrier or tracking:
        facts.append(_fact("Carrier", " ".join(part for part in [carrier, tracking] if part)))
    if received:
        facts.append(_fact("Received", _studio_time(received) or received))
    facts.append(_fact("Items", len(items)))

    body = [
        {"type": "TextBlock", "size": "Medium", "weight": "Bolder",
         "text": f"{len(items)} item{'' if len(items) == 1 else 's'} arrived at Walnut"},
        {"type": "FactSet", "facts": facts},
    ]
    if lines:
        body.append({"type": "TextBlock", "wrap": True, "text": "\n".join(lines)})

    shown_images = [url for url in (image_urls or []) if str(url or "").strip()][:MAX_SHOWN_IMAGES]
    if shown_images:
        body.append({
            "type": "ImageSet",
            "imageSize": "large",
            "images": [{"type": "Image", "url": url} for url in shown_images],
        })
        remaining_images = len([url for url in (image_urls or []) if str(url or "").strip()]) - len(shown_images)
        if remaining_images > 0:
            body.append({
                "type": "TextBlock", "isSubtle": True, "spacing": "None",
                "text": f"and {remaining_images} more photo{'' if remaining_images == 1 else 's'}",
            })

    actions = []
    shipment_url = _shipment_url(shipment_id)
    if shipment_url:
        actions.append({"type": "Action.OpenUrl", "title": "Open shipment", "url": shipment_url})
    planning_url = _planning_url()
    if planning_url:
        actions.append({"type": "Action.OpenUrl", "title": "Go to Planning", "url": planning_url})

    card = {
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": body,
    }
    if actions:
        card["actions"] = actions
    return {"type": "message", "attachments": [
        {"contentType": "application/vnd.microsoft.card.adaptive", "content": card},
    ]}


def post_arrival(webhook_url, card):
    """Returns (posted, detail). Never raises: a quiet channel is not an error here."""
    url = str(webhook_url or "").strip()
    if not url:
        return False, "No Teams webhook configured for this client."
    try:
        response = requests.post(url, json=card, timeout=TIMEOUT_SECONDS)
    except requests.RequestException as error:
        return False, f"Could not reach Teams: {error}"
    if response.status_code >= 400:
        return False, f"Teams rejected the notification ({response.status_code})."
    return True, "Posted to Teams."
