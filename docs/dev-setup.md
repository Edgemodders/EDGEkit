# Dev setup

What a Windows PC needs to build EDGEkit. The versions below were checked on the dev PC on 2026-10-15 against Code - OSS 1.140.0's own checks (`build/npm/preinstall.ts`). The build itself has not run yet: K1 runs it and completes this page with exact commands.

| Tool | Why | On the dev PC (2026-10-15) | Notes |
|---|---|---|---|
| Git | Fetches Code - OSS | 2.51 | |
| Node.js 24.18.0, from Code - OSS's `.nvmrc` | Code - OSS's build | 24.18.0, installed with nvm-windows 1.2.2 beside the everyday 24.11.1 | Upstream's preinstall accepts 24.18.0 or a newer 24.x, not 25. `tools/build.ps1` takes it from `%NVM_HOME%\v24.18.0` for the build only; it never runs `nvm use`, which would switch Node for every program on the PC |
| Python 3 | node-gyp, for native modules | 3.13.9 | |
| Visual Studio 2022 with the C++ x64 tools | Native modules; upstream's preinstall looks for Visual Studio 2022 or 2019 | Build Tools 2022 17.14.24, with the C++ x64 tools and the Windows 11 SDK (26100) | The Spectre-mitigated libraries, which Code - OSS's instructions mention, are not installed. Upstream's preinstall does not require them; if a native module does, the build fails with `MSB8040`, and they are added with the Visual Studio Installer |
| Disk | The checkout, its dependencies and the build | 290 GB free on E: | Measured in K1 |
| Outbound firewall rules | `npm ci` downloads packages, Electron and headers | The dev PC's firewall blocks outbound by default (`BlockOutbound`) and allows programs one by one | Each new `node.exe` needs its own rule, or `npm ci` fails with `EACCES` on the registry. The built app's own executable will need one too, to reach Open VSX. In an administrator PowerShell: `New-NetFirewallRule -DisplayName "Node.js JavaScript Runtime (node.exe)" -Direction Outbound -Action Allow -Program "$env:NVM_HOME\v24.18.0\node.exe"` |
| The sibling repos beside this one | The bundled extensions, on the dev PC | `../REDcode`, `../REDdeck` | Release builds download released VSIX files instead (design, "Release pipeline") |

## Building

```powershell
nvm install 24.18.0                # once; the version in Code - OSS's .nvmrc
.\tools\build.ps1                  # fetch Code - OSS, brand it, bundle the extensions, build the app and installer
node tools/bundle.mjs --no-build   # only unpack the extensions the sibling repos already built
node tools/extensions-status.mjs   # where each EDGE extension is published
```
