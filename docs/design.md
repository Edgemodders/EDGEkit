# EDGE<span class="y">kit</span> design

EDGEkit is the Edgemodders editor: a build of Code - OSS, the open-source core of VS Code, with Edgemodders branding and every EDGE tool built in. A modder installs one app and gets REDcode's editors, REDnode's views, the REDnode HUD theme, EDGEdeck's mod manager and REDagent, with no extension hunting.

**Status: K1 done (2026-10-18).** K0 was decided on 2026-10-15. Code - OSS 1.140.0 built on this PC, unbranded and without Copilot, on 2026-10-16, and the app passed its first smoke test on 2026-10-18. `build.ps1` ran end to end on 2026-10-18, branded with EDGEkit's `product.json`. The branded app installed the REDnode HUD theme 0.3.1 from Open VSX, with `extensions.verifySignature` off in the dev build's settings (since decided: off by default, "Decided after K0"). Next: K2 Brand.

## What EDGEkit is, and is not

| It is | It is not |
|---|---|
| A packaging of Code - OSS: branding in `product.json`, icons, a default theme, bundled extensions, Open VSX as the extension registry. The VSCodium pattern | A deep fork of the VS Code workbench. Every EDGE feature stays an extension, so it also works in ordinary VS Code |
| The home of REDcode's planned phase C7 Brand, which moves here | The home of the extensions themselves: they stay in REDcode, REDagent and the other tool repos |
| MIT, like Code - OSS | A place for GPL code: REDbridge stays a separate process, as REDcode's license model requires |

REDcode's design ([Decision 1: how much of VS Code to fork](https://edgemodders.github.io/REDcode/design.html)) chose this: extensions first, a minimal branded fork at the end, because nothing in the extensions changes between the two.

## Facts that shape the design

