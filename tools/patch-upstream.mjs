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
    // K2: the REDnode HUD theme (built in by bundle.mjs) is the default colour theme, also when
    // "follow the system's dark mode" is on. Upstream's "Dark 2026" stays its own default
    // elsewhere (its theme migration and picker), so only the settings' defaults change.
    name: 'Default theme: REDnode HUD',
    file: 'src/vs/workbench/services/themes/common/themeConfiguration.ts',
    from: 'default: isWeb ? ThemeSettingDefaults.COLOR_THEME_LIGHT : ThemeSettingDefaults.COLOR_THEME_DARK,',
    to: "default: isWeb ? ThemeSettingDefaults.COLOR_THEME_LIGHT : 'REDnode HUD',",
  },
  {
    name: 'Default dark theme: REDnode HUD',
    file: 'src/vs/workbench/services/themes/common/themeConfiguration.ts',
    from: "'Specifies the color theme when system color mode is dark and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),\n\tdefault: ThemeSettingDefaults.COLOR_THEME_DARK,",
    to: "'Specifies the color theme when system color mode is dark and {0} is enabled.', formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),\n\tdefault: 'REDnode HUD',",
  },
  {
    // K2: the startup screen. Upstream's window first shows an outline of the layout in the
    // theme's colours (only once a layout was saved, so not on a first launch). EDGEkit adds its
    // mark and text lines (product.json's edgekitStartup, from tools/brand.mjs) in the middle of
    // the editor area, inside the same splash element so they go when the workbench is ready.
    name: 'Startup screen: the EDGEkit mark',
    file: 'src/vs/code/electron-browser/workbench/workbench.ts',
    from: '\t\t\twindow.document.body.appendChild(splash);\n\t\t}\n\t}\n\n\t//#endregion\n\n\t//#region Window Helpers',
    to: [
      '\t\t\twindow.document.body.appendChild(splash);',
      '\t\t}',
      '',
      '\t\t// EDGEkit: its mark and text lines in the middle of the editor area.',
      '\t\tconst edgekitStartup = (configuration.product as unknown as { edgekitStartup?: { logo?: string; lines?: string[] } } | undefined)?.edgekitStartup;',
      '\t\tif (edgekitStartup?.logo) {',
      "\t\t\tlet splash = window.document.getElementById('monaco-parts-splash');",
      '\t\t\tif (!splash) {',
      "\t\t\t\tsplash = document.createElement('div');",
      "\t\t\t\tsplash.id = 'monaco-parts-splash';",
      '\t\t\t\twindow.document.body.appendChild(splash);',
      '\t\t\t}',
      '\t\t\tconst layout = data?.layoutInfo;',
      '\t\t\tconst editor = layout?.partBounds?.editor;',
      "\t\t\tconst sideLeft = layout?.sideBarSide !== 'right';",
      '\t\t\tconst area = editor',
      '\t\t\t\t? `top:${editor.top}px;left:${editor.left}px;width:${editor.width}px;height:${editor.height}px`',
      '\t\t\t\t: layout',
      '\t\t\t\t\t? `top:${layout.titleBarHeight}px;bottom:${layout.statusBarHeight}px;left:${sideLeft ? layout.activityBarWidth + layout.sideBarWidth : layout.auxiliaryBarWidth}px;right:${sideLeft ? layout.auxiliaryBarWidth : layout.activityBarWidth + layout.sideBarWidth}px`',
      "\t\t\t\t\t: 'inset:0';",
      "\t\t\tconst mark = document.createElement('div');",
      "\t\t\tmark.style.cssText = `position:absolute;${area};z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;pointer-events:none;`;",
      "\t\t\tconst logo = document.createElement('img');",
      '\t\t\tlogo.src = edgekitStartup.logo;',
      "\t\t\tlogo.style.cssText = 'width:176px;height:auto;margin-bottom:10px;';",
      '\t\t\tmark.appendChild(logo);',
      '\t\t\tfor (const text of edgekitStartup.lines ?? []) {',
      "\t\t\t\tconst line = document.createElement('div');",
      '\t\t\t\tline.textContent = text;',
      "\t\t\t\tline.style.cssText = `color:${shellForeground ?? '#e3e6ee'};opacity:.75;font:14px/1.5 'Segoe UI',system-ui,sans-serif;text-align:center;max-width:440px;`;",
      '\t\t\t\tmark.appendChild(line);',
      '\t\t\t}',
      '\t\t\tsplash.appendChild(mark);',
      '\t\t}',
      '\t}',
      '',
      '\t//#endregion',
      '',
      '\t//#region Window Helpers',
    ].join('\n'),
  },
  {
    // K2: the Start menu tile (its logo is EDGEkit's, from tools/brand/icons.ps1).
    name: 'Start menu tile: the HUD background',
    file: 'resources/win32/VisualElementsManifest.xml',
    from: 'BackgroundColor="#2D2D30"',
    to: 'BackgroundColor="#08090D"',
  },
  {
    name: 'Start menu tile: EDGEkit',
    file: 'resources/win32/VisualElementsManifest.xml',
    from: 'ShortDisplayName="Code - OSS"',
    to: 'ShortDisplayName="EDGEkit"',
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
