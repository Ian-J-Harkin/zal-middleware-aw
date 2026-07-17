# Documentation Rewrite Plan: AdventureWorks Pipeline

This plan outlines the strategy for rewriting the legacy Myntra-based UAT script and User Guide to reflect our brand-new Microsoft AdventureWorks integration pipeline.

## User Review Required

Since we have only completed Epic 1 (Contract Baseline) and Epic 2 (Transmission Core), should these documents focus **exclusively** on testing and using the infrastructure we've built so far (Zally Gate, AuthManager, and Prism Mock)? Or would you like me to outline placeholders for the upcoming Database Extraction and GUI Orchestrator layers as well?

Currently, I propose rewriting them to focus on validating the infrastructure we just built.

## Proposed Changes

### 1. [MODIFY] `docs/uat-script.md`
- **Objective Update**: Change from Myntra Data Funnel to the AdventureWorks Integration Pipeline.
- **Test Scenario 1 (Zally Gate Verification)**: Replace the legacy E2E extraction test with a UAT step to verify the OpenAPI schema against the Zally Docker container (`npm run lint:api`).
- **Test Scenario 2 (Transmission Core & Prism)**: Replace the Golden Payload validation with a UAT step to verify the `AuthManager` can successfully acquire an OAuth2 token from the live Prism mock server (`npx tsx src/scripts/test-auth.ts`).
- **Future Scenarios**: Add a placeholder section for the AdventureWorks Database Extraction (Epic 3).

### 2. [MODIFY] `docs/user-guide.md`
- **Introduction**: Update the context to explain the new enterprise-grade pipeline connecting Microsoft AdventureWorks to the Zalando API.
- **Getting Started**:
  - Update prerequisites to include the Docker stack (Prism and Zally).
  - Document the `.env` configuration requirements.
- **Architecture Overview**:
  - Explain the **Contract Baseline** (Zally mathematical enforcement).
  - Explain the **Transmission Core** (Axios retry logic, preemptive token refresh).
- **Execution Commands**: Detail how to boot the infrastructure (`docker-compose up -d`), run the linter, and run the auth integration test.
