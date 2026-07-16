# Marks Photo Product Vision

Marks Photo is an operations inbox, not a database-management tool.

Work should appear automatically from real operational events:
- Product data is imported.
- Merchandise is received.
- Artwork or instructions arrive.
- Replacement merchandise arrives.
- Production is completed.

Users make decisions. They should not create administrative records merely so the software understands the workflow.

## Primary Trigger

Physical merchandise receipt initiates actionable work, whether the merchandise was expected or unexpected.

Receiving:
- Logs the shipment and physical merchandise.
- Captures photos, identifiers, quantity, condition, and location.
- Matches to imported data when obvious.
- Does not perform production planning or complete PM review.

After receipt, the system automatically creates PM review work.

## PM Experience

PMs must not be required to create Jobs, Projects, Production Requests, or other containers before reviewing merchandise.

The PM experience should be:
1. Work appears in an inbox.
2. PM visually reviews merchandise.
3. PM confirms identity and usability.
4. PM determines Photo, THR3D, Replacement, Wait, or No Production.
5. PM supplies or confirms missing instructions.
6. The system moves the work automatically.

## Guiding Rule

No user should create administrative work solely so the software can understand what is happening.

## Simplicity Standard

Prefer:
- Automatic grouping
- Suggested matches
- One-click decisions
- Operational queues
- Progressive disclosure
- Card-based interfaces

Avoid:
- Manual job creation
- Large forms
- Generic status dropdowns
- Duplicate data entry
- Tables for core workflows
- Requiring PMs to maintain system structure
