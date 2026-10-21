// Starts the built app (VSCode-win32-x64 beside the checkout), F5 in this repo.
//
//   node tools/run.mjs [folder]   open a folder (default: this repo)
//   node tools/run.mjs --fresh    with a new, empty settings folder, as on a first launch
//
// A shell inside VS Code carries ELECTRON_RUN_AS_NODE=1 and VSCODE_* variables for its own
// processes; with them the app starts as plain Node and exits, so they are removed here.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { appResources, builtApp as app, root } from './checkout.mjs';

const exe = join(app, `${JSON.parse(readFileSync(join(appResources(), 'product.json'), 'utf8')).nameShort}.exe`);

const args = process.argv.slice(2);
const fresh = args.includes('--fresh');
const folder = resolve(args.find((a) => !a.startsWith('--')) ?? root);

const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'ELECTRON_RUN_AS_NODE' && !k.startsWith('VSCODE_')));
const appArgs = [folder];
if (fresh) appArgs.push('--user-data-dir', mkdtempSync(join(tmpdir(), 'edgekit-fresh-')));

spawn(exe, appArgs, { env, detached: true, stdio: 'ignore' }).unref();
console.log(`Started ${exe}${fresh ? ' with a fresh settings folder' : ''} on ${folder}`);
