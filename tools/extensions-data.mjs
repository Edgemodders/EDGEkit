// Gathers what tools/extensions-status.mjs and tools/watch.mjs report. Read-only.
//
// For every extension in extensions.json: its version and needed editor (engines.vscode) in its
// Edgemodders repo, and its version on each registry. And every extension in the Edgemodders
// organization that extensions.json lacks. Repo data needs the GitHub CLI (gh), signed in or
// with GH_TOKEN set; without it, only the registries are checked.
import { execFileSync } from 'node:child_process';
import { marketplace, openVsx } from './registries.mjs';

export const ORG = 'Edgemodders';

function gh(path) {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GH_PROMPT_DISABLED: '1' } }));
}

// Every VS Code extension manifest in the organization's repos: lower-case id -> details.
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
      // Not an extension, or a pack (EDGEkit's own, which lists the others).
      if (!p.engines?.vscode || !p.publisher || p.extensionPack) continue;
      const id = `${p.publisher}.${p.name}`;
      found.set(id.toLowerCase(), { id, repo, path, name: p.name, displayName: p.displayName ?? p.name, version: p.version, engines: p.engines.vscode });
    }
  }
  return found;
}

const orError = (p) => p.catch((err) => `error: ${err.message}`);
const registries = async (id) => {
  const [mp, ovsx] = await Promise.all([orError(marketplace(id)), orError(openVsx(id))]);
  return { marketplace: mp, openvsx: ovsx };
};

// { rows, missing, orgChecked }: rows follow extensions.json; missing is null when gh was not usable.
export async function collect(extensions) {
  let org = null;
  try {
    org = orgExtensions();
  } catch {
    // gh missing or not signed in
  }
  const rows = await Promise.all(extensions.map(async (e) => {
    const inRepo = org?.get(e.id.toLowerCase());
    return { id: e.id, status: e.status, repo: inRepo?.version ?? null, engines: inRepo?.engines ?? null, ...(await registries(e.id)) };
  }));
  let missing = null;
  if (org) {
    const listed = new Set(extensions.map((e) => e.id.toLowerCase()));
    missing = await Promise.all([...org.entries()].filter(([id]) => !listed.has(id)).map(async ([, x]) => ({ ...x, ...(await registries(x.id)) })));
  }
  return { rows, missing, orgChecked: !!org };
}

// The lowest editor version an engines.vscode range accepts, as [major, minor, patch], or null.
export function minEditor(range) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(range ?? '');
  return m ? m.slice(1).map(Number) : null;
}

export function versionLess(a, b) {
  for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}
