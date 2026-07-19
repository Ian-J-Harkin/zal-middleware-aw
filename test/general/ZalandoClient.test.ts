import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { ZalandoClient } from '../../src/transmission/ZalandoClient';
import { AuthManager } from '../../src/transmission/AuthManager';

describe('ZalandoClient - Axios Network Transmission Suite', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it('should acquire a token and transmit the payload successfully', async () => {
    mock.method(AuthManager, 'getToken', async () => 'mock-oauth-token');

    const client = new ZalandoClient();
    
    // Mock the axios adapter directly
    let callCount = 0;
    client.internalClient.defaults.adapter = async (config) => {
      callCount++;
      return {
        data: { message: 'Accepted' },
        status: 202,
        statusText: 'Accepted',
        headers: {},
        config
      } as any;
    };

    const syntheticPayload = [{ model_sku: 'TEST-123' }];
    await client.submitProducts(syntheticPayload);

    assert.strictEqual(callCount, 1);
  });

  it('should throw an error and abort if the Zalando API returns a 400 Bad Request', async () => {
    mock.method(AuthManager, 'getToken', async () => 'mock-oauth-token');

    const client = new ZalandoClient();
    
    let callCount = 0;
    client.internalClient.defaults.adapter = async (config) => {
      callCount++;
      return Promise.reject({
        config,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Schema validation failed' }
        }
      });
    };
    
    await assert.rejects(
      async () => await client.submitProducts([{ model_sku: 'BAD-DATA' }]),
      (err: Error) => {
        assert.ok(err.message.includes('HTTP 400 Bad Request'));
        assert.ok(err.message.includes('Schema validation failed'));
        return true;
      }
    );

    // Should NOT retry on 400
    assert.strictEqual(callCount, 1, 'Should fail immediately and not retry on 400');
  });

  it('should retry on 429 Too Many Requests', async () => {
    mock.method(AuthManager, 'getToken', async () => 'mock-oauth-token');

    const client = new ZalandoClient();
    
    let callCount = 0;
    client.internalClient.defaults.adapter = async (config) => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject({
          config,
          response: { status: 429, statusText: 'Too Many Requests', data: {} }
        });
      }
      return { data: 'success', status: 200, statusText: 'OK', headers: {}, config } as any;
    };

    // Override retry delay for speed in tests
    client.internalClient.defaults.headers['x-test'] = '1'; // just forcing it

    await client.submitProducts([{ model_sku: 'TEST-123' }]);

    assert.strictEqual(callCount, 2, 'Should have retried once after the 429');
  });
});
