// Builds the EDGEkit extension pack (edgemodders.edgekit) for VS Code and VSCodium users.
//
//   node tools/pack.mjs              one VSIX per registry in build/pack/
//   node tools/pack.mjs --list       only show which extensions each registry's pack lists
//
// A pack installs its members from the registry it was installed from, and a member that
// is not there may stop the whole install. So each registry gets its own pack, listing
// only the extensions in extensions.json that are published on it (an entry with
// "pack": false is never listed). Same version, same files, different extensionPack list.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRIES } from './registries.mjs';

const VSCE = '@vscode/vsce@4.0.0';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const listOnly = process.argv.includes('--list');
const pack = JSON.parse(readFileSync(join(root, 'pack', 'package.json'), 'utf8'));
const { extensions } = JSON.parse(readFileSync(join(root, 'extensions.json'), 'utf8'));
const candidates = extensions.filter((e) => e.pack !== false).map((e) => e.id);
const out = join(root, 'build', 'pack');

for (const [registry, latest] of Object.entries(REGISTRIES)) {
  // A failed lookup stops the build: a pack with a wrong list is worse than no pack.
  const versions = await Promise.all(candidates.map((id) => latest(id)));
  const members = candidates.filter((_, i) => versions[i]);
  console.log(`${registry}: ${members.join(', ') || '(none)'}`);
  if (listOnly) continue;
  if (!members.length) throw new Error(`No EDGE extension is published on ${registry}.`);

  const stage = join(out, registry);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  writeFileSync(join(stage, 'package.json'), `${JSON.stringify({ ...pack, extensionPack: members }, null, 2)}\n`);
  for (const f of ['README.md', 'CHANGELOG.md']) copyFileSync(join(root, 'pack', f), join(stage, f));
  copyFileSync(join(root, 'LICENSE'), join(stage, 'LICENSE'));
  copyFileSync(join(root, 'docs', 'assets', 'brand', 'icon.png'), join(stage, 'icon.png'));

  const vsix = join(out, `${pack.name}-${pack.version}-${registry}.vsix`);
  execSync(`npx --yes ${VSCE} package --no-dependencies --out "${vsix}"`, { cwd: stage, stdio: 'inherit' });
}
