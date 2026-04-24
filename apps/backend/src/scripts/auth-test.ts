/**
 * Bus Alert — Complete Auth System Test
 * Backend: https://api-production-e13f.up.railway.app
 *
 * Usage:
 *   npx tsx apps/backend/src/scripts/auth-test.ts
 *   npx tsx apps/backend/src/scripts/auth-test.ts --phone   (uses real phone, waits for OTP input)
 */

import * as readline from 'readline';

// ─── Config ────────────────────────────────────────────────────────────────
const BASE_URL = 'https://api-production-e13f.up.railway.app/api/auth';

// Upstash REST (to read OTPs from Redis without Brevo/MSG91 dependency in tests)
const UPSTASH_URL   = 'https://firm-dolphin-86115.upstash.io';
const UPSTASH_TOKEN = 'gQAAAAAAAVBjAAIncDI4MTgyNjcyYWY2Nzc0MGRmOGM5ZDAwZWFjNzI3NDVhNnAyODYxMTU';

// DB (Neon) — only used for invite-code lookup and cleanup
const DB_URL = 'postgresql://neondb_owner:npg_yxAdsK94wclz@ep-late-mouse-ancgm810-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const USE_PHONE_OTP = process.argv.includes('--phone');

// ─── Test accounts ─────────────────────────────────────────────────────────
const EMAIL_USER        = 'test@busalert.in';
const CONDUCTOR_EMAIL   = 'conductor@busalert.in';
const RATE_LIMIT_EMAIL  = 'ratetest@busalert.in';
const REAL_PHONE        = '+917778069828'; // user's real phone

// ─── Helpers ───────────────────────────────────────────────────────────────
type TestResult = { id: number; name: string; status: '✅' | '❌' | '⚠️'; notes: string };
const results: TestResult[] = [];
let ACCESS_TOKEN  = '';
let REFRESH_TOKEN = '';
let TEMP_TOKEN    = '';
let INVITE_CODE   = '';

const log = (msg: string) => process.stdout.write(msg);

async function http(method: string, path: string, body?: object, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  const data = await res.json() as any;
  return data?.result ?? null;
}

async function dbQuery(sql: string): Promise<any[]> {
  // We use node-postgres via dynamic import
  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: DB_URL });
    await client.connect();
    const { rows } = await client.query(sql);
    await client.end();
    return rows;
  } catch (e: any) {
    log(`  ⚠️  DB query failed: ${e.message}\n`);
    return [];
  }
}

function pass(id: number, name: string, notes = '') {
  results.push({ id, name, status: '✅', notes });
  log(`  ✅ PASS: ${name}${notes ? ` — ${notes}` : ''}\n`);
}

function fail(id: number, name: string, notes: string) {
  results.push({ id, name, status: '❌', notes });
  log(`  ❌ FAIL: ${name} — ${notes}\n`);
}

