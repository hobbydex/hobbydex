// Measures what loading the export costs: file size, read and JSON.parse time, heap retained by the parsed data.
import { readFileSync, statSync } from 'node:fs';
const file = process.argv[2];
const mb = (b) => +(b / 1048576).toFixed(1);
gc();
const heap0 = process.memoryUsage().heapUsed;
const t0 = performance.now();
const text = readFileSync(file, 'utf8');
const t1 = performance.now();
const data = JSON.parse(text);
const t2 = performance.now();
void text;
gc();
const heapRetained = process.memoryUsage().heapUsed - heap0;
const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v));
const per = arrays.map(([k, v]) => ({ key: k, records: v.length, json_mb: mb(Buffer.byteLength(JSON.stringify(v))) }));
per.sort((a, b) => b.json_mb - a.json_mb);
console.log(JSON.stringify({
  file_mb: mb(statSync(file).size),
  read_ms: Math.round(t1 - t0),
  parse_ms: Math.round(t2 - t1),
  heap_retained_mb: mb(heapRetained),
  rss_after_mb: mb(process.memoryUsage().rss),
  per_key: per,
}, null, 1));
