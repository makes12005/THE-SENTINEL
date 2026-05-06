const API_BASE = 'https://api-production-e13f.up.railway.app';

const OPERATOR = { phone: '+919876543001', password: 'Test@1234' };
const CONDUCTOR = { phone: '+919876543002', password: 'Test@1234' };
const DRIVER_PHONE = '+919876543003';
const ADMIN = { phone: '+919999999999', password: 'BusAlert@2024' };

function tokenOf(payload) {
  return payload?.data?.access_token || payload?.data?.accessToken || payload?.access_token || payload?.accessToken || null;
}

async function req(method, endpoint, { token, body, formData } = {}) {
  const headers = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

async function login(creds) {
  const result = await req('POST', '/api/auth/login', { body: creds });
  const token = tokenOf(result.data);
  if (!token) {
    throw new Error(`Login failed for ${creds.phone} status=${result.status}`);
  }
  return token;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const out = {
    startedAt: new Date().toISOString(),
    tripId: null,
    passengerPhone: null,
    pingStatus: null,
    alertLogEntry: null,
    test5Pass: false,
    offlineWaitSeconds: 190,
    resumePingStatus: null,
    conductorOnlineAudit: null,
    test8Pass: false,
  };

  const operatorToken = await login(OPERATOR);
  const conductorToken = await login(CONDUCTOR);
  const adminToken = await login(ADMIN);

  const members = await req('GET', '/api/agency/members', { token: operatorToken });
  const memberList = Array.isArray(members.data?.data) ? members.data.data : [];
  const conductor = memberList.find((m) => m.phone === CONDUCTOR.phone);
  const driver = memberList.find((m) => m.phone === DRIVER_PHONE);
  if (!conductor?.id || !driver?.id) {
    throw new Error('Missing conductor/driver in agency members');
  }

  const routeName = `Redeploy Verify Route ${Date.now()}`;
  const createRoute = await req('POST', '/api/routes', {
    token: operatorToken,
    body: { name: routeName, fromCity: 'Ahmedabad', toCity: 'Surat' },
  });
  const routeId = createRoute.data?.data?.id || createRoute.data?.id;
  if (!routeId) throw new Error(`Route creation failed status=${createRoute.status}`);

  const stops = [
    { name: 'Ahmedabad', sequenceNumber: 1, latitude: 23.0225, longitude: 72.5714, triggerRadiusKm: 10 },
    { name: 'Nadiad', sequenceNumber: 2, latitude: 22.6916, longitude: 72.8634, triggerRadiusKm: 10 },
    { name: 'Vadodara', sequenceNumber: 3, latitude: 22.3072, longitude: 73.1812, triggerRadiusKm: 10 },
  ];
  for (const stop of stops) {
    await req('POST', `/api/routes/${routeId}/stops`, { token: operatorToken, body: stop });
  }

  const busPlate = `GJ01RV${String(Date.now()).slice(-4)}`;
  const createBus = await req('POST', '/api/agency/buses', {
    token: operatorToken,
    body: { number_plate: busPlate, model: 'Redeploy Verify Bus', capacity: 40 },
  });
  const busId = createBus.data?.data?.id;
  if (!busId) throw new Error(`Bus creation failed status=${createBus.status}`);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const createTrip = await req('POST', '/api/trips', {
    token: operatorToken,
    body: {
      routeId,
      conductorId: conductor.id,
      driverId: driver.id,
      busId,
      scheduledDate: tomorrow.toISOString().slice(0, 10),
      assigned_operator_id: null,
    },
  });
  const tripId = createTrip.data?.data?.id || createTrip.data?.id;
  if (!tripId) throw new Error(`Trip creation failed status=${createTrip.status}`);
  out.tripId = tripId;

  const passengerPhone = `+91987655${String(Date.now()).slice(-4)}`;
  out.passengerPhone = passengerPhone;
  const csv = `name,phone,stop_name\nRedeploy Verify Passenger,${passengerPhone},Nadiad`;
  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'redeploy-verify-passengers.csv');
  const upload = await req('POST', `/api/trips/${tripId}/passengers/upload`, { token: operatorToken, formData: form });
  if (!(upload.status === 200 || upload.status === 201)) {
    throw new Error(`Passenger upload failed status=${upload.status}`);
  }

  const startTrip = await req('PUT', `/api/trips/${tripId}/start`, { token: conductorToken, body: {} });
  if (startTrip.status !== 200) {
    throw new Error(`Trip start failed status=${startTrip.status}`);
  }

  const ping = await req('POST', `/api/trips/${tripId}/location`, {
    token: conductorToken,
    body: { lat: 22.6950, lng: 72.8600, battery_level: 85, accuracy_meters: 10 },
  });
  out.pingStatus = ping.status;

  await sleep(20000);
  const alertLogs = await req('GET', '/api/logs/alert-logs?limit=200', { token: operatorToken });
  const rows = Array.isArray(alertLogs.data?.data) ? alertLogs.data.data : [];
  const matchingRow = rows.find((row) => String(row.passenger_phone || row.phone || '') === passengerPhone);
  out.alertLogEntry = matchingRow || null;
  out.test5Pass = !!matchingRow && matchingRow.channel === 'call' && ['success', 'failed'].includes(String(matchingRow.status || '').toLowerCase()) && !!matchingRow.attempted_at;

  await sleep(190000);
  const resumePing = await req('POST', `/api/trips/${tripId}/location`, {
    token: conductorToken,
    body: { lat: 22.6960, lng: 72.8610, battery_level: 82, accuracy_meters: 10 },
  });
  out.resumePingStatus = resumePing.status;

  await sleep(20000);
  const auditLogs = await req('GET', '/api/admin/audit-logs?action=CONDUCTOR_ONLINE', { token: adminToken });
  const auditRows = Array.isArray(auditLogs.data?.data) ? auditLogs.data.data : [];
  const onlineRow = auditRows.find((row) => row.entity_id === tripId || row.metadata?.trip_id === tripId);
  out.conductorOnlineAudit = onlineRow || null;
  out.test8Pass = out.resumePingStatus === 202 && !!onlineRow;
  out.finishedAt = new Date().toISOString();

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
