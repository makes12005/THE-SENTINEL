import { db, sql as psql } from './src/db';

async function main() {
  const res = await psql.unsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `);
  console.log('Tables:', res.map(r => r.table_name));
  process.exit(0);
}

main();
