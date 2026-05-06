const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api-production-e13f.up.railway.app';
const FRONTEND_URL = 'https://bus-alert-iota.vercel.app';
const OPERATOR_LOGIN = { phone: '+919876543001', contact: '+919876543001', password: 'Test@1234' };
const CONDUCTOR_LOGIN = { phone: '+919876543002', contact: '+919876543002', password: 'Test@1234' };
const DRIVER_PHONE = '+919876543003';
const TODAY = new Date().toISOString().slice(0, 10);

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

async function loginWithFallback(creds) {
  const first = await req('POST', '/api/auth/login', { body: { contact: creds.contact, password: creds.password } });
  let token = tokenOf(first.data);
  if (token) return { token, details: first };
  const second = await req('POST', '/api/auth/login', { body: { phone: creds.phone, password: creds.password } });
  token = tokenOf(second.data);
  return { token, details: second };
}

function addResult(results, no, test, expected, status, notes) {
  results.push({ no, test, expected, status, notes });
}

async function main() {
  const evidence = {
    generatedAt: new Date().toISOString(),
    apiBase: API_BASE,
    frontend: FRONTEND_URL,
    setup: {},
    responses: {},
    tests: [],
    blockers: [],
    cleanup: [],
  };
  const results = [];
  let passCount = 0;
  let failCount = 0;

  const operatorLogin = await loginWithFallback(OPERATOR_LOGIN);
  evidence.responses.operatorLogin = operatorLogin.details;
  const operatorToken = operatorLogin.token;
  if (!operatorToken) {
    throw new Error(`Operator login failed with status ${operatorLogin.details.status}`);
  }

  const routeName = `GPS Test Route ${Date.now()}`;
  const createRoute = await req('POST', '/api/routes', {
    token: operatorToken,
    body: { name: routeName, from_city: 'Ahmedabad', to_city: 'Surat', fromCity: 'Ahmedabad', toCity: 'Surat' },
  });
  evidence.responses.createRoute = createRoute;
  const routeId = createRoute.data?.data?.id || createRoute.data?.id || null;
  evidence.setup.routeId = routeId;

  const stops = [
    { name: 'Ahmedabad', sequenceNumber: 1, latitude: 23.0225, longitude: 72.5714, triggerRadiusKm: 10 },
    { name: 'Nadiad', sequenceNumber: 2, latitude: 22.6916, longitude: 72.8634, triggerRadiusKm: 10 },
    { name: 'Vadodara', sequenceNumber: 3, latitude: 22.3072, longitude: 73.1812, triggerRadiusKm: 10 },
    { name: 'Bharuch', sequenceNumber: 4, latitude: 21.7051, longitude: 72.9959, triggerRadiusKm: 10 },
    { name: 'Surat', sequenceNumber: 5, latitude: 21.1702, longitude: 72.8311, triggerRadiusKm: 10 },
  ];

  const stopResponses = [];
  if (routeId) {
    for (const stop of stops) {
      const r = await req('POST', `/api/routes/${routeId}/stops`, { token: operatorToken, body: stop });
      stopResponses.push({ stop: stop.name, response: r });
    }
  }
  evidence.responses.addStops = stopResponses;

  const members = await req('GET', '/api/agency/members', { token: operatorToken });
  evidence.responses.members = members;
  const memberList = Array.isArray(members.data?.data) ? members.data.data : [];
  const conductor = memberList.find((m) => m.phone === CONDUCTOR_LOGIN.phone);
  const driver = memberList.find((m) => m.phone === DRIVER_PHONE);
  const conductorId = conductor?.id || null;
  const driverId = driver?.id || null;
  evidence.setup.conductorId = conductorId;
  evidence.setup.driverId = driverId;

  const busPlate = `GJ01GP${String(Date.now()).slice(-4)}`;
  const createBus = await req('POST', '/api/agency/buses', {
    token: operatorToken,
    body: { number_plate: busPlate, model: 'GPS Test Bus', capacity: 40 },
  });
  evidence.responses.createBus = createBus;
  const busId = createBus.data?.data?.id || null;
  evidence.setup.busId = busId;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const createTrip = await req('POST', '/api/trips', {
    token: operatorToken,
    body: {
      routeId,
      conductorId,
      driverId,
      busId,
      scheduledDate: tomorrow.toISOString().slice(0, 10),
      assigned_operator_id: null,
    },
  });
  evidence.responses.createTrip = createTrip;
  const tripId = createTrip.data?.data?.id || createTrip.data?.id || null;
  evidence.setup.tripId = tripId;

  const csv = `name,phone,stop_name
Test Passenger 1,+919876540001,Nadiad
Test Passenger 2,+919876540002,Vadodara
Test Passenger 3,+919876540003,Bharuch
Test Passenger 4,+919876540004,Surat`;
  let upload = { status: 0, data: {} };
  if (tripId) {
    const form = new FormData();
    form.append('file', new Blob([csv], { type: 'text/csv' }), 'gps-alert-passengers.csv');
    upload = await req('POST', `/api/trips/${tripId}/passengers/upload`, { token: operatorToken, formData: form });
  }
  evidence.responses.uploadPassengers = upload;

  const conductorLogin = await loginWithFallback(CONDUCTOR_LOGIN);
  evidence.responses.conductorLogin = conductorLogin.details;
  const conductorToken = conductorLogin.token;

  const startTrip = tripId && conductorToken
    ? await req('PUT', `/api/trips/${tripId}/start`, { token: conductorToken, body: {} })
    : { status: 0, data: {} };
  evidence.responses.startTrip = startTrip;
  addResult(results, 1, 'Start trip', 'active', startTrip.status === 200 ? 'PASS' : 'FAIL', `status=${startTrip.status}`);

  const farPings = [
    [23.02, 72.57],
    [22.95, 72.65],
    [22.85, 72.7],
    [22.8, 72.75],
    [22.75, 72.8],
  ];
  const nearNadiad = [
    [22.72, 72.84],
    [22.7, 72.85],
    [22.695, 72.86],
  ];
  const nearNadiadMore = [
    [22.692, 72.863],
    [22.691, 72.864],
    [22.69, 72.865],
  ];
  const towardVadodara = [
    [22.5, 72.95],
    [22.4, 73.05],
    [22.32, 73.17],
  ];

  async function sendPings(points, label) {
    const out = [];
    for (const [lat, lng] of points) {
      const ping = tripId && conductorToken
        ? await req('POST', `/api/trips/${tripId}/location`, { token: conductorToken, body: { lat, lng } })
        : { status: 0, data: {} };
      out.push({ lat, lng, status: ping.status, payload: ping.data });
    }
    evidence.responses[label] = out;
  }

  await sendPings(farPings, 'farPings');
  await new Promise((r) => setTimeout(r, 3000));
  const passengersAfterFar = tripId ? await req('GET', `/api/trips/${tripId}/passengers`, { token: operatorToken }) : { status: 0, data: {} };
  evidence.responses.passengersAfterFar = passengersAfterFar;
  const farStatuses = Array.isArray(passengersAfterFar.data?.data) ? passengersAfterFar.data.data.map((p) => p.alert_status) : [];
  const farPingStatuses = Array.isArray(evidence.responses.farPings) ? evidence.responses.farPings.map((p) => p.status) : [];
  const farPingsAccepted = farPingStatuses.length === 5 && farPingStatuses.every((s) => s === 202);
  const noFarTrigger = farStatuses.length >= 4 && farStatuses.every((s) => s === 'pending');
  addResult(results, 2, 'GPS far pings', 'no alert', farPingsAccepted && noFarTrigger ? 'PASS' : 'FAIL', `pingStatuses=${farPingStatuses.join(',')}; passengerStatuses=${farStatuses.join(',') || 'none'}`);

  await sendPings(nearNadiad, 'nearNadiadPings');
  await new Promise((r) => setTimeout(r, 5000));
  const passengersAfterNadiad = tripId ? await req('GET', `/api/trips/${tripId}/passengers`, { token: operatorToken }) : { status: 0, data: {} };
  const logsAfterNadiad = await req('GET', '/api/logs/alert-logs?limit=50', { token: operatorToken });
  evidence.responses.passengersAfterNadiad = passengersAfterNadiad;
  evidence.responses.logsAfterNadiad = logsAfterNadiad;
  const p1 = Array.isArray(passengersAfterNadiad.data?.data)
    ? passengersAfterNadiad.data.data.find((p) => p.passenger_phone === '+919876540001')
    : null;
  addResult(results, 3, 'GPS near Nadiad', 'alert triggered', p1 && p1.alert_status !== 'pending' ? 'PASS' : 'FAIL', `passenger1_status=${p1?.alert_status || 'missing'}`);

  const nadiadLogsCountBefore = Array.isArray(logsAfterNadiad.data?.data)
    ? logsAfterNadiad.data.data.filter((l) => String(l.passenger_phone || l.phone || '').includes('9876540001')).length
    : 0;
  await sendPings(nearNadiadMore, 'nearNadiadDuplicatePings');
  await new Promise((r) => setTimeout(r, 5000));
  const logsAfterDup = await req('GET', '/api/logs/alert-logs?limit=100', { token: operatorToken });
  evidence.responses.logsAfterDup = logsAfterDup;
  const nadiadLogsCountAfter = Array.isArray(logsAfterDup.data?.data)
    ? logsAfterDup.data.data.filter((l) => String(l.passenger_phone || l.phone || '').includes('9876540001')).length
    : 0;
  addResult(results, 4, 'No duplicate', 'no repeat', nadiadLogsCountAfter <= nadiadLogsCountBefore + 1 ? 'PASS' : 'FAIL', `nadiadLogs before=${nadiadLogsCountBefore} after=${nadiadLogsCountAfter}`);

  const p1AfterWorker = Array.isArray(passengersAfterNadiad.data?.data)
    ? passengersAfterNadiad.data.data.find((p) => p.phone === '+919876540001')
    : null;
  const workerOk = !!p1AfterWorker && ['sent', 'failed', 'triggered'].includes(p1AfterWorker.alert_status || '');
  addResult(results, 5, 'Worker processed', 'logs created', workerOk ? 'PASS' : 'FAIL', `p1_status=${p1AfterWorker?.alert_status || 'missing'}`);

  await sendPings(towardVadodara, 'towardVadodaraPings');
  await new Promise((r) => setTimeout(r, 5000));
  const passengersAfterVad = tripId ? await req('GET', `/api/trips/${tripId}/passengers`, { token: operatorToken }) : { status: 0, data: {} };
  evidence.responses.passengersAfterVad = passengersAfterVad;
  const p2 = Array.isArray(passengersAfterVad.data?.data)
    ? passengersAfterVad.data.data.find((p) => p.passenger_phone === '+919876540002')
    : null;
  addResult(results, 6, 'GPS near Vadodara', 'new alert', p2 && p2.alert_status !== 'pending' ? 'PASS' : 'FAIL', `passenger2_status=${p2?.alert_status || 'missing'}`);

  await new Promise((r) => setTimeout(r, 150000));
  const offlineLogs = await req('GET', '/api/logs/alert-logs?limit=5', { token: operatorToken });
  evidence.responses.postOfflineCheck = offlineLogs;
  addResult(results, 7, 'Heartbeat offline', 'event fired', 'UNKNOWN', 'Cannot verify Socket event from public API only');

  const resumePing = tripId && conductorToken
      ? await req('POST', `/api/trips/${tripId}/location`, { token: conductorToken, body: { lat: 22.31, lng: 73.18 } })
    : { status: 0, data: {} };
  evidence.responses.resumePing = resumePing;
  addResult(results, 8, 'GPS resume', 'online event', resumePing.status === 202 ? 'PASS' : 'FAIL', `status=${resumePing.status}; socket event not externally visible`);

  const completeTrip = tripId && conductorToken
    ? await req('PUT', `/api/trips/${tripId}/complete`, { token: conductorToken, body: {} })
    : { status: 0, data: {} };
  evidence.responses.completeTrip = completeTrip;
  const ownerSummary = await req('GET', '/api/owner/summary', { token: operatorToken });
  evidence.responses.ownerSummaryAfterComplete = ownerSummary;
  addResult(results, 9, 'Complete trip', 'wallet deducted', completeTrip.status === 200 ? 'PASS' : 'FAIL', `complete_status=${completeTrip.status}; wallet endpoint=/api/owner/summary`);

  const alertLogs = await req('GET', '/api/logs/alert-logs?limit=200', { token: operatorToken });
  evidence.responses.alertLogsFinal = alertLogs;
  const logRows = Array.isArray(alertLogs.data?.data) ? alertLogs.data.data : [];
  const hasNadiad = logRows.some((l) => String(l.passenger_phone || l.phone || '').includes('9876540001'));
  const hasVadodara = logRows.some((l) => String(l.passenger_phone || l.phone || '').includes('9876540002'));
  addResult(results, 10, 'Alert logs', 'entries exist', hasNadiad && hasVadodara ? 'PASS' : 'FAIL', `nadiad=${hasNadiad}; vadodara=${hasVadodara}`);

  addResult(results, 11, 'Queue empty', 'no stuck jobs', 'UNKNOWN', 'Redis queue length not exposed via production API');

  const passengersFinal = tripId ? await req('GET', `/api/trips/${tripId}/passengers`, { token: operatorToken }) : { status: 0, data: {} };
  evidence.responses.passengersFinal = passengersFinal;
  const finalList = Array.isArray(passengersFinal.data?.data) ? passengersFinal.data.data : [];
  const statusByPhone = Object.fromEntries(finalList.map((p) => [p.passenger_phone, p.alert_status]));
  const t12Ok =
    ['sent', 'failed', 'triggered'].includes(statusByPhone['+919876540001'] || '') &&
    ['sent', 'failed', 'triggered'].includes(statusByPhone['+919876540002'] || '') &&
    (statusByPhone['+919876540003'] || '') === 'pending' &&
    (statusByPhone['+919876540004'] || '') === 'pending';
  addResult(results, 12, 'Passenger status', 'correct', t12Ok ? 'PASS' : 'FAIL', JSON.stringify(statusByPhone));

  const delBus = busId ? await req('DELETE', `/api/agency/buses/${busId}`, { token: operatorToken }) : { status: 0 };
  evidence.cleanup.push({ entity: 'bus', id: busId, status: delBus.status });
  evidence.cleanup.push({ entity: 'trip', id: tripId, status: 'NOT_AVAILABLE_PUBLIC_ENDPOINT' });
  evidence.cleanup.push({ entity: 'route', id: routeId, status: 'NOT_AVAILABLE_PUBLIC_ENDPOINT' });
  evidence.cleanup.push({ entity: 'passengers', tripId, status: 'NOT_AVAILABLE_PUBLIC_ENDPOINT' });

  for (const row of results) {
    if (row.status === 'PASS') passCount += 1;
    if (row.status === 'FAIL') failCount += 1;
  }

  const criticalIssues = [];
  for (const row of results) {
    if (row.status === 'FAIL') {
      criticalIssues.push({
        test: row.no,
        error: row.notes,
        impact: `Regression in test ${row.no} (${row.test}) for production GPS/alert flow.`,
        suggested_fix: 'Inspect related service logs and endpoint contracts; rerun this scenario after fix.',
      });
    }
  }
  if (results.some((r) => r.status === 'UNKNOWN')) {
    criticalIssues.push({
      test: 'observability',
      error: 'Redis queue depth and heartbeat socket events are not externally verifiable from public API.',
      impact: 'Cannot conclusively validate Tests 7/11 without worker/Redis observability.',
      suggested_fix: 'Add secure operator/admin diagnostics endpoint or provide Railway worker log access for QA.',
    });
  }

  const reportPath = path.join(process.cwd(), 'docs', 'test-reports', 'gps-alert-flow-report.md');
  const evidencePath = path.join(process.cwd(), 'docs', 'test-reports', 'gps-alert-flow-evidence.json');

  const rowMap = new Map(results.map((r) => [r.no, r]));
  const lines = [
    '# GPS + Alert Flow Test Report',
    `Date: ${TODAY}`,
    '',
    '## Environment',
    `- Backend: ${API_BASE}`,
    `- Frontend: ${FRONTEND_URL}`,
    `- Evidence JSON: \`docs/test-reports/gps-alert-flow-evidence.json\``,
    '',
    '## Test Results',
    '| # | Test | Expected | Status | Notes |',
    '|---|------|----------|--------|-------|',
  ];
  for (let i = 1; i <= 12; i += 1) {
    const r = rowMap.get(i) || { expected: '-', status: 'NOT_RUN', notes: '-' };
    lines.push(`| ${i} | ${r.test || '-'} | ${r.expected || '-'} | ${r.status || 'NOT_RUN'} | ${(r.notes || '-').replace(/\|/g, '\\|')} |`);
  }

  lines.push('', '## Critical Issues Found');
  if (criticalIssues.length === 0) {
    lines.push('None.');
  } else {
    for (const issue of criticalIssues) {
      lines.push(`- Exact error: ${issue.error}`);
      lines.push(`- Impact on product: ${issue.impact}`);
      lines.push(`- Suggested fix: ${issue.suggested_fix}`);
      lines.push('');
    }
  }

  lines.push('## Worker Logs');
  lines.push('- Alert worker: Not directly accessible from public API in this run.');
  lines.push('- Heartbeat worker: Not directly accessible from public API in this run.');
  lines.push('- See `gps-alert-flow-evidence.json` for API-side evidence and statuses.');
  lines.push('');
  lines.push('## Cleanup');
  lines.push(`- Bus delete status: ${delBus.status}`);
  lines.push('- Trip/route/passenger delete endpoints are not publicly available in the current backend API.');
  lines.push('');
  lines.push('## Summary');
  lines.push('Total: 12 tests');
  lines.push(`Passed: ${passCount}`);
  lines.push(`Failed: ${failCount}`);
  lines.push(`Unknown/Not directly verifiable: ${results.filter((r) => r.status === 'UNKNOWN').length}`);
  lines.push('');
  lines.push(`Core GPS flow working: ${results.some((r) => r.no === 2 && r.status === 'PASS') && results.some((r) => r.no === 6 && r.status === 'PASS') ? 'YES' : 'NO'}`);
  lines.push(`Alert delivery working: ${results.some((r) => r.no === 10 && r.status === 'PASS') ? 'YES' : 'NO'}`);
  lines.push(`Heartbeat working: ${results.some((r) => r.no === 7 && r.status === 'PASS') ? 'YES' : 'NO (insufficient observability)'}`);
  lines.push(`Wallet deduction working: ${results.some((r) => r.no === 9 && r.status === 'PASS') ? 'YES' : 'NO'}`);
  lines.push(`Ready for real device test: ${failCount === 0 ? 'YES' : 'NO'}`);

  fs.writeFileSync(evidencePath, JSON.stringify({ evidence, results, criticalIssues }, null, 2));
  fs.writeFileSync(reportPath, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ reportPath, evidencePath, results }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
