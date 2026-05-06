const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api-production-e13f.up.railway.app';
const OPERATOR_PHONE = '+919876543011';
const OPERATOR_PASSWORD = 'Test@1234';

const state = {
  operatorToken: null,
  routeId: null,
  busId: null,
  conductorId: null,
  driverId: null,
  tripId: null,
  cleanup: [],
};

const results = [];

function getToken(payload) {
  return payload?.data?.access_token || payload?.data?.accessToken || payload?.access_token || payload?.accessToken || null;
}

async function req(method, endpoint, { token, body, formData } = {}) {
  const headers = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = { raw: '<non-json-response>' };
  }
  return { status: response.status, data };
}

function pushResult(no, test, passed, notes, extra = {}) {
  results.push({
    no,
    test,
    status: passed ? 'PASS' : 'FAIL',
    notes,
    ...extra,
  });
}

function extractId(res) {
  return res?.data?.data?.id || res?.data?.id || null;
}

async function main() {
  const runTag = Date.now().toString().slice(-6);
  const plate = `GJ01AB${runTag.slice(-4)}`;
  const conductorPhone = `+91987654${runTag.slice(-4)}`;
  const driverPhone = `+91987655${runTag.slice(-4)}`;
  const routeName = `Ahmedabad to Surat ${runTag}`;
  const routeNameTwo = `Surat to Mumbai ${runTag}`;

  const operatorLogin = await req('POST', '/api/auth/login', {
    body: { phone: OPERATOR_PHONE, password: OPERATOR_PASSWORD },
  });
  state.operatorToken = getToken(operatorLogin.data);
  pushResult('S1', 'Operator login (setup)', operatorLogin.status === 200 && !!state.operatorToken, `status=${operatorLogin.status}`);
  if (!state.operatorToken) {
    throw new Error('Operator token not received. Cannot continue tests.');
  }

  // 1
  const route = await req('POST', '/api/routes', {
    token: state.operatorToken,
    body: { name: routeName, fromCity: 'Ahmedabad', toCity: 'Surat' },
  });
  state.routeId = extractId(route);
  pushResult(1, 'Create Route', route.status === 201 && !!state.routeId, `status=${route.status}; routeId=${state.routeId || 'n/a'}`);

  // 1b snake_case compatibility check
  const routeTwo = await req('POST', '/api/routes', {
    token: state.operatorToken,
    body: { name: routeNameTwo, from_city: 'Surat', to_city: 'Mumbai' },
  });
  pushResult('1b', 'Create Route snake_case', routeTwo.status === 201, `status=${routeTwo.status}`);

  // 2
  const stops = [
    ['Ahmedabad', 1, 23.0225, 72.5714],
    ['Nadiad', 2, 22.6916, 72.8634],
    ['Vadodara', 3, 22.3072, 73.1812],
    ['Bharuch', 4, 21.7051, 72.9959],
    ['Surat', 5, 21.1702, 72.8311],
  ];
  let createdStops = 0;
  if (state.routeId) {
    for (const [name, sequenceNumber, latitude, longitude] of stops) {
      const stopRes = await req('POST', `/api/routes/${state.routeId}/stops`, {
        token: state.operatorToken,
        body: { name, sequenceNumber, latitude, longitude, triggerRadiusKm: 10 },
      });
      if (stopRes.status === 201) createdStops += 1;
    }
  }
  pushResult(2, 'Add Stops to Route', createdStops === 5, `created=${createdStops}/5`);

  // 3
  const bus = await req('POST', '/api/agency/buses', {
    token: state.operatorToken,
    body: { number_plate: plate, model: 'Volvo B9R', capacity: 40 },
  });
  state.busId = extractId(bus);
  pushResult(3, 'Add Bus', bus.status === 201 && !!state.busId, `status=${bus.status}; busId=${state.busId || 'n/a'}`);

  // 4
  const dupBus = await req('POST', '/api/agency/buses', {
    token: state.operatorToken,
    body: { number_plate: plate, model: 'Volvo B9R', capacity: 40 },
  });
  const dupBusMsg = JSON.stringify(dupBus.data).toLowerCase();
  pushResult(
    4,
    'Duplicate Bus Check',
    (dupBus.status === 409 || dupBus.status === 400) && dupBusMsg.includes('exist'),
    `status=${dupBus.status}`
  );

  // 5
  const conductor = await req('POST', '/api/agency/members', {
    token: state.operatorToken,
    body: {
      name: 'Test Conductor',
      phone: conductorPhone,
      role: 'conductor',
      password: 'Test@1234',
    },
  });
  state.conductorId = extractId(conductor);
  pushResult(5, 'Add Conductor', conductor.status === 201 && !!state.conductorId, `status=${conductor.status}; conductorId=${state.conductorId || 'n/a'}`);

  // 6
  const driver = await req('POST', '/api/agency/members', {
    token: state.operatorToken,
    body: {
      name: 'Test Driver',
      phone: driverPhone,
      role: 'driver',
      password: 'Test@1234',
    },
  });
  state.driverId = extractId(driver);
  pushResult(6, 'Add Driver', driver.status === 201 && !!state.driverId, `status=${driver.status}; driverId=${state.driverId || 'n/a'}`);

  // 7
  const dupStaff = await req('POST', '/api/agency/members', {
    token: state.operatorToken,
    body: {
      name: 'Test Conductor',
      phone: conductorPhone,
      role: 'conductor',
      password: 'Test@1234',
    },
  });
  const dupStaffMsg = JSON.stringify(dupStaff.data).toLowerCase();
  pushResult(
    7,
    'Duplicate Staff Check',
    (dupStaff.status === 409 || dupStaff.status === 400) && dupStaffMsg.includes('exist'),
    `status=${dupStaff.status}`
  );

  // 8
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = tomorrow.toISOString().slice(0, 10);
  const trip = await req('POST', '/api/trips', {
    token: state.operatorToken,
    body: {
      routeId: state.routeId,
      conductorId: state.conductorId,
      driverId: state.driverId,
      busId: state.busId,
      scheduledDate: dateString,
      assigned_operator_id: null,
    },
  });
  state.tripId = extractId(trip);
  pushResult(8, 'Create Trip', trip.status === 201 && !!state.tripId, `status=${trip.status}; tripId=${state.tripId || 'n/a'}`);

  // 9
  const goodCsv = `name,phone,stop_name
Rahul Shah,+919876540001,Nadiad
Priya Patel,+919876540002,Vadodara
Amit Modi,+919876540003,Bharuch
Neha Desai,+919876540004,Surat`;
  let uploadGood;
  if (state.tripId) {
    const form = new FormData();
    form.append('file', new Blob([goodCsv], { type: 'text/csv' }), 'passengers.csv');
    uploadGood = await req('POST', `/api/trips/${state.tripId}/passengers/upload`, {
      token: state.operatorToken,
      formData: form,
    });
  } else {
    uploadGood = { status: 0, data: { error: 'trip missing' } };
  }
  const uploadedCount = uploadGood?.data?.data?.added_count || uploadGood?.data?.data?.added || 0;
  pushResult(9, 'Upload Passenger CSV', uploadGood.status === 201 && Number(uploadedCount) === 4, `status=${uploadGood.status}; added=${uploadedCount}`);

  // 10
  const badCsv = `name,phone,stop_name
Valid User,+919876540005,Vadodara
Bad User,123,InvalidStop`;
  let uploadBad;
  if (state.tripId) {
    const badForm = new FormData();
    badForm.append('file', new Blob([badCsv], { type: 'text/csv' }), 'bad.csv');
    uploadBad = await req('POST', `/api/trips/${state.tripId}/passengers/upload`, {
      token: state.operatorToken,
      formData: badForm,
    });
  } else {
    uploadBad = { status: 0, data: { error: 'trip missing' } };
  }
  pushResult(10, 'Invalid CSV Row', uploadBad.status === 400 && !!uploadBad.data?.row_errors, `status=${uploadBad.status}`);

  // 11
  const tripStatus = state.tripId
    ? await req('GET', `/api/trips/${state.tripId}/status`, { token: state.operatorToken })
    : { status: 0, data: {} };
  const tripData = tripStatus?.data?.data || {};
  pushResult(
    11,
    'Get Trip Status',
    tripStatus.status === 200 &&
      tripData.status === 'scheduled' &&
      Number(tripData.passenger_summary?.total || 0) === 4,
    `status=${tripStatus.status}`
  );

  // 12
  const summary = await req('GET', '/api/operator/summary', { token: state.operatorToken });
  pushResult(12, 'Operator Summary', summary.status === 200, `status=${summary.status}`);

  // 13
  const buses = await req('GET', '/api/agency/buses', { token: state.operatorToken });
  const busExists = Array.isArray(buses?.data?.data)
    ? buses.data.data.some((b) => b.number_plate === plate)
    : false;
  pushResult(13, 'List Buses', buses.status === 200 && busExists, `status=${buses.status}`);

  // 14
  const staff = await req('GET', '/api/agency/members', { token: state.operatorToken });
  const members = Array.isArray(staff?.data?.data) ? staff.data.data : [];
  const hasConductor = members.some((m) => m.phone === conductorPhone);
  const hasDriver = members.some((m) => m.phone === driverPhone);
  pushResult(14, 'List Staff', staff.status === 200 && hasConductor && hasDriver, `status=${staff.status}`);

  // 15
  const logs = await req('GET', '/api/logs/alert-logs', { token: state.operatorToken });
  pushResult(15, 'Alert Logs', logs.status === 200, `status=${logs.status}`);

  // Cleanup (best-effort): delete bus only (trip/route delete endpoints are not available)
  if (state.busId) {
    const delBus = await req('DELETE', `/api/agency/buses/${state.busId}`, { token: state.operatorToken });
    state.cleanup.push({ entity: 'bus', id: state.busId, status: delBus.status });
  }

  const outputPath = path.join(process.cwd(), 'docs', 'test-reports', 'operator-backend-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), state, results }, null, 2));
  console.log(`Saved backend results: ${outputPath}`);
}

main().catch((err) => {
  const outputPath = path.join(process.cwd(), 'docs', 'test-reports', 'operator-backend-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ generatedAt: new Date().toISOString(), state, results, fatal: err.message }, null, 2));
  console.error(err.message);
  process.exitCode = 1;
});
