// Zod validation schemas — every dashboard write is validated against one of
// these BEFORE it reaches Supabase, so the admin gets clear field-level errors
// instead of raw Postgres constraint violations. Each schema's output keys
// match the database column names exactly (the parsed object is what we send).
import { z } from 'zod';
import { DIFFICULTIES, WALA_KALMA_SLUGS, ICON_NAMES } from './constants';

const requiredText = (label) =>
  z.string().trim().min(1, `${label} is required`);

// Empty string from a form input → null (so optional columns stay NULL).
const optionalText = z.preprocess(
  (v) => (v === '' || v == null ? null : v),
  z.string().trim().nullable()
);

const optionalUrl = z.preprocess(
  (v) => (v === '' || v == null ? null : String(v).trim()),
  z
    .string()
    .regex(/^https?:\/\/.+/i, 'Must be a URL starting with http:// or https://')
    .nullable()
);

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex colour, e.g. #1A2B3C');

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only');

const difficulty = z
  .coerce.number()
  .refine((n) => DIFFICULTIES.includes(n), 'Difficulty must be 200, 400 or 600');

const order = z.coerce.number().int('Must be a whole number').min(0, 'Cannot be negative');

export const categorySchema = z.object({
  slug,
  name_ar: requiredText('Arabic name'),
  name_en: requiredText('English name'),
  icon_name: z
    .string()
    .refine((v) => ICON_NAMES.includes(v), 'Choose a valid icon'),
  accent_color: hexColor,
  image_url: optionalUrl,
  kind: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.literal('wala-kalma').nullable()
  ),
  is_featured_for_guests: z.boolean(),
  display_order: order,
});

export const questionSchema = z.object({
  category_id: z.string().min(1, 'Pick a category'),
  difficulty,
  question_ar: requiredText('Arabic question'),
  question_en: requiredText('English question'),
  answer_ar: requiredText('Arabic answer'),
  answer_en: requiredText('English answer'),
  hint_ar: optionalText,
  hint_en: optionalText,
  image_url: optionalUrl,
});

export const walaKalmaSchema = z.object({
  category_slug: z
    .string()
    .refine((v) => WALA_KALMA_SLUGS.includes(v), 'Pick a Wala Kalma category'),
  difficulty,
  title_ar: requiredText('Arabic title'),
  title_en: requiredText('English title'),
  origin: optionalText,
  kind: optionalText,
  year: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().int().min(0).max(3000).nullable()
  ),
  is_active: z.boolean(),
  display_order: order,
});

export const challengePromptSchema = z.object({
  prompt_ar: requiredText('Arabic prompt'),
  prompt_en: requiredText('English prompt'),
  is_active: z.boolean(),
  display_order: order,
});

export const drawingWordSchema = z.object({
  word_ar: requiredText('Arabic word'),
  word_en: requiredText('English word'),
  category_ar: requiredText('Arabic category'),
  category_en: requiredText('English category'),
  is_active: z.boolean(),
  display_order: order,
});

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, 'At least 2 characters')
    .max(40, 'At most 40 characters'),
  emoji: optionalText,
  preferred_language: z.enum(['ar', 'en']),
});

export const gameSessionSchema = z.object({
  team1_name: requiredText('Team 1 name'),
  team2_name: requiredText('Team 2 name'),
  team1_score: z.coerce.number().int(),
  team2_score: z.coerce.number().int(),
  winning_team: z.preprocess(
    (v) => (v === '' || v == null ? null : v),
    z.coerce.number().int().refine((n) => n === 1 || n === 2, 'Must be 1 or 2').nullable()
  ),
});

// Turn a Zod error into a flat { field: message } map for form rendering.
export function fieldErrors(zodError) {
  const out = {};
  for (const issue of zodError.issues) {
    const key = issue.path[0];
    if (key != null && out[key] == null) out[key] = issue.message;
  }
  return out;
}
