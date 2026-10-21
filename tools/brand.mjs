// Merges EDGEkit's branding (product/product.json) into Code - OSS's product.json.
//
//   node tools/brand.mjs [path to upstream product.json]
//
// The default is product.json in the Code - OSS checkout: "vscode" in local.json, else build/vscode.
//
// Objects merge key by key; anything else in ours replaces upstream's. Keys that start
// with "//" are notes and are left out. Upstream's original is kept beside it as
// product.upstream.json, so branding again always starts from upstream. It then copies EDGEkit's
// icons (product/win32, product/workbench, product/editor, product/auth) over upstream's, and adds
// its own files (product/welcome, product/onboarding).
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

// Updates (design, "Updates"): local.json may point a dev build at a test server (updateUrl) and give
// it another version (version), to test an update between two local builds.
const localFile = join(root, 'local.json');
const local = existsSync(localFile) ? JSON.parse(readFileSync(localFile, 'utf8')) : {};
if (local.updateUrl) ours.updateUrl = local.updateUrl;

const branded = merge(upstream, ours);
writeFileSync(target, `${JSON.stringify(branded, null, '\t')}\n`);

// EDGEkit's version (version.json) in place of upstream's, in package.json: the build takes the app's
// version, the installer's and the Windows file details from there.
const version = local.version ?? JSON.parse(readFileSync(join(root, 'version.json'), 'utf8')).version;
const packagePath = join(dirname(target), 'package.json');
const packageText = readFileSync(packagePath, 'utf8');
const versionLine = /^(\s+"version": ")[^"]*(")/m; // the first is the package's own
if (!versionLine.test(packageText)) throw new Error(`No "version" line in ${packagePath}. Check tools/brand.mjs.`);
writeFileSync(packagePath, packageText.replace(versionLine, `$1${version}$2`));
console.log(`Version ${version}${local.version ? ' (from local.json)' : ''}; updates from ${branded.updateUrl}.`);

const changed = Object.keys(ours).filter((k) => !k.startsWith('//'));
const unknown = changed.filter((k) => !(k in upstream));
console.log(`Branded ${target}: ${changed.length} keys.`);
if (unknown.length) console.log(`Not in upstream's product.json (check they are still read): ${unknown.join(', ')}`);

// EDGEkit's icons and installer images (tools/brand/icons.ps1 renders them) over upstream's.
// Each one replaces a file upstream has, so a name upstream drops is caught here.
const images = [
  [join(root, 'product', 'win32'), join(dirname(target), 'resources', 'win32')],
  [join(root, 'product', 'workbench'), join(dirname(target), 'src', 'vs', 'workbench', 'browser', 'media')],
  [join(root, 'product', 'editor'), join(dirname(target), 'src', 'vs', 'workbench', 'browser', 'parts', 'editor', 'media')],
];
// Upstream's logos elsewhere, each replaced with one of EDGEkit's: the Agents window's own mark and
// its "open in the editor" button (the VS Code logo), and the sign-in pages the browser opens.
const logo = join(root, 'product', 'workbench', 'code-icon.svg');
const favicon = join(root, 'product', 'auth', 'favicon.ico');
const sessions = join(dirname(target), 'src', 'vs', 'sessions', 'browser', 'media');
const extensionsDir = join(dirname(target), 'extensions');
const reused = [
  [logo, join(sessions, 'vscode-icon.svg')],
  [logo, join(sessions, 'sessions-icon.svg')],
  [logo, join(sessions, 'sessions-logo-dark.svg')],
  [logo, join(sessions, 'sessions-logo-light.svg')],
  [logo, join(extensionsDir, 'github-authentication', 'media', 'code-icon.svg')],
  [favicon, join(extensionsDir, 'github-authentication', 'media', 'favicon.ico')],
  [favicon, join(extensionsDir, 'microsoft-authentication', 'media', 'favicon.ico')],
];
let copied = 0;
for (const [from, to] of images) {
  for (const name of readdirSync(from)) {
    if (!existsSync(join(to, name))) throw new Error(`Upstream has no ${name} in ${to} to replace. Check tools/brand/icons.ps1.`);
    copyFileSync(join(from, name), join(to, name));
    copied++;
  }
}
for (const [from, to] of reused) {
  if (!existsSync(to)) throw new Error(`Upstream has no ${to} to replace. Check tools/brand.mjs.`);
  copyFileSync(from, to);
  copied++;
}
console.log(`Copied ${copied} icons and images over upstream's.`);

// EDGEkit's own files beside upstream's (K2): the Welcome page walkthrough and its images
// (patch-upstream.mjs lists the walkthrough), and the onboarding's REDnode HUD theme card
// (product.json onboardingThemes). Each goes into a folder upstream has.
const welcome = join(root, 'product', 'welcome');
const gettingStarted = join(dirname(target), 'src', 'vs', 'workbench', 'contrib', 'welcomeGettingStarted', 'common');
const added = [
  [join(welcome, 'edgekitWalkthrough.ts'), join(gettingStarted, 'edgekitWalkthrough.ts')],
  ...readdirSync(join(welcome, 'media')).map((name) => [join(welcome, 'media', name), join(gettingStarted, 'media', name)]),
  ...readdirSync(join(root, 'product', 'onboarding')).map((name) => [join(root, 'product', 'onboarding', name), join(dirname(target), 'src', 'vs', 'workbench', 'contrib', 'welcomeOnboarding', 'browser', 'media', name)]),
];
for (const [from, to] of added) {
  if (!existsSync(dirname(to))) throw new Error(`Upstream has no folder ${dirname(to)}. Check tools/brand.mjs.`);
  copyFileSync(from, to);
}
console.log(`Added ${added.length} EDGEkit files (the Welcome walkthrough and the onboarding's theme card).`);
