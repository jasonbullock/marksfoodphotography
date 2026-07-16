# Working Domain Model

This model is intentionally provisional.

## Product Data

Imported reference data from MySGS or client files.

It may be incomplete and does not initiate PM work by itself.

## Merchandise

A physical sample received by the studio.

Merchandise can:
- Arrive with or without matching product data
- Be damaged or incorrect
- Require replacement
- Be photographed
- Be shipped to THR3D
- Be received multiple times for the same product

Merchandise receipt initiates review work.

## Review Work

Automatically generated when merchandise is received.

Review determines:
- What the merchandise is
- Whether it is usable
- Whether additional data is required
- Whether artwork or instructions are missing
- Whether it goes to Photography, THR3D, Replacement, Wait, or No Production

## Work Group

A system-generated or system-suggested grouping of related merchandise and products.

PMs do not create work groups from scratch.

Possible grouping signals:
- Client
- Receipt or shipment
- Imported references
- Workfront number
- MediaBox number
- MySGS number
- Activation information
- Similar arrival timing

## Production Instructions

Structured information currently communicated through activation emails.

May include:
- Priority
- Due date
- Scope
- SKU/CVID/UPC references
- GS1 bundle requirements
- Required views
- Artwork
- Special instructions
- File destinations

## External References

Workfront, MediaBox, MySGS, structure-form numbers, and other identifiers are references. None should automatically become the application's primary workflow hierarchy.
