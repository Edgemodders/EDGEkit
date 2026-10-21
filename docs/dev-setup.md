# Dev setup

What a Windows PC needs to build EDGEkit. The versions below were checked on the dev PC on 2026-10-15 against Code - OSS 1.140.0's own checks (`build/npm/preinstall.ts`). The unbranded build first ran on 2026-10-16 (K1): app and installer, without Copilot.

| Tool | Why | On the dev PC (2026-10-15) | Notes |
|---|---|---|---|
| Git | Fetches Code - OSS | 2.51 | |
| Node.js 24.18.0, from Code - OSS's `.nvmrc` | Code - OSS's build | 24.18.0, installed with nvm-windows 1.2.2 beside the everyday 24.11.1 | Upstream's preinstall accepts 24.18.0 or a newer 24.x, not 25. `tools/build.ps1` takes it from `%NVM_HOME%\v24.18.0` for the build only; it never runs `nvm use`, which would switch Node for every program on the PC |
| Python 3 | node-gyp, for native modules | 3.13.9 | |
| Visual Studio 2022 with the C++ x64 tools | Native modules; upstream's preinstall looks for Visual Studio 2022 or 2019 | Build Tools 2022 17.14.24, with the C++ x64 tools and the Windows 11 SDK (26100) | The build also runs the SDK's `signtool.exe`, to strip signatures from native files before it stamps version details on them (found in K1, 2026-10-16: `spawn signtool.exe ENOENT`). It is not on the PATH by default; `tools/build.ps1` adds the newest SDK's `bin\<version>\x64` for the build. **The Spectre-mitigated libraries are required** (found in K1, 2026-10-16: `npm ci` stopped with `MSB8040` building `@vscode/native-watchdog`). Add the component `Microsoft.VisualStudio.Component.VC.Runtimes.x86.x64.Spectre` ("MSVC v143 - VS 2022 C++ x64/x86 Spectre-mitigated libs") with the Visual Studio Installer, or: `& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\setup.exe" modify --installPath "${env:ProgramFiles(x86)}\Microsoft Visual Studio\2022\BuildTools" --add Microsoft.VisualStudio.Component.VC.Runtimes.x86.x64.Spectre --passive` (administrator) |
| Disk | The checkout, its dependencies and the build | 290 GB free on E: | Measured in K1 |
| A checkout folder with no spaces in its path | Upstream's install runs `node-gyp.cmd` through the shell with its path unquoted (`build/npm/preinstall.ts` at 1.140.0) | `E:\Modding\EDGEkit-build\vscode`, set in `local.json` | Found in K1, 2026-10-16: under `E:\Modding\Cyberpunk 2077\` `npm ci` stopped with `'E:\Modding\Cyberpunk' is not recognized`. `local.json` at the repo root (not committed) says where the checkout lives: `{ "vscode": "E:/Modding/EDGEkit-build/vscode" }`. Without it, the scripts use `build\vscode`. `tools/checkout.ps1` refuses a path with a space |
| Outbound firewall rules | `npm ci` downloads packages, Electron and headers | The dev PC's firewall blocks outbound by default (`BlockOutbound`) and allows programs one by one | Each new `node.exe` needs its own rule, or `npm ci` fails with `EACCES` on the registry. The built app's own executable needs one too, to reach Open VSX (found 2026-10-18: installing an extension failed with `EACCES`): `New-NetFirewallRule -DisplayName "EDGEkit (dev build)" -Direction Outbound -Action Allow -Program "E:\Modding\EDGEkit-build\VSCode-win32-x64\EDGEkit.exe"`. In an administrator PowerShell: `New-NetFirewallRule -DisplayName "Node.js JavaScript Runtime (node.exe)" -Direction Outbound -Action Allow -Program "$env:NVM_HOME\v24.18.0\node.exe"` |
| The sibling repos beside this one (optional) | Only for testing unreleased extension work: `tools/bundle.mjs --local` (or `"localExtensions": true` in `local.json`) | `../REDcode`, `../EDGEdeck`, `../EDGEmat`, `../EDGEwave`, each with `npm ci` | From K3 (2026-10-21) every build downloads the pinned released extensions from Open VSX instead (design, "Bundled extensions"), so a build needs only this repo |

## Building

```powershell
nvm install 24.18.0                # once; the version in Code - OSS's .nvmrc
.\tools\build.ps1                  # fetch Code - OSS, brand it, bundle the extensions, build the app and installer
node tools/bundle.mjs --no-build   # only unpack the extensions the sibling repos already built
node tools/extensions-status.mjs   # where each EDGE extension is published
```

