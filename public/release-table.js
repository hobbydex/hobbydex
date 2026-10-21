// The filterable release table on /rc/releases/. The rows come from /rc/releases/list.json (src/lib/releaseList.ts),
// loaded only on this page. The functions above the DOM part are pure (node tests import them): the filters,
// the URL state, the facet counts and the sort. The DOM part runs only where #release-results is on the page.

export const PAGE = 20;
export const DIMS = ['brand', 'type', 'scale', 'build', 'year'];
export const SORTS = ['date', 'name', 'brand'];
export const NONE = 'none';
const DEFAULT_DIR = { date: 'desc', name: 'asc', brand: 'asc' };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// A date key as the static table words it (data.ts isoText): "2026-09-24" -> "2026 Sep 24", "2025-10" -> "2025 Oct".
export function isoText(iso) {
  const m = iso.match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return iso;
  return [m[1], m[2] && MONTHS[Number(m[2]) - 1], m[3] && String(Number(m[3]))].filter(Boolean).join(' ');
}
// The date column's words (data.ts dateTextPlain): an announced date says so, an undated release says unknown.
export function dateLabel(date, flags) {
  if (!date) return 'unknown';
  return flags & 2 ? `announced ${isoText(date)}` : isoText(date);
}

// The rows as objects. The list's index columns are resolved here; the year is a number and its decade a value.
// A row's trailing empty columns are left out of the list, so art, colour and doubt may be missing.
export function decode(list) {
  return list.rows.map(([tail, name, bi, ti, si, bu, st, date, flags, art, colour, doubt]) => {
    const [brand, brandName] = list.brands[bi];
    const [type, typeLabel, icon, wide] = list.types[ti];
    const build = list.builds[bu];
    return {
      url: `/rc/releases/${brand}/${tail}/`, name, brand, brandName, type, typeLabel, icon, wide: !!wide,
      scale: list.scales[si], build: build[0], buildLabel: build[1], status: list.statuses[st],
      date, dateText: dateLabel(date, flags), year: date ? date.slice(0, 4) : NONE, seen: (flags & 1) > 0,
      doubt: doubt == null ? '' : list.doubts[doubt], art: art || '', colour: colour == null ? '' : list.colours[colour],
    };
  });
}

// A release's value on a filter dimension, in the canonical form the URL and the selects use: scale "1/10",
// build "rtr", year "2020s"; a release without one has NONE.
export function valueOf(row, dim) {
  switch (dim) {
    case 'brand': return row.brand;
    case 'type': return row.type;
    case 'scale': return row.scale || NONE;
    case 'build': return row.build || NONE;
    case 'year': return row.year;
  }
}

// The values that occur in the rows, per dimension.
// plus yearRange: the first and last year that occur (the year stepper stays within them).
export function presentValues(rows) {
  const present = Object.fromEntries(DIMS.map((d) => [d, new Set(rows.map((r) => valueOf(r, d)))]));
  const years = [...present.year].filter((y) => y !== NONE).map(Number);
  present.yearRange = years.length ? [Math.min(...years), Math.max(...years)] : [0, 0];
  return present;
}

// The year after a step: one year with the step buttons, five with « and ». From All years a step picks the newest year.
export function stepYear(current, delta, [min, max]) {
  if (!current) return String(max);
  return String(Math.min(max, Math.max(min, Number(current) + delta)));
}

// The filters and sort in the URL: ?brand=traxxas&type=monster&scale=1-10&build=rtr&year=2020s&sort=name&dir=asc.
// Values that occur in no row are dropped; the sort and direction appear only when they are not the default.
export function parseSearch(search, present) {
  const p = new URLSearchParams(search);
  const filters = {};
  for (const dim of DIMS) {
    const raw = p.get(dim);
    if (!raw) continue;
    if (dim === 'year') {
      const y = Number(raw);
      if (/^\d{4}$/.test(raw) && y >= present.yearRange[0] && y <= present.yearRange[1]) filters.year = raw;
      continue;
    }
    const value = dim === 'scale' ? raw.replace('-', '/') : raw;
    if (present[dim].has(value)) filters[dim] = value;
  }
  const sort = SORTS.includes(p.get('sort')) ? p.get('sort') : 'date';
  const dir = ['asc', 'desc'].includes(p.get('dir')) ? p.get('dir') : DEFAULT_DIR[sort];
  return { filters, sort, dir };
}

