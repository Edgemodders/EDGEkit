# EDGEkit on Nexus Mods

The source of EDGEkit's Nexus Mods page lives here, so updates are edits in the repo, not in Nexus's text box.

| File | What it is |
|---|---|
| `description.bbcode` | The page's description, in Nexus's BBCode. Paste the whole file into the description field (the editor's source mode, or switch to BBCode) |
| `README.md` | This page: the other fields of the Nexus form, and how to update |
| `nexus.json` | The page (35192), its internal mod id and main file, how a release uploads (`upload`), and the hash of the description last pulled. Made by `tools/nexus/nexus.mjs pull` |

## The Nexus form

| Field | Value |
|---|---|
| Mod name | EDGEkit |
| Version | The release version, from `version.json` (1.140.1 is the first, released on GitHub on 2026-10-22; 1.140.2 on 2026-10-26) |
| Category | Utilities, or Modders Resources and Tutorials (check the list for Cyberpunk 2077 when creating the page) |
| Brief overview | One editor for Cyberpunk 2077 modding, with every EDGE tool built in and AI included. A build of Code - OSS with REDcode, EDGEdeck, EDGEmat, EDGEwave, REDscript IDE and the HUD theme inside, and Claude Code on first start. Track to hear when it releases. (255 characters at most; this is 254. Now that 1.140.1 is out, the last sentence needs new words before the page goes public) |
| Author | Edgemodders |
| Language | English |
| Primary image | `docs/assets/brand/social.png` (1280 x 640). The banner (`docs/assets/brand/banner.png`) is already at the top of the description |
| Requirements | None to install EDGEkit itself. In the requirements section: REDnode for the in-game features, once it has a Nexus page |
| Permissions | MIT: open source, free to modify and redistribute with the license notice. Bundled third-party parts keep their own licenses (listed in the app's third-party notices) |
| Tags | Utility, modders resource, tools |

The page is a private draft on Nexus (owner's decision, 2026-10-13) and is published only when EDGEkit and its extensions are complete. Before publishing, replace the STATUS box with download and install steps. Releases upload the installer and set the version themselves (below).

## Updating the page

The release workflow keeps the page, as REDnode's does (the same `tools/nexus/nexus.mjs` and `api.mjs`, copied from REDnode, 2026-10-26). With **Make a release** and **Update Nexus Mods** ticked, after the GitHub release and the update manifest it:

| Step | What |
|---|---|
| The file | Zips `EDGEkitSetup-<version>.exe` with a README.txt into `EDGEkit-<version>.zip` (`tools/nexus-zip.mjs`; Nexus checks every upload as an archive) and uploads it as the main file's new version, the old one archived. Mod manager download off: EDGEkit is not a game mod |
| The changelog | The version's section of `CHANGELOG.md` as plain lines (`tools/nexus-notes.mjs`) |
| The description | Pushes `description.bbcode`, only when the live one is the one last pulled or the one the previous release pushed |

Before building, it checks the page and stops if the description was changed on Nexus since (pictures added by hand, say). Then:

1. `node tools/nexus/nexus.mjs pull`: the live description into `description.bbcode`, and the ids and hash into `nexus.json`.
2. Merge with `git diff`: keep what was added on Nexus, and the repo's newer text. Commit, push, and run the release again.

| Command | What |
|---|---|
| `node tools/nexus/nexus.mjs status` | The page's version, the main file's versions, and whether the description changed on Nexus |
| `node tools/nexus/nexus.mjs check --version <v>` | What a release would do, and whether it may. Read only |
| `node tools/nexus/nexus.mjs release --version <v> --zip build/release/EDGEkit-<v>.zip --notes <file>` | What the workflow runs. If its Nexus step fails after the release: download the release's installer into `build/release`, run `node tools/nexus-zip.mjs` and `node tools/nexus-notes.mjs --out <file>`, then this. It skips what is already done |

The key: on the dev PC `%APPDATA%\Edgemodders\nexus-key.txt`, encrypted for the owner's Windows user (see `tools/nexus/api.mjs`); in CI the organization's `NEXUS_KEY` secret.

The first pull (2026-10-26) found the page at 1.140.1, its main file uploaded by hand, and screenshots added on Nexus; they are in `description.bbcode` now.

Keep these in step with the repo's status (README, docs/index.md):

| Where in the description | Update when |
|---|---|
| The STATUS box near the top | Each phase that changes what a user can do, and each release. Since 1.140.1 it points at the GitHub release; replace that with install steps for the Nexus file once the installer is uploaded here |
| "What you get" | A bundled extension changes, for example REDagent's editor panel (its phase C6) lands |
| The roadmap list | Each phase; the current phase is marked in cyan (`[color=#19f3ff]Next[/color]`) |
| "The EDGE platform" | A tool's status changes in its own repo |

## BBCode used

Nexus's BBCode has no tables or Markdown, so the page uses only: `[b]`, `[i]`, `[size=2..5]`, `[color=#hex]`, `[center]`, `[quote]`, `[line]`, `[list]` with `[*]`, `[url=...]` and `[img]`. Images are linked from this repo's `main` branch on GitHub, so they must stay at their paths. The colours are the house palette: yellow `#fcee0a` for headings, cyan `#19f3ff` for highlights.

Check the tags balance before pasting:

```
node tools/check-bbcode.mjs nexus/description.bbcode
```
