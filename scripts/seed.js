#!/usr/bin/env node
/**
 * seed.js — populates Supabase categories + questions tables from src/data/.
 *
 * Usage:
 *   1. Make sure migration 0001_initial.sql has been applied
 *      (Supabase Dashboard → SQL Editor → paste & run, OR `supabase db push`)
 *   2. Set env vars in .env.local:
 *        VITE_SUPABASE_URL=https://<project-ref>.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=<your service-role key, NOT the anon key>
 *   3. Run:  node scripts/seed.js
 *
 * Idempotent: uses upsert on (slug) for categories. Questions are deleted
 * and re-inserted per category to keep the table in sync with src/data/questions.js.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

// Load .env.local manually (we don't want to add a dotenv dep just for this)
function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(projectRoot, '.env.local'), 'utf8');
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
    // file missing — fall back to existing env vars
  }
}

loadDotEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('   The service-role key is in Dashboard → Settings → API.');
  console.error('   It is the secret one — NEVER commit it.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Dynamic import the data files (they use ESM)
const { CATEGORIES } = await import(resolve(projectRoot, 'src/data/categories.js'));

// Read questions module via raw read since it has no Node-friendly entry —
// importing dynamically also works because the file is pure ESM
const questionsModule = await import(resolve(projectRoot, 'src/data/questions.js'));
// REAL_QUESTIONS isn't exported; we recompute from getQuestion() — but that
// would only return the first question per cell. We want to seed the real pool.
// So let's re-read the file and parse via a small trick: questions.js exports
// `getQuestion` only. For seeding, we read REAL_QUESTIONS by re-importing the
// file (it's ESM; we can also just inline the data here). To keep this script
// self-contained, we re-derive by calling getQuestion(category, value) for
// each (category, 200/400/600). That gives us 90 rows (30 cats × 3 tiers).
const { getQuestion } = questionsModule;

console.log(`🌱 Seeding ${CATEGORIES.length} categories...`);

// 1. Upsert categories
const categoryRows = CATEGORIES.map((c, i) => ({
  slug: c.slug,
  name_ar: c.ar,
  name_en: c.en,
  icon_name: c.icon,
  accent_color: c.accent,
  is_featured_for_guests: ['kuwait-history', 'sports', 'science', 'culture', 'food', 'music'].includes(c.slug),
  display_order: i,
}));

const { data: insertedCategories, error: catError } = await supabase
  .from('categories')
  .upsert(categoryRows, { onConflict: 'slug' })
  .select();

if (catError) {
  console.error('❌ Failed to upsert categories:', catError);
  process.exit(1);
}

console.log(`  ✓ ${insertedCategories.length} categories upserted`);

// 2. Build a slug → id map
const slugToId = new Map(insertedCategories.map((c) => [c.slug, c.id]));

// 3. For each category × difficulty (200/400/600), seed one question
console.log(`📚 Seeding questions (${CATEGORIES.length} categories × 3 tiers = ${CATEGORIES.length * 3} rows)...`);

const questionRows = [];
for (const cat of CATEGORIES) {
  for (const value of [200, 400, 600]) {
    const q = getQuestion(cat, value);
    questionRows.push({
      category_id: slugToId.get(cat.slug),
      difficulty: value,
      question_ar: q.ar,
      question_en: q.en,
      answer_ar: q.answerAr,
      answer_en: q.answerEn,
      hint_ar: q.hintAr ?? null,
      hint_en: q.hintEn ?? null,
    });
  }
}

// Wipe existing questions for these categories then re-insert
// (keeps the table in sync with src/data/questions.js)
const { error: deleteError } = await supabase
  .from('questions')
  .delete()
  .in('category_id', [...slugToId.values()]);

if (deleteError) {
  console.error('❌ Failed to clear existing questions:', deleteError);
  process.exit(1);
}

const { error: questionError, count } = await supabase
  .from('questions')
  .insert(questionRows, { count: 'exact' });

if (questionError) {
  console.error('❌ Failed to insert questions:', questionError);
  process.exit(1);
}

console.log(`  ✓ ${count ?? questionRows.length} questions inserted`);
console.log('✅ Seed complete.');
