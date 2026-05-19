#!/usr/bin/env node
/**
 * seed-wala-kalma-titles.js — seeds the `wala_kalma_titles` table from
 * content/wala-kalma-titles.csv (canonical source).
 *
 * Idempotent: wipes existing rows and re-inserts every CSV row. Safe to run
 * repeatedly. Use this to push new charades titles to the DB or to recover
 * from a corrupted table state.
 *
 * Usage:
 *   1. Ensure the wala_kalma_titles table exists (migration applied).
 *   2. .env.local must contain VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   3. node scripts/seed-wala-kalma-titles.js
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROJECT_ROOT } from './_lib/env.js';
import { getSupabaseAdmin } from './_lib/supabase-admin.js';

const supabase = getSupabaseAdmin();

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

const csvPath = resolve(PROJECT_ROOT, 'content/wala-kalma-titles.csv');
const rows = parseCSV(readFileSync(csvPath, 'utf8'));
console.log(`🎭 Loaded ${rows.length} titles from ${csvPath}`);

if (rows.length === 0) {
  console.error('❌ CSV is empty — nothing to seed.');
  process.exit(1);
}

console.log('🧹 Clearing existing wala_kalma_titles…');
const { error: deleteError } = await supabase
  .from('wala_kalma_titles')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000');
if (deleteError) {
  console.error('❌ Failed to clear:', deleteError);
  process.exit(1);
}

const inserts = rows.map((r) => ({
  category_slug: r.category_slug,
  difficulty: parseInt(r.difficulty, 10),
  title_ar: r.title_ar,
  title_en: r.title_en,
  origin: r.origin || null,
  kind: r.kind || null,
  year: r.year ? parseInt(r.year, 10) : null,
  display_order: parseInt(r.display_order, 10) || 0,
  is_active: true,
}));

const { error: insertError, count } = await supabase
  .from('wala_kalma_titles')
  .insert(inserts, { count: 'exact' });

if (insertError) {
  console.error('❌ Failed to insert:', insertError);
  process.exit(1);
}

console.log(`✅ Seed complete — ${count ?? inserts.length} titles inserted.`);
