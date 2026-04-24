/**
 * Bus Alert — Auth System Integration Tests (DEV MODE)
 * Target: http://localhost:3005  (pnpm dev in apps/backend)
 *
 * In dev mode NODE_ENV=development, /send-otp returns the OTP
 * directly in the response body — no Redis / Brevo / MSG91 needed.
 *
 * Run:
 *   npx tsx apps/backend/src/scripts/auth-test.ts
 *   npx tsx apps/backend/src/scripts/auth-test.ts --phone  (real SMS test)
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

// ─── Config ────────────────────────────────────────────────────────────────
const BASE_URL     = 'http://localhost:3005/api/auth';
const HEALTH_URL   = 'http://localhost:3005/api/health';
const USE_PHONE    = process.argv.includes('--phone');
const REAL_PHONE   = '+917778069828'; // user's real phone for --phone mode

const EMAIL_USER        = 'test@busalert.in';
const CONDUCTOR_EMAIL   = 'conductor@busalert.in';
const RATE_LIMIT_EMAIL  = 'ratetest@busalert.in';

// ─── State ─────────────────────────────────────────────────────────────────
type Result = { id: number; name: string; status: '✅' | '❌' | '⚠️'; notes: string };
const results: Result[] = [];
let ACCESS_TOKEN  = '';
let REFRESH_TOKEN = '';

// ─── Utilities ─────────────────────────────────────────────────────────────
const log = (msg: string) => process.stdout.write(msg);

/** Clear Redis rate limit keys for test identifiers */
async function clearRateLimits() {
  try {
    const { default: Redis } = await import('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const redis = new Redis(redisUrl);
    
    const keys = [
      `rl:otp:${EMAIL_USER}`,
      `rl:otp:${CONDUCTOR_EMAIL}`,
      `rl:otp:${RATE_LIMIT_EMAIL}`,
      `otp:${EMAIL_USER}`,
      `otp:${CONDUCTOR_EMAIL}`,
      `otp:${RATE_LIMIT_EMAIL}`
    ];
    
    for (const key of keys) {
      await redis.del(key);
    }
    await redis.quit();
    log('  ✅ Redis rate limits cleared\n');
  } catch (e) {
    log(`  ⚠️  Failed to clear Redis rate limits: ${e}\n`);
  }
}

async function http(method: string, path: string, body?: object, token?: string) {
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function prompt(q: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, ans => { rl.close(); resolve(ans.trim()); }));
}

// ─── TEST 1: Email OTP Signup ───────────────────────────────────────────────
async function test1() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 1 — Email OTP Signup Flow\n');

  // send-otp
  log(`  → POST /send-otp  { identifier: "${EMAIL_USER}" }\n`);
  const r1 = await http('POST', '/send-otp', { identifier: EMAIL_USER });
  log(`     HTTP ${r1.status}: ${JSON.stringify(r1.body)}\n`);

  if (r1.status !== 200 || !r1.body.success) {
    fail(1, 'Email OTP Signup', `send-otp failed: HTTP ${r1.status} — ${JSON.stringify(r1.body.error ?? r1.body)}`);
    return;
  }

  // In dev mode, OTP is returned directly
  const otp: string = r1.body.data?.otp;
  if (!otp) {
    fail(1, 'Email OTP Signup', `No OTP in dev response — check NODE_ENV=development: ${JSON.stringify(r1.body)}`);
    return;
  }
  log(`     📨 OTP (dev mode): ${otp}\n`);

  // verify-otp
  log('  → POST /verify-otp\n');
  const r2 = await http('POST', '/verify-otp', { identifier: EMAIL_USER, otp });
  log(`     HTTP ${r2.status}: ${JSON.stringify(r2.body)}\n`);

  if (r2.status !== 200 || !r2.body.success) {
    fail(1, 'Email OTP Signup', `verify-otp failed: ${JSON.stringify(r2.body)}`);
    return;
  }

  // Existing user → tokens returned directly
  if (!r2.body.data?.is_new_user) {
    ACCESS_TOKEN  = r2.body.data?.access_token ?? r2.body.data?.accessToken;
    REFRESH_TOKEN = r2.body.data?.refresh_token ?? r2.body.data?.refreshToken;
    pass(1, 'Email OTP Signup', `Existing user — OTP login succeeded, role=${r2.body.data?.user?.role}`);
    return;
  }

  const tempToken = r2.body.data?.temp_token;
  if (!tempToken) {
    fail(1, 'Email OTP Signup', `is_new_user=true but no temp_token in response`);
    return;
  }
  log(`     temp_token ✓\n`);

  // signup
  log('  → POST /signup\n');
  const r3 = await http('POST', '/signup', {
    name:       'Test User',
    password:   'Test@1234',
    temp_token: tempToken,
  });
  log(`     HTTP ${r3.status}: ${JSON.stringify(r3.body)}\n`);

  if ((r3.status === 200 || r3.status === 201) && r3.body.success) {
    ACCESS_TOKEN  = r3.body.data?.access_token ?? r3.body.data?.accessToken;
    REFRESH_TOKEN = r3.body.data?.refresh_token ?? r3.body.data?.refreshToken;
    pass(1, 'Email OTP Signup', `New user created, role=${r3.body.data?.user?.role}`);
  } else {
    fail(1, 'Email OTP Signup', `signup: HTTP ${r3.status} — ${JSON.stringify(r3.body)}`);
  }
}

