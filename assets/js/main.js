// ── Section filtering on the home grid ──────────────────────────
(function () {
  // Filtering only happens on the home page; elsewhere the active nav
  // item is set server-side and must be left untouched.
  var grid = document.getElementById('grid');
  if (!grid) return;

  var links = document.querySelectorAll('.nav__link[data-filter]');

  function apply(filter) {
    grid.querySelectorAll('.card').forEach(function (card) {
      var show = filter === 'all' || card.dataset.section === filter;
      card.classList.toggle('is-hidden', !show);
    });
    links.forEach(function (l) {
      l.classList.toggle('is-active', l.dataset.filter === filter);
    });
  }

  links.forEach(function (l) {
    l.addEventListener('click', function (e) {
      e.preventDefault();
      history.replaceState(null, '', '#' + l.dataset.filter);
      apply(l.dataset.filter);
    });
  });

  var valid = [].map.call(links, function (l) { return l.dataset.filter; });
  var initial = (location.hash || '#all').slice(1);
  apply(valid.indexOf(initial) > -1 ? initial : 'all');
})();

// ── Copy-link buttons on articles ───────────────────────────────
document.querySelectorAll('[data-copy]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    navigator.clipboard.writeText(btn.dataset.copy).then(function () {
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = 'Copy Link'; }, 1400);
    });
  });
});
