import test, { mock } from 'node:test';
import assert from 'node:assert';
import axios from 'axios';
import { AuthManager } from '../src/transmission/AuthManager';

test('AuthManager Token Acquisition and Caching', async (t) => {
  // Clear any internal cached state before test
  (AuthManager as any).cachedToken = null;
  (AuthManager as any).tokenExpiresAt = 0;

  let postCallCount = 0;
  
  // Mock axios.post
  const mockPost = mock.method(axios, 'post', async () => {
    postCallCount++;
    return {
      data: {
        access_token: 'mocked_token_123',
        token_type: 'Bearer',
        expires_in: 3600 // 1 hour
      }
    };
  });

  await t.test('Acquires token on first call', async () => {
    const token = await AuthManager.getToken();
    assert.strictEqual(token, 'mocked_token_123');
    assert.strictEqual(postCallCount, 1);
  });

  await t.test('Returns cached token on subsequent calls', async () => {
    const token = await AuthManager.getToken();
    assert.strictEqual(token, 'mocked_token_123');
    assert.strictEqual(postCallCount, 1, 'Should not fire another HTTP request');
  });

  await t.test('Preemptively refreshes when token expires within 60 seconds', async () => {
    // Simulate token expiring in 30 seconds
    (AuthManager as any).tokenExpiresAt = Math.floor(Date.now() / 1000) + 30;
    
    const token = await AuthManager.getToken();
    assert.strictEqual(token, 'mocked_token_123');
    assert.strictEqual(postCallCount, 2, 'Should fire a new HTTP request to refresh');
  });

  await t.test('Throws clean error on network failure', async () => {
    (AuthManager as any).cachedToken = null;
    (AuthManager as any).tokenExpiresAt = 0;

    mockPost.mock.mockImplementationOnce(async () => {
      throw new Error('Network Error');
    });

    await assert.rejects(
      async () => await AuthManager.getToken(),
      (err: Error) => {
        assert.match(err.message, /Failed to retrieve OAuth2 token/);
        return true;
      }
    );
  });
});
