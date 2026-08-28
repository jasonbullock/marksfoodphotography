"""Recipient handling for the photo release.

Nothing is sent from here. Automated sending would need Microsoft Graph, which
needs tenant admin consent that SGS IT declined, so the release records the
rendered email and hands it to whoever released it. The recipient list is parsed
so the release view can address that email for them.
"""


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
