// The kit note tools/link_kit_sources.py writes on a platform with no release (lib/notes.ts): the page shows it
// as a label with the count of parts, so the line is cut from the running text and the rest of the note is kept.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutKnownFromParts } from '../src/lib/notes.ts';

const MARK = 'Known from spare parts only (no car release yet)';

test('the note written by the linker is cut; the notes before it stay', () => {
  assert.equal(withoutKnownFromParts(`${MARK}: named by 3 parts, first part/x/1 (source doc/x/shop).`), undefined);
  assert.equal(withoutKnownFromParts(`Chassis from the maker; ${MARK}: named by 3 parts, first part/x/1.`), 'Chassis from the maker');
});

test('a note without the line is returned unchanged', () => {
  assert.equal(withoutKnownFromParts('Drift chassis, 2 motors'), 'Drift chassis, 2 motors');
  assert.equal(withoutKnownFromParts(undefined), undefined);
  assert.equal(withoutKnownFromParts(''), '');
});
