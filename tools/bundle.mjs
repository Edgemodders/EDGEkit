// Builds the extensions EDGEkit ships (extensions.json) and unpacks them into
// build/extensions/<publisher.name>, ready to become built-in extensions.
//
//   node tools/bundle.mjs            build each sibling extension with its own script, then unpack
//   node tools/bundle.mjs --no-build unpack the VSIX files the sibling repos already have
//
// A VSIX is a zip: its extension/ folder is the extension. Those marked "builtIn": true also
// go into the app, through upstream's builtInExtensions list (below). Run before brand.mjs.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { checkout, root } from './checkout.mjs';

const build = !process.argv.includes('--no-build');
const out = join(root, 'build', 'extensions');
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));

// The newest file matching a pattern such as dist/redcode-cyberpunk-*.vsix, by version.
function newest(repo, pattern) {
  const dir = join(repo, dirname(pattern));
  if (!existsSync(dir)) return null;
  const [before, after] = basename(pattern).split('*');
  const version = (f) => f.slice(before.length, f.length - after.length).split('.').map(Number);
  // The * must be a version, so redcode-*.vsix does not also take redcode-core-0.5.0.vsix (a pattern prefix can be another name's start).
  const files = readdirSync(dir).filter((f) => f.startsWith(before) && f.endsWith(after)
    && /^\d+(\.\d+)*$/.test(f.slice(before.length, f.length - after.length)));
  files.sort((a, b) => {
    const x = version(a);
    const y = version(b);
    for (let i = 0; i < Math.max(x.length, y.length); i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
    return 0;
  });
  return files.length ? join(dir, files.at(-1)) : null;
}

// Windows' own tar (bsdtar) reads zips; a GNU tar earlier on PATH (Git Bash) does not, and takes "E:" for a host.
const TAR = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';

// Built-in extensions ("builtIn": true) go into the app through upstream's own list, product.json's
// builtInExtensions: each VSIX is copied into the checkout's .build/edgekit with its checksum and
// its Open VSX identity (__metadata, which lets it update from Open VSX). brand.mjs adds them to the list.
const builtInDir = join(checkout, '.build', 'edgekit');
const builtIns = [];
const gallery = JSON.parse(readFileSync(join(root, 'product', 'product.json'), 'utf8')).extensionsGallery.serviceUrl;
async function openVsxMetadata(id) {
  const res = await fetch(`${gallery}/extensionquery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json;api-version=3.0-preview.1' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: id }] }], flags: 1 }),
  });
  const found = (await res.json()).results?.[0]?.extensions?.[0];
  if (!found) throw new Error(`${id} is not on Open VSX; a built-in extension must be, to update from there.`);
  const { publisherId, publisherName, displayName } = found.publisher;
  return { id: found.extensionId, publisherId: { publisherId, publisherName, displayName, flags: '' }, publisherDisplayName: displayName };
}

mkdirSync(out, { recursive: true });
// Clear what is no longer listed (an extension renamed or dropped), so nothing stale ships.
for (const name of readdirSync(out)) {
  if (!extensions.some((e) => e.id === name)) {
    rmSync(join(out, name), { recursive: true, force: true });
    console.log(`clear ${name}: no longer in extensions.json`);
  }
}
let failed = 0;
for (const e of extensions) {
  if (e.from !== 'sibling' || !e.vsix) {
    console.log(`skip  ${e.id}: ${e.status}`);
    continue;
  }
  const repo = resolve(root, e.repo);
  if (!existsSync(repo)) {
    console.log(`FAIL  ${e.id}: no repo at ${repo}`);
    failed += 1;
    continue;
  }
  if (build && e.build) {
    console.log(`build ${e.id}: ${e.build} in ${repo}`);
    execSync(e.build, { cwd: repo, stdio: 'inherit' });
  }
  const vsix = newest(repo, e.vsix);
  if (!vsix) {
    console.log(`FAIL  ${e.id}: no ${e.vsix} in ${repo}`);
    failed += 1;
    continue;
  }
  const dest = join(out, e.id);
  const tmp = `${dest}.unpack`;
  rmSync(dest, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  execSync(`"${TAR}" -xf "${vsix}" -C "${tmp}"`);
  renameSync(join(tmp, 'extension'), dest);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`ok    ${e.id}: ${basename(vsix)} -> build/extensions/${e.id}`);
  if (e.builtIn) {
    mkdirSync(builtInDir, { recursive: true });
    copyFileSync(vsix, join(builtInDir, basename(vsix)));
    const { version } = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'));
    builtIns.push({
      name: e.id,
      version,
      repo: `https://github.com/Edgemodders/${basename(repo)}`,
      vsix: `.build/edgekit/${basename(vsix)}`,
      sha256: createHash('sha256').update(readFileSync(vsix)).digest('hex'),
      metadata: await openVsxMetadata(e.id),
    });
    console.log(`      built in: ${e.id} ${version}`);
  }
}
if (existsSync(checkout)) {
  mkdirSync(builtInDir, { recursive: true });
  writeFileSync(join(builtInDir, 'builtInExtensions.json'), `${JSON.stringify(builtIns, null, 2)}\n`);
}
process.exit(failed ? 1 : 0);
