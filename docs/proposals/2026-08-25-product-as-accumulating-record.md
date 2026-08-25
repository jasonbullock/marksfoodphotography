# A Product Is What We Know So Far

**Status:** proposed
**Date:** 2026-08-25

## The loop, in one line

Receive merchandise. Does a Product already hold data for it?

**Yes** — match them, and fill the gaps in both directions.

**No** — record what the merchandise itself tells us, and either establish a Product from
that or leave it waiting. When a Structure Form turns up three weeks later, ingesting it
must find the merchandise that has been waiting and match it then.

Everything below is those three cases with the edges worked out.

That last clause is the one the system does not do at all today. A Structure Form ingested
now creates Products and stops; merchandise received a fortnight ago sits unmatched beside
them, and only a person who remembers both will connect them. The form knows the UPCs and
names of everything it describes, and the board knows exactly which merchandise has no
Product. Nothing but code stands between them.

Retroactive matching is the same operation as receiving-time matching, run in the other
direction: instead of new merchandise searching existing Products, a new Product searches
waiting merchandise. Same comparison, same near-match rules, same requirement that anything
inexact is confirmed by a person rather than assumed.

The part worth stating plainly is *both directions*. Matching today links a Product and
stops. But the merchandise knows things the Product does not — the name printed on the
package, the identifier scanned off it, photographs of the actual item, condition, quantity,
which shipment it came in. The Product knows things the merchandise does not — WKFT, Mbox,
CVID, brand prefix, the filename token. Linking them should let each fill what the other is
missing, and today neither does.

## What is actually true

The system assumes a Product exists and merchandise is matched to it. Every path is built
that way: match a Product, activate a source row, fail to match and wait.

Reality runs the other direction. Merchandise arrives, and the data catches up afterward
from whoever happens to send it. Three weeks of the Topco chat is one long demonstration:
pretzels arrive and nobody knows whose they are until someone answers `MI002101`; frozen
waffles arrive and do not match the VEC information on hand; crackers cannot be found in
the tracker because nothing has physically arrived yet.

The two candidate sources of truth have both declined the job, and they were never
independent of each other. The spreadsheet is downstream of the forms: its identifying
columns are exactly what a Structure Form carries, plus five that someone added afterward.

| From the Structure Form | Added to the sheet afterward |
| --- | --- |
| Product Name, UPC, Mbox #, WKFT #, Request Type | CVID, Brand Prefix, Prod Descrip, Path to Art, Product Type |

The right-hand column is the one that blocks a shoot — CVID for Ecomm file naming, Brand
Prefix and Prod Descrip for Packaging. So the thing being waited on was never the form. It
is the work done to the sheet *after* the form, by whoever was maintaining it. The client's
producers have now said in writing that this is the studio team's job.

Structure Forms, meanwhile, arrive late, often after the merchandise, sometimes never, and
carry only their half.

So no authoritative record exists, none is coming, and the work of assembling one has landed
here. The system should stop waiting and start being the place it happens.

## What a Product becomes

The accumulating record of what is known about a SKU. Created as soon as anything is known,
filled in by whatever arrives next, never blocked on being complete.

Readiness stops being a property of the record and becomes a computed state: does this
Product hold the fields this client requires for this deliverable, right now.

That evaluation already exists. `photoProductionRequirements` states the fields per client
and per workstream, the card reports which are absent, and release is gated on it. What is
missing is not the gate. It is that accumulation has nowhere permanent to live and no way to
accept a late contribution.

## Two kinds of fact

The evidence is consistent about this, and the distinction drives the design.

| | granularity | known at receiving | example |
| --- | --- | --- | --- |
| SKU facts | one per product | usually, off the package | UPC, product name, CVID |
| Project facts | one per shipment or form | rarely | Mbox, WKFT, project name, scope, supplier, studio |

Four vinegar SKUs from one Structure Form all carry `MI002161`, `26012199` and
`FX RD Vinegar FIT`. One answer in a chat resolves an entire carton, which is exactly how
the chat works: Ashley says `MI002156` and a shipment of waffles is identified.

CVID is a SKU fact and unique per product — the Ecomm filename is `{cvid}_{view}`, so a
shared CVID would collide every SKU in a project. Whether it is *derived* from the UPC is
unknown and worth establishing: both observed values were the 12-digit UPC followed by an
identical trailing block, which is consistent with construction and equally consistent with
two SKUs from one supplier. A dozen real `UPC → CVID` pairs would settle it. If it is
constructed, the app can propose CVIDs for confirmation instead of waiting for each one.

## Identity, and the duplicate problem

Duplicates are the stated fear and the real risk. Two Products for one SKU degrades matching
permanently, and the more freely Products are created the worse it gets.

But duplication is an identity problem, not a timing problem. With a reliable key, creating
early is safe because the second arrival merges. Without one, creating is unsafe whenever
it happens.

### We do not police their data

