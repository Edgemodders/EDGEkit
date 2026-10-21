// Where the Code - OSS checkout lives: "vscode" in local.json (this PC's settings, not
// committed), else build/vscode. The same rule as tools/checkout.ps1.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const local = join(root, 'local.json');
export const checkout = resolve((existsSync(local) && JSON.parse(readFileSync(local, 'utf8')).vscode) || join(root, 'build', 'vscode'));

// The built app, beside the checkout.
export const builtApp = join(dirname(checkout), 'VSCode-win32-x64');

// The built app's resources\app folder (its package.json and product.json). With win32VersionedUpdate
// (product.json) it sits in a folder named after the commit's first 10 characters; the newest one counts.
export function appResources(app = builtApp) {
  const plain = join(app, 'resources', 'app');
  if (existsSync(join(plain, 'product.json'))) return plain;
  const versioned = (existsSync(app) ? readdirSync(app) : [])
    .filter((name) => /^[0-9a-f]{10}$/.test(name) && existsSync(join(app, name, 'resources', 'app', 'product.json')))
    .map((name) => join(app, name, 'resources', 'app'))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!versioned.length) throw new Error(`No built app in ${app}. Run tools/build.ps1 first.`);
  return versioned[0];
}
