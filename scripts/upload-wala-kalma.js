#!/usr/bin/env node
/**
 * upload-wala-kalma.js — uploads the three Wala Kalma category cover images to
 * Cloudinary under the `wala-kalma/` folder, then prints the URL pieces to drop
 * into src/data/categories.js (publicId, version, folder).
 *
 * Usage:
 *   node scripts/upload-wala-kalma.js
 *
 * Requires CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env.local.
 * Uses Node's built-in fetch + crypto + FormData (Node 18+) — no SDK dependency.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { loadDotEnv } from './_lib/env.js';

loadDotEnv();

const CLOUD = process.env.CLOUDINARY_CLOUD_NAME;
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = 'wala-kalma';

if (!CLOUD || !KEY || !SECRET) {
  console.error('❌ Missing Cloudinary creds in .env.local');
  process.exit(1);
}

// Local source file → stable Cloudinary public_id (no spaces, kebab-case).
const ASSETS = [
  { filepath: '/mnt/c/Users/ASUS/Desktop/movie scenes/wala kalma english.jpg', publicId: 'wala-kalma-english' },
  { filepath: '/mnt/c/Users/ASUS/Desktop/movie scenes/wala kalma arabic.png',  publicId: 'wala-kalma-arabic' },
  { filepath: '/mnt/c/Users/ASUS/Desktop/movie scenes/wala kalma gulf.jpg',    publicId: 'wala-kalma-gulf' },
];

// Cloudinary signed-upload signature: SHA1 of "k1=v1&k2=v2...&{secret}" where
// keys are sorted alphabetically and exclude file/api_key/signature itself.
function sign(params) {
  const sorted = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(sorted + SECRET).digest('hex');
}

async function uploadOne({ filepath, publicId }) {
  const filename = basename(filepath);
  const timestamp = Math.floor(Date.now() / 1000);

  // overwrite + invalidate so re-running the script refreshes an existing asset.
  const signedParams = { folder: FOLDER, invalidate: true, overwrite: true, public_id: publicId, timestamp };
  const signature = sign(signedParams);

  const fd = new FormData();
  const buf = readFileSync(filepath);
  fd.set('file', new Blob([buf]), filename);
  fd.set('api_key', KEY);
  fd.set('timestamp', String(timestamp));
  fd.set('signature', signature);
  fd.set('folder', FOLDER);
  fd.set('public_id', publicId);
  fd.set('overwrite', 'true');
  fd.set('invalidate', 'true');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, {
    method: 'POST',
    body: fd,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(`Upload failed for ${filename}: ${JSON.stringify(json)}`);
  }
  return json;
}

console.log(`📤 Uploading ${ASSETS.length} images → cloudinary://${CLOUD}/${FOLDER}/\n`);

for (const asset of ASSETS) {
  try {
    const json = await uploadOne(asset);
    const publicIdWithExt = `${asset.publicId}.${json.format}`;
    console.log(`  ✓ ${asset.publicId}`);
    console.log(`     secure_url: ${json.secure_url}`);
    console.log(`     cloudinaryUrl('${publicIdWithExt}', { version: 'v${json.version}', folder: '${FOLDER}' })\n`);
  } catch (err) {
    console.error(`  ✗ ${asset.publicId}:`, err.message, '\n');
  }
}
