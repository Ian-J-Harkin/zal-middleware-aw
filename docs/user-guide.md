# Zalando Middleware Orchestrator - User Guide

Welcome to the Zalando Middleware Pipeline! This system is designed to seamlessly ingest, validate, and recover raw vendor data (like the Myntra Kaggle dataset) and transform it into a perfectly mapped "Golden Payload" that matches Zalando's strict schema requirements.

---

## 1. Getting Started

### Prerequisites
- Node.js (v22+)
- Access to the raw data files in `data/raw/`

### Launching the Orchestrator
To start the visual GUI Orchestrator, run the following command from the root directory:
```bash
npx tsx src/server/gui-server.ts
```
Then, open your browser and navigate to `http://localhost:4050`.

---

## 2. The Pipeline Funnel

The Zalando pipeline is a strict funnel designed to reject ambiguous data rather than corrupting the final payload. Records flow through three stages:

1. **Extraction (Main)**: Parses raw data and extracts Zalando-required attributes (Colors, Silhouette, Size Grids). Items that lack a color or recognizable size are sent to the Dead Letter Queue (`onboarding_failures.json`).
2. **Failure Recovery**: Scans the Dead Letter Queue and attempts to salvage items using Bucket A (Marketing Colors mapping) and Bucket B (Assortment Normalization).
3. **Re-Ingestion**: Feeds the salvaged items back through the strict Extraction script. If they still fail, they are permanently rejected.

---

## 3. Using the GUI Orchestrator

The Orchestrator provides a premium glassmorphism interface to control the data flow.

### Manual Operations
You can run the pipeline sequentially if you need to debug specific logs:
- **1. Process Extraction**: Selects a raw file (e.g., `Myntra Fashion Clothing.csv`) and performs the initial ingestion.
- **2. Failure Recovery**: Selects the resulting `onboarding_failures.json` and runs the cleanup script.
- **3. Process Recovered Records**: Re-ingests `Myntra_Recovered.csv`.

### Full Automation (Recommended)
For day-to-day operations, use the **Run End-to-End Pipeline** button. This automatically:
1. Orchestrates all three steps securely on the backend.
2. Aggregates the mathematical totals for a perfect accounting lifecycle.
3. Populates the **Pipeline Funnel Dashboard** so you can view your Final Golden Payload and Unrecoverable counts at a glance.

---

## 4. Understanding Output Artifacts

The pipeline generates several artifacts that you can view directly from the GUI:

- **Clean Articles JSON (`data/processed/clean-articles.json`)**: This is the final Golden Payload. It contains only perfectly mapped configs and models ready for Zalando.
- **Dead Letter Queue (`data/logs/onboarding_failures.json`)**: The intermediate queue containing records that failed the initial extraction, along with detailed failure reasons (e.g., "Color extraction failed").
- **Dubious For Review (`data/logs/dubious_for_review.json`)**: Records that passed extraction but relied on a compromise rule (loose fallback, multipack override, size-grid default, misspelling correction) or contain "plus size" in the description. These are still present in the Clean Articles output but are flagged here for manual spot-checking by a Data Operator.
- **Vendor Rejections (`data/logs/vendor_rejections.csv`)**: Hard rejections that could not be salvaged even after the recovery process. These must be returned to the vendor.

### Important: Multi-Color `supplierColor` Values
When reviewing `dubious_for_review.json`, you may see records with `reason_flagged: "multi_color_override"` and a `supplier_color` like `"navy white"`. This means the pipeline detected **two or more** colours in the description and correctly routed the item to the Zalando `multi` bucket (code `999`).

**Do not assume the number of colours shown in `supplier_color` is the total count.** The pipeline currently captures only the first two colour tokens it finds. The garment may have additional colours. Refer to the `raw_description` field in the same record for the full, unmodified description text. See [docs/color-limitations.md](file:///c:/Github/Zalando-dev/zaland-middleware-mock/docs/color-limitations.md) for the full technical explanation.

---

## 5. Extensibility (Adding New Mappings)

If you notice a high rejection rate for a specific attribute, you can expand the dictionaries:
- **Marketing Colors**: Add new color aliases (e.g., `mosstone,olive green`) to `data/mappings/marketing_colors.csv`.
- **Regex Patterns**: Add new multipack or patterned logic directly to `src/mappings/color-extractor.ts`.

> **Note**: The pipeline is strictly unit-tested using Node's Native Test Runner. Run `npx tsx --test test/*.test.ts` to verify the mapping algorithms before deploying changes!
