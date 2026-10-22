# Changelog

EDGEkit's releases: the editor itself. The EDGE extensions have their own changelogs and update themselves; the extension pack's is `pack/CHANGELOG.md`. `tools/release.mjs` takes each release's notes from its section here, `## <version>`.

## 1.140.1

The first release of EDGEkit, the Edgemodders editor for Cyberpunk 2077 mods. A preview, for Windows x64.

**The editor.** EDGEkit is built on Code - OSS 1.140.0, the open-source base of VS Code. It has its own name, icons and settings folder, so it installs beside VS Code without touching it. Extensions come from Open VSX.

**Built in, ready at first start, even offline:**

| Extension | Version | What it does |
|---|---|---|
| REDcode for Cyberpunk 2077 | 0.10.3 | Cyberpunk modding in the editor |
| REDnode HUD theme | 0.3.1 | The default theme |
| EDGEdeck | 0.27.3 | The mod manager |
| EDGEmat | 0.3.1 | The material editor, with its MCP server |
| EDGEwave | 0.1.0 | The sound studio |
| Redscript IDE | 0.3.4 | Redscript language support |

The EDGE extensions update themselves from Open VSX.

**Claude Code** installs from Open VSX on the first start, after you confirm that you trust its publisher. Copilot chat and the Agents window are off.

**First start.** A short onboarding with an optional GitHub sign-in (what publishing mods on EDGEmods needs) and a theme choice, then EDGEkit's own Welcome walkthrough.

**Updates.** EDGEkit checks for a new release when it starts and then every hour. When one is out, **Restart to Update** in the gear menu installs it.

**Known limits:**

- Redscript IDE downloads its language server from GitHub the first time you use it.
- Windows x64 only.
