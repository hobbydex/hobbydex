// A car's size and weight (src/lib/dimensions.ts): the figures a release shows, their text, and the bodies that fit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { figuresOf, dimensionRows, lengthText, weightText, bodyFit, bodiesFitting, carSize, fullFit } from '../src/lib/dimensions.ts';

const kit = { wheelbase_mm: [{ mm: 239, label: 'L' }, { mm: 225, label: 'M' }], track_front_mm: 148, track_rear_mm: 150, weight_g: 1200, source: 'https://maker.example/kit' };

test('a release takes its own figures, else its kit\'s, per measure; a track whole from one table', () => {
  const f = figuresOf({ length_mm: 400, track_mm: 152, source: 'https://maker.example/r' }, kit);
  assert.equal(f.length_mm.value, 400);
  assert.equal(f.length_mm.source, 'https://maker.example/r');
  assert.deepEqual(f.wheelbase_mm.value, kit.wheelbase_mm);
  assert.equal(f.wheelbase_mm.source, kit.source);
  assert.equal(f.track_mm.value, 152);
  assert.equal(f.track_front_mm, undefined);
});

test('the texts: options with labels, ranges, front / rear, weight in kg', () => {
  assert.equal(lengthText(kit.wheelbase_mm), '239 / 225 mm (L / M)');
  assert.equal(lengthText({ min: 255, max: 262 }), '255-262 mm');
  assert.equal(lengthText(171.5), '171.5 mm');
  assert.equal(weightText(505), '505 g');
  assert.equal(weightText(1520), '1.52 kg');
  const rows = dimensionRows(figuresOf({ length_mm: 400, width_mm: 190, source: 's' }, kit));
  assert.deepEqual(rows.map((r) => r.label), ['Wheelbase', 'Track width', 'Length x width', 'Weight']);
  assert.equal(rows[1].text, '148 / 150 mm (front / rear)');
  assert.equal(rows[2].text, '400 x 190 mm');
});

test('a body fits on a matching wheelbase, and on a matching width or track where both state one', () => {
  const car = carSize(figuresOf({ wheelbase_mm: 257, width_mm: 190, track_mm: 172, source: 's' }), '1/10');
  assert.equal(bodyFit({ id: 'a', category: 'body', wheelbase_mm: 257 }, car), 'wheelbase');
  assert.equal(bodyFit({ id: 'b', category: 'body', wheelbase_mm: 257, width_mm: 190 }, car), 'wheelbase, width');
  assert.equal(bodyFit({ id: 'c', category: 'body', wheelbase_mm: 257, width_mm: 200 }, car), null);
  assert.equal(bodyFit({ id: 'd', category: 'body', wheelbase_mm: { min: 251, max: 260 }, track_mm: 172 }, car), 'wheelbase, track');
  assert.equal(bodyFit({ id: 'e', category: 'body', wheelbase_mm: 260 }, car), null);
  assert.equal(bodyFit({ id: 'f', category: 'body', wheelbase_mm: 257, scale: '1/8' }, car), null);
  assert.equal(bodyFit({ id: 'g', category: 'wing', wheelbase_mm: 257 }, car), null);
  // a configurable wheelbase: any of its values
  assert.equal(bodyFit({ id: 'h', category: 'body', wheelbase_mm: 225 }, carSize(figuresOf(kit))), 'wheelbase');
});

test('bodies that fit: full matches (wheelbase and width or track) apart from wheelbase-only ones, each by brand and name', () => {
  const car = carSize(figuresOf({ wheelbase_mm: 257, width_mm: 190, source: 's' }), '1/10');
  const bodies = [{ id: '1', brand: 'b', name: 'Z', category: 'body', wheelbase_mm: 257 },
    { id: '2', brand: 'a', name: 'Y', category: 'body', wheelbase_mm: 257 },
    { id: '3', brand: 'c', name: 'X', category: 'body', wheelbase_mm: 257, width_mm: 190 },
    { id: '5', brand: 'a', name: 'V', category: 'body', wheelbase_mm: 257, width_mm: 190, scale: '1/10' },
    { id: '6', brand: 'a', name: 'U', category: 'body', wheelbase_mm: 257, width_mm: 190, scale: '1/8' },
    { id: '7', brand: 'a', name: 'T', category: 'body', wheelbase_mm: 257, width_mm: 205 },
    { id: '4', brand: 'a', name: 'W', category: 'body', wheelbase_mm: 300 }];
  const fits = bodiesFitting(bodies, car, (b) => b.brand);
  assert.deepEqual(fits.full.map((x) => x.body.id), ['5', '3']);
  assert.deepEqual(fits.wheelbaseOnly.map((x) => x.body.id), ['2', '1']);
  assert.deepEqual(bodiesFitting(bodies, carSize({}), (b) => b.brand), { full: [], wheelbaseOnly: [] });
});

test('a car that states only a wheelbase has no full matches', () => {
  const car = carSize(figuresOf({ wheelbase_mm: 257, source: 's' }), '1/10');
  const fits = bodiesFitting([{ id: '1', brand: 'a', name: 'A', category: 'body', wheelbase_mm: 257, width_mm: 195 }], car, (b) => b.brand);
  assert.equal(fits.full.length, 0);
  assert.equal(fits.wheelbaseOnly.length, 1);
  assert.equal(fullFit('wheelbase'), false);
  assert.equal(fullFit('wheelbase, track'), true);
});
