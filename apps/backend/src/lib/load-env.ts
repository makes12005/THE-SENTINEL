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

  const baseDirs = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(__dirname, '..', '..'),
    path.resolve(__dirname, '..', '..', '..'),
  ];

  const candidates: string[] = [];
  for (const dir of baseDirs) {
    candidates.push(
      path.join(dir, '.env'),
      path.join(dir, '.env.production'),
      path.join(dir, 'apps', 'backend', '.env'),
      path.join(dir, 'apps', 'backend', '.env.production')
    );
  }

  for (const file of uniqueExistingFiles(candidates)) {
    dotenv.config({ path: file, override: false });
  }

  loaded = true;
}
