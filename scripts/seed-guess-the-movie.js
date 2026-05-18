#!/usr/bin/env node
/**
 * seed-guess-the-movie.js — seeds the "guess-the-movie" category and its 30
 * image questions from content/guess-the-movie.csv into Supabase.
 *
 * Idempotent: upserts the category, deletes existing questions for it, then
 * inserts all 30 from the CSV. Safe to run repeatedly.
 *
 * Order vs. scripts/seed.js: seed.js now skips this slug (see CSV_SEEDED_SLUGS
 * there), so the two scripts no longer step on each other. Run order doesn't
 * matter.
 *
 * Usage:
 *   1. Ensure migrations 0001_initial + 0002_question_image are applied.
 *   2. .env.local must contain VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   3. node scripts/seed-guess-the-movie.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function loadDotEnv() {
  try {
    const raw = readFileSync(resolve(projectRoot, '.env.local'), 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq < 1) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    // .env.local missing — fall back to existing process.env
  }
}
loadDotEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Minimal CSV parser that respects quoted fields. Sufficient for our
// well-formed file (no embedded newlines, only commas + quotes to escape).
function parseRow(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Doubled "" inside a quoted field is an escaped quote
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCSV(raw) {
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  const header = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseRow(line);
    const obj = {};
    header.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
    return obj;
  });
}

const csvPath = resolve(projectRoot, 'content/guess-the-movie.csv');
const rows = parseCSV(readFileSync(csvPath, 'utf8'));
console.log(`📚 Loaded ${rows.length} rows from ${csvPath}`);

if (rows.length === 0) {
  console.error('❌ CSV is empty — nothing to seed.');
  process.exit(1);
}

// Sanity check: every row must belong to the expected slug.
const expectedSlug = 'guess-the-movie';
const wrong = rows.filter((r) => r.category_slug !== expectedSlug);
if (wrong.length) {
  console.error(`❌ ${wrong.length} rows have a category_slug other than "${expectedSlug}"`);
  process.exit(1);
}

// 1. Upsert the category row. We mirror the presentation in src/data/categories.js
//    (display_order chosen to append after the existing 30 built-ins).
console.log(`🎬 Upserting category "${expectedSlug}"...`);
const { data: cat, error: catErr } = await supabase
  .from('categories')
  .upsert(
    {
      slug: expectedSlug,
      name_ar: 'خمن الفيلم',
      name_en: 'Guess the Movie',
      icon_name: 'Film',
      accent_color: '#6E1F28',
      is_featured_for_guests: false,
      display_order: 30,
    },
    { onConflict: 'slug' }
  )
  .select()
  .single();

if (catErr) {
  console.error('❌ Failed to upsert category:', catErr);
  process.exit(1);
}
const categoryId = cat.id;
console.log(`  ✓ Category id = ${categoryId}`);

// 2. Wipe existing questions for this category — keeps the seed idempotent.
console.log(`🧹 Clearing existing questions for ${expectedSlug}...`);
const { error: delErr } = await supabase
  .from('questions')
  .delete()
  .eq('category_id', categoryId);
if (delErr) {
  console.error('❌ Failed to clear questions:', delErr);
  process.exit(1);
}

// 3. Insert all CSV rows.
console.log(`📥 Inserting ${rows.length} questions...`);
const inserts = rows.map((r) => ({
  category_id: categoryId,
  difficulty: parseInt(r.difficulty, 10),
  question_ar: r.question_ar,
  question_en: r.question_en,
  answer_ar: r.answer_ar,
  answer_en: r.answer_en,
  image_url: r.image_url || null,
}));

const { error: insErr, count } = await supabase
  .from('questions')
  .insert(inserts, { count: 'exact' });

if (insErr) {
  console.error('❌ Failed to insert questions:', insErr);
  process.exit(1);
}

console.log(`✅ Seed complete — ${count ?? inserts.length} questions inserted.`);