Identifiers are taken as given. A UPC that fails its check digit, an Mbox a digit short, an
internal item number where a barcode was expected — none of it is refused, and none of it is
corrected on their behalf. If the client wanted perfect data they would maintain a source of
truth; they have said they will not.

The measurements are still worth stating, because they show what the system is working with.
Of 171 sheet rows, nine carry a valid twelve-digit UPC, 43 are the wrong length and 119 are
blank. Six real Structure Forms, by contrast, carry fifteen valid UPCs out of fifteen. One of
those six states an Mbox of seven characters where the others state eight.

That is the shape of the input, not a list of things to reject. `MI00204` is valid enough to
work with. The only cost of a wrong project number is that a search for the right one misses,
and that is the client's cost to bear.

What this does mean is that identifiers cannot be *assumed* good, so nothing may be merged
silently on a near match. That is a different discipline from validation: we accept everything
and guess at nothing.

### Exact merges, suggested matches

Relaxing the comparison was measured against the 52 coded rows:

| relaxation | colliding groups | products merged |
| --- | --- | --- |
| exact digits | 0 | 0 |
| strip leading zeros | 0 | 0 |
| drop last digit | 5 | 15 |
| drop first and last | 5 | 15 |

Stripping leading zeros is free and safe — it undoes what the spreadsheet did. Dropping the
last digit collapses five CT cheeses into one bucket: Asiago, Extra Aged Parmesan, Fontina,
Gorgonzola and Parmesan differ in that digit alone.

So the rule splits in two:

- **Automatic merge — exact only.** Digits compared with leading zeros stripped. No
  judgement, no collisions.
- **Near match — suggested, never automatic.** A code one digit away is a candidate for a
  person to confirm, and the whole ambiguous set is shown rather than a best guess. Choosing
  a best among five cheeses would be arbitrary, and choosing wrong binds merchandise to the
  wrong SKU silently.

The identifier narrows; the name decides. `112250049?` reaches five candidates and only
"Asiago" against "Fontina" resolves it. Receiving's match list already works this way — near
identifiers should feed that list rather than trying to be clever ahead of it.

- **No identifier at all** — create nothing yet. Hold the data on the merchandise, where
  `manualProductInfo` already holds it, and show it as *no identity yet* rather than
  *unmatched*. For this client that is 70% of the sheet, so it is the normal case rather
  than an edge one.

Today there are four creation paths that each merge differently: the Structure Form import
on UPC, source-row activation on the sheet row, `POST /api/items` on a validated identifier,
and the intake import. They should collapse onto one merge function that every ingest calls.
That is also what makes the spreadsheet disconnectable later — it becomes one contributor
among several rather than a path with its own semantics.

## What makes a record official

Not where the data came from. A record is official when it holds every field the client
requires for the work in hand and someone accountable has confirmed it. That is a state,
never a provenance.

This matters because there will be Products with no Structure Form behind them at all,
assembled from a tracking number here and a CVID pasted in a chat there. Those are not
lesser records. Piecing that together *is* the job the sheet used to do, and doing it in the
app rather than a spreadsheet is the point. When a form turns up later it merges in and
agrees, or it disagrees and that is worth seeing.

Provenance is still recorded per field, because when a CVID from a Teams message turns out
wrong, the question is which one and where it came from. But provenance answers *how do we
know this*, not *does this count*.

## The ladder

Three ways to resolve merchandise with no Product, in order of what they cost to establish —
not in order of legitimacy. The order matters because someone reaching the third rung has
already been shown the first two.

**Match an existing Product.** Best outcome, nothing created. Already built.

**Drop a Structure Form on it.** The client's own document, arriving later than assumed. The
parser, the request-type proposal, the Thr3d evidence and the `_structureForm` provenance
already exist; what is missing is that a form dropped in Planning has to resolve which of
its SKU rows is *this* card — one match, several plausible, or none, and it should say
plainly which.

**Assemble it here.** No form exists and the merchandise is on the shelf. This is
origination, not a fallback: the app becomes the record of a Product that no client document
describes, built from whatever arrived piecemeal.

This is an ordinary case, not a rare one. Data gets handed over in a chat with "push it
through to production" and no form ever follows. Without this path that work cannot proceed
at all, and no alternative solves it — the only other option is telling the studio that
goods on its shelf cannot be shot because paperwork never came, which is not the receiver's
problem to solve and not a position worth defending.

Rung three is less invention than it appears. `manualProductInfo` already collects name,
UPC, CVID and job number on unmatched cards, and photo-production validation already scores
the card against it as a stand-in Product. The typing has already happened; today it dies in
a JSON blob on the merchandise row. Promoting it to a real Product is mostly plumbing.

Worth knowing: this rung was built and then switched off, behind
`showIncompleteProductCreation = false`. Why it was disabled should be established before it
is re-enabled.

## Products before arrival

Carrie's explanation of why Ramla could not find the crackers is the whole argument:
*the tracker only contains products physically received*. The PMs ask about expected work;
the tracker knows only arrived work. So they fall back to chat, which is the behaviour
everyone is trying to stop.

