import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — auth will not work. Set them in .env.local.'
  );
}

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] Placeholder Supabase client in use — auth and queries will not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

export const supabase = createClient(url ?? 'http://placeholder.local', anonKey ?? 'placeholder', {
  // Realtime: cap broadcast at 30 msgs/sec/client — headroom for the Pictionary
  // sketch channel (batched strokes ~20/sec plus s/e/u/c control messages).
  // See PICTIONARY_PLAN.md §4.
  realtime: { params: { eventsPerSecond: 30 } },
});
