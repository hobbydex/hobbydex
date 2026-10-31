// The OCR note links the word "manual" to the page of the document the name was read from.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitAtDocWord, readFromDoc } from '../src/lib/notes.ts';

test('the word manual splits the note', () => {
  assert.deepEqual(splitAtDocWord('Name read by OCR from a scanned Tamiya manual; verify'), ['Name read by OCR from a scanned Tamiya ', 'manual', '; verify']);
  assert.equal(splitAtDocWord('Name from the label on a drawing'), undefined);
  assert.equal(splitAtDocWord(undefined), undefined);
});

test('the first manual with a page is the document', () => {
  const docs = { a: { kind: 'product_page' }, b: { kind: 'manual' }, c: { kind: 'manual' } };
  const page = (d) => (d === docs.c ? 'https://x/c' : undefined);
  const r = readFromDoc([undefined, 'a', 'b', 'c'], (id) => docs[id], page);
  assert.equal(r.page, 'https://x/c');
  assert.equal(readFromDoc(['a'], (id) => docs[id], page), undefined);
});
