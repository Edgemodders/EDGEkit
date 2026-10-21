// Publishes an EDGEkit release from the last local build (until K4's release workflow): a GitHub
// release with the installer, then the update manifest that tells installed EDGEkits about it
// (design, "Updates"). Releases are rare: only when the editor changes (design, "When EDGEkit releases").
//
//   node tools/release.mjs --dry   check everything and print what it would do
//   node tools/release.mjs         make the release v<version> (with gh) and write the manifest
//
// Before it: raise version.json, add the version's section to CHANGELOG.md, commit, push, then
// build (tools/build.ps1). After it: commit and push docs/update/. That switches the update on for
// every installed EDGEkit; until then the release is only a download. Steps: dev-setup, "Releasing".
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { checkout, root } from './checkout.mjs';

const REPO = 'Edgemodders/EDGEkit';
const PLATFORM = 'win32-x64-user';
const dry = process.argv.includes('--dry');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();
const json = (...p) => JSON.parse(readFileSync(join(...p), 'utf8'));
const problems = [];

const { version } = json(root, 'version.json');
const tag = `v${version}`;
const exe = join(checkout, '.build', 'win32-x64', 'user-setup', 'EDGEkitSetup.exe');
const app = join(dirname(checkout), 'VSCode-win32-x64', 'resources', 'app');
if (!existsSync(exe)) throw new Error(`No installer at ${exe}. Run tools/build.ps1 first.`);

// The build is this commit at this version, pushed, and nothing is left uncommitted.
const head = run('git', ['rev-parse', 'HEAD']);
const built = { version: json(app, 'package.json').version, commit: json(app, 'product.json').commit };
if (built.version !== version) problems.push(`The build is version ${built.version}, version.json says ${version}. Build again.`);
if (built.commit !== head) problems.push(`The build is from commit ${built.commit?.slice(0, 7)}, this repo is at ${head.slice(0, 7)}. Build again.`);
if (statSync(exe).mtimeMs < statSync(join(app, 'package.json')).mtimeMs) problems.push('The installer is older than the app. Build again.');
if (run('git', ['status', '--porcelain'])) problems.push('This repo has uncommitted changes. Commit them, then build again.');
try {
  if (run('git', ['rev-parse', '@{u}']) !== head) problems.push('This commit is not pushed. Push it.');
} catch {
  problems.push('This branch has no upstream to push to.');
}

// A new version, newer than the one the manifest names now, with its notes.
const manifestPath = join(root, 'docs', 'update', `latest-${PLATFORM}.json`);
const current = existsSync(manifestPath) ? json(manifestPath).productVersion : undefined;
const newer = (a, b) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};
if (current && !newer(version, current)) problems.push(`The manifest already names ${current}; ${version} is not newer. Raise version.json.`);
const taken = JSON.parse(run('gh', ['release', 'list', '--repo', REPO, '--limit', '200', '--json', 'tagName'])).map((r) => r.tagName);
if (taken.includes(tag)) problems.push(`The release ${tag} exists already.`);
const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
const section = changelog.split(/^## /m).find((s) => s.startsWith(`${version}\n`));
if (!section) problems.push(`CHANGELOG.md has no "## ${version}" section.`);

if (problems.length) {
  console.error(`Not ready to release ${tag}:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  if (!dry) process.exit(1);
}

// The installer under its versioned name, the notes, and the manifest that points at it.
const asset = `EDGEkitSetup-${version}.exe`;
const out = join(root, 'build', 'release');
mkdirSync(out, { recursive: true });
const sha256 = createHash('sha256').update(readFileSync(exe)).digest('hex');
const { tag: upstream } = json(root, 'upstream.json');
const notes = `${(section ?? `${version}\n\n(notes to write)`).slice(version.length).trim()}

| | |
|---|---|
| Built on | Code - OSS ${upstream}, Windows x64, EDGEkit \`${head.slice(0, 7)}\` |
| SHA-256 | \`${sha256}\` |

**Install:** download \`${asset}\` and run it. It installs for the current user, beside any VS Code without touching it. It is not signed yet, so Windows SmartScreen warns: choose **More info**, then **Run anyway**. **Update:** an installed EDGEkit finds this release itself and offers to restart into it.
`;
const manifest = {
  url: `https://github.com/${REPO}/releases/download/${tag}/${asset}`,
  version,
  productVersion: version,
  sha256hash: sha256,
  timestamp: Date.now(),
};
const notesFile = join(out, `notes-${version}.md`);
writeFileSync(notesFile, notes);
const args = ['release', 'create', tag, join(out, asset), '--repo', REPO, '--target', head, '--title', `EDGEkit ${version}`, '--notes-file', notesFile, '--latest'];

if (dry) {
  console.log(`${notes}\nManifest (${manifestPath}):\n${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Would copy the installer to ${asset} and run: gh ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
} else {
  copyFileSync(exe, join(out, asset));
  console.log(`Releasing ${tag}...`);
  execFileSync('gh', args, { cwd: root, stdio: 'inherit' });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Released ${tag}. Wrote ${manifestPath}: commit and push it to offer the update to installed EDGEkits.`);
}
