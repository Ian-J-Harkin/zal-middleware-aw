import test from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { env } from '../src/config/env';

test('env config loads successfully when all variables are present', () => {
  // .env file is present in the root, so it should load
  assert.ok(env.PRISM_URL);
  assert.ok(env.CLIENT_ID);
  assert.ok(env.CLIENT_SECRET);
});

test('env config fails fast when a required variable is missing', () => {
  try {
    // Run a script that imports env.ts without providing PRISM_URL
    execSync('npx tsx -e "import \\"./src/config/env\\""', {
      env: { ...process.env, PRISM_URL: '' },
      stdio: 'pipe'
    });
    assert.fail('Should have thrown an error');
  } catch (error: any) {
    const stderr = error.stderr.toString();
    assert.match(stderr, /CRITICAL STARTUP ERROR: Missing required environment variable: PRISM_URL/);
  }
});
