// The build label (lib/build.ts) for every release kind: each kind has its own label, a 3D print release reads "3D print",
// and the release list offers a build option for every kind that occurs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_LABELS, buildLabel } from '../src/lib/build.ts';

const KINDS = ['kit', 'rtr', 'arr', 'roller', 'print'];

test('every release kind has a label, and no two kinds share one', () => {
  const labels = KINDS.map((k) => buildLabel(k));
  for (const label of labels) assert.ok(label.length > 0);
  assert.equal(new Set(labels).size, KINDS.length);
  assert.deepEqual(Object.keys(BUILD_LABELS).sort(), [...KINDS].sort());
});

test('a kind with a power system reads "build · power"; a kind without one reads only its label', () => {
  for (const kind of KINDS) {
    assert.equal(buildLabel(kind), BUILD_LABELS[kind]);
    assert.equal(buildLabel(kind, 'brushed'), `${BUILD_LABELS[kind]} · brushed`);
  }
});

test('print reads "3D print"; a missing kind has no label, an unknown one shows as stored', () => {
  assert.equal(buildLabel('print'), '3D print');
  assert.equal(buildLabel(undefined), '');
  assert.equal(buildLabel(''), '');
  assert.equal(buildLabel('mystery'), 'mystery');
});
