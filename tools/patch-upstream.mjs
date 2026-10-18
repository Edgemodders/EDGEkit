// EDGEkit's small edits to the Code - OSS checkout, each one exact text replaced by other text.
//
//   node tools/patch-upstream.mjs
//
// Safe to run again: an edit already made is skipped. When upstream moves, an edit whose
// text is gone fails loudly, naming the edit to look at. Larger changes taken from VSCodium
// (Copilot's removal) stay in their own scripts.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkout } from './checkout.mjs';

const APPX = '/* EDGEkit: no appx */ false && ';
const STABLE = "(quality === 'stable' || quality === 'insider')";

const edits = [
  {
    // A stable-quality build packages a Windows 11 context-menu appx with Microsoft's
    // explorer-command DLL and a CLSID from product.json's win32ContextMenu, neither of which
    // EDGEkit has: packaging fails with "Cannot read properties of undefined (reading 'x64')"
    // (found in K1, 2026-10-18). As VSCodium's patches/windows/71-build-disable-appx.patch.
    // The installer's classic context menu stays.
    name: 'No Windows 11 context-menu appx (app)',
    file: 'build/gulpfile.vscode.ts',
    from: `if ${STABLE} {\n\t\t\t\tresult = es.merge(result, gulp.src('.build/win32/appx/**'`,
    to: `if (${APPX}${STABLE}) {\n\t\t\t\tresult = es.merge(result, gulp.src('.build/win32/appx/**'`,
  },
  {
    name: 'No Windows 11 context-menu appx (installer)',
    file: 'build/gulpfile.vscode.win32.ts',
    from: `if ${STABLE} {\n\t\t\tdefinitions['AppxPackage'] =`,
    to: `if (${APPX}${STABLE}) {\n\t\t\tdefinitions['AppxPackage'] =`,
  },
  {
    // Extension signatures are checked with Microsoft's vsce-sign, which is closed source and
    // not in Code - OSS, so every Open VSX install fails with "Signature verification was not
    // executed" (found in K1, 2026-10-18). Decided 2026-10-18 (design, "Decided after K0"): off by
    // default, as in other Open VSX clients. Unlike VSCodium's patch, the setting still says
    // what happens: it shows as off.
    name: 'Signature check off by default (the setting)',
    file: 'src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts',
    from: 'extensions are verified to be signed before getting installed."),\n\t\t\t\tdefault: true,',
    to: 'extensions are verified to be signed before getting installed."),\n\t\t\t\tdefault: false,',
  },
  {
    // Where no settings are loaded (the command line), this fallback decides.
    name: 'Signature check off by default (the fallback)',
    file: 'src/vs/platform/extensionManagement/node/extensionManagementService.ts',
    from: 'verifySignature = isBoolean(value) ? value : true;',
    to: 'verifySignature = isBoolean(value) ? value : false;',
  },
];

for (const { name, file, from, to } of edits) {
  const path = join(checkout, file);
  const raw = readFileSync(path, 'utf8');
  const crlf = raw.includes('\r\n');
  const text = raw.replace(/\r\n/g, '\n');
  const count = (s) => text.split(s).length - 1;
  if (count(to) === 1 && count(from) === 0) {
    console.log(`${name}: already made.`);
    continue;
  }
  if (count(from) !== 1) throw new Error(`${name}: expected the text once in ${file}, found it ${count(from)} times. Upstream has moved; check this edit.`);
  const out = text.replace(from, to);
  writeFileSync(path, crlf ? out.replace(/\n/g, '\r\n') : out);
  console.log(`${name}: made.`);
}
