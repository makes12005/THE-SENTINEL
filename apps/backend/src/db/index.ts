import { loadEnv } from '../lib/load-env';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

loadEnv();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/busalert';

export const sql = postgres(connectionString, { max: 10 });
export const db = drizzle(sql, { schema });
