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
```

---

## 2. System Architecture

The project is being constructed across a 5-Epic roadmap. Currently, the foundational layers are active:

### Epic 1: Contract Baseline
The API contract (`specs/openapi.yaml`) defines exactly how our AdventureWorks products are modeled (via `ArticleModel` and `ArticleConfig`). 
- **Validation**: Run `npm run lint:api` to send the schema to Zally. It will ensure that all properties (such as our newly added `base_color` and `media` elements) strictly conform to Zalando's `ASCII snake_case` rules.

### Epic 2: The Transmission Core
All outbound HTTP traffic routes through a centralized configuration to prevent "magic string" bugs.
- **AuthManager**: Operates the OAuth2 Client Credentials flow, targeting the `/tokens` endpoint for the `article.write` scope. Includes a 60-second preemptive token refresh cache.
- **ZalandoClient**: A dedicated Axios instance armed with exponential backoff retries to automatically navigate `429 Too Many Requests` or `5xx Server Errors`.
- **Validation**: Run `npx tsx src/scripts/test-auth.ts` to test the runtime integration against the Prism mock server.

### Epic 3: Database Extraction (Upcoming)
*(This architecture is currently under development)*
The upcoming Epic 3 will establish the extraction layer connecting directly to the Microsoft AdventureWorks SQL instance.
- Expected behavior includes pulling live SQL rows, cleaning them against our data dictionary, and feeding them into the strict `ArticleModel` payloads. Items that lack critical Zalando attributes will be directed to a Dead Letter Queue to prevent pipeline pollution.

---

## 3. Extensibility & Maintenance

The pipeline is built for extensibility:
- **Updating the Schema**: If Zalando updates their REST requirements, modify `specs/openapi.yaml`. You **must** run `npm run lint:api` afterward. If Zally rejects it, the CI pipeline will fail.
- **Updating Routes**: All routing logic is strictly centralized in `src/config/api.ts`. Do not use hardcoded string literals inside API services.
