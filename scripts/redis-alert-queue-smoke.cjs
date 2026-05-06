const fs = require('fs');

function readEnvValue(content, key) {
  const line = content
    .split('\n')
    .map((row) => row.trim())
    .find((row) => row.startsWith(`${key}=`));
  if (!line) return '';
  const value = line.slice(key.length + 1).trim();
  return value.replace(/^"|"$/g, '');
}

async function main() {
  const env = fs.readFileSync('apps/backend/.env.production', 'utf8');
  const base = readEnvValue(env, 'UPSTASH_REDIS_REST_URL');
  const token = readEnvValue(env, 'UPSTASH_REDIS_REST_TOKEN');
  if (!base || !token) {
    throw new Error('Missing Upstash REST credentials in apps/backend/.env.production');
  }

  const headers = { Authorization: `Bearer ${token}` };
  const parse = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  };

  const del = await parse(await fetch(`${base}/DEL/alert_queue`, { headers }));
  const llenAfterDel = await parse(await fetch(`${base}/LLEN/alert_queue`, { headers }));

  const job = JSON.stringify({
    tripId: 'test-123',
    tripPassengerId: 'test-456',
    passengerPhone: '+919876540001',
    passengerName: 'Test Passenger',
    stopName: 'Nadiad',
  });
  const push = await parse(await fetch(`${base}/RPUSH/alert_queue/${encodeURIComponent(job)}`, { headers }));
  const queueSnapshotAfterPush = await parse(await fetch(`${base}/LRANGE/alert_queue/0/-1`, { headers }));
  const llenAfterPush = await parse(await fetch(`${base}/LLEN/alert_queue`, { headers }));

  console.log(JSON.stringify({ del, llenAfterDel, pushedJob: job, push, queueSnapshotAfterPush, llenAfterPush }, null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
