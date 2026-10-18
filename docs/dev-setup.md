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
| The sibling repos beside this one | The bundled extensions, on the dev PC | `../REDcode`, `../EDGEdeck` | Release builds download released VSIX files instead (design, "Release pipeline") |

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
| Turn off the appx | `node tools/disable-appx.mjs` (from the repo) | Seconds | Added 2026-10-18, needed once `product.json` sets `quality` to `stable` |
| Install the dependencies | `npm ci` | 3 to 4 min | |
| The app | `npm run gulp -- vscode-win32-x64-min` | 2 min | `VSCode-win32-x64` beside the checkout, 928 MB. `bin\code-oss.cmd --version` prints 1.140.0, x64 |
| The update helper | `npm run gulp -- vscode-win32-x64-inno-updater` | Seconds | `inno_updater.exe` in the app's `tools` folder, which the installer needs |
| The installer | `npm run gulp -- vscode-win32-x64-user-setup` | 3 min | `.build\win32-x64\user-setup\VSCodeSetup.exe`, 200 MB. The name comes from upstream's `build/win32/code.iss`; K2 renames it |

`tools/build.ps1` runs all of these, after the brand and bundle steps. It first ran end to end on 2026-10-18 (`-SkipFetch`, about 10 minutes): the app is `EDGEkit.exe` (936 MB, 1.140.0, x64) with EDGEkit's names and Open VSX as its gallery; the installer is still called `VSCodeSetup.exe`. The bundle step packaged REDcode, the HUD theme and EDGEdeck in their repos, without changing their versions.

## Running the app

The app is `EDGEkit.exe` in `VSCode-win32-x64` beside the checkout (E:\Modding\EDGEkit-build\VSCode-win32-x64 on the dev PC); its command line is `bin\edgekit.cmd`. It keeps its settings in `%APPDATA%\EDGEkit` and its extensions in `%USERPROFILE%\.edgekit`, apart from an installed VS Code. The first smoke test (2026-10-18, the unbranded `Code - OSS.exe`) passed: it starts, opens a folder and signs in to GitHub.

Start it with **F5** in this repo (`.vscode/launch.json`), or `node tools/run.mjs [folder]`. "Run EDGEkit (first launch)" (`--fresh`) starts it with a new, empty settings folder, so the one-time screens show again.

| Problem | Cause | Fix |
|---|---|---|
| The app exits at once, or prints `bad option` | Started from a terminal inside VS Code, which sets `ELECTRON_RUN_AS_NODE=1`, so the app runs as plain Node (found 2026-10-18) | Use F5 or `tools/run.mjs`, which remove them. Or start it from Explorer or the Start menu |
