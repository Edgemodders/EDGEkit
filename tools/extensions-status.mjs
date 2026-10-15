// Tracks the EDGE extensions: which ones exist, and where each is published.
//
//   node tools/extensions-status.mjs
//
// For every extension in extensions.json it prints the version in its Edgemodders repo, on the
// Microsoft Marketplace and on Open VSX, and lists any extension in the organization that
// extensions.json lacks (repo data needs the GitHub CLI, gh, signed in).
// Read-only: it never publishes or changes anything. tools/watch.mjs acts on the same data.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORG, collect } from './extensions-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));
const { rows, missing, orgChecked } = await collect(extensions);

if (!orgChecked) console.log(`(gh is missing or not signed in: repo versions and new ${ORG} extensions are not checked)\n`);
const table = [['Extension', 'Repo', 'Marketplace', 'Open VSX', 'Status']];
for (const r of rows) table.push([r.id, r.repo ?? '-', r.marketplace ?? 'no', r.openvsx ?? 'no', r.status]);
const width = table[0].map((_, i) => Math.max(...table.map((r) => String(r[i]).length)));
for (const r of table) console.log(r.map((c, i) => (i === r.length - 1 ? c : String(c).padEnd(width[i]))).join('  '));

if (missing) {
  console.log(missing.length ? `\nIn ${ORG} but not in extensions.json:` : `\nEvery ${ORG} extension is in extensions.json.`);
  for (const m of missing) console.log(`  ${m.id} ${m.version}  (${m.repo}/${m.path})  Marketplace ${m.marketplace ?? 'no'}, Open VSX ${m.openvsx ?? 'no'}`);
}