The first build on the dev PC (2026-10-16), Code - OSS 1.140.0 unbranded, step by step:

| Step | Command (in the checkout) | Time | Result |
|---|---|---|---|
| Take Copilot out | `node tools/remove-copilot.mjs` (from the repo) | Seconds | 177 paths deleted, the build patch applied |
| Upstream's name out | `node tools/remove-branding.mjs` (from the repo) | Seconds | Added 2026-10-18: VSCodium's branding patch in 95 files, then 177 more message lines in 79 files. `--list` prints each message it renames |
| EDGEkit's edits | `node tools/patch-upstream.mjs` (from the repo) | Seconds | Added 2026-10-18: no Windows 11 context-menu appx (needed once `product.json` sets `quality` to `stable`), and the extension signature check off by default; later the K2 edits (theme, file details, installer, logos) |
| Install the dependencies | `npm ci` | 3 to 4 min | |
| The app | `npm run gulp -- vscode-win32-x64-min` | 2 min | `VSCode-win32-x64` beside the checkout, 928 MB. `bin\code-oss.cmd --version` prints 1.140.0, x64 |
| The update helper | `npm run gulp -- vscode-win32-x64-inno-updater` | Seconds | `inno_updater.exe` in the app's `tools` folder, which the installer needs |
| The installer | `npm run gulp -- vscode-win32-x64-user-setup` | 3 min | `.build\win32-x64\user-setup\VSCodeSetup.exe`, 200 MB (since 2026-10-18 `EDGEkitSetup.exe`, 192 MB) |

`tools/build.ps1` runs all of these, after the brand and bundle steps. It first ran end to end on 2026-10-18 (`-SkipFetch`, about 10 minutes): the app is `EDGEkit.exe` (936 MB, 1.140.0, x64) with EDGEkit's names and Open VSX as its gallery; the installer was still called `VSCodeSetup.exe` (`EDGEkitSetup.exe` from the K2 rebuild the same day). The bundle step packaged REDcode, the HUD theme and EDGEdeck in their repos, without changing their versions.

### Building on another PC

Tried on a laptop on 2026-10-18 (existing clones, Python 3.14.6, Build Tools 17.14): the build ran end to end after the fixes noted below. The winget ids are unverified.

| Step | What |
|---|---|
| Tools | Those in the table above. With winget: `winget install Git.Git`, `winget install Python.Python.3.13`, `winget install CoreyButler.NVMforWindows`, then in a new terminal `nvm install 24.18.0`. Visual Studio 2022 Build Tools with the C++ tools, the Windows SDK and the Spectre-mitigated libraries: `winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --add Microsoft.VisualStudio.Component.VC.Runtimes.x86.x64.Spectre"` |
| Build Tools already installed | They usually lack the Spectre-mitigated libraries: add them with the `setup.exe modify` command in the table above, in an administrator PowerShell (found on the laptop, 2026-10-18: `npm ci` stopped with `MSB8040` in `@vscode/deviceid`, as on the dev PC in K1). npm's `EBUSY` cleanup warnings around it are a side effect |
| Repos | Clone EDGEkit. From K3 (2026-10-21) that is all: the bundle step downloads the extensions from Open VSX. The extension repos beside it are needed only for `--local` builds (table above); an existing EDGEkit clone needs `git pull` |
| Checkout path | If the EDGEkit folder's path has a space, add `local.json` with a path that has none, as on the dev PC. A folder such as `C:\dev` needs none |
| Build | `.\tools\build.ps1` (the first time without `-SkipFetch`: it clones Code - OSS). About 15 minutes on the dev PC, longer the first time |
| Run | F5 in this repo, as below |

The repos and the build, in a folder without spaces:

```powershell
mkdir C:\dev; cd C:\dev
git clone https://github.com/Edgemodders/EDGEkit
cd EDGEkit
.\tools\build.ps1
```

### Sharing a dev build

`node tools/dev-release.mjs` uploads the last build's `EDGEkitSetup.exe` as a **draft** GitHub release, for testing on another PC: only the repo's collaborators see it, and it makes no tag until it is published. It names the draft after the build date (`edgekit-dev-2026-10-18`, then `-2` the same day) and writes the notes from the build: the commit, the Code - OSS release and the installer's SHA-256. `--dry` only prints them. It needs the GitHub CLI (`gh`) signed in. Delete the draft when testing is done. For Claude Code to run it, the user adds `"Bash(node tools/dev-release.mjs:*)"` to `permissions.allow` in `.claude/settings.local.json`; otherwise its permission check stops the upload (2026-10-18).