| Fact | Consequence |
|---|---|
| The Microsoft Marketplace may be used only by Microsoft's own VS Code products | EDGEkit points its extension gallery at [Open VSX](https://open-vsx.org/), as VSCodium and other forks do. The user read the current terms on 2026-10-15 (sources in the K0 decisions) |
| Some Microsoft extensions (for example C# Dev Kit, Pylance, Remote Development, Live Share) are licensed for Microsoft's products only | EDGEkit does not bundle or advertise them. Modders who need them use VS Code with the EDGE extensions instead |
| "Visual Studio Code" and its logo are Microsoft trademarks | EDGEkit uses its own name and icon everywhere: window titles, installer, file associations, data folders. "Built on Code - OSS" is a plain description. Extensions listed on the Marketplace may say "*Name* for Visual Studio Code", the standard convention (K0 decisions) |
| The Redscript IDE extension (`jac3km4.redscript-ide-vscode`) is on the Marketplace only, not on Open VSX (REDcode C0, 2026-10-11). It, its language server (`jac3km4/redscript-ide`) and the compiler are all MIT (checked 2026-10-13) | EDGEkit may bundle it, with its copyright and license notice. Its newest VSIX on GitHub (0.2.2) is older than its source (0.3.4), so EDGEkit builds it from source. The user is telling its author and asking about Open VSX |
| Code - OSS builds need its own toolchain: the Node version in its `.nvmrc`, Python, and Visual Studio's C++ build tools for native modules, and many GB of disk | K1 proves the build on this PC first, unbranded, and records exact versions in [Dev setup](dev-setup.md) |
| Code - OSS releases about weekly (1.136 to 1.142 in six weeks, checked 2026-10-15) | EDGEkit pins an upstream release tag in `upstream.json` and moves it on purpose every few releases, as VSCodium does, with a rebuild and a smoke test |

## How it is built

Nothing from upstream is committed. The scripts fetch it, change it and build it in the checkout folder, outside the repo or in `build/`, which git ignores.

| Step | Script | What it does |
|---|---|---|
| 1. Fetch | `tools/fetch-vscode.ps1` | Clones `microsoft/vscode` at the tag in `upstream.json`, shallow, into the checkout folder (`local.json`, else `build/vscode`; no spaces in its path) |
| 2. Brand | `tools/brand.mjs` | Merges `product/product.json` into upstream's `product.json`: names, ids, data folders, URLs, Open VSX. Icons and the default theme come in K2 |
| 3. Bundle | `tools/bundle.mjs` | On the dev PC, builds each extension in `extensions.json` from its own repo (for example REDcode's `npm run redcode:package`); in CI, downloads the released VSIX at its pinned version instead. Unpacks the VSIX files into `build/extensions`, then into the app as built-in extensions. How Code - OSS takes them is a K3 question; upstream's own `builtInExtensions` list in `product.json` is the likely way (see the release pipeline) |
| 4. No Copilot | `tools/remove-copilot.mjs` | Downloads VSCodium's two Copilot removal patches (MIT) from its release on the same Code - OSS version (`upstream.json` `vscodium`), adjusts the one line an earlier VSCodium patch changes, and applies them. Before `npm ci`, because they change the dependencies |
| 5. Build | `tools/build.ps1` | Runs the steps above, installs upstream's dependencies and runs its Windows build and installer tasks |

K1 runs the scripts and fixes what upstream's build needs. Fetch, brand, the Copilot removal and `npm ci` have run, and the app and installer built (2026-10-16). The app starts and opens a folder (2026-10-18). `build.ps1` ran end to end on 2026-10-18 (Dev setup), after two fixes: upstream's Windows 11 context-menu package turned off (in `tools/patch-upstream.mjs`, as VSCodium does), and the installer app ids written as `{% raw %}{{GUID}{% endraw %}`.

## Bundled extensions

The list is `extensions.json`. Sources are the sibling repos, built by their own scripts.

**Tracking:** `node tools/extensions-status.mjs` prints, for every extension in the list, its version in its repo, on the Microsoft Marketplace and on Open VSX. It also scans the Edgemodders organization and names any extension the list lacks, so a new one in development is not missed. It only reads.

**Separate repos, not a monorepo** (agreed with the user on 2026-10-13). The extensions stay in their own repos, and EDGEkit fetches them finished:

| Why | |
|---|---|
| Licenses | REDbridge is GPL-3.0 and must stay a separate program; one repo would blur that boundary and EDGEkit's MIT license |
| They ship without EDGEkit too | REDcode's extensions and the theme also go to Open VSX for VS Code and VSCodium users, with their own versions, releases and docs |
| Build weight | EDGEkit's build pulls in all of Code - OSS; extension work stays quick without it |
| Parallel work | Separate repos keep sessions working in different tools from tripping over each other |
| Each extension has its own repo | REDcode's repo holds REDcode and the HUD theme; EDGEdeck, EDGEwave, EDGEmat and the other EDGE extensions live in their own repos. EDGEkit bundles each one from its repo's releases |

| Where EDGEkit gets them | How |
|---|---|
| On the dev PC | From the sibling folders: `tools/bundle.mjs` builds each extension with its own script and takes the newest VSIX |
| In a release (K4) | Each extension repo attaches its VSIX to a GitHub release when it tags a version (REDcode and EDGEdeck, then REDdeck, already do, through their `publish.yml`, checked 2026-10-15). `extensions.json` pins the version EDGEkit ships (`version`), and CI downloads exactly that file, so every EDGEkit release says which extension versions it holds and can be rebuilt. The build depends on these released files only, never on the extensions' source |
| Third-party (Redscript IDE) | Built from source at a pinned tag, or from Open VSX once it is there |

Git submodules would also pin exact commits, but every update takes commits in two repos; pinned release versions are simpler.

| Extension | From | Status |
|---|---|---|
| REDcode for Cyberpunk 2077 (`edgemodders.redcode-cyberpunk`, renamed from `edgemodders.redcode` in 0.8.0: the Marketplace already had a "redcode") | REDcode, `npm run redcode:package` | Exists. On both registries from 0.8.2 |
| REDnode HUD theme (`edgemodders.rednode-hud-theme`) | REDcode, `npm run theme:package` | Exists. The default theme |
| EDGEdeck (`edgemodders.edgedeck`) | EDGEdeck, `npm run package` | Exists. The mod manager. Its VSIX is built for `win32-x64`. Renamed from REDdeck (`edgemodders.reddeck`) on 2026-10-17, with no old names kept. `edgemodders.edgedeck` 0.27.3 is on both registries (checked 2026-10-17); the old `edgemodders.reddeck` listing stays at 0.26.6 |
| REDagent's editor view (id to be decided; `edgemodders.redagent` is a placeholder) | REDagent, phase C6 | Not started. REDagent today is a REDnode package that runs in the game (C5 passed in game). C6 adds a view in the editor's activity bar; whether that is its own extension or part of REDcode is REDagent's decision. The in-game part is not an editor extension, so EDGEkit does not bundle it |
| EDGEmat (`edgemodders.edgemat`) | EDGEmat, `npm run edgemat:package` (the extension is in `extensions/edgemat`) | Exists. The material editor (`.mlsetup` first), with an MCP server (`packages/edgemat-mcp`) beside it, which EDGEkit does not bundle. 0.3.0, a preview, is on both registries (released 2026-10-20). Its released VSIX is built for `win32-x64`; the local package script makes a universal one |
| EDGEwave (`edgemodders.edgewave`) | EDGEwave, `npm run package` (the VSIX lands in the repo's root) | Exists. The sound studio. Needs REDcode (`extensionDependencies`). 0.1.0, a preview, is on both registries (released 2026-10-20) |
| Redscript IDE (`jac3km4.redscript-ide-vscode`) | Built from its source (MIT) | To bundle in K3, with its notice. Its language server (`redscript-ide.exe`, MIT) ships beside it and `redscript.idePath` points at it, so it works offline. If it reaches Open VSX, that can replace the build |

## Release pipeline

Agreed with the user on 2026-10-15: watch the extension repos, pull released extensions into the bundle, publish the extension pack, and build the editor with the extensions inside.

### How the extensions reach modders

**Built in, then updated from Open VSX.** EDGEkit ships the released VSIX files as built-in extensions, so the first start works with no network, which is EDGEkit's promise ("nothing to hunt for"). Between EDGEkit releases, a newer version on Open VSX replaces the built-in one, so a fix in EDGEdeck reaches modders without waiting for EDGEkit.

| | Built in (chosen) | The pack installed by the installer (fallback) |
|---|---|---|
| First start | Everything works, even offline | Needs the network during install; if Open VSX is down, the modder starts with a bare editor |
| Redscript IDE | Included, with its language server | Missing: not on Open VSX, and its language server is not in the VSIX |
| Updates | From Open VSX, automatically (below) | From Open VSX as each extension publishes |
| Build | Downloads the pinned released VSIX files | Nothing to download |

**Built-in extensions do update from the gallery, when the product lists them.** Read in upstream's source at 1.140.0 on 2026-10-15 (`extensionsWorkbenchService.ts`, `extensionsScannerService.ts`):

| Rule in upstream | What it means for EDGEkit |
|---|---|
| In a build whose `quality` is `stable`, a built-in extension is never offered an update | Without the next rule, a bundled extension would update only with an EDGEkit release |
| Unless its id is in `product.json`'s `builtInExtensionsEnabledWithAutoUpdates`. Then it is checked and updated like any installed extension, following the modder's auto-update setting | Microsoft uses this for Copilot Chat in 1.140.0. `tools/brand.mjs` fills the list with every EDGE extension in `extensions.json`, replacing upstream's entry |
| Code - OSS's own `product.json` sets no `quality` | `product/product.json` sets `quality` to `stable`; the update service needs it too |

Redscript IDE stays off the list: it ships with its own language server, which a gallery update would not carry. It updates with EDGEkit releases. K3 confirms all this in the built app (an older EDGEdeck built in, a newer one on Open VSX), and the installer fallback stays unused unless that test fails.

The extension pack (`edgemodders.edgekit`) is for modders in VS Code and VSCodium. EDGEkit itself does not need it.

### When EDGEkit releases

Agreed with the user on 2026-10-15. Extensions release often and update themselves inside EDGEkit, so modders should not have to install a new EDGEkit every few days. **A full EDGEkit release happens only when the editor itself changes:**

| Reason for a release | Why the extensions' own updates cannot cover it |
|---|---|
| A newer upstream release (K5, every month or so) | The editor is in the installer |
| A security fix in upstream | The same, and sooner |
| EDGEkit's own changes: branding, the welcome page, the update service, `product.json` | The same |
| A new EDGE extension joins the bundle | Existing installs only gain an extension they do not have through a release (or by installing it themselves) |
| Redscript IDE or its language server changes | Not on the auto-update list (see above) |
| An extension needs a newer editor than EDGEkit has (its `engines.vscode`) | Open VSX will not offer that version to an older EDGEkit; a newer upstream release is needed first |

The pinned extension versions are raised only when a release is being prepared, to the latest released ones, so a fresh install starts current and has little to update.

### The steps

| Step | What | Details |
|---|---|---|
| 1. Watch | Built 2026-10-15: `.github/workflows/watch.yml` runs `tools/watch.mjs` daily (and by hand). It keeps one open issue labelled `watch` with the status of every EDGE extension, and flags what needs EDGEkit: an extension in development, one that needs a newer editor than the pinned upstream, a failed registry lookup. When an extension is newly published, it opens or updates one pull request (branch `watch/pack`) that adds it to `extensions.json` and to `pack/members.json`, with a new pack version and changelog line. Merging it and pushing the `pack-v` tag stay the user's | Release naming differs between repos: REDcode tags `v0.7.0` for REDcode and `theme-v0.3.1` for the theme; EDGEdeck's release asset was `reddeck-0.26.0.vsix` (as REDdeck) while its local build is `edgedeck-win32-x64-*`. So each entry in `extensions.json` gets a release tag pattern and an asset pattern. Can start before K1: it does not need the editor build |
| 2. Pack | A workflow publishes the EDGEkit extension pack to the Marketplace and Open VSX | Two secrets in EDGEkit's repo: a Marketplace token (an Azure DevOps token, which expires within a year, so renew it) and an Open VSX token. EDGEdeck's `verify-tokens.yml` is a model. The pack has its own version, raised when its members change, and lists only extensions published on that registry (on Open VSX it leaves out Redscript IDE). Can ship as soon as REDcode is published |
| 3. Build | A release workflow builds the editor with the pinned extensions inside and makes the installer | Proven on this PC first (K1 to K3); CI copies a build that works rather than debugging a long Code - OSS build in CI. GitHub's hosted Windows runners build VSCodium, so they can likely build EDGEkit; disk and time limits to check in K4 (unverified). A smoke test checks that the app holds every pinned extension at its pinned version. The installer carries the third-party notices, Redscript IDE's and its language server's included |
| 4. Release | The tagged release publishes the installer on GitHub and writes `latest.json` for the update service | EDGEkit's own version scheme to decide in K4: VSCodium uses the upstream version plus a build number (`1.140.06880`), and the update service compares these. Before the build, the pins in `extensions.json` are raised to the latest released versions (a pull request the user merges). Releases are rare, for the reasons above |

Claude Code as a modding assistant: [EDGEplugin](https://github.com/Edgemodders/EDGEplugin) (repo created 2026-10-16, design draft 0.1) is a Claude Code plugin with the modding knowledge as skills and the EDGE MCP servers (REDnode's, REDcode's, later EDGEmat's). EDGEkit does not configure Claude Code itself; its welcome page and docs point to Claude Code from Open VSX and the plugin (EDGEplugin's P4).

## Phases

Phases are numbered K0 to K5, so they do not clash with the other repos' phases. Each ends with a test on this PC.

| Phase | Builds | The test proves |
|---|---|---|
| **K0 Decide** | The K0 decisions below, answered with the user. The current Marketplace and trademark terms, read directly. Which upstream release to pin | The plan and `upstream.json` are agreed |
| **K1 Build** | Code - OSS built from source on this PC, unbranded, with the drafts in `tools/` made to work. Exact tool versions in Dev setup | An unbranded build starts, opens a folder, and installs an extension from Open VSX. Checked 2026-10-18: it starts, opens a folder and signs in to GitHub. Plain Code - OSS has no extension gallery, so the Open VSX install waited for EDGEkit's `product.json`: the branded build installed the REDnode HUD theme 0.3.1 from Open VSX, with `extensions.verifySignature` off in the dev build's settings (since decided: off by default, "Decided after K0"). **Done 2026-10-18** |
| **K2 Brand** | `product.json` branding, icons (app, installer, file types) made from `tools/brand`, the REDnode HUD theme as default, a welcome page. The empty-editor watermark (`src/vs/workbench/browser/parts/editor/media/letterpress-*.svg`, upstream's mark) replaced with EDGEkit's, in light, dark and high-contrast versions made from `tools/brand`. No startup mark: upstream's window first shows an outline of the layout in the theme's colours while the workbench loads (`showSplash`), and EDGEkit leaves that as it is. A mark there was built and then dropped (2026-10-18, the user's call): it flashed for a moment on every launch, and with the one-time onboarding and the Welcome tab it was too much. The text lines the user drafts go to the onboarding or the Welcome tab instead. No separate splash window either. The Windows file details and the installer's publisher, **done 2026-10-18** (`tools/patch-upstream.mjs`): `EDGEkit.exe` says Edgemodders with an Edgemodders MIT copyright (set in `build/lib/electron.ts`); the installer is `EDGEkitSetup.exe`, publisher Edgemodders, linking to edgemodders.ai and EDGEkit's issues and releases, and says "Updating EDGEkit…" in its 13 languages. Upstream also strips the signatures of the native modules and helper programs and stamps "Microsoft Corporation" on all of them (`patchWin32DependenciesTask`), for its own signing; EDGEkit skips that, so each keeps the details its maker built in (most are Microsoft's, some other projects'), rather than claiming them as Edgemodders'. The REDnode HUD theme as the default, **done 2026-10-18**, ahead of K3: it is the first built-in EDGE extension, through upstream's `builtInExtensions` list (`"builtIn": true` in `extensions.json`; `bundle.mjs` copies its VSIX into the checkout with its checksum and Open VSX identity, `brand.mjs` lists it), and `patch-upstream.mjs` makes it the default of `workbench.colorTheme` and `workbench.preferredDarkColorTheme`. K3 adds the other EDGE extensions the same way. The icons and installer images, **done 2026-10-18**: `tools/brand/icons.html` draws them in the HUD style and `tools/brand/icons.ps1` renders them (headless Chrome, ImageMagick) into `product/win32` and `product/workbench`, which `brand.mjs` copies over upstream's. The app icon has a simpler mark at 32 px and under; the 27 file-type icons use text labels (`JS`, `PY`) instead of other projects' logos; the installer's side and corner images come at Inno Setup's 7 scales; the Start menu tile has the HUD background and the name EDGEkit; the in-app logo (`code-icon.svg`: title bar, Welcome page) is the simple mark. Possible later: EDGEkit's own icons and associations for modding files (`.reds`, `.xl`), which upstream does not associate. The empty-editor watermark, **done 2026-10-18**: `letterpress-*.svg` is the EK mark without its tile, in colour and faint on dark themes and one colour on light and high-contrast ones, at upstream's opacities. The trademark sweep, **done 2026-10-18**. The name: `tools/remove-branding.mjs` applies VSCodium's branding patch (`00-brand-remove-branding.patch`: "VS Code" and "Visual Studio Code" become EDGEkit in 95 files, in messages and in text outside them such as the editor playground and the terminal's shell integration), less its Welcome page changes, which wait for EDGEkit's own; then it renames the name in every translated message the patch misses (177 lines in 79 files, mostly features new in 1.140: the Agents window, the agent host, the chat pet). Names in code stay (theme ids, product checks, the "VS Code API"). The logos: the Agents window's own mark and its "open in the editor" button (the VS Code logo), and the icons of the pages the browser shows after a GitHub or Microsoft sign-in, are EDGEkit's (`brand.mjs`); the icon font's two VS Code glyphs show the window glyph; chat's progress indicator never draws upstream's logo; the Agents window's easter egg, fish shaped like upstream's logo, is off (`patch-upstream.mjs`). Left for the Welcome tab: two walkthrough images show the VS Code logo (`welcomeGettingStarted/common/media/learn.svg`, `menuBar.svg`). Left as they are: the chat pet (upstream's mascot, not its logo, shown only after `/vscode-pet`); the issue reporter's "VS Code Version" rows (the base version, which they report); the editor playground's links to Microsoft's docs ("Emmet in VS Code"); and the name in telemetry comments, logs and model prompts, which users do not see. The onboarding's keymap choice "VS Code" goes with the onboarding. Checked in the rebuilt app (2026-10-18): no "VS Code" left in its translated messages (`nls.messages.json`, 253 EDGEkit). The onboarding and Welcome page, **drafted 2026-10-18, for the user's review**. Upstream's one-time onboarding overlay (`src/vs/workbench/contrib/welcomeOnboarding`) stays (the user's call), made EDGEkit's: its first step is a plain GitHub sign-in, saying a GitHub account is what publishing mods on EDGEmods needs (EDGEmods: a mod site and extension, in another session), with GitHub's terms instead of Copilot's and no Copilot setup after it; the Google, Apple and GitHub Enterprise buttons are not shown. Its theme cards (`onboardingThemes` in `product/product.json`) start with REDnode HUD, with a HUD preview (`product/onboarding`), and its keymap choice "VS Code" is "Default". The Welcome page's first walkthrough is EDGEkit's own, "Get started with EDGEkit" (`product/welcome/edgekitWalkthrough.ts` and its images, which `brand.mjs` copies in): sign in with GitHub, install the EDGEkit pack, set REDcode's game folder, the HUD theme, open a mod, the docs. Upstream's desktop setup walkthrough (Copilot, a theme picker, Microsoft's videos) and the chat "Generate New Workspace" entry are hidden, not deleted, so the build's unused-code check passes; "Learn the Fundamentals" stays. The page's subtitle is "The Edgemodders editor for Cyberpunk 2077 mods" (upstream: "Editing evolved"). All in `patch-upstream.mjs` | The installed app says EDGEkit everywhere and never VS Code, from its first window; its data lives in its own folders, beside an installed VS Code without touching it |
| **K3 Bundle** | The EDGE extensions shipped as built-in extensions, from their released VSIX files at pinned versions (upstream's `builtInExtensions` list, if it fits), Redscript IDE with its language server, and a third-party notices file with every bundled project's license | A fresh install has REDcode, the theme, EDGEdeck, Redscript IDE and the other published EDGE extensions, with no network; an older built-in EDGEdeck updates itself from Open VSX |
| **K4 Release** | The release pipeline in GitHub Actions: the daily watch and its status issue (may start earlier), the extension pack published to both registries (may ship earlier), and a Windows installer built on a pinned upstream tag and pinned extension versions downloaded from each extension repo's GitHub releases. EDGEkit's version scheme; updates through GitHub releases and the update service | A tagged release produces an installer anyone can download and install, and an older install updates itself to it. A new EDGE extension in the organization shows in the status issue within a day |
| **K5 Track upstream** | A routine for moving to a newer upstream release every month or so, or sooner for a security fix, preferring one VSCodium has already shipped: bump the tag, rebuild, smoke test, release | A move to a newer release ships within a week of starting it, by checklist |

## K0 decisions

Answered with the user on 2026-10-15.

| Question | Decision |
|---|---|
| The product name in the app | **EDGEkit.** It is the window title, the installer name and the data folder (`.edgekit`), as `product/product.json` already says |
| Does "REDcode" stay a name? | **EDGEkit is the editor plus its extensions.** REDcode stays the name of its own extension. For VS Code users there is an EDGEkit extension pack, below |
| Platforms | **Windows x64 only for now.** Linux can come later |
| Code signing | **A certificate later.** Early releases are unsigned, and the download page says how to get past the SmartScreen warning |
| AI in the editor | **Claude Code runs in EDGEkit, from Open VSX.** Checked 2026-10-15: `Anthropic/claude-code` 2.1.300 is on Open VSX with a win32-x64 build. Its license is Anthropic's own, so EDGEkit does not bundle it; modders install it from the Extensions view. REDagent stays the built-in assistant. **No Copilot** (the user, 2026-10-15): EDGEkit ships none of it and does not point modders to it |
| Updates | **Code - OSS's update service, pointed at EDGEkit's GitHub releases.** How it works is below |
| Trademarks | **Read by the user on 2026-10-15.** Extension listings on the Marketplace, and docs about them, use "*Name* for Visual Studio Code", the standard convention: for example "EDGEkit for Visual Studio Code" for the extension pack. No Microsoft icons, logos or brand names that imply a connection to Microsoft or its endorsement. The EDGEkit app keeps its own name and icon everywhere. Sources: the [Marketplace Terms of Use](https://aka.ms/vsmarketplace-ToU) (PDF), [Microsoft's trademark guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks), the [VS Code brand guidelines](https://code.visualstudio.com/brand), upstream's [Differences between the repository and Visual Studio Code](https://github.com/microsoft/vscode/wiki/Differences-between-the-repository-and-Visual-Studio-Code), and the [Open VSX registry FAQ](https://www.eclipse.org/legal/open-vsx-registry-faq/) |
| Upstream release | **1.140.0** (2026-09-30), in `upstream.json`. VSCodium's latest release (1.140.06880) is built on it, so its patches are a known-good reference while K1 gets the first build working |

Still open, to settle in K1:

| Question | Notes |
|---|---|
| How to leave Copilot out | Decided: no Copilot (K0 decisions). Checked 2026-10-15: upstream's build puts it in the app (`build/gulpfile.vscode.ts` compiles `extensions/copilot` and packs the `@github/copilot-sdk` runtime), so a plain Code - OSS build has it. VSCodium removes it with two patches: `52-ext-copilot-remove-it.json` (deletes `extensions/copilot` and Copilot's agent code) and `53-ext-copilot-remove-it.patch` (takes it out of the build, `package.json` and the lockfiles). EDGEkit takes both (MIT) from VSCodium's release built on 1.140.0 (`1.140.06880`) with `tools/remove-copilot.mjs`, which downloads them rather than committing them. They change the dependencies, so they apply before `npm ci`. **Moved into K1** (2026-10-16): plain upstream's local build stops at packaging, `[prepareBuiltInCopilotRipgrepShim] Copilot SDK directory not found` (upstream's CI builds Copilot separately), so K1 builds without Copilot. The patches also remove the Copilot and Claude agents in upstream's agent host (`src/vs/platform/agentHost/node/copilot` and `claude`); Claude Code comes from Open VSX instead |
| User or system installer | Code - OSS can build both. The user installer needs no admin rights and is what VS Code offers first; it is the likely choice |

Decided after K0:

| Question | Decision |
|---|---|
| Extension signature checks | **Off by default, as in other Open VSX clients** (the user, 2026-10-18, after checking popular editors that use Open VSX: they all ship with it off). Found in K1: installing from Open VSX failed with "Signature verification was not executed". The app checks a gallery extension's signature with Microsoft's `vsce-sign`, which is closed source and not part of Code - OSS, so the check cannot run. The check is all or nothing: it covers every extension installed from the gallery, not only the EDGE ones. Downloads still come from Open VSX over HTTPS. `tools/patch-upstream.mjs` sets the default of `extensions.verifySignature` to `false`, and the fallback the command line uses. Unlike VSCodium's patch (`00-extension-disable-signature-verification.patch`), the setting still tells the truth: it shows as off, and turning it on makes installs fail as before. Checked on the rebuild (2026-10-18): with empty settings, the command line installs the HUD theme from Open VSX |

## The EDGEkit extension pack

For modders who stay in VS Code or VSCodium: one extension, `edgemodders.edgekit` (display name EDGEkit), that installs every EDGE extension.

| | |
|---|---|
| What it is | An extension pack: a `package.json` with an `extensionPack` list and no code. Installing it installs every extension in the list; uninstalling it offers to remove them |
| What it lists | Every extension in `extensions.json` that is published on the registry: REDcode, the REDnode HUD theme, EDGEdeck and Redscript IDE first; EDGEmat and EDGEwave from pack 0.3.0; REDagent and later EDGE extensions as each one is published |
| Where it lives | In this repo, because it belongs to EDGEkit and not to any one extension: `pack/` (manifest, README, changelog, and `members.json`, what the current pack version lists on each registry), `tools/pack.mjs` (builds one pack per registry from `members.json`, failing if a member is not published there; `--list` compares) and `.github/workflows/pack.yml` (publishes on a `pack-v*` tag, with the organisation's `VSCE_PAT` and `OVSX_PAT`). The watch keeps `members.json` current |
| Not in the app | The EDGEkit app does not include the pack: its extensions are already built in |
| What it needs | VS Code installs pack members from the Microsoft Marketplace, and VSCodium from Open VSX, so each member must be published to both. A pack should list only published extensions: a missing one may stop the whole pack installing (unverified). `tools/extensions-status.mjs` shows which are ready. Checked 2026-10-15: REDdeck (now EDGEdeck) and the theme are on both; REDcode is being published; Redscript IDE is on the Marketplace only, so VSCodium users would not get it |
| When | REDcode reached both registries on 2026-10-15 (0.8.2, as `edgemodders.redcode-cyberpunk`). Pack 0.1.0 is built: on the Marketplace it lists REDcode, the theme, REDdeck (`edgemodders.reddeck`, now EDGEdeck) and Redscript IDE; on Open VSX the first three. **Published 2026-10-16** as a preview on both registries (release `pack-v0.1.0`). Pack 0.2.0 (`pack-v0.2.0`, 2026-10-17) lists EDGEdeck (`edgemodders.edgedeck`) in place of REDdeck on both registries. Pack 0.3.0 (2026-10-21, built, not yet published) adds EDGEmat and EDGEwave on both registries. A new member means a new pack version, which the watch proposes |

## Updates

Code - OSS has an update service built in, switched off because upstream's `product.json` has no `updateUrl`. EDGEkit switches it on and points it at its own releases. **Unverified:** from upstream's source and VSCodium as remembered, to check against the pinned upstream in K4.

| Part | What it does |
|---|---|
| `product.json` | `updateUrl` (where to ask), `quality` (`stable`), `downloadUrl` (the releases page) and `releaseNotesUrl` |
| The check | The app asks `{updateUrl}/api/update/{platform}/{quality}/{commit}`, for example platform `win32-x64-user`. The answer is "nothing new" or a small JSON file: the installer's URL, its version, the upstream commit and its SHA-256 hash |
| The install | On Windows the app downloads the installer, checks the hash, and runs it quietly when the user restarts |
| EDGEkit's answer | GitHub releases cannot answer that URL, because it changes with every commit. VSCodium's way: a small patch makes the app ask a fixed path instead (`{updateUrl}/{quality}/{platform}/{arch}/latest.json`), and the release workflow writes that file. EDGEkit can publish it on its GitHub Pages site, pointing at the installer in the GitHub release |

The other services in `product.json`: the extension gallery is Open VSX (set); telemetry is off (set); Settings Sync uses Microsoft's servers and stays off.
