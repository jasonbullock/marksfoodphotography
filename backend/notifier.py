"""Teams notifications for merchandise arrivals.

Posting is optional by design. A client with no webhook is simply not notified,
and a channel that is unreachable never stops a shipment being logged - the
merchandise has arrived either way, and receiving must not depend on Teams.

Microsoft Graph is deliberately not used: it needs tenant admin consent, which
SGS IT declined. A Power Automate "when a webhook request is received" flow needs
none - the channel owner creates it and hands over a URL.
"""
import requests

from config import Config as C

TIMEOUT_SECONDS = 10
# Beyond this the card is unreadable and Teams truncates it anyway.
MAX_LISTED_ITEMS = 12


def _fact(name, value):
    return {"title": name, "value": str(value)}


def _shipment_url(shipment_id):
    if not C.APP_BASE_URL or not shipment_id:
        return ""
    return f"{C.APP_BASE_URL}/shipments?shipmentId={shipment_id}"


def _planning_url():
    return f"{C.APP_BASE_URL}/planning" if C.APP_BASE_URL else ""


def build_arrival_card(*, client_name, shipment_name, shipment_id, carrier, tracking, received, items):
    """An Adaptive Card describing one arrival, listing what came in."""
    listed = items[:MAX_LISTED_ITEMS]
    remaining = len(items) - len(listed)
    lines = [f"- {item}" for item in listed]
    if remaining > 0:
        lines.append(f"- and {remaining} more")

    facts = [_fact("Client", client_name or "Unknown client")]
    if carrier or tracking:
        facts.append(_fact("Carrier", " ".join(part for part in [carrier, tracking] if part)))
    if received:
        facts.append(_fact("Received", received))
    facts.append(_fact("Items", len(items)))

    body = [
        {"type": "TextBlock", "size": "Medium", "weight": "Bolder",
         "text": f"{len(items)} item{'' if len(items) == 1 else 's'} arrived"},
        {"type": "TextBlock", "spacing": "None", "isSubtle": True, "wrap": True,
         "text": shipment_name or "New shipment"},
        {"type": "FactSet", "facts": facts},
    ]
    if lines:
        body.append({"type": "TextBlock", "wrap": True, "text": "\n".join(lines)})

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
