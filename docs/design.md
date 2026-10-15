# EDGE<span class="y">kit</span> design

EDGEkit is the EDGEmodders editor: a build of Code - OSS, the open-source core of VS Code, with EDGEmodders branding and every EDGE tool built in. A modder installs one app and gets REDcode's editors, REDnode's views, the REDnode HUD theme, REDdeck's mod manager and REDagent, with no extension hunting.

**Status: K0 decided (2026-10-15).** The repository, the plan and draft scripts exist; nothing has been built yet. Next: K1, the first build of Code - OSS on this PC.

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

Nothing from upstream is committed. The scripts fetch it, change it and build it in `build/`, which git ignores.

| Step | Script | What it does |
|---|---|---|
| 1. Fetch | `tools/fetch-vscode.ps1` | Clones `microsoft/vscode` at the tag in `upstream.json`, shallow, into `build/vscode` |
| 2. Brand | `tools/brand.mjs` | Merges `product/product.json` into upstream's `product.json`: names, ids, data folders, URLs, Open VSX. Icons and the default theme come in K2 |
| 3. Bundle | `tools/bundle.mjs` | On the dev PC, builds each extension in `extensions.json` from its own repo (for example REDcode's `npm run redcode:package`); in CI, downloads the released VSIX at its pinned version instead. Unpacks the VSIX files into `build/extensions`, then into the app as built-in extensions. How Code - OSS takes them is a K3 question; upstream's own `builtInExtensions` list in `product.json` is the likely way (see the release pipeline) |
| 4. Build | `tools/build.ps1` | Runs the three steps, installs upstream's dependencies and runs its Windows build and installer tasks |

The scripts in `tools/` are drafts: written from upstream's documented build, not yet run. K1 runs them and fixes what upstream's build needs.

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
| Each extension has its own repo | REDcode's repo holds REDcode and the HUD theme; REDdeck, EDGEwave, EDGEmat and the other EDGE extensions live in their own repos. EDGEkit bundles each one from its repo's releases |

| Where EDGEkit gets them | How |
|---|---|
| On the dev PC | From the sibling folders: `tools/bundle.mjs` builds each extension with its own script and takes the newest VSIX |
| In a release (K4) | Each extension repo attaches its VSIX to a GitHub release when it tags a version (REDcode and REDdeck already do, through their `publish.yml`, checked 2026-10-15). `extensions.json` pins the version EDGEkit ships (`version`), and CI downloads exactly that file, so every EDGEkit release says which extension versions it holds and can be rebuilt. The build depends on these released files only, never on the extensions' source |
| Third-party (Redscript IDE) | Built from source at a pinned tag, or from Open VSX once it is there |

Git submodules would also pin exact commits, but every update takes commits in two repos; pinned release versions are simpler.

| Extension | From | Status |
|---|---|---|
| REDcode (`edgemodders.redcode`) | REDcode, `npm run redcode:package` | Exists |
| REDnode HUD theme (`edgemodders.rednode-hud-theme`) | REDcode, `npm run theme:package` | Exists. The default theme |
| REDdeck (`edgemodders.reddeck`) | REDdeck, `npm run package` | Exists. The mod manager. Its VSIX is built for `win32-x64` |
| REDagent's editor view (id to be decided; `edgemodders.redagent` is a placeholder) | REDagent, phase C6 | Not started. REDagent today is a REDnode package that runs in the game (C5 passed in game). C6 adds a view in the editor's activity bar; whether that is its own extension or part of REDcode is REDagent's decision. The in-game part is not an editor extension, so EDGEkit does not bundle it |
| EDGEmat (`edgemodders.edgemat`) | EDGEmat, `extensions/edgemat` | Planned extension, no code yet. The material editor (`.mlsetup` first), with an MCP server (`packages/edgemat-mcp`) beside it. M0, the behavior spec, is in progress (checked against the game 2026-10-14); the extension skeleton comes in M1; Open VSX and Marketplace in M6 |
| EDGEwave (`edgemodders.edgewave`) | EDGEwave | In development (0.0.1), no package script yet. The sound studio |
| Redscript IDE (`jac3km4.redscript-ide-vscode`) | Built from its source (MIT) | To bundle in K3, with its notice. Its language server (`redscript-ide.exe`, MIT) ships beside it and `redscript.idePath` points at it, so it works offline. If it reaches Open VSX, that can replace the build |

## Release pipeline

Agreed with the user on 2026-10-15: watch the extension repos, pull released extensions into the bundle, publish the extension pack, and build the editor with the extensions inside.

### How the extensions reach modders

**Built in, then updated from Open VSX.** EDGEkit ships the released VSIX files as built-in extensions, so the first start works with no network, which is EDGEkit's promise ("nothing to hunt for"). Between EDGEkit releases, a newer version on Open VSX replaces the built-in one, so a fix in REDdeck reaches modders without waiting for EDGEkit.

| | Built in (chosen) | The pack installed by the installer (fallback) |
|---|---|---|
| First start | Everything works, even offline | Needs the network during install; if Open VSX is down, the modder starts with a bare editor |
| Redscript IDE | Included, with its language server | Missing: not on Open VSX, and its language server is not in the VSIX |
| Updates | From Open VSX, if built-in extensions update there (to check) | From Open VSX as each extension publishes |
| Build | Downloads the pinned released VSIX files | Nothing to download |

**First thing K3 checks:** whether Code - OSS updates a built-in extension from the gallery automatically, or only when the modder installs a newer one by hand. If only by hand, the installer also runs `edgekit --install-extension` for the pack, and the built-in copies remain the offline fallback.

The extension pack (`edgemodders.edgekit`) is for modders in VS Code and VSCodium. EDGEkit itself does not need it.

### The steps

| Step | What | Details |
|---|---|---|
| 1. Watch | A scheduled workflow in EDGEkit (daily) runs `tools/extensions-status.mjs`. When an extension releases a new version, it opens a pull request that raises that extension's pinned `version` in `extensions.json`; the user reviews and merges, so every bundle change is deliberate | Release naming differs between repos: REDcode tags `v0.7.0` for REDcode and `theme-v0.3.1` for the theme; REDdeck's release asset is `reddeck-0.26.0.vsix` while its local build is `reddeck-win32-x64-*`. So each entry in `extensions.json` gets a release tag pattern and an asset pattern. Can start before K1: it does not need the editor build |
| 2. Pack | A workflow publishes the EDGEkit extension pack to the Marketplace and Open VSX | Two secrets in EDGEkit's repo: a Marketplace token (an Azure DevOps token, which expires within a year, so renew it) and an Open VSX token. REDdeck's `verify-tokens.yml` is a model. The pack has its own version, raised when its members change, and lists only extensions published on that registry (on Open VSX it leaves out Redscript IDE). Can ship as soon as REDcode is published |
| 3. Build | A release workflow builds the editor with the pinned extensions inside and makes the installer | Proven on this PC first (K1 to K3); CI copies a build that works rather than debugging a long Code - OSS build in CI. GitHub's hosted Windows runners build VSCodium, so they can likely build EDGEkit; disk and time limits to check in K4 (unverified). A smoke test checks that the app holds every pinned extension at its pinned version. The installer carries the third-party notices, Redscript IDE's and its language server's included |
| 4. Release | The tagged release publishes the installer on GitHub and writes `latest.json` for the update service | EDGEkit's own version scheme to decide in K4: VSCodium uses the upstream version plus a build number (`1.140.06880`), and the update service compares these. Releases come regularly, since extension fixes ride along with them if built-ins do not update from Open VSX |

Not planned yet: whether EDGEkit sets up REDcode's and EDGEmat's MCP servers for Claude Code by itself. It waits until EDGEmat reaches M1.

## Phases

Phases are numbered K0 to K5, so they do not clash with the other repos' phases. Each ends with a test on this PC.

| Phase | Builds | The test proves |
|---|---|---|
| **K0 Decide** | The K0 decisions below, answered with the user. The current Marketplace and trademark terms, read directly. Which upstream release to pin | The plan and `upstream.json` are agreed |
| **K1 Build** | Code - OSS built from source on this PC, unbranded, with the drafts in `tools/` made to work. Exact tool versions in Dev setup | An unbranded build starts, opens a folder, and installs an extension from Open VSX |
| **K2 Brand** | `product.json` branding, icons (app, installer, file types) made from `tools/brand`, the REDnode HUD theme as default, a welcome page | The installed app says EDGEkit everywhere and never VS Code; its data lives in its own folders, beside an installed VS Code without touching it |
| **K3 Bundle** | First, the check whether built-in extensions update from Open VSX (release pipeline). Then the EDGE extensions shipped as built-in extensions, from their released VSIX files at pinned versions (upstream's `builtInExtensions` list, if it fits), Redscript IDE with its language server, and a third-party notices file with every bundled project's license | A fresh install has REDcode, the theme, REDdeck, Redscript IDE and the other published EDGE extensions, with no network; a newer REDdeck on Open VSX reaches it, automatically or through the installer's fallback |
| **K4 Release** | The release pipeline in GitHub Actions: the daily watch with pin pull requests (may start earlier), the extension pack published to both registries (may ship earlier), and a Windows installer built on a pinned upstream tag and pinned extension versions downloaded from each extension repo's GitHub releases. EDGEkit's version scheme; updates through GitHub releases and the update service | A tagged release produces an installer anyone can download and install, and an older install updates itself to it. A new extension release becomes a pin pull request within a day |
| **K5 Track upstream** | A routine for moving to a newer upstream release every month or so, or sooner for a security fix, preferring one VSCodium has already shipped: bump the tag, rebuild, smoke test, release | A move to a newer release ships within a week of starting it, by checklist |

## K0 decisions

Answered with the user on 2026-10-15.

| Question | Decision |
|---|---|
| The product name in the app | **EDGEkit.** It is the window title, the installer name and the data folder (`.edgekit`), as `product/product.json` already says |
| Does "REDcode" stay a name? | **EDGEkit is the editor plus its extensions.** REDcode stays the name of its own extension. For VS Code users there is an EDGEkit extension pack, below |
| Platforms | **Windows x64 only for now.** Linux can come later |
| Code signing | **A certificate later.** Early releases are unsigned, and the download page says how to get past the SmartScreen warning |
| AI in the editor | **Claude Code runs in EDGEkit, from Open VSX.** Checked 2026-10-15: `Anthropic/claude-code` 2.1.300 is on Open VSX with a win32-x64 build. Its license is Anthropic's own, so EDGEkit does not bundle it; modders install it from the Extensions view. REDagent stays the built-in assistant |
| Updates | **Code - OSS's update service, pointed at EDGEkit's GitHub releases.** How it works is below |
| Trademarks | **Read by the user on 2026-10-15.** Extension listings on the Marketplace, and docs about them, use "*Name* for Visual Studio Code", the standard convention: for example "EDGEkit for Visual Studio Code" for the extension pack. No Microsoft icons, logos or brand names that imply a connection to Microsoft or its endorsement. The EDGEkit app keeps its own name and icon everywhere. Sources: the [Marketplace Terms of Use](https://aka.ms/vsmarketplace-ToU) (PDF), [Microsoft's trademark guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks), the [VS Code brand guidelines](https://code.visualstudio.com/brand), upstream's [Differences between the repository and Visual Studio Code](https://github.com/microsoft/vscode/wiki/Differences-between-the-repository-and-Visual-Studio-Code), and the [Open VSX registry FAQ](https://www.eclipse.org/legal/open-vsx-registry-faq/) |
| Upstream release | **1.140.0** (2026-09-30), in `upstream.json`. VSCodium's latest release (1.140.06880) is built on it, so its patches are a known-good reference while K1 gets the first build working |

Still open, to settle in K1:

| Question | Notes |
|---|---|
| User or system installer | Code - OSS can build both. The user installer needs no admin rights and is what VS Code offers first; it is the likely choice |

## The EDGEkit extension pack

For modders who stay in VS Code or VSCodium: one extension, `edgemodders.edgekit` (display name EDGEkit), that installs every EDGE extension.

| | |
|---|---|
| What it is | An extension pack: a `package.json` with an `extensionPack` list and no code. Installing it installs every extension in the list; uninstalling it offers to remove them |
| What it lists | Every extension in `extensions.json` that is published on the registry: REDcode, the REDnode HUD theme, REDdeck and Redscript IDE first; REDagent, EDGEmat, EDGEwave and later EDGE extensions as each one is published |
| Where it lives | In this repo, in its own folder (`pack/`), because it belongs to EDGEkit and not to any one extension |
| Not in the app | The EDGEkit app does not include the pack: its extensions are already built in |
| What it needs | VS Code installs pack members from the Microsoft Marketplace, and VSCodium from Open VSX, so each member must be published to both. A pack should list only published extensions: a missing one may stop the whole pack installing (unverified). `tools/extensions-status.mjs` shows which are ready. Checked 2026-10-15: REDdeck and the theme are on both; REDcode is being published; Redscript IDE is on the Marketplace only, so VSCodium users would not get it |
| When | As soon as REDcode is published (release pipeline, step 2); it does not wait for the editor build |

## Updates

Code - OSS has an update service built in, switched off because upstream's `product.json` has no `updateUrl`. EDGEkit switches it on and points it at its own releases. **Unverified:** from upstream's source and VSCodium as remembered, to check against the pinned upstream in K4.

| Part | What it does |
|---|---|
| `product.json` | `updateUrl` (where to ask), `quality` (`stable`), `downloadUrl` (the releases page) and `releaseNotesUrl` |
| The check | The app asks `{updateUrl}/api/update/{platform}/{quality}/{commit}`, for example platform `win32-x64-user`. The answer is "nothing new" or a small JSON file: the installer's URL, its version, the upstream commit and its SHA-256 hash |
| The install | On Windows the app downloads the installer, checks the hash, and runs it quietly when the user restarts |
| EDGEkit's answer | GitHub releases cannot answer that URL, because it changes with every commit. VSCodium's way: a small patch makes the app ask a fixed path instead (`{updateUrl}/{quality}/{platform}/{arch}/latest.json`), and the release workflow writes that file. EDGEkit can publish it on its GitHub Pages site, pointing at the installer in the GitHub release |

The other services in `product.json`: the extension gallery is Open VSX (set); telemetry is off (set); Settings Sync uses Microsoft's servers and stays off.
