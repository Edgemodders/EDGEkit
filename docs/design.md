# EDGE<span class="y">kit</span> design

EDGEkit is the EDGEmodders editor: a build of Code - OSS, the open-source core of VS Code, with EDGEmodders branding and every EDGE tool built in. A modder installs one app and gets REDcode's editors, REDnode's views, the REDnode HUD theme and REDagent, with no extension hunting.

**Status: scaffold.** The repository, the plan and draft scripts exist; nothing has been built yet. Next: K0, the decisions below, with the user.

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
| The Microsoft Marketplace may be used only by Microsoft's own VS Code products | EDGEkit points its extension gallery at [Open VSX](https://open-vsx.org/), as VSCodium and other forks do. The exact current terms must be read directly before release (REDcode's design notes they were reported second-hand) |
| Some Microsoft extensions (for example C# Dev Kit, Pylance, Remote Development, Live Share) are licensed for Microsoft's products only | EDGEkit does not bundle or advertise them. Modders who need them use VS Code with the EDGE extensions instead |
| "Visual Studio Code" and its logo are Microsoft trademarks | EDGEkit uses its own name and icon everywhere: window titles, installer, file associations, data folders. "Built on Code - OSS" is a plain description, to check with the trademark rules in K0 |
| The Redscript IDE extension (`jac3km4.redscript-ide-vscode`) is on the Marketplace only, not on Open VSX (REDcode C0, 2026-10-11). It, its language server (`jac3km4/redscript-ide`) and the compiler are all MIT (checked 2026-10-13) | EDGEkit may bundle it, with its copyright and license notice. Its newest VSIX on GitHub (0.2.2) is older than its source (0.3.4), so EDGEkit builds it from source. The user is telling its author and asking about Open VSX |
| Code - OSS builds need its own toolchain: the Node version in its `.nvmrc`, Python, and Visual Studio's C++ build tools for native modules, and many GB of disk | K1 proves the build on this PC first, unbranded, and records exact versions in [Dev setup](dev-setup.md) |
| VS Code updates monthly | EDGEkit pins an upstream release tag in `upstream.json` and moves it on purpose, with a rebuild and a smoke test |

## How it is built

Nothing from upstream is committed. The scripts fetch it, change it and build it in `build/`, which git ignores.

| Step | Script | What it does |
|---|---|---|
| 1. Fetch | `tools/fetch-vscode.ps1` | Clones `microsoft/vscode` at the tag in `upstream.json`, shallow, into `build/vscode` |
| 2. Brand | `tools/brand.mjs` | Merges `product/product.json` into upstream's `product.json`: names, ids, data folders, URLs, Open VSX. Icons and the default theme come in K2 |
| 3. Bundle | `tools/bundle.mjs` | Builds each extension in `extensions.json` from its own repo (for example REDcode's `npm run core:package`), unpacks the VSIX files into `build/extensions`, then into the app as built-in extensions. How Code - OSS takes prebuilt extensions is a K3 question |
| 4. Build | `tools/build.ps1` | Runs the three steps, installs upstream's dependencies and runs its Windows build and installer tasks |

The scripts in `tools/` are drafts: written from upstream's documented build, not yet run. K1 runs them and fixes what upstream's build needs.

## Bundled extensions

The list is `extensions.json`. Sources are the sibling repos, built by their own scripts.

**Separate repos, not a monorepo** (agreed with the user on 2026-10-13). The extensions stay in their own repos, and EDGEkit fetches them finished:

| Why | |
|---|---|
| Licenses | REDbridge is GPL-3.0 and must stay a separate program; one repo would blur that boundary and EDGEkit's MIT license |
| They ship without EDGEkit too | REDcode's extensions and the theme also go to Open VSX for VS Code and VSCodium users, with their own versions, releases and docs |
| Build weight | EDGEkit's build pulls in all of Code - OSS; extension work stays quick without it |
| Parallel work | Separate repos keep sessions working in different tools from tripping over each other |
| Each extension has its own repo | REDcode's repo holds REDcode core and the HUD theme; REDdeck, EDGEmat and the other EDGE extensions live in their own repos. EDGEkit bundles each one from its repo's releases |

| Where EDGEkit gets them | How |
|---|---|
| On the dev PC | From the sibling folders: `tools/bundle.mjs` builds each extension with its own script and takes the newest VSIX |
| In a release (K4) | Each extension repo attaches its VSIX to a GitHub release when it tags a version. `extensions.json` pins the version EDGEkit ships (`version`), and CI downloads exactly that file, so every EDGEkit release says which extension versions it holds and can be rebuilt |
| Third-party (Redscript IDE) | Built from source at a pinned tag, or from Open VSX once it is there |

Git submodules would also pin exact commits, but every update takes commits in two repos; pinned release versions are simpler.

| Extension | From | Status |
|---|---|---|
| REDcode core (`edgemodders.redcode-core`) | REDcode, `npm run core:package` | Exists |
| REDnode HUD theme (`edgemodders.rednode-hud-theme`) | REDcode, `npm run theme:package` | Exists. The default theme |
| REDagent (`edgemodders.redagent`) | REDagent, phase C6 | Not built yet |
| EDGEmat (`edgemodders.edgemat`) | EDGEmat | Phase M0 spec, not built yet. A material editor with an MCP server |
| Redscript IDE (`jac3km4.redscript-ide-vscode`) | Built from its source (MIT) | To bundle in K3, with its notice. Its language server (`redscript-ide.exe`, MIT) ships beside it and `redscript.idePath` points at it, so it works offline. If it reaches Open VSX, that can replace the build |

## Phases

Phases are numbered K0 to K5, so they do not clash with the other repos' phases. Each ends with a test on this PC.

| Phase | Builds | The test proves |
|---|---|---|
| **K0 Decide** | The open questions below, answered with the user. The current Marketplace and trademark terms, read directly. Which upstream release to pin | The plan and `upstream.json` are agreed |
| **K1 Build** | Code - OSS built from source on this PC, unbranded, with the drafts in `tools/` made to work. Exact tool versions in Dev setup | An unbranded build starts, opens a folder, and installs an extension from Open VSX |
| **K2 Brand** | `product.json` branding, icons (app, installer, file types) made from `tools/brand`, the REDnode HUD theme as default, a welcome page | The installed app says EDGEkit everywhere and never VS Code; its data lives in its own folders, beside an installed VS Code without touching it |
| **K3 Bundle** | The EDGE extensions built from their repos and shipped as built-in extensions, Redscript IDE with its language server, and a third-party notices file with every bundled project's license | A fresh install has REDcode, the theme, Redscript IDE and (once C6 exists) REDagent, with no network |
| **K4 Release** | A Windows installer, built by GitHub Actions on a pinned upstream tag and pinned extension versions, downloaded from each extension repo's GitHub releases (each repo gains a "publish the VSIX on a tag" workflow); updates through GitHub releases | A tagged release produces an installer anyone can download and install |
| **K5 Track upstream** | A routine for moving to a new VS Code release: bump the tag, rebuild, smoke test, release | A new upstream release ships within a week, by checklist |

## Open questions for K0

| Question | Notes |
|---|---|
| The product name in the app | "EDGEkit", or a longer name such as "EDGEkit Editor". It becomes the window title, the installer name and the data folder (`.edgekit`) |
| Does "REDcode" stay a name? | REDcode could stay the name of the extension pack inside EDGEkit, or EDGEkit could be what modders call the editor |
| Platforms | Windows x64 first (the game is Windows-only)? Linux later for Steam Deck modders? |
| Code signing | An unsigned installer warns in Windows SmartScreen. A certificate costs money; it can wait for K4 |
| AI in the editor | REDagent's C6 view is the built-in assistant. Whether Anthropic's own Claude Code extension can be installed from Open VSX is to check, not assume |
| Updates | GitHub releases with Code - OSS's update service pointed at them, or a simple "new version" notice at first |
