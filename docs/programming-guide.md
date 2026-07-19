# Zalando Middleware Orchestrator - Programming Guide

### The Codebase Map: A High-Level View

Your project follows a strict domain-driven structure. Instead of dumping everything into one folder, responsibilities are cleanly separated into `config`, `database`, `services`, and `transmission`.

```text
zal-middleware-aw/
├── specs/               # API Contracts (Epic 1)
├── prisma/              # Database schema (Epic 3)
├── src/
│   ├── config/          # Environment & routing constants (Epic 2)
│   ├── database/        # SQL Server interactions (Epic 3)
│   ├── scripts/         # Utility and testing scripts (Epics 1, 2, 3)
│   ├── services/        # External infrastructure (Epic 4)
│   ├── transmission/    # Data transformation and network boundary (Epics 2 & 4)
│   └── server.ts        # The main application entry point
└── test/                # Automated verification (Epic 4)
```

---

### Epic 1: The Contract Baseline

*The goal of Epic 1 was to establish the absolute truth of what Zalando expects before writing a single line of business logic.*

* **`specs/openapi.yaml`**
  * **What it is:** The master contract. It defines the strict `ArticleModel`, `ArticleConfig`, and `ArticleSimple` hierarchy, along with properties like `base_color` and `media`.
  * **What it does:** It acts as the blueprint. If our code generates JSON that doesn't match this file, Zalando will reject the payload.

* **`src/scripts/verify-zally.ts`**
  * **What it is:** The automated schema enforcer.
  * **What it does:** It sends our `openapi.yaml` file to Zalando's Zally linter to mathematically prove our contract uses the correct `snake_case` naming conventions and required HTTP headers.

---

### Epic 2: The Transmission Core

*The goal of Epic 2 was to set up secure, centralized network rules so the application never relies on fragile, hardcoded strings.*

* **`src/config/env.ts` & `src/config/api.ts`**
  * **What they are:** The centralized dictionaries.
  * **What they do:** They load environment variables (like OAuth secrets and API endpoints) and lock them into constant objects. If an endpoint URL changes, you update it here, and the entire app inherits the fix.

* **`src/transmission/AuthManager.ts`**
  * **What it is:** The security bouncer.
  * **What it does:** It negotiates with Zalando's OAuth2 server, trading our `CLIENT_ID` and `CLIENT_SECRET` for a temporary Bearer token required to submit products. It includes preemptive cache refreshing.

* **`src/scripts/test-auth.ts`**
  * **What it is:** A local test script.
  * **What it does:** Proves that the `AuthManager` successfully talks to the local Stoplight Prism mock server or Zalando Sandbox.

---

### Epic 3: Database Extraction

*The goal of Epic 3 was to connect to the legacy AdventureWorks Microsoft SQL database and carefully extract only what we need.*

* **`prisma/schema.prisma`**
  * **What it is:** The Object-Relational Mapping (ORM) definition.
  * **What it does:** It maps the physical legacy SQL Server tables (like `Product`, `ProductModel`, and `ProductPhoto`) into TypeScript objects that Node.js can easily read.

* **`src/database/AdventureWorksRepository.ts`**
  * **What it is:** The data miner.
  * **What it does:** It executes the `getSellableProducts()` query. It applies strict `WHERE` clauses to ignore non-retail infrastructure parts and trims legacy spaces off string values so the data is clean the moment it enters Node.

* **`src/scripts/test-db.ts`**
  * **What it is:** The extraction layer health check.
  * **What it does:** It runs a standalone script verifying the Prisma connection, measuring payload sizes, and assuring accurate SQL filtering logic outside the main Express loop.

---

### Epic 4: Data Transformation & Media Routing

*The goal of Epic 4 was to reshape the flat SQL data into the Zalando hierarchy, offload the heavy images, and orchestrate the final network push.*

* **`src/transmission/ZalandoTransformer.ts`**
  * **What it is:** The data reshaper.
  * **What it does:** It loops through the flat array of SQL rows and uses memory-efficient `Map` objects to group them into Zalando's strict 1:N hierarchy (Model -> Configs -> Simples). It also handles color translation and formats MinIO URLs.

* **`src/services/MinioService.ts`**
  * **What it is:** The media handler.
  * **What it does:** It connects to our local MinIO storage bucket. Instead of embedding massive binary images as Base64 strings into the JSON payload, it uploads the physical `Buffer` files to the bucket and replaces them with secure CDN URLs.

* **`src/transmission/ZalandoClient.ts`**
  * **What it is:** The final network messenger.
  * **What it does:** It takes the finalized JSON payload, requests a secure token from `AuthManager`, and physically executes the `POST` request to Zalando's ingestion API. It utilizes `axios` and `axios-retry` to provide extreme resilience, automatically backing off and retrying if Zalando throws a `429 Too Many Requests` or `5xx` error.

* **`src/transmission/ProductsRouter.ts`**
  * **What it is:** The Conductor.
  * **What it does:** This is the Express route (`/api/v1/export`) that orchestrates everything. When triggered, it tells the `AdventureWorksRepository` to fetch data, tells `MinioService` to upload deduplicated images, tells `ZalandoTransformer` to format the JSON, and tells `ZalandoClient` to send it.

* **`src/server.ts`**
  * **What it is:** The Main Application Entry Point.
  * **What it does:** Mounts the `ProductsRouter` and starts the Express HTTP server so the pipeline can be cleanly invoked externally via HTTP requests.

---

### The Testing Layer

*Built throughout the epics to strictly enforce the "Evidentiary Standard."*

* **`test/general/`**
  * **What it is:** Unit tests running on synthetic (fake) data.
  * **What it does:** Proves the underlying math works. It ensures the transformer groups data correctly, maps sequential photo IDs, evaluates falsy logic safely, and handles high-volume loads (5,000 records) without crashing.
  * **Epic 5 Schema Compliance:** Crucially, this suite also asserts that every generated payload explicitly contains all required `openapi.yaml` fields (`brand_code`, `supplier_color`, etc.) and refuses nested wrappers.

* **`test/snapshots/`**
  * **What it is:** Integration tests running on physical legacy data.
  * **What it does:** Acts as an immutable guardrail. It locks in the fact that our 157 specific AdventureWorks rows must always result in exactly 60 Zalando Models. If future code breaks this ratio, the pipeline fails before deploying.
