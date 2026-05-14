
async function testApi() {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+91866644db55', // Test Driver's phone
      password: 'password123'
    })
  });

  const loginData = await response.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData.error);
    return;
  }

  const token = loginData.data.access_token;
  console.log('Login successful, token obtained.');

  const tripsResponse = await fetch('http://localhost:3000/api/trips?status=scheduled', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const tripsData = await tripsResponse.json();
  console.log('Trips response:', JSON.stringify(tripsData, null, 2));

  process.exit(0);
}

testApi().catch(console.error);
