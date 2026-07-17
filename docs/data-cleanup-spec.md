# Intermediate Data Cleanup Specification (v2.0)

## Objective
Define a standalone TypeScript data enrichment utility (`src/scripts/cleanup-failures.ts`) designed to process the Dead Letter Queue (`data/logs/onboarding_failures.json`). The goal is to programmatically recover the 1,943 failed records by normalizing malformed attributes and re-queueing them for the main extraction pipeline. 

Records that cannot be recovered must be routed to a hard rejection log for vendor remediation.

## 1. Input & Output
- **Input File:** `data/logs/onboarding_failures.json` (Contains objects with `product_id`, `brand`, `category`, `description`, `reason`).
- **Output (Recovered):** `data/raw/Myntra_Recovered.csv` (Appended with normalized descriptions, ready for re-ingestion).
- **Output (Hard Rejections):** `data/logs/vendor_rejections.csv` (Exported back to vendors to manually fix).

## 2. Cleanup Workflow & Triage Rules
The utility will parse each failed record and pass it through a sequential 3-Bucket triage system.

### Bucket A: Marketing Color Normalization (Recoverable)
Brands often use poetic or marketing terms instead of standard color names.
- **Rule:** Maintain a strict `data/mappings/marketing_colors.csv` dictionary. Based on initial failure reports, it must be seeded with:
  - `"moonlit ocean"` -> `"navy blue"`
  - `"mosstone"` -> `"olive green"`
  - `"marmalade"` -> `"orange"`
  - `"sangria"` -> `"burgundy"`
- **Action:** If the description string contains a key from this dictionary, append the mapped Zalando base color to the end of the description string.
- **Routing:** Flag as `Recovered` and route to `Myntra_Recovered.csv`.

### 4. Pricing Fields (`DiscountPrice` / `DiscountOffer`)
- **Status**: Not mapped in the current `ArticleModel` (Epic 1 focuses on taxonomy and grouping).
- **Future Considerations**: A blank or empty string in `DiscountPrice` or `DiscountOffer` represents a legitimate "no discount" state. When implementing pricing pipelines in later epics, these blanks MUST NOT be classified as malformed data by validation rules that expect numbers.

---

## Analysis Practices & Warnings

### Sampling Bias
When analyzing dataset structure or row distributions, avoid relying solely on `head()` (or the first N rows) as it often contains monotonically sorted data, creating severe sample bias.
- **Example**: In initial analysis, the `Reviews` column appeared monotonic because we viewed the first few rows.
- **Rule**: Any time a "here's what the data looks like" claim is made, explicitly confirm the use of a `.sample()` or randomized selection rather than `.head()` to ensure representative findings.

### Bucket B: Assortment & Regex Normalization (Recoverable)
Non-standard phrasing of multi-packs and double-spacing from upstream brand-stripping bypasses the primary extraction engine.
- **Rule:** Apply an aggressive, multi-pass regex normalization to standardize phrases.
  - **Whitespace Fix:** Apply `.replace(/\s{2,}/g, ' ')` to collapse any double-spaces left by brand stripping prior to evaluation.
  - **Set Normalization:** Replace `set\s+of\s+(\d+)` with `pack of $1`.
  - **Pack Normalization:** Replace `pack\s+(\d+)(?:\s+mix)?` with `pack of $1` to capture edge cases like "pack 2 mix".
- **Action:** Overwrite the description with the standardized regex output.
- **Routing:** Flag as `Recovered` and route to `Myntra_Recovered.csv`.

### Bucket C: Genuinely Colorless / Technical Records (Hard Rejection)
Items (often innerwear) where the listing is purely technical (e.g., "cotton rich non padded front open plunge bra" or "men deo soft deodorizing micro modal solid trunks dam as t obwgsb pack 3 mix").
- **Rule:** If a record passes through Bucket A and B without yielding a valid, mappable attribute, it is deemed genuinely missing mandatory data.
- **Action:** Do not hallucinate data. The record is permanently dropped from the automated pipeline.
- **Routing:** Flag as `Hard Rejection` and write to `vendor_rejections.csv`.

## 3. Feedback Loop & Vendor Communication
- **Pipeline Re-Ingestion:** The `Myntra_Recovered.csv` file is concatenated with the next batch of raw data and re-processed by the main `extract-kaggle.ts` pipeline.
- **Vendor Remediation:** The `vendor_rejections.csv` is uploaded to the Vendor Portal, triggering automated emails stating: *"Action Required: Product listings rejected due to missing mandatory attribute (Color/Pattern). Please update descriptions."*
