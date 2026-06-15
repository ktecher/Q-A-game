#!/usr/bin/env node
/**
 * add-questions.js — additive question importer.
 *
 * Reads rows from content/questions-additional.csv and INSERTs them into
 * public.questions. Never deletes anything; never touches questions that are
 * already in the database; never touches `seen_questions` (so the per-user
 * no-repeat history survives a content top-up).
 *
 * Contrast with scripts/seed.js — that one wipes-then-reinserts, which would
 * cascade-delete every user's seen-question history. This script is the safe
 * top-up alternative for adding bilingual questions over time.
 *
 * CSV columns (must match the canonical content/questions-with-images.csv):
 *   id              — IGNORED (Postgres auto-assigns gen_random_uuid()).
 *   category_slug   — required, must match an existing categories.slug.
 *   category_en     — IGNORED (human reference only; not stored).
 *   difficulty      — required, must be 200, 400, or 600.
 *   question_ar     — required, Arabic question text.
 *   question_en     — required, English question text.
 *   answer_ar       — required, Arabic answer text.
 *   answer_en       — required, English answer text.
 *   image_url       — optional, Cloudinary URL (blank = no image).
 *
 * Idempotency: before inserting, the script fetches every existing
 * (category, question_en) pair and skips rows whose question_en already
 * exists for that category. Safe to re-run on the same CSV.
 *
 * Usage:
 *   node scripts/add-questions.js              # dry-run — prints the plan
 *   node scripts/add-questions.js --apply      # actually inserts
 *
 *   .env.local must contain VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT } from './_lib/env.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

const APPLY = process.argv.includes('--apply');
const supabase = getSupabaseAdmin();

// ── CSV parser ────────────────────────────────────────────────────────
// Same shape as the one in seed.js, with one addition: strip a trailing
// \r so Excel-on-Windows CRLF files parse cleanly.
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
  return out.map((c) => c.replace(/\r$/, ''));
}

function parseCSV(raw) {
  // Strip a UTF-8 BOM if Excel added one.
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = parseRow(lines[0]);
  return lines.slice(1).map((line, i) => {
    const cells = parseRow(line);
    const obj = { __row: i + 2 }; // 1-based, +1 for header
    header.forEach((h, j) => { obj[h] = (cells[j] ?? '').trim(); });
    return obj;
  });
}

// ── Load CSV ──────────────────────────────────────────────────────────
const csvPath = resolve(PROJECT_ROOT, 'content/questions-additional.csv');
const rawCsv = readFileSync(csvPath, 'utf8');
const csvRows = parseCSV(rawCsv);

if (csvRows.length === 0) {
  console.log('📭  content/questions-additional.csv has no data rows yet.');
  console.log('    Add bilingual question rows to that file, then re-run.');
  process.exit(0);
}

console.log(`📚 Loaded ${csvRows.length} candidate row(s) from ${csvPath}`);

// ── Load existing categories ──────────────────────────────────────────
const { data: catRows, error: catError } = await supabase
  .from('categories')
  .select('id, slug, kind');

if (catError) {
  console.error('❌ Failed to fetch categories:', catError);
  process.exit(1);
}

const slugToId = new Map(catRows.map((c) => [c.slug, c.id]));
const walaKalmaSlugs = new Set(catRows.filter((c) => c.kind === 'wala-kalma').map((c) => c.slug));

// ── Validate every row before touching the DB ─────────────────────────
const ALLOWED_DIFFICULTIES = new Set([200, 400, 600]);
const REQUIRED_FIELDS = ['category_slug', 'difficulty', 'question_ar', 'question_en', 'answer_ar', 'answer_en'];

const valid = [];
const errors = [];

for (const r of csvRows) {
  const missing = REQUIRED_FIELDS.filter((f) => !r[f]);
  if (missing.length) {
    errors.push(`row ${r.__row}: missing required field(s): ${missing.join(', ')}`);
    continue;
  }
  if (!slugToId.has(r.category_slug)) {
    errors.push(`row ${r.__row}: unknown category_slug "${r.category_slug}"`);
    continue;
  }
  if (walaKalmaSlugs.has(r.category_slug)) {
    errors.push(`row ${r.__row}: category "${r.category_slug}" is a Wala Kalma category — use content/wala-kalma-titles.csv, not this file`);
    continue;
  }
  const diff = parseInt(r.difficulty, 10);
  if (!ALLOWED_DIFFICULTIES.has(diff)) {
    errors.push(`row ${r.__row}: difficulty "${r.difficulty}" must be 200, 400, or 600`);
    continue;
  }
  valid.push({
    __row: r.__row,
    category_slug: r.category_slug,
    category_id: slugToId.get(r.category_slug),
    difficulty: diff,
    question_ar: r.question_ar,
    question_en: r.question_en,
    answer_ar: r.answer_ar,
    answer_en: r.answer_en,
    image_url: r.image_url || null,
  });
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} row(s) failed validation:`);
  for (const e of errors) console.error(`   ${e}`);
  console.error('\nFix the CSV and re-run. No rows were inserted.');
  process.exit(1);
}

console.log(`  ✓ ${valid.length} row(s) passed validation`);

// ── Deduplicate against the DB ────────────────────────────────────────
// "Same question" = same (category_id, question_en) pair. Lets the script
// be safely re-run on a CSV that hasn't been cleared yet.
const slugsTouched = [...new Set(valid.map((v) => v.category_slug))];
const idsTouched = slugsTouched.map((s) => slugToId.get(s));

const { data: existing, error: exErr } = await supabase
  .from('questions')
  .select('category_id, question_en')
  .in('category_id', idsTouched);

if (exErr) {
  console.error('❌ Failed to fetch existing questions for dedupe:', exErr);
  process.exit(1);
}

const existingSet = new Set(existing.map((r) => `${r.category_id}|${r.question_en.trim()}`));
const toInsert = [];
const skipped = [];

for (const v of valid) {
  const key = `${v.category_id}|${v.question_en.trim()}`;
  if (existingSet.has(key)) {
    skipped.push(v);
  } else {
    toInsert.push(v);
    existingSet.add(key); // also dedupes within this CSV
  }
}

if (skipped.length) {
  console.log(`  ⚠  ${skipped.length} row(s) already in DB (matched on question_en) — will skip:`);
  for (const s of skipped.slice(0, 10)) {
    console.log(`       row ${s.__row} [${s.category_slug} ${s.difficulty}] ${s.question_en.slice(0, 60)}…`);
  }
  if (skipped.length > 10) console.log(`       … and ${skipped.length - 10} more`);
}

// ── Per-category summary ──────────────────────────────────────────────
const bySlug = new Map();
for (const v of toInsert) {
  const t = bySlug.get(v.category_slug) ?? { 200: 0, 400: 0, 600: 0 };
  t[v.difficulty]++;
  bySlug.set(v.category_slug, t);
}

console.log(`\n📦 Plan: insert ${toInsert.length} new question(s) across ${bySlug.size} category/ies`);
for (const [slug, tiers] of [...bySlug.entries()].sort()) {
  console.log(`   ${slug.padEnd(20)}  +${tiers[200]}@200  +${tiers[400]}@400  +${tiers[600]}@600`);
}

if (toInsert.length === 0) {
  console.log('\nNothing to insert. Done.');
  process.exit(0);
}

if (!APPLY) {
  console.log('\n🔎 DRY RUN — no changes made. Re-run with `--apply` to insert.');
  process.exit(0);
}

// ── Apply ─────────────────────────────────────────────────────────────
console.log('\n⬆️  Inserting…');
const insertRows = toInsert.map((v) => ({
  category_id: v.category_id,
  difficulty: v.difficulty,
  question_ar: v.question_ar,
  question_en: v.question_en,
  answer_ar: v.answer_ar,
  answer_en: v.answer_en,
  image_url: v.image_url,
}));

const { error: insErr, count } = await supabase
  .from('questions')
  .insert(insertRows, { count: 'exact' });

if (insErr) {
  console.error('❌ Insert failed:', insErr);
  process.exit(1);
}

console.log(`  ✓ ${count ?? insertRows.length} question(s) inserted`);
console.log('✅ Done. Existing questions and seen-history were not touched.');
