// The top view of a screw head (src/lib/screwTop.ts): the cross recess has four equal arms centred on the head.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crossPts, topView, boxCentre } from '../src/lib/screwTop.ts';

test('the cross has four equal arms and is centred on 0,0', () => {
  for (const R of [1, 1.6, 2.85, 5]) {
    const pts = crossPts(R);
    assert.equal(pts.length, 12);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    // left, right, up and down reach is the same
    assert.ok(Math.abs(Math.min(...xs) + Math.max(...xs)) < 1e-9);
    assert.ok(Math.abs(Math.min(...ys) + Math.max(...ys)) < 1e-9);
    assert.ok(Math.abs(Math.max(...xs) - Math.max(...ys)) < 1e-9, 'horizontal and vertical arms are as long');
    // the shape maps onto itself under a quarter turn
    const key = (p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
    const turned = new Set(pts.map(([x, y]) => key([-y, x])));
    assert.deepEqual(new Set(pts.map(key)), turned, 'a quarter turn leaves the cross unchanged');
  }
});

test('phillips and jis drives are centred on the head, round or hex, wherever the head is put', () => {
  for (const head of ['pan', 'button', 'hex', 'flanged-button']) {
    for (const drive of ['phillips', 'jis']) {
      for (const at of [[0, 0], [7.5, 3.25]]) {
        const v = topView({ head, drive, d: 3, dk: 5.7 }, at);
        assert.ok(v.drive && v.driveCentre);
        assert.ok(Math.abs(v.driveCentre[0] - v.headCentre[0]) < 0.01 && Math.abs(v.driveCentre[1] - v.headCentre[1]) < 0.01, `${head} ${drive} at ${at}`);
        assert.ok(Math.abs(v.headCentre[0] - at[0]) < 0.01 && Math.abs(v.headCentre[1] - at[1]) < 0.01);
      }
    }
  }
  assert.deepEqual(boxCentre([[0, 0], [2, 4]]), [1, 2]);
});
