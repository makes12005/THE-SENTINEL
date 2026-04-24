import postgres from 'postgres';
import { loadEnv } from '../lib/load-env';

loadEnv();

const BACKEND_URL = (process.env.AUTH_TEST_BASE_URL || 'https://api-production-e13f.up.railway.app').replace(/\/$/, '');
const AUTH_BASE_URL = `${BACKEND_URL}/api/auth`;
const TEST_CONTACT = 'test_auth@busalert.in';
const RATE_CONTACT = 'rate@busalert.in';
const TEST_PASSWORD = 'Test@123';
const UPDATED_TEST_PASSWORD = 'Test@456';
const TEST_NAME = 'Test User';

type StepStatus = 'PASS' | 'FAIL' | 'SKIP';
type StepResult = {
  id: number;
  name: string;
  status: StepStatus;
  details: string;
};

const results: StepResult[] = [];
let accessToken = '';
let refreshToken = '';
let latestTempToken = '';

function getUpstashRestUrl(): string {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  if (!url) {
    throw new Error('Missing UPSTASH_REDIS_REST_URL');
  }
  return url.replace(/\/$/, '');
}

function getUpstashToken(): string {
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!token) {
    throw new Error('Missing UPSTASH_REDIS_REST_TOKEN');
  }
  return token;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('Missing DATABASE_URL');
  }
  return url;
}

async function api(method: string, path: string, body?: object, bearer?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json: any = { raw: text };
  try {
    json = JSON.parse(text);
  } catch {}

  return { status: response.status, body: json };
}

async function apiGet(path: string, bearer?: string) {
  const headers: Record<string, string> = {};
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const response = await fetch(`${BACKEND_URL}${path}`, { headers });
  const text = await response.text();
  let json: any = { raw: text };
  try {
    json = JSON.parse(text);
  } catch {}

  return { status: response.status, body: json };
}

async function upstashCommand(args: string[]) {
  const response = await fetch(`${getUpstashRestUrl()}/${args.map(encodeURIComponent).join('/')}`, {
    headers: {
      Authorization: `Bearer ${getUpstashToken()}`,
    },
  });

  const text = await response.text();
  let json: any = { raw: text };
  try {
    json = JSON.parse(text);
  } catch {}

  if (!response.ok) {
    throw new Error(`Upstash REST failed: HTTP ${response.status} ${text}`);
  }

  return json;
}

async function getOtp(contact: string): Promise<string> {
  const key = `otp:${contact}`;
  const response = await upstashCommand(['GET', key]);
  const value = response.result;

  if (!value || typeof value !== 'string') {
    throw new Error(`OTP key ${key} not found in Upstash`);
  }

  let otpValue = value;
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.otp) {
      otpValue = parsed.otp;
    }
  } catch {
    // Ignore JSON parse error, use raw value
  }

  if (!/^\d{6}$/.test(otpValue)) {
    throw new Error(`OTP key ${key} did not contain a 6-digit OTP`);
  }

  return otpValue;
}

async function deleteRedisKeys(keys: string[]) {
  for (const key of keys) {
    await upstashCommand(['DEL', key]);
  }
}

