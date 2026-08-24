"""Reading Topco Structure Forms (the "Food Packaging Checklist" PDF).

The form is the first information Marks receives about incoming merchandise, and it
arrives by no fixed route. It is a fillable AcroForm, so values are read by field name
rather than by position or OCR.

This module only reads and proposes. Nothing here decides what work happens: the
deliverable in particular cannot be stated definitively by the form, so it is proposed
with its evidence attached and confirmed by a person in Planning.
"""

import re

# The same intent is spelled several ways across form versions, and each is a real
# dropdown option rather than an empty field.
PLACEHOLDERS = {"select", "marks to complete", "supplier to complete", ""}

# A SKU line is a description followed by its code. Prose in the same field has none,
# which is what separates the SKUs from the shipping instructions written beneath them.
SKU_LINE = re.compile(r"^(?P<name>.+?)\s+(?P<code>\d{12,14})\s*$")

MBOX = re.compile(r"\bMI\d{5,}\b", re.I)
WORKFRONT = re.compile(r"\b(\d{8})\b")
THR3D_MENTION = re.compile(r"\b(thr3d|th3rd|cgi)\b", re.I)

SCOPE_TO_REQUEST_TYPE = {
    "packaging & photography": "Pack only",
    "packaging, photo, ecomm image bundles": "Ecomm & Pack",
}


def answered(value):
    """A value the supplier actually filled in."""
    return str(value or "").strip().lower() not in PLACEHOLDERS


def clean(value):
    return str(value or "").strip()


def parse_sku_lines(raw):
    """Products declared in the SKU field, ignoring the prose around them.

    A form may list the same code twice — two samples of one SKU is a quantity, not a
    second product — so each code appears once.
    """
    skus = []
    seen = set()
    for line in re.split(r"[\r\n]+", str(raw or "")):
        match = SKU_LINE.match(line.strip())
        if not match:
            continue
        code = match.group("code")
        if code in seen:
            continue
        seen.add(code)
        skus.append({"name": match.group("name").strip(), "upc": code})
    return skus


def thr3d_evidence(fields):
    """The sentences suggesting Thr3d produces the eComm bundles.

    Never acted on automatically: splitting a shipment and sending part of it to
    Kentucky is physical and irreversible.
    """
    found = []
    for name, value in fields.items():
        for line in re.split(r"[\r\n]+", str(value or "")):
            line = line.strip()
            if line and THR3D_MENTION.search(line):
                found.append({"field": name, "text": line})
    return found


def propose_request_type(fields, has_thr3d_evidence):
    """An educated guess, to be confirmed in Planning.

    The form says eComm bundles are wanted but never who produces them, and that
    decides whether the shipment gets split.
    """
    scope = clean(fields.get("Scope"))
    studio = clean(fields.get("Studio"))
    scope_key = scope.lower() if answered(scope) else ""
    base = SCOPE_TO_REQUEST_TYPE.get(scope_key, "")

    if has_thr3d_evidence and base == "Ecomm & Pack":
        return "Pack & Thr3d", "eComm bundles are wanted and the form points to Thr3d."
    if not base and THR3D_MENTION.search(studio):
        return "Thr3d only", f"No scope stated and Studio is {studio!r}."
    if base:
        return base, f"Scope is {scope!r}."
    return "", "The form states no usable scope."


def parse_structure_form(fields):
    """One plan per form: shared header values, and a row per SKU."""
    project = clean(fields.get("Project"))
    mbox = MBOX.search(project)
    workfront = WORKFRONT.search(project)
    evidence = thr3d_evidence(fields)
    request_type, reason = propose_request_type(fields, bool(evidence))

    # The project string carries the identifiers inline. Showing the whole string
    # alongside the extracted numbers repeats them, so the readable name is separated.
    project_name = project
    for pattern in (MBOX, WORKFRONT):
        project_name = pattern.sub("", project_name)
    project_name = project_name.strip(" |-\u00a0\t\r\n").replace("  ", " ").strip()

    header = {
        "project": project,
        "projectName": project_name,
        "mboxNumber": mbox.group(0).upper() if mbox else "",
        "wkftJobNumber": workfront.group(1) if workfront else "",
        "supplier": clean(fields.get("Supplier")) if answered(fields.get("Supplier")) else "",
        "studio": clean(fields.get("Studio")) if answered(fields.get("Studio")) else "",
        "dateRequested": clean(fields.get("Date Requested")),
        "carrier": clean(fields.get("Shipping Provider")) if answered(fields.get("Shipping Provider")) else "",
        "tracking": clean(fields.get("Tracking Number")) if answered(fields.get("Tracking Number")) else "",
        "shipTo": clean(fields.get("Address")),
    }

    notes = [clean(fields.get(key)) for key in ("Sample Type", "eComm Samples", "Ingredients")]
    notes = [note for note in notes if answered(note)]

    rows = [
        {
            **header,
            "productName": sku["name"],
            "upc": sku["upc"],
            "requestTypeProposed": request_type,
            "requestTypeReason": reason,
            "ecommPhotoNotes": "\n".join(notes),
            "thr3dEvidence": evidence,
        }
        for sku in parse_sku_lines(fields.get("SKU Information"))
    ]

    return {"header": header, "rows": rows, "thr3dEvidence": evidence,
            "requestTypeProposed": request_type, "requestTypeReason": reason}


def extract_form_fields(source):
    """AcroForm values from a PDF path or file-like object.

    A PDF with no form fields is a scan or a flattened print. It is rejected rather
    than half-parsed, because guessing at an image is how bad product data is created.
    """
    from pypdf import PdfReader

    reader = PdfReader(source)
    fields = reader.get_fields() or {}
    if not fields:
        raise ValueError("This PDF has no form fields. It is likely a scan or a flattened print.")
    return {name: ("" if f.get("/V") is None else str(f.get("/V"))) for name, f in fields.items()}
