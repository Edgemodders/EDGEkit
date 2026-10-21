// Checks the last build before it ships (design, "Release pipeline"): the app is EDGEkit at
// version.json's version, built from this commit, with every built-in extension at the version
// extensions.json pins, its notices, no Copilot, and the installer beside it.
//
//   node tools/check-build.mjs
//
// The release workflow runs it after the build; it works the same on a PC after tools/build.ps1.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appResources, checkout, root } from './checkout.mjs';

const json = (...p) => JSON.parse(readFileSync(join(...p), 'utf8'));
const app = appResources();
const problems = [];
const check = (ok, problem) => { if (!ok) problems.push(problem); };

const product = json(app, 'product.json');
const { version } = json(root, 'version.json');
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
check(product.nameShort === 'EDGEkit', `The app is "${product.nameShort}", not EDGEkit.`);
check(json(app, 'package.json').version === version, `The app is version ${json(app, 'package.json').version}, version.json says ${version}.`);
check(product.commit === head, `The app is from commit ${product.commit?.slice(0, 7)}, this repo is at ${head.slice(0, 7)}.`);

const { extensions } = json(root, 'extensions.json');
for (const e of extensions.filter((x) => x.builtIn && x.version)) {
  const manifest = join(app, 'extensions', e.id, 'package.json');
  if (!existsSync(manifest)) { problems.push(`${e.id} is not in the app.`); continue; }
  const have = json(manifest).version;
  check(have === e.version, `${e.id} is ${have} in the app; extensions.json pins ${e.version}.`);
  if (have === e.version) console.log(`ok    ${e.id} ${have}`);
}
check(existsSync(join(app, 'ThirdPartyNotices-EDGEkit.txt')), 'ThirdPartyNotices-EDGEkit.txt is not in the app.');
check(!existsSync(join(app, 'extensions', 'copilot')), 'Copilot is in the app.');
check(existsSync(join(checkout, '.build', 'win32-x64', 'user-setup', 'EDGEkitSetup.exe')), 'There is no EDGEkitSetup.exe.');

if (problems.length) {
  console.error(`The build is not ready to ship:\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`EDGEkit ${version} (${head.slice(0, 7)}): the build holds what extensions.json pins.`);
