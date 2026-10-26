// The changelog for EDGEkit's Nexus Mods page: the section of CHANGELOG.md for version.json's version,
// as plain lines (Nexus's changelog field takes no markdown; links become "text (url)"). The release
// workflow passes it to tools/nexus/nexus.mjs release (nexus/README.md).
//   node tools/nexus-notes.mjs [--out <file>]

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

const plain = (text) => text
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
  .replace(/\*\*([^*]+?)\.?\*\*\s*/g, (m, heading, offset) => (offset === 0 ? `${heading}: ` : heading + ' '))
  .replace(/`([^`]+)`/g, '$1')
  .trim();
const result = [];
for (const line of lines.slice(start + 1, end)) {
  if (!line.trim() || /^\|[\s|:-]*\|$/.test(line)) continue; // blank, or a table's separator row
  if (line.startsWith('|')) {
    const cells = line.split('|').slice(1, -1).map((c) => plain(c));
    if (cells.every((c) => c === '' || /^(Extension|Version|What it does)$/.test(c))) continue; // a header row
    result.push(cells.filter(Boolean).join(', '));
  } else {
    result.push(plain(line.replace(/^- /, '')));
  }
}
const text = result.join('\n') + '\n';
const out = process.argv.indexOf('--out');
if (out >= 0) writeFileSync(process.argv[out + 1], text);
else process.stdout.write(text);
