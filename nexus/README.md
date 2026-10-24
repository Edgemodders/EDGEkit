# EDGEkit on Nexus Mods

The source of EDGEkit's Nexus Mods page lives here, so updates are edits in the repo, not in Nexus's text box.

| File | What it is |
|---|---|
| `description.bbcode` | The page's description, in Nexus's BBCode. Paste the whole file into the description field (the editor's source mode, or switch to BBCode) |
| `README.md` | This page: the other fields of the Nexus form, and how to update |

## The Nexus form

| Field | Value |
|---|---|
| Mod name | EDGEkit |
| Version | The release version, from `version.json` (1.140.1 is the first, released on GitHub on 2026-10-22) |
| Category | Utilities, or Modders Resources and Tutorials (check the list for Cyberpunk 2077 when creating the page) |
| Brief overview | One editor for Cyberpunk 2077 modding, with every EDGE tool built in and AI included. A build of Code - OSS with REDcode, EDGEdeck, EDGEmat, EDGEwave, REDscript IDE and the HUD theme inside, and Claude Code on first start. Track to hear when it releases. (255 characters at most; this is 254. Now that 1.140.1 is out, the last sentence needs new words before the page goes public) |
| Author | Edgemodders |
| Language | English |
| Primary image | `docs/assets/brand/social.png` (1280 x 640). The banner (`docs/assets/brand/banner.png`) is already at the top of the description |
| Requirements | None to install EDGEkit itself. In the requirements section: REDnode for the in-game features, once it has a Nexus page |
| Permissions | MIT: open source, free to modify and redistribute with the license notice. Bundled third-party parts keep their own licenses (listed in the app's third-party notices) |
| Tags | Utility, modders resource, tools |

The page is a private draft on Nexus (owner's decision, 2026-10-13) and is published only when EDGEkit and its extensions are complete. Before publishing, replace the STATUS box with download and install steps, set the version, and upload the installer.

## Updating the page

1. Edit `description.bbcode` here, commit, push.
2. Paste the whole file into the description field on Nexus and save.

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
