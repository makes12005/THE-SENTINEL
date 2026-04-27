const API_BASE = process.env.API_BASE || 'https://api-production-e13f.up.railway.app';
const OPERATOR = { phone: '+919876543011', password: 'Test@1234' };

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
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

function accessToken(payload) {
  return payload?.data?.access_token || payload?.data?.accessToken || null;
}

async function setupTrip(token) {
  const tag = Date.now().toString().slice(-6);
  const route = await req('POST', '/api/routes', {
    token,
    body: { name: `Contract Route ${tag}`, fromCity: 'Ahmedabad', toCity: 'Surat' },
  });
  const routeId = route.data?.data?.id;
  if (!routeId) throw new Error(`route create failed: ${route.status}`);

  const stops = [
    ['Ahmedabad', 1, 23.0225, 72.5714],
    ['Nadiad', 2, 22.6916, 72.8634],
    ['Vadodara', 3, 22.3072, 73.1812],
    ['Bharuch', 4, 21.7051, 72.9959],
    ['Surat', 5, 21.1702, 72.8311],
  ];
  for (const [name, sequenceNumber, latitude, longitude] of stops) {
    await req('POST', `/api/routes/${routeId}/stops`, {
      token,
      body: { name, sequenceNumber, latitude, longitude, triggerRadiusKm: 10 },
    });
  }

  const plate = `GJ01CT${tag.slice(-4)}`;
  const bus = await req('POST', '/api/agency/buses', { token, body: { number_plate: plate, model: 'Volvo', capacity: 40 } });
  const busId = bus.data?.data?.id;
  if (!busId) throw new Error(`bus create failed: ${bus.status}`);

  const cPhone = `+91987656${tag.slice(-4)}`;
  const dPhone = `+91987657${tag.slice(-4)}`;
  const conductor = await req('POST', '/api/agency/members', {
    token,
    body: { name: `Contract Conductor ${tag}`, phone: cPhone, role: 'conductor', password: 'Test@1234' },
  });
  const driver = await req('POST', '/api/agency/members', {
    token,
    body: { name: `Contract Driver ${tag}`, phone: dPhone, role: 'driver', password: 'Test@1234' },
  });
  const conductorId = conductor.data?.data?.id;
  const driverId = driver.data?.data?.id;
  if (!conductorId || !driverId) throw new Error('staff create failed');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const trip = await req('POST', '/api/trips', {
    token,
    body: {
      routeId,
      conductorId,
      driverId,
      busId,
      scheduledDate: tomorrow.toISOString().slice(0, 10),
      assigned_operator_id: null,
    },
  });
  const tripId = trip.data?.data?.id;
  if (!tripId) throw new Error(`trip create failed: ${trip.status}`);
  return { tripId };
}

async function main() {
  const login = await req('POST', '/api/auth/login', { body: OPERATOR });
  const token = accessToken(login.data);
  if (!token) throw new Error('operator login failed');

  const { tripId } = await setupTrip(token);

  const results = [];

  const goodCsv = `name,phone,stop_name
Rahul Shah,+919876540001,Nadiad
Priya Patel,+919876540002,Vadodara
Amit Modi,+919876540003,Bharuch
Neha Desai,+919876540004,Surat`;
  const goodForm = new FormData();
  goodForm.append('file', new Blob([goodCsv], { type: 'text/csv' }), 'good.csv');
  const t9 = await req('POST', `/api/trips/${tripId}/passengers/upload`, { token, formData: goodForm });
  const addedCount = t9.data?.data?.added_count ?? t9.data?.data?.added ?? t9.data?.data?.uploaded ?? 0;
  results.push({
    no: 9,
    status: t9.status === 201 && Number(addedCount) === 4 ? 'PASS' : 'FAIL',
    notes: `status=${t9.status}; added_count=${addedCount}`,
  });

  const badCsv = `name,phone,stop_name
Valid User,+919876540005,Vadodara
Bad User,123,InvalidStop`;
  const badForm = new FormData();
  badForm.append('file', new Blob([badCsv], { type: 'text/csv' }), 'bad.csv');
  const t10 = await req('POST', `/api/trips/${tripId}/passengers/upload`, { token, formData: badForm });
  const hasRowErrors = Array.isArray(t10.data?.row_errors) && t10.data.row_errors.length > 0;
  results.push({
    no: 10,
    status: t10.status === 400 && hasRowErrors ? 'PASS' : 'FAIL',
    notes: `status=${t10.status}; row_errors=${hasRowErrors}`,
  });

  const t11 = await req('GET', `/api/trips/${tripId}/status`, { token });
  const summary = t11.data?.data?.passenger_summary;
  const summaryOk =
    summary &&
    Number(summary.total) === 4 &&
    Number(summary.pending) === 4 &&
    Number(summary.sent) === 0 &&
    Number(summary.failed) === 0;
  results.push({
    no: 11,
    status: t11.status === 200 && summaryOk ? 'PASS' : 'FAIL',
    notes: `status=${t11.status}`,
  });

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), tripId, results }, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
