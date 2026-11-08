// The data licence is stated in one module (src/lib/license.ts) and the Dataset markup on /data/ is valid schema.org.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataLicense } from '../src/lib/license.ts';
import { datasetJsonLd } from '../src/lib/dataset.ts';
import { operator } from '../src/lib/operator.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const licenseModule = join(root, 'src/lib/license.ts');
const textExt = /\.(astro|ts|tsx|mjs|js|json|css|html|md|txt|svg)$/;

const files = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : textExt.test(name) ? [path] : [];
});

test('the licence is named only in src/lib/license.ts (src/ and public/)', () => {
  const offenders = [...files(join(root, 'src')), ...files(join(root, 'public'))]
    .filter((path) => path !== licenseModule)
    .filter((path) => /\bCC0\b|\bCC BY\b/.test(readFileSync(path, 'utf8')))
    .map((path) => relative(root, path));
  assert.deepEqual(offenders, [], 'hard-coded licence text: read it from src/lib/license.ts');
});

test('the licence module names CC BY 4.0, the notice and the credit line', () => {
  assert.equal(dataLicense.url, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(dataLicense.credit, 'Data: Hobbydex (https://hobbydex.com), CC BY 4.0');
  assert.equal(dataLicense.notice, 'Hobbydex data (c) Somatik BV, licensed CC BY 4.0, https://creativecommons.org/licenses/by/4.0/');
  assert.equal(dataLicense.codeLicense, 'MIT');
});

test('the Dataset JSON-LD has the required fields and parses as JSON', () => {
  const ld = JSON.parse(JSON.stringify(datasetJsonLd('2026-11-08')));
  assert.equal(ld['@context'], 'https://schema.org');
  assert.equal(ld['@type'], 'Dataset');
  assert.equal(ld.name, 'Hobbydex RC parts database');
  assert.ok(ld.description.length > 0);
  assert.equal(ld.url, 'https://hobbydex.com/data/');
  assert.equal(ld.sameAs, 'https://github.com/hobbydex/hobbydex-rc');
  assert.equal(ld.license, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(ld.isAccessibleForFree, true);
  assert.equal(ld.creator['@type'], 'Organization');
  assert.equal(ld.creator.name, operator.name);
  assert.ok(ld.creator.url.startsWith('https://'));
  assert.ok(Array.isArray(ld.keywords) && ld.keywords.length > 0);
  assert.match(ld.dateModified, /^\d{4}-\d{2}-\d{2}$/);
  const [download] = ld.distribution;
  assert.equal(download['@type'], 'DataDownload');
  assert.equal(download.encodingFormat, 'application/json');
  assert.equal(download.contentUrl, 'https://github.com/hobbydex/hobbydex-rc/releases');
});

test('dateModified defaults to the build date', () => {
  assert.equal(datasetJsonLd().dateModified, new Date().toISOString().slice(0, 10));
});
