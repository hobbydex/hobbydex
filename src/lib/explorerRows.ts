// Shared by the server (first page of rows, option lists) and the browser (filtering the whole category):
// no data import, so the page script stays small. See components/CategoryExplorer.astro.
export type Facet = {
  key: string; label: string; unknown: string;
  filter: boolean;   // a drop-down for it
  column: boolean;   // a table column for it
  values: [param: string, label: string, group?: string][];
};
// href, label, rest of the name, discontinued (1), per facet the indexes into its values (none: unknown)
export type Row = [href: string, label: string, rest: string, disc: 0 | 1, cells: number[][]];

export const PAGE = 100;
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function rowHtml(r: Row, facets: Facet[]): string {
  const tds = facets.flatMap((f, i) => f.column ? [`<td>${esc(r[4][i].map((v) => f.values[v][1]).join(' / '))}</td>`] : []);
  return `<tr><td><a href="${esc(r[0])}">${esc(r[1])}</a>${r[2] ? ` <span class="muted">${esc(r[2])}</span>` : ''}${r[3] ? ' <span class="muted">(discontinued)</span>' : ''}</td>${tds.join('')}</tr>`;
}

export function optionsHtml(f: Facet, counts: number[], unknownCount: number, selected: string): string {
  const opt = (p: string, label: string, n: number) => `<option value="${esc(p)}"${p === selected ? ' selected' : ''}>${esc(label)} (${n})</option>`;
  let html = `<option value="">any ${esc(f.label.toLowerCase())}</option>`, group: string | undefined, open = false;
  f.values.forEach(([p, label, g], i) => {
    if (!counts[i] && p !== selected) return;
    if (g !== group) { if (open) html += '</optgroup>'; open = !!g; if (g) html += `<optgroup label="${esc(g)}">`; group = g; }
    html += opt(p, label, counts[i] ?? 0);
  });
  if (open) html += '</optgroup>';
  if (unknownCount || selected === '?') html += opt('?', f.unknown, unknownCount);
  return html;
}

/** Counts per facet value and unknown, each facet counted over the rows that pass every OTHER filter. */
export function countFacets(rows: Row[], facets: Facet[], sel: string[], pass: (r: Row) => boolean) {
  const idx = facets.map((f, i) => (sel[i] && sel[i] !== '?' ? f.values.findIndex((v) => v[0] === sel[i]) : -1));
  const counts = facets.map((f) => new Array<number>(f.values.length).fill(0));
  const unknown = facets.map(() => 0);
  const ok: boolean[] = [];
  for (const r of rows) {
    if (!pass(r)) continue;
    let fail = -1, fails = 0;
    for (let i = 0; i < facets.length; i++) {
      const s = sel[i];
      if (!s) continue;
      const c = r[4][i];
      if (!(s === '?' ? c.length === 0 : c.includes(idx[i]))) { fails++; fail = i; if (fails > 1) break; }
    }
    if (fails > 1) continue;
    for (let i = 0; i < facets.length; i++) {
      if (fails === 1 && i !== fail) continue;
      const c = r[4][i];
      if (c.length === 0) unknown[i]++; else for (const v of c) counts[i][v]++;
    }
  }
  return { counts, unknown, idx, ok };
}

export function rowPasses(r: Row, facets: Facet[], sel: string[], idx: number[]): boolean {
  for (let i = 0; i < facets.length; i++) {
    const s = sel[i];
    if (!s) continue;
    const c = r[4][i];
    if (!(s === '?' ? c.length === 0 : c.includes(idx[i]))) return false;
  }
  return true;
}
