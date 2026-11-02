(() => {
  const root = document.documentElement;
  const theme = document.querySelector('.theme-toggle');
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
})();
