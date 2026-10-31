// Hardware drawn from a spec's size (src/lib/drawnHardware.ts), for a spec with no traced drawing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawnSvg } from '../src/lib/drawnHardware.ts';

const box = (svg) => svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);

test('a washer is a ring at its true size with a thickness edge below', () => {
  const svg = drawnSvg({ category: 'washer', bore_mm: 6, outer_mm: 8, thickness_mm: 1 });
  const [, , w, h] = box(svg);
  assert.ok(Math.abs(w - 8.6) < 0.01, 'as wide as the outer diameter plus the margin');
  assert.ok(Math.abs(h - (8 + 1 + 1 + 0.6)) < 0.01, 'face, gap and thickness');
  assert.match(svg, /class="sil"/);
  assert.match(svg, /<g class="lines"/);
  assert.match(svg, /data-pitch-x="[\d.]+" data-pitch-y="[\d.]+"/);
});

test('every category with sizes draws; a spec with no size does not', () => {
  const specs = [
    { category: 'bearing', bore_mm: 5, outer_mm: 11, width_mm: 4 },
    { category: 'o-ring', inner_mm: 6, cross_mm: 1.5 },
    { category: 'nut', thread: 'M3', type: 'hex' },
    { category: 'nut', thread: 'M4', type: 'flanged-nylon-lock' },
    { category: 'eclip', shaft_mm: 3, groove_mm: 2, din_outer_mm: 5 },
    { category: 'ball-end', ball_mm: 5.8, type: 'stud' },
    { category: 'pin', diameter_mm: 3, length_mm: 12 },
    { category: 'screw', thread: 'M2.5', length_mm: 6, head: 'button', drive: 'hex' },
    { category: 'screw', thread: 'M3', length_mm: 10, head: 'countersunk', drive: 'phillips' },
    { category: 'screw', thread: 'M3', length_mm: 8, head: 'set', drive: 'hex' },
  ];
  for (const s of specs) assert.ok(drawnSvg(s), JSON.stringify(s));
  assert.equal(drawnSvg({ category: 'washer', bore_mm: 6 }), undefined);
  assert.equal(drawnSvg({ category: 'motor' }), undefined);
  assert.equal(drawnSvg({ category: 'nut', thread: 'M3', type: 'wing' }), undefined);
});

test('a screw is as long as its length below the head, with the head top view beside it', () => {
  const svg = drawnSvg({ category: 'screw', thread: 'M2.5', length_mm: 6, head: 'button', drive: 'hex' });
  const [, , w, h] = box(svg);
  assert.ok(h >= 6 + 1.4 + 0.6 - 0.01, 'button head height 1.4 plus 6 mm shank');
  assert.ok(w > 4.6 * 2, 'side view and top view side by side');
});