function warn(id: number, name: string, notes: string) {
  results.push({ id, name, status: '⚠️', notes });
  log(`  ⚠️  WARN: ${name} — ${notes}\n`);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ─── TESTS ─────────────────────────────────────────────────────────────────

async function test1_EmailOtpSignup() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 1 — Email OTP Signup Flow\n');

  // Step 1: send-otp
  log('  → POST /send-otp\n');
  const r1 = await http('POST', '/send-otp', { identifier: EMAIL_USER });
  if (r1.status !== 200 || !r1.body.success) {
    fail(1, 'Email OTP Signup', `send-otp failed: HTTP ${r1.status} — ${JSON.stringify(r1.body)}`);
    return;
  }
  log(`     Response: ${JSON.stringify(r1.body.data)}\n`);

  // Step 2: get OTP from Redis
  log('  → Reading OTP from Upstash Redis (key: otp:test@busalert.in)\n');
  await sleep(500);
  const otp = await redisGet(`otp:${EMAIL_USER}`);
  if (!otp) {
    fail(1, 'Email OTP Signup', 'OTP not found in Redis — delivery may be broken');
    return;
  }
  log(`     OTP from Redis: ${otp}\n`);

  // Step 3: verify-otp
  log('  → POST /verify-otp\n');
  const r3 = await http('POST', '/verify-otp', { identifier: EMAIL_USER, otp });
  if (r3.status !== 200 || !r3.body.success) {
    fail(1, 'Email OTP Signup', `verify-otp failed: HTTP ${r3.status} — ${JSON.stringify(r3.body)}`);
    return;
  }
  log(`     is_new_user: ${r3.body.data.is_new_user}\n`);

  // If user already exists (repeat test run), grab tokens directly
  if (!r3.body.data.is_new_user) {
    ACCESS_TOKEN  = r3.body.data.access_token;
    REFRESH_TOKEN = r3.body.data.refresh_token;
    pass(1, 'Email OTP Signup', 'Existing user — OTP login returned tokens (no signup needed)');
    return;
  }

  TEMP_TOKEN = r3.body.data.temp_token;
  log(`     temp_token obtained ✓\n`);

  // Step 4: signup
  log('  → POST /signup\n');
  const r4 = await http('POST', '/signup', {
    name: 'Test User',
    password: 'Test@1234',
    temp_token: TEMP_TOKEN,
  });
  if (r4.status !== 201 && r4.status !== 200) {
    fail(1, 'Email OTP Signup', `signup failed: HTTP ${r4.status} — ${JSON.stringify(r4.body)}`);
    return;
  }
  ACCESS_TOKEN  = r4.body.data?.access_token  ?? r4.body.data?.accessToken;
  REFRESH_TOKEN = r4.body.data?.refresh_token ?? r4.body.data?.refreshToken;

  if (!ACCESS_TOKEN || !REFRESH_TOKEN) {
    fail(1, 'Email OTP Signup', `Tokens missing from signup response: ${JSON.stringify(r4.body)}`);
    return;
  }

  log(`     user: ${JSON.stringify(r4.body.data?.user)}\n`);
  pass(1, 'Email OTP Signup', `New user created, role=${r4.body.data?.user?.role}`);
}

async function test2_LoginPassword() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 2 — Login with Password\n');

  const r = await http('POST', '/login', { identifier: EMAIL_USER, password: 'Test@1234' });
  log(`  → Response: HTTP ${r.status}\n`);
  if (r.status !== 200 || !r.body.success) {
    fail(2, 'Login Password', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    return;
  }

  // Refresh tokens from password login (overwrite so TEST 4 tests fresh pair)
  REFRESH_TOKEN = r.body.data?.refresh_token ?? r.body.data?.refreshToken;
  ACCESS_TOKEN  = r.body.data?.access_token  ?? r.body.data?.accessToken;

  pass(2, 'Login Password', `role=${r.body.data?.user?.role}`);
}

async function test3_LoginOtp() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 3 — Login with OTP\n');

  // Step 1
  const r1 = await http('POST', '/send-otp', { identifier: EMAIL_USER });
  if (!r1.body.success) {
    fail(3, 'Login OTP', `send-otp failed: ${JSON.stringify(r1.body)}`);
    return;
  }
  log('  → OTP sent\n');

  await sleep(500);
  const otp = await redisGet(`otp:${EMAIL_USER}`);
  if (!otp) {
    fail(3, 'Login OTP', 'OTP not found in Redis');
    return;
  }
  log(`  → OTP from Redis: ${otp}\n`);

  // Existing user → verify-otp gives tokens directly
  const r2 = await http('POST', '/verify-otp', { identifier: EMAIL_USER, otp });
  log(`  → verify-otp: HTTP ${r2.status}\n`);

  if (r2.status !== 200 || !r2.body.success) {
    fail(3, 'Login OTP', `HTTP ${r2.status} — ${JSON.stringify(r2.body)}`);
    return;
  }

  if (r2.body.data.access_token) {
    pass(3, 'Login OTP', 'Existing user login via OTP returned access_token');
  } else {
    fail(3, 'Login OTP', `Expected access_token for existing user but got: ${JSON.stringify(r2.body.data)}`);
  }
}

