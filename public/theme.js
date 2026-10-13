// The header's theme button: cycles auto, light, dark and remembers the choice (the pre-paint
// read of that choice stays inline in Base.astro). Served as one cached file instead of inline on
// every page, which saves about 1 KB per page of the built site (SIZE: see Base.astro).
(() => {
          const b = document.querySelector('header.site .theme'), html = document.documentElement, modes = ['auto', 'light', 'dark'];
          const label = { auto: 'auto (follows the system)', light: 'light', dark: 'dark' };
          const show = (m) => { b.querySelector('use').setAttribute('href', `/icons.svg#theme-${m}`); b.title = `Theme: ${label[m]}`; b.setAttribute('aria-label', `Theme: ${m}`); };
          show(html.dataset.colorMode || 'auto');
          b.addEventListener('click', () => {
            const m = modes[(modes.indexOf(html.dataset.colorMode || 'auto') + 1) % 3];
            html.dataset.colorMode = m; show(m);
            try { m === 'auto' ? localStorage.removeItem('hobbydex-theme') : localStorage.setItem('hobbydex-theme', m); } catch (e) {}
          });
})();
