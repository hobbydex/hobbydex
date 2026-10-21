// Release table logic (public/release-table.js): the URL state, filters, facet counts and sort, on a small list.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decode, presentValues, parseSearch, toSearch, filterRows, facets, options, sortRows, listRows, stepYear, NONE } from '../public/release-table.js';

const list = {
  brands: [['traxxas', 'Traxxas'], ['arrma', 'Arrma']],
  types: [['monster', 'Monster trucks', 'monster', 1], ['car', 'Other cars', 'car', 1]],
  scales: ['1/10', '1/8', ''],
  builds: [['rtr', 'RTR'], ['kit', 'Kit']],
  statuses: ['released', 'discontinued'],
  rows: [
    ['4-tec', 'E-Revo', 0, 0, 0, 0, 0, '2020-03', 0, 'M0 0h48'],
    ['old', 'Old Car', 1, 1, 2, 1, 1, '1998', 1, null],
    ['no-date', 'Plain', 1, 1, 2, 0, 0, '', 0, null],
    ['kit-1', 'Kit One', 0, 1, 0, 1, 0, '2024-05-01', 2, null],
  ],
};
const rows = decode(list);

test('decode resolves the index columns and the URL', () => {
  assert.equal(rows[0].url, '/rc/releases/traxxas/4-tec/');
  assert.equal(rows[0].year, '2020');
  assert.equal(rows[0].art, 'M0 0h48');
  assert.equal(rows[2].scale, '');
  assert.equal(rows[2].year, NONE);
  assert.equal(rows[1].seen, true);
  assert.equal(rows[3].doubt, true);
});

test('the URL restores filters and drops unknown values', () => {
  const present = presentValues(rows);
  const s = parseSearch('?brand=traxxas&type=monster&scale=1-10&build=kit&year=bogus', present);
  assert.deepEqual(s.filters, { brand: 'traxxas', type: 'monster', scale: '1/10', build: 'kit' });
  assert.deepEqual(parseSearch('?year=2020', present).filters, { year: '2020' });
  assert.deepEqual(parseSearch('?year=1900', present).filters, {});
  assert.equal(s.sort, 'date');
  assert.equal(s.dir, 'desc');
});

test('toSearch writes the filters, and sort only when it is not the default', () => {
  assert.equal(toSearch({ filters: { brand: 'traxxas', scale: '1/10', year: '2020' }, sort: 'date', dir: 'desc' }), '?brand=traxxas&scale=1-10&year=2020');
  assert.equal(toSearch({ filters: {}, sort: 'name', dir: 'asc' }), '?sort=name&dir=asc');
  assert.equal(toSearch({ filters: {}, sort: 'date', dir: 'desc' }), '');
});

test('filters combine, and a select counts over the other filters', () => {
  const f = { type: 'car' };
  assert.deepEqual(filterRows(rows, f, null).map((r) => r.name), ['Old Car', 'Plain', 'Kit One']);
  const c = facets(rows, { brand: 'arrma' });
  assert.equal(c.type.get('car'), 2);
  assert.equal(c.type.get('monster'), undefined);
  const o = options(list, rows, { brand: 'arrma' }, c);
  assert.deepEqual(o.type.map((x) => [x.label, x.count]), [['Other cars', 2]]);
});

test('the car type stays in the type options and is labelled Other cars', () => {
  const o = options(list, rows, {}, facets(rows, {}));
  assert.ok(o.type.some((x) => x.value === 'car' && x.label === 'Other cars' && x.count === 3));
});

test('sort: newest first with undated last; names and brands both ways', () => {
  assert.deepEqual(sortRows(rows, 'date', 'desc').map((r) => r.name), ['Kit One', 'E-Revo', 'Old Car', 'Plain']);
  assert.deepEqual(sortRows(rows, 'date', 'asc').map((r) => r.name), ['Old Car', 'E-Revo', 'Kit One', 'Plain']);
  assert.deepEqual(sortRows(rows, 'name', 'asc').map((r) => r.name), ['E-Revo', 'Kit One', 'Old Car', 'Plain']);
  assert.deepEqual(sortRows(rows, 'brand', 'asc').map((r) => r.brandName), ['Arrma', 'Arrma', 'Traxxas', 'Traxxas']);
});

test('the year stepper moves one or five years within the years present, and starts at the newest from All years', () => {
  const range = [1998, 2024];
  assert.equal(stepYear(undefined, -1, range), '2024');
  assert.equal(stepYear('2020', -1, range), '2019');
  assert.equal(stepYear('2020', 5, range), '2024');
  assert.equal(stepYear('2022', -5, range), '2017');
  assert.equal(stepYear('2000', -5, range), '1998');
});

test('a year starts the newest-first list there and runs on into older years', () => {
  // 2027 has no release: the list starts with the newest row (2024), and the other filters still apply
  assert.deepEqual(listRows(rows, { year: '2027' }, 'date', 'desc').map((r) => r.name), ['Kit One', 'E-Revo', 'Old Car', 'Plain']);
  assert.deepEqual(listRows(rows, { year: '2020' }, 'date', 'desc').map((r) => r.name), ['E-Revo', 'Old Car', 'Plain']);
  assert.deepEqual(listRows(rows, { year: '2020', brand: 'arrma' }, 'date', 'desc').map((r) => r.name), ['Old Car', 'Plain']);
  assert.deepEqual(listRows(rows, { year: '1998' }, 'name', 'asc').map((r) => r.name), ['Old Car']);
});
