import { AuthManager } from '../transmission/AuthManager';

async function testAuth() {
  console.log('Testing AuthManager and Prism integration...');
  try {
    const token = await AuthManager.getToken();
    console.log('✅ 200 OK: Successfully retrieved token from Prism mock server.');
    console.log(`Token data received: Bearer ${token.substring(0, 15)}...`);
  } catch (error: any) {
    console.error('❌ Failed to retrieve token from Prism:', error.message);
    process.exit(1);
  }
}

testAuth();
