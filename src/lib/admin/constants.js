// Shared constants for the /dashboard admin area.
import { ICON_MAP } from '../../data/categories';

// The dashboard login accepts this single username and maps it to the real
// Supabase auth account. The password is never stored in code — only
// Supabase holds it (hashed). Security is enforced by RLS, not by this name.
export const ADMIN_USERNAME = 'admin';
export const ADMIN_EMAIL = 'admin@ummalhayman.com';

// Question / Wala Kalma difficulty tiers (DB CHECK constraint: 200/400/600).
export const DIFFICULTIES = [200, 400, 600];

// The three charades categories. Wala Kalma titles reference their category
// by this text slug (not a foreign key), so the editor constrains it to
// these values to avoid orphaned rows.
export const WALA_KALMA_SLUGS = [
  'wala-kalma-english',
  'wala-kalma-arabic',
  'wala-kalma-gulf',
];

// Valid lucide icon names a category may use (keys of the game's ICON_MAP).
export const ICON_NAMES = Object.keys(ICON_MAP);
