// Gets the extensions EDGEkit ships (extensions.json) and unpacks them into
// build/extensions/<publisher.name>; those marked "builtIn": true also go into the app.
//
//   node tools/bundle.mjs                   the pinned "version" of each EDGE extension, from Open VSX (K3)
//   node tools/bundle.mjs --local           build each sibling repo with its own script instead, for
//                                           testing unreleased extension work (also "localExtensions": true
//                                           in local.json)
//   node tools/bundle.mjs --local --no-build  unpack the VSIX files the sibling repos already have
//
// Open VSX is where the built-in extensions update from afterwards, so a release ships exactly those
// files (design, "Bundled extensions"). Third-party extensions that are not there ("from": "source") are
// built from their source at a pinned commit. A VSIX is a zip: its extension/ folder is the extension.
// Built-in ones go into the app through upstream's builtInExtensions list (below). Run before brand.mjs.
import { execFileSync, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { checkout, root } from './checkout.mjs';

const localFile = join(root, 'local.json');
const localMode = process.argv.includes('--local') || (existsSync(localFile) && JSON.parse(readFileSync(localFile, 'utf8')).localExtensions === true);
const build = !process.argv.includes('--no-build');
const out = join(root, 'build', 'extensions');
const downloads = join(root, 'build', 'downloads');
const sources = join(root, 'build', 'src');
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));
const gallery = JSON.parse(readFileSync(join(root, 'product', 'product.json'), 'utf8')).extensionsGallery.serviceUrl;
const OPEN_VSX = 'https://open-vsx.org/api';
const TARGET = 'win32-x64';

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

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

// The pinned version from Open VSX: the Windows x64 build where the extension has one, else the
// universal one. Checked against Open VSX's SHA-256, and kept in build/downloads.
async function fromOpenVsx(id, version) {
  const [namespace, name] = id.split('.');
  for (const target of [TARGET, 'universal']) {
    const file = join(downloads, `${id}-${version}-${target}.vsix`);
    const res = await fetch(`${OPEN_VSX}/${namespace}/${name}/${target}/${version}`);
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`Open VSX: HTTP ${res.status} for ${id} ${version} (${target})`);
    const { files } = await res.json();
    const expected = (await (await fetch(files.sha256)).text()).trim().split(/\s+/)[0].toLowerCase();
    if (!existsSync(file) || sha256(file) !== expected) {
      mkdirSync(downloads, { recursive: true });
      const vsix = await fetch(files.download);
      if (!vsix.ok) throw new Error(`Open VSX: HTTP ${vsix.status} downloading ${id} ${version}`);
      writeFileSync(file, Buffer.from(await vsix.arrayBuffer()));
      if (sha256(file) !== expected) throw new Error(`Open VSX: ${id} ${version} does not match its SHA-256.`);
    }
    return file;
  }
  throw new Error(`${id} ${version} is not on Open VSX (for ${TARGET} or universal). Check its "version" in extensions.json.`);
}

// A third-party extension built from its source at a pinned commit, in build/src.
function fromSource(e) {
  const dir = join(sources, e.id);
  if (!existsSync(join(dir, '.git'))) {
    mkdirSync(sources, { recursive: true });
    execFileSync('git', ['clone', '--quiet', e.repo, dir], { stdio: 'inherit' });
  }
  execFileSync('git', ['-C', dir, 'fetch', '--quiet', 'origin'], { stdio: 'inherit' });
  execFileSync('git', ['-C', dir, 'checkout', '--quiet', '--force', e.commit], { stdio: 'inherit' });
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.vsix'))) rmSync(join(dir, f));
  execSync(e.install ?? 'npm ci --no-audit --no-fund', { cwd: dir, stdio: 'inherit' });
  execSync(e.build, { cwd: dir, stdio: 'inherit' });
  const vsix = readdirSync(dir).find((f) => f.endsWith('.vsix'));
  if (!vsix) throw new Error(`${e.id}: "${e.build}" made no VSIX in ${dir}.`);
  return join(dir, vsix);
}

// Windows' own tar (bsdtar) reads zips; a GNU tar earlier on PATH (Git Bash) does not, and takes "E:" for a host.
const TAR = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';

