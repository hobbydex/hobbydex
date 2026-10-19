// The date markers (abbr.doubt: the "?" and the seen_by "*") show their tip under the marker through CSS.
// A marker near the right edge would push the tip off the screen, so it gets class "flip" (tip grows leftwards).
(() => {
  const place = (a) => {
    const w = Math.min(256, innerWidth - 32); // the tip's max-width in global.css (16rem, 2rem gutters)
    a.classList.toggle('flip', a.getBoundingClientRect().left + w > innerWidth - 16);
  };
  for (const ev of ['pointerover', 'focusin']) {
    document.addEventListener(ev, (e) => { const a = e.target.closest?.('abbr.doubt'); if (a) place(a); });
  }
})();
