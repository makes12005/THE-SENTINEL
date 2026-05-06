import { db, sql as psql } from './src/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const sqlPath = path.join(process.cwd(), 'src/db/migrations/0003_silent_marvel_apes.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Applying migration...');
  
  // Drizzle doesn't have a direct 'execute multiple statements' for raw SQL easily with postgres-js
  // without potentially running into issues with semicolons in strings.
  // But we can try to execute the whole thing at once if postgres-js supports it.
  try {
    await psql.unsafe(sqlContent);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    // If it fails because of multiple statements, we'll split it.
    console.log('Retrying with statement splitting...');
    const statements = sqlContent.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const s of statements) {
      try {
        await psql.unsafe(s);
      } catch (innerErr) {
        console.error('Statement failed:', s.substring(0, 50), innerErr);
      }
    }
  }
  
  process.exit(0);
}

main();