// ─── TEST 2: Password Login ─────────────────────────────────────────────────
async function test2() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 2 — Login with Password\n');

  const r = await http('POST', '/login', { identifier: EMAIL_USER, password: 'Test@1234' });
  log(`  → HTTP ${r.status}: ${JSON.stringify(r.body)}\n`);

  if (r.status === 200 && r.body.success) {
    REFRESH_TOKEN = r.body.data?.refresh_token ?? r.body.data?.refreshToken;
    ACCESS_TOKEN  = r.body.data?.access_token  ?? r.body.data?.accessToken;
    pass(2, 'Login Password', `role=${r.body.data?.user?.role}`);
  } else {
    fail(2, 'Login Password', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }
}

// ─── TEST 3: OTP Login (existing user) ─────────────────────────────────────
async function test3() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 3 — Login with OTP (existing user)\n');

  const r1 = await http('POST', '/send-otp', { identifier: EMAIL_USER });
  const otp: string = r1.body.data?.otp;
  log(`  → OTP: ${otp}\n`);

  if (!otp) {
    fail(3, 'Login OTP', `No OTP in response: ${JSON.stringify(r1.body)}`);
    return;
  }

  const r2 = await http('POST', '/verify-otp', { identifier: EMAIL_USER, otp });
  log(`  → HTTP ${r2.status}: is_new_user=${r2.body.data?.is_new_user}\n`);

  if (r2.status === 200 && r2.body.success && r2.body.data?.access_token) {
    // OTP login deletes ALL old refresh tokens and issues a new one.
    // Capture the new tokens so Test 4 (refresh) uses the current valid token.
    ACCESS_TOKEN  = r2.body.data.access_token  ?? r2.body.data.accessToken;
    REFRESH_TOKEN = r2.body.data.refresh_token ?? r2.body.data.refreshToken;
    log(`  → Updated ACCESS_TOKEN + REFRESH_TOKEN from OTP login\n`);
    pass(3, 'Login OTP', 'Existing user returned access_token via verify-otp');
  } else {
    fail(3, 'Login OTP', `HTTP ${r2.status} — ${JSON.stringify(r2.body)}`);
  }
}

