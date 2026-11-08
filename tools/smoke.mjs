// Post-deploy smoke check: fetches about 30 URLs sampled from a built site (dist/) from a live server
// with Accept-Encoding: gzip and fails on any non-200 answer.
//   node tools/smoke.mjs --base https://hobbydex.com [--dist dist] [--count 30]
//        [--resolve hobbydex.com:203.0.113.7] [--insecure] [--min-cert-days 14]
// --resolve sends the requests to that IP while keeping the host name (test the server before DNS moves);
// --insecure accepts the server's self-signed certificate (Caddy `tls internal`, before DNS moves).
// Fails when the server's certificate expires within --min-cert-days (default 14) days.
// Also checks that a missing page answers 404, so a server that answers 200 for everything fails.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const base = new URL(arg('--base', 'https://hobbydex.com'));
const dist = resolve(arg('--dist', 'dist'));
const count = Number(arg('--count', '30'));
const insecure = process.argv.includes('--insecure');
const minCertDays = Number(arg('--min-cert-days', '14'));
const res = arg('--resolve');
let pin = null;
if (res) { const i = res.lastIndexOf(':'); pin = { host: res.slice(0, i), ip: res.slice(i + 1) }; }

// every page, plus the fixed files a deploy must carry
const pages = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') pages.push('/' + relative(dist, d).split(sep).join('/') + (d === dist ? '' : '/'));
  }
};
walk(dist);
// old addresses answer 301 from the server's redirect map (dist/redirects.caddy): they are not pages to sample
const moved = new Set();
try {
  for (const m of readFileSync(join(dist, 'redirects.caddy'), 'utf8').matchAll(/^\t"([^"]+)" "[^"]+"$/gm)) moved.add(m[1]);
} catch {}
for (let i = pages.length - 1; i >= 0; i--) if (moved.has(pages[i])) pages.splice(i, 1);
pages.sort();
const urls = new Set(['/', '/robots.txt', '/sitemap-index.xml', '/data/rc.json', '/pagefind/pagefind.js']);
const asset = readdirSync(join(dist, '_astro')).find((f) => f.endsWith('.css'));
if (asset) urls.add('/_astro/' + asset);
const step = Math.max(1, Math.floor(pages.length / Math.max(1, count - urls.size)));
for (let i = 0; i < pages.length && urls.size < count; i += step) urls.add(pages[i]);

const get = (path, keep = false) => new Promise((done) => {
  const u = new URL(path, base);
  const lib = u.protocol === 'https:' ? https : http;
  const opts = { headers: { 'Accept-Encoding': 'gzip', 'User-Agent': 'hobbydex-smoke' }, timeout: 30000 };
  if (insecure) opts.rejectUnauthorized = false;
  if (pin) opts.lookup = (_h, o, cb) => (o && o.all ? cb(null, [{ address: pin.ip, family: pin.ip.includes(':') ? 6 : 4 }]) : cb(null, pin.ip, pin.ip.includes(':') ? 6 : 4));
  const r = lib.get(u, opts, (m) => { const parts = []; m.on('data', (c) => keep && parts.push(c)); m.on('end', () => done({ status: m.statusCode, enc: m.headers['content-encoding'] || '', body: Buffer.concat(parts) })); });
  r.on('timeout', () => r.destroy(new Error('timeout')));
  r.on('error', (e) => done({ status: 0, enc: '', error: e.message }));
});

let bad = 0;
if (base.protocol === 'https:') {
  const cert = await new Promise((done) => {
    const opts = { host: pin ? pin.ip : base.hostname, port: base.port || 443, servername: base.hostname, rejectUnauthorized: !insecure, timeout: 30000 };
    const s = tls.connect(opts, () => { const c = s.getPeerCertificate(); s.end(); done({ validTo: c.valid_to }); });
    s.on('timeout', () => s.destroy(new Error('timeout')));
    s.on('error', (e) => done({ error: e.message }));
  });
  const days = cert.validTo ? (new Date(cert.validTo) - Date.now()) / 864e5 : NaN;
  if (!(days >= minCertDays)) { bad++; console.log(`FAIL certificate for ${base.hostname}: ${cert.error ?? `expires ${cert.validTo} (${days.toFixed(1)} days left, need ${minCertDays})`}`); }
  else console.log(`certificate for ${base.hostname} valid for ${days.toFixed(0)} more days`);
}
for (const path of urls) {
  const r = await get(path);
  if (r.status !== 200) { bad++; console.log(`FAIL ${r.status} ${path} ${r.error ?? ''}`); }
}
// Search: the live entry file must equal the built one, and the index files it names must exist
// (a stale file on the server shows up as an entry naming a .pf_meta that is not there).
{
  const entry = await get('/pagefind/pagefind-entry.json', true);
  let want = null;
  try { want = readFileSync(join(dist, 'pagefind', 'pagefind-entry.json')); } catch { /* no local copy */ }
  if (entry.status !== 200) { bad++; console.log(`FAIL ${entry.status} /pagefind/pagefind-entry.json`); }
  else {
    if (want && !want.equals(entry.body)) { bad++; console.log('FAIL /pagefind/pagefind-entry.json differs from the built site'); }
    try {
      const langs = JSON.parse(entry.body.toString()).languages;
      for (const [lang, v] of Object.entries(langs)) {
        for (const f of [`pagefind.${v.hash}.pf_meta`, `wasm.${v.wasm}.pagefind`]) {
          const r = await get('/pagefind/' + f);
          if (r.status !== 200) { bad++; console.log(`FAIL ${r.status} /pagefind/${f} (${lang})`); }
        }
      }
    } catch (e) { bad++; console.log(`FAIL pagefind-entry.json is not valid: ${e.message}`); }
  }
}
const missing = await get('/this-page-does-not-exist-smoke/');
if (missing.status !== 404) { bad++; console.log(`FAIL a missing page answered ${missing.status}, expected 404`); }
const home = await get('/');
if (home.enc !== 'gzip') console.log(`note: / was not gzip-encoded (Content-Encoding "${home.enc}")`);
console.log(`${urls.size + 1 - bad} of ${urls.size + 1} checks passed against ${base.origin}${pin ? ` via ${pin.ip}` : ''}`);
process.exit(bad ? 1 : 0);
