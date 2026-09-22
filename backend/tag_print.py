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

# Dots per QR module. 5 reads fine from arm's length and leaves real space between
# the two symbols - at 9 they sat close enough that a scanner aimed at one could
# pick up the other. Longer data is drawn smaller rather than pushed off the label.
QR_MAX_MAGNIFICATION = 5
QR_MIN_MAGNIFICATION = 3

# Byte-mode capacity per QR version at the highest error correction level. The
# printer renders at high correction whatever the field data asks for - a printed
# tag came back with a 45-module code where the layout had reserved 41, and the
# Marks code landed inside it - so the space reserved is worked out at that level
# rather than at the level requested.
# Two versions of headroom on top of that. Measuring a printed tag against the
# label edges put the code at about 49 modules where the table says 45: the
# printer's automatic encoding is costing a version somewhere we cannot see, so
# the estimate is treated as a floor rather than an answer.
QR_VERSION_HEADROOM_MODULES = 8

QR_BYTE_CAPACITY_HIGH = (
    7, 14, 24, 34, 44, 58, 64, 84, 98, 119,
    137, 155, 177, 194, 220, 250, 280, 310, 338, 382,
)
# High correction is asked for in both places the printer might read it, so what
# is drawn matches what was reserved.
QR_ERROR_CORRECTION = "H"


def qr_modules_for(data):
    """How many modules across to allow for - deliberately more than the minimum."""
    length = len(str(data or "").encode("utf-8"))
    for version, capacity in enumerate(QR_BYTE_CAPACITY_HIGH, start=1):
        if length <= capacity:
            return 17 + (4 * version) + QR_VERSION_HEADROOM_MODULES
    # Past the table it is the largest code the format allows, which will not fit
    # the space and so is left off rather than printed too fine to read.
    return 17 + (4 * 40)


# The fixed part of the tag: everything above the QR is the same on every label.
# The name is capped at two lines - a third ran into the QR.
NAME_TOP = 118
NAME_TEXT = 36
NAME_LINES = 2
NAME_LINE_SPACING = 8
NAME_BOTTOM = NAME_TOP + (NAME_LINES * (NAME_TEXT + NAME_LINE_SPACING))
QR_TOP = NAME_BOTTOM + 20
CODE_TEXT = 40
UPC_TEXT = 28
CREATIVE_FORCE_TEXT = 24
BARCODE_HEIGHT = 90
RECEIVED_HEIGHT = 110
RECEIVED_TEXT = 30