A Structure Form that arrives before the box should create Products immediately, marked as
expected rather than received. Then "where are my crackers" is a search on `MI002223`
instead of a Teams thread.

This follows from the merge rule rather than adding to it: a form is just an early
contributor, and merchandise arriving later merges into the same records.

## The filename token

`Products.Product Description` is not a description. It is the token that goes in the
packaging filename, `{jobNumber}_{brandPrefix}_{fileNameDescription}`, and the real values
are `vinegar` and `ice cream`.

The name is actively harmful, because `jobNumber` and `brandPrefix` are project facts. The
token is the only per-SKU component, so it must distinguish SKUs *within a project* — and
calling it a description invites the shared word that breaks exactly that.

The four vinegar SKUs share `26012199` and `CT`. One is filled in as `vinegar`. If the other
three are described the same way — which is what anyone would type, since they are all
vinegar — all four files become `26012199_CT_vinegar`. The distinguishing values are
`red wine`, `white wine`, `balsamic`, `balsamic glaze`.

So: rename it to what it is, validate uniqueness within `jobNumber + brandPrefix` at save,
and propose a default derived from what differs across the sibling SKUs, since the app knows
all four names.

Enforce at creation, not later. The FZ/FC exchange settles that — `FZ` meant Frozen rather
than a brand, the correct code was `FC`, and the instruction was to leave the filenames
alone because assets already existed. A wrong-looking name that assets were delivered under
is the right name.

## The ask

The strongest signal in three weeks of chat is that the client has told the studio the data
entry is theirs. Given that, the system should produce the request rather than leaving it in
someone's head.

Per SKU, the app already knows precisely which client-required fields are absent. That is a
message: the project facts stated once as context, then a row per SKU for the things only
they can answer.

> `MI002161 / 26012199 — FX RD Vinegar FIT`
> Four SKUs are in the studio. We need a CVID for each to proceed:
> — `VINEGAR RED WINE ORGANIC 17 FOZ` (036800…)
> — …

Mixed granularity by design: project facts asked once, SKU facts listed individually. The
photo release email already establishes the pattern — build the message from the record,
show it before it goes, let a person send it.

## Order of work

1. **The merge function.** Invisible, and everything else stands on it. One way a Product is
   created or filled, keyed on the normalized identifier, with every existing ingest path
   calling it — and it runs in both directions, so a new Product searches waiting
   merchandise exactly as new merchandise searches Products.
   Duplicates become impossible before Products start being created more freely.
2. **The ask.** Highest value per unit of work, and it needs nothing new — the missing-field
   evaluation already exists.
3. **The ladder.** Structure Form drop, then hand entry, both as thin callers of the merge.
4. **The filename token.** Rename, uniqueness check, derived default.
5. **Products before arrival.** Falls out of the merge rule once it is trusted.

## Decisions this needs

- Why was `showIncompleteProductCreation` disabled?
- Does the Structure Form drop live on a card, or on the Planning page? One form covers
  several SKUs across several cards, which argues for the page.
- Does provenance live per field or per record? Per field answers "where did this CVID come
  from"; per record only answers "was there a form".
- Who confirms a record as official, and does that need recording — a name and a moment, the
  way merchandise verification does it?
- Is CVID derivable? A dozen real pairs answers it.
- When a Structure Form arrives after the merchandise, what counts as matching "within
  reason" — identifier alone, name alone, or either with a person confirming?

## Deliberately not automated

Creating a Product for every received SKU at receiving. It is the clean end of this model
and it should wait until the merge rule has been in use long enough to trust, at which point
it is a switch rather than a rewrite.

## The risk that decides everything

That the ladder's third rung becomes the first one used. Assembling a record here is
legitimate, which makes it more dangerous rather than less: if it is as easy as matching,
people will type rather than look, and the Product table fills with near-duplicates that no
merge rule can fix — because they will have subtly different UPCs, typed off boxes under
time pressure.

The answer is not validation. Refusing bad identifiers would reject most of what this
client sends and solve a problem that is theirs, not ours. Four things that do work:

**Scan over type.** Receiving already supports scanning, and a scanned code is machine-read.
Whether a code was scanned or typed should be recorded, because it is the difference between
an identifier and someone's transcription of one.

**Show the near-duplicates.** Before creating, look for codes one edit away and for close
names, and offer them. Not a refusal — the person may know something the system does not —
but they should never create a second record without having been shown the first.

**Search before create.** Origination is only reachable after the match list has been shown.
Not a warning — an ordering, so nobody arrives there without having looked.

**Confirmation and countability.** A record becomes official when a named person confirms it,
and its origin is recorded. If a client needs records assembled by hand often, that is worth
knowing and worth raising with them, and it is only knowable if it is countable.

The design should be judged on whether the easy path stays the correct one. Scanning the
package is less work than typing it, so the cheapest path is already the most reliable —
that, rather than any check on the value, is what makes this hold at a busy receiving desk.
