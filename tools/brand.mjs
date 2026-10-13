// Merges EDGEkit's branding (product/product.json) into Code - OSS's product.json.
//
//   node tools/brand.mjs [path to upstream product.json]   default: build/vscode/product.json
//
// Objects merge key by key; anything else in ours replaces upstream's. Keys that start
// with "//" are notes and are left out. Upstream's original is kept beside it as
// product.upstream.json, so branding again always starts from upstream.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] ?? join(root, 'build', 'vscode', 'product.json'));
if (!existsSync(target)) {
  console.error(`No upstream product.json at ${target}. Run tools/fetch-vscode.ps1 first.`);
  process.exit(1);
}
const original = join(dirname(target), 'product.upstream.json');
if (!existsSync(original)) copyFileSync(target, original);

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, ours) {
  const out = { ...base };
  for (const [k, v] of Object.entries(ours)) {
    if (k.startsWith('//')) continue;
    out[k] = isObject(v) && isObject(base[k]) ? merge(base[k], v) : v;
  }
  return out;
}

const upstream = JSON.parse(readFileSync(original, 'utf8'));
const ours = JSON.parse(readFileSync(join(root, 'product', 'product.json'), 'utf8'));
const branded = merge(upstream, ours);
writeFileSync(target, `${JSON.stringify(branded, null, '\t')}\n`);

const changed = Object.keys(ours).filter((k) => !k.startsWith('//'));
const unknown = changed.filter((k) => !(k in upstream));
console.log(`Branded ${target}: ${changed.length} keys.`);
if (unknown.length) console.log(`Not in upstream's product.json (check they are still read): ${unknown.join(', ')}`);
