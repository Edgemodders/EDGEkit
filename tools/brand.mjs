// Merges EDGEkit's branding (product/product.json) into Code - OSS's product.json.
//
//   node tools/brand.mjs [path to upstream product.json]
//
// The default is product.json in the Code - OSS checkout: "vscode" in local.json, else build/vscode.
//
// Objects merge key by key; anything else in ours replaces upstream's. Keys that start
// with "//" are notes and are left out. Upstream's original is kept beside it as
// product.upstream.json, so branding again always starts from upstream. It then copies EDGEkit's
// icons (product/win32, product/workbench) over upstream's.
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { checkout, root } from './checkout.mjs';

const target = resolve(process.argv[2] ?? join(checkout, 'product.json'));
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

// Built-in extensions in a stable build never update from the gallery, unless listed here;
// listed ones update from Open VSX like any installed extension. The EDGE extensions are
// listed, from extensions.json. Third-party ones are not: Redscript IDE ships with its own
// language server, which a gallery update would not carry.
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));
ours.builtInExtensionsEnabledWithAutoUpdates = extensions.filter((e) => e.from === 'sibling').map((e) => e.id);

// The EDGE extensions built into the app (bundle.mjs writes the list), after upstream's own.
const builtInFile = join(dirname(target), '.build', 'edgekit', 'builtInExtensions.json');
const builtIns = existsSync(builtInFile) ? JSON.parse(readFileSync(builtInFile, 'utf8')) : [];
ours.builtInExtensions = [...(upstream.builtInExtensions ?? []), ...builtIns];

const branded = merge(upstream, ours);
writeFileSync(target, `${JSON.stringify(branded, null, '\t')}\n`);

const changed = Object.keys(ours).filter((k) => !k.startsWith('//'));
const unknown = changed.filter((k) => !(k in upstream));
console.log(`Branded ${target}: ${changed.length} keys.`);
if (unknown.length) console.log(`Not in upstream's product.json (check they are still read): ${unknown.join(', ')}`);

// EDGEkit's icons and installer images (tools/brand/icons.ps1 renders them) over upstream's.
// Each one replaces a file upstream has, so a name upstream drops is caught here.
const images = [
  [join(root, 'product', 'win32'), join(dirname(target), 'resources', 'win32')],
  [join(root, 'product', 'workbench'), join(dirname(target), 'src', 'vs', 'workbench', 'browser', 'media')],
];
let copied = 0;
for (const [from, to] of images) {
  for (const name of readdirSync(from)) {
    if (!existsSync(join(to, name))) throw new Error(`Upstream has no ${name} in ${to} to replace. Check tools/brand/icons.ps1.`);
    copyFileSync(join(from, name), join(to, name));
    copied++;
  }
}
console.log(`Copied ${copied} icons and images over upstream's.`);
