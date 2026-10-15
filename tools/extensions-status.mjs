// Tracks the EDGE extensions: which ones exist, and where each is published.
//
//   node tools/extensions-status.mjs
//
// For every extension in extensions.json it prints the version on the Microsoft Marketplace
// and on Open VSX. With the GitHub CLI (gh) signed in, it also finds the version in each
// Edgemodders repo, and lists any extension in the organization that extensions.json lacks.
// Read-only: it never publishes or changes anything.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marketplace, openVsx } from './registries.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));
const ORG = 'Edgemodders';
const orError = (p) => p.catch((err) => `error: ${err.message}`);

function gh(path) {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GH_PROMPT_DISABLED: '1' } }));
}

// Every VS Code extension manifest in the organization's repos: id -> { repo, path, version }.
function orgExtensions() {
  const found = new Map();
  for (const { name: repo } of gh(`orgs/${ORG}/repos?per_page=100`)) {
    let tree;
    try {
      tree = gh(`repos/${ORG}/${repo}/git/trees/HEAD?recursive=1`).tree;
    } catch {
      continue; // an empty repo has no tree
    }
    for (const { path } of tree) {
      if (!path.endsWith('package.json') || path.includes('node_modules')) continue;
      const p = JSON.parse(Buffer.from(gh(`repos/${ORG}/${repo}/contents/${path}`).content, 'base64').toString('utf8'));
      if (p.engines?.vscode && p.publisher) found.set(`${p.publisher}.${p.name}`.toLowerCase(), { repo, path, version: p.version });
    }
  }
  return found;
}

let org = null;
try {
  org = orgExtensions();
} catch {
  console.log(`(gh is missing or not signed in: repo versions and new ${ORG} extensions are not checked)\n`);
}

const rows = [['Extension', 'Repo', 'Marketplace', 'Open VSX', 'Status']];
for (const e of extensions) {
  const [mp, ovsx] = await Promise.all([orError(marketplace(e.id)), orError(openVsx(e.id))]);
  const inRepo = org?.get(e.id.toLowerCase());
  rows.push([e.id, inRepo?.version ?? '-', mp ?? 'no', ovsx ?? 'no', e.status]);
}
const width = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
for (const r of rows) console.log(r.map((c, i) => (i === r.length - 1 ? c : String(c).padEnd(width[i]))).join('  '));

if (org) {
  const listed = new Set(extensions.map((e) => e.id.toLowerCase()));
  const missing = [...org].filter(([id]) => !listed.has(id));
  console.log(missing.length ? `\nIn ${ORG} but not in extensions.json:` : `\nEvery ${ORG} extension is in extensions.json.`);
  for (const [id, { repo, path, version }] of missing) console.log(`  ${id} ${version}  (${repo}/${path})`);
}
