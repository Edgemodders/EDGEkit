// Shares the last local build of EDGEkit as a draft GitHub release, for testing on another PC.
// A draft is seen only by the repo's collaborators and makes no tag until it is published;
// delete it when testing is done. Full releases are K4's (design, "Release pipeline").
//
//   node tools/dev-release.mjs          make the draft and upload EDGEkitSetup.exe (with gh)
//   node tools/dev-release.mjs --dry    only print the notes and what it would do
//
// It names the draft after the installer's build date (edgekit-dev-2026-10-18, then -2, -3 the
// same day) and writes the notes from the build: this repo's commit, the Code - OSS release and
// the installer's SHA-256.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkout, root } from './checkout.mjs';

const dry = process.argv.includes('--dry');
const exe = join(checkout, '.build', 'win32-x64', 'user-setup', 'EDGEkitSetup.exe');
if (!existsSync(exe)) throw new Error(`No installer at ${exe}. Run tools/build.ps1 first.`);

const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }).trim();
const commit = run('git', ['rev-parse', '--short', 'HEAD']);
if (run('git', ['status', '--porcelain'])) console.warn('Note: this repo has uncommitted changes; the notes name the last commit.');
const { tag: upstream } = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'));

const built = statSync(exe).mtime;
const day = `${built.getFullYear()}-${String(built.getMonth() + 1).padStart(2, '0')}-${String(built.getDate()).padStart(2, '0')}`;
const sha256 = createHash('sha256').update(readFileSync(exe)).digest('hex');
const mb = Math.round(statSync(exe).size / 1024 / 1024);

const taken = new Set(JSON.parse(run('gh', ['release', 'list', '--limit', '100', '--json', 'tagName'])).map((r) => r.tagName));
let tag = `edgekit-dev-${day}`;
for (let n = 2; taken.has(tag); n++) tag = `edgekit-dev-${day}-${n}`;

const notes = `A test build of EDGEkit for the team, not a release. It stays a draft and is deleted when testing is done.

| | |
|---|---|
| Built | ${day}, EDGEkit \`${commit}\`, Code - OSS ${upstream}, Windows x64 |
| What is in it | The phases done at that commit: [docs/index.md](https://github.com/Edgemodders/EDGEkit/blob/${commit}/docs/index.md) |
| Not yet | Code signing and updates (K4) |
| SHA-256 | \`${sha256}\` |

To install: download \`EDGEkitSetup.exe\` (${mb} MB) and run it. It installs for the current user, beside any VS Code without touching it. It is not signed, so Windows SmartScreen warns: choose **More info**, then **Run anyway**.
`;

const notesFile = join(root, 'build', 'dev-release-notes.md');
mkdirSync(join(root, 'build'), { recursive: true });
writeFileSync(notesFile, notes);
const args = ['release', 'create', tag, exe, '--draft', '--prerelease', '--target', 'main', '--title', `EDGEkit dev build ${tag.slice('edgekit-dev-'.length)}`, '--notes-file', notesFile];

if (dry) {
  console.log(notes);
  console.log(`Would run: gh ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
} else {
  console.log(`Uploading ${mb} MB as the draft ${tag}...`);
  execFileSync('gh', args, { cwd: root, stdio: 'inherit' });
  console.log('Done. Delete the draft on GitHub when testing is done.');
}