// ─── TEST 4: Token Refresh ──────────────────────────────────────────────────
async function test4() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 4 — Token Refresh\n');

  if (!REFRESH_TOKEN) {
    warn(4, 'Token Refresh', 'No refresh_token — TEST 2 must pass first');
    return;
  }

  const r = await http('POST', '/refresh', { refreshToken: REFRESH_TOKEN });
  log(`  → HTTP ${r.status}: ${JSON.stringify(r.body)}\n`);

  if (r.status === 200 && r.body.success) {
    ACCESS_TOKEN  = r.body.data?.access_token  ?? r.body.data?.accessToken;
    REFRESH_TOKEN = r.body.data?.refresh_token ?? r.body.data?.refreshToken;
    pass(4, 'Token Refresh', 'Rotating refresh token issued');
  } else {
    fail(4, 'Token Refresh', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
  }
}

// ─── TEST 5: Logout + Blacklist ─────────────────────────────────────────────
async function test5() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 5 — Logout + Token Blacklist\n');

  if (!ACCESS_TOKEN) {
    warn(5, 'Logout Blacklist', 'No access_token — previous tests must pass');
    return;
  }

  const tokenToBlacklist = ACCESS_TOKEN;

  const rLogout = await http('POST', '/logout', { refreshToken: REFRESH_TOKEN }, tokenToBlacklist);
  log(`  → Logout: HTTP ${rLogout.status}\n`);

  await sleep(300);

  // Blacklisted token should be rejected on /me
  const rMe = await http('GET', '/me', undefined, tokenToBlacklist);
  log(`  → /me with blacklisted token: HTTP ${rMe.status}\n`);

  if (rMe.status === 401) {
    pass(5, 'Logout Blacklist', 'Token correctly blacklisted (401 on /me)');
  } else {
    fail(5, 'Logout Blacklist', `Expected 401 but got HTTP ${rMe.status}: ${JSON.stringify(rMe.body)}`);
  }

  // Re-issue tokens for later tests
  const r = await http('POST', '/login', { identifier: EMAIL_USER, password: 'Test@1234' });
  if (r.status === 200 && r.body.success) {
    ACCESS_TOKEN  = r.body.data?.access_token  ?? r.body.data?.accessToken;
    REFRESH_TOKEN = r.body.data?.refresh_token ?? r.body.data?.refreshToken;
    log(`  → Re-issued tokens for subsequent tests\n`);
  }
}

// ─── TEST 6: Agency Invite Code ─────────────────────────────────────────────
async function test6() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 6 — Agency Invite Code Flow\n');

  // Get invite code from DB using the postgres driver (same dep as the backend)
  let inviteCode = '';
  try {
    const { default: postgres } = await import('postgres');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');
    const sql = postgres(dbUrl, { max: 1, idle_timeout: 5 });
    const rows = await sql`SELECT invite_code, name FROM agencies LIMIT 1`;
    await sql.end();
    if (rows.length > 0) {
      inviteCode = rows[0].invite_code as string;
      log(`  → Agency invite code from DB: ${inviteCode} (${rows[0].name})\n`);
    }
  } catch (e: any) {
    log(`  ⚠️  DB lookup failed: ${e.message}\n`);
  }

  if (!inviteCode) {
    warn(6, 'Agency Invite', 'No agencies in DB — seed one first to test invite codes');
    return;
  }

  // send-otp for new conductor user
  const r1 = await http('POST', '/send-otp', { identifier: CONDUCTOR_EMAIL });
  const otp: string = r1.body.data?.otp;
  log(`  → OTP for conductor: ${otp}\n`);

  if (!otp) {
    fail(6, 'Agency Invite', `send-otp failed: ${JSON.stringify(r1.body)}`);
    return;
  }

  const r2 = await http('POST', '/verify-otp', { identifier: CONDUCTOR_EMAIL, otp });
  if (!r2.body.success) {
    fail(6, 'Agency Invite', `verify-otp failed: ${JSON.stringify(r2.body)}`);
    return;
  }

  // If user already exists, skip signup
  if (!r2.body.data?.is_new_user) {
    warn(6, 'Agency Invite', 'conductor@busalert.in already exists — delete and rerun');
    return;
  }

  const r3 = await http('POST', '/signup', {
    name:               'Test Conductor',
    password:           'Test@1234',
    temp_token:         r2.body.data.temp_token,
    agency_invite_code: inviteCode,
  });
  log(`  → signup: HTTP ${r3.status}: ${JSON.stringify(r3.body)}\n`);

  if ((r3.status === 200 || r3.status === 201) && r3.body.data?.user?.agencyId) {
    pass(6, 'Agency Invite', `agency_id=${r3.body.data.user.agencyId}, role=${r3.body.data.user.role}`);
  } else {
    fail(6, 'Agency Invite', `HTTP ${r3.status} — ${JSON.stringify(r3.body)}`);
  }
}

