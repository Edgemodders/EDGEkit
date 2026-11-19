// The changelog for EDGEkit's Nexus Mods page: the short summary in the CHANGELOG.md section for
// version.json's version, then a "Full changelog" line with the GitHub release's link. The release
// workflow passes it to the Nexus tool's release (EDGErepo's tools/nexus/nexus.mjs; nexus/README.md).
//   node tools/nexus-notes.mjs [--out <file>]
//
// Nexus shows each line of a version's changelog as one entry, as plain text in a small field, and
// cannot edit it once posted, so the Nexus tool takes only a short summary (EDGErepo's README, "Nexus
// changelogs"): one change a line, each starting with New:, Changed:, Fixed:, Removed:, Other: or
// Needs:, at most 120 characters, no markdown. It is written by hand under the version's heading in
// an HTML comment, which GitHub and the docs site hide, as REDnode does:
//
//   ## 1.143.1
//
//   <!-- nexus
//   New: EDGEfab 0.1.0 built in, the asset maker
//   -->
//
// This script prints those lines and the link; it stops when the section has none. The Nexus tool
// checks the rules before it uploads anything.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'version.json'), 'utf8'));
const lines = readFileSync(join(root, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n').split('\n');
const start = lines.indexOf(`## ${version}`);
if (start < 0) {
  console.error(`CHANGELOG.md has no "## ${version}" section`);
  process.exit(1);
}
let end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
if (end < 0) end = lines.length;
const section = lines.slice(start + 1, end);

const open = section.findIndex((line) => line.trim() === '<!-- nexus');
const close = open < 0 ? -1 : section.findIndex((line, i) => i > open && line.trim() === '-->');
if (open < 0 || close < 0) {
  console.error(`CHANGELOG.md's "## ${version}" section has no Nexus summary: add a "<!-- nexus" comment under its heading, one short line a change, closed by "-->" (see this script's header).`);
  process.exit(1);
}
const summary = section.slice(open + 1, close).map((line) => line.trim()).filter(Boolean);
if (summary.length === 0) {
  console.error(`CHANGELOG.md's "## ${version}" Nexus summary is empty.`);
  process.exit(1);
}
summary.push(`Full changelog: https://github.com/Edgemodders/EDGEkit/releases/tag/v${version}`);

const text = summary.join('\n') + '\n';
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], text);
else process.stdout.write(text);