// Built-in extensions ("builtIn": true) go into the app through upstream's own list, product.json's
// builtInExtensions: each VSIX is copied into the checkout's .build/edgekit with its checksum and, for
// those on Open VSX, their Open VSX identity (__metadata, which lets them update from there). brand.mjs
// adds them to the list.
const builtInDir = join(checkout, '.build', 'edgekit');
const builtIns = [];
async function openVsxMetadata(id) {
  const res = await fetch(`${gallery}/extensionquery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json;api-version=3.0-preview.1' },
    body: JSON.stringify({ filters: [{ criteria: [{ filterType: 7, value: id }] }], flags: 1 }),
  });
  const found = (await res.json()).results?.[0]?.extensions?.[0];
  if (!found) throw new Error(`${id} is not on Open VSX; a built-in EDGE extension must be, to update from there.`);
  const { publisherId, publisherName, displayName } = found.publisher;
  return { id: found.extensionId, publisherId: { publisherId, publisherName, displayName, flags: '' }, publisherDisplayName: displayName };
}

// One built-in extension's part of the notices file: its license and any third-party notices it ships.
const notices = [];
function noticeFor(e, dir, version) {
  const files = readdirSync(dir);
  const pick = (re) => files.filter((f) => re.test(f)).map((f) => readFileSync(join(dir, f), 'utf8').trim());
  const license = pick(/^licen[sc]e(\.(md|txt))?$/i);
  const thirdParty = pick(/^third[-_ ]?party[-_ ]?notices(\.(md|txt))?$/i);
  if (!license.length) throw new Error(`${e.id} ${version} ships no LICENSE file; add its license to the notices by hand.`);
  return [
    '='.repeat(80),
    `${e.id} ${version}`,
    `Source: ${e.from === 'source' ? `${e.repo} at ${e.commit}` : `${`https://github.com/Edgemodders/${basename(e.repo)}`}, from Open VSX`}`,
    '='.repeat(80),
    '',
    ...license,
    ...thirdParty.flatMap((t) => ['', '-'.repeat(80), 'Third-party notices', '-'.repeat(80), '', t]),
    '',
  ].join('\n');
}

mkdirSync(out, { recursive: true });
// Clear what is no longer listed (an extension renamed or dropped), so nothing stale ships.
for (const name of readdirSync(out)) {
  if (!extensions.some((e) => e.id === name)) {
    rmSync(join(out, name), { recursive: true, force: true });
    console.log(`clear ${name}: no longer in extensions.json`);
  }
}
if (existsSync(builtInDir)) for (const f of readdirSync(builtInDir).filter((f) => f.endsWith('.vsix'))) rmSync(join(builtInDir, f));
console.log(localMode ? 'EDGE extensions from the sibling repos (local mode).' : 'EDGE extensions from Open VSX, at the versions pinned in extensions.json.');

let failed = 0;
for (const e of extensions) {
  let vsix;
  try {
    if (e.from === 'source') {
      if (!e.commit) { console.log(`skip  ${e.id}: ${e.status}`); continue; }
      console.log(`build ${e.id}: ${e.repo} at ${e.commit.slice(0, 7)}`);
      vsix = fromSource(e);
    } else if (localMode) {
      if (!e.vsix) { console.log(`skip  ${e.id}: ${e.status}`); continue; }
      const repo = resolve(root, e.repo);
      if (!existsSync(repo)) throw new Error(`no repo at ${repo}`);
      if (build && e.build) {
        console.log(`build ${e.id}: ${e.build} in ${repo}`);
        execSync(e.build, { cwd: repo, stdio: 'inherit' });
      }
      vsix = newest(repo, e.vsix);
      if (!vsix) throw new Error(`no ${e.vsix} in ${repo}`);
    } else {
      if (!e.version) { console.log(`skip  ${e.id}: ${e.status}`); continue; }
      vsix = await fromOpenVsx(e.id, e.version);
    }
  } catch (error) {
    console.log(`FAIL  ${e.id}: ${error.message}`);
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
  const { version } = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'));
  console.log(`ok    ${e.id} ${version}: ${basename(vsix)}`);
  if (e.builtIn) {
    mkdirSync(builtInDir, { recursive: true });
    const name = `${e.id}-${version}.vsix`;
    copyFileSync(vsix, join(builtInDir, name));
    builtIns.push({
      name: e.id,
      version,
      repo: e.from === 'source' ? e.repo : `https://github.com/Edgemodders/${basename(e.repo)}`,
      vsix: `.build/edgekit/${name}`,
      sha256: sha256(vsix),
      ...(e.from === 'source' ? {} : { metadata: await openVsxMetadata(e.id) }),
    });
    console.log(`      built in`);
    try {
      notices.push(noticeFor(e, dest, version));
    } catch (error) {
      console.log(`FAIL  ${e.id}: ${error.message}`);
      failed += 1;
    }
  }
}
if (existsSync(checkout)) {
  mkdirSync(builtInDir, { recursive: true });
  writeFileSync(join(builtInDir, 'builtInExtensions.json'), `${JSON.stringify(builtIns, null, 2)}\n`);
  // The built-in extensions' licenses, in the app beside upstream's (its packaging ships licenses/**).
  mkdirSync(join(checkout, 'licenses'), { recursive: true });
  writeFileSync(join(checkout, 'licenses', 'EDGEkit-extensions.txt'),
    `The extensions built into EDGEkit, with their licenses and notices. Each also carries them in its own folder.\n\n${notices.join('\n')}`);
}
process.exit(failed ? 1 : 0);
