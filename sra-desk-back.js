/* sra-desk-back.js — "दैवज्ञ डेस्क पर लौटें" on पत्रिका for astrologer members (24 Nov 2026).
   An astrologer opens a client's chart from the Daivagya Desk (consultant.html → patrika.html?…&desk=<client phone>).
   Every signed-in member with an active SaaS membership (and the owner's number) sees a button at the
   bottom of पत्रिका that leads back to the desk, on that client when the chart came from the desk.
   Membership comes from the server (/api/sutradhar/desk/me); the last answer is kept on the phone for
   12 hours so the button appears at once, and is checked again on every page load. */
(function () {
  'use strict';
  if (window.__sraDeskBack) return;
  window.__sraDeskBack = true;

  const KEY = 'sra_desk_member';
  const TTL = 12 * 3600 * 1000;
  const API = (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com') + '/api/sutradhar/desk/me';
  const client = (new URLSearchParams(location.search).get('desk') || '').replace(/\D/g, '').slice(-10);

  function remembered() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && Date.now() - v.at < TTL ? v : null;
    } catch (e) { return null; }
  }
  function remember(v) { try { localStorage.setItem(KEY, JSON.stringify(Object.assign({ at: Date.now() }, v))); } catch (e) {} }

  function show() {
    if (document.getElementById('sra-desk-back')) return;
    const st = document.createElement('style');
    st.textContent = '#sra-desk-back{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));max-width:calc(100vw - 120px);' +
      'z-index:9000;display:inline-flex;align-items:center;min-height:46px;padding:0 22px;border-radius:999px;background:#6B1424;color:#fff;' +
      'font:700 15px/1.2 "Noto Sans Devanagari",system-ui,sans-serif;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.28);white-space:nowrap}' +
      '#sra-desk-back:hover{background:#561020}@media print{#sra-desk-back{display:none}}';
    document.head.appendChild(st);
    const a = document.createElement('a');
    a.id = 'sra-desk-back';
    a.href = 'consultant.html' + (client ? '?client=' + client : '');
    // bottom-left: the WhatsApp button sits bottom-right on पत्रिका
    a.textContent = 'दैवज्ञ डेस्क पर लौटें';
    a.setAttribute('data-i18n-en', 'Back to Daivagya Desk');
    document.body.appendChild(a);
  }

  function hide() { const a = document.getElementById('sra-desk-back'); if (a) a.remove(); }

  async function check() {
    if (!window.SRAAuth || !SRAAuth.ready) return;
    let fb;
    try { fb = await SRAAuth.ready(); } catch (e) { return; }
    const auth = fb.auth();
    const user = auth.currentUser || await new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    if (!user) { remember({ allowed: false, uid: '' }); hide(); return; }
    try {
      const r = await fetch(API, { headers: { Authorization: 'Bearer ' + await user.getIdToken() } });
      const d = await r.json();
      remember({ allowed: !!(r.ok && d.allowed), uid: user.uid });
      if (r.ok && d.allowed) show(); else if (r.ok || r.status === 401) hide();
    } catch (e) {}
  }

  function start() {
    // shown at once from the phone's memory (or when the chart came from the desk), then confirmed
    // with the server on every page load, so a different login on the same phone never keeps it
    const m = remembered();
    if (client || (m && m.allowed)) show();
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
