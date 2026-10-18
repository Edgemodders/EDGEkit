// Takes upstream's name out of the Code - OSS checkout's text, in two passes:
//
// 1. VSCodium's branding patch (MIT) from its release built on the same Code - OSS version
//    (upstream.json "vscodium"), 00-brand-remove-branding.patch: "VS Code" and "Visual Studio Code"
//    become !!APP_NAME!!, here EDGEkit, in messages and also in text outside them (the editor
//    playground, the terminal's shell integration, argv.json's comments); it also drops the two
//    VS Code logos inlined in the sign-in page. It is downloaded, not committed. Parts of it are left
//    out (SKIP): they are VSCodium's own choices, not renames, or tools/patch-upstream.mjs covers them.
// 2. Every translated message the patch does not reach (it lags upstream's newest features): the
//    strings inside localize(), localize2() and l10n.t() calls, and the built-in extensions'
//    package.nls.json. Names in code (theme ids, product checks, the "VS Code API") stay.
//
//   node tools/remove-branding.mjs          make the changes
//   node tools/remove-branding.mjs --list   also print each message pass 2 changes
//
// Running it again does nothing.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { checkout, root } from './checkout.mjs';

const NAME = 'EDGEkit';
const PATCH = '00-brand-remove-branding.patch';
const list = process.argv.includes('--list');
const { vscodium } = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'));
if (!vscodium) throw new Error('No VSCodium release in upstream.json ("vscodium").');

// [file, the start of a line the left-out hunk removes; null leaves out the whole file]
const SKIP = [
  // patch-upstream.mjs renames "Visual Studio Code" in all 13 installer message files, VSCodium's in 4.
  ['build/win32/i18n/messages.en.isl', null],
  ['build/win32/i18n/messages.es.isl', null],
  ['build/win32/i18n/messages.it.isl', null],
  ['build/win32/i18n/messages.pt-br.isl', null],
  // VSCodium's Welcome page: no tunnel or new-workspace chat entries, no Copilot, theme or settings
  // sync steps. EDGEkit's Welcome tab is its own K2 item (design, K2), so these wait for it.
  ['src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts', "\t\tid: 'topLevelOpenTunnel',"],
  ['src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts', 'const CopilotStepTitle = '],
  ['src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts', "\t\t\t\t\tid: 'pickColorTheme',"],
  ['src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts', "\t\t\t\t\tid: 'settingsSyncWeb',"],
];

// Pass 1. Pass 2 changes lines the patch keeps as context, so git cannot tell afterwards that the
// patch is in: a note in the checkout's .build says so (a new fetch replaces the checkout and the note).
const res = await fetch(`https://raw.githubusercontent.com/VSCodium/vscodium/${vscodium}/patches/${PATCH}`);
if (!res.ok) throw new Error(`${PATCH}: HTTP ${res.status}`);
const text = (await res.text()).replace(/\r\n/g, '\n');

const files = text.split(/^(?=diff --git )/m).filter((f) => f.startsWith('diff --git '));
const used = new Set();
const kept = [];
for (const f of files) {
  const path = f.match(/^diff --git a\/(\S+)/)[1];
  const skips = SKIP.filter(([p]) => p === path);
  if (skips.some(([, line]) => line === null)) { used.add(`${path}:null`); continue; }
  const [head, ...hunks] = f.split(/^(?=@@ )/m);
  const left = hunks.filter((h) => {
    const hit = skips.find(([, line]) => h.split('\n').some((l) => l.startsWith(`-${line}`)));
    if (hit) used.add(`${path}:${hit[1]}`);
    return !hit;
  });
  if (left.length) kept.push(head + left.join(''));
}
for (const [path, line] of SKIP) {
  if (!used.has(`${path}:${line}`)) throw new Error(`SKIP no longer matches VSCodium ${vscodium}'s ${PATCH}: ${path} ${line ?? ''}. Check it.`);
}

const patch = kept.join('').replaceAll('!!APP_NAME!!', NAME);
const dir = join(root, 'build', 'patches');
mkdirSync(dir, { recursive: true });
const patchFile = join(dir, PATCH);
writeFileSync(patchFile, patch);

