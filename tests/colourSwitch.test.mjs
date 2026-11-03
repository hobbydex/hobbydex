// The colour switch (src/lib/colourSwitch.ts) and the tint of a default icon (iconTint in src/lib/colourDot.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colourSwitchItems } from '../src/lib/colourSwitch.ts';
import { iconTint, colourDotStyle } from '../src/lib/colourDot.ts';

const part = (number, color, extra = {}) => ({ id: `part/team-corally/${number}`, brand: 'brand/team-corally', number, name: 'Body', color, range: 'team-corally/c-00180-1055-colours', ...extra });

test('the switch lists every version of the range, the page part marked, in number order', () => {
  const here = part('C-00180-1055-R', 'red');
  const others = [part('C-00180-1055', 'clear'), part('C-00180-1055-B', 'blue'), part('C-00180-1055-G', 'green')];
  const items = colourSwitchItems(here, others);
  assert.deepEqual(items.map((i) => i.number), ['C-00180-1055', 'C-00180-1055-B', 'C-00180-1055-G', 'C-00180-1055-R']);
  assert.deepEqual(items.filter((i) => i.current).map((i) => i.number), ['C-00180-1055-R']);
  assert.equal(items.find((i) => i.number === 'C-00180-1055').colour, 'clear');
});

test('a version whose colour is not in the palette has no swatch (no dot style)', () => {
  const items = colourSwitchItems(part('C-1-R', 'red'), [part('C-1-X', 'puce')]);
  assert.equal(colourDotStyle(items.find((i) => i.number === 'C-1-X').colour), undefined);
  assert.ok(colourDotStyle(items.find((i) => i.number === 'C-1-R').colour));
});

test('the page part is not listed twice when it is also among the others', () => {
  const here = part('C-1-R', 'red');
  assert.equal(colourSwitchItems(here, [here, part('C-1-B', 'blue')]).length, 2);
});

test('a single known colour tints the default icon; a dark one takes the dark outline', () => {
  assert.deepEqual(iconTint('red'), { fill: '#d32f2f', dark: false });
  assert.equal(iconTint('black').dark, true);
  assert.equal(iconTint('white').dark, false);
  assert.equal(iconTint('clear').fill, 'rgba(150,150,160,0.6)');
  assert.equal(iconTint('gun metal').dark, false);
});

test('an unknown colour, a multi-colour part and no colour leave the icon untinted', () => {
  assert.equal(iconTint(undefined), undefined);
  assert.equal(iconTint('puce'), undefined);
  assert.equal(iconTint('black/red'), undefined);
});
