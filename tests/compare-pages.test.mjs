// The ESC and motor compare pages (built output): each column that is shown has values, plug cells link to their
// connector specs, and the motor page shows mounting holes. Checks properties of the page, not a live part.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const page = (p) => readFileSync(fileURLToPath(new URL(`../dist/rc/${p}/index.html`, import.meta.url)), 'utf8');
const table = (html) => {
  const heads = [...html.match(/<thead[^>]*>[\s\S]*?<\/thead>/)[0].matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
  const rows = [...html.match(/<tbody[^>]*>[\s\S]*?<\/tbody>/)[0].matchAll(/<tr [\s\S]*?<\/tr>/g)].map((m) =>
    [...m[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]));
  return { heads, rows };
};

for (const [name, must] of [['escs', ['Type', 'Current A', 'Battery plug', 'Waterproof', 'Scales']], ['motors', ['Type', 'kV', 'Can', 'Mount holes', 'Scales']]]) {
  test(`${name}: has its columns, every shown column has a value, rows match the head`, () => {
    const { heads, rows } = table(page(name));
    for (const h of must) assert.ok(heads.includes(h), `${h} column`);
    assert.ok(rows.length > 50, 'many rows');
    for (const r of rows) assert.equal(r.length, heads.length, 'one cell per head');
    heads.forEach((h, i) => { if (i > 1) assert.ok(rows.some((r) => r[i].replace(/<[^>]*>/g, '').trim()), `${h} has a value in some row`); });
  });
}

test('ESC plug cells link to connector specs', () => {
  const { heads, rows } = table(page('escs'));
  const i = heads.indexOf('Battery plug');
  assert.ok(rows.some((r) => /<a href="\/rc\/specs\/connector\/[^"]+"/.test(r[i])), 'a battery plug links to its spec');
});

test('motor mount holes read "<n> x <thread> @ <mm> mm"', () => {
  const { heads, rows } = table(page('motors'));
  const i = heads.indexOf('Mount holes');
  const vals = rows.map((r) => r[i].trim()).filter(Boolean);
  assert.ok(vals.length > 0);
  for (const v of vals) assert.match(v, /^(\d+ x )?M\d(\.\d)? @ [\d.]+ mm( \+ (\d+ x )?M\d(\.\d)? @ [\d.]+ mm)*$/);
});
