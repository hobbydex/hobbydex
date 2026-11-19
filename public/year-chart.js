// The tooltip of the year charts (components/YearChart.astro): the year and its count on hover, tap and keyboard focus.
// Left/right arrows, Home and End move between years. Without this script the bars keep their native <title>.
for (const fig of document.querySelectorAll('figure.ychart')) {
  const svg = fig.querySelector('svg.ychart-bars'), tip = fig.querySelector('.ychart-tip'), plot = fig.querySelector('.ychart-plot');
  const hits = [...svg.querySelectorAll('rect.hit')], unit = fig.dataset.unit;
  for (const h of hits) h.querySelector('title')?.remove();   // one tooltip, not the browser's as well
  let cur = -1;
  const show = (i) => {
    if (cur >= 0) svg.querySelector(`rect.bar[data-y="${hits[cur].dataset.y}"]`)?.classList.remove('on');
    cur = i;
    if (i < 0) { tip.hidden = true; return; }
    const h = hits[i], n = Number(h.dataset.n);
    const bar = svg.querySelector(`rect.bar[data-y="${h.dataset.y}"]`);
    bar?.classList.add('on');
    const b = document.createElement('b'); b.textContent = n.toLocaleString('en-US');
    tip.replaceChildren(b, document.createTextNode(` ${unit} in ${h.dataset.y}${'partial' in h.dataset ? ' so far' : ''}`));
    tip.hidden = false;
    const r = h.getBoundingClientRect(), p = plot.getBoundingClientRect(), w = tip.offsetWidth;
    const x = Math.min(Math.max(r.left + r.width / 2 - p.left, w / 2), p.width - w / 2);   // keep it inside the chart
    tip.style.left = `${x}px`;
    const top = (bar ?? h).getBoundingClientRect()[bar ? 'top' : 'bottom'] - p.top;   // just above the bar, inside the chart
    tip.style.top = `${Math.max(0, top - tip.offsetHeight - 6)}px`;
  };
  svg.addEventListener('pointermove', (e) => { const i = hits.indexOf(e.target); if (i >= 0 && i !== cur) show(i); });
  svg.addEventListener('pointerdown', (e) => { const i = hits.indexOf(e.target); if (i >= 0) show(i); });
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && document.activeElement !== svg) show(-1); });
  svg.addEventListener('focus', () => { if (cur < 0) show(hits.length - 1); });
  svg.addEventListener('blur', () => show(-1));
  svg.addEventListener('keydown', (e) => {
    const next = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: hits.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    show(Math.min(Math.max(next, 0), hits.length - 1));
  });
  document.addEventListener('pointerdown', (e) => { if (!svg.contains(e.target)) show(-1); });
}
