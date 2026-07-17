# Zalando Middleware Orchestrator

A data ingestion middleware that transforms raw vendor catalogue data (e.g. Myntra Kaggle dataset) into Zalando-compliant "Golden Payloads" matching their strict schema requirements.

## Overview

The pipeline is a strict funnel designed to **reject ambiguous data** rather than corrupt the final payload. Records flow through three stages:

1. **Extraction** — Parses raw CSV data and extracts Zalando-required attributes (colours, silhouette, size grids). Items missing a colour or recognisable size are routed to the Dead Letter Queue.
2. **Failure Recovery** — Scans the Dead Letter Queue and attempts to salvage items using Marketing Colours mapping and Assortment Normalisation.
3. **Re-Ingestion** — Feeds salvaged items back through the strict Extraction script. Permanently rejects anything that still fails.

## Tech Stack

- **Runtime**: Node.js (v22+)
- **Language**: TypeScript (executed via `tsx`)
- **HTTP Client**: Axios with `axios-retry` (exponential backoff, retry on 429 / 5xx)
- **Auth**: OAuth2 Client Credentials flow with in-memory token caching and pre-emptive refresh

## Getting Started

```bash
# Install dependencies
npm install

# Run the extraction pipeline
npx tsx src/scripts/extract-kaggle.ts

# Run the test suite
npx tsx --test test/*.test.ts

# Launch the GUI Orchestrator
npx tsx src/server/gui-server.ts
# Then open http://localhost:4050
```

## Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](docs/setup.md) | Prerequisites and installation |
| [User Guide](docs/user-guide.md) | Full walkthrough of the GUI Orchestrator |
| [Taxonomy](docs/taxonomy.md) | Colour extraction rules and architectural tradeoffs |
| [Size Patterns](docs/size-patterns.md) | Size grid mapping logic |
| [Colour Limitations](docs/color-limitations.md) | Known limitations of the colour pipeline |
| [Transmission Strategy](docs/transmission-strategy.md) | OAuth2 caching and retry resilience |
| [Data Cleanup Spec](docs/data-cleanup-spec.md) | Data quality and cleanup specifications |
| [UAT Script](docs/uat-script.md) | User acceptance testing script |
| [Failure Report](docs/failure-report.md) | Failure analysis and reporting |

## API Specs

- [OpenAPI Spec](specs/openapi.yaml) — Zalando-compliant API contract
- [Known Bad Spec](specs/openapi-known-bad.yaml) — Spec with documented deviations for testing

## License

Private — All rights reserved.
