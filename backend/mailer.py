"""Photo release email delivery through Microsoft Graph.

Sending is optional by design. With no credentials configured the release still
records the rendered email on the Activation and reports that nothing was sent,
because a mail outage must never stop merchandise moving to photo.
"""
import requests

from config import Config as C

GRAPH_SCOPE = "https://graph.microsoft.com/.default"
TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
SEND_URL = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"


def parse_recipients(value):
    """Split a recipient field written as lines, commas or semicolons."""
    text = str(value or "")
    for separator in (";", "\n", "\r"):
        text = text.replace(separator, ",")
    seen, recipients = set(), []
    for candidate in (part.strip() for part in text.split(",")):
        # A bare token without "@" is a typo, not an address worth attempting.
        if not candidate or "@" not in candidate:
            continue
        key = candidate.lower()
        if key in seen:
            continue
        seen.add(key)
        recipients.append(candidate)
    return recipients


def _access_token():
    response = requests.post(
        TOKEN_URL.format(tenant=C.MS_GRAPH_TENANT_ID),
        data={
            "client_id": C.MS_GRAPH_CLIENT_ID,
            "client_secret": C.MS_GRAPH_CLIENT_SECRET,
            "scope": GRAPH_SCOPE,
            "grant_type": "client_credentials",
        },
        timeout=20,
    )
    response.raise_for_status()
    return response.json().get("access_token", "")


def send_photo_release_email(subject, body_html, recipients):
    """Send one release email. Returns (sent, detail)."""
    if not C.photo_release_email_ready():
        return False, "Email is not configured, so nothing was sent."
    if not recipients:
        return False, "This client has no photo release recipients."
    if not subject or not body_html:
        return False, "The release has no rendered email to send."

    token = _access_token()
    response = requests.post(
        SEND_URL.format(sender=C.PHOTO_RELEASE_FROM_ADDRESS),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={
            "message": {
                "subject": subject,
                "body": {"contentType": "HTML", "content": body_html},
                "toRecipients": [{"emailAddress": {"address": address}} for address in recipients],
            },
            "saveToSentItems": True,
        },
        timeout=30,
    )
    response.raise_for_status()
    return True, f"Sent to {', '.join(recipients)}."
