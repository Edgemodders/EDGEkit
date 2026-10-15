// Builds the EDGEkit extension pack (edgemodders.edgekit) for VS Code and VSCodium users.
//
//   node tools/pack.mjs              one VSIX per registry in build/pack/
//   node tools/pack.mjs --list       show pack/members.json beside what is published now
//
// A pack installs its members from the registry it was installed from, and a member that
// is not there may stop the whole install. So each registry gets its own pack: same version
// and files, but the extensionPack list from pack/members.json for that registry. The build
// checks every member is still published there. tools/watch.mjs keeps members.json current.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRIES } from './registries.mjs';

const VSCE = '@vscode/vsce@4.0.0';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const listOnly = process.argv.includes('--list');
const read = (...p) => JSON.parse(readFileSync(join(root, ...p), 'utf8'));
const pack = read('pack', 'package.json');
const members = read('pack', 'members.json');
const out = join(root, 'build', 'pack');

for (const [registry, latest] of Object.entries(REGISTRIES)) {
  const list = members[registry] ?? [];
  const versions = await Promise.all(list.map((id) => latest(id)));
  console.log(`${registry}: ${list.map((id, i) => `${id} ${versions[i] ?? '(NOT PUBLISHED)'}`).join(', ') || '(none)'}`);
  if (listOnly) continue;
  const absent = list.filter((_, i) => !versions[i]);
  if (absent.length) throw new Error(`Not published on ${registry}: ${absent.join(', ')}. Fix pack/members.json.`);
  if (!list.length) throw new Error(`pack/members.json lists nothing for ${registry}.`);

  const stage = join(out, registry);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  writeFileSync(join(stage, 'package.json'), `${JSON.stringify({ ...pack, extensionPack: list }, null, 2)}\n`);
  for (const f of ['README.md', 'CHANGELOG.md']) copyFileSync(join(root, 'pack', f), join(stage, f));
  copyFileSync(join(root, 'LICENSE'), join(stage, 'LICENSE'));
  copyFileSync(join(root, 'docs', 'assets', 'brand', 'icon.png'), join(stage, 'icon.png'));

  const vsix = join(out, `${pack.name}-${pack.version}-${registry}.vsix`);
  execSync(`npx --yes ${VSCE} package --no-dependencies --out "${vsix}"`, { cwd: stage, stdio: 'inherit' });
}
