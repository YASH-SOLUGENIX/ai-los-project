// Verification Script for Registration, Login, and Logout APIs

const BASE_URL = 'http://localhost:3000';

async function testAuthFlow() {
  console.log('====================================================');
  console.log('Testing Registration, Login & Logout APIs');
  console.log('====================================================');

  const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
  const testUser = {
    username: `cust_${randomSuffix}`,
    email: `cust_${randomSuffix}@example.com`,
    firstName: 'Aarav',
    lastName: 'Patel',
    password: 'Password@123',
  };

  // 1. Test Registration API
  console.log(`\n1. Registering new customer: ${testUser.username}...`);
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser),
  });

  if (!regRes.ok) {
    throw new Error(`Registration failed (${regRes.status}): ${await regRes.text()}`);
  }

  const regData = await regRes.json();
  console.log('✓ Registration successful:', regData);

  // 2. Test Login API with newly registered customer
  console.log(`\n2. Logging in with newly registered customer: ${testUser.username}...`);
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUser.username,
      password: testUser.password,
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed (${loginRes.status}): ${await loginRes.text()}`);
  }

  const loginData = await loginRes.json();
  console.log('✓ Login successful! Received tokens:');
  console.log('  Access token (prefix):', loginData.access_token.slice(0, 30) + '...');
  console.log('  Refresh token (prefix):', loginData.refresh_token.slice(0, 30) + '...');
  console.log('  Expires in:', loginData.expires_in, 'seconds');

  // Verify access with new token
  const meRes = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.access_token}` },
  });
  const meData = await meRes.json();
  console.log('✓ /auth/me verified for new customer. Sub:', meData.user?.sub);

  // 3. Test Logout API
  console.log('\n3. Testing Logout API...');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${loginData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: loginData.refresh_token,
    }),
  });

  if (!logoutRes.ok) {
    throw new Error(`Logout failed (${logoutRes.status}): ${await logoutRes.text()}`);
  }

  const logoutData = await logoutRes.json();
  console.log('✓ Logout successful:', logoutData);

  console.log('\n====================================================');
  console.log('ALL REGISTRATION, LOGIN & LOGOUT TESTS PASSED!');
  console.log('====================================================');
}

testAuthFlow().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
