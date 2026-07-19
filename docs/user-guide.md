# Zalando Middleware Orchestrator - User Guide

Welcome to the Zalando Middleware Pipeline! This system is an enterprise-grade integration designed to extract data from a Microsoft AdventureWorks database, validate it against Zalando's strict OpenAPI schema, and transmit it seamlessly to Zalando's REST APIs.

---

## 1. Getting Started

### Prerequisites
- Node.js (v22+)
- Docker and Docker Compose

### Initializing the Infrastructure
The pipeline relies on a local Docker stack to mock Zalando's infrastructure:
1. **Stoplight Prism**: Serves as a live mock for the Zalando REST API.
2. **Zalando Zally**: Mathematically verifies that our API schemas do not violate Zalando routing or property-naming rules.

To boot the infrastructure:
```bash
docker-compose up -d
```

### Environment Configuration
Ensure you have a `.env` file located in the root directory. The application enforces a strict "Fail-Fast" startup if any of these are missing:
```env
PRISM_URL=http://127.0.0.1:4010
CLIENT_ID=mock_client_id
CLIENT_SECRET=mock_client_secret
DATABASE_URL="sqlserver://host.docker.internal\INSTANCE_NAME;database=AdventureWorks2022;integratedSecurity=true;trustServerCertificate=true;"
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=zalando-media
ZALANDO_API_URL=https://api-sandbox.merchants.zalando.com
```

---

## 2. System Architecture

The project is being constructed across a 5-Epic roadmap. Currently, Epics 1 through 4 are complete:

### Epic 1: Contract Baseline
The API contract (`specs/openapi.yaml`) defines exactly how our AdventureWorks products are modeled (via `ArticleModel` and `ArticleConfig`). 
- **Validation**: Run `npm run lint:api` to send the schema to Zally. It will ensure that all properties (such as our newly added `base_color` and `media` elements) strictly conform to Zalando's `ASCII snake_case` rules.

### Epic 2: The Transmission Core
All outbound HTTP traffic routes through a centralized configuration to prevent "magic string" bugs.
- **AuthManager**: Operates the OAuth2 Client Credentials flow, targeting the `/tokens` endpoint for the `article.write` scope.
- **ZalandoClient**: A dedicated API transmission client to securely wrap and push payloads to the Zalando network boundary.
- **Validation**: Run `npx tsx src/scripts/test-auth.ts` to test the runtime integration against the Prism mock server.

### Epic 3: Database Extraction
Establishes the extraction layer connecting directly to the Microsoft AdventureWorks SQL instance via Prisma ORM.
- Pulls live SQL rows (`getSellableProducts()`), cleaning them against our data dictionary and trimming extraneous spaces. Filters strictly to return only valid, sellable items (products mapped to a Model, possessing photos), dropping non-retail infrastructure parts.

### Epic 4: Data Transformation and MinIO Integration
Transforms the flat SQL relational data into the highly structured 1:N `Model -> Config -> Simple` object hierarchy required by Zalando.
- **MinIO Object Storage**: Uploads both thumbnail and large Product photos dynamically to a MinIO bucket and replaces binary buffers with secure CDN URLs.
- **Zalando Transformer**: Maps colors and sizes, sequentially sorting media, strictly adhering to the `openapi.yaml` schema.
- **Orchestration**: Express router (`ProductsRouter`) that extracts rows, triggers MinIO uploads, executes the transformation, and transmits the payload directly via the `ZalandoClient`.
- **Validation**:
  - `npm run test:general`: Volume-resilient mathematical unit test suite ensuring large payloads group efficiently.
  - `npm run test:snapshots`: Point-in-time physical data tests against known legacy records to ensure zero regression drift.

---

## 3. Extensibility & Maintenance

The pipeline is built for extensibility:
- **Updating the Schema**: If Zalando updates their REST requirements, modify `specs/openapi.yaml`. You **must** run `npm run lint:api` afterward. If Zally rejects it, the CI pipeline will fail.
- **Updating Routes**: All routing logic is strictly centralized in `src/config/api.ts`. Do not use hardcoded string literals inside API services.
