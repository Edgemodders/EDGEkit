# EDGE<span class="y">kit</span> docs

EDGEkit is the Edgemodders editor: a build of Code - OSS, the open-source core of VS Code, with Edgemodders branding and every EDGE tool built in, so a modder installs one app and starts modding Cyberpunk 2077.

| Document | What it covers |
|---|---|
| [Design](design.html) | What EDGEkit is and is not, the facts that shape it (Open VSX, trademarks, licenses), how it is built, the bundled extensions, the extension pack, updates, the release pipeline (watch, pack, build, release), phases K0 to K5 and the K0 decisions |
| [Dev setup](dev-setup.html) | What a PC needs to build EDGEkit |
| [REDcode docs](https://edgemodders.github.io/REDcode/) | The editor extensions EDGEkit bundles |

## Roadmap status

As of 2026-10-22.

| Phase | Status |
|---|---|
| K0 Decide | Done 2026-10-15: the name EDGEkit, Windows x64, a certificate later, Claude Code from Open VSX, updates through GitHub releases, an EDGEkit extension pack, upstream release 1.140.0, no Copilot; trademark wording ("*Name* for Visual Studio Code" on the Marketplace) |
| K1 Build | Done 2026-10-18. Code - OSS 1.140.0 built on the dev PC, unbranded and without Copilot: the app and its installer (2026-10-16). The app starts, opens a folder and signs in to GitHub (2026-10-18). `build.ps1` ran end to end with EDGEkit's `product.json` (2026-10-18). The branded app installed the REDnode HUD theme 0.3.1 from Open VSX, with `extensions.verifySignature` off in the dev build's settings (since decided: off by default) |
| K2 Brand | Under way. Done (2026-10-18): the installer `EDGEkitSetup.exe` and the Windows file details say EDGEkit and Edgemodders; the REDnode HUD theme is built in and the default; the icons and installer images; the empty-editor watermark; the sweep for VS Code names and logos; the onboarding and Welcome page drafted, for review |
| K3 Bundle | Done 2026-10-21. Every build downloads the pinned EDGE extensions from Open VSX and builds them in: REDcode, the HUD theme, EDGEdeck, EDGEmat, EDGEwave, and Redscript IDE (built from its source). They update themselves from Open VSX (tested: a built-in EDGEmat 0.3.0 updated to 0.3.1). Claude Code installs from Open VSX on the first start; Copilot chat and the Agents window are off. The installer worked on a second PC, onboarding included |
| K4 Release | Started early. The daily watch and its status issue run (2026-10-15); the extension pack `edgemodders.edgekit` is published on both registries as a preview (0.1.0 on 2026-10-16; 0.2.0, with EDGEdeck, on 2026-10-17); 0.3.0 adds EDGEmat and EDGEwave (built 2026-10-21, not yet published). Updates built and tested on the dev PC (2026-10-21): installed EDGEkits check a manifest on this site and update themselves from the GitHub release; EDGEkit's version is `1.140.1` for the first release. The release workflow (2026-10-21, the same mechanism as REDnode's) builds the installer on GitHub Actions: its first build passed on 2026-10-22 in 17 minutes. 1.140.1 is prepared and being tested. Full EDGEkit releases are rare: extensions update themselves |
| K5 Track upstream | Not started |

Source code and issues: [github.com/Edgemodders/EDGEkit](https://github.com/Edgemodders/EDGEkit)
