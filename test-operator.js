const API_BASE = 'https://api-production-e13f.up.railway.app';

async function testAPI() {
  let adminToken = null;
  let operatorToken = null;
  let routeId = null;
  let busId = null;
  let conductorId = null;
  let driverId = null;
  let tripId = null;
  const results = [];

  const post = async (endpoint, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    return { status: res.status, data: await res.json() };
  };

  const get = async (endpoint, token = null) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, { headers });
    return { status: res.status, data: await res.json() };
  };

  const put = async (endpoint, body, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
    return { status: res.status, data: await res.json() };
  };

  const addResult = (num, test, status, notes) => results.push({ num, test, status, notes });

  try {
    // Login as admin
    console.log('TEST 0 — Admin Login');
    const loginRes = await post('/api/auth/login', { phone: '+919999999999', password: 'BusAlert@2024' });
    console.log('Status:', loginRes.status);
    console.log('Full response:', JSON.stringify(loginRes.data));
    adminToken = loginRes.data.data?.accessToken || loginRes.data.data?.access_token;
    if (adminToken) {
      addResult(0, 'Admin Login', 'PASS', 'Token received');
    } else {
      addResult(0, 'Admin Login', 'FAIL', loginRes.data.error?.message || 'No token');
      return results;
    }

    // Create operator via owner endpoint
    console.log('\n--- CREATE OPERATOR ---');
    const opRes = await post('/api/owner/operators', {
      name: 'Test Operator',
      phone: '+919876543001',
      password: 'Test@1234'
    }, adminToken);
    console.log('Create Operator:', opRes.status, JSON.stringify(opRes.data));
    if (opRes.status === 200 || opRes.status === 201 || opRes.status === 409) {
      addResult(1, 'Create Operator', 'PASS', 'Created or already exists');
    } else {
      addResult(1, 'Create Operator', 'FAIL', opRes.data.error?.message || 'Failed');
    }

    // Login as operator
    console.log('\n--- LOGIN AS OPERATOR ---');
    const opLoginRes = await post('/api/auth/login', { phone: '+919876543001', password: 'Test@1234' });
    console.log('Operator Login:', opLoginRes.status, JSON.stringify(opLoginRes.data).substring(0, 200));
    if (opLoginRes.data.access_token) {
      operatorToken = opLoginRes.data.access_token;
      addResult(-1, 'Operator Login', 'PASS', 'Token received');
    } else if (opLoginRes.data.accessToken) {
      operatorToken = opLoginRes.data.accessToken;
      addResult(-1, 'Operator Login', 'PASS', 'Token received');
    } else {
      addResult(-1, 'Operator Login', 'FAIL', opLoginRes.data.error?.message || 'Failed');
    }

    if (!operatorToken) {
      console.log('STOPPED: Cannot login as operator');
      return results;
    }

    // TEST 1: Create Route
    console.log('\n--- TEST 1: CREATE ROUTE ---');
    const routeRes = await post('/api/routes', {
      name: 'Ahmedabad to Surat',
      fromCity: 'Ahmedabad',
      toCity: 'Surat'
    }, operatorToken);
    console.log('Create Route:', routeRes.status, JSON.stringify(routeRes.data));
    if (routeRes.data.id || routeRes.data.data?.id) {
      routeId = routeRes.data.id || routeRes.data.data.id;
      addResult(1, 'Create Route', 'PASS', `Route ID: ${routeId}`);
    } else {
      addResult(1, 'Create Route', 'FAIL', routeRes.data.error?.message || 'No ID returned');
    }

    // TEST 2: Add Stops
    const stops = [
      { name: 'Ahmedabad', seq: 1, lat: 23.0225, lng: 72.5714, radius: 10 },
      { name: 'Nadiad', seq: 2, lat: 22.6916, lng: 72.8634, radius: 10 },
      { name: 'Vadodara', seq: 3, lat: 22.3072, lng: 73.1812, radius: 10 },
      { name: 'Bharuch', seq: 4, lat: 21.7051, lng: 72.9959, radius: 10 },
      { name: 'Surat', seq: 5, lat: 21.1702, lng: 72.8311, radius: 10 }
    ];
    console.log('\n--- TEST 2: ADD STOPS ---');
    let stopsCreated = 0;
    for (const stop of stops) {
      const stopRes = await post(`/api/routes/${routeId}/stops`, {
        name: stop.name,
        sequenceNumber: stop.seq,
        latitude: stop.lat,
        longitude: stop.lng,
        triggerRadiusKm: stop.radius
      }, operatorToken);
      console.log(`Stop ${stop.name}:`, stopRes.status);
      if (stopRes.status === 200 || stopRes.status === 201) stopsCreated++;
    }
    addResult(2, 'Add Stops to Route', stopsCreated === 5 ? 'PASS' : 'PARTIAL', `5 stops: ${stopsCreated}/5 created`);

    // TEST 3: Add Bus
    console.log('\n--- TEST 3: ADD BUS ---');
    const busRes = await post('/api/agency/buses', {
      number_plate: 'GJ01AB1234',
      model: 'Volvo B9R',
      capacity: 40
    }, operatorToken);
    console.log('Add Bus:', busRes.status, JSON.stringify(busRes.data));
    if (busRes.data.id || busRes.data.data?.id) {
      busId = busRes.data.id || busRes.data.data.id;
      addResult(3, 'Add Bus', 'PASS', `Bus ID: ${busId}`);
    } else {
      addResult(3, 'Add Bus', 'FAIL', busRes.data.error?.message || 'Failed');
    }

    // TEST 4: Duplicate Bus Check
    console.log('\n--- TEST 4: DUPLICATE BUS CHECK ---');
    const dupBusRes = await post('/api/agency/buses', {
      number_plate: 'GJ01AB1234',
      model: 'Volvo B9R',
      capacity: 40
    }, operatorToken);
    console.log('Duplicate Bus:', dupBusRes.status, JSON.stringify(dupBusRes.data));
    addResult(4, 'Duplicate Bus Check', dupBusRes.status === 400 || dupBusRes.status === 409 || dupBusRes.data.error ? 'PASS' : 'FAIL', `Status: ${dupBusRes.status}`);

    // TEST 5: Add Conductor
    console.log('\n--- TEST 5: ADD CONDUCTOR ---');
    const condRes = await post('/api/agency/members', {
      name: 'Test Conductor',
      phone: '+919876543002',
      role: 'conductor',
      password: 'Test@1234'
    }, operatorToken);
    console.log('Add Conductor:', condRes.status, JSON.stringify(condRes.data).substring(0, 200));
    if (condRes.data.id || condRes.data.data?.id) {
      conductorId = condRes.data.id || condRes.data.data.id;
      addResult(5, 'Add Conductor', 'PASS', `Conductor ID: ${conductorId}`);
    } else {
      addResult(5, 'Add Conductor', 'FAIL', condRes.data.error?.message || 'Failed');
    }

    // TEST 6: Add Driver
    console.log('\n--- TEST 6: ADD DRIVER ---');
    const drvRes = await post('/api/agency/members', {
      name: 'Test Driver',
      phone: '+919876543003',
      role: 'driver',
      password: 'Test@1234'
    }, operatorToken);
    console.log('Add Driver:', drvRes.status, JSON.stringify(drvRes.data).substring(0, 200));
    if (drvRes.data.id || drvRes.data.data?.id) {
      driverId = drvRes.data.id || drvRes.data.data.id;
      addResult(6, 'Add Driver', 'PASS', `Driver ID: ${driverId}`);
    } else {
      addResult(6, 'Add Driver', 'FAIL', drvRes.data.error?.message || 'Failed');
    }

    // TEST 7: Duplicate Staff Check
    console.log('\n--- TEST 7: DUPLICATE STAFF CHECK ---');
    const dupStaffRes = await post('/api/agency/members', {
      name: 'Test Conductor',
      phone: '+919876543002',
      role: 'conductor',
      password: 'Test@1234'
    }, operatorToken);
    console.log('Duplicate Staff:', dupStaffRes.status, JSON.stringify(dupStaffRes.data));
    addResult(7, 'Duplicate Staff Check', dupStaffRes.status === 400 || dupStaffRes.status === 409 || dupStaffRes.data.error ? 'PASS' : 'FAIL', `Status: ${dupStaffRes.status}`);

    // TEST 8: Create Trip
    console.log('\n--- TEST 8: CREATE TRIP ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const tripRes = await post('/api/trips', {
      routeId: routeId,
      conductorId: conductorId,
      driverId: driverId,
      busId: busId,
      scheduledDate: dateStr,
      assigned_operator_id: null
    }, operatorToken);
    console.log('Create Trip:', tripRes.status, JSON.stringify(tripRes.data).substring(0, 300));
    if (tripRes.data.id || tripRes.data.data?.id) {
      tripId = tripRes.data.id || tripRes.data.data.id;
      addResult(8, 'Create Trip', 'PASS', `Trip ID: ${tripId}`);
    } else {
      addResult(8, 'Create Trip', 'FAIL', tripRes.data.error?.message || 'Failed');
    }

    // TEST 9: Upload Passenger CSV
    console.log('\n--- TEST 9: UPLOAD PASSENGER CSV ---');
    const csvContent = `name,phone,stop_name
Rahul Shah,+919876540001,Nadiad
Priya Patel,+919876540002,Vadodara
Amit Modi,+919876540003,Bharuch
Neha Desai,+919876540004,Surat`;
    
    const formData = new FormData();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    formData.append('file', blob, 'passengers.csv');
    
    const uploadRes = await fetch(`${API_BASE}/api/trips/${tripId}/passengers/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${operatorToken}` },
      body: formData
    });
    const uploadData = await uploadRes.json();
    console.log('Upload CSV:', uploadRes.status, JSON.stringify(uploadData));
    addResult(9, 'Upload Passenger CSV', uploadRes.status === 200 || uploadRes.status === 201 ? 'PASS' : 'FAIL', `Status: ${uploadRes.status}`);

    // TEST 10: Invalid CSV Row
    console.log('\n--- TEST 10: INVALID CSV ROW ---');
    const badCsv = `name,phone,stop_name
Valid User,+919876540005,Vadodara
Bad User,123,InvalidStop`;
    const badFormData = new FormData();
    const badBlob = new Blob([badCsv], { type: 'text/csv' });
    badFormData.append('file', badBlob, 'bad.csv');
    
    const badUploadRes = await fetch(`${API_BASE}/api/trips/${tripId}/passengers/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${operatorToken}` },
      body: badFormData
    });
    const badUploadData = await badUploadRes.json();
    console.log('Invalid CSV:', badUploadRes.status, JSON.stringify(badUploadData));
    addResult(10, 'Invalid CSV Row', badUploadRes.status === 400 || badUploadData.error ? 'PASS' : 'FAIL', `Status: ${badUploadRes.status}`);

    // TEST 11: Get Trip Status
    console.log('\n--- TEST 11: GET TRIP STATUS ---');
    const statusRes = await get(`/api/trips/${tripId}/status`, operatorToken);
    console.log('Trip Status:', statusRes.status, JSON.stringify(statusRes.data));
    addResult(11, 'Get Trip Status', statusRes.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(statusRes.data).substring(0, 100));

    // TEST 12: Operator Summary
    console.log('\n--- TEST 12: OPERATOR SUMMARY ---');
    const summaryRes = await get('/api/operator/summary', operatorToken);
    console.log('Summary:', summaryRes.status, JSON.stringify(summaryRes.data));
    addResult(12, 'Operator Summary', summaryRes.status === 200 ? 'PASS' : 'FAIL', JSON.stringify(summaryRes.data).substring(0, 100));

    // TEST 13: List Buses
    console.log('\n--- TEST 13: LIST BUSES ---');
    const busesRes = await get('/api/agency/buses', operatorToken);
    console.log('List Buses:', busesRes.status, JSON.stringify(busesRes.data).substring(0, 200));
    addResult(13, 'List Buses', busesRes.status === 200 && busesRes.data.data ? 'PASS' : 'FAIL', `Found ${busesRes.data.data?.length || 0} buses`);

    // TEST 14: List Staff
    console.log('\n--- TEST 14: LIST STAFF ---');
    const staffRes = await get('/api/agency/members', operatorToken);
    console.log('List Staff:', staffRes.status, JSON.stringify(staffRes.data).substring(0, 200));
    addResult(14, 'List Staff', staffRes.status === 200 ? 'PASS' : 'FAIL', `Status: ${staffRes.status}`);

    // TEST 15: Alert Logs
    console.log('\n--- TEST 15: ALERT LOGS ---');
    const logsRes = await get('/api/logs/alert-logs', operatorToken);
    console.log('Alert Logs:', logsRes.status, JSON.stringify(logsRes.data).substring(0, 200));
    addResult(15, 'Alert Logs', logsRes.status === 200 ? 'PASS' : 'FAIL', `Status: ${logsRes.status}`);

    console.log('\n=== RESULTS ===');
    for (const r of results) {
      console.log(`${r.num}: ${r.test} — ${r.status} (${r.notes})`);
    }
    
    return results;
  } catch (e) {
    console.error('Error:', e.message);
    return results;
  }
}

testAPI().then(results => {
  console.log('\n=== FINAL RESULTS ===');
  console.log(JSON.stringify(results, null, 2));
});