<p align="center">
  <img src="docs/assets/brand/banner.png" alt="EDGEkit: one editor for Cyberpunk 2077 modding, every EDGE tool built in, AI included. Built on Code - OSS, bundles REDcode, REDnode and REDagent, extensions from Open VSX." width="100%">
</p>

<p align="center">
  <a href="https://edgemodders.github.io/EDGEkit/"><img src="docs/assets/brand/badges/docs.svg" alt="docs: read the docs"></a>
  <img src="docs/assets/brand/badges/status.svg" alt="status: 1.140.1 preview">
  <img src="docs/assets/brand/badges/base.svg" alt="built on: Code - OSS">
  <img src="docs/assets/brand/badges/registry.svg" alt="extensions: Open VSX">
  <a href="LICENSE"><img src="docs/assets/brand/badges/license.svg" alt="license: MIT"></a>
</p>

The Edgemodders editor: a build of Code - OSS, the open-source core of VS Code, with Edgemodders branding and the EDGE extensions built in. Install one app and get [REDcode](https://github.com/Edgemodders/REDcode) (the game's files, WolvenKit projects, the TweakDB), [EDGEdeck](https://github.com/Edgemodders/EDGEdeck) (the mod manager), [EDGEmat](https://github.com/Edgemodders/EDGEmat) (materials), [EDGEwave](https://github.com/Edgemodders/EDGEwave) (sounds), Redscript IDE and the REDnode HUD theme, with more extensions from [Open VSX](https://open-vsx.org/). Claude Code installs on the first start.

**[Download EDGEkit](https://github.com/Edgemodders/EDGEkit/releases/latest)** &middot; **[Read the docs](https://edgemodders.github.io/EDGEkit/)** &middot; [Changelog](CHANGELOG.md) &middot; [Design](docs/design.md) &middot; [Dev setup](docs/dev-setup.md)

> [!NOTE]
> **Status: preview.** EDGEkit 1.140.1, the first release, came out on 2026-10-22 for Windows x64: `EDGEkitSetup-1.140.1.exe` on the [releases page](https://github.com/Edgemodders/EDGEkit/releases/latest). The installer is not signed yet, so Windows SmartScreen may warn before it runs. EDGEkit installs beside VS Code without touching it, and updates itself (**Restart to Update** in the gear menu).
>
> **In VS Code or VSCodium instead?** The **EDGEkit extension pack** installs the EDGE extensions there: [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=edgemodders.edgekit) or [Open VSX](https://open-vsx.org/extension/edgemodders/edgekit).
>
> REDnode and REDagent, which run beside the game, are separate downloads: see [REDnode](https://github.com/Edgemodders/REDnode) and [REDagent](https://github.com/Edgemodders/REDagent).

## How it is built

Nothing from upstream is committed. `tools/` fetches Code - OSS at the release pinned in `upstream.json`, takes Copilot out, merges `product/product.json` (names, ids, Open VSX) into it, applies EDGEkit's small edits, downloads the extensions pinned in `extensions.json` from Open VSX, and runs upstream's Windows build. [Dev setup](docs/dev-setup.md) has the steps and the tools a PC needs.

| File | What it is |
|---|---|
| `upstream.json` | The Code - OSS release to build on |
| `version.json` | EDGEkit's own version: upstream's major and minor, then EDGEkit's release number (1.140.1) |
| `product/product.json` | EDGEkit's branding, merged over upstream's `product.json` |
| `product/` | Icons, the Welcome walkthrough, the onboarding images and the first-start code |
| `extensions.json` | The extensions built in, with their pinned versions |
| `tools/build.ps1` | Fetch, brand, bundle, build: the app and `EDGEkitSetup.exe` |
| `tools/release.mjs` | Makes a GitHub release and writes the update manifest (run by the Release workflow) |
| `pack/` | The EDGEkit extension pack for VS Code and VSCodium |
| `tools/brand/` | Renders the banner, icon and badges |

EDGEkit is not affiliated with Microsoft, CD Projekt RED or Anthropic. Visual Studio Code is a trademark of Microsoft; EDGEkit is built from the MIT-licensed Code - OSS and does not use the Visual Studio Code name or logo.
