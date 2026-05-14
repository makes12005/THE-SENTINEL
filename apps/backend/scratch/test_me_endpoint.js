const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const API_URL = 'https://api-production-e13f.up.railway.app';
const PHONE = '+919876543210'; // Correct driver phone
const PASSWORD = 'password123';

async function testAuth() {
  try {
    console.log('--- Step 1: Login ---');
    const loginResp = await axios.post(`${API_URL}/api/auth/login`, {
      identifier: PHONE,
      password: PASSWORD
    });

    const { accessToken, refreshToken, user } = loginResp.data.data;
    console.log('Login successful');
    console.log('User ID:', user.id);
    console.log('Access Token (first 10 chars):', accessToken.substring(0, 10));

    console.log('\n--- Step 2: Fetch Profile (/me) ---');
    try {
      const meResp = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('Profile fetch successful:', meResp.data.data);
    } catch (err) {
      console.error('Profile fetch failed:', err.response?.status, err.response?.data);
    }

    console.log('\n--- Step 3: Refresh Token ---');
    try {
      const refreshResp = await axios.post(`${API_URL}/api/auth/refresh`, {
        refreshToken: refreshToken
      });
      console.log('Refresh successful');
      const newAccessToken = refreshResp.data.data.accessToken;

      console.log('\n--- Step 4: Fetch Profile again with new token ---');
      const meResp2 = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${newAccessToken}` }
      });
      console.log('Profile fetch successful with refreshed token:', meResp2.data.data);
    } catch (err) {
      console.error('Refresh or second profile fetch failed:', err.response?.status, err.response?.data);
    }

  } catch (err) {
    console.error('Login failed:', err.response?.status, err.response?.data);
  }
}

testAuth();
