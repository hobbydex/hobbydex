// The facts a part takes from its equivalent spec (src/lib/specFacts.ts): which rows, in which order, and which
// the part's own fields override or the part page already shows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { partSpecFacts } from '../src/lib/specFacts.ts';

const screw = { id: 'spec/screw/m3x10-pan-jis-tapping', category: 'screw', name: 'M3x10 pan head screw', thread: 'M3', length_mm: 10, head: 'pan', drive: 'jis', thread_type: 'self-tapping' };
const labels = (r) => r.facts.map((f) => f.label);

test('a screw takes thread, length, head, drive and thread type; its own point comes last', () => {
  const r = partSpecFacts({ id: 'part/tamiya/60677', brand: 'brand/tamiya', category: 'screw', point: 'flat' }, [screw]);
  assert.deepEqual(labels(r), ['Thread', 'Length (mm)', 'Head', 'Drive', 'Point']);
  assert.deepEqual(r.facts.map((f) => f.text), ['M3, self-tapping', '10', 'pan', 'jis', 'flat']);
  assert.deepEqual(r.specs, [screw]);
});

test('a part thread type is combined with the spec size, once', () => {
  const r = partSpecFacts({ id: 'part/x/1', brand: 'brand/x', category: 'screw', thread_type: 'tapping' }, [screw]);
  assert.equal(r.facts.find((f) => f.key === 'thread').text, 'M3, tapping');
  assert.equal(r.threadInFacts, true);
  assert.equal(r.facts.filter((f) => f.label === 'Thread').length, 1);
});

test('several specs of one category give the fields they agree on', () => {
  const a = { id: 'spec/bearing/10x15x4', category: 'bearing', type: 'radial-ball', bore_mm: 10, outer_mm: 15, width_mm: 4 };
  const b = { id: 'spec/bearing/5x10x4', category: 'bearing', type: 'radial-ball', bore_mm: 5, outer_mm: 10, width_mm: 4 };
  const r = partSpecFacts({ id: 'part/amewi/28217', brand: 'brand/amewi', category: 'bearing' }, [a, b]);
  assert.deepEqual(labels(r), ['Type', 'Width (mm)']);
  assert.equal(r.specs.length, 2);
});

test('specs of different categories give nothing', () => {
  const wire = { id: 'spec/wire/10awg', category: 'wire', awg: 10, conductor_mm: 2.5882 };
  const r = partSpecFacts({ id: 'part/x/2', brand: 'brand/x', category: 'connector', point: 'flat' }, [screw, wire]);
  assert.deepEqual(r, { specs: [], facts: [], threadInFacts: false });
});

test('a battery cell count the part shows as LiPo is not repeated', () => {
  const cells = { id: 'spec/battery/2s', category: 'battery', chemistry: 'lipo', cells: 2, capacity_mah: 1400, nominal_v: 7.4 };
  const r = partSpecFacts({ id: 'part/x/3', brand: 'brand/x', category: 'battery', lipo_cells: [2, 2] }, [cells]);
  assert.deepEqual(labels(r), ['Chemistry', 'Capacity (mAh)', 'Nominal (V)']);
});

test('a spec source is kept with its value', () => {
  const c = { id: 'spec/connector/as150', category: 'connector', family: 'AS', current_a: 65, current_a_source: 'https://example.com/as150' };
  const r = partSpecFacts({ id: 'part/x/4', brand: 'brand/x', category: 'connector' }, [c]);
  assert.equal(r.facts.find((f) => f.label === 'Current (A)').source, 'https://example.com/as150');
  const own = partSpecFacts({ id: 'part/x/5', brand: 'brand/x', category: 'connector', current_a: 40 }, [c]);
  assert.ok(!own.facts.some((f) => f.label === 'Current (A)'));
});