const note = join(checkout, '.build', 'edgekit', 'remove-branding.json');
const hash = createHash('sha256').update(patch).digest('hex');
const noted = existsSync(note) && JSON.parse(readFileSync(note, 'utf8')).sha256 === hash;
const git = (...args) => execFileSync('git', args, { cwd: checkout, stdio: 'pipe' });
const applies = (...args) => { try { git('apply', '--check', ...args, patchFile); return true; } catch { return false; } };
if (noted || applies('--reverse')) {
  console.log(`${PATCH} is already applied in ${checkout}.`);
} else {
  try { git('apply', '--check', patchFile); } catch (e) { throw new Error(`${PATCH} does not apply:\n${e.stderr}`); }
  git('apply', patchFile);
  console.log(`Pass 1: upstream's name replaced with ${NAME} in ${kept.length} files, with VSCodium ${vscodium}'s ${PATCH}.`);
}
mkdirSync(join(checkout, '.build', 'edgekit'), { recursive: true });
writeFileSync(note, `${JSON.stringify({ vscodium, sha256: hash }, null, 2)}\n`);

// Pass 2.
const KEEP = /VS Code (?:extension )?API/g; // the extension API's own name
function rename(s) {
  const kept = [];
  const out = s
    .replace(KEEP, (m) => `\u0000${kept.push(m) - 1}\u0000`)
    .replace(/\b([Aa]) (?:Visual Studio Code|VS Code)\b/g, (_, a) => `${a}n ${NAME}`)
    .replace(/Visual Studio Code|VS Code/g, NAME);
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => kept[i]);
}

// The end of the string literal that starts at i (a quote), or -1.
function stringEnd(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === q) return j;
    if (src[j] === '\n' && q !== '`') return -1;
  }
  return -1;
}

// The string literals among a call's arguments, from the "(" at open to its ")": [start, end] pairs.
function callStrings(src, open) {
  const found = [];
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'" || c === '`') {
      const end = stringEnd(src, i);
      if (end < 0) return null;
      found.push([i, end]);
      i = end;
    } else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return found;
  }
  return null;
}

const CALL = /\b(?:localize2?|l10n\.t)\s*\(/g;
const NAMES = /Visual Studio Code|VS Code/;
function renameMessages(src) {
  const parts = [];
  let last = 0;
  for (const m of src.matchAll(CALL)) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const before = src.slice(lineStart, m.index);
    if (before.includes('//') || /^\s*\*/.test(before)) continue; // in a comment
    const open = m.index + m[0].length - 1;
    if (open < last) continue; // a call inside one already done
    const strings = callStrings(src, open);
    if (!strings) continue;
    for (const [s, e] of strings) {
      const lit = src.slice(s, e + 1);
      if (!NAMES.test(lit)) continue;
      parts.push(src.slice(last, s), rename(lit));
      last = e + 1;
    }
  }
  parts.push(src.slice(last));
  return parts.join('');
}

function* tsFiles(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'test' || e.name === 'fixtures') continue;
    const p = join(d, e.name);
    if (e.isDirectory()) yield* tsFiles(p);
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts') && !e.name.endsWith('.d.ts')) yield p;
  }
}

const targets = [...tsFiles(join(checkout, 'src', 'vs'))];
for (const ext of readdirSync(join(checkout, 'extensions'), { withFileTypes: true })) {
  if (!ext.isDirectory()) continue;
  const base = join(checkout, 'extensions', ext.name);
  if (existsSync(join(base, 'src'))) targets.push(...tsFiles(join(base, 'src')));
  if (existsSync(join(base, 'package.nls.json'))) targets.push(join(base, 'package.nls.json'));
}

let changedFiles = 0;
let changedMessages = 0;
for (const file of targets) {
  const raw = readFileSync(file, 'utf8');
  if (!NAMES.test(raw)) continue;
  const out = file.endsWith('.json') ? rename(raw) : renameMessages(raw);
  if (out === raw) continue;
  const before = raw.split('\n');
  const after = out.split('\n');
  const lines = before.filter((l, i) => l !== after[i]).length;
  changedFiles++;
  changedMessages += lines;
  if (list) {
    console.log(relative(checkout, file).replaceAll('\\', '/'));
    before.forEach((l, i) => { if (l !== after[i]) console.log(`  ${after[i].trim().slice(0, 200)}`); });
  }
  writeFileSync(file, out);
}
console.log(changedFiles
  ? `Pass 2: ${NAME} in ${changedMessages} more message lines, in ${changedFiles} files.`
  : 'Pass 2: no messages left to rename.');
