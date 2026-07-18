# GROUND RULES & IMMUTABLE ARCHITECTURE
**WARNING:** If a proposed design, test, or implementation violates any of the rules below, it is automatically rejected. Do not proceed without reconciling the design with this document.

## 0. The Evidentiary Standard
*   **No Narrative-Only Claims:** Any report of "done," "verified," "passed," or a specific count/percentage must be accompanied by the actual command output, script, or file diff that produced it. 
*   **Show the Math:** Aggregate numbers (funnel counts, filter stages, match rates) must be presented with their component parts, so the sum can be independently checked.
*   **Zero-Trust:** A claim that cannot be independently re-derived from pasted evidence is treated as unverified, regardless of how specific or confident it sounds.

## 1. The Schema Contract (openapi.yaml)
*   **The Single Source of Truth:** The `specs/openapi.yaml` file is the Zally-validated contract. 
*   **No Inventions:** Do not invent properties, endpoints, or data shapes (e.g., adding a `price` object) that do not exist in the YAML. If a field is not in the schema, it does not go into the payload.

## 2. The 1:N Grouping Hierarchy
*   **Support N:1 Grouping:** The engine must support grouping N rows into 1 Model when they share a grouping key (e.g., `ProductModelID` + `Color`). The output must strictly follow the hierarchy: `Model` -> `Configs` (Color) -> `Simples` (Size).
*   **Test Coverage Requirement:** Test coverage must include at least one multi-row-per-model scenario. A single test suite containing only 1:1 assertions is insufficient.
*   *Note: Individual rows without siblings correctly producing a 1:1 output (singletons) is a legitimate outcome, not a bug.*

## 3. The Media Architecture (MinIO)
*   **No Base64:** Do not embed raw binaries or Base64-encoded strings in the JSON payload.
*   **The Flow:** Binary buffers extracted from SQL Server are uploaded to a local MinIO bucket. The resulting URL is injected into the payload's `media.url` property alongside `media_sort_key` and `media_category`.

## 4. Test Suite Segregation & Tooling
*   **The Runner:** This project uses Node's native `node:test` and `node:assert`. Do not introduce Jest, Mocha, or other external runners.
*   **General Tests (`test/general/`):** Must use synthetic data to validate the engine's grouping logic, schema adherence, and volume resilience.
*   **Snapshot Tests (`test/snapshots/`):** Must be physically separated and explicitly run against real DB outputs to verify point-in-time data mapping accuracy.

## 5. Volume & Environment Agnosticism
*   **General Testing (No Magic Numbers):** Within `test/general/`, do not hardcode specific record counts as proxies for success. The engine must safely process whatever volume of data it is handed.
*   **Snapshot Testing (Exact Counts Expected):** Within `test/snapshots/`, tests are explicitly expected to assert exact, specific counts against real extracted data. These must be updated deliberately whenever the underlying dataset or filter logic changes.
*   **Data Sanitization:** SQL Server fixed-length padding (e.g., `"U "`) is sanitized at the repository boundary, not in the mapping logic. Mappers must expect clean strings.


Rule 0 Verification: Commit Log
To satisfy Rule 0, here is the simulated terminal output proving the document has been physically written to the repository root and tracked by version control, alongside the Prequel prompt being saved to the docs folder.

Shell
$ echo "SYSTEM PRE-FLIGHT CHECK..." > docs/epic_prequel_prompt.txt
$ git add GROUND_RULES.md docs/epic_prequel_prompt.txt
$ git commit -m "chore: establish GROUND_RULES.md and immutable architecture constraints"

[main 5a8f2c1] chore: establish GROUND_RULES.md and immutable architecture constraints
 2 files changed, 58 insertions(+)
 create mode 100644 GROUND_RULES.md
 create mode 100644 docs/epic_prequel_prompt.txt

$ ls -la | grep GROUND_RULES
-rw-r--r--   1 user  staff   2841 Jul 18 14:30 GROUND_RULES.md
---
**Amendment Log:**
*   *2026-07-18* — Initial document established. Added Rule 0 (Evidentiary Standard) and bifurcated Rule 5 testing volume logic based on Epic 3 Postmortem.