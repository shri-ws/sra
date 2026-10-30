/* SHRI RAMJI ASTRO — WHERE THE CALCULATION SERVER LIVES
   GitHub Pages serves the website but cannot run Python, so the Swiss Ephemeris
   server (parashara_canonical_engine.py, see render.yaml) runs on Render.
   patrikaEngineBridge.js and the muhurta pages read these values.
   Locally (node dev-server.js) the dev server proxies the same paths to :8000. */
(function() {
  var PRODUCTION_API = 'https://sra-canonical-engine.onrender.com';
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var base = local ? '' : PRODUCTION_API;

  window.SRA_API_BASE = base;
  window.SRA_CANONICAL_ENDPOINT = base + '/calculate';
  window.SRA_CANONICAL_BATCH_ENDPOINT = base + '/calculate/batch';

  // A free Render server sleeps when idle; wake it while the visitor fills the form
  if (base) {
    try { fetch(base + '/health', { mode: 'cors', cache: 'no-store' }).catch(function() {}); } catch (e) {}
  }
})();