// ─── TEST 7: Rate Limiting ──────────────────────────────────────────────────
async function test7() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 7 — Rate Limiting (> 5 OTP requests → 429)\n');

  // We don't pre-clear Redis in local dev — just blast 6 requests
  let got429 = false;
  for (let i = 1; i <= 6; i++) {
    const r = await http('POST', '/send-otp', { identifier: RATE_LIMIT_EMAIL });
    log(`  → Request ${i}: HTTP ${r.status}\n`);
    if (r.status === 429) {
      got429 = true;
      log(`     ✓ 429 returned on request #${i}\n`);
      break;
    }
    await sleep(50);
  }

  if (got429) {
    pass(7, 'Rate Limiting', '429 Too Many Requests correctly returned');
  } else {
    fail(7, 'Rate Limiting', 'Did not receive 429 after 6 OTP requests — check Redis rl: key');
  }
}

// ─── TEST 8: Invalid OTP ────────────────────────────────────────────────────
async function test8() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 8 — Invalid OTP Rejection\n');

  // First send a fresh OTP so there is a valid entry in Redis
  await http('POST', '/send-otp', { identifier: EMAIL_USER });
  await sleep(200);

  const r = await http('POST', '/verify-otp', { identifier: EMAIL_USER, otp: '000000' });
  log(`  → HTTP ${r.status}: ${JSON.stringify(r.body)}\n`);

  if (r.status === 401 && !r.body.success) {
    pass(8, 'Invalid OTP', `Correctly rejected with 401 — ${r.body.error?.code}`);
  } else {
    fail(8, 'Invalid OTP', `Expected 401 but got HTTP ${r.status}: ${JSON.stringify(r.body)}`);
  }
}

