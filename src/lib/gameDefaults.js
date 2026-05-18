// Game-wide configuration values that need to be referenced from both the
// React app and the seed scripts (which can't import from screen-local
// modules). Lives in `lib/` so scripts/seed.js can dynamic-import it.

// Board geometry. The board is CATEGORIES_PER_GAME columns wide and (per the
// reducer's ROW_VALUES) 6 rows tall. Changing this number alone would require
// also adjusting ROW_VALUES, the user-facing "/ 6" labels, and the
// grid-cols-6 Tailwind classes — it's centralized so that future updates have
// a single starting point to chase from.
export const CATEGORIES_PER_GAME = 6;

// The curated guest-mode set: 6 slugs shown on the Setup screen for
// un-authenticated visitors AND flagged with `is_featured_for_guests = true`
// in Supabase via the seed script.
export const GUEST_PRESET = [
  'kuwait-history',
  'sports',
  'science',
  'culture',
  'food',
  'music',
];
