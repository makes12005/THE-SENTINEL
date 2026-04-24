import { loadEnv } from './src/lib/load-env';

loadEnv();
console.log('DATABASE_URL:', process.env.DATABASE_URL);
