// Service-role Supabase client for seed scripts. Calls loadDotEnv() itself so
// callers never have to remember the two-step dance. Throws when env vars are
// missing so callers can decide whether to exit, log, or recover — never
// short-circuits the process from inside a "get" function.
import { createClient } from '@supabase/supabase-js';
import { loadDotEnv } from './env.js';

export function getSupabaseAdmin() {
  loadDotEnv();
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local. ' +
      'The service-role key is in Dashboard → Settings → API. ' +
      'It is the secret one — NEVER commit it.'
    );
  }

  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
