# Structure Form Ingest

**Status:** proposed
**Date:** 2026-08-21

## What a Structure Form is

The Topco "Food Packaging Checklist" PDF is the first information Marks receives about
incoming merchandise — usually before the box arrives. It states what is coming, who is
sending it, what work is wanted, and which studio should do it.

It arrives by no fixed route: a Teams chat, an email, or printed inside the shipment
itself. There is no integration to build against. The only reliable assumption is that
someone has a file and wants it in the system.

Today a person reads it and types the contents into a tracker by hand.

## Why it is tractable

The form is a fillable AcroForm with 22 named fields. Values are read by name, not by
position or OCR:

| Form field | Example | Airtable destination |
| --- | --- | --- |
| `SKU Information` → name | `VEG CAN SAUERKRAUT 14.5 OZ` | `Products.Product Name` |
| `SKU Information` → code | `036800441897` | `Products.UPC` |
| `Scope` | `Packaging, Photo, eComm Image Bundles` | `Products.Request Type` |
| `Project` → code | `MI002238` | `Products.Mbox Number` |
| `Studio` | `Walnut` | `Products.Studio Destination` |
| `Supplier` | `Great Lakes Kraut, Co.` | `Products.Vendor` |
| `Sample Type`, `eComm Samples`, `Ingredients` | `In final packaging only; include product fill` | `Products.Ecomm Photo Notes` |
| `Photo Samples` | `6-7` | Expected quantity — belongs to the Shipment, not the Product |
| `Shipping Provider`, `Tracking Number` | *Supplier to complete* | `Shipments.Carrier`, `Shipments.Tracking` |
| `Date Requested` | `August 4, 2026` | No field exists |
| `Project` → name | `FC Sauerkraut GLK` | No field exists; `Reference Data` can hold it |

`Studio Destination` and `Vendor` already exist on Products and are unused by any code
path. They are not dead columns — this is what they are for.

## What the scope actually describes

Two workstreams exist: **Packaging Photography** and **Ecomm Bundles**. Ecomm Bundles are
produced either by Walnut photographing them or by Thr3d 3D-scanning them in Florence KY.
Never both — it is one or the other.

That yields three real outcomes:

| Outcome | Merchandise goes | Walnut's involvement |
| --- | --- | --- |
| Packaging only | Walnut | Shoots packaging |
| Packaging + Ecomm, both at Walnut | Walnut | Shoots both |
| Packaging + Ecomm by Thr3d | Split: some kept, rest to Florence | Shoots packaging only |
| Thr3d only | Direct to Florence | None. Not Walnut's work at all |

Thr3d-only items may appear on the Topco master sheet, but no Walnut action follows from
them. Shipments arrive consolidated at Walnut because Topco is consolidating freight, so
a single shipment can contain items destined to be split.

The split case is already modelled: Planning offers a quantity split between Packaging and
THR3D when both are selected.

## The form cannot state this definitively

`Scope` says eComm Image Bundles are wanted. It never says who produces them, which is the
distinction that decides whether merchandise is split and partly shipped onward.

Four real forms, and no field separates them:

| Form | Scope | Studio | Thr3d hint |
| --- | --- | --- | --- |
| Ice Cream | Packaging & Photography | Walnut | no |
| Pasta | Packaging, Photo, eComm Image Bundles | Walnut | note in SKU field |
| Sauerkraut | Packaging, Photo, eComm Image Bundles | Walnut | note in SKU field |
| Shortbread | *no Scope field* | CGI | Studio value |

The `Address` field does not help. All four ship to 1918 W. Walnut, Chicago — including
the one addressed to "SGS & Co. / Sierra Studio, Attn: Debbie Mack", which is Walnut under
a legacy name. Sierra was a photo division Walnut absorbed and its team is now part of
Walnut; those addresses and contacts are historical, not a separate destination.

Three further obstacles:

**There are two templates.** One has 22 fields, the other 15 and no `Scope` field at all.

**`Studio` is not uniform.** A dropdown on two forms (`Toronto`, `Walnut`, `Wacker`), free
text on a third where someone typed `CGI`.

**Placeholders vary.** `Select`, `Marks to complete` and `Supplier to complete` all mean
unanswered, and differ between templates.

These forms are archaic and unlikely to be improved. The importer has to work with them as
they are.

## The educated guess

The importer proposes a Request Type and shows its reasoning. It never decides.

