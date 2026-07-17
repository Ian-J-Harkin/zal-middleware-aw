# Epic 2: The Transmission Core

This plan outlines the architecture and execution strategy for building the HTTP transmission layer, ensuring strict adherence to the Anti-Magic-String rule and robust error handling.

## Proposed Changes

### 1. Configuration Layer
#### [NEW] src/config/env.ts
- Validate the presence of essential environment variables (e.g., `PRISM_URL`, `CLIENT_ID`, `CLIENT_SECRET`).
- Immediately throw a `new Error()` on startup if any variables are missing, failing fast to prevent runtime network errors.

#### [NEW] src/config/api.ts
- Serve as the single source of truth for routing.
- Define `ZALANDO_API` using the exact snippet provided (binding to `/tokens`, `/articles`, and the `article.write` scope).

### 2. Transmission Layer
#### [NEW] src/transmission/AuthManager.ts
- Implement the OAuth2 Client Credentials flow.
- Maintain an in-memory token cache.
- Implement a 60-second preemptive refresh boundary (if `expires_at` is within 60 seconds, fetch a new token).
- Strictly utilize `ZALANDO_API.ENDPOINTS.TOKENS` and `ZALANDO_API.SCOPES.ARTICLE_WRITE`.

#### [NEW] src/transmission/ZalandoClient.ts
- Export an Axios instance configured to point to `ZALANDO_API.ENDPOINTS.ARTICLES`.
- Integrate `axios-retry` to handle `429 Too Many Requests` and `5xx Server Errors` with exponential backoff.
- Use an Axios request interceptor to automatically request and append the Bearer token from `AuthManager` on every outbound request.

### 3. Dependencies
#### [MODIFY] package.json
- Run `npm install axios-retry dotenv` to support the retry mechanism and strict environment variable loading.

### 4. Integration Testing
#### [NEW] src/scripts/test-auth.ts
- Initialize `AuthManager` with mock credentials.
- Execute `.getToken()` against the live Prism container on port 4010.
- Print the resulting token to the console to mathematically prove the transmission core connects to the contract.

## Verification Plan

- Execute `tsx src/scripts/test-auth.ts` and ensure a `200 OK` is returned by Prism, verifying that the mock server correctly responds to the `/tokens` endpoint with the `article.write` scope.
