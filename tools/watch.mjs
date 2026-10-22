// The daily watch over the EDGE extensions (.github/workflows/watch.yml); runs by hand too.
//
//   node tools/watch.mjs             report, and edit files for a pull request when needed
//   node tools/watch.mjs --dry-run   report only
//
// Always writes build/watch/status.md, the body of the status issue. When there is something
// to add, it edits the files the pull request carries:
//   extensions.json     a new Edgemodders extension that is published on a registry
//   pack/members.json   a member newly published on (or gone from) a registry
//   pack/package.json   a new minor version, with its line in pack/CHANGELOG.md
// It never publishes: merging the pull request and releasing the pack (Pack workflow, Make a release) stay the user's.
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORG, collect, minEditor, versionLess } from './extensions-data.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');
const path = (...p) => join(root, ...p);
const read = (...p) => JSON.parse(readFileSync(path(...p), 'utf8'));
const write = (json, ...p) => writeFileSync(path(...p), `${JSON.stringify(json, null, 2)}\n`);
const today = new Date().toISOString().slice(0, 10);

const list = read('extensions.json');
const members = read('pack', 'members.json');
const pack = read('pack', 'package.json');
const editor = minEditor(read('upstream.json').tag);
const { rows, missing, orgChecked } = await collect(list.extensions);

const published = (v) => typeof v === 'string' && !v.startsWith('error');
const failed = (v) => typeof v === 'string' && v.startsWith('error');
const notes = [];

// 1. New Edgemodders extensions: added once published somewhere, reported until then.
const added = (missing ?? []).filter((m) => published(m.marketplace) || published(m.openvsx));
for (const m of added) {
  list.extensions.push({
    id: m.id,
    from: 'sibling',
    repo: `../${m.repo}`,
    build: null,
    vsix: `dist/${m.name}-*.vsix`,
    status: `Added by the watch on ${today} (${m.displayName}, ${m.version}). Fill in "build" and check "vsix"`,
    version: null,
  });
  rows.push({ id: m.id, status: 'new', repo: m.version, engines: m.engines, marketplace: m.marketplace, openvsx: m.openvsx });
}
for (const m of (missing ?? []).filter((x) => !added.includes(x))) notes.push(`In development, not published yet: \`${m.id}\` ${m.version} (${m.repo}).`);

// 2. Extensions that need a newer editor than EDGEkit's pinned upstream.
for (const r of rows) {
  const needs = minEditor(r.engines);
  if (needs && editor && versionLess(editor, needs)) notes.push(`\`${r.id}\` needs editor ${needs.join('.')}; EDGEkit is on ${editor.join('.')}. A newer upstream release is needed before EDGEkit bundles this version.`);
}

// 3. Pack members: every listed extension published on that registry. A failed lookup changes nothing.
const anyFailed = rows.some((r) => failed(r.marketplace) || failed(r.openvsx));
if (anyFailed) notes.push('A registry lookup failed, so pack members were not compared this time.');
const changes = [];
const nextMembers = { ...members };
if (!anyFailed) {
  const candidates = list.extensions.filter((e) => e.pack !== false).map((e) => e.id);
  for (const registry of ['marketplace', 'openvsx']) {
    const live = candidates.filter((id) => published(rows.find((r) => r.id === id)?.[registry]));
    const before = members[registry] ?? [];
    const plus = live.filter((id) => !before.includes(id));
    const minus = before.filter((id) => !live.includes(id));
    if (plus.length || minus.length) nextMembers[registry] = live;
    for (const id of plus) changes.push(`Adds \`${id}\` on ${registry === 'marketplace' ? 'the Marketplace' : 'Open VSX'}.`);
    for (const id of minus) {
      const why = candidates.includes(id) ? 'no longer published there' : 'no longer in `extensions.json` (renamed or dropped)';
      changes.push(`Removes \`${id}\` from ${registry === 'marketplace' ? 'the Marketplace' : 'Open VSX'}: ${why}.`);
    }
  }
}

const changed = added.length > 0 || changes.length > 0;
let version = pack.version;
if (changed && !dryRun) {
  write(list, 'extensions.json');
  if (changes.length) {
    const [major, minor] = pack.version.split('.').map(Number);
    version = `${major}.${minor + 1}.0`;
    write(nextMembers, 'pack', 'members.json');
    write({ ...pack, version }, 'pack', 'package.json');
    const log = readFileSync(path('pack', 'CHANGELOG.md'), 'utf8');
    const entry = `## ${version}\n\n${changes.map((c) => `- ${c}`).join('\n')}\n\n`;
    writeFileSync(path('pack', 'CHANGELOG.md'), log.replace(/^## /m, `${entry}## `));
  }
}

// The status issue.
const cell = (v) => (v == null ? 'no' : String(v));
const md = [
  `Updated by the daily watch on ${today}. Run it by hand with \`node tools/watch.mjs --dry-run\`.`,
  '',
  '| Extension | Repo | Marketplace | Open VSX |',
  '|---|---|---|---|',
  ...rows.map((r) => `| \`${r.id}\` | ${r.repo ?? '-'} | ${cell(r.marketplace)} | ${cell(r.openvsx)} |`),
  '',
  `Pack \`edgemodders.edgekit\` ${pack.version}: Marketplace ${members.marketplace.length} members, Open VSX ${members.openvsx.length}.`,
  '',
  '**Needs attention**',
  '',
  ...(notes.length ? notes.map((n) => `- ${n}`) : ['- Nothing.']),
  ...(orgChecked ? [] : ['', `(The ${ORG} repos could not be read, so new extensions were not looked for.)`]),
  '',
  '**Proposed in a pull request**',
  '',
  ...(changed ? [...added.map((m) => `- Adds \`${m.id}\` to extensions.json.`), ...changes.map((c) => `- Pack ${version}: ${c}`)] : ['- Nothing.']),
].join('\n');
mkdirSync(path('build', 'watch'), { recursive: true });
writeFileSync(path('build', 'watch', 'status.md'), `${md}\n`);
console.log(md);

if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed && !dryRun}\nversion=${version}\n`);