| Evidence | Proposal |
| --- | --- |
| `Packaging & Photography` | `Pack only` |
| `Packaging, Photo, eComm Image Bundles`, no Thr3d hint | `Ecomm & Pack` |
| Same, with a Thr3d or CGI hint anywhere in the form | `Pack & Thr3d` — expect a split |
| No packaging, Thr3d or CGI indicated | `Thr3d only` — flag as no Walnut action |
| No usable evidence | Propose nothing |

A Thr3d hint means the phrase appearing in any field, or `Studio` naming CGI. The matching
sentence is quoted on the review row so the guess can be judged rather than trusted.

This is why Planning exists. Every proposal is verified by a person before work is
created, so the importer's job is to be usefully right most of the time, not authoritative.

## The form is not the whole record

The sample form travelled with a Teams message carrying the values the form lacks:

```
Tracking: UPS 1ZAG57800318872124
WF Number: 26014706
CIVD: 036800441897GLKA072600
      036800448018GLKA072600
```

The CVIDs are the form's UPCs with a suffix appended, and the WF Number is the WKFT Job
Number. So a Product created from a form is deliberately incomplete: it has identity
(name, UPC) and intent (scope), and lacks the production data that arrives separately
and is already filled by the source sheet refresh.

This is the right shape. The form's job is to make the Product exist before the
merchandise does, so that receiving has something to match against.

## How it should work

It is another importer, and the import pipeline already exists. Upload produces the same
plan the spreadsheet importer produces, and lands in the same review table where rows are
corrected before anything is written.

1. **Upload** a PDF (drag-drop, one or many).
2. **Extract** the AcroForm fields. A PDF with no form fields is rejected with that
   reason, not silently half-parsed.
3. **Plan** — one row per SKU line, carrying the form-level values on every row.
4. **Review** — the existing table. Nothing is created until it is committed.
5. **Commit** — creates Products, matching existing ones by UPC so re-uploading a form
   updates rather than duplicates.

## A form is not a delivery

Uploading a structure form means work is expected, not that anything has arrived. The
importer creates Products and nothing else: no Merchandise, and no match.

That is the point of it. When the box does arrive, receiving creates the Merchandise and
matches it by UPC against Products that already exist — which they now do, because the
form created them days earlier. Today that match has nothing to match against and someone
types the product in by hand.

The form may also carry a tracking number, which describes a shipment that has not been
received. If that becomes a Shipment record it is an expected one, distinct from a
received one, and Planning must not treat it as merchandise in hand.

## Where a Product came from

Two sources now create Products: the Topco sheet and this importer. Which one a Product
came from decides who owns its fields.

Sheet-sourced Products already carry a `_sourceSnapshot` in `Reference Data`, and the
refresh only touches Products that have one:

```python
snapshot = _source_snapshot_for_topco_product(record)
if not snapshot:
    continue
```

So a form-created Product is left alone by the refresh by default, which is the correct
behaviour and needs no new rule. It should carry its own marker — the form's project,
date and file name — so its origin is visible rather than merely implied by an absence.

The interesting moment is when the sheet later contains the same UPC. That is a
reconciliation, not a conflict: the Product gains a source snapshot and the sheet becomes
authoritative for source-owned fields from then on. The form's values were always a
best-available guess made before the master list caught up.

This also answers the `Request Type` question. The form proposes it for Products it
creates. Once a Product is source-linked, the sheet owns it.

## Decisions this needs

**Placeholders are literal values.** `Select`, `Marks to complete` and `Supplier to
complete` are real options, not blanks, and which one appears depends on the template.
They must be read as unanswered, or Products will be created whose vendor is the string
"Supplier to complete".

**Should a form create a Shipment?** The tracking number is on the form, and knowing what
is inbound before it arrives is useful. It is also a second way Shipments come into
existence, which is worth deciding deliberately rather than by accident.

## Deliberately not automated

The Thr3d instruction is detected and quoted, never acted on. Splitting a shipment and
sending part of it to Kentucky is a physical, irreversible act; a sentence in a text field
should inform that decision, not make it.

## The risk that decides everything

Extraction depends on the returned file still being the fillable PDF. Printed, signed and
scanned, it becomes an image: no form fields, and the entire approach collapses into OCR,
which is a different and much less reliable project.

Worth confirming how these actually come back before building. If some arrive flattened,
the honest answer is that those stay manual rather than pretending to read them.
