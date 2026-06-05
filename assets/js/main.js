// ── Section filtering on the home grid ──────────────────────────
(function () {
  var grid = document.getElementById('grid');
  var links = document.querySelectorAll('.nav__link[data-filter]');
  if (!links.length) return;

  function apply(filter) {
    if (grid) {
      grid.querySelectorAll('.card').forEach(function (card) {
        var show = filter === 'all' || card.dataset.section === filter;
        card.classList.toggle('is-hidden', !show);
      });
    }
    links.forEach(function (l) {
      l.classList.toggle('is-active', l.dataset.filter === filter);
    });
  }

  links.forEach(function (l) {
    l.addEventListener('click', function (e) {
      // Only intercept when we're on a page that actually has the grid.
      if (grid) {
        e.preventDefault();
        history.replaceState(null, '', '#' + l.dataset.filter);
      }
      apply(l.dataset.filter);
    });
  });

  var initial = (location.hash || '#all').slice(1);
  apply(['all'].concat([].map.call(links, function (l) { return l.dataset.filter; })).indexOf(initial) > -1 ? initial : 'all');
})();

// ── Copy-link buttons on articles ───────────────────────────────
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    navigator.clipboard.writeText(btn.dataset.copy).then(function () {
      var old = btn.textContent;
      btn.textContent = '✓';
      setTimeout(function () { btn.textContent = old; }, 1200);
    });
  });
});
