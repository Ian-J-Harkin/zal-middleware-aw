# Zalando Middleware Taxonomy Documentation

## Color Extraction Rules

The color extraction pipeline uses a four-tier fallback mechanism to derive Zalando property codes from raw vendor descriptions.

### Rule 1: Dynamic Brand Stripping
Removes the brand name from the beginning of the description to avoid matching color words hidden inside brand names (e.g., "Red Tape").

### Rule 2: Overrides
- **Multipack Override**: "pack of 3" -> `999` (Multi).
- **Patterned Override**: "printed", "striped" -> `998` (Patterned).

### Rule 3: Anchored Gender-Color Match
Matches gender tokens followed immediately by a recognized color. Highly confident.

### Rule 1b: Multi-Color Override
**DATA QUALITY COMPROMISE**: If a second distinct color token immediately follows the first color match (e.g., "navy white", "navy and white"), the pipeline routes the item to the `multi` bucket (`999`) rather than silently discarding the second color and assuming the base is just the first color. 
- *Impact*: Suppresses true variant granularity in favor of onboarding momentum.
- *Recommendation*: In a real vendor onboarding scenario, this should be flagged back to the supplier's data team to fix at the source.

### Rule 4: Loose Fallback
Scans the first 120 characters for any unanchored color token. High risk of false positives, but maximizes coverage.

## Architectural Tradeoffs

### In-Memory Map vs. Streaming (Story 1.4)
Our initial architecture (from Story 1.4) aimed for a purely streaming approach to process the large CSV efficiently without loading it all into memory. 
However, to correctly construct Zalando's `Model -> Config -> Simple` hierarchy from the flat Myntra dataset, we had to group identical base products together (the "Synthetic Key" grouping logic). 

**Tradeoff Decision**:
We intentionally sacrificed the pure streaming paradigm in favor of an in-memory `Map<string, ArticleModel>`. The script still streams the file row by row to parse it safely, but it retains the full model object tree in memory until the `end` event, at which point it writes the final aggregated JSON out to disk.
- *Reasoning*: Because rows for the same synthetic key (parent product) can be dispersed anywhere in the CSV, grouping them requires random access across the entire dataset.
### 0.44% Model Fragmentation Rate (WARNING)
**DO NOT USE OR CITE THIS FIGURE UNTIL EPIC 2.**
An early profiling script (`fuzzy-match.ts`) estimated that 0.44% of models were artificially fragmented by minor color description differences. This sampling methodology was highly flawed:
1. It evaluated only the first 100 groups (non-random, sequential CSV order).
2. It explicitly excluded singletons (which make up the majority of the dataset) and large groups (>100 variants).
Treat the dataset's fragmentation rate as strictly **unknown** until a proper, unbiased statistical sampler is built in Epic 2.

### "Free Size" Defensive Code
In `src/mappings/size-exploder.ts`, there is an explicit branch checking for `rawSize === 'free size'`. Profiling confirmed that there are exactly **0 rows** in the Myntra dataset that contain the exact string `"free size"` in the `SizeOption` column. This branch is documented as defensive dead code that survives to protect against unobserved vendor drift, but it does not actively parse any known rows.
### "Plus Size" in Descriptions
Profiling revealed that when "plus size" appears in a product description (e.g., within the `Plus Size > tshirts` category), the available size grid exhibits near-complete overlap with normal rows in that exact same category. For example, "Plus Size" tshirts carry sizes `S` through `9XL`, missing only `XS` compared to the normal range. 
**Finding**: "Plus size" in the description is acting as a marketing or searchability keyword rather than a reliable indicator of a structurally different, extended-only size grid. Consequently, the pipeline does NOT flag these items as compromised for manual review, as no special size-grid intervention is required. (Note: 477 rows were previously flagged under `plus_size_in_description`; this flag was removed following the investigation showing near-complete size-range overlap).
