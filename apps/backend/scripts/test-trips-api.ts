import axios from 'axios';

async function main() {
  const baseURL = 'http://localhost:3005';
  const phone = '+919999999999'; // Test Driver Phone
  const otp = '123456';

  try {
    console.log('Logging in...');
    const loginResp = await axios.post(`${baseURL}/api/auth/verify-otp`, {
      phone,
      otp,
    });

    const token = loginResp.data.data.token;
    console.log('Login successful. Token:', token.substring(0, 10) + '...');

    console.log('Fetching trips...');
    const tripsResp = await axios.get(`${baseURL}/api/trips?status=scheduled`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('Response:', JSON.stringify(tripsResp.data, null, 2));
  } catch (error: any) {
    if (error.response) {
      console.error('Error Status:', error.response.status);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

main();
