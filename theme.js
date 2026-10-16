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

  // UNIVERSAL SEO & INTERNAL LINKING GLOBAL FOOTER (SET AND FORGET)
  function injectGlobalFooter() {
    if (document.querySelector('.site-global-footer')) return;
    if (window.location.pathname.includes('admin.html')) return;

    const footerHtml = `
<footer class="site-global-footer" style="background: #11141a; color: #cbd5e1; padding: 45px 20px 25px; margin-top: 50px; border-top: 1px solid rgba(212, 175, 55, 0.25); font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;">
  <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 32px;">
    <div>
      <h3 style="color: #e2b04a; font-family: 'Cinzel', serif; font-size: 1.15rem; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.5px;">Shri Ramji Astro (Patrika)</h3>
      <p style="font-size: 0.88rem; line-height: 1.65; color: #94a3b8; margin: 0;">
        The gold standard in classical Vedic astrology software. Powered by True Chitra Paksha (Lahiri) Ayanamsa, 60-Term Meeus Lunar Expansion, and precise OpenStreetMap GPS Geocoding.
      </p>
    </div>
    <div>
      <h3 style="color: #ffffff; font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.5px;">Precision Astrology Tools</h3>
      <ul style="list-style: none; padding: 0; margin: 0; font-size: 0.9rem; line-height: 1.9;">
        <li><a href="/vmm.html" style="color: #60a5fa; text-decoration: none;">Vivah Muhurt & Matchmaking Engine</a></li>
        <li><a href="/vastu-muhurta.html" style="color: #60a5fa; text-decoration: none;">Vastu (Neev & Griha Pravesh) Muhurta</a></li>
        <li><a href="/yajnopavita.html" style="color: #60a5fa; text-decoration: none;">Upanayana (Yajnopavita) Scanner</a></li>
        <li><a href="/patrika.html" style="color: #60a5fa; text-decoration: none;">Astro 360 / Patrika (Birth Chart)</a></li>
        <li><a href="/consultation.html" style="color: #60a5fa; text-decoration: none;">VIP Sacred Consultations</a></li>
      </ul>
    </div>
    <div>
      <h3 style="color: #ffffff; font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.5px;">Classical Authority</h3>
      <p style="font-size: 0.88rem; line-height: 1.65; color: #94a3b8; margin: 0;">
        Algorithms strictly mapped to <em>Brihat Parashara Hora Shastra</em>, <em>Muhurta Chintamani</em>, and <em>Phaladeepika</em>. Zero approximations.
      </p>
    </div>
  </div>
  <div style="text-align: center; margin-top: 32px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 18px; color: #64748b;">
    &copy; 2026 Shri Ramji Astro. All rights reserved. Built for high-precision mathematical research.
  </div>
</footer>`;

    const placeholder = document.createElement('div');
    placeholder.innerHTML = footerHtml.trim();
    const newFooter = placeholder.firstElementChild;

    const existingFooter = document.querySelector('footer');
    if (existingFooter && !existingFooter.classList.contains('site-global-footer')) {
      existingFooter.replaceWith(newFooter);
    } else if (document.body) {
      document.body.appendChild(newFooter);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGlobalFooter);
  } else {
    injectGlobalFooter();
  }
})();
