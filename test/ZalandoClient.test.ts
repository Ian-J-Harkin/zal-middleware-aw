import test from 'node:test';
import assert from 'node:assert';
import { ZalandoClient } from '../src/transmission/ZalandoClient';
import { AuthManager } from '../src/transmission/AuthManager';

test('ZalandoClient Retry Logic and Interceptors', async (t) => {
  // Mock AuthManager to prevent real network requests
  AuthManager.getToken = async () => 'mock_auth_token';

  await t.test('Retries on 429 Too Many Requests and injects Authorization', async () => {
    let callCount = 0;
    
    // Override Axios adapter to mock responses internally
    ZalandoClient.defaults.adapter = async (config) => {
      callCount++;
      if (callCount < 2) {
        return Promise.reject({ config, response: { status: 429 } });
      }
      return { 
        data: 'success', 
        status: 200, 
        statusText: 'OK', 
        headers: {}, 
        config 
      } as any;
    };

    // We disable retryDelay for tests to speed them up
    const res = await ZalandoClient.get('/test', {
      'axios-retry': { retries: 3, retryDelay: () => 0 }
    });

    assert.strictEqual(res.data, 'success');
    assert.strictEqual(callCount, 2, 'Should have retried once after the 429');
    
    // Assert interceptor behavior
    assert.strictEqual(
      res.config.headers?.['Authorization'], 
      'Bearer mock_auth_token',
      'Bearer token should be injected by interceptor'
    );
  });

  await t.test('Fails fast on 400 Bad Request (no retries)', async () => {
    let callCount = 0;
    
    ZalandoClient.defaults.adapter = async (config) => {
      callCount++;
      return Promise.reject({ config, response: { status: 400 } });
    };

    await assert.rejects(
      async () => await ZalandoClient.get('/test', {
        'axios-retry': { retries: 3, retryDelay: () => 0 }
      }),
      (err: any) => err.response.status === 400
    );
    
    assert.strictEqual(callCount, 1, 'Should fail immediately and not retry on 400');
  });

  await t.test('Retries on 503 Server Error', async () => {
    let callCount = 0;
    
    ZalandoClient.defaults.adapter = async (config) => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject({ config, response: { status: 503 } });
      }
      return { data: 'success', status: 200, statusText: 'OK', headers: {}, config } as any;
    };

    const res = await ZalandoClient.get('/test', {
      'axios-retry': { retries: 3, retryDelay: () => 0 }
    });

    assert.strictEqual(res.data, 'success');
    assert.strictEqual(callCount, 3, 'Should have retried twice after 503s');
  });
});
