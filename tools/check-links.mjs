// Build-time internal link check: crawls every HTML page in dist/ and reports links to internal
// targets that do not exist as files. No network. Usage: node tools/check-links.mjs [--dist dist]
// [--max 0] (exit 1 when more than --max broken links; default 0) [--report] (always exit 0; also
// writes the count to $GITHUB_STEP_SUMMARY). Prints the first 50 broken targets.
import { readdirSync, readFileSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const dist = resolve(arg('--dist', 'dist'));
const max = Number(arg('--max', '0'));
const report = process.argv.includes('--report');

const pages = [];
const files = new Set();
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else { files.add(p); if (e.name.endsWith('.html')) pages.push(p); }
  }
};
walk(dist);

// does this site path resolve to a file, the way a static host serves it
const exists = (path) => {
  const p = join(dist, path);
  if (files.has(p)) return true;
  if (path.endsWith('/') || !/\.[a-z0-9]+$/i.test(path)) return files.has(join(p, 'index.html'));
  return false;
};

const broken = new Map();   // target -> [pages linking it]
let checked = 0;
const re = /<(?:a|link|img|script|source)\b[^>]*?\s(?:href|src)="([^"]+)"/gi;
for (const page of pages) {
  // inline script bodies and comments hold template strings such as href="/x/${id}", not links
  const html = readFileSync(page, 'utf8')
    .replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2')
    .replace(/<!--[\s\S]*?-->/g, '');
  if (/<meta http-equiv="refresh"/i.test(html) && html.length < 1000) continue;   // redirect stubs
  const here = '/' + page.slice(dist.length + 1).replace(/index\.html$/, '');
  for (const m of html.matchAll(re)) {
    let h = m[1].trim();
    if (!h || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(h)) continue;   // external, mailto:, fragments
    h = h.split('#')[0].split('?')[0];
    if (!h) continue;
    let target;
    try { target = decodeURI(h.startsWith('/') ? h : new URL(h, 'http://x' + here).pathname); } catch { continue; }
    checked++;
    if (!exists(target)) {
      if (!broken.has(target)) broken.set(target, []);
      broken.get(target).push(here);
    }
  }
}
const summary = `checked ${checked} internal links on ${pages.length} pages; ${broken.size} distinct broken targets`;
console.log(summary);
if (report && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Internal link check\n\n${summary}\n`);
let n = 0;
for (const [t, from] of [...broken].sort((a, b) => b[1].length - a[1].length)) {
  if (n++ >= 50) break;
  console.log(`  ${t}  <-  ${from.length} page(s), e.g. ${from[0]}`);
}
if (!report && broken.size > max) process.exit(1);
