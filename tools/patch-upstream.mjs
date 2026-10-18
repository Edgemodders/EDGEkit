// EDGEkit's small edits to the Code - OSS checkout, each one exact text replaced by other text.
//
//   node tools/patch-upstream.mjs
//
// Safe to run again: an edit already made is skipped. When upstream moves, an edit whose
// text is gone fails loudly, naming the edit to look at. Larger changes taken from VSCodium
// (Copilot's removal) stay in their own scripts.
//
// Each edit names a file, or a folder and a file name pattern (dir, match). It replaces the text once,
// or every copy with all: true.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
  {
    // K2: EDGEkit.exe's own version details (Electron's packaging stamps the main executable).
    name: 'EDGEkit.exe details: Edgemodders',
    file: 'build/lib/electron.ts',
    from: "companyName: 'Microsoft Corporation',\n\tcopyright: 'Copyright (C) 2026 Microsoft. All rights reserved',",
    to: "companyName: 'Edgemodders',\n\tcopyright: `Copyright (C) ${new Date().getFullYear()} Edgemodders. MIT License`,",
  },
  {
    // Upstream strips the signatures of the native modules and helper programs it ships and
    // stamps "Microsoft Corporation" on all of them, for Microsoft's own signing. EDGEkit leaves
    // each one with the details its maker built in: they are Microsoft's (@vscode/*, the sign-in
    // runtime, OpenConsole) or other projects' (kerberos, @parcel/watcher), not Edgemodders'.
    name: 'Dependencies keep their own file details',
    file: 'build/gulpfile.vscode.ts',
    from: "\treturn async () => {\n\t\tconst versionedResourcesFolder = util.getVersionedResourcesFolder('win32', commit!);\n\t\tconst deps = (await Promise.all([",
    to: "\treturn async () => {\n\t\tif (/* EDGEkit: dependencies keep their own file details */ true) { return; }\n\t\tconst versionedResourcesFolder = util.getVersionedResourcesFolder('win32', commit!);\n\t\tconst deps = (await Promise.all([",
  },
  {
    // K2: the installer's publisher and links (Windows shows them in Installed apps).
    name: 'Installer: publisher and links',
    file: 'build/win32/code.iss',
    from: 'AppPublisher=Microsoft Corporation\nAppPublisherURL=https://code.visualstudio.com/\nAppSupportURL=https://code.visualstudio.com/\nAppUpdatesURL=https://code.visualstudio.com/',
    to: 'AppPublisher=Edgemodders\nAppPublisherURL=https://edgemodders.ai/\nAppSupportURL=https://github.com/Edgemodders/EDGEkit/issues\nAppUpdatesURL=https://github.com/Edgemodders/EDGEkit/releases',
  },
  {
    name: 'Installer: EDGEkitSetup.exe',
    file: 'build/win32/code.iss',
    from: 'OutputBaseFilename=VSCodeSetup',
    to: 'OutputBaseFilename=EDGEkitSetup',
  },
  {
    // EDGEkit has no system installer to send people to.
    name: 'Installer: the administrator warning',
    file: 'build/win32/code.iss',
    from: "This User Installer is not meant to be run as an Administrator. If you would like to install VS Code for all users in this system, download the System Installer instead from https://code.visualstudio.com. Are you sure you want to continue?",
    to: "This User Installer is not meant to be run as an Administrator. Are you sure you want to continue?",
  },
  {
    // "Updating Visual Studio Code..." in every language, as VSCodium's branding patch does.
    name: 'Installer messages: EDGEkit',
    dir: 'build/win32/i18n',
    match: /^messages\..+\.isl$/,
    all: true,
    from: 'Visual Studio Code',
    to: 'EDGEkit',
  },
];

for (const { name, file, dir, match, all, from, to } of edits) {
  const files = file ? [file] : readdirSync(join(checkout, dir)).filter((f) => match.test(f)).map((f) => `${dir}/${f}`);
  let made = 0;
  for (const f of files) {
    const path = join(checkout, f);
    const raw = readFileSync(path, 'utf8');
    const crlf = raw.includes('\r\n');
    const text = raw.replace(/\r\n/g, '\n');
    const count = (s) => text.split(s).length - 1;
    if (count(from) === 0 && count(to) > 0) continue;
    if (all ? count(from) === 0 : count(from) !== 1) throw new Error(`${name}: expected the text ${all ? 'at least' : 'exactly'} once in ${f}, found it ${count(from)} times. Upstream has moved; check this edit.`);
    const out = all ? text.split(from).join(to) : text.replace(from, to);
    writeFileSync(path, crlf ? out.replace(/\n/g, '\r\n') : out);
    made++;
  }
  console.log(`${name}: ${made ? `made${files.length > 1 ? ` in ${made} files` : ''}` : 'already made'}.`);
}
