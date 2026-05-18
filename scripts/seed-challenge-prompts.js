#!/usr/bin/env node
/**
 * seed-challenge-prompts.js — seeds the `challenge_prompts` table from
 * content/challenge-prompts.csv (canonical source).
 *
 * Idempotent: wipes existing rows and re-inserts every CSV row. Safe to run
 * repeatedly. Use this to push new prompts to the DB or to recover from a
 * corrupted table state.
 *
 * Usage:
 *   1. Ensure the challenge_prompts table exists (migration applied).
 *   2. .env.local must contain VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *   3. node scripts/seed-challenge-prompts.js
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

const csvPath = resolve(PROJECT_ROOT, 'content/challenge-prompts.csv');
const rows = parseCSV(readFileSync(csvPath, 'utf8'));
console.log(`📚 Loaded ${rows.length} prompts from ${csvPath}`);

if (rows.length === 0) {
  console.error('❌ CSV is empty — nothing to seed.');
  process.exit(1);
}

// Wipe existing rows
console.log('🧹 Clearing existing challenge prompts…');
const { error: deleteError } = await supabase
  .from('challenge_prompts')
  .delete()
  .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
if (deleteError) {
  console.error('❌ Failed to clear:', deleteError);
  process.exit(1);
}

// Insert from CSV
const inserts = rows.map((r) => ({
  prompt_ar: r.prompt_ar,
  prompt_en: r.prompt_en,
  display_order: parseInt(r.display_order, 10) || 0,
  is_active: true,
}));

const { error: insertError, count } = await supabase
  .from('challenge_prompts')
  .insert(inserts, { count: 'exact' });

if (insertError) {
  console.error('❌ Failed to insert:', insertError);
  process.exit(1);
}

console.log(`✅ Seed complete — ${count ?? inserts.length} prompts inserted.`);
