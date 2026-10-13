// Click a header of a `table.sortable` to sort its rows by that column; a second click reverses.
// A `th.num` column sorts as numbers, largest first (empty cells last); the others as text, A to Z.
for (const table of document.querySelectorAll('table.sortable')) {
  const body = table.tBodies[0], heads = table.tHead ? [...table.tHead.rows[0].cells] : [];
  heads.forEach((th, i) => {
    const num = th.classList.contains('num');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sortbtn'; btn.append(...th.childNodes); th.append(btn);
    btn.addEventListener('click', () => {
      const dir = th.getAttribute('aria-sort') === (num ? 'descending' : 'ascending') ? -1 : 1;
      for (const h of heads) h.removeAttribute('aria-sort');
      th.setAttribute('aria-sort', (num ? dir < 0 : dir > 0) ? 'ascending' : 'descending');
      const val = (tr) => tr.cells[i].textContent.trim();
      [...body.rows].sort((a, b) => {
        const x = val(a), y = val(b);
        if (!x && !y) return 0; if (!x) return 1; if (!y) return -1;
        return (num ? Number(y.replace(/[^\d.-]/g, '')) - Number(x.replace(/[^\d.-]/g, '')) : x.localeCompare(y, undefined, { numeric: true })) * dir;
      }).forEach((tr) => body.appendChild(tr));
    });
  });
}
