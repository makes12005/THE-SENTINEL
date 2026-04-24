import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load env
const envText = readFileSync('apps/backend/.env.production', 'utf-8');
const env = dotenv.parse(envText);

if (!env.REDIS_URL) {
  console.error('REDIS_URL not found in .env.production');
  process.exit(1);
}

const client = new Redis(env.REDIS_URL);

try {
  console.log('Connecting to Redis...');
  const keys = await client.keys('otp:*');
  console.log('OTP keys in Redis:', keys);

  if (keys.length > 0) {
    for (const key of keys) {
      const val = await client.get(key);
      console.log(`${key} → ${val}`);
    }
  } else {
    console.log('No OTP keys found in Redis');
  }
} catch (error) {
  console.error('Error checking Redis:', error);
} finally {
  await client.quit();
  console.log('Disconnected from Redis');
}