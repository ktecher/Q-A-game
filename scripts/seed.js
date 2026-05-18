#!/usr/bin/env node
/**
 * seed.js — populates Supabase categories + questions tables from canonical
 * source files:
 *   - src/data/categories.js          → categories (presentation + names)
 *   - content/questions-with-images.csv → questions for all 30 categories
 *
 * The "guess-the-movie" category is seeded by scripts/seed-guess-the-movie.js
 * from content/guess-the-movie.csv and is intentionally NOT touched here.
 *
 * Idempotent: upserts categories on (slug), wipes questions for non-CSV-seeded
 * categories, then re-inserts every CSV row.
 *
 * Usage:
 *   1. Apply migrations 0001_initial.sql + 0002_question_image.sql.
 *   2. .env.local must contain VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   3. node scripts/seed.js
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT } from './_lib/env.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

const projectRoot = PROJECT_ROOT;
const supabase = getSupabaseAdmin();

// Categories whose questions are seeded by a dedicated CSV+script pair. These
// are skipped by the question wipe + insert in this file so they aren't
// clobbered. Add the slug here when introducing a new image-heavy category.
const CSV_SEEDED_SLUGS = new Set(['guess-the-movie']);

// Minimal CSV parser respecting quoted fields and doubled-quote escapes.
function parseRow(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
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

const { CATEGORIES } = await import(resolve(projectRoot, 'src/data/categories.js'));

// 1. Upsert categories from src/data/categories.js
console.log(`🌱 Seeding ${CATEGORIES.length} categories…`);

const { GUEST_PRESET } = await import(resolve(projectRoot, 'src/lib/gameDefaults.js'));
const guestSet = new Set(GUEST_PRESET);

const categoryRows = CATEGORIES.map((c, i) => ({
  slug: c.slug,
  name_ar: c.ar,
  name_en: c.en,
  icon_name: c.icon,
  accent_color: c.accent,
  is_featured_for_guests: guestSet.has(c.slug),
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

const slugToId = new Map(insertedCategories.map((c) => [c.slug, c.id]));

// 2. Load real questions from the canonical CSV
const csvPath = resolve(projectRoot, 'content/questions-with-images.csv');
const csvRows = parseCSV(readFileSync(csvPath, 'utf8'));
console.log(`📚 Loaded ${csvRows.length} questions from ${csvPath}`);

const seededSlugs = new Set(csvRows.map((r) => r.category_slug));
const missing = CATEGORIES
  .map((c) => c.slug)
  .filter((s) => !CSV_SEEDED_SLUGS.has(s) && !seededSlugs.has(s));
if (missing.length) {
  console.warn(`⚠️  ${missing.length} categories have no rows in CSV (will end up empty): ${missing.join(', ')}`);
}

// 3. Wipe existing questions for the categories this script owns (everything
//    except CSV_SEEDED_SLUGS), then re-insert from CSV.
const wipeIds = [...slugToId.entries()]
  .filter(([slug]) => !CSV_SEEDED_SLUGS.has(slug))
  .map(([, id]) => id);

if (wipeIds.length > 0) {
  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .in('category_id', wipeIds);
  if (deleteError) {
    console.error('❌ Failed to clear existing questions:', deleteError);
    process.exit(1);
  }
  console.log(`  ✓ Cleared questions for ${wipeIds.length} categories`);
}

const questionRows = csvRows
  .filter((r) => slugToId.has(r.category_slug))
  .map((r) => ({
    category_id: slugToId.get(r.category_slug),
    difficulty: parseInt(r.difficulty, 10),
    question_ar: r.question_ar,
    question_en: r.question_en,
    answer_ar: r.answer_ar,
    answer_en: r.answer_en,
    image_url: r.image_url || null,
  }));

const { error: questionError, count } = await supabase
  .from('questions')
  .insert(questionRows, { count: 'exact' });

if (questionError) {
  console.error('❌ Failed to insert questions:', questionError);
  process.exit(1);
}

console.log(`  ✓ ${count ?? questionRows.length} questions inserted`);
console.log('✅ Seed complete.');
