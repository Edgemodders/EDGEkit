// Tests EDGEkit's update between two local builds, before any real release (design, "Updates").
//
//   node tools/update-test.mjs     serve the last build's installer as an update on http://127.0.0.1:8123
//
// It answers the app's check (/latest-win32-x64-user.json) with a manifest naming the last build's
// version, and serves its installer. Build the older EDGEkit with local.json's "updateUrl" set to
// http://127.0.0.1:8123 and install it; build the newer one with a higher "version"; run this; the
// installed one should find the update. Steps: dev-setup, "Testing an update".
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { appResources, checkout } from './checkout.mjs';

const PORT = 8123;
const exe = join(checkout, '.build', 'win32-x64', 'user-setup', 'EDGEkitSetup.exe');
const { version } = JSON.parse(readFileSync(join(appResources(), 'package.json'), 'utf8'));
const { commit } = JSON.parse(readFileSync(join(appResources(), 'product.json'), 'utf8'));
const manifest = {
  url: `http://127.0.0.1:${PORT}/EDGEkitSetup-${version}.exe`,
  version: commit, // as tools/release.mjs: the commit names the download; productVersion is compared
  productVersion: version,
  sha256hash: createHash('sha256').update(readFileSync(exe)).digest('hex'),
  timestamp: Date.now(),
};

createServer((req, res) => {
  console.log(`${new Date().toLocaleTimeString()} ${req.method} ${req.url}`);
  const path = req.url.split('?')[0];
  if (path === '/latest-win32-x64-user.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(manifest));
  } else if (path === `/EDGEkitSetup-${version}.exe`) {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': statSync(exe).size });
    createReadStream(exe).pipe(res);
  } else {
    res.writeHead(404).end();
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Offering EDGEkit ${version} as an update on http://127.0.0.1:${PORT}. Ctrl+C to stop.`);
});
