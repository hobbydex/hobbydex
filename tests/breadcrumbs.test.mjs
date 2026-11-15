// The schema.org BreadcrumbList (src/lib/breadcrumbs.ts) of the page trails, as golden JSON, and on the built site:
// every page with a visible trail carries one BreadcrumbList that matches it, and pages without a trail carry none.
// The built-site tests are skipped when the site is not built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { breadcrumbJsonLd, jsonLdText } from '../src/lib/breadcrumbs.ts';
import { findPage } from './built-pages.mjs';

const site = 'https://hobbydex.com';
const head = [{ name: 'Hobbydex', href: '/' }, { name: 'RC cars', href: '/rc/' }];
const list = (...items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, ...x })) });
const home = [{ name: 'Hobbydex', item: 'https://hobbydex.com/' }, { name: 'RC cars', item: 'https://hobbydex.com/rc/' }];

test('a release trail: brand and platform linked, the release last without item', () => {
  const crumbs = [...head, { name: 'Kyosho', href: '/rc/brands/kyosho/' }, { name: 'Ultima Pro', href: '/rc/platforms/kyosho/ultima-pro/' }, { name: 'ULTIMA PRO' }];
  assert.deepEqual(breadcrumbJsonLd(crumbs, site), list(...home,
    { name: 'Kyosho', item: 'https://hobbydex.com/rc/brands/kyosho/' },
    { name: 'Ultima Pro', item: 'https://hobbydex.com/rc/platforms/kyosho/ultima-pro/' },
    { name: 'ULTIMA PRO' }));
});

test('a release of an unknown chassis: the unlinked crumb is left out, positions stay 1..n', () => {
  const crumbs = [...head, { name: 'Kyosho', href: '/rc/brands/kyosho/' }, { name: 'Chassis not yet known' }, { name: 'Mystery' }];
  assert.deepEqual(breadcrumbJsonLd(crumbs, site), list(...home, { name: 'Kyosho', item: 'https://hobbydex.com/rc/brands/kyosho/' }, { name: 'Mystery' }));
});

test('a part trail: the brand note is not part of its name', () => {
  const crumbs = [...head, { name: 'Tamiya', href: '/rc/brands/tamiya/', note: '(brand defunct)' }, { name: '51000 TT-02 A Parts' }];
  assert.deepEqual(breadcrumbJsonLd(crumbs, site), list(...home, { name: 'Tamiya', item: 'https://hobbydex.com/rc/brands/tamiya/' }, { name: '51000 TT-02 A Parts' }));
});

test('a platform trail', () => {
  const crumbs = [...head, { name: 'Tamiya', href: '/rc/brands/tamiya/' }, { name: 'TT-02' }];
  assert.deepEqual(breadcrumbJsonLd(crumbs, site), list(...home, { name: 'Tamiya', item: 'https://hobbydex.com/rc/brands/tamiya/' }, { name: 'TT-02' }));
});

test('a brand page trail', () => {
  assert.deepEqual(breadcrumbJsonLd([...head, { name: 'Kyosho' }], site), list(...home, { name: 'Kyosho' }));
});

test('special characters: names kept as shown, the script text cannot close the element', () => {
  const name = 'Mini 4WD "Super" </script><!-- Avante™ & Co \u2028 1/10';
  const crumbs = [...head, { name: 'Ü&Co <Racing>', href: '/rc/brands/u-co/' }, { name }];
  const data = breadcrumbJsonLd(crumbs, site);
  const text = jsonLdText(data);
  assert.equal(text, '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":['
    + '{"@type":"ListItem","position":1,"name":"Hobbydex","item":"https://hobbydex.com/"},'
    + '{"@type":"ListItem","position":2,"name":"RC cars","item":"https://hobbydex.com/rc/"},'
    + '{"@type":"ListItem","position":3,"name":"Ü\\u0026Co \\u003cRacing\\u003e","item":"https://hobbydex.com/rc/brands/u-co/"},'
    + '{"@type":"ListItem","position":4,"name":"Mini 4WD \\"Super\\" \\u003c/script\\u003e\\u003c!-- Avante™ \\u0026 Co \\u2028 1/10"}]}');
  assert.ok(!/[<>&\u2028]/.test(text));
  assert.deepEqual(JSON.parse(text), data);
});

test('item URLs are absolute and percent-encoded', () => {
  const data = breadcrumbJsonLd([{ name: 'Hobbydex', href: '/' }, { name: 'Café', href: '/rc/makes/café/' }, { name: 'x' }], site);
  assert.equal(data.itemListElement[1].item, 'https://hobbydex.com/rc/makes/caf%C3%A9/');
});

// --- built site ---
const built = existsSync(fileURLToPath(new URL('../dist/rc/index.html', import.meta.url)));
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const trailOf = (html) => {
  const div = html.match(/<div class="crumbs"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  if (div === undefined) return undefined;
  return div.replace(/<span class="muted">[^<]*<\/span>/g, '').split(' / ').map((seg) => {
    const a = seg.match(/^<a href="([^"]*)">([\s\S]*)<\/a>$/);
    return a ? { name: decode(a[2]).trim(), href: decode(a[1]) } : { name: decode(seg.replace(/<[^>]+>/g, '')).trim() };
  });
};
const check = (page) => {
  const trail = trailOf(page.html);
  const lists = ldBlocks(page.html).filter((d) => d['@type'] === 'BreadcrumbList');
  assert.equal(lists.length, 1, `${page.path}: one BreadcrumbList`);
  assert.deepEqual(lists[0], breadcrumbJsonLd(trail, site), `${page.path}: the BreadcrumbList matches the visible trail`);
  const items = lists[0].itemListElement;
  items.forEach((x, i) => {
    assert.equal(x.position, i + 1);
    assert.equal(typeof x.name, 'string');
    if (i < items.length - 1) assert.match(x.item, /^https:\/\/hobbydex\.com\//);
    else assert.equal(x.item, undefined);
  });
};

for (const [kind, root] of [['release', 'rc/releases/'], ['part', 'rc/parts/'], ['platform', 'rc/platforms/'], ['brand', 'rc/brands/']]) {
  test(`built: a ${kind} page's BreadcrumbList matches its trail`, { skip: !built }, () => {
    const page = findPage(root, (h) => h.includes(`data-pagefind-meta="type:${kind}"`));
    assert.ok(page, `a ${kind} page`);
    check(page);
  });
}

test('built: /data/ keeps its Dataset next to the BreadcrumbList', { skip: !built }, () => {
  const page = findPage('data/', () => true);
  check(page);
  assert.equal(ldBlocks(page.html).filter((d) => d['@type'] === 'Dataset').length, 1);
});

test('built: the home page has no trail and no BreadcrumbList', { skip: !built }, () => {
  const html = readFileSync(fileURLToPath(new URL('../dist/index.html', import.meta.url)), 'utf8');
  assert.equal(trailOf(html), undefined);
  assert.ok(!html.includes('BreadcrumbList'));
});
