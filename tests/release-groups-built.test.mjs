// The built release list (dist/rc/releases/list.json): every colour family is one row of the table, whatever the
// sort or filter, and the brand and by-year lists show it as one row too. Skipped when the site is not built.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { decode, collapse, sortRows } from '../public/release-table.js';

const file = fileURLToPath(new URL('../dist/rc/releases/list.json', import.meta.url));
const built = existsSync(file);
const list = built ? JSON.parse(readFileSync(file, 'utf8')) : null;

test('every colour family on the release list is one row', { skip: !built }, () => {
  assert.ok(list.groups.length > 0, 'the list has colour families');
  const rows = decode(list);
  for (const [sort, dir] of [['date', 'desc'], ['date', 'asc'], ['name', 'asc'], ['brand', 'desc']]) {
    const entries = collapse(sortRows(rows, sort, dir), list.groups);
    const grouped = entries.filter((e) => e.members);
    const ids = grouped.map((e) => e.row.group);
    assert.equal(new Set(ids).size, ids.length, `${sort} ${dir}: a family appears in two rows`);
    assert.equal(ids.length, list.groups.length, `${sort} ${dir}: a family is missing`);
    assert.equal(entries.length, rows.length - rows.filter((r) => r.group >= 0).length + list.groups.length);
  }
  // every family member's release is in the table, with its tail in the family's members
  for (const r of rows.filter((x) => x.group >= 0)) {
    assert.ok(list.groups[r.group][1].some((m) => r.url.endsWith(`/${m[0]}/`)), `${r.url} is in its family`);
  }
});

test('a brand release list shows a colour family as one row', { skip: !built }, () => {
  const rows = decode(list);
  const row = rows.find((r) => r.group >= 0);
  const links = list.groups[row.group][1].map((m) => `/rc/releases/${row.brand}/${m[0]}/`);
  const html = readFileSync(fileURLToPath(new URL(`../dist/rc/releases/${row.brand}/index.html`, import.meta.url)), 'utf8');
  const trs = html.split('<tr').filter((t) => links.some((l) => t.includes(`href="${l}"`)));
  assert.equal(trs.length, 1, 'all colours of a family sit in one row');
  assert.ok(links.every((l) => trs[0].includes(`href="${l}"`)));
});
