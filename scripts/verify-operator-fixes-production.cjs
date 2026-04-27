const API_BASE = 'https://api-production-e13f.up.railway.app';
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

function tokenOf(payload) {
  return payload?.data?.access_token || payload?.data?.accessToken || null;
}

async function run() {
  const results = [];
  let routeCamel;
  let routeSnake;
  let busId;
  let conductorId;
  let driverId;
  let tripId;

  const login = await req('POST', '/api/auth/login', { body: OPERATOR });
  const token = tokenOf(login.data);
  if (!token) throw new Error(`operator login failed: ${login.status}`);

  const routeName1 = `Ahmedabad to Surat ${Date.now()}`;
  const t1 = await req('POST', '/api/routes', {
    token,
    body: { name: routeName1, fromCity: 'Ahmedabad', toCity: 'Surat' },
  });
  routeCamel = t1.data?.data?.id || null;
  results.push({ no: 1, test: 'Route with camelCase', status: t1.status === 201 ? 'PASS' : 'FAIL', notes: `status=${t1.status}` });

  const routeName2 = `Surat to Mumbai ${Date.now()}`;
  const t2 = await req('POST', '/api/routes', {
    token,
    body: { name: routeName2, from_city: 'Surat', to_city: 'Mumbai' },
  });
  routeSnake = t2.data?.data?.id || null;
  results.push({ no: 2, test: 'Route with snake_case', status: t2.status === 201 ? 'PASS' : 'FAIL', notes: `status=${t2.status}` });

  const plate = `GJ01AB${String(Date.now()).slice(-4)}`;
  const t3 = await req('POST', '/api/agency/buses', {
    token,
    body: { number_plate: plate, model: 'Volvo', capacity: 40 },
  });
  busId = t3.data?.data?.id || null;
  results.push({ no: 3, test: 'Add Bus with operator token', status: t3.status === 201 ? 'PASS' : 'FAIL', notes: `status=${t3.status}` });

  const t4 = await req('POST', '/api/agency/buses', {
    token,
    body: { number_plate: plate, model: 'Volvo', capacity: 40 },
  });
  results.push({ no: 4, test: 'Duplicate Bus', status: t4.status === 409 ? 'PASS' : 'FAIL', notes: `status=${t4.status}` });

  const cPhone = `+91987654${String(Date.now()).slice(-4)}`;
  const t5 = await req('POST', '/api/agency/members', {
    token,
    body: { name: 'Fix Test Conductor', phone: cPhone, role: 'conductor', password: 'Test@1234' },
  });
  conductorId = t5.data?.data?.id || null;
  results.push({ no: 5, test: 'Add Staff', status: t5.status === 201 ? 'PASS' : 'FAIL', notes: `status=${t5.status}` });

  const t6 = await req('POST', '/api/agency/members', {
    token,
    body: { name: 'Fix Test Conductor', phone: cPhone, role: 'conductor', password: 'Test@1234' },
  });
  results.push({ no: 6, test: 'Duplicate Staff', status: t6.status === 409 ? 'PASS' : 'FAIL', notes: `status=${t6.status}` });

  const dPhone = `+91987655${String(Date.now()).slice(-4)}`;
  const driver = await req('POST', '/api/agency/members', {
    token,
    body: { name: 'Fix Test Driver', phone: dPhone, role: 'driver', password: 'Test@1234' },
  });
  driverId = driver.data?.data?.id || null;

  let flowPass = false;
  if (routeCamel && conductorId && driverId && busId) {
    const stops = [
      ['Ahmedabad', 1, 23.0225, 72.5714],
      ['Nadiad', 2, 22.6916, 72.8634],
      ['Vadodara', 3, 22.3072, 73.1812],
      ['Bharuch', 4, 21.7051, 72.9959],
      ['Surat', 5, 21.1702, 72.8311],
    ];
    let created = 0;
    for (const [name, sequenceNumber, latitude, longitude] of stops) {
      const s = await req('POST', `/api/routes/${routeCamel}/stops`, {
        token,
        body: { name, sequenceNumber, latitude, longitude, triggerRadiusKm: 10 },
      });
      if (s.status === 201) created += 1;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const trip = await req('POST', '/api/trips', {
      token,
      body: {
        routeId: routeCamel,
        conductorId,
        driverId,
        busId,
        scheduledDate: tomorrow.toISOString().slice(0, 10),
        assigned_operator_id: null,
      },
    });
    tripId = trip.data?.data?.id || null;
    let uploadOk = false;
    if (tripId) {
      const csv = `name,phone,stop_name
Rahul Shah,+919876540001,Nadiad
Priya Patel,+919876540002,Vadodara`;
      const form = new FormData();
      form.append('file', new Blob([csv], { type: 'text/csv' }), 'passengers.csv');
      const upload = await req('POST', `/api/trips/${tripId}/passengers/upload`, { token, formData: form });
      uploadOk = upload.status === 201;
    }
    flowPass = created === 5 && !!tripId && uploadOk;
  }
  results.push({ no: 7, test: 'Full trip flow', status: flowPass ? 'PASS' : 'FAIL', notes: `tripId=${tripId || 'n/a'}` });

  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
}

run().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
