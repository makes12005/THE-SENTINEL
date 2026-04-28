"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
async function run() {
    const baseUrl = 'http://127.0.0.1:3005/api/auth';
    const email = `testuser_${Date.now()}@example.com`;
    const password = 'Password123!';
    console.log('--- Testing Auth Flow ---');
    // 1. Send OTP
    console.log(`\n[1] Requesting OTP for ${email}...`);
    const sendRes = await fetch(`${baseUrl}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email })
    });
    const sendData = await sendRes.json();
    if (!sendData.success) {
        console.error('Failed to send OTP:', sendData);
        process.exit(1);
    }
    const otp = sendData.data.otp;
    console.log(`✅ OTP Sent! OTP: ${otp}`);
    // 2. Verify OTP
    console.log(`\n[2] Verifying OTP...`);
    const verifyRes = await fetch(`${baseUrl}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, otp })
    });
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
        console.error('Failed to verify OTP:', verifyData);
        process.exit(1);
    }
    console.log('✅ OTP Verified!');
    let tempToken = '';
    if (verifyData.data.is_new_user) {
        tempToken = verifyData.data.temp_token;
        console.log(`User is new. Temp token received.`);
    }
    else {
        console.log(`User already exists. Logged in directly.`);
        process.exit(0);
    }
    // 3. Signup
    console.log(`\n[3] Proceeding to signup...`);
    const signupRes = await fetch(`${baseUrl}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Test Passenger',
            password: password,
            temp_token: tempToken
        })
    });
    const signupData = await signupRes.json();
    if (!signupData.success) {
        console.error('Failed to signup:', signupData);
        process.exit(1);
    }
    console.log('✅ Signup successful!');
    console.log(`Access Token: ${signupData.data.access_token.substring(0, 20)}...`);
    console.log('\n🎉 E2E Auth Flow Test Passed!');
}
run().catch(console.error);
