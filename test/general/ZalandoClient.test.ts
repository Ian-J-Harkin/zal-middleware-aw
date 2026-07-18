import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { ZalandoClient } from '../../src/transmission/ZalandoClient';
import { AuthManager } from '../../src/transmission/AuthManager';

describe('ZalandoClient - Network Transmission Suite', () => {
  it('should acquire a token and transmit the payload successfully', async () => {
    // 1. Mock the AuthManager to prevent live token requests
    mock.method(AuthManager, 'getToken', async () => 'mock-oauth-token');

    // 2. Mock the global fetch API to prevent live Zalando submissions
    const mockFetch = mock.method(global, 'fetch', async () => {
      return {
        ok: true,
        status: 202,
        json: async () => ({ message: 'Accepted' })
      };
    });

    const client = new ZalandoClient();
    const syntheticPayload = [{ model: { model_sku: 'TEST-123' } }];

    await client.submitProducts(syntheticPayload);

    // 3. Verify the network contract
    assert.strictEqual(mockFetch.mock.calls.length, 1);
    
    const fetchArgs = mockFetch.mock.calls[0].arguments;
    assert.ok(fetchArgs[0].includes('/products'));
    
    const requestOptions = fetchArgs[1];
    assert.strictEqual(requestOptions.method, 'POST');
    assert.strictEqual(requestOptions.headers['Authorization'], 'Bearer mock-oauth-token');
    
    const body = JSON.parse(requestOptions.body);
    assert.strictEqual(body.items.length, 1);
    assert.strictEqual(body.items[0].model.model_sku, 'TEST-123');

    // Cleanup mocks
    mock.restoreAll();
  });

  it('should throw an error and abort if the Zalando API returns a non-2xx status', async () => {
    mock.method(AuthManager, 'getToken', async () => 'mock-oauth-token');

    const mockFetch = mock.method(global, 'fetch', async () => {
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => '{"error": "Schema validation failed"}'
      };
    });

    const client = new ZalandoClient();
    
    await assert.rejects(
      async () => await client.submitProducts([{ model: { model_sku: 'BAD-DATA' } }]),
      (err: Error) => {
        assert.ok(err.message.includes('HTTP 400 Bad Request'));
        assert.ok(err.message.includes('Schema validation failed'));
        return true;
      }
    );

    mock.restoreAll();
  });
});
