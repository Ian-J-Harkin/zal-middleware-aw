# User Acceptance Testing (UAT) Script

**Project**: Zalando Middleware Mock Orchestrator
**Objective**: To verify that the Data Pipeline Funnel correctly extracts, recovers, and rejects vendor data according to Zalando's schema requirements.
**Tester Role**: Data Operations Manager / QA Analyst

---

## Pre-Requisites
1. Node.js v22+ is installed on the testing machine.
2. The orchestrator server is running: `npx tsx src/server/gui-server.ts`.
3. The browser is open to `http://localhost:4050`.

---

## Test Scenario 1: End-to-End Orchestration & Funnel Mathematics

**Description**: Verify that the automated pipeline securely routes records without mathematical discrepancies.

**Steps**:
1. In the Orchestrator GUI, locate the **Pipeline Funnel Dashboard** section.
2. Observe that all metrics initially read `--` or `0`.
3. In the "4. Full Automation" panel, click the **Run End-to-End Pipeline** button.
4. Watch the "Execution Logs" terminal.

**Expected Results**:
- [ ] The terminal prints `Attempted to re-ingest 284 recovered items.`
- [ ] The terminal prints `25 were successfully salvaged.`
- [ ] The terminal prints `259 remained un-salvageable...`
- [ ] The Funnel Dashboard updates with **Total Raw Records: 526,564**.
- [ ] The Funnel Dashboard updates with **Final Golden Payload: 524,646**.
- [ ] The Funnel Dashboard updates with **Total Unrecoverable: 1,918**.

---

## Test Scenario 2: Golden Payload Schema Validation

**Description**: Verify that the successfully extracted items conform to Zalando's Model/Config/Simple architecture.

**Steps**:
1. Click the **📄 View JSON** link under the "Final Golden Payload" metric in the Dashboard.
2. Open `data/processed/clean-articles.json`.
3. Inspect a random `ArticleModel` entry.

**Expected Results**:
- [ ] The entry contains a `model_sku`, `brand_code`, and `silhouette_id`.
- [ ] The `configs` array exists and contains at least one `ArticleConfig`.
- [ ] The `ArticleConfig` contains a `color_code` and `supplier_color`.
- [ ] The `simples` array exists and contains items mapped to a `size_grid_id` (e.g., `206`, `205`, `onesize_grid`).

---

## Test Scenario 3: Dead Letter Queue (Unrecoverable Rejections)

**Description**: Verify that items lacking a determinable color or size are correctly rejected to prevent polluting the Zalando pipeline.

**Steps**:
1. Click the **📄 View Rejections** link under the "Total Unrecoverable" metric.
2. Open `data/logs/vendor_rejections.csv`.
3. Locate the item with product ID `9338305` ("scorpious women pack of shrug top").

**Expected Results**:
- [ ] The item exists in the rejections CSV.
- [ ] The reason column states: `Hard Rejection: Missing mandatory color/pattern attribute`.
- [ ] The item does NOT exist in the final `clean-articles.json`.

---

## Test Scenario 4: Bucket A Extensibility (Marketing Colors)

**Description**: Verify that the fallback mapping for obscure marketing colors correctly salvages items.

**Steps**:
1. Open `data/mappings/marketing_colors.csv` and add a new row: `space dust,grey`.
2. Open `data/raw/Myntra Fashion Clothing.csv` and intentionally add a dummy row at the end:
   `9999999,DummyBrand,tshirts,"men space dust cotton tshirt",,`
3. Return to the GUI Orchestrator and click **Run End-to-End Pipeline**.
4. Check `data/processed/clean-articles.json` for `9999999`.

**Expected Results**:
- [ ] The dummy item was successfully extracted into the Golden Payload.
- [ ] The `color_code` for the item was mapped as `grey` during the recovery phase.
- [ ] The Total Raw Records metric in the UI increased by 1.

---

### Sign-off
**Tester Name**: ___________________________
**Date**: ___________________________
**Status (Pass/Fail)**: _____________________