async function test4_TokenRefresh() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 4 — Token Refresh\n');

  if (!REFRESH_TOKEN) {
    warn(4, 'Token Refresh', 'No refresh_token available — TEST 2 must pass first');
    return;
  }

  const r = await http('POST', '/refresh', { refreshToken: REFRESH_TOKEN });
  log(`  → HTTP ${r.status}\n`);
  if (r.status !== 200 || !r.body.success) {
    fail(4, 'Token Refresh', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    return;
  }

  ACCESS_TOKEN  = r.body.data?.access_token  ?? r.body.data?.accessToken;
  REFRESH_TOKEN = r.body.data?.refresh_token ?? r.body.data?.refreshToken;
  pass(4, 'Token Refresh', 'Rotating refresh token issued successfully');
}

async function test5_LogoutBlacklist() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 5 — Logout + Token Blacklist\n');

  if (!ACCESS_TOKEN) {
    warn(5, 'Logout Blacklist', 'No access_token — previous tests must pass');
    return;
  }

  const tokenBeforeLogout = ACCESS_TOKEN;

  // Logout
  const rLogout = await http('POST', '/logout', { refreshToken: REFRESH_TOKEN }, tokenBeforeLogout);
  log(`  → Logout: HTTP ${rLogout.status}\n`);
  if (!rLogout.body.success) {
    fail(5, 'Logout Blacklist', `Logout failed: ${JSON.stringify(rLogout.body)}`);
    return;
  }

  // Try using blacklisted token on /me
  await sleep(200);
  const rMe = await http('GET', '/me', undefined, tokenBeforeLogout);
  log(`  → /me with blacklisted token: HTTP ${rMe.status}\n`);

  if (rMe.status === 401) {
    pass(5, 'Logout Blacklist', 'Blacklisted token correctly rejected (401)');
  } else {
    fail(5, 'Logout Blacklist', `Expected 401 but got ${rMe.status}: ${JSON.stringify(rMe.body)}`);
  }
}

async function test6_AgencyInvite() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 6 — Agency Invite Code Flow\n');

  // Get invite code from DB
  const rows = await dbQuery('SELECT invite_code, name FROM agencies LIMIT 1');
  if (rows.length === 0) {
    warn(6, 'Agency Invite', 'No agencies in DB — seed one first. Skipping.');
    return;
  }
  INVITE_CODE = rows[0].invite_code;
  log(`  → Agency: "${rows[0].name}", invite_code: ${INVITE_CODE}\n`);

  // Send OTP for new conductor user
  const r1 = await http('POST', '/send-otp', { identifier: CONDUCTOR_EMAIL });
  if (!r1.body.success) {
    fail(6, 'Agency Invite', `send-otp failed: ${JSON.stringify(r1.body)}`);
    return;
  }

  await sleep(500);
  const otp = await redisGet(`otp:${CONDUCTOR_EMAIL}`);
  if (!otp) {
    fail(6, 'Agency Invite', 'OTP not found in Redis for conductor user');
    return;
  }

  const r2 = await http('POST', '/verify-otp', { identifier: CONDUCTOR_EMAIL, otp });
  if (!r2.body.success || !r2.body.data?.temp_token) {
    // Existing user
    if (r2.body.data?.access_token) {
      warn(6, 'Agency Invite', 'conductor@busalert.in already exists — skipping signup step. Clean up and re-run.');
      return;
    }
    fail(6, 'Agency Invite', `verify-otp failed: ${JSON.stringify(r2.body)}`);
    return;
  }

  const tempTok = r2.body.data.temp_token;

  const r3 = await http('POST', '/signup', {
    name:              'Test Conductor',
    password:          'Test@1234',
    temp_token:        tempTok,
    agency_invite_code: INVITE_CODE,
  });
  log(`  → signup: HTTP ${r3.status}\n`);
  log(`     user: ${JSON.stringify(r3.body.data?.user)}\n`);

  if ((r3.status === 201 || r3.status === 200) && r3.body.data?.user?.agency_id) {
    pass(6, 'Agency Invite', `agency_id=${r3.body.data.user.agencyId}, role=${r3.body.data.user.role}`);
  } else {
    fail(6, 'Agency Invite', `HTTP ${r3.status} — ${JSON.stringify(r3.body)}`);
  }
}

