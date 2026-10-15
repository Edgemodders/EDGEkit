# EDGEkit: notes for Claude sessions

EDGEkit is the EDGEmodders editor: Code - OSS with EDGEmodders branding and the EDGE extensions built in (the VSCodium pattern). Read [docs/design.md](docs/design.md) first. It takes over REDcode's planned phase C7 Brand.

## Status and next step

- Scaffold created 2026-10-13: design and phases K0 to K5, branding overlay (`product/product.json`), extension list (`extensions.json`), draft scripts in `tools/`, docs site and brand assets.
- **K0 Decide** is done (decisions in the design, 2026-10-15). Upstream is pinned at 1.140.0. **Next: K1 Build**: Code - OSS from source on the dev PC, unbranded, recording exact tool versions in docs/dev-setup.md.
- `tools/brand.mjs` and `tools/bundle.mjs --no-build` were tried on 2026-10-13 (a stand-in product.json; REDcode's existing VSIX files). `fetch-vscode.ps1` and `build.ps1` have never run.

## Conventions

- Same as the sibling repos (see REDnode's CLAUDE.md): commit straight to `main` in small commits and push; plain, short sentences; tables for facts; mark anything unverified.
- **Git identity:** per repo, `CyberbuildsAI` with the GitHub no-reply email, plus `credential.https://github.com.username CyberbuildsAI`. Push with `GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never timeout 120 git push`.
- **Never commit upstream code** or build output: `build/` holds the Code - OSS checkout, unpacked extensions and the app.
- **The extensions stay in their own repos.** EDGEkit builds them with their own scripts (`extensions.json`) and never copies their source. Do not change REDcode or REDbridge from here; another session works in them.
- **Trademarks:** the EDGEkit app, installer and docs use their own name and icon, never the Visual Studio Code name or logo, except to say what EDGEkit is not. Extension listings on the Marketplace (the EDGEkit pack and the EDGE extensions) may say "*Name* for Visual Studio Code", the standard convention. Never Microsoft icons, or names that imply a connection or endorsement.
- **Nexus Mods page:** a private draft on Nexus until release. Its description is `nexus/description.bbcode` (Nexus BBCode, no tables) and the other form fields are in `nexus/README.md`. Keep its status box and roadmap in step with this repo; check tags with `node tools/check-bbcode.mjs`.
- **Docs site:** `docs/` is published by GitHub Pages through `.github/workflows/pages.yml`. `docs/index.md` is the landing page (document ledger and roadmap status); add every page to `nav` in `docs/_config.yml`. Brand images come from `tools/brand/render.ps1`.
