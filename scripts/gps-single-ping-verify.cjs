const API_BASE = 'https://api-production-e13f.up.railway.app';

const OPERATOR = { phone: '+919876543001', password: 'Test@1234' };
const CONDUCTOR = { phone: '+919876543002', password: 'Test@1234' };
const DRIVER_PHONE = '+919876543003';

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
  const response = await req('POST', '/api/auth/login', { body: creds });
  const token = tokenOf(response.data);
  if (!token) throw new Error(`Login failed for ${creds.phone}`);
  return token;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const out = {
    tripId: null,
    passengerPhone: null,
    pingStatus: null,
    alertLogFound: null,
  };

  const operatorToken = await login(OPERATOR);
  const conductorToken = await login(CONDUCTOR);

  const members = await req('GET', '/api/agency/members', { token: operatorToken });
  const memberList = Array.isArray(members.data?.data) ? members.data.data : [];
  const conductor = memberList.find((m) => m.phone === CONDUCTOR.phone);
  const driver = memberList.find((m) => m.phone === DRIVER_PHONE);
  if (!conductor?.id || !driver?.id) throw new Error('Conductor/driver not found');

  const route = await req('POST', '/api/routes', {
    token: operatorToken,
    body: { name: `GPS Verify ${Date.now()}`, fromCity: 'Ahmedabad', toCity: 'Surat' },
  });
  const routeId = route.data?.data?.id || route.data?.id;
  if (!routeId) throw new Error('Route creation failed');

  await req('POST', `/api/routes/${routeId}/stops`, {
    token: operatorToken,
    body: { name: 'Ahmedabad', sequenceNumber: 1, latitude: 23.0225, longitude: 72.5714, triggerRadiusKm: 10 },
  });
  await req('POST', `/api/routes/${routeId}/stops`, {
    token: operatorToken,
    body: { name: 'Nadiad', sequenceNumber: 2, latitude: 22.6916, longitude: 72.8634, triggerRadiusKm: 10 },
  });

  const bus = await req('POST', '/api/agency/buses', {
    token: operatorToken,
    body: { number_plate: `GJ01SP${String(Date.now()).slice(-4)}`, model: 'GPS Verify Bus', capacity: 40 },
  });
  const busId = bus.data?.data?.id;
  if (!busId) throw new Error('Bus creation failed');

  const day = new Date();
  day.setDate(day.getDate() + 1);
  const trip = await req('POST', '/api/trips', {
    token: operatorToken,
    body: {
      routeId,
      conductorId: conductor.id,
      driverId: driver.id,
      busId,
      scheduledDate: day.toISOString().slice(0, 10),
      assigned_operator_id: null,
    },
  });
  const tripId = trip.data?.data?.id || trip.data?.id;
  if (!tripId) throw new Error('Trip creation failed');
  out.tripId = tripId;

  const passengerPhone = `+91987766${String(Date.now()).slice(-4)}`;
  out.passengerPhone = passengerPhone;
  const csv = `name,phone,stop_name\nGPS Verify Passenger,${passengerPhone},Nadiad`;
  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'gps-verify.csv');
  const upload = await req('POST', `/api/trips/${tripId}/passengers/upload`, { token: operatorToken, formData: form });
  if (!(upload.status === 200 || upload.status === 201)) throw new Error('Passenger upload failed');

  const start = await req('PUT', `/api/trips/${tripId}/start`, { token: conductorToken, body: {} });
  if (start.status !== 200) throw new Error(`Trip start failed ${start.status}`);

  const ping = await req('POST', `/api/trips/${tripId}/location`, {
    token: conductorToken,
    body: { lat: 22.6950, lng: 72.8600, battery_level: 85, accuracy_meters: 10 },
  });
  out.pingStatus = ping.status;

  await sleep(15000);
  const logs = await req('GET', '/api/logs/alert-logs?limit=200', { token: operatorToken });
  const rows = Array.isArray(logs.data?.data) ? logs.data.data : [];
  out.alertLogFound = rows.find((row) => String(row.passenger_phone || row.phone || '') === passengerPhone) || null;

  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
