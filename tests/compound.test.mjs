// A tyre compound is placed on the softness scale only where the maker's word says it clearly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { softness } from '../src/lib/compound.ts';

test('clear words map to a step', () => {
  for (const [word, step] of [['Soft', 'Soft'], ['Super Soft Long Wear', 'Super soft'], ['Supersoft', 'Super soft'], ['Ultra Soft', 'Ultra soft'], ['Clay Medium', 'Medium'], ['S3 Soft', 'Soft'], ['XM4 SoftMedium', 'Medium soft'], ['R1 Rain', 'Wet'], ['Hard', 'Hard']]) assert.equal(softness(word), step, word);
});
test('maker names and Shore numbers stay unmapped', () => {
  for (const word of ['Shore 35', 'Sport', 'Gekko', 'Advanced X2S³', 'Clay', 'White']) assert.equal(softness(word), undefined, word);
});
