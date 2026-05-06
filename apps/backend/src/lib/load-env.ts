import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

let loaded = false;

function uniqueExistingFiles(files: string[]): string[] {
  const seen = new Set<string>();
  const resolved: string[] = [];

  for (const file of files) {
    const absolute = path.resolve(file);
    if (seen.has(absolute) || !fs.existsSync(absolute)) continue;
    seen.add(absolute);
    resolved.push(absolute);
  }

  return resolved;
}

export function loadEnv(): void {
  if (loaded) return;

  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
  const isProduction = nodeEnv === 'production';

  const baseDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  const candidates: string[] = [];
  for (const dir of baseDirs) {
    if (isProduction) {
      candidates.push(
        path.join(dir, '.env.production'),
        path.join(dir, '.env'),
        path.join(dir, '.env.local'),
        path.join(dir, 'apps', 'backend', '.env.production'),
        path.join(dir, 'apps', 'backend', '.env'),
        path.join(dir, 'apps', 'backend', '.env.local')
      );
    } else {
      candidates.push(
        path.join(dir, '.env.development'),
        path.join(dir, '.env.local'),
        path.join(dir, '.env'),
        path.join(dir, 'apps', 'backend', '.env.development'),
        path.join(dir, 'apps', 'backend', '.env.local'),
        path.join(dir, 'apps', 'backend', '.env')
      );
    }
  }

  for (const file of uniqueExistingFiles(candidates)) {
    dotenv.config({ path: file, override: true });
  }

  loaded = true;
}
