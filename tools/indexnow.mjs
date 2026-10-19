// IndexNow: tells Bing, Yandex, Seznam, Naver (and through Bing, DuckDuckGo, Ecosia,
// Yahoo, ChatGPT search, Copilot) which pages changed in a deploy.
//
//   node tools/indexnow.mjs plan --dist dist --previous <url|file> --out indexnow-plan.json
//     hashes every page in the built sitemaps, compares with the manifest of the live
//     site and writes the URLs to submit, plus dist/indexnow-manifest.json.gz for next time
//   node tools/indexnow.mjs submit --plan indexnow-plan.json [--dry-run]
//     posts the planned URLs to api.indexnow.org in batches (--dry-run only prints them)
//
// The key is the one public/<32 hex>.txt file. Never exits non-zero: IndexNow must not
// break a deploy.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync, gzipSync } from 'node:zlib';

const SITE = 'https://hobbydex.com';
const HOST = 'hobbydex.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const MANIFEST = 'indexnow-manifest.json.gz';
export const MAX_PER_RUN = 10000; // one run submits at most this many; the rest wait for the next run
const BATCH = 10000; // the protocol's limit per request

// the key file: <key>.txt whose content is the key
export function findKey(dir) {
  for (const f of readdirSync(dir)) {
    const m = /^([0-9a-f]{32})\.txt$/.exec(f);
    if (m && readFileSync(join(dir, f), 'utf8').trim() === m[1]) return m[1];
  }
  return null;
}

// site paths ("/rc/platforms/") of every page in the built sitemaps
export function sitemapPaths(dist) {
  const paths = [];
  for (const f of readdirSync(dist).filter((f) => /^sitemap-\d+\.xml$/.test(f))) {
    for (const m of readFileSync(join(dist, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      if (m[1].startsWith(SITE)) paths.push(m[1].slice(SITE.length));
    }
  }
  return paths.sort();
}

// a page's content hash; hashed asset file names (/_astro/Base.BiW4y49O.css) are left out,
// so a style or script change does not count as every page changing
export function pageHash(html) {
  const text = html.replace(/\/_astro\/[^"'\s)]+/g, '/_astro/');
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function buildManifest(dist) {
  const pages = {};
  for (const p of sitemapPaths(dist)) {
    const file = join(dist, p, 'index.html');
    if (existsSync(file)) pages[p] = pageHash(readFileSync(file, 'utf8'));
  }
  return pages;
}

const depth = (p) => p.split('/').filter(Boolean).length;
const byDepth = (a, b) => depth(a) - depth(b) || (a < b ? -1 : a > b ? 1 : 0);

// the first run submits only the home page and the section pages (at most two path segments)
export function seedPaths(current) {
  return Object.keys(current).filter((p) => depth(p) <= 2).sort(byDepth);
}

// Compares the live manifest with the new build. Returns the paths to submit (changed, new
// and removed pages, shallow paths first, capped) and the manifest to publish: it records
// what has been submitted, so pages over the cap keep their old hash (or stay out) and
// show up as changed again next run.
export function plan(previous, current, cap = MAX_PER_RUN) {
  if (!previous) {
    return { first: true, pending: 0, submit: seedPaths(current).slice(0, cap), manifest: { ...current } };
  }
  const changed = Object.keys(current).filter((p) => previous[p] !== current[p]);
  const removed = Object.keys(previous).filter((p) => !(p in current));
  const all = [...changed, ...removed].sort(byDepth);
  const submit = all.slice(0, cap);
  const manifest = { ...current };
  for (const p of all.slice(cap)) {
    if (p in previous) manifest[p] = previous[p];
    else delete manifest[p];
  }
  return { first: false, pending: all.length - submit.length, changed: changed.length, removed: removed.length, submit, manifest };
}

export function encodeManifest(pages) {
  return gzipSync(JSON.stringify({ version: 1, pages }));
}

export function decodeManifest(buf) {
  const bytes = Buffer.from(buf);
  const text = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8');
  const json = JSON.parse(text);
  if (json.version !== 1 || typeof json.pages !== 'object') throw new Error('unknown manifest format');
  return json.pages;
}

// the live manifest: null when there is none yet (404); throws on anything else
async function loadPrevious(source) {
  if (!/^https?:/.test(source)) return existsSync(source) ? decodeManifest(readFileSync(source)) : null;
  const res = await fetch(source, { headers: { 'User-Agent': 'hobbydex-deploy (+https://hobbydex.com)' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${source}`);
  return decodeManifest(await res.arrayBuffer());
}

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[argv[i].slice(2)] = true;
    else out[argv[i++].slice(2)] = next;
  }
  return out;
}

async function cmdPlan(a) {
  const dist = a.dist ?? 'dist';
  const key = findKey(dist);
  if (!key) throw new Error(`no <key>.txt in ${dist}`);
  const current = buildManifest(dist);
  let previous;
  let skip = false;
  try {
    previous = await loadPrevious(a.previous ?? `${SITE}/${MANIFEST}`);
  } catch (e) {
    // the live manifest could not be read: submit nothing, publish the new one
    console.log(`IndexNow: previous manifest unavailable (${e.message}); nothing submitted this run`);
    skip = true;
  }
  const result = skip ? { first: false, submit: [], pending: 0, manifest: current } : plan(previous, current);
  writeFileSync(join(dist, MANIFEST), encodeManifest(result.manifest));
  writeFileSync(a.out ?? 'indexnow-plan.json', JSON.stringify({ key, urls: result.submit.map((p) => SITE + p) }));
  const summary = result.first
    ? `first run: ${result.submit.length} home and section pages`
    : `${result.changed ?? 0} changed or new, ${result.removed ?? 0} removed; submitting ${result.submit.length}, ${result.pending} left for the next run`;
  console.log(`IndexNow: ${Object.keys(current).length} pages hashed; ${summary}`);
}

async function cmdSubmit(a) {
  const { key, urls } = JSON.parse(readFileSync(a.plan ?? 'indexnow-plan.json', 'utf8'));
  if (!urls.length) { console.log('IndexNow: nothing to submit'); return; }
  for (let i = 0; i < urls.length; i += BATCH) {
    const body = { host: HOST, key, keyLocation: `${SITE}/${key}.txt`, urlList: urls.slice(i, i + BATCH) };
    if (a['dry-run']) {
      console.log(`IndexNow dry run: would POST ${body.urlList.length} URLs to ${ENDPOINT} (keyLocation ${body.keyLocation})`);
      for (const u of body.urlList) console.log(u);
      continue;
    }
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
      });
      const text = (await res.text()).slice(0, 300);
      console.log(`IndexNow: POST ${body.urlList.length} URLs -> HTTP ${res.status}${text ? ` ${text}` : ''}`);
    } catch (e) {
      console.log(`IndexNow: POST ${body.urlList.length} URLs failed: ${e.message}`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = args(rest);
  const run = cmd === 'plan' ? cmdPlan : cmd === 'submit' ? cmdSubmit : null;
  if (!run) {
    console.log('usage: indexnow.mjs plan|submit [options]');
  } else {
    try { await run(a); } catch (e) { console.log(`IndexNow: ${cmd} failed: ${e.message}`); }
  }
}