### Testing an update

The update check (design, "Updates") between two local builds, with no release. It needs an installed EDGEkit: the app run from the build folder (F5) is not an installer's, so it only offers a download.

| Step | What |
|---|---|
| 1. The older build | In `local.json` add `"updateUrl": "http://127.0.0.1:8123"` and `"version": "1.140.1"`, then `.\tools\build.ps1 -SkipFetch` |
| 2. Install it | Run `EDGEkitSetup.exe` from the checkout's `.build\win32-x64\user-setup`. **Help > About** says 1.140.1. Close it |
| 3. The newer build | In `local.json`, `"version": "1.140.2"`, and build again |
| 4. Serve it | `node tools/update-test.mjs`. It prints each request |
| 5. Update | Start the installed EDGEkit. Within a minute it asks for the manifest, and downloads the installer; the gear at the bottom left shows **Restart to Update**. Choose it: EDGEkit closes, the installer runs over it with a small progress window, and EDGEkit starts again. About says 1.140.2, and **Help > Check for Updates** says there is none. A plain quit does not apply it: the update waits, and the next start offers the restart again |
| 6. Clean up | Take `updateUrl` and `version` out of `local.json`. Uninstall the test EDGEkit from Windows' Installed apps if you like |

### Releasing

A full EDGEkit release, through the release workflow (`.github/workflows/release.yml`), the same mechanism as REDnode's and the other repos' (the user, 2026-10-21). Rare: only when the editor changes (design, "When EDGEkit releases"). Publishing is the user's call.

| Step | What |
|---|---|
| 1. The version | Raise `version.json` (`1.140.1`, then `1.140.2`; design, "Updates") and add its `## <version>` section to `CHANGELOG.md`. Raise the extension pins in `extensions.json` to the latest on Open VSX (the status issue shows them), so a fresh install has little to update. Commit and push |
| 2. Build | Actions tab, **Release**, **Run workflow**, "Make a release" not ticked. It builds on a clean Windows runner (`tools/build.ps1`), checks the build (`tools/check-build.mjs`: the version, the commit, every pinned extension at its version, the notices, no Copilot) and keeps `EDGEkitSetup.exe` as the run's artifact for 30 days |
| 3. Test | Download the artifact, install it, and check it (the K3 checklist: first start, extensions, onboarding, beside VS Code) |
| 4. Release | **Run workflow** again with "Make a release" ticked. It first checks the version (`tools/release.mjs --check`: its tag is free, it is newer than the manifest's, CHANGELOG.md has its section), builds again, makes the GitHub release `v<version>` with `EDGEkitSetup-<version>.exe`, marked Latest, and commits `docs/update/latest-win32-x64-user.json` |
| 5. The update is on | The workflow starts the docs site's deploy (a push with its token starts no workflow by itself); installed EDGEkits find the update at their next check (on start, then hourly). If the manifest push fails, the release stays made: commit the run's `update-manifest` artifact by hand |

On a PC the same scripts work by hand: `.\tools\build.ps1 -SkipFetch`, `node tools/check-build.mjs`, `node tools/release.mjs --dry`, then `node tools/release.mjs`, and commit `docs/update/`.

To take an update back, put the previous release's manifest back (git history) and push: installed EDGEkits stop offering it. One that already updated stays on the new version.

## Running the app

The app is `EDGEkit.exe` in `VSCode-win32-x64` beside the checkout (E:\Modding\EDGEkit-build\VSCode-win32-x64 on the dev PC); its command line is `bin\edgekit.cmd`. It keeps its settings in `%APPDATA%\EDGEkit` and its extensions in `%USERPROFILE%\.edgekit`, apart from an installed VS Code. The first smoke test (2026-10-18, the unbranded `Code - OSS.exe`) passed: it starts, opens a folder and signs in to GitHub.

Start it with **F5** in this repo (`.vscode/launch.json`), or `node tools/run.mjs [folder]`. "Run EDGEkit (first launch)" (`--fresh`) starts it with a new, empty settings folder, so the one-time screens show again.

| Problem | Cause | Fix |
|---|---|---|
| The app exits at once, or prints `bad option` | Started from a terminal inside VS Code, which sets `ELECTRON_RUN_AS_NODE=1`, so the app runs as plain Node (found 2026-10-18) | Use F5 or `tools/run.mjs`, which remove them. Or start it from Explorer or the Start menu |
