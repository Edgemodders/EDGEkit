// Builds the extensions EDGEkit ships (extensions.json) and unpacks them into
// build/extensions/<publisher.name>, ready to become built-in extensions.
//
//   node tools/bundle.mjs            build each sibling extension with its own script, then unpack
//   node tools/bundle.mjs --no-build unpack the VSIX files the sibling repos already have
//
// A VSIX is a zip: its extension/ folder is the extension.
// How Code - OSS takes prebuilt extensions as built-ins is a K3 question; this step
// only prepares them.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = !process.argv.includes('--no-build');
const out = join(root, 'build', 'extensions');
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));

// The newest file matching a pattern such as dist/redcode-core-*.vsix, by version.
function newest(repo, pattern) {
  const dir = join(repo, dirname(pattern));
  if (!existsSync(dir)) return null;
  const [before, after] = basename(pattern).split('*');
  const version = (f) => f.slice(before.length, f.length - after.length).split('.').map(Number);
  const files = readdirSync(dir).filter((f) => f.startsWith(before) && f.endsWith(after));
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

mkdirSync(out, { recursive: true });
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
}
process.exit(failed ? 1 : 0);
