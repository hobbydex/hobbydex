// The colour switch's swatch for a version with no colour field: the colour word its name varies by.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colourSwitchItems, colourWordsOf } from '../src/lib/colourSwitch.ts';

const part = (number, name, extra = {}) => ({ id: `part/team-corally/${number}`, brand: 'brand/team-corally', number, name, range: 'team-corally/c-00181-0216-1-colours', ...extra });
const body = (c) => `Polycarbonate Body - Syncro 4 - Clear - Cut - Window Mask - ${c} - 1 pc`;

test('Team Corally C-00181-0216-1 colours: each version gets the colour word its name varies by', () => {
  const names = [body('Green'), body('Orange'), body('Pink'), body('Red')];
  assert.deepEqual(colourWordsOf(names), ['green', 'orange', 'pink', 'red']);
  const here = part('C-00181-0216-1G', names[0]);
  const others = [part('C-00181-0216-1O', names[1]), part('C-00181-0216-1P', names[2]), part('C-00181-0216-1R', names[3])];
  const items = colourSwitchItems(here, others);
  assert.deepEqual(items.map((i) => i.colour), ['green', 'orange', 'pink', 'red']);
  assert.deepEqual(items.map((i) => i.number), ['C-00181-0216-1G', 'C-00181-0216-1O', 'C-00181-0216-1P', 'C-00181-0216-1R'].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
});

test('a colour field wins over the name; no single varying colour word leaves the switch as text', () => {
  const items = colourSwitchItems(part('C-1-G', body('Green'), { color: 'lime' }), [part('C-1-R', body('Red'))]);
  assert.equal(items.find((i) => i.number === 'C-1-G').colour, 'lime');
  assert.equal(items.find((i) => i.number === 'C-1-R').colour, 'red');
  assert.deepEqual(colourWordsOf(['Body - Red - Blue', 'Body - Green - Black']), [undefined, undefined]);
  assert.deepEqual(colourWordsOf(['Body 1', 'Body 2']), [undefined, undefined]);
});
