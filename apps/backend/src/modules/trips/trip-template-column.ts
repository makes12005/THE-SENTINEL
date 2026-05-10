import { sql } from 'drizzle-orm';
import { db } from '../../db';

let hasTemplateColumnPromise: Promise<boolean> | null = null;

async function loadTemplateColumnState() {
  const rows = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'trips'
        AND column_name = 'template_id'
    )::boolean AS exists
  `);

  return Boolean(rows[0]?.exists);
}

export async function hasTripTemplateColumn() {
  if (!hasTemplateColumnPromise) {
    hasTemplateColumnPromise = loadTemplateColumnState().catch((error) => {
      hasTemplateColumnPromise = null;
      throw error;
    });
  }

  return hasTemplateColumnPromise;
}
