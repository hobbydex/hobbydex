// Barcode and part number keys for the scan page (src/lib/gtinCode.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gtin13, expandUpcE, partNoKey, bucketOf, PARTNO_BUCKETS, shardOf } from '../src/lib/gtinCode.ts';

test('UPC-A is read as its EAN-13 form with a leading 0', () => {
  assert.equal(gtin13('036000291452'), '0036000291452');
  assert.equal(gtin13('0036000291452'), '0036000291452');
});

test('GTIN-14 with a leading 0 is the EAN-13', () => {
  assert.equal(gtin13('00036000291452'), '0036000291452');
});

test('UPC-E is expanded to UPC-A before the lookup', () => {
  assert.equal(expandUpcE('04252614'), '042100005264');
  assert.equal(gtin13('04252614'), '0042100005264');
});

test('EAN-8 (Tamiya Germany 45032776) is kept with five leading zeros; a wrong check digit is not a barcode', () => {
  assert.equal(gtin13('45032776'), '0000045032776');
  assert.equal(gtin13('45032777'), null);
});

test('a wrong check digit, a wrong length or letters are not a barcode', () => {
  assert.equal(gtin13('036000291453'), null);
  assert.equal(gtin13('0425261'), null);
  assert.equal(gtin13('12345'), null);
  assert.equal(gtin13('abc'), null);
});

test('spaces in a scanned or pasted code are ignored', () => {
  assert.equal(gtin13('0 36000 29145 2'), '0036000291452');
});

test('the shard is the first three digits of the 13-digit form', () => {
  assert.equal(shardOf('4250650912253'), '425');
});

test('part number keys ignore case, spaces and dashes', () => {
  assert.equal(partNoKey('ifw 472'), 'IFW472');
  assert.equal(partNoKey('51531'), '51531');
  assert.equal(partNoKey('a-b/c'), 'ABC');
});

test('buckets are stable and in range', () => {
  const b = bucketOf('IFW472', PARTNO_BUCKETS);
  assert.equal(b, bucketOf('IFW472', PARTNO_BUCKETS));
  assert.ok(b >= 0 && b < PARTNO_BUCKETS);
});
