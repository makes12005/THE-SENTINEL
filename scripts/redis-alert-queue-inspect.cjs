const fs = require('fs');

function readEnvValue(content, key) {
  const line = content
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.startsWith(`${key}=`));
  if (!line) return '';
  return line.slice(key.length + 1).trim().replace(/^"|"$/g, '');
}

async function parse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const env = fs.readFileSync('apps/backend/.env.production', 'utf8');
  const base = readEnvValue(env, 'UPSTASH_REDIS_REST_URL');
  const token = readEnvValue(env, 'UPSTASH_REDIS_REST_TOKEN');
  const headers = { Authorization: `Bearer ${token}` };

  const jobA = JSON.stringify({
    tripId: 'test-123',
    tripPassengerId: 'test-456',
    passengerPhone: '+919876540001',
    passengerName: 'Test Passenger',
    stopName: 'Nadiad',
  });
  const jobB = JSON.stringify({
    tripId: 'test-789',
    tripPassengerId: 'test-999',
    passengerPhone: '+919876540002',
    passengerName: 'Test Passenger 2',
    stopName: 'Nadiad',
  });

  await parse(await fetch(`${base}/DEL/alert_queue`, { headers }));
  const push = await parse(
    await fetch(`${base}/RPUSH/alert_queue/${encodeURIComponent(jobA)}/${encodeURIComponent(jobB)}`, { headers }),
  );
  const snapshot = await parse(await fetch(`${base}/LRANGE/alert_queue/0/-1`, { headers }));
  const len = await parse(await fetch(`${base}/LLEN/alert_queue`, { headers }));

  console.log(JSON.stringify({ pushed: [jobA, jobB], push, snapshot, len }, null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
