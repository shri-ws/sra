/* SHRI RAMJI ASTRO — WHERE THE CALCULATION SERVER LIVES
   GitHub Pages serves the website but cannot run Python, so the Swiss Ephemeris
   server (parashara_canonical_engine.py, see render.yaml) runs on Render.
   patrikaEngineBridge.js and the muhurta pages read these values.
   Locally (node dev-server.js) the dev server proxies the same paths to :8000. */
(function() {
  var PRODUCTION_API = 'https://sra-canonical-engine.onrender.com';
  var local = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname);
  var base = local ? '' : PRODUCTION_API;

  window.SRA_API_BASE = base;
  window.SRA_CANONICAL_ENDPOINT = base + '/calculate';
  window.SRA_CANONICAL_BATCH_ENDPOINT = base + '/calculate/batch';

  // A free Render server sleeps when idle; wake it immediately on page load
  // and retry a few times so it's warm before the user submits the form.
  if (base) {
    var healthUrl = base + '/health';
    function pingServer(attemptsLeft) {
      if (attemptsLeft <= 0) return;
      fetch(healthUrl, { mode: 'cors', cache: 'no-store' })
        .then(function(r) {
          if (!r.ok) setTimeout(function() { pingServer(attemptsLeft - 1); }, 5000);
        })
        .catch(function() {
          // Server still waking — retry after 5s
          setTimeout(function() { pingServer(attemptsLeft - 1); }, 5000);
        });
    }
    pingServer(4); // up to 4 pings, 5s apart (~20s total warm-up window)
  }
})();
