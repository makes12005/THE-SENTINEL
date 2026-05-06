const { execSync } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.production') });

try {
  console.log('Running seed-admin.ts with production DATABASE_URL...');
  execSync('npx tsx seed-admin.ts', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit'
  });
} catch (err) {
  console.error('Failed to run seed script:', err.message);
}
