(() => {
  const root = document.documentElement;
  const theme = document.querySelector('.theme-toggle');
  const motion = document.querySelector('.motion-toggle');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  function syncTheme() { theme.setAttribute('aria-pressed', String(root.dataset.theme === 'dark')); }
  theme.hidden = false;
  syncTheme();
  theme.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    save('journal-theme', root.dataset.theme);
    syncTheme();
  });
  if (motion) {
    const syncMotion = () => {
      motion.hidden = reduced.matches;
      motion.setAttribute('aria-pressed', String(root.dataset.motion === 'paused'));
    };
    syncMotion();
    reduced.addEventListener('change', syncMotion);
    motion.addEventListener('click', () => {
      root.dataset.motion = root.dataset.motion === 'paused' ? 'running' : 'paused';
      save('journal-motion', root.dataset.motion);
      syncMotion();
    });
  }
})();
