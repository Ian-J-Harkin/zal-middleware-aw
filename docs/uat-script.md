# User Acceptance Testing (UAT) Script

**Project**: Zalando Middleware AdventureWorks Orchestrator
**Objective**: To verify that the Integration Pipeline securely connects the Microsoft AdventureWorks database to the Zalando API while mathematically enforcing schema contracts.
**Tester Role**: Integration Engineer / QA Analyst

---

## Pre-Requisites
1. Node.js v22+ is installed on the testing machine.
2. The Docker stack (Zally, Postgres, and Prism) is running (`docker-compose up -d`).
3. `.env` is correctly configured with `PRISM_URL`, `CLIENT_ID`, and `CLIENT_SECRET`.

---

## Test Scenario 1: Zally Gate Contract Verification (Epic 1)

**Description**: Verify that the local OpenAPI schema strictly adheres to Zalando's property naming rules (e.g., ASCII snake_case) and accurately validates our extensions (`base_color`, `media`).

**Steps**:
1. Open a terminal in the root of the project.
2. Run the linting verification script: `npm run lint:api`.
3. Wait for the Zally Docker container to process the schemas.

**Expected Results**:
- [ ] The terminal prints `Results for openapi.yaml: MUST Violations found: 0`.
- [ ] The terminal prints `Results for openapi-known-bad.yaml: MUST Violations found: 1`.
- [ ] The terminal prints `✅ GATE VERIFIED: The Zally linter is active and correctly enforcing rules.`

---

## Test Scenario 2: Transmission Core Authentication (Epic 2)

**Description**: Verify that the `AuthManager` correctly targets the `/tokens` mock endpoint, requests the `article.write` scope, and successfully retrieves an OAuth2 token from the Prism server using an Anti-Magic-String architecture.

**Steps**:
1. Open a terminal in the root of the project.
2. Execute the integration test: `npx tsx src/scripts/test-auth.ts`.
3. Ensure Prism is running locally on port 4010.

**Expected Results**:
- [ ] The terminal prints `Testing AuthManager and Prism integration...`.
- [ ] The terminal prints `✅ 200 OK: Successfully retrieved token from Prism mock server.`
- [ ] A mock token payload is successfully captured and displayed.

---

## Test Scenario 3: AdventureWorks SQL Extraction (Epic 3 - Placeholder)

**Description**: Verify that the application successfully connects to the Microsoft AdventureWorks database and correctly maps raw product records into intermediate Zalando taxonomy models.

**Steps**: *(To be finalized during Epic 3)*
1. Boot the AdventureWorks SQL Server container.
2. Run the `test-db-extraction.ts` script.

**Expected Results**: *(Subject to change)*
- [ ] Database connection establishes successfully without magic strings.
- [ ] Product rows are queried and mapped to `ArticleModel` components.
- [ ] Discrepancies or un-mappable items are routed to a local Dead Letter Queue.

---

### Sign-off
**Tester Name**: ___________________________
**Date**: ___________________________
**Status (Pass/Fail)**: _____________________
