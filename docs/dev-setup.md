# Dev setup

What a Windows PC needs to build EDGEkit. **Unverified:** taken from Code - OSS's own build instructions, not yet tried here. Phase K1 builds it and replaces this page with exact versions and commands.

| Tool | Why | Notes |
|---|---|---|
| Git | Fetches Code - OSS | |
| Node.js, the version in Code - OSS's `.nvmrc` | Code - OSS's build | Usually not the Node the EDGE tools use: switch with nvm before building (`tools/build.ps1` warns) |
| Python 3 | node-gyp, for native modules | |
| Visual Studio Build Tools with "Desktop development with C++" | Native modules | Code - OSS's instructions also list the Spectre-mitigated libraries |
| Disk | The checkout, its dependencies and the build | Many GB; measured in K1 |
| The sibling repos beside this one | The bundled extensions | `../REDcode` today, `../REDagent` once C6 exists |

## Building

```powershell
.\tools\build.ps1          # fetch Code - OSS, brand it, bundle the extensions, build the app and installer
node tools/bundle.mjs --no-build   # only unpack the extensions the sibling repos already built
```
