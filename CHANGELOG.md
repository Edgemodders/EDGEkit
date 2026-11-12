# Changelog

EDGEkit's releases: the editor itself. The EDGE extensions have their own changelogs and update themselves; the extension pack's is `pack/CHANGELOG.md`. `tools/release.mjs` takes each release's notes from its section here, `## <version>`.

## 1.140.6

A preview, for Windows x64.

**EDGEhack, built in.** EDGEhack 0.1.2, the new mod editor for the game's quickhacks, the abilities V uses in the story: their names, icons, costs and effects. It writes TweakXL mod files, works with REDcode, which EDGEkit already has, and updates itself from Open VSX, like the other EDGE extensions.

**Built-in extensions.** Brought up to their latest releases: REDcode for Cyberpunk 2077 0.10.8, EDGEdeck 0.31.0 (Nexus downloads one at a time with Cancel, speed and time left, a Columns button, and downloads over 2 GB), EDGEwave 0.2.0, REDsave 0.1.1 and EDGEquest 0.1.1, and Redscript IDE 0.4.0 (a script cache path setting, `redscript.scriptCachePath`, and updated grammars). Each one's changelog has the details. The others as in 1.140.5.

**Welcome page.** The step about the EDGE tools names EDGEhack.

## 1.140.5

A preview, for Windows x64.

**EDGEquest, built in.** EDGEquest 0.1.0, the new quest maker for Cyberpunk 2077: read the game's quests in plain words, and write new ones as a story, with beats, scenes, choices, map markers, music and sound. It works with REDcode, which EDGEkit already has, and updates itself from Open VSX, like the other EDGE extensions.

**Welcome page.** The step about the EDGE tools names EDGEquest.

The other built-in extensions are as in 1.140.4.

## 1.140.4

A preview, for Windows x64.

**REDsave, built in.** REDsave 0.1.0, the new save game manager for Cyberpunk 2077: search and filter your saves by title, date, lifepath and more, keep sets of saves outside the game and swap them in, and give saves titles of your own. It updates itself from Open VSX, like the other EDGE extensions.

**Built-in extensions.** EDGEdeck 0.30.0, which keeps each file of a Nexus Mods page as a mod of its own (a second main file or an optional patch no longer replaces the first) and shows them under one row named after the page. The others as in 1.140.3.

**Welcome page.** The step about the EDGE tools names REDsave.

## 1.140.3

A preview, for Windows x64.

**Built-in extensions.** REDcode for Cyberpunk 2077 0.10.5, whose Install, Pack and Install and Pack and Play deploy only the project's mod, and whose sounds play again after a game patch. EDGEdeck 0.29.4, which sends Nexus Mods download links to EDGEkit itself (earlier versions sent them to `vscode://`, so Mod manager download never reached EDGEdeck in EDGEkit), adds the current REDnode release without an error, can deploy or undeploy one mod from its row, and shows the library where you look. The others as in 1.140.2.

**Nexus Mods downloads.** The installer has a box, **Send Nexus Mods download links (Mod manager download) to EDGEdeck**, on a first install, and once when you update by hand from 1.140.2 or older. With it ticked, the Mod manager download button on Nexus Mods sends the file to EDGEdeck's mod library. It starts unticked when Vortex or Mod Organizer has the links, so nothing is taken from them without asking. After that, updates leave the links wherever you put them. Uninstalling gives them up if they still go to EDGEkit.

**Installer.** The **Launch EDGEkit** box at the end of the install is no longer cut off at the left, as the task boxes before it.

**Welcome page.** A new step, **Get mods from Nexus Mods**, does the same at any time, for instance after Vortex took the links back.

## 1.140.2

A preview, for Windows x64.

**Built-in extensions.** REDcode for Cyberpunk 2077 0.10.4 and EDGEdeck 0.29.0; the others as in 1.140.1.

**Welcome page.** The step about the EDGE tools says they are built in, instead of offering to install the EDGEkit pack, whose extensions EDGEkit already has. **Browse EDGE Extensions** stays.

**Claude Code for EDGE.** Once Claude Code is installed, EDGEkit asks once whether to set up EDGEchat, the EDGE plugin for Claude Code: modding skills and the EDGE tools' MCP servers. On yes, Claude Code opens its plugin dialog on EDGEchat for you to install it; once it is installed, EDGEkit opens a new Claude Code session with `/edge:setup` ready to send. The command **EDGEkit: Set Up Claude Code for EDGE** and a new Welcome page step do the same at any time.

**First start.** Claude Code installs after the onboarding closes. Before, its trust question could open behind the onboarding, and Escape there cancelled the install.

**Installer.** The checkboxes on the Select Additional Tasks page are no longer cut off at the left at some display scales.

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
