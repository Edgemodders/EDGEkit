// Turns off upstream's Windows 11 context-menu package (appx) in the Code - OSS build, as
// VSCodium's patches/windows/71-build-disable-appx.patch does.
//
//   node tools/disable-appx.mjs
//
// A build whose quality is stable packages an appx with Microsoft's explorer-command DLL and
// a CLSID from product.json's win32ContextMenu, neither of which EDGEkit has: packaging fails
// with "Cannot read properties of undefined (reading 'x64')" (found in K1, 2026-10-18).
// The classic context menu from the installer stays. Safe to run again.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkout } from './checkout.mjs';

const MARK = '/* EDGEkit: no appx */ false && ';
const COND = "(quality === 'stable' || quality === 'insider')";

// Each file: the text that follows the condition, so only the appx block is changed.
const files = [
  ['build/gulpfile.vscode.ts', "result = es.merge(result, gulp.src('.build/win32/appx/**'"],
  ['build/gulpfile.vscode.win32.ts', "definitions['AppxPackage'] ="],
];

for (const [file, next] of files) {
  const path = join(checkout, file);
  const text = readFileSync(path, 'utf8');
  const at = new RegExp(`if \\(${MARK.replace(/[/*]/g, '\\$&')}`);
  if (at.test(text)) {
    console.log(`${file}: appx already off.`);
    continue;
  }
  const re = new RegExp(`if ${COND.replace(/[()|]/g, '\\$&')} \\{(\\r?\\n\\s*)${next.replace(/[.*()[\]]/g, '\\$&')}`);
  if (!re.test(text)) throw new Error(`${file}: the appx block is not where it was in 1.140.0; check VSCodium's 71-build-disable-appx.patch.`);
  writeFileSync(path, text.replace(re, (m, gap) => `if (${MARK}${COND}) {${gap}${next}`));
  console.log(`${file}: appx turned off.`);
}
