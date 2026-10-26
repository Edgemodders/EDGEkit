// The file for EDGEkit's Nexus Mods page: build/release/EDGEkit-<version>.zip, holding
// EDGEkitSetup-<version>.exe (which tools/release.mjs puts in build/release) and a README.txt on
// installing. Nexus checks every upload as an archive, so the installer goes in a zip. The release
// workflow uploads it with tools/nexus/nexus.mjs release (nexus/README.md).
//   node tools/nexus-zip.mjs

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'version.json'), 'utf8'));
const out = join(root, 'build', 'release');
const exe = `EDGEkitSetup-${version}.exe`;
const zip = join(out, `EDGEkit-${version}.zip`);
if (!existsSync(join(out, exe))) {
  console.error(`No ${exe} in ${out}: tools/release.mjs makes it`);
  process.exit(1);
}

const stage = join(out, 'nexus-stage');
rmSync(stage, { recursive: true, force: true });
rmSync(zip, { force: true });
mkdirSync(stage, { recursive: true });
copyFileSync(join(out, exe), join(stage, exe));
writeFileSync(join(stage, 'README.txt'), [
  `EDGEkit ${version}: the Edgemodders editor for Cyberpunk 2077 modding, for Windows x64.`,
  '',
  `Install: run ${exe}. It installs for the current user, beside any VS Code without touching it.`,
  'It is not signed yet, so Windows SmartScreen may warn: choose More info, then Run anyway.',
  '',
  'Update: an installed EDGEkit finds new releases itself and offers to restart into them.',
  '',
  'Not a game mod: do not install it with Vortex or EDGEdeck.',
  'Docs: https://edgemodders.github.io/EDGEkit/',
  'Changelog: https://github.com/Edgemodders/EDGEkit/blob/main/CHANGELOG.md',
  '',
].join('\r\n'));

// Windows' own tar writes the zip (-a picks the format from the name), as EDGEchat's and EDGEmat's do. By its
// full path: from Git Bash, "tar" is GNU tar, which reads "E:" in a path as a remote host.
const tar = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const r = spawnSync(tar, ['-a', '-c', '-f', zip, '-C', stage, exe, 'README.txt'], { stdio: 'inherit' });
rmSync(stage, { recursive: true, force: true });
if (r.status !== 0) {
  console.error('tar could not write the zip');
  process.exit(1);
}
console.log(`Wrote ${zip}`);
