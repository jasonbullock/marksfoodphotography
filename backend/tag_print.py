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

# Each QR module is this many dots. 6 still reads from arm's length and leaves
# real space between the two symbols - at 9 they sat close enough that a scanner
# aimed at one could pick up the other.
QR_MAGNIFICATION = 6
# A planning link is version 4 today, but a longer record id or a longer host
# pushes it higher, and the printer simply draws a bigger code. Space is reserved
# for version 6 so the layout below cannot be overrun by data that grew.
QR_MODULES_RESERVED = 41

# Everything below is derived so the gaps can be checked rather than trusted. The
# name is capped at two lines: a third ran into the QR.
NAME_TOP = 118
NAME_TEXT = 42
NAME_LINES = 2
NAME_LINE_SPACING = 8
NAME_BOTTOM = NAME_TOP + (NAME_LINES * (NAME_TEXT + NAME_LINE_SPACING))
QR_TOP = NAME_BOTTOM + 20
# Roughly an inch of clear label between the QR and the barcode, which is what
# stops a handheld scanner reading the wrong one.
QR_RESERVED = QR_MODULES_RESERVED * QR_MAGNIFICATION
CODE_TEXT = 46
CODE_TOP = QR_TOP + QR_RESERVED + 18
UPC_TEXT = 32
UPC_TOP = CODE_TOP + CODE_TEXT + 12
# Roughly an inch of clear label between the two symbols, which is what stops a
# handheld reading the wrong one.
BARCODE_TOP = UPC_TOP + UPC_TEXT + 76
BARCODE_HEIGHT = 90
FOOTER_TOP = BARCODE_TOP + BARCODE_HEIGHT + 30
FOOTER_LINE_HEIGHT = 30
FOOTER_TEXT = 28
FOOTER_LINES = 4
# A hand-written line at the foot. Fixed, so it is always in the same place on
# every tag whether or not the details above it are complete.
SHOT_DATE_TOP = FOOTER_TOP + (FOOTER_LINES * FOOTER_LINE_HEIGHT) + 10


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
    name = clean(tag.get("productName"), 60)
    code = clean(tag.get("marksId"), 20)
    storage = clean(tag.get("storage"), 40)
    arrival = clean(tag.get("arrival"), 40)
    received = clean(tag.get("received"), 40)
    upc = clean(tag.get("upc"), 24)
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
        f"^FO{MARGIN},{NAME_TOP}^FB{CONTENT_WIDTH},{NAME_LINES},{NAME_LINE_SPACING},L"
        f"^A0N,{NAME_TEXT},{NAME_TEXT}^FD{name or 'Unidentified merchandise'}^FS",
    ]

    if qr_url:
        # Centred by measuring the code rather than guessing: a QR carrying a
        # planning link is 33 modules square at this error level.
        # Centred on the reserved block rather than on the code's actual size,
        # which is not known until the printer renders it.
        lines.append(
            f"^FO{max(MARGIN, (LABEL_WIDTH_DOTS - QR_RESERVED) // 2)},{QR_TOP}"
            f"^BQN,2,{QR_MAGNIFICATION}^FDLA,{clean(qr_url, 512)}^FS"
        )

    lines.append(
        f"^FO{MARGIN},{CODE_TOP}^FB{CONTENT_WIDTH},1,0,C^A0N,{CODE_TEXT},{CODE_TEXT}^FD{code}^FS"
    )
    # The UPC sits under the code because that is the number a client asks about,
    # and it is often the only thing written on the box itself.
    if upc:
        lines.append(
            f"^FO{MARGIN},{UPC_TOP}^FB{CONTENT_WIDTH},1,0,C^A0N,{UPC_TEXT},{UPC_TEXT}^FD{upc}^FS"
        )
    lines.append(
        f"^FO{MARGIN},{BARCODE_TOP}^BY3,2,{BARCODE_HEIGHT}^BCN,{BARCODE_HEIGHT},N,N,N^FD{code}^FS"
    )

    y = FOOTER_TOP
    footer = [("Received", received), ("Storage", storage), ("Carrier", arrival), ("", quantity)]
    for label, value in footer:
        if not value:
            continue
        text = f"{label}: {value}" if label else value
        lines.append(
            f"^FO{MARGIN},{y}^FB{CONTENT_WIDTH},1,0,L^A0N,{FOOTER_TEXT},{FOOTER_TEXT}^FD{text}^FS"
        )
        y += FOOTER_LINE_HEIGHT

    # A ruled line for the shot date. Written on by hand at the bench, because the
    # date is only known once the shoot happens and nobody is reprinting a tag for it.
    lines.append(f"^FO{MARGIN},{SHOT_DATE_TOP}^A0N,26,26^FDShot^FS")
    lines.append(
        f"^FO{MARGIN + 70},{SHOT_DATE_TOP + 30}^GB{CONTENT_WIDTH - 70},2,2^FS"
    )

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