// ─── TEST 9: Real Phone OTP ─────────────────────────────────────────────────
async function test9() {
  if (!USE_PHONE) {
    warn(9, 'Real Phone OTP (MSG91)', 'Skipped — run with --phone flag to enable');
    return;
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log(`TEST 9 — Real Phone OTP via MSG91 (${REAL_PHONE})\n`);

  const r1 = await http('POST', '/send-otp', { identifier: REAL_PHONE });
  log(`  → send-otp: HTTP ${r1.status}: ${JSON.stringify(r1.body)}\n`);

  if (!r1.body.success) {
    fail(9, 'Real Phone OTP', `send-otp failed: ${JSON.stringify(r1.body)}`);
    return;
  }

  const otp = await prompt(`  ↳ Enter OTP received on ${REAL_PHONE}: `);
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

// ─── TEST 10: Cleanup ───────────────────────────────────────────────────────
async function test10() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('TEST 10 — Cleanup (remove test users from DB)\n');

  try {
    const { default: postgres } = await import('postgres');
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');
    const sql = postgres(dbUrl, { max: 1, idle_timeout: 5 });

    const userRows = await sql`
      SELECT id FROM users
      WHERE email IN (${EMAIL_USER}, ${CONDUCTOR_EMAIL}, ${RATE_LIMIT_EMAIL})
    `;

    if (userRows.length > 0) {
      const ids = userRows.map((r: any) => r.id);
      // Delete dependent audit_logs first (FK constraint)
      await sql`DELETE FROM audit_logs WHERE user_id = ANY(${ids}::uuid[])`;
      // Delete dependent refresh_tokens
      await sql`DELETE FROM refresh_tokens WHERE user_id = ANY(${ids}::uuid[])`;
      // Now delete users
      const deleted = await sql`
        DELETE FROM users WHERE id = ANY(${ids}::uuid[]) RETURNING email, id
      `;
      log(`  → Deleted ${deleted.length} user(s)\n`);
      deleted.forEach((r: any) => log(`     - ${r.email} (${r.id})\n`));
      pass(10, 'Cleanup', `${deleted.length} test user(s) removed`);
    } else {
      pass(10, 'Cleanup', 'No test users found in DB (already cleaned up)');
    }
    await sql.end();
  } catch (e: any) {
    warn(10, 'Cleanup', `DB cleanup failed (manual cleanup may be needed): ${e.message}`);
  }
}

// ─── Report ─────────────────────────────────────────────────────────────────
function buildReport() {
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  const warned = results.filter(r => r.status === '⚠️').length;

  const table = results.map(r =>
    `| ${String(r.id).padEnd(5)} | ${r.name.padEnd(26)} | ${r.status}   | ${r.notes.slice(0, 65)} |`
  ).join('\n');

  const failures = results
    .filter(r => r.status === '❌')
    .map(r => `### Test ${r.id} — ${r.name}\n- **Error**: ${r.notes}`)
    .join('\n\n');

  return `# Auth System Test Report — DEV MODE

**Date:** ${now} (IST)  
**Backend:** http://localhost:3005 (development)  
**Mode:** NODE_ENV=development (OTP returned inline, no email/SMS sent)

## Test Results

| Test  | Description                | Status | Notes |
|-------|----------------------------|--------|-------|
${table}

## Failed Tests

${failed === 0 ? '_No failures_ ✅' : failures}

## Summary

| Metric   | Count |
|----------|-------|
| Total    | ${results.length} |
| Passed   | ${passed} |
| Warnings | ${warned} |
| Failed   | ${failed} |

**Ready for production:** ${failed === 0 ? 'YES ✅' : 'NO ❌ — fix failures above first'}

## Dev Notes

- OTP is returned inline in \`/send-otp\` response (dev mode only)
- No real SMS or email is sent during these tests
- To test real MSG91 SMS: \`npx tsx apps/backend/src/scripts/auth-test.ts --phone\`
- Rate limiting tested by sending 6 OTP requests to the same identifier
`;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  // Load .env.local
  const envPath = path.resolve('apps/backend/.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length) {
        process.env[key.trim()] ??= rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  log('╔══════════════════════════════════════════════════════╗\n');
  log('║   Bus Alert — Auth Tests  (DEV MODE / localhost)      ║\n');
  log('╚══════════════════════════════════════════════════════╝\n');
  log(`\nNODE_ENV=${process.env.NODE_ENV}\n`);

  // Wait for server to be ready
  log('\nWaiting for backend on http://localhost:3005...\n');
  let ready = false;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      const r = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
      if (r.ok) { ready = true; log(`  ✅ Backend ready (attempt ${attempt})\n`); break; }
    } catch { /* retry */ }
    log(`  ... attempt ${attempt}/15\n`);
    await sleep(2000);
  }
  if (!ready) {
    log('\n❌ Backend not reachable. Start it first:\n');
    log('   pnpm --filter backend dev\n\n');
    process.exit(1);
  }

  await clearRateLimits();

  await test1();
  await test2();
  await test3();
  await test4();
  await test5();
  await test6();
  await test7();
  await test8();
  await test9();
  await test10();

  const report = buildReport();

  // Print summary
  const passed = results.filter(r => r.status === '✅').length;
  const failed = results.filter(r => r.status === '❌').length;
  log('\n╔══════════════════════════════════════════════════════╗\n');
  log(`║  RESULTS: ${passed} passed  |  ${failed} failed  |  ${results.filter(r=>r.status==='⚠️').length} skipped\n`);
  log('╚══════════════════════════════════════════════════════╝\n');

  // Save report
  const reportDir  = path.resolve('docs/test-reports');
  const reportFile = path.join(reportDir, 'auth-test-report.md');
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportFile, report, 'utf8');
  log(`\n📄 Report saved → ${reportFile}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
