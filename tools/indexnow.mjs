// IndexNow: tells Bing, Yandex, Seznam, Naver (and through Bing, DuckDuckGo, Ecosia,
// Yahoo, ChatGPT search, Copilot) which pages changed in a deploy.
//
//   node tools/indexnow.mjs plan --dist dist --previous <url|file> --out indexnow-plan.json
//     hashes every page in the built sitemaps (own content only), compares with the manifest of the live
//     site and writes the URLs to submit (at most 2000 a day), plus dist/indexnow-manifest.json.gz for next time
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
export const DAILY_CAP = 2000; // URLs submitted per UTC day across all deploys; the rest stay pending
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

// A page's own content hash. The shared chrome (header, footer with its "Last updated on <date>",
// stylesheet and script links) and build artefacts (hashed asset names, scoped-style ids) are left
// out, so only a change to the page's head data (title, description, JSON-LD) or its <main> counts.
export function pageHash(html) {
  const text = html
    .replace(/<header class="site"[\s\S]*?<\/header>/, '')
    .replace(/<footer class="site"[\s\S]*?<\/footer>/, '')
    .replace(/<link rel="(?:stylesheet|modulepreload)"[^>]*>/g, '')
    .replace(/<script\b[^>]*\bsrc="[^"]*"[^>]*><\/script>/g, '')
    .replace(/\/_astro\/[^"'\s)]+/g, '/_astro/')
    .replace(/ data-astro-cid-[a-z0-9]+(?:="")?/g, '')
    .replace(/\bastro-[a-z0-9]{8}\b/g, 'astro-');
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

export const dayOf = (now) => new Date(now).toISOString().slice(0, 10);

// Manifest (version 2): { day, sent, pages: { path: [hash, submittedDay, pendingSince] } }
//  - hash: content hash at the last submission (null: never submitted)
//  - submittedDay: that day as "YYYY-MM-DD" ("" when never)
//  - pendingSince: ms timestamp when the page was first seen changed and not yet submitted (0: none)
//  - day / sent: the UTC day and the number of URLs submitted on it, for the daily cap
//
// Compares the live manifest with the new build. A page is submitted only when its content hash
// differs from the hash at its last submission (new and removed pages count as changed), so an
// unchanged page is never resent. At most DAILY_CAP URLs go out per UTC day across all deploys,
// newest changes first (then shallow paths); the rest stay pending and are reconsidered next run.
// `previous` is a decoded manifest, null (none yet) or { legacy: true } (version 1, full-page
// hashes that are not comparable with the new ones: adopted without submitting anything).
export function plan(previous, current, { now = Date.now(), dailyCap = DAILY_CAP } = {}) {
  const today = dayOf(now);
  const wrap = (pages, sent, extra) => ({ manifest: { day: today, sent, pages }, ...extra });
  if (!previous) {
    const submit = seedPaths(current).slice(0, dailyCap);
    const pages = {};
    for (const [p, h] of Object.entries(current)) pages[p] = submit.includes(p) ? [h, today, 0] : [null, '', now];
    return wrap(pages, submit.length, { first: true, changed: submit.length, removed: 0, skipped: 0, submit });
  }
  if (previous.legacy) {
    const pages = {};
    for (const [p, h] of Object.entries(current)) pages[p] = [h, today, 0];
    return wrap(pages, 0, { migrated: true, changed: 0, removed: 0, skipped: 0, submit: [] });
  }
  const prev = previous.pages;
  const sentToday = previous.day === today ? previous.sent : 0;
  const budget = Math.max(0, dailyCap - sentToday);
  const pending = []; // [path, pendingSince]
  for (const [p, h] of Object.entries(current)) {
    const old = prev[p];
    if (!old || old[0] !== h) pending.push([p, old?.[2] || now]);
  }
  let removed = 0;
  for (const p of Object.keys(prev)) {
    if (!(p in current) && prev[p][0] !== null) { pending.push([p, prev[p][2] || now]); removed++; }
  }
  pending.sort((a, b) => b[1] - a[1] || byDepth(a[0], b[0]));
  const submit = pending.slice(0, budget).map(([p]) => p);
  const sent = new Set(submit);
  const pages = {};
  for (const [p, h] of Object.entries(current)) {
    const old = prev[p];
    if (sent.has(p)) pages[p] = [h, today, 0];
    else if (!old || old[0] !== h) pages[p] = [old?.[0] ?? null, old?.[1] ?? '', old?.[2] || now];
    else pages[p] = old;
  }
  for (const [p, since] of pending.slice(budget)) if (!(p in current)) pages[p] = [prev[p][0], prev[p][1], since];
  return wrap(pages, sentToday + submit.length, { first: false, changed: pending.length, removed, skipped: pending.length - submit.length, submit });
}

export function encodeManifest(m) {
  return gzipSync(JSON.stringify({ version: 2, ...m }));
}

// returns { day, sent, pages } or { legacy: true } for a version 1 manifest
export function decodeManifest(buf) {
  const bytes = Buffer.from(buf);
  const text = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8');
  const json = JSON.parse(text);
  if (json.version === 1 && typeof json.pages === 'object') return { legacy: true, pages: json.pages };
  if (json.version !== 2 || typeof json.pages !== 'object') throw new Error('unknown manifest format');
  return { day: json.day, sent: json.sent ?? 0, pages: json.pages };
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
  const result = plan(skip ? { legacy: true } : previous, current);
  writeFileSync(join(dist, MANIFEST), encodeManifest(result.manifest));
  writeFileSync(a.out ?? 'indexnow-plan.json', JSON.stringify({ key, urls: result.submit.map((p) => SITE + p) }));
  const note = result.first ? ' (first run: home and section pages only)' : result.migrated ? ' (manifest format changed: hashes adopted, nothing submitted)' : '';
  console.log(`IndexNow: ${Object.keys(current).length} pages hashed; changed ${result.changed} (${result.removed} removed), submitted ${result.submit.length}, skipped by the daily cap of ${DAILY_CAP}: ${result.skipped}; sent today ${result.manifest.sent}${note}`);
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
