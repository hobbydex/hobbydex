// A category column takes its own side first (part or spec), then the other side, so a part with its own
// motor_type and no linked spec still shows it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rawValue } from '../src/lib/columnValue.ts';

const type = { field: 'motor_type', from: 'spec' };
test('a spec column falls back to the part own field', () => {
  assert.equal(rawValue(type, { motor_type: 'brushless' }, undefined), 'brushless');
  assert.equal(rawValue(type, { motor_type: 'brushless' }, { motor_type: 'brushed' }), 'brushed');
  assert.equal(rawValue(type, {}, undefined), undefined);
});
test('a part column falls back to the spec', () => {
  assert.equal(rawValue({ field: 'shaft_mm', from: 'part' }, {}, { shaft_mm: 3.175 }), 3.175);
});
test('the can falls back to the code of the measured size', () => {
  assert.equal(rawValue({ field: 'can', from: 'spec' }, { diameter_mm: 36, length_mm: 51.75 }, undefined), '3652');
  assert.equal(rawValue({ field: 'can', from: 'spec' }, { diameter_mm: 36 }, undefined), undefined);
});
