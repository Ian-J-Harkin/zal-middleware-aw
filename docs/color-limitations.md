# Multi-Color Extraction: Known Limitations

## Current Behaviour

When the pipeline encounters a description like `"roadster men navy white black geometric printed casual shirt"`, it:

1. Strips the brand (`"roadster"`) → `"men navy white black geometric printed casual shirt"`
2. Matches the first colour via Rule 3 (anchored gender match) → `"navy"`
3. Checks the tokens immediately following `"navy"` for a second colour → finds `"white"`
4. Detects that two sequential colours are present and routes to the **multi** bucket (`colorCode: 999`)

**The Zalando property code (`999` = multicoloured) is correct.** The garment will appear on Zalando with the right colour attribute.

## The Limitation

The `supplierColor` field in the output records `"navy white"` — the first two colour tokens only. The third colour (`"black"`) is not captured in this field.

This happens because `checkForSequentialColor` in `color-extractor.ts` (line 97) returns as soon as it finds one additional colour after the first match. It does not loop to check for a third, fourth, etc.

## Why This Is Accepted

- The **routing decision** (multi vs. single colour) is binary: either the garment has one colour or it has more than one. The pipeline correctly identifies "more than one" and routes accordingly. Whether there are 2, 3, or 5 colours does not change the Zalando property code.
- The `supplierColor` field is an **audit trail**, not a routing input. Its purpose is to help a Data Operator understand *why* the pipeline made its decision, not to be an exhaustive colour inventory.
- The `raw_description` field — which is always present alongside `supplierColor` in `dubious_for_review.json` — contains the full, unmodified description text. An operator can always refer to it for the complete colour list.

## Operator Guidance

When reviewing `dubious_for_review.json` records with `reason_flagged: "multi_color_override"`:

- **Do not assume** that the number of colours in `supplier_color` is the total count.
- **Do refer to** the `raw_description` field for the full description.
- **The `colorCode: 999` routing is correct** regardless of whether 2 or 5 colours appear in the description.

## Future Improvement (Optional)

If a full colour inventory in `supplierColor` becomes a requirement (e.g., for downstream analytics or vendor feedback), the fix would be to loop `checkForSequentialColor` until no further colour tokens are found, concatenating them into the span. This is a small change to `color-extractor.ts` but has not been prioritised because it does not affect routing correctness.
