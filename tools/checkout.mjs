// Where the Code - OSS checkout lives: "vscode" in local.json (this PC's settings, not
// committed), else build/vscode. The same rule as tools/checkout.ps1.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, 'local.json');
export const checkout = resolve((existsSync(local) && JSON.parse(readFileSync(local, 'utf8')).vscode) || join(root, 'build', 'vscode'));
