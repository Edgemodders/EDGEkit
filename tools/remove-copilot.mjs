// Takes Copilot out of the Code - OSS checkout, with VSCodium's two patches (MIT) from
// its release built on the same Code - OSS version (upstream.json "vscodium"):
//   52-ext-copilot-remove-it.json   deletes extensions/copilot and Copilot's agent code
//   53-ext-copilot-remove-it.patch  takes it out of the build, package.json and the lockfiles
// They are downloaded, not committed. They change the dependencies, so run this before npm ci.
//
//   node tools/remove-copilot.mjs
//
// VSCodium applies its other patches first; where one of them changes the same lines,
// FIXES below adjusts the patch to plain upstream. Running it again does nothing.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkout, root } from './checkout.mjs';

const { vscodium } = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'));
if (!vscodium) throw new Error('No VSCodium release in upstream.json ("vscodium").');
const base = `https://raw.githubusercontent.com/VSCodium/vscodium/${vscodium}/patches`;

// [file, what VSCodium's patch expects, what plain upstream has]
const FIXES = [
  // VSCodium's earlier patches drop the opts argument of packageTask.
  ['build/gulpfile.vscode.ts',
    ' \t\t\tpackageTask(platform, arch, sourceFolderName, destinationFolderName),\n-\t\t\tprepareCopilotRipgrepShimTask',
    ' \t\t\tpackageTask(platform, arch, sourceFolderName, destinationFolderName, opts),\n-\t\t\tprepareCopilotRipgrepShimTask'],
];

// [file, line] that VSCodium's other patches remove and plain upstream still has after
// 53-ext-copilot-remove-it.patch; they are taken out once it is applied.
const LINES = [
  // The desktop build's task list still runs the Copilot compile task, whose import the patch removes.
  ['build/gulpfile.vscode.ts', '\t\t\tcompileCopilotExtensionBuildTask,\n'],
];

async function download(name) {
  const res = await fetch(`${base}/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${base}`);
  return (await res.text()).replace(/\r\n/g, '\n');
}

const git = (...args) => execFileSync('git', args, { cwd: checkout, stdio: 'pipe' });

const removals = JSON.parse(await download('52-ext-copilot-remove-it.json'));
let patch = await download('53-ext-copilot-remove-it.patch');
for (const [file, theirs, ours] of FIXES) {
  if (!patch.includes(theirs)) throw new Error(`The fix for ${file} no longer matches VSCodium ${vscodium}'s patch: check it.`);
  patch = patch.replace(theirs, ours);
}
const dir = join(root, 'build', 'patches');
mkdirSync(dir, { recursive: true });
const patchFile = join(dir, '53-ext-copilot-remove-it.patch');
writeFileSync(patchFile, patch);

let removed = 0;
for (const step of removals) {
  if (step.action !== 'remove') throw new Error(`Unknown action in 52-ext-copilot-remove-it.json: ${step.action}`);
  for (const p of step.paths) {
    const full = join(checkout, p);
    if (existsSync(full)) { rmSync(full, { recursive: true, force: true }); removed++; }
  }
}

let applied = false;
try {
  git('apply', '--reverse', '--check', patchFile);
  console.log(`53-ext-copilot-remove-it.patch is already applied in ${checkout}.`);
} catch {
  try { git('apply', '--check', patchFile); } catch (e) { throw new Error(`53-ext-copilot-remove-it.patch does not apply:\n${e.stderr}`); }
  git('apply', patchFile);
  applied = true;
}

for (const [file, line] of LINES) {
  const full = join(checkout, file);
  const text = readFileSync(full, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const target = line.replace(/\n$/, eol);
  if (text.split(target).length > 2) throw new Error(`${file}: more than one "${line.trim()}"; check it.`);
  if (text.includes(target)) writeFileSync(full, text.replace(target, ''));
  else if (applied) throw new Error(`${file} no longer has "${line.trim()}"; check whether the fix is still needed.`);
}
console.log(`Copilot removed with VSCodium ${vscodium}'s patches: ${removed} paths deleted${applied ? ', build patch applied' : ''}.`);
