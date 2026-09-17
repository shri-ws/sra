/* SHRI RAMJI ASTRO — ELEGANT DAY / NIGHT THEME SWITCH ENGINE */
(function() {
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('sra_theme', theme); } catch(e) {}
  }

  window.toggleTheme = function() {
    const current = document.documentElement.getAttribute('data-theme') || 'day';
    const next = current === 'night' ? 'day' : 'night';
    applyTheme(next);
  };

  window.applyTheme = applyTheme;

  // Set default theme: 'day'
  const saved = (function() {
    try { return localStorage.getItem('sra_theme'); } catch(e) { return null; }
  })() || 'day';

  applyTheme(saved);
})();
