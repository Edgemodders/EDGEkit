# EDGE<span class="y">kit</span> design

EDGEkit is the Edgemodders editor: a build of Code - OSS, the open-source core of VS Code, with Edgemodders branding and every EDGE tool built in. A modder installs one app and gets REDcode's editors, the REDnode HUD theme, EDGEdeck's mod manager, EDGEmat, EDGEwave and Redscript IDE, with no extension hunting, and Claude Code on the first start. REDagent's editor view joins when it exists (its phase C6, not started).

**Status (2026-10-24): EDGEkit 1.140.1, the first release, was published on 2026-10-22.** K0 was decided on 2026-10-15 and K1 done on 2026-10-18. K2 is done except the user's review of the onboarding and Welcome text. K3 was done on 2026-10-21. K4 is under way: the release workflow, updates and the first release are done; extension pack 0.3.0 (with EDGEmat and EDGEwave) is built and not yet published, and a real **Restart to Update** from an installed release has not been seen yet. Claude Code for EDGE (below) is built for the next release. K5 has not started. The roadmap table is on the [docs home](index.html).

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
| 2. Brand | `tools/brand.mjs` | Merges `product/product.json` into upstream's `product.json`: names, ids, data folders, URLs, Open VSX; also copies EDGEkit's icons, Welcome walkthrough and onboarding images over upstream's (K2) |
| 3. Bundle | `tools/bundle.mjs` | Downloads each EDGE extension in `extensions.json` at its pinned version from Open VSX, and builds Redscript IDE from its source; with `--local`, builds each sibling repo with its own script instead (for example REDcode's `npm run redcode:package`). Puts them in the app as built-in extensions through upstream's `builtInExtensions` list in `product.json` ("Bundled extensions") |
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
| Each extension has its own repo | REDcode's repo holds REDcode and the HUD theme; EDGEdeck, EDGEwave, EDGEmat and the other EDGE extensions live in their own repos. EDGEkit takes each one's released VSIX, never its source |

| Where EDGEkit gets them | How |
|---|---|
| Every build (K3, 2026-10-21) | `tools/bundle.mjs` downloads the version pinned in `extensions.json` (`version`) from **Open VSX**: the Windows x64 file where an extension has one, else the universal one, checked against Open VSX's SHA-256 and kept in `build/downloads`. Open VSX is where the built-in extensions update from afterwards, so a release ships exactly what modders' updates bring; the extension repos' publish workflows put every release there. Each EDGEkit release says which versions it holds and can be rebuilt. Not GitHub releases, as first planned: REDcode's does not carry the theme's VSIX. Not the VS Code Marketplace: its terms limit its extensions to Microsoft's products (the user asked, 2026-10-21) |
| Testing unreleased extension work | `tools/bundle.mjs --local` (or `"localExtensions": true` in `local.json`) builds each sibling repo with its own script and takes the newest VSIX, as K1 to K2 did |
| Third-party (Redscript IDE) | Built from its source at a pinned commit (`"from": "source"`, `commit`), in `build/src`. Its repo's tags stop at 0.2.2, so the pin is the 0.3.4 commit; its lock file is out of step there, so `npm install` instead of `npm ci`. Open VSX can replace the build once it is there |
| Claude Code | **Not shipped: installed from Open VSX on EDGEkit's first start.** Its license is Anthropic's own ("All rights reserved", checked on Open VSX 2026-10-21) and grants no right to redistribute, so EDGEkit may not put its files in the installer. `product.json`'s `edgekitFirstRunExtensions` lists it, and EDGEkit's own `product/extensions/edgekitFirstRun.ts` installs each listed extension once (the user, 2026-10-21; EDGEchat needs it). One the modder uninstalls stays uninstalled; offline, it tries again at the next start. Then EDGEkit offers to set up EDGEchat ("Claude Code for EDGE", below) |
| Licenses | `bundle.mjs` writes each built-in extension's license and third-party notices into `ThirdPartyNotices-EDGEkit.txt` in the checkout, and `patch-upstream.mjs` adds it to the files upstream's packaging ships beside its own `ThirdPartyNotices.txt`. Not in a `licenses/` folder: the installer takes that for Microsoft's license translations (`LICENSE-deu.rtf`), and its build failed (2026-10-21) |

Git submodules would also pin exact commits, but every update takes commits in two repos; pinned release versions are simpler.

| Extension | Pinned (2026-10-21) | Notes |
|---|---|---|
| REDcode for Cyberpunk 2077 (`edgemodders.redcode-cyberpunk`, renamed from `edgemodders.redcode` in 0.8.0: the Marketplace already had a "redcode") | 0.10.3, Windows x64 | Built in. Local: REDcode, `npm run redcode:package` |
| REDnode HUD theme (`edgemodders.rednode-hud-theme`) | 0.3.1 | Built in, the default theme. Local: REDcode, `npm run theme:package` |
| EDGEdeck (`edgemodders.edgedeck`) | 0.27.3, Windows x64 | Built in. The mod manager. Renamed from REDdeck (`edgemodders.reddeck`) on 2026-10-17, with no old names kept. Local: EDGEdeck, `npm run package` |
| EDGEmat (`edgemodders.edgemat`) | 0.3.1, Windows x64 | Built in. The material editor, with its MCP server inside the VSIX from 0.3.1. Local: EDGEmat, `npm run edgemat:package` |
| EDGEwave (`edgemodders.edgewave`) | 0.1.0 | Built in. The sound studio. Needs REDcode (`extensionDependencies`). Local: EDGEwave, `npm run package` (the VSIX lands in the repo's root) |
| Redscript IDE (`jac3km4.redscript-ide-vscode`) | 0.3.4, commit `08684a0` | Built in, from its source (MIT). The extension downloads its language server (`redscript-ide.exe`, MIT) from GitHub on first use; shipping it beside the extension, with `redscript.idePath` pointing there, so it works offline, is left for later |
| Claude Code (`anthropic.claude-code`) | Latest, at first start | Installed from Open VSX on the first start, not shipped (above) |
| REDagent's editor view (id to be decided; `edgemodders.redagent` is a placeholder) | - | Not started. REDagent today is a REDnode package that runs in the game (C5 passed in game). C6 adds a view in the editor's activity bar; whether that is its own extension or part of REDcode is REDagent's decision. The in-game part is not an editor extension, so EDGEkit does not bundle it |

**No Copilot chat or Agents window** (the user, 2026-10-21: EDGEkit uses the Claude Code extension). `patch-upstream.mjs` turns upstream's own switch, `chat.disableAIFeatures`, on by default: it hides the chat UI, inline suggestions and Copilot's sign-in, keeps the Agents window from opening (`chatSetupHidden` is in its precondition) and leaves the agent host off. It stays a setting. Upstream also skips its onboarding when AI features are hidden, so that took EDGEkit's onboarding away (found by the user, 2026-10-21); EDGEkit's has no AI step, so `patch-upstream.mjs` turns that check off.

## Release pipeline

Agreed with the user on 2026-10-15: watch the extension repos, pull released extensions into the bundle, publish the extension pack, and build the editor with the extensions inside.

### How the extensions reach modders

**Built in, then updated from Open VSX.** EDGEkit ships the released VSIX files as built-in extensions, so the first start works with no network, which is EDGEkit's promise ("nothing to hunt for"). Between EDGEkit releases, a newer version on Open VSX replaces the built-in one, so a fix in EDGEdeck reaches modders without waiting for EDGEkit.

| | Built in (chosen) | The pack installed by the installer (fallback) |
|---|---|---|
| First start | Everything works, even offline | Needs the network during install; if Open VSX is down, the modder starts with a bare editor |
| Redscript IDE | Included (its language server downloads on first use, for now) | Missing: not on Open VSX |
| Updates | From Open VSX, automatically (below) | From Open VSX as each extension publishes |
| Build | Downloads the pinned released VSIX files | Nothing to download |

**Built-in extensions do update from the gallery, when the product lists them.** Read in upstream's source at 1.140.0 on 2026-10-15 (`extensionsWorkbenchService.ts`, `extensionsScannerService.ts`):

| Rule in upstream | What it means for EDGEkit |
|---|---|
| In a build whose `quality` is `stable`, a built-in extension is never offered an update | Without the next rule, a bundled extension would update only with an EDGEkit release |
| Unless its id is in `product.json`'s `builtInExtensionsEnabledWithAutoUpdates`. Then it is checked and updated like any installed extension, following the modder's auto-update setting | Microsoft uses this for Copilot Chat in 1.140.0. `tools/brand.mjs` fills the list with every EDGE extension in `extensions.json`, replacing upstream's entry |
| Code - OSS's own `product.json` sets no `quality` | `product/product.json` sets `quality` to `stable`; the update service needs it too |

Redscript IDE stays off the list: it is not on Open VSX, so it updates with EDGEkit releases. K3 tested this in the built app on 2026-10-21: with EDGEmat 0.3.0 built in and 0.3.1 on Open VSX, a fresh profile updated it to 0.3.1 at start, with no prompt.

On the first start, upstream asks before Claude Code installs: "Do you trust the publisher Anthropic?" (its first extension from that publisher; the EDGE extensions are built in, so they never ask). EDGEkit keeps the question: it is the modder's consent to a third-party extension. The dialog says Anthropic is "not verified" although Open VSX marks the extension verified (checked 2026-10-21); Open VSX's VS Code-style API seems not to pass that on (unverified).

**Claude Code for EDGE** (the user's call, 2026-10-23, asked by EDGEchat in [#5](https://github.com/Edgemodders/EDGEkit/issues/5)). [EDGEchat](https://github.com/Edgemodders/EDGEchat) is the EDGE plugin for Claude Code: modding skills and the EDGE MCP servers. Claude Code has no API through which an editor extension adds a plugin, so EDGEkit writes the two settings that make Claude Code fetch it. Once Claude Code is installed, `edgekitFirstRun.ts` asks once: "Set up Claude Code for EDGE?" Any answer, or closing the question, counts; a modder who already has the plugin (on or off) is not asked. The command **EDGEkit: Set Up Claude Code for EDGE** does the same at any time, and the Welcome page links to it.

| Point | What EDGEkit does |
|---|---|
| The file | Claude Code's user settings: `%CLAUDE_CONFIG_DIR%\settings.json` when that variable is set, else `%USERPROFILE%\.claude\settings.json`. A plugin enabled only in a project's `.claude/settings.json` is not fetched, so not there |
| The two keys | `extraKnownMarketplaces.edgemodders` = `{ "source": { "source": "github", "repo": "Edgemodders/EDGEchat" } }` and `enabledPlugins["edge@edgemodders"]` = `true` (shapes from Claude Code's settings reference, read 2026-10-23). The names are in `product.json`'s `edgekitClaudePlugin` |
| Merge, not replace | The file is strict JSON and Claude Code and other tools write to it. EDGEkit edits only those two keys and keeps the rest and the layout (upstream's `jsonEdit`). A marketplace already named `edgemodders`, such as a modder's own checkout, is kept |
| When it cannot | A file that is not plain JSON, or cannot be read or written, is left alone; EDGEkit shows the two commands for Claude Code's chat instead, with a Copy button: `/plugin marketplace add Edgemodders/EDGEchat`, then `/plugin install edge@edgemodders` |
| What follows | Claude Code's next session clones the marketplace, fetches the plugin and says "Plugins changed. Run /reload-plugins to activate." The plugin's settings form (REDnode token, game folder and so on) may not open by itself; `/edge:setup` names each missing one |
| Tested 2026-10-23 | In the built app, with a throwaway `CLAUDE_CONFIG_DIR` and profile: the question showed once Claude Code 2.1.309 had installed, and Set Up added both keys; the command merged them into a file with other keys and kept its layout; a file with a comment was left as it was, with the fallback shown. **Unverified:** that a signed-in Claude Code then fetches the plugin (the test's had no sign-in and stopped at "Not logged in" before fetching). Claude Code's docs say what the keys do, not that another program may write them |

**Show me (where it lives decided 2026-10-26; not built).** EDGEchat asked in [#6](https://github.com/Edgemodders/EDGEkit/issues/6) (2026-10-26) for a local "show me" MCP server, so that Claude Code can open an EDGE tool's view, select an item, point at a button and run the tool's command while the modder watches. Claude Code's VS Code extension gives the model no tools for the editor's UI, so this needs something inside the editor. What the editor allows, read in upstream's API at 1.140.0 on 2026-10-26:

| Tool | Who can do it | Note |
|---|---|---|
| `ui_open` | Any extension | Every view has a built-in `<view id>.focus` command (`edgedeck.mods.focus`, `redcode.project.focus`); EDGEdeck's page has `edgedeck.openPage`; files open with `vscode.open` |
| `ui_select` | Only the extension that owns the view | A tree view's `reveal` is on the object its owner made; no command selects another extension's item. So each EDGE extension adds one small command, for example `edgedeck.ui.reveal({ id })` |
| `ui_hint` | An extension: a notification, or inside its own webview. **EDGEkit's app:** an outline on any toolbar button | No extension API points at another view's button. EDGEkit's own workbench code can find a toolbar action by its command id and outline it with a hover note (EDGEkit only; elsewhere the hint falls back to a notification) |
| `ui_run` | Any extension | `executeCommand` with the commands EDGE extensions already have (`redcode.packAndInstall`, `edgedeck.deploy`, `edgedeck.undo`, ...), from an allow-list; those that change files or the game folder ask first (`anthropic/requiresUserInteraction`) |
| `ui_state` | Partly | Open editors and the active one are public; which view is visible and what is selected in it only its owner knows, so the same small command per extension answers it |

The server itself is an HTTP server on `127.0.0.1`, which runs in the extension host (Node), not in the workbench. So it is **an extension** (the user, 2026-10-26), its name to be decided (`edgemodders.edge-guide` is a placeholder), in its own repo (extensions stay in their own repos), in the pack and built into EDGEkit, so it also works in VS Code. Plus, in each EDGE extension, a `ui.reveal`/`ui.state` command (asks of those repos), and in EDGEkit's app the button outline. The alternative, the server inside EDGEkit's app, would need EDGEkit's own patches to the main process and would not reach modders in VS Code. Its repo and name are the user's to create; EDGEchat's first release does not need it.

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
| 1. Watch | Built 2026-10-15: `.github/workflows/watch.yml` runs `tools/watch.mjs` daily (and by hand). It keeps one open issue labelled `watch` with the status of every EDGE extension, and flags what needs EDGEkit: an extension in development, one that needs a newer editor than the pinned upstream, a failed registry lookup. When an extension is newly published, it opens or updates one pull request (branch `watch/pack`) that adds it to `extensions.json` and to `pack/members.json`, with a new pack version and changelog line. Merging it and releasing the pack (Pack workflow, Make a release) stay the user's | Release naming differs between repos: REDcode tags `v0.7.0` for REDcode and `theme-v0.3.1` for the theme; EDGEdeck's release asset was `reddeck-0.26.0.vsix` (as REDdeck) while its local build is `edgedeck-win32-x64-*`. So each entry in `extensions.json` gets a release tag pattern and an asset pattern. Can start before K1: it does not need the editor build |
| 2. Pack | A workflow publishes the EDGEkit extension pack to the Marketplace and Open VSX | Two secrets in EDGEkit's repo: a Marketplace token (an Azure DevOps token, which expires within a year, so renew it) and an Open VSX token. EDGEdeck's `verify-tokens.yml` is a model. The pack has its own version, raised when its members change, and lists only extensions published on that registry (on Open VSX it leaves out Redscript IDE). Can ship as soon as REDcode is published |
| 3. Build | A release workflow builds the editor with the pinned extensions inside and makes the installer | Proven on this PC first (K1 to K3); CI copies a build that works rather than debugging a long Code - OSS build in CI. GitHub's hosted Windows runners build it: the first run on `windows-2022` (2026-10-22) took 17 minutes and 8.9 GB of disk. A check (`tools/check-build.mjs`) proves that the app holds every pinned extension at its pinned version. The installer carries the third-party notices, Redscript IDE's and its language server's included |
| 4. Release | The tagged release publishes the installer on GitHub and writes the update manifest on the docs site ("Updates"). The release workflow (`.github/workflows/release.yml`, written 2026-10-21, REDnode's mechanism: Run workflow builds and keeps the installer, "Make a release" ticked also publishes) runs `tools/release.mjs` for both | EDGEkit's version: upstream major and minor, then EDGEkit's release number (`1.140.1`; decided 2026-10-21, "Updates"). Before the build, the pins in `extensions.json` are raised to the latest released versions (a pull request the user merges). Releases are rare, for the reasons above |

Claude Code as a modding assistant: [EDGEchat](https://github.com/Edgemodders/EDGEchat) (repo created 2026-10-16 as EDGEplugin, renamed 2026-10-17; the plugin is `edge`, its marketplace `edgemodders`) is a Claude Code plugin with the modding knowledge as skills and the EDGE MCP servers (REDnode's, REDcode's, EDGEdeck's, EDGEmat's). EDGEkit installs Claude Code on the first start and sets up the plugin with one click ("Claude Code for EDGE", above); its Welcome page links to that, and its docs will say how (EDGEchat's P4).

## Phases

Phases are numbered K0 to K5, so they do not clash with the other repos' phases. Each ends with a test on this PC.

| Phase | Builds | The test proves |
|---|---|---|
| **K0 Decide** | The K0 decisions below, answered with the user. The current Marketplace and trademark terms, read directly. Which upstream release to pin | The plan and `upstream.json` are agreed |
| **K1 Build** | Code - OSS built from source on this PC, unbranded, with the drafts in `tools/` made to work. Exact tool versions in Dev setup | An unbranded build starts, opens a folder, and installs an extension from Open VSX. Checked 2026-10-18: it starts, opens a folder and signs in to GitHub. Plain Code - OSS has no extension gallery, so the Open VSX install waited for EDGEkit's `product.json`: the branded build installed the REDnode HUD theme 0.3.1 from Open VSX, with `extensions.verifySignature` off in the dev build's settings (since decided: off by default, "Decided after K0"). **Done 2026-10-18** |
| **K2 Brand** | `product.json` branding, icons (app, installer, file types) made from `tools/brand`, the REDnode HUD theme as default, a welcome page. The empty-editor watermark (`src/vs/workbench/browser/parts/editor/media/letterpress-*.svg`, upstream's mark) replaced with EDGEkit's, in light, dark and high-contrast versions made from `tools/brand`. No startup mark: upstream's window first shows an outline of the layout in the theme's colours while the workbench loads (`showSplash`), and EDGEkit leaves that as it is. A mark there was built and then dropped (2026-10-18, the user's call): it flashed for a moment on every launch, and with the one-time onboarding and the Welcome tab it was too much. The text lines the user drafts go to the onboarding or the Welcome tab instead. No separate splash window either. The Windows file details and the installer's publisher, **done 2026-10-18** (`tools/patch-upstream.mjs`): `EDGEkit.exe` says Edgemodders with an Edgemodders MIT copyright (set in `build/lib/electron.ts`); the installer is `EDGEkitSetup.exe`, publisher Edgemodders, linking to edgemodders.ai and EDGEkit's issues and releases, and says "Updating EDGEkit…" in its 13 languages. Upstream also strips the signatures of the native modules and helper programs and stamps "Microsoft Corporation" on all of them (`patchWin32DependenciesTask`), for its own signing; EDGEkit skips that, so each keeps the details its maker built in (most are Microsoft's, some other projects'), rather than claiming them as Edgemodders'. The REDnode HUD theme as the default, **done 2026-10-18**, ahead of K3: it is the first built-in EDGE extension, through upstream's `builtInExtensions` list (`"builtIn": true` in `extensions.json`; `bundle.mjs` copies its VSIX into the checkout with its checksum and Open VSX identity, `brand.mjs` lists it), and `patch-upstream.mjs` makes it the default of `workbench.colorTheme` and `workbench.preferredDarkColorTheme`. K3 adds the other EDGE extensions the same way. The icons and installer images, **done 2026-10-18**: `tools/brand/icons.html` draws them in the HUD style and `tools/brand/icons.ps1` renders them (headless Chrome, ImageMagick) into `product/win32` and `product/workbench`, which `brand.mjs` copies over upstream's. The app icon has a simpler mark at 32 px and under; the 27 file-type icons use text labels (`JS`, `PY`) instead of other projects' logos; the installer's side and corner images come at Inno Setup's 7 scales; the Start menu tile has the HUD background and the name EDGEkit; the in-app logo (`code-icon.svg`: title bar, Welcome page) is the simple mark. Possible later: EDGEkit's own icons and associations for modding files (`.reds`, `.xl`), which upstream does not associate. The empty-editor watermark, **done 2026-10-18**: `letterpress-*.svg` is the EK mark without its tile, in colour and faint on dark themes and one colour on light and high-contrast ones, at upstream's opacities. The trademark sweep, **done 2026-10-18**. The name: `tools/remove-branding.mjs` applies VSCodium's branding patch (`00-brand-remove-branding.patch`: "VS Code" and "Visual Studio Code" become EDGEkit in 95 files, in messages and in text outside them such as the editor playground and the terminal's shell integration), less its Welcome page changes, which wait for EDGEkit's own; then it renames the name in every translated message the patch misses (177 lines in 79 files, mostly features new in 1.140: the Agents window, the agent host, the chat pet). Names in code stay (theme ids, product checks, the "VS Code API"). The logos: the Agents window's own mark and its "open in the editor" button (the VS Code logo), and the icons of the pages the browser shows after a GitHub or Microsoft sign-in, are EDGEkit's (`brand.mjs`); the icon font's two VS Code glyphs show the window glyph; chat's progress indicator never draws upstream's logo; the Agents window's easter egg, fish shaped like upstream's logo, is off (`patch-upstream.mjs`). Left for the Welcome tab: two walkthrough images show the VS Code logo (`welcomeGettingStarted/common/media/learn.svg`, `menuBar.svg`). Left as they are: the chat pet (upstream's mascot, not its logo, shown only after `/vscode-pet`); the issue reporter's "VS Code Version" rows (the base version, which they report); the editor playground's links to Microsoft's docs ("Emmet in VS Code"); and the name in telemetry comments, logs and model prompts, which users do not see. The onboarding's keymap choice "VS Code" goes with the onboarding. Checked in the rebuilt app (2026-10-18): no "VS Code" left in its translated messages (`nls.messages.json`, 253 EDGEkit). The onboarding and Welcome page, **drafted 2026-10-18, for the user's review**. Upstream's one-time onboarding overlay (`src/vs/workbench/contrib/welcomeOnboarding`) stays (the user's call), made EDGEkit's: its first step is a plain GitHub sign-in, saying a GitHub account is what publishing mods on EDGEmods needs (EDGEmods: a mod site and extension, in another session), with GitHub's terms instead of Copilot's and no Copilot setup after it; the Google, Apple and GitHub Enterprise buttons are not shown. Its theme cards (`onboardingThemes` in `product/product.json`) start with REDnode HUD, with a HUD preview (`product/onboarding`), and its keymap choice "VS Code" is "Default". The Welcome page's first walkthrough is EDGEkit's own, "Get started with EDGEkit" (`product/welcome/edgekitWalkthrough.ts` and its images, which `brand.mjs` copies in): sign in with GitHub, install the EDGEkit pack, set REDcode's game folder, the HUD theme, open a mod, the docs. Upstream's desktop setup walkthrough (Copilot, a theme picker, Microsoft's videos) and the chat "Generate New Workspace" entry are hidden, not deleted, so the build's unused-code check passes; "Learn the Fundamentals" stays. The page's subtitle is "The Edgemodders editor for Cyberpunk 2077 mods" (upstream: "Editing evolved"). All in `patch-upstream.mjs` | The installed app says EDGEkit everywhere and never VS Code, from its first window; its data lives in its own folders, beside an installed VS Code without touching it |
| **K3 Bundle** | The EDGE extensions shipped as built-in extensions, from their released VSIX files at pinned versions (upstream's `builtInExtensions` list, if it fits), Redscript IDE with its language server, and a third-party notices file with every bundled project's license | A fresh install has REDcode, the theme, EDGEdeck, Redscript IDE and the other published EDGE extensions, with no network; an older built-in EDGEdeck updates itself from Open VSX |
| **K4 Release** | The release pipeline in GitHub Actions: the daily watch and its status issue (may start earlier), the extension pack published to both registries (may ship earlier), and a Windows installer built on a pinned upstream tag and pinned extension versions downloaded from Open VSX (first planned from each extension repo's GitHub releases; "Bundled extensions" says why not). EDGEkit's version scheme; updates through GitHub releases and the update service | A tagged release produces an installer anyone can download and install, and an older install updates itself to it. A new EDGE extension in the organization shows in the status issue within a day |
| **K5 Track upstream** | A routine for moving to a newer upstream release every month or so, or sooner for a security fix, preferring one VSCodium has already shipped: bump the tag, rebuild, smoke test, release | A move to a newer release ships within a week of starting it, by checklist |

## K0 decisions

Answered with the user on 2026-10-15.

| Question | Decision |
|---|---|
| The product name in the app | **EDGEkit.** It is the window title, the installer name and the data folder (`.edgekit`), as `product/product.json` already says |
| Does "REDcode" stay a name? | **EDGEkit is the editor plus its extensions.** REDcode stays the name of its own extension. For VS Code users there is an EDGEkit extension pack, below |
| Platforms | **Windows x64 only for now.** Linux can come later |
| Code signing | **A certificate later.** Early releases are unsigned, and the download page says how to get past the SmartScreen warning |
| AI in the editor | **Claude Code runs in EDGEkit, from Open VSX.** Checked 2026-10-15: `Anthropic/claude-code` 2.1.300 is on Open VSX with a win32-x64 build. Its license is Anthropic's own, so EDGEkit does not bundle it; modders install it from the Extensions view (since 2026-10-21, EDGEkit installs it from Open VSX on the first start: "Bundled extensions"). REDagent stays the built-in assistant (its editor view, REDagent's C6, has not started; today REDagent runs in the game as a REDnode package). **No Copilot** (the user, 2026-10-15): EDGEkit ships none of it and does not point modders to it |
| Updates | **Code - OSS's update service, pointed at EDGEkit's GitHub releases.** How it works is below |
| Trademarks | **Read by the user on 2026-10-15.** Extension listings on the Marketplace, and docs about them, use "*Name* for Visual Studio Code", the standard convention: for example "EDGEkit for Visual Studio Code" for the extension pack. No Microsoft icons, logos or brand names that imply a connection to Microsoft or its endorsement. The EDGEkit app keeps its own name and icon everywhere. Sources: the [Marketplace Terms of Use](https://aka.ms/vsmarketplace-ToU) (PDF), [Microsoft's trademark guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks), the [VS Code brand guidelines](https://code.visualstudio.com/brand), upstream's [Differences between the repository and Visual Studio Code](https://github.com/microsoft/vscode/wiki/Differences-between-the-repository-and-Visual-Studio-Code), and the [Open VSX registry FAQ](https://www.eclipse.org/legal/open-vsx-registry-faq/) |
| Upstream release | **1.140.0** (2026-09-30), in `upstream.json`. VSCodium's latest release (1.140.06880) is built on it, so its patches are a known-good reference while K1 gets the first build working |

Left open after K0, both settled in K1:

| Question | Notes |
|---|---|
| How to leave Copilot out | Decided: no Copilot (K0 decisions). Checked 2026-10-15: upstream's build puts it in the app (`build/gulpfile.vscode.ts` compiles `extensions/copilot` and packs the `@github/copilot-sdk` runtime), so a plain Code - OSS build has it. VSCodium removes it with two patches: `52-ext-copilot-remove-it.json` (deletes `extensions/copilot` and Copilot's agent code) and `53-ext-copilot-remove-it.patch` (takes it out of the build, `package.json` and the lockfiles). EDGEkit takes both (MIT) from VSCodium's release built on 1.140.0 (`1.140.06880`) with `tools/remove-copilot.mjs`, which downloads them rather than committing them. They change the dependencies, so they apply before `npm ci`. **Moved into K1** (2026-10-16): plain upstream's local build stops at packaging, `[prepareBuiltInCopilotRipgrepShim] Copilot SDK directory not found` (upstream's CI builds Copilot separately), so K1 builds without Copilot. The patches also remove the Copilot and Claude agents in upstream's agent host (`src/vs/platform/agentHost/node/copilot` and `claude`); Claude Code comes from Open VSX instead |
| User or system installer | Code - OSS can build both. The user installer needs no admin rights and is what VS Code offers first. **Settled in K1:** the user installer (`vscode-win32-x64-user-setup`, platform `win32-x64-user` in the update manifest) |

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
| Where it lives | In this repo, because it belongs to EDGEkit and not to any one extension: `pack/` (manifest, README, changelog, and `members.json`, what the current pack version lists on each registry), `tools/pack.mjs` (builds one pack per registry from `members.json`, failing if a member is not published there; `--list` compares) and `.github/workflows/pack.yml` (Run workflow builds both packs as the run's artifact; with Make a release ticked it publishes with the organisation's `VSCE_PAT` and `OVSX_PAT` and the GitHub release tags `pack-v<version>`; a pushed tag did it until 2026-10-22). The watch keeps `members.json` current |
| Not in the app | The EDGEkit app does not include the pack: its extensions are already built in |
| What it needs | VS Code installs pack members from the Microsoft Marketplace, and VSCodium from Open VSX, so each member must be published to both. A pack should list only published extensions: a missing one may stop the whole pack installing (unverified). `tools/extensions-status.mjs` shows which are ready. Checked 2026-10-15: REDdeck (now EDGEdeck) and the theme are on both; REDcode is being published; Redscript IDE is on the Marketplace only, so VSCodium users would not get it |
| When | REDcode reached both registries on 2026-10-15 (0.8.2, as `edgemodders.redcode-cyberpunk`). Pack 0.1.0 is built: on the Marketplace it lists REDcode, the theme, REDdeck (`edgemodders.reddeck`, now EDGEdeck) and Redscript IDE; on Open VSX the first three. **Published 2026-10-16** as a preview on both registries (release `pack-v0.1.0`). Pack 0.2.0 (`pack-v0.2.0`, 2026-10-17) lists EDGEdeck (`edgemodders.edgedeck`) in place of REDdeck on both registries. Pack 0.3.0 (2026-10-21, built, not yet published) adds EDGEmat and EDGEwave on both registries. A new member means a new pack version, which the watch proposes |

## Updates

Code - OSS has an update service built in, switched off because upstream's `product.json` has no `updateUrl`. EDGEkit switches it on and points it at a static JSON manifest that links to the installer in the GitHub release (agreed with the user, 2026-10-21). Read in upstream's source at 1.140.0 on 2026-10-21 (`src/vs/platform/update`):

| Part | Upstream, as read |
|---|---|
| `product.json` | `updateUrl` (where to ask) and `quality` (`stable`) switch it on; `downloadUrl` and `releaseNotesUrl` feed the notification's links |
| The check | `createUpdateURL` asks `{updateUrl}/api/update/{platform}/{quality}/{commit}`, platform `win32-x64-user` for the user installer, plus `?bg=true&u=none` |
| The answer | JSON with `url` (the installer), `version` (a build id, which also names the downloaded file), `productVersion` (shown to the user) and `sha256hash`; anything without `url`, `version` and `productVersion` means "nothing new" |
| The install | `updateService.win32.ts` downloads the installer beside the app's data, checks the SHA-256, and runs it quietly on restart (or in the background, `update.enableWindowsBackgroundUpdates`), with `inno_updater.exe`, which the build already ships |
| Deciding "newer" | **The app does not compare versions.** Microsoft's server answers "nothing new" when the commit in the URL is current. A static file always answers with the latest release, so without a check the app would offer the same version again and again |
| Before a restart | While an update waits (every 5 minutes) and before it installs on quit, `doIsLatestVersion` asks again and takes any answer but HTTP 204 as "a newer one exists": with a static file it would cancel the waiting update on every quit |
| Background checks | 30 seconds after start, then hourly (`update.mode`, default on). A failed background check is only logged; an error shows only for **Help > Check for Updates** |
| The commit | The build takes it from `BUILD_SOURCEVERSION`, else from git (`build/lib/getVersion.ts`). In the checkout git gives the upstream tag's commit, which every EDGEkit release on it would share; caches are keyed by it and About shows it |

EDGEkit's way, VSCodium's in outline. **Built 2026-10-21** (`037046b`):

| Part | What EDGEkit does |
|---|---|
| The manifest | One static file per platform, `docs/update/latest-win32-x64-user.json`, on the docs site: `{ "url": "https://github.com/Edgemodders/EDGEkit/releases/download/v1.140.1/EDGEkitSetup-1.140.1.exe", "version": "<the build's commit>", "productVersion": "1.140.1", "sha256hash": "...", "timestamp": ... }`. `version` is the commit, as Microsoft's server sends: the app names the download by it. `updateUrl` is `https://edgemodders.github.io/EDGEkit/update`. It is `{}` (nothing new) until the first release. Not a release asset under `releases/latest/download`, as first planned: the extension pack's releases share this repo, and `pack-v0.2.0` holds the "Latest" mark |
| Patch 1, the URL | `createUpdateURL` asks `{updateUrl}/latest-{platform}.json` (`patch-upstream.mjs`) |
| Patch 2, the checks | The first check counts an answer only when its `productVersion` is newer than the app's; the check before a restart only when newer than the waiting update (`isNewerVersion`, `patch-upstream.mjs`) |
| The version | **Decided 2026-10-21 (the user):** the upstream release's major and minor, then EDGEkit's release number on it, from 1: `1.140.1`, `1.140.2`, then `1.141.1` on the next upstream minor. In `version.json`; `brand.mjs` writes it into the checkout's `package.json`, where the build takes the app's, the installer's and the Windows file details' version. Dev builds before the first release are `1.140.0`. An extension asking for an upstream patch version EDGEkit's number has passed (say `^1.140.3` on EDGEkit 1.140.5, built on upstream 1.140.0) would install though the API may lack it; unlikely, as extensions ask for a minor |
| The commit | `build.ps1` sets `BUILD_SOURCEVERSION` to this repo's commit, as VSCodium sets its own |
| Its own folders | Upstream keeps the downloaded installer in `%TEMP%\vscode-stable-user-x64`, an installed VS Code's folder too: the first test (2026-10-21) tried to delete VS Code's waiting update there, stopped only because it was in use, and wrote its `update-metadata.json` over VS Code's. EDGEkit's is `edgekit-stable-user-x64` (`patch-upstream.mjs`). Likewise the shared storage in the home folder is `.edgekit-shared` (`sharedDataFolderName`), not `.vscode-oss-shared`, which every Code - OSS build shares |
| No background install | Upstream installs a downloaded update beside the running app (`update.enableWindowsBackgroundUpdates`, on by default) and `inno_updater` swaps it in on restart. In 1.140 that works only in the versioned layout (`win32VersionedUpdate`: the app's files in a folder named after the commit), which needs **Microsoft's own Electron build** from its Azure feed: stock Electron, which Code - OSS downloads, does not find its files there, and the build's last step failed on its ICU data. Without the versioned layout, the installer puts the update in `_`, and the `inno_updater` 0.26 of 1.140 never finishes it ("New executable not found: new_EDGEkit.exe"; both found 2026-10-21). VSCodium also leaves the versioned layout off. So EDGEkit turns background installs off by default (`patch-upstream.mjs`) |
| Applying it | The update downloads in the background and waits. **Restart to Update** quits the app and runs the installer over it (`/silent`), which starts EDGEkit again: upstream's way for a system install. A plain quit leaves it waiting; the next start offers the restart again. A modder who turns background installs on gets an update that never finishes |
| A release | `tools/release.mjs`, run by the release workflow (or by hand on a PC): checks the build is this pushed commit at `version.json`'s version, newer than the manifest's, with a `CHANGELOG.md` section; makes the GitHub release `v<version>` with `EDGEkitSetup-<version>.exe`, marked Latest; writes the manifest. Committing the manifest switches the update on. The pack's releases are no longer marked Latest (`pack.yml`), so `downloadUrl` (`releases/latest`) opens EDGEkit's |
| The test | `tools/update-test.mjs` serves the last build as an update on `127.0.0.1:8123`; an older build pointed there (`local.json`) finds it (dev setup, "Testing an update") |
| Unsigned installers | The app runs the installer itself, with no download mark from a browser, so SmartScreen should not stop it (unverified) |

The other services in `product.json`: the extension gallery is Open VSX (set); telemetry is off (set); Settings Sync uses Microsoft's servers and stays off.
