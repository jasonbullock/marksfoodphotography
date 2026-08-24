# Where Merchandise Matching Belongs

Status: **resolved 2026-08-19 — Option B, additive half only.**

Scan auto-match was built. The removal of manual matching from receiving was **not** done: receiving works well as it is, so the fuzzy matching, name search and suggestion list all stay. The outcome is that receiving gained a capability rather than losing one, and Planning also matches against the same source sheet.

If receiving ever does become cluttered, the removal described under Option B below is still available and nothing built here blocks it.

The analysis is kept for that reason.

## The question

Should the receiving team match merchandise to an Expected Product at all, or should matching be entirely a Project Management job done in Planning?

## What is true today

Matching exists on both surfaces and works differently on each.

| | Shipments | Planning |
| --- | --- | --- |
| Suggestion source | client source sheet for Source Check clients, local Products otherwise | same, as of 2026-08-19 |
| Match required to save | no | no |
| Automatic matching | none | none |
| Selecting a row | activates the source row, creates or updates a local Product, links it | same |

Two findings worth stating plainly, because they change what the options cost:

**Matching is already optional at receiving.** The only field that blocks saving a merchandise entry is `Product Name on Package`. A receiver can capture photos, quantity and condition and move on without touching the match UI at all.

**Nothing matches automatically anywhere.** There is no exact-UPC auto-link on either surface. Every link is a human selecting a suggested row. So "keep the cheap scan case" is new work, not retained behaviour.

## Why this came up

Planning and Shipments share the matching machinery: `ProductMatchCard`, `ReceivingMatchSuggestions`, `SourceSheetMatchSuggestions`, `combineIdentifierAndNameMatches`, `sourceRowMatchItem`, plus four `/source-check/*` endpoints and two merchandise endpoints. That shared surface has been a steady source of drift — differing labels, differing warning copy, per-caller prop overrides, and touch-sized inputs inherited by a laptop workspace.

The design principles also point at a division that the current build does not make. Shipments is described as capturing physical movement and creating "trustworthy operational evidence", explicitly not deciding production intent. Planning is where "uncertainty is resolved". Matching is a decision.

## Options

### A. Remove matching from Shipments entirely

Receiving captures evidence only: photos, quantity, condition, storage, package name, package UPC. Every merchandise record arrives in Planning unmatched and the PM matches it there.

**For**
- Clean ownership split that matches the stated principles: evidence at receiving, decisions in Planning.
- Removes roughly eight pieces of matching state from the receiving screen and everything that maintains them.
- Ends the dual-surface drift permanently, because there is only one matching UI left.
- Receivers work faster; no judgment calls on a bench.

**Against**
- Throws away the one case where receiving is genuinely the cheapest place to match: the box is in hand and the barcode is right there.
- Every shipment lands in Planning needing identity work, including the trivially obvious ones. New Merch volume goes up.
- The receiver often has context the PM does not, such as the packing slip.

### B. Split by ambiguity

Receiving keeps only unambiguous matching: scan a UPC, get exactly one hit, link it. Everything else — several candidates, name-only matches, nothing found — is left for Planning. The suggestion list, name search and activate-on-select flow come off the receiving screen.

**For**
- Keeps the cheap, certain case where it costs least.
- Removes the judgment work from the bench.
- Removes most of the shared fuzzy-matching surface, which is the part that drifts.

**Against**
- This is **new work**, not a subtraction. Exact-scan auto-match does not exist today and has to be built, including deciding what counts as unambiguous.
- Two matching paths still exist, so some shared surface remains.
- A scan that hits one row is not always correct: the same UPC can appear on multiple client rows.

### C. Leave it

**For**
- Zero work. Receivers who want to match still can, and it is already optional.

**Against**
- The drift continues, and every future change to matching has to be made twice and kept in sync.
- Neither surface is clearly authoritative, which is what produced the duplicated labels and competing copy this work uncovered.

## Recommendation

**B, but only if the scan case is real in practice.** If receivers are mostly scanning barcodes into a field that already resolves cleanly, B keeps a genuine win and removes the expensive half. If they are mostly typing partial names and picking from a list, that is judgment work and B buys nothing over A — take A and keep the model simple.

That is a question about how receiving actually works, not about the code. Worth watching a few real receiving sessions before committing.

## Reversal note

Either A or B partially reverses `2026-08-18 - Shipments Can Activate A Source Row While Matching Merchandise`. That decision is recent and deliberate, so this should supersede it explicitly rather than quietly contradict it.

## Not in scope

Nothing here changes what is authoritative downstream. Package values remain matching evidence retained on the Merchandise record, and the linked Product remains the record production consumes, per `2026-08-19 - Observed Package Values Are Evidence; The Matched Product Is Authoritative`.
