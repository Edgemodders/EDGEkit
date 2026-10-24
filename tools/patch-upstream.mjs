// EDGEkit's small edits to the Code - OSS checkout, each one exact text replaced by other text.
//
//   node tools/patch-upstream.mjs
//
// Safe to run again: an edit already made is skipped. When upstream moves, an edit whose
// text is gone fails loudly, naming the edit to look at. Larger changes taken from VSCodium
// (Copilot's removal) stay in their own scripts.
//
// Each edit names a file, or a folder and a file name pattern (dir, match). It replaces the text once,
// or every copy with all: true. The text to replace can be a pattern, for one too long to quote.
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
  {
    // K2, the trademark sweep: the icon font's VS Code logos ($(vscode), $(vscode-insiders)) show
    // as the plain window glyph instead, wherever upstream or an extension uses them.
    name: 'No VS Code logo glyph',
    file: 'src/vs/base/common/codiconsLibrary.ts',
    from: "\tvscode: register('vscode', 0xec29),\n\tvscodeInsiders: register('vscode-insiders', 0xec2a),",
    to: "\tvscode: register('vscode', 0xeb7f), // EDGEkit: the window glyph, not upstream's logo\n\tvscodeInsiders: register('vscode-insiders', 0xeb7f),",
  },
  {
    // Chat's working indicator draws upstream's logo (an experimental setting, off in stable builds);
    // EDGEkit always uses the setting's own no-icon variant.
    name: 'No VS Code logo in chat progress',
    file: 'src/vs/workbench/contrib/chat/browser/widget/chatWorkingLogo.ts',
    from: 'const noIcon = animation === ChatProgressAnimation.DrawMonochromeNoIcon;',
    to: 'const noIcon = /* EDGEkit: never upstream\'s logo */ true;',
  },
  {
    // The Agents window's easter egg swims fish shaped like upstream's logo; EDGEkit leaves it off.
    name: 'No logo fish (the setting)',
    file: 'src/vs/sessions/contrib/aquarium/browser/aquarium.contribution.ts',
    from: "\t\t\ttype: 'boolean',\n\t\t\tdefault: true,\n\t\t\tdescription: localize('sessions.developerJoy.enabled',",
    to: "\t\t\ttype: 'boolean',\n\t\t\tdefault: false,\n\t\t\tdescription: localize('sessions.developerJoy.enabled',",
  },
  {
    name: 'No logo fish (the switch)',
    file: 'src/vs/sessions/contrib/aquarium/browser/aquariumOverlay.ts',
    from: '\t\treturn this.configurationService.getValue<boolean>(SESSIONS_DEVELOPER_JOY_ENABLED_SETTING) === true;',
    to: '\t\treturn false; // EDGEkit: the fish are upstream\'s logo',
  },
  {
    // The page the browser shows after a Microsoft account sign-in (brand.mjs copies EDGEkit's
    // favicon.ico beside it).
    name: 'Microsoft sign-in page: EDGEkit',
    file: 'extensions/microsoft-authentication/media/index.html',
    from: '\t<a class="branding" href="https://code.visualstudio.com/">\n\t\tVisual Studio Code\n\t</a>',
    to: '\t<a class="branding" href="https://edgemodders.ai/">\n\t\tEDGEkit\n\t</a>',
  },
  {
    name: 'Microsoft sign-in page: no inlined VS Code logo',
    file: 'extensions/microsoft-authentication/media/auth.css',
    from: /background-image: url\('data:image\/png;base64,[A-Za-z0-9+/=]+'\);/,
    to: "background-image: url('favicon.ico');",
  },
  {
    // K2, the Welcome page: EDGEkit's walkthrough (product/welcome/edgekitWalkthrough.ts, which
    // brand.mjs copies in) comes first. Upstream's desktop setup walkthrough (Copilot, a theme
    // picker, Microsoft's videos) is hidden, not deleted: its Copilot steps stay in use, so the
    // build's unused-code check still passes.
    name: 'Welcome: EDGEkit walkthrough (the import)',
    file: 'src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts',
    from: "import notebookProfileContent from './media/notebookProfile.js';\n",
    to: "import notebookProfileContent from './media/notebookProfile.js';\nimport { edgekitWalkthrough } from './edgekitWalkthrough.js'; // EDGEkit\n",
  },
  {
    name: 'Welcome: EDGEkit walkthrough first',
    file: 'src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts',
    from: "export const walkthroughs: GettingStartedWalkthroughContent = [\n\t{\n\t\tid: 'Setup',",
    to: "export const walkthroughs: GettingStartedWalkthroughContent = [\n\tedgekitWalkthrough, // EDGEkit: its own setup walkthrough, first\n\t{\n\t\tid: 'Setup',",
  },
  {
    name: "Welcome: upstream's setup walkthrough hidden",
    file: 'src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts',
    from: "\t\ticon: setupIcon,\n\t\twhen: '!isWeb',",
    to: "\t\ticon: setupIcon,\n\t\twhen: 'false', // EDGEkit: replaced by EDGEkitSetup",
  },
  {
    name: 'Welcome: no "Generate New Workspace" chat entry',
    file: 'src/vs/workbench/contrib/welcomeGettingStarted/common/gettingStartedContent.ts',
    from: "\t\twhen: '!isWeb && !chatSetupHidden && !chatSetupDisabledInWorkspace',\n\t\tcontent: {\n\t\t\ttype: 'startEntry',\n\t\t\tcommand: 'command:welcome.newWorkspaceChat',",
    to: "\t\twhen: 'false', // EDGEkit: no Copilot\n\t\tcontent: {\n\t\t\ttype: 'startEntry',\n\t\t\tcommand: 'command:welcome.newWorkspaceChat',",
  },
  {
    name: "Welcome: EDGEkit's subtitle",
    file: 'src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts',
    from: "comment: ['Shown as subtitle on the Welcome page.'] }, \"Editing evolved\"))",
    to: "comment: ['Shown as subtitle on the Welcome page.'] }, \"The Edgemodders editor for Cyberpunk 2077 mods\"))",
  },
  {
    // K2, the onboarding's first step: a plain GitHub sign-in, not Copilot's (decided 2026-10-18).
    // A GitHub account is what EDGEmods publishing needs. The Google, Apple and GitHub Enterprise
    // buttons are built but never shown, and Copilot's terms are replaced with GitHub's.
    name: 'Onboarding: why sign in',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "localize('onboarding.signIn.heroSubtitle', \"Sign in to use GitHub Copilot.\")",
    to: "localize('onboarding.signIn.heroSubtitle', \"Sign in with GitHub to publish your mods on EDGEmods and to work with your repositories.\")",
  },
  {
    name: 'Onboarding: the footer sign-in button',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "localize('onboarding.sessions.signInNudge', \"Sign in to use GitHub Copilot\")",
    to: "localize('onboarding.sessions.signInNudge', \"Sign in with GitHub\")",
  },
  {
    name: 'Onboarding: GitHub only (the start)',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "\t\tconst googleBtn = this._registerStepFocusable(this._createSignInButton(actions, 'google',",
    to: "\t\tif (/* EDGEkit: GitHub sign-in only */ (false as boolean)) {\n\t\tconst googleBtn = this._registerStepFocusable(this._createSignInButton(actions, 'google',",
  },
  {
    name: 'Onboarding: GitHub only (the end)',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "\t\t\tvoid this._handleEnterpriseSignIn();\n\t\t}));\n\t}",
    to: "\t\t\tvoid this._handleEnterpriseSignIn();\n\t\t}));\n\t\t}\n\t}",
  },
  {
    name: 'Onboarding: a plain GitHub sign-in',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "\t\t\t\textraAuthorizeParameters: { get_started_with: 'copilot-vscode' },\n\t\t\t\tprovider: socialProvider,\n",
    to: "\t\t\t\tprovider: socialProvider, // EDGEkit: not Copilot's sign-up\n",
  },
  {
    name: 'Onboarding: no Copilot setup after signing in',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "\t\t\t\t// Run chat setup in the background (sign-up, extension install, entitlement resolution)\n\t\t\t\tthis.commandService.executeCommand('workbench.action.chat.triggerSetup', undefined, {\n\t\t\t\t\tdisableChatViewReveal: true,\n\t\t\t\t\tsetupStrategy: ChatSetupStrategy.DefaultSetup,\n\t\t\t\t});\n",
    to: "\t\t\t\t// EDGEkit: no Copilot setup after signing in\n",
  },
  {
    name: "Onboarding: GitHub's terms, not Copilot's",
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "\t\t// GitHub Copilot disclaimer\n\t\tconst copilotDisclaimer = append(disclaimerCol, $('.onboarding-a-signin-disclaimer'));\n",
    to: "\t\t// EDGEkit: GitHub's own terms. Copilot's disclaimer below is built but not shown.\n" +
      "\t\tconst githubDisclaimer = append(disclaimerCol, $('.onboarding-a-signin-disclaimer'));\n" +
      "\t\tgithubDisclaimer.append(localize('onboarding.signIn.edgekit.disclaimer.prefix', \"By signing in, you agree to GitHub's \"));\n" +
      "\t\tthis._createInlineLink(githubDisclaimer, localize('onboarding.signIn.edgekit.disclaimer.terms', \"Terms of Service\"), 'https://docs.github.com/site-policy/github-terms/github-terms-of-service');\n" +
      "\t\tgithubDisclaimer.append(localize('onboarding.signIn.edgekit.disclaimer.middle', \" and \"));\n" +
      "\t\tthis._createInlineLink(githubDisclaimer, localize('onboarding.signIn.edgekit.disclaimer.privacy', \"Privacy Statement\"), 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement');\n" +
      "\t\tgithubDisclaimer.append(localize('onboarding.signIn.edgekit.disclaimer.suffix', \". EDGEkit itself collects no data.\"));\n" +
      "\t\tconst copilotDisclaimer = $('.onboarding-a-signin-disclaimer');\n",
  },
  {
    // Updates (design, "Updates"): upstream asks Microsoft's server, {updateUrl}/api/update/{platform}/{quality}/{commit},
    // which answers "nothing new" when the commit is current. EDGEkit's answer is a static file per platform on
    // its docs site (tools/update-manifest.mjs writes it), so the app asks for that file and decides itself
    // what is newer, by EDGEkit's version (version.json). As VSCodium's update patch, in outline.
    name: 'Updates: a static manifest per platform',
    file: 'src/vs/platform/update/electron-main/abstractUpdateService.ts',
    from: "\tconst url = new URL(`${baseUpdateUrl}/api/update/${platform}/${quality}/${commit}`);\n\n\tif (options?.background) {\n\t\turl.searchParams.set('bg', 'true');\n\t}\n\n\turl.searchParams.set('u', options?.internalOrg ?? 'none');\n\n\treturn url.toString();\n}\n",
    to: "\t// EDGEkit: a static manifest per platform (design, \"Updates\"); the app decides what is newer (isNewerVersion).\n" +
      '\treturn `${baseUpdateUrl}/latest-${platform}.json`;\n}\n\n' +
      '// EDGEkit: true when version a (such as 1.140.2) is newer than version b, comparing the numbers in turn.\n' +
      'export function isNewerVersion(a: string, b: string): boolean {\n' +
      '\tconst x = a.split(\'.\').map(n => parseInt(n, 10) || 0);\n' +
      '\tconst y = b.split(\'.\').map(n => parseInt(n, 10) || 0);\n' +
      '\tfor (let i = 0; i < Math.max(x.length, y.length); i++) {\n' +
      '\t\tif ((x[i] ?? 0) !== (y[i] ?? 0)) {\n' +
      '\t\t\treturn (x[i] ?? 0) > (y[i] ?? 0);\n' +
      '\t\t}\n' +
      '\t}\n' +
      '\treturn false;\n' +
      '}\n',
  },
  {
    name: 'Updates: read the manifest before a restart (import)',
    file: 'src/vs/platform/update/electron-main/abstractUpdateService.ts',
    from: "import { IRequestService } from '../../request/common/request.js';",
    to: "import { asJson, IRequestService } from '../../request/common/request.js';",
  },
  {
    // Before installing on quit, and every 5 minutes while an update waits, upstream asks again and takes
    // any answer but 204 as "a newer update exists": with a static file it would cancel the waiting update
    // on every quit. The manifest is news only when it names a version newer than the waiting one.
    name: 'Updates: read the manifest before a restart',
    file: 'src/vs/platform/update/electron-main/abstractUpdateService.ts',
    from: "\t\t\tconst statusCode = context.res.statusCode;\n\t\t\tthis.logService.trace('update#isLatestVersion() - response', { statusCode });\n\t\t\t// The update server replies with 204 (No Content) when no update is available.\n\t\t\treturn statusCode === 204;\n",
    to: "\t\t\t// EDGEkit: the static manifest always names the newest release; it is news only when newer than the waiting update, or this app.\n" +
      '\t\t\tconst latest = await asJson<IUpdate>(context);\n' +
      '\t\t\tconst current = this.state.type === StateType.Ready ? this.state.update.productVersion ?? this.productService.version : this.productService.version;\n' +
      "\t\t\tthis.logService.trace('update#isLatestVersion() - response', { latest: latest?.productVersion, current });\n" +
      '\t\t\treturn !latest?.productVersion || !isNewerVersion(latest.productVersion, current);\n',
  },
  {
    // The downloaded installer and its flags live in a temp folder named vscode-<quality>-<target>-<arch>, the
    // same as an installed VS Code's: EDGEkit's first update test (2026-10-21) tried to delete VS Code's
    // waiting update there, stopped only because it was in use. EDGEkit's folder is named after the app.
    name: "Updates: EDGEkit's own download folder",
    file: 'src/vs/platform/update/electron-main/updateService.win32.ts',
    from: '\t\treturn path.join(tmpdir(), `vscode-${this.productService.quality}-${this.productService.target}-${process.arch}`);\n',
    to: '\t\treturn path.join(tmpdir(), `${this.productService.applicationName}-${this.productService.quality}-${this.productService.target}-${process.arch}`); // EDGEkit: not VS Code\'s folder\n',
  },
  {
    // A background update installs beside the running app, and inno_updater swaps it in on restart. In 1.140
    // that only works in the versioned layout (win32VersionedUpdate), which needs Microsoft's own Electron
    // build: stock Electron cannot find its files there (found 2026-10-21, design "Updates"). Without it the
    // update waits forever. Off, Restart to Update quits and runs the installer over the closed app, as for
    // a system install. The download still happens in the background.
    name: 'Updates: no background install',
    file: 'src/vs/platform/update/common/update.config.contribution.ts',
    from: "\t\t'update.enableWindowsBackgroundUpdates': {\n\t\t\ttype: 'boolean',\n\t\t\tdefault: true,",
    to: "\t\t'update.enableWindowsBackgroundUpdates': {\n\t\t\ttype: 'boolean',\n\t\t\tdefault: false, // EDGEkit: needs Microsoft's Electron (design, \"Updates\")",
  },
  {
    // The build starts the app once with a temporary profile to make its Node.js compile cache, then deletes
    // the profile at once. With EDGEkit's built-in extensions starting, Windows had not let go of the
    // extension host's log yet: EBUSY, and the build failed after the cache was made (K3, 2026-10-21).
    name: 'Compile cache: retry deleting the temporary profile',
    file: 'build/lib/nodeCompileCache.ts',
    from: '\t} finally {\n\t\tawait fs.promises.rm(portableDirectory, { recursive: true, force: true });\n\t}\n',
    to: '\t} finally {\n\t\tawait fs.promises.rm(portableDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 }); // EDGEkit: Windows lets go of log files late\n\t}\n',
  },
  {
    // The built-in extensions' licenses and notices (bundle.mjs writes the file), shipped beside upstream's.
    name: "The built-in extensions' notices in the app",
    file: 'build/gulpfile.vscode.ts',
    from: "gulp.src([product.licenseFileName, 'ThirdPartyNotices.txt', 'licenses/**']",
    to: "gulp.src([product.licenseFileName, 'ThirdPartyNotices.txt', 'ThirdPartyNotices-EDGEkit.txt', 'licenses/**']",
  },
  {
    // EDGEkit's own first-start installs (product/extensions/edgekitFirstRun.ts, copied in by brand.mjs).
    name: 'First start: install Claude Code from Open VSX',
    file: 'src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts',
    from: "import { IAction } from '../../../../base/common/actions.js';\n",
    to: "import { IAction } from '../../../../base/common/actions.js';\nimport './edgekitFirstRun.js'; // EDGEkit\n",
  },
  {
    // No Copilot chat, inline suggestions or Agents window (the user, 2026-10-21: EDGEkit uses the Claude
    // Code extension instead). Upstream's own switch: it hides the chat UI and Copilot's sign-in, keeps the
    // Agents window from opening (chatSetupHidden is in its precondition) and leaves the agent host off.
    // Still a setting, so a modder can turn them back on.
    name: 'No built-in AI features (chat, Agents window)',
    file: 'src/vs/workbench/contrib/chat/browser/chat.shared.contribution.ts',
    from: "including chat and inline suggestions.\"),\n\t\t\tdefault: false,",
    to: "including chat and inline suggestions.\"),\n\t\t\tdefault: true, // EDGEkit: Claude Code instead",
  },
  {
    // Upstream skips its onboarding when AI features are hidden, so the edit above took EDGEkit's onboarding
    // away too (found 2026-10-21: no onboarding on a first launch). EDGEkit's has no AI step left (a GitHub
    // sign-in and the personalize step; the AI preference step is not in ONBOARDING_STEPS), so it shows anyway.
    name: 'The onboarding shows with AI features hidden',
    file: 'src/vs/workbench/contrib/welcomeGettingStarted/browser/startupPage.ts',
    // The check stays, turned off, so the service it reads is still used (the build rejects an unused one).
    from: '\t\tif (this.chatEntitlementService.sentiment.hidden) {',
    to: '\t\tif (/* EDGEkit: its onboarding has no AI step */ false && this.chatEntitlementService.sentiment.hidden) {',
  },
  {
    name: 'Updates: only a newer version is an update (import)',
    file: 'src/vs/platform/update/electron-main/updateService.win32.ts',
    from: "import { AbstractUpdateService, createUpdateURL, getUpdateRequestHeaders, IUpdateURLOptions, UpdateErrorClassification } from './abstractUpdateService.js';",
    to: "import { AbstractUpdateService, createUpdateURL, getUpdateRequestHeaders, isNewerVersion, IUpdateURLOptions, UpdateErrorClassification } from './abstractUpdateService.js';",
  },
  {
    name: 'Updates: only a newer version is an update',
    file: 'src/vs/platform/update/electron-main/updateService.win32.ts',
    from: '\t\t\t\tif (!update || !update.url || !update.version || !update.productVersion) {\n',
    to: '\t\t\t\t// EDGEkit: the static manifest always names the newest release, so the app compares versions itself.\n' +
      '\t\t\t\tif (!update || !update.url || !update.version || !update.productVersion || !isNewerVersion(update.productVersion, this.productService.version)) {\n',
  },
  {
    // The onboarding's first page has the Edgemodders banner across the top (the user, 2026-10-23):
    // product/onboarding/edgemodders.png, which brand.mjs copies into the onboarding's media folder.
    // Upstream's build ships only that folder's SVG files, so its PNG files are added to each list.
    name: 'Onboarding: ship its PNG images',
    file: 'build/next/resources.ts',
    all: true,
    from: "\t'vs/workbench/contrib/welcomeOnboarding/browser/media/*.svg',\n",
    to: "\t'vs/workbench/contrib/welcomeOnboarding/browser/media/*.svg',\n\t'vs/workbench/contrib/welcomeOnboarding/browser/media/*.png', // EDGEkit\n",
  },
  {
    name: 'Onboarding: the Edgemodders banner',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/onboardingVariationA.ts',
    from: "\t\tconst wrapper = append(container, $('.onboarding-a-signin'));\n",
    to: "\t\t// EDGEkit: the Edgemodders banner across the top (product/onboarding/edgemodders.png).\n" +
      "\t\tconst banner = append(container, $<HTMLImageElement>('img.onboarding-a-signin-banner'));\n" +
      "\t\tbanner.src = FileAccess.asBrowserUri('vs/workbench/contrib/welcomeOnboarding/browser/media/edgemodders.png').toString(true);\n" +
      "\t\tbanner.alt = 'Edgemodders';\n" +
      "\t\tconst wrapper = append(container, $('.onboarding-a-signin'));\n",
  },
  {
    name: 'Onboarding: the banner style',
    file: 'src/vs/workbench/contrib/welcomeOnboarding/browser/media/variationA.css',
    from: '/* Sign-In step */\n.onboarding-a-signin {\n',
    to: '/* EDGEkit: the Edgemodders banner above the sign-in step */\n' +
      '.onboarding-a-signin-banner {\n\tdisplay: block;\n\twidth: min(100%, 640px);\n\theight: auto;\n\tmargin: 4px auto 0;\n}\n\n' +
      '/* Sign-In step */\n.onboarding-a-signin {\n',
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
    const count = (s) => (s instanceof RegExp ? (text.match(new RegExp(s.source, 'g')) ?? []).length : text.split(s).length - 1);
    // Made already: the new text is there and the old is not, or (when the new text contains the
    // old, as for an insertion) every copy of the old is part of a copy of the new.
    const within = typeof from === 'string' && to.includes(from);
    if (count(to) > 0 && (count(from) === 0 || (within && count(from) === count(to)))) continue;
    if (all ? count(from) === 0 : count(from) !== 1) throw new Error(`${name}: expected the text ${all ? 'at least' : 'exactly'} once in ${f}, found it ${count(from)} times. Upstream has moved; check this edit.`);
    const out = all ? text.split(from).join(to) : text.replace(from, () => to);
    writeFileSync(path, crlf ? out.replace(/\n/g, '\r\n') : out);
    made++;
  }
  console.log(`${name}: ${made ? `made${files.length > 1 ? ` in ${made} files` : ''}` : 'already made'}.`);
}