export function toSearch({ filters, sort, dir }) {
  const p = new URLSearchParams();
  for (const dim of DIMS) if (filters[dim]) p.set(dim, dim === 'scale' ? filters[dim].replace('/', '-') : filters[dim]);
  if (sort !== 'date' || dir !== DEFAULT_DIR.date) { p.set('sort', sort); p.set('dir', dir); }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// The rows that match every filter, except the one named (its options are counted over the others).
export function filterRows(rows, filters, except) {
  const active = DIMS.filter((d) => filters[d] && d !== except);
  return rows.filter((r) => active.every((d) => valueOf(r, d) === filters[d]));
}

// For each dimension: value -> number of rows that match the other filters.
export function facets(rows, filters) {
  const out = {};
  for (const dim of DIMS) {
    const counts = new Map();
    for (const r of filterRows(rows, filters, dim)) {
      const v = valueOf(r, dim);
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    out[dim] = counts;
  }
  return out;
}

// Each dimension's options in a fixed order: brands by name, types in the platform order, scales largest first,
// builds in the list's order, years newest first; NONE last. Only the values that occur (or the selected one).
export function options(list, rows, filters, counts) {
  const years = [...new Set(rows.map((r) => r.year))].filter((y) => y !== NONE).sort((a, b) => b - a);
  const order = {
    brand: list.brands.map((b) => b[0]),
    type: list.types.map((t) => t[0]),
    scale: list.scales.map((s) => s || NONE),
    build: list.builds.map((b) => b[0] || NONE),
    year: [...years, NONE],
  };
  const labelOf = {
    brand: (v) => list.brands.find((b) => b[0] === v)?.[1] ?? v,
    type: (v) => list.types.find((t) => t[0] === v)?.[1] ?? v,
    scale: (v) => (v === NONE ? 'No scale' : v),
    build: (v) => (v === NONE ? 'No build kind' : list.builds.find((b) => (b[0] || NONE) === v)?.[1] ?? v),
    year: (v) => (v === NONE ? 'No date' : v),
  };
  const out = {};
  for (const dim of DIMS) {
    out[dim] = order[dim].filter((v) => counts[dim].has(v) || v === filters[dim])
      .map((v) => ({ value: v, label: labelOf[dim](v), count: counts[dim].get(v) ?? 0 }));
  }
  return out;
}

const bySortKey = (sort, sign) => (a, b) => {
  if (sort === 'name') return a.name.localeCompare(b.name, undefined, { numeric: true }) * sign;
  if (sort === 'brand') return a.brandName.localeCompare(b.brandName) * sign;
  // dated releases first, in either direction; undated ones last
  if (!a.date !== !b.date) return a.date ? -1 : 1;
  return a.date.localeCompare(b.date) * sign;
};

// Sorted by the key, ties by brand then name (the newest-first order of the static table).
export function sortRows(rows, sort, dir) {
  const sign = dir === 'asc' ? 1 : -1;
  const key = bySortKey(sort, sign);
  return [...rows].sort((a, b) => key(a, b) || a.brandName.localeCompare(b.brandName) || a.name.localeCompare(b.name));
}

// The rows the list shows, in order. The brand, type, scale and build filters apply strictly. For the newest-first
// date sort the year is where the list starts: the newer rows are left out and the list runs on into older years
// (undated rows last). For the other sorts the year is a plain filter.
export function listRows(rows, filters, sort, dir) {
  const sorted = sortRows(filterRows(rows, filters, 'year'), sort, dir);
  const y = filters.year;
  if (!y) return sorted;
  if (sort === 'date' && dir === 'desc') {
    const start = sorted.findIndex((r) => r.date && r.year <= y);
    return start < 0 ? [] : sorted.slice(start);
  }
  return sorted.filter((r) => r.year === y);
}

// ---- the page (only where the results table is) ----

const root = typeof document !== 'undefined' ? document.getElementById('release-results') : null;

if (root) {
  const form = document.getElementById('release-filters');
  const count = document.getElementById('release-count');
  const body = root.querySelector('tbody');
  const more = document.getElementById('release-more');
  const newest = document.getElementById('release-newest');
  const sortSelect = document.getElementById('f-sort');
  const SEEN_NOTE = root.dataset.seenNote;
  const NS = 'http://www.w3.org/2000/svg';

  const cell = (tr, label, cls) => {
    const td = document.createElement('td');
    td.dataset.label = label;
    if (cls) td.className = cls;
    tr.append(td);
    return td;
  };
  const dividerEl = (year) => {
    const tr = document.createElement('tr');
    tr.className = 'yeardiv';
    const th = document.createElement('th');
    th.colSpan = 6;
    th.scope = 'rowgroup';
    th.textContent = year === NONE ? 'No date' : year;
    tr.append(th);
    return tr;
  };
  const rowEl = (r) => {
    const tr = document.createElement('tr');
    const date = cell(tr, 'Released', 'num');
    date.textContent = r.dateText;
    if (r.seen) { const a = document.createElement('abbr'); a.className = 'doubt seen'; a.tabIndex = 0; a.dataset.tip = SEEN_NOTE; a.setAttribute('aria-label', SEEN_NOTE); a.textContent = '*'; date.append(a); }
    if (r.doubt) { const a = document.createElement('abbr'); a.className = 'doubt'; a.tabIndex = 0; a.dataset.tip = r.doubt; a.setAttribute('aria-label', r.doubt); a.textContent = '?'; date.append(a); }
    const brand = cell(tr, 'Brand');
    const b = document.createElement('a'); b.href = `/rc/brands/${r.brand}/`; b.textContent = r.brandName; brand.append(b);
    const name = cell(tr, 'Release', 'name');
    name.append(outline(r));
    const a = document.createElement('a'); a.href = r.url; a.textContent = r.name; name.append(' ', a);
    if (r.status === 'discontinued') {
      const d = document.createElement('span'); d.className = 'disc'; d.title = 'Discontinued';
      d.innerHTML = '<svg class="icon" style="width:1em;height:1em" aria-hidden="true"><use href="/icons.svg#discontinued"></use></svg><span class="sr-only"> discontinued</span>';
      name.append(d);
    }
    cell(tr, 'Type').textContent = r.typeLabel;
    cell(tr, 'Scale').textContent = r.scale;
    cell(tr, 'Build').textContent = r.buildLabel;
    return tr;
  };
  // An outline is a span masked by /art/<file>.svg, filled with the release's colour. The table renders one page of
  // rows at a time, so only those rows' outlines are fetched; the browser caches each file.
  const showArt = (el) => { const u = `url(/art/${el.dataset.art})`; el.style.maskImage = u; el.style.webkitMaskImage = u; };
  // the release's outline, or its type icon when it has none (the same drawing as ReleaseArt in the release tables)
  const outline = (r) => {
    if (r.art) {
      const span = document.createElement('span');
      span.className = 'relart inrow';
      span.setAttribute('aria-hidden', 'true');
      span.style.backgroundColor = r.colour || 'currentColor';
      span.dataset.art = `${r.art}`;
      showArt(span);
      return span;
    }
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.width = r.wide ? '2.6em' : '1.3em'; svg.style.height = '1.3em';
    const u = document.createElementNS(NS, 'use');
    u.setAttribute('href', `/icons.svg#${r.icon}`);
    svg.append(u);
    return svg;
  };

  let rows = [], list = null, state = null, shown = PAGE, sorted = [];
  const SELECT_DIMS = DIMS.filter((d) => d !== 'year');
  const selects = Object.fromEntries(SELECT_DIMS.map((d) => [d, document.getElementById(`f-${d}`)]));
  const yearBtns = { back5: document.getElementById('y-back5'), back1: document.getElementById('y-back1'), all: document.getElementById('y-all'), fwd1: document.getElementById('y-fwd1'), fwd5: document.getElementById('y-fwd5') };
  let present = null;

  // the filters, sort and paging as the page shows them; the URL follows them
  const update = () => {
    const counts = facets(rows, state.filters);
    const opts = options(list, rows, state.filters, counts);
    for (const dim of SELECT_DIMS) {
      const sel = selects[dim];
      sel.replaceChildren(...[new Option(`All (${filterRows(rows, state.filters, dim).length})`, '')].concat(
        opts[dim].map((o) => new Option(`${o.label} (${o.count})`, o.value))));
      sel.value = state.filters[dim] ?? '';
    }
    const y = state.filters.year, [min, max] = present.yearRange;
    yearBtns.all.textContent = y ?? 'All years';
    yearBtns.all.setAttribute('aria-pressed', String(!y));
    yearBtns.back5.disabled = yearBtns.back1.disabled = !!y && Number(y) <= min;
    yearBtns.fwd1.disabled = yearBtns.fwd5.disabled = !!y && Number(y) >= max;
    sorted = listRows(rows, state.filters, state.sort, state.dir);
    // the stepper shows the year at the top of the list
    if (state.filters.year && sorted.length && /^\d{4}$/.test(sorted[0].year)) state.filters.year = sorted[0].year;
    count.textContent = `${sorted.length} release${sorted.length === 1 ? '' : 's'}`;
    const nodes = [];
    let prev = null;
    for (const r of sorted.slice(0, shown)) {
      if (state.sort === 'date' && (!prev || r.year !== prev.year)) nodes.push(dividerEl(r.year));
      nodes.push(rowEl(r));
      prev = r;
    }
    body.replaceChildren(...nodes);
    const left = sorted.length - shown;
    more.hidden = left <= 0;
    more.textContent = `Show ${Math.min(PAGE, left)} more`;
    for (const th of root.querySelectorAll('th[data-sort]')) {
      if (th.dataset.sort === state.sort) th.setAttribute('aria-sort', state.dir === 'asc' ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    }
    sortSelect.value = `${state.sort}-${state.dir}`;
    try { history.replaceState(null, '', location.pathname + toSearch(state) + location.hash); } catch (e) { /* a sandboxed page keeps its URL */ }
  };
  const changed = () => { shown = PAGE; update(); };

  (async () => {
    try {
      list = await (await fetch(root.dataset.src)).json();
    } catch (e) {
      count.textContent = 'The release list could not be loaded; the newest releases are shown above.';
      return;
    }
    rows = decode(list);
    present = presentValues(rows);
    state = parseSearch(location.search, present);
    const setYear = (y) => { state.filters = { ...state.filters }; if (y) state.filters.year = y; else delete state.filters.year; changed(); };
    yearBtns.back5.addEventListener('click', () => setYear(stepYear(state.filters.year, -5, present.yearRange)));
    yearBtns.back1.addEventListener('click', () => setYear(stepYear(state.filters.year, -1, present.yearRange)));
    yearBtns.fwd1.addEventListener('click', () => setYear(stepYear(state.filters.year, 1, present.yearRange)));
    yearBtns.fwd5.addEventListener('click', () => setYear(stepYear(state.filters.year, 5, present.yearRange)));
    yearBtns.all.addEventListener('click', () => setYear(null));
    for (const dim of SELECT_DIMS) selects[dim].addEventListener('change', () => {
      state.filters = { ...state.filters };
      if (selects[dim].value) state.filters[dim] = selects[dim].value; else delete state.filters[dim];
      changed();
    });
    sortSelect.addEventListener('change', () => {
      const [sort, dir] = sortSelect.value.split('-');
      state.sort = sort; state.dir = dir;
      changed();
    });
    for (const th of root.querySelectorAll('th[data-sort]')) {
      const btn = th.querySelector('button');
      btn.addEventListener('click', () => {
        const sort = th.dataset.sort;
        state.dir = sort === state.sort ? (state.dir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR[sort];
        state.sort = sort;
        changed();
      });
    }
    document.getElementById('release-clear').addEventListener('click', () => {
      state = { filters: {}, sort: 'date', dir: 'desc' };
      changed();
    });
    more.addEventListener('click', () => { shown += PAGE; update(); });
    form.hidden = false;
    root.hidden = false;
    newest.hidden = true;
    update();
  })();
}
