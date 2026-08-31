"""Merchandise tags for a Zebra ZD621, 3x5 inches portrait.

A tag names the box in the terms the studio uses: the client at the top, the
Product it was matched to, and the code Marks minted for it. The QR opens that
item's planning card, so a scan answers "what is this and what happens next"
without anyone typing a number.

Layout is in dots at 203 dpi - 609 across, 1015 down - because that is what the
printer works in and converting at the edges only hides arithmetic errors.
"""
import re
import socket

DPI = 203
LABEL_WIDTH_DOTS = 609
LABEL_HEIGHT_DOTS = 1015
MARGIN = 24
CONTENT_WIDTH = LABEL_WIDTH_DOTS - (MARGIN * 2)

# Each QR module is this many dots. 7 still reads from arm's length and leaves
# real space between the two symbols - at 9 they sat close enough that a scanner
# aimed at one could pick up the other.
QR_MAGNIFICATION = 7
QR_MODULES = 33
QR_TOP = 270
# Roughly an inch of clear label between the QR and the barcode, which is what
# stops a handheld scanner reading the wrong one.
BARCODE_TOP = 690
BARCODE_HEIGHT = 90


class TagPrintError(Exception):
    pass


def clean(value, max_length):
    """ZPL has no escaping worth the name, so control characters are removed."""
    text = str(value or "").replace("^", " ").replace("~", " ").replace("\\", " ")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_length:
        return text
    return text[: max(0, max_length - 1)].rstrip() + "…"


def _http_url(value):
    text = str(value or "").strip()
    return text if re.match(r"^https?://", text) else ""


def build_merchandise_tag_zpl(tag):
    """One 3x5 portrait tag. Returns ZPL ready to send to the printer."""
    client = clean(tag.get("client"), 28)
    name = clean(tag.get("productName"), 90)
    code = clean(tag.get("marksId"), 20)
    storage = clean(tag.get("storage"), 40)
    arrival = clean(tag.get("arrival"), 40)
    quantity = clean(tag.get("quantity"), 12)
    qr_url = _http_url(tag.get("qrUrl"))

    if not code:
        raise ValueError("A tag needs its Marks code.")

    lines = [
        "^XA",
        "^CI28",
        f"^PW{LABEL_WIDTH_DOTS}",
        f"^LL{LABEL_HEIGHT_DOTS}",
        "^LH0,0",
        "^FWN",
        # Client, loudest thing on the tag - it is how a shelf is scanned by eye.
        f"^FO{MARGIN},26^FB{CONTENT_WIDTH},1,0,L^A0N,58,58^FD{client or 'No client'}^FS",
        f"^FO{MARGIN},96^GB{CONTENT_WIDTH},3,3^FS",
        # Three lines is enough for the longest real product name; beyond that the
        # name is truncated rather than pushing the QR off the label.
        f"^FO{MARGIN},118^FB{CONTENT_WIDTH},3,8,L^A0N,42,42^FD{name or 'Unidentified merchandise'}^FS",
    ]

    if qr_url:
        # Centred by measuring the code rather than guessing: a QR carrying a
        # planning link is 33 modules square at this error level.
        qr_dots = QR_MODULES * QR_MAGNIFICATION
        lines.append(
            f"^FO{max(MARGIN, (LABEL_WIDTH_DOTS - qr_dots) // 2)},{QR_TOP}"
            f"^BQN,2,{QR_MAGNIFICATION}^FDLA,{clean(qr_url, 512)}^FS"
        )

    lines.extend([
        f"^FO{MARGIN},{QR_TOP + (QR_MODULES * QR_MAGNIFICATION) + 30}"
        f"^FB{CONTENT_WIDTH},1,0,C^A0N,66,66^FD{code}^FS",
        f"^FO{MARGIN},{BARCODE_TOP}^BY3,2,{BARCODE_HEIGHT}^BCN,{BARCODE_HEIGHT},N,N,N^FD{code}^FS",
    ])

    y = BARCODE_TOP + BARCODE_HEIGHT + 40
    for line in [storage, arrival, quantity]:
        if not line:
            continue
        lines.append(f"^FO{MARGIN},{y}^FB{CONTENT_WIDTH},1,0,L^A0N,30,30^FD{line}^FS")
        y += 38

    lines.append("^XZ")
    return "\n".join(lines)


def send_zpl(zpl, host, port=9100, timeout=5):
    if not host:
        raise TagPrintError("No printer host configured.")
    try:
        with socket.create_connection((host, int(port)), timeout=timeout) as printer:
            printer.sendall(zpl.encode("utf-8"))
    except OSError as error:
        raise TagPrintError(f"Printer unreachable at {host}:{port}.") from error
