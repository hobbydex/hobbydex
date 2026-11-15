// The sitemap's content date of a record (lib/shownDate.ts): a bookkeeping-only commit does not move it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shownDate } from '../src/lib/shownDate.ts';

test('the content date wins over the last commit of the file', () => {
  // the file was last touched on 11-14 by a commit that only lowered seen_by; its name last changed on 10-20
  assert.equal(shownDate({ modified: '2026-11-14', content_modified: '2026-10-20' }), '2026-10-20');
});

test('without a content date the last commit is the content date', () => {
  assert.equal(shownDate({ modified: '2026-11-14' }), '2026-11-14');
});

test('no dates (an export without git history) give none', () => {
  assert.equal(shownDate({}), undefined);
  assert.equal(shownDate(undefined), undefined);
  assert.equal(shownDate({ modified: 3 }), undefined);
});
