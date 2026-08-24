# Shot Date and Merchandise Purge

**Status:** proposed, tabled
**Date:** 2026-08-21

## The idea

Record the date merchandise was actually photographed, and use it to start a per-client
retention clock. When the clock runs out, the merchandise can be disposed of.

Two uses: reporting, and knowing what can be thrown away without asking anyone.

## Shot Date

Creative Force already reports step transitions to Marks. When it reports that
photography has completed for a work unit, that timestamp is the shot date.

It is written once and never revised. A reshoot is a new event, and overwriting would
silently restart a retention clock that may already have expired.

**To settle:** which signal counts as "photographed". Observed step names include
`Photography`, `Final Selection`, `Photo Review` and `Asset Delivery`, and these do not
match the labels in Creative Force's own workflow builder, which shows `CAPTURE`. The
options are the `Photography` step reaching a done state, or the work unit completing —
the latter is later and includes post-production, so it answers a different question.

Shot Date belongs on the Workstream Card, which is what a Creative Force work unit maps
to. The Merchandise record can read the earliest or latest across its cards.

## Two clocks, two thresholds

Merchandise is measured two ways, and both belong on the Client because both are client
agreements.

**`Clients.Hold Days`** runs from the received date — the existing `daysHere`, already
computed on every merchandise record. It answers "how long has this been sitting in our
building", regardless of whether anything has happened to it. It catches merchandise that
arrived and stalled.

**`Clients.Dispo Days`** runs from the Shot Date. It answers "how long since we finished
with it", which is the question that licenses disposal. Topco is 30.

They are not interchangeable. Counting disposal from arrival would mark merchandise
disposable precisely while it is still waiting to be shot — the sixty-day-old item stuck
on missing information is the one you least want thrown away. Counting stalled inventory
from the shot date would never flag anything that was never shot.

Merchandise with no Shot Date has no disposal date and is never eligible. It still accrues
days here, which is how it surfaces.

## What already exists, and what is wrong with it

`Clients.Hold Days` and `Clients.Dispo Days` are read and written by the backend and **do
not exist in the Airtable base**. Like `Clients.Job Prefix` and
`Products.Pickup Job Number`, they are phantom fields: reading yields nothing and writing
would fail the request. Both need creating, keeping these names.

Because `dispoDays` is always empty, `_derive_merchandise_inventory_status` contains a
`Disposition Due` branch that can never fire. That branch also counts from `days_here`,
which is the wrong clock for disposal — it is the right clock for `Hold Days`.

So the existing code has the right two ideas wired to one field and the wrong measure.

## Surfacing it

A dashboard section listing merchandise past either threshold, grouped by client, saying
which threshold it passed and by how long. "Past disposal" and "sitting too long" are
different problems with different responses, so they should not be pooled into one count.

The useful question is "what can we get rid of", so the list should be actionable rather
than a number.

Purging itself stays manual. The system says what is eligible; a person disposes of it
and records that. Nothing should automatically mark physical goods as destroyed.

## Open

- Which Creative Force signal is "photographed"
- Whether a purge is recorded as History on the merchandise, which it probably should be
- Merchandise never shot at all never becomes disposal-eligible. `Hold Days` is what
  surfaces it, which is why both thresholds are needed rather than one