def tag_layout(qr_url=""):
    """Where everything sits, measured down from the QR's real size.

    The QR grows with its data, so the blocks below it cannot be placed at fixed
    positions and hoped for. The code is sized to the space that is actually left
    once everything below it is accounted for, rather than the label being asked
    to stretch to fit the code.
    """
    below_the_qr = (
        18 + CODE_TEXT + 12 + UPC_TEXT + 90 + CREATIVE_FORCE_TEXT + 10 + BARCODE_HEIGHT + 30
        + RECEIVED_HEIGHT + 18 + 32
    )
    available = LABEL_HEIGHT_DOTS - QR_TOP - below_the_qr - 1
    modules = qr_modules_for(qr_url) if qr_url else 0
    magnification = min(QR_MAX_MAGNIFICATION, available // modules) if modules else 0
    # Below this the code is too fine to scan reliably off a tag, and a tag with no
    # QR is better than one carrying a code nobody can read.
    if magnification < QR_MIN_MAGNIFICATION:
        magnification = 0
    reserved = modules * magnification

    code_top = QR_TOP + reserved + (18 if reserved else 0)
    upc_top = code_top + CODE_TEXT + 12
    # Roughly an inch of clear label between the two symbols, which is what stops a
    # handheld scanner reading the wrong one.
    creative_force_top = upc_top + UPC_TEXT + 90
    barcode_top = creative_force_top + CREATIVE_FORCE_TEXT + 10
    footer_top = barcode_top + BARCODE_HEIGHT + 30
    # A hand-written line at the foot, always in the same place relative to the
    # details above it.
    shot_top = footer_top + RECEIVED_HEIGHT + 18
    return {
        "magnification": magnification,
        "qrReserved": reserved,
        "qrTop": QR_TOP,
        "codeTop": code_top,
        "upcTop": upc_top,
        "creativeForceTop": creative_force_top,
        "barcodeTop": barcode_top,
        "footerTop": footer_top,
        "shotTop": shot_top,
        "bottom": shot_top + 32,
    }


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
    received = clean(tag.get("received"), 40)
    upc = clean(tag.get("upc"), 24)
    quantity_received = clean(tag.get("quantityReceived"), 12)
    ship_to_thr3d = clean(tag.get("shipToThr3d"), 12)
    qr_url = clean(_http_url(tag.get("qrUrl")), 512)

    if not code:
        raise ValueError("A tag needs its Marks code.")

    layout = tag_layout(qr_url)

    lines = [
        "^XA",
        "^CI28",
        f"^PW{LABEL_WIDTH_DOTS}",
        f"^LL{LABEL_HEIGHT_DOTS}",
        "^LH0,0",
        "^FWN",
        # Client, loudest thing on the tag - it is how a shelf is scanned by eye.
        f"^FO{MARGIN},26^FB{CONTENT_WIDTH},1,0,L^A0N,52,52^FD{client or 'No client'}^FS",
        f"^FO{MARGIN},96^GB{CONTENT_WIDTH},3,3^FS",
        # Three lines is enough for the longest real product name; beyond that the
        # name is truncated rather than pushing the QR off the label.
        f"^FO{MARGIN},{NAME_TOP}^FB{CONTENT_WIDTH},{NAME_LINES},{NAME_LINE_SPACING},L"
        f"^A0N,{NAME_TEXT},{NAME_TEXT}^FD{name or 'Unidentified merchandise'}^FS",
    ]

    if qr_url and layout["magnification"]:
        # Centred on the code's own width, which is known now that the module count
        # is worked out rather than assumed.
        lines.append(
            f"^FO{max(MARGIN, (LABEL_WIDTH_DOTS - layout['qrReserved']) // 2)},{layout['qrTop']}"
            f"^BQN,2,{layout['magnification']},{QR_ERROR_CORRECTION}"
            f"^FD{QR_ERROR_CORRECTION}A,{qr_url}^FS"
        )

    lines.append(
        f"^FO{MARGIN},{layout['codeTop']}^FB{CONTENT_WIDTH},1,0,C^A0N,{CODE_TEXT},{CODE_TEXT}^FD{code}^FS"
    )
    # The UPC sits under the code because that is the number a client asks about,
    # and it is often the only thing written on the box itself.
    if upc:
        lines.append(
            f"^FO{MARGIN},{layout['upcTop']}^FB{CONTENT_WIDTH},1,0,C^A0N,{UPC_TEXT},{UPC_TEXT}^FD{upc}^FS"
        )
    lines.append(
        f"^FO{MARGIN},{layout['creativeForceTop']}^FB{CONTENT_WIDTH},1,0,C"
        f"^A0N,{CREATIVE_FORCE_TEXT},{CREATIVE_FORCE_TEXT}"
        f"^FDCreative Force Scan^FS"
    )
    lines.append(
        f"^FO{MARGIN},{layout['barcodeTop']}^BY3,2,{BARCODE_HEIGHT}^BCN,{BARCODE_HEIGHT},N,N,N^FD{code}^FS"
    )

    # Receiving age determines what should be shot or purged next, so it gets a
    # bordered block instead of being buried among handling details.
    lines.append(
        f"^FO{MARGIN},{layout['footerTop']}^GB{CONTENT_WIDTH},{RECEIVED_HEIGHT},2^FS"
    )
    lines.append(
        f"^FO{MARGIN + 12},{layout['footerTop'] + 10}^A0N,22,22^FDRECEIVED^FS"
    )
    lines.append(
        f"^FO{MARGIN + 12},{layout['footerTop'] + 36}^FB{CONTENT_WIDTH - 24},1,0,L"
        f"^A0N,{RECEIVED_TEXT},{RECEIVED_TEXT}^FD{received or 'Not recorded'}^FS"
    )
    quantity_text = f"Quantity received: {quantity_received or 'Not recorded'}"
    if ship_to_thr3d:
        quantity_text += f"   Ship to THR3D: {ship_to_thr3d}"
    lines.append(
        f"^FO{MARGIN + 12},{layout['footerTop'] + 76}^FB{CONTENT_WIDTH - 24},1,0,L"
        f"^A0N,22,22^FD{quantity_text}^FS"
    )

    # A ruled line for the shot date. Written on by hand at the bench, because the
    # date is only known once the shoot happens and nobody is reprinting a tag for it.
    lines.append(f"^FO{MARGIN},{layout['shotTop']}^A0N,24,24^FDShot date^FS")
    lines.append(
        f"^FO{MARGIN + 125},{layout['shotTop'] + 30}^GB{CONTENT_WIDTH - 125},2,2^FS"
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