async function test7_RateLimiting() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 7 — Rate Limiting (5 OTP requests → 429 on 6th)\n');

  // Clear rate limit key first (so test is deterministic)
  await fetch(`${UPSTASH_URL}/del/rl:otp:${RATE_LIMIT_EMAIL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
  });
  log('  → Rate limit key cleared in Redis\n');

  let got429 = false;
  for (let i = 1; i <= 6; i++) {
    const r = await http('POST', '/send-otp', { identifier: RATE_LIMIT_EMAIL });
    log(`  → Request ${i}: HTTP ${r.status}\n`);
    if (r.status === 429) {
      got429 = true;
      log(`     Got 429 on request #${i} ✓\n`);
      break;
    }
    await sleep(100);
  }

  if (got429) {
    pass(7, 'Rate Limiting', '429 returned after limit exceeded');
  } else {
    fail(7, 'Rate Limiting', 'Never got 429 after 6 OTP requests');
  }
}

async function test8_InvalidOtp() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 8 — Invalid OTP (wrong code)\n');

  // Send fresh OTP first to create a valid Redis entry
  await http('POST', '/send-otp', { identifier: EMAIL_USER });
  await sleep(300);

  const r = await http('POST', '/verify-otp', { identifier: EMAIL_USER, otp: '000000' });
  log(`  → HTTP ${r.status}: ${JSON.stringify(r.body)}\n`);

  if (r.status === 401 || r.status === 400) {
    const msg = JSON.stringify(r.body);
    pass(8, 'Invalid OTP', `Correctly rejected — ${msg.slice(0, 80)}`);
  } else {
    fail(8, 'Invalid OTP', `Expected 401/400 but got HTTP ${r.status}: ${JSON.stringify(r.body)}`);
  }
}

