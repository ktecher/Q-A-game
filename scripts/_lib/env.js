// Shared dotenv loader for the seed/upload scripts. Three scripts previously
// reimplemented this byte-for-byte. Reads .env.local from the project root
// and copies entries into process.env unless they're already set.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..', '..');

export function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(PROJECT_ROOT, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // .env.local missing — proceed with existing process.env
  }
}
