/**
 * Bulk-import recipes into Supabase + mirror their images into Supabase Storage.
 *
 * Usage (from repo root, needs Node 18+ and src/node_modules installed):
 *   node scripts/upload-recipes.mjs [path/to/recipes.json]
 *
 * Default JSON: debug/recipes_final_v2.json
 *
 * What it does:
 *   1. Reads Supabase URL + anon key from src/.env.local
 *   2. Downloads each unique image_url and uploads it to the public
 *      `recipe-images` storage bucket (deduped by URL hash)
 *   3. Upserts every recipe into the `recipes` table, rewriting image_url to the
 *      Storage public URL (so the app no longer depends on the original host)
 *
 * Requires the `recipes` table + `recipe-images` bucket to exist
 * (migration: create_recipes_table_and_storage).
 */
import { createClient } from '../src/node_modules/@supabase/supabase-js/dist/main/index.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = process.argv[2] || path.join(root, 'debug/recipes_final_v2.json');

const envText = fs.readFileSync(path.join(root, 'src/.env.local'), 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL || !KEY) { console.error('Missing Supabase env in src/.env.local'); process.exit(1); }

const supabase = createClient(URL, KEY, { auth: { persistSession: false } });
const BUCKET = 'recipe-images';

const recipes = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
console.log(`Loaded ${recipes.length} recipes from ${jsonPath}`);

const uniqueUrls = [...new Set(recipes.map(r => r.image_url).filter(Boolean))];
console.log(`Unique images: ${uniqueUrls.length}`);
const urlToPublic = {};

for (const url of uniqueUrls) {
  const hash = crypto.createHash('md5').update(url).digest('hex').slice(0, 16);
  const objectPath = `${hash}.webp`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ! download ${res.status} ${url}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectPath, buf, {
      contentType: res.headers.get('content-type') || 'image/webp',
      upsert: true,
    });
    if (upErr) { console.warn(`  ! upload ${objectPath}: ${upErr.message}`); continue; }
    urlToPublic[url] = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
    console.log(`  ✓ ${objectPath} (${buf.length} bytes)`);
  } catch (e) {
    console.warn(`  ! ${url}: ${e.message}`);
  }
}

const rows = recipes.map(r => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  image_url: urlToPublic[r.image_url] ?? r.image_url ?? '',
  meal_slots: r.meal_slots ?? [],
  categories: r.categories ?? [],
  allergens: r.allergens ?? [],
  prep_minutes: r.prep_minutes ?? 0,
  difficulty: r.difficulty ?? 'media',
  ingredients: r.ingredients ?? [],
  steps: r.steps ?? [],
  nutrition: r.nutrition ?? {},
  diabetes_notes: r.diabetes_notes ?? '',
  tags: r.tags ?? [],
}));

let inserted = 0;
for (let i = 0; i < rows.length; i += 25) {
  const batch = rows.slice(i, i + 25);
  const { error } = await supabase.from('recipes').upsert(batch, { onConflict: 'id' });
  if (error) console.error(`  ! batch ${i}: ${error.message}`);
  else { inserted += batch.length; console.log(`  ✓ ${inserted}/${rows.length}`); }
}

const { count } = await supabase.from('recipes').select('*', { count: 'exact', head: true });
console.log(`DONE. recipes table has ${count} rows.`);