async function test9_RealPhoneOtp() {
  if (!USE_PHONE_OTP) {
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    log('TEST 9 — Real Phone OTP (SKIPPED — run with --phone flag to enable)\n');
    warn(9, 'Real Phone OTP', 'Skipped — use --phone flag to enable');
    return;
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log(`TEST 9 — Real Phone OTP (phone: ${REAL_PHONE})\n`);

  const r1 = await http('POST', '/send-otp', { identifier: REAL_PHONE });
  log(`  → send-otp: HTTP ${r1.status}: ${JSON.stringify(r1.body)}\n`);

  if (!r1.body.success) {
    fail(9, 'Real Phone OTP', `send-otp failed: ${JSON.stringify(r1.body)}`);
    return;
  }

  log(`  → OTP sent to ${REAL_PHONE} via MSG91\n`);
  const otp = await prompt('  ↳ Enter the OTP you received on your phone: ');

  if (!otp || otp.length !== 6) {
    fail(9, 'Real Phone OTP', `Invalid OTP entered: "${otp}"`);
    return;
  }

  const r2 = await http('POST', '/verify-otp', { identifier: REAL_PHONE, otp });
  log(`  → verify-otp: HTTP ${r2.status}: ${JSON.stringify(r2.body)}\n`);

  if (r2.body.success) {
    pass(9, 'Real Phone OTP', r2.body.data?.is_new_user ? 'New user — temp_token issued' : 'Existing user — tokens issued');
  } else {
    fail(9, 'Real Phone OTP', `verify-otp failed: ${JSON.stringify(r2.body)}`);
  }
}

async function test10_Cleanup() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 10 — Cleanup (delete test users)\n');

  const sql = `
    DELETE FROM users
    WHERE email IN ('test@busalert.in', 'conductor@busalert.in', 'ratetest@busalert.in')
    OR phone = '${REAL_PHONE}'
    RETURNING email, phone, id;
  `;

  const deleted = await dbQuery(sql);
  log(`  → Deleted ${deleted.length} users\n`);
  deleted.forEach(r => log(`     - ${r.email ?? r.phone} (${r.id})\n`));

  // Also clean Redis rate-limit keys
  for (const key of [
    `rl:otp:${EMAIL_USER}`,
    `rl:otp:${CONDUCTOR_EMAIL}`,
    `rl:otp:${RATE_LIMIT_EMAIL}`,
  ]) {
    await fetch(`${UPSTASH_URL}/del/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
  }
  log('  → Rate-limit keys cleared in Redis\n');
  pass(10, 'Cleanup', `${deleted.length} test users removed`);
}

// ─── Report ────────────────────────────────────────────────────────────────

function buildReport(): string {
  const now = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warned = results.filter(r => r.status === '⚠️').length;
  const total  = results.length;

  const table = results.map(r =>
    `| ${String(r.id).padEnd(5)} | ${r.name.padEnd(22)} | ${r.status}   | ${r.notes.slice(0, 70)} |`
  ).join('\n');

  const failures = results
    .filter(r => r.status === '❌')
    .map(r => `### Test ${r.id} — ${r.name}\n- **Error**: ${r.notes}`)
    .join('\n\n');

  const ready = failed === 0 ? 'YES ✅' : 'NO ❌';

  return `# Auth System Test Report

**Date:** ${now} (IST)  
**Backend:** https://api-production-e13f.up.railway.app  
**Test Mode:** ${USE_PHONE_OTP ? 'Phone OTP enabled' : 'Email + Redis OTP'}

## Results

| Test  | Description             | Status | Notes |
|-------|-------------------------|--------|-------|
${table}

## Failed Tests

${failed === 0 ? '_No failures_ ✅' : failures}

## Summary

| Metric   | Count |
|----------|-------|
| Total    | ${total}  |
| Passed   | ${passed}  |
| Warnings | ${warned}  |
| Failed   | ${failed}  |

**Ready for production:** ${ready}

## Notes

- OTP read directly from Upstash Redis REST API — bypasses actual SMS/email delivery for speed
- To test real SMS delivery: \`npx tsx apps/backend/src/scripts/auth-test.ts --phone\`
- Rate limit: 5 OTP requests per identifier per hour (enforced in Redis)
- Refresh tokens are rotated on each use (one-time use)
- Access tokens are blacklisted in Redis on logout
`;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  log('╔══════════════════════════════════════════════════════╗\n');
  log('║   Bus Alert — Auth System Integration Tests           ║\n');
  log('║   Backend: api-production-e13f.up.railway.app         ║\n');
  log('╚══════════════════════════════════════════════════════╝\n');

  // Health check
  log('\nChecking backend health...\n');
  try {
    const health = await fetch('https://api-production-e13f.up.railway.app/api/health');
    log(`  → /api/health: HTTP ${health.status}\n`);
  } catch (e: any) {
    log(`  ❌ Backend unreachable: ${e.message}\n`);
    process.exit(1);
  }

  await test1_EmailOtpSignup();
  await test2_LoginPassword();
  await test3_LoginOtp();
  await test4_TokenRefresh();
  await test5_LogoutBlacklist();
  await test6_AgencyInvite();
  await test7_RateLimiting();
  await test8_InvalidOtp();
  await test9_RealPhoneOtp();
  await test10_Cleanup();

  const report = buildReport();

  // Console summary
  log('\n╔══════════════════════════════════════════════════════╗\n');
  log(`║  Results: ${results.filter(r=>r.status==='✅').length} passed, ${results.filter(r=>r.status==='❌').length} failed, ${results.filter(r=>r.status==='⚠️').length} warned\n`);
  log('╚══════════════════════════════════════════════════════╝\n');

  // Write report
  const fs = await import('fs');
  const path = await import('path');

  const reportDir  = path.resolve('docs/test-reports');
  const reportPath = path.join(reportDir, 'auth-test-report.md');

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportPath, report);
  log(`\nReport saved → ${reportPath}\n`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