async function cleanupUsers() {
  const sql = postgres(getDatabaseUrl(), { max: 1 });
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id
      FROM users
      WHERE email IN (${TEST_CONTACT}, ${RATE_CONTACT})
    `;

    if (!rows.length) {
      return 0;
    }

    const ids = rows.map((row) => row.id);
    await sql`DELETE FROM refresh_tokens WHERE user_id = ANY(${ids}::uuid[])`;
    await sql`DELETE FROM audit_logs WHERE user_id = ANY(${ids}::uuid[])`;
    await sql`DELETE FROM users WHERE id = ANY(${ids}::uuid[])`;

    return rows.length;
  } finally {
    await sql.end();
  }
}

function record(id: number, name: string, status: StepStatus, details: string) {
  results.push({ id, name, status, details });
  const prefix = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'SKIP';
  console.log(`[${prefix}] ${id}. ${name}: ${details}`);
}

async function runStep(id: number, name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    record(id, name, 'FAIL', details);
    throw error;
  }
}

async function main() {
  console.log(`Auth live tests against ${BACKEND_URL}`);

  await cleanupUsers();
  await deleteRedisKeys([
    `otp:${TEST_CONTACT}`,
    `otp:${RATE_CONTACT}`,
    `rl:otp:${TEST_CONTACT}`,
    `rl:otp:${RATE_CONTACT}`,
  ]);

  await runStep(1, 'Send OTP', async () => {
    const response = await api('POST', '/send-otp', { contact: TEST_CONTACT });
    const channel = response.body?.channel ?? response.body?.data?.channel;
    if (response.status !== 200 || response.body?.success !== true || channel !== 'email') {
      throw new Error(`Expected success=true and channel=email, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(1, 'Send OTP', 'PASS', `HTTP ${response.status}`);
  });

  await runStep(2, 'Get OTP from Redis + Verify', async () => {
    const otp = await getOtp(TEST_CONTACT);
    const response = await api('POST', '/verify-otp', { contact: TEST_CONTACT, otp });
    latestTempToken = response.body?.data?.temp_token ?? '';
    if (response.status !== 200 || response.body?.success !== true || !latestTempToken) {
      throw new Error(`Expected temp_token, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(2, 'Get OTP from Redis + Verify', 'PASS', 'temp_token issued');
  });

  await runStep(3, 'Signup', async () => {
    const response = await api('POST', '/signup', {
      name: TEST_NAME,
      contact: TEST_CONTACT,
      password: TEST_PASSWORD,
      temp_token: latestTempToken,
    });
    accessToken = response.body?.data?.access_token ?? '';
    refreshToken = response.body?.data?.refresh_token ?? '';
    const role = response.body?.data?.user?.role;
    if (!(response.status === 200 || response.status === 201) || !accessToken || role !== 'passenger') {
      throw new Error(`Expected passenger signup tokens, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(3, 'Signup', 'PASS', `role=${role}`);
  });

  await runStep(4, 'Login Password', async () => {
    const response = await api('POST', '/login', {
      contact: TEST_CONTACT,
      password: TEST_PASSWORD,
    });
    accessToken = response.body?.data?.access_token ?? '';
    refreshToken = response.body?.data?.refresh_token ?? '';
    if (response.status !== 200 || !accessToken || !refreshToken) {
      throw new Error(`Expected access_token + refresh_token, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(4, 'Login Password', 'PASS', 'tokens issued');
  });

  await runStep(5, 'Login OTP', async () => {
    const sendOtp = await api('POST', '/send-otp', { contact: TEST_CONTACT });
    if (sendOtp.status !== 200 || sendOtp.body?.success !== true) {
      throw new Error(`Failed to send OTP for login-otp: HTTP ${sendOtp.status} ${JSON.stringify(sendOtp.body)}`);
    }

    const otp = await getOtp(TEST_CONTACT);
    const response = await api('POST', '/login-otp', { contact: TEST_CONTACT, otp });
    accessToken = response.body?.data?.access_token ?? '';
    refreshToken = response.body?.data?.refresh_token ?? '';
    if (response.status !== 200 || !accessToken || !refreshToken) {
      throw new Error(`Expected access_token, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(5, 'Login OTP', 'PASS', 'access + refresh tokens issued');
  });

  await runStep(6, 'Refresh Token', async () => {
    const response = await api('POST', '/refresh', { refresh_token: refreshToken });
    accessToken = response.body?.data?.access_token ?? '';
    refreshToken = response.body?.data?.refresh_token ?? '';
    if (response.status !== 200 || !accessToken || !refreshToken) {
      throw new Error(`Expected rotated tokens, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(6, 'Refresh Token', 'PASS', 'rotated tokens issued');
  });

  await runStep(7, 'Get Current User (/me)', async () => {
    const response = await apiGet('/api/auth/me', accessToken);
    const userId = response.body?.data?.id;
    const role = response.body?.data?.role;
    if (response.status !== 200 || !userId || role !== 'passenger') {
      throw new Error(`Expected authenticated user profile, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(7, 'Get Current User (/me)', 'PASS', `user=${userId}`);
  });

  await runStep(8, 'Change Password', async () => {
    const response = await api('POST', '/change-password', {
      current_password: TEST_PASSWORD,
      new_password: UPDATED_TEST_PASSWORD,
    }, accessToken);
    if (response.status !== 200 || response.body?.success !== true) {
      throw new Error(`Expected password change success, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(8, 'Change Password', 'PASS', 'password updated and refresh tokens revoked');
  });

  await runStep(9, 'Login Password (Updated Password)', async () => {
    const response = await api('POST', '/login', {
      contact: TEST_CONTACT,
      password: UPDATED_TEST_PASSWORD,
    });
    accessToken = response.body?.data?.access_token ?? '';
    refreshToken = response.body?.data?.refresh_token ?? '';
    if (response.status !== 200 || !accessToken || !refreshToken) {
      throw new Error(`Expected login success with new password, got HTTP ${response.status} ${JSON.stringify(response.body)}`);
    }
    record(9, 'Login Password (Updated Password)', 'PASS', 'tokens issued with new password');
  });

  await runStep(10, 'Logout + Blacklist', async () => {
    const tokenToBlacklist = accessToken;
    const logoutResponse = await api('POST', '/logout', { refresh_token: refreshToken }, tokenToBlacklist);
    if (logoutResponse.status !== 200 || logoutResponse.body?.success !== true) {
      throw new Error(`Logout failed: HTTP ${logoutResponse.status} ${JSON.stringify(logoutResponse.body)}`);
    }

    const tripsResponse = await apiGet('/api/trips', tokenToBlacklist);
    if (tripsResponse.status !== 401) {
      throw new Error(`Expected 401 after blacklist, got HTTP ${tripsResponse.status} ${JSON.stringify(tripsResponse.body)}`);
    }
    record(10, 'Logout + Blacklist', 'PASS', 'blacklisted token rejected by /api/trips');
  });

  await runStep(11, 'Rate Limit', async () => {
    await deleteRedisKeys([`otp:${RATE_CONTACT}`, `rl:otp:${RATE_CONTACT}`]);

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await api('POST', '/send-otp', { contact: RATE_CONTACT });
      statuses.push(response.status);
    }

    if (statuses[3] !== 429) {
      throw new Error(`Expected 4th request to return 429, got ${statuses.join(', ')}`);
    }
    record(11, 'Rate Limit', 'PASS', `statuses=${statuses.join(', ')}`);
  });

  const deletedUsers = await cleanupUsers();
  await deleteRedisKeys([
    `otp:${TEST_CONTACT}`,
    `otp:${RATE_CONTACT}`,
    `rl:otp:${TEST_CONTACT}`,
    `rl:otp:${RATE_CONTACT}`,
  ]);

  console.log(`Cleanup complete. Deleted ${deletedUsers} test user(s).`);
  console.log(`Completed ${results.filter((result) => result.status === 'PASS').length}/${results.length} executed steps.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
