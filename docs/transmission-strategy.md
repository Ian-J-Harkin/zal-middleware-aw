# Transmission Strategy

## OAuth2 Caching Strategy
The client implements a robust OAuth2 Client Credentials flow caching mechanism to optimize network calls and minimize latency:
1. **Token Retrieval**: On the first request, the `AuthManager` issues a POST to `/oauth2/token` to fetch an `access_token`.
2. **In-Memory Cache**: The resulting token is cached in-memory, avoiding round-trips to the authorization server for subsequent requests.
3. **Pre-emptive Refresh**: The `expires_in` response defines the token's lifetime. To prevent token expiration mid-flight during heavy syncing, the `AuthManager` preemptively refreshes the token if it is within 60 seconds of its expiry boundary. 

## Resilience & Retry Strategy
A custom HTTP client built on `axios` and `axios-retry` adds extreme resilience to the ingestion pipeline.
- The client automatically retries up to 3 times with an exponential backoff delay.
- Retries are explicitly restricted to `429 Too Many Requests` and `>= 500` internal server errors.
- Method checking (which by default prevents POST retries in `axios-retry`) is bypassed via a custom `retryCondition`.

> [!CAUTION]
> **Idempotency and POST Retries in Production**
> 
> Retrying a `POST` request is inherently dangerous. While this pipeline safely retries POST requests against a stateless mock API for Epic 2, doing so in a real production environment risks duplicate resource creation. 
> 
> If an initial `POST` successfully reaches the server and creates the resource, but the network drops the `201 Created` response on the way back to the client, the client will incorrectly assume failure. Retrying that `POST` will create a duplicate. 
> 
> In a production environment, this must be mitigated by using idempotent endpoints (e.g., `PUT` with a deterministic ID) or implementing idempotency keys (e.g., `Idempotency-Key: <uuid>`) on the server side.
