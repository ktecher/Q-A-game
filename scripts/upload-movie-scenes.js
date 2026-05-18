#!/usr/bin/env node
/**
 * upload-movie-scenes.js — uploads every image in a local folder to Cloudinary
 * under the `guess-the-movie/` folder, then prints a `filename → secure_url` map.
 *
 * Usage:
 *   node scripts/upload-movie-scenes.js "/mnt/c/Users/ASUS/Desktop/movie scenes"
 *
 * Requires CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env.local.
 * Uses Node's built-in fetch + crypto + FormData (Node 18+) — no SDK dependency.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

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

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = 'guess-the-movie';

if (!CLOUD || !KEY || !SECRET) {
  console.error('❌ Missing Cloudinary creds in .env.local');
  process.exit(1);
}

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('❌ Pass the source folder as the first argument.');
  process.exit(1);
}

// Cloudinary signed-upload signature: SHA1 of "k1=v1&k2=v2...&{secret}" where
// keys are sorted alphabetically and exclude file/api_key/signature itself.
function sign(params) {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(sorted + SECRET).digest('hex');
}

async function uploadOne(filepath) {
  const filename = basename(filepath);
  const ext = extname(filename);
  // public_id = filename without extension; Cloudinary appends format on its own
  const publicId = filename.slice(0, filename.length - ext.length);
  const timestamp = Math.floor(Date.now() / 1000);

  const signedParams = { folder: FOLDER, public_id: publicId, timestamp };
  const signature = sign(signedParams);

  const fd = new FormData();
  const buf = readFileSync(filepath);
  fd.set('file', new Blob([buf]), filename);
  fd.set('api_key', KEY);
  fd.set('timestamp', String(timestamp));
  fd.set('signature', signature);
  fd.set('folder', FOLDER);
  fd.set('public_id', publicId);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(`Upload failed for ${filename}: ${JSON.stringify(json)}`);
  }
  return { filename, url: json.secure_url };
}

const files = readdirSync(sourceDir)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

console.log(`📤 Uploading ${files.length} images from ${sourceDir} → cloudinary://${CLOUD}/${FOLDER}/`);

const results = {};
let ok = 0;
let fail = 0;
for (const f of files) {
  try {
    const { filename, url } = await uploadOne(join(sourceDir, f));
    results[filename] = url;
    ok++;
    console.log(`  ✓ ${filename}`);
  } catch (err) {
    fail++;
    console.error(`  ✗ ${f}:`, err.message);
  }
}

const outPath = resolve(projectRoot, 'content/cloudinary-urls.json');
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\n✅ ${ok} uploaded, ${fail} failed. Map written to ${outPath}`);
