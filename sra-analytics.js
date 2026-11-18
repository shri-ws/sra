/* SHRI RAMJI ASTRO — VISITOR & DOWNLOAD COUNTER
   Sends small beacons to the engine (/api/analytics/collect), shown in admin.html → "वेबसाइट विज़िटर्स":
     pv        page view (the first one in a visit says where the visitor came from)
     dl        a report PDF downloaded / printed (any button that says PDF, download, print, डाउनलोड, प्रिंट)
     app       the Android app download
     identify  the visitor signed in; the Firebase ID token goes along so the engine verifies the phone itself
   No phone, name or birth details are read from the page. A random visitor id lives in localStorage. */
(function () {
  if (window.__sraAnalytics) return;
  window.__sraAnalytics = true;
  if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
  if (location.pathname.indexOf('admin') !== -1) return;

  // Locally (node dev-server.js) /api is proxied to the engine on :8000, so local visits never reach the live counter
  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname);
  var API = function () { return (LOCAL ? '' : (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com')) + '/api/analytics/collect'; };

  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function store(kind, key) {
    try {
      var s = kind === 'local' ? localStorage : sessionStorage;
      var v = s.getItem(key);
      if (!v) { v = rid(); s.setItem(key, v); return { v: v, fresh: true }; }
      return { v: v, fresh: false };
    } catch (e) { return { v: rid(), fresh: true }; }
  }
  var vid = store('local', 'sra_vid').v;
  var sess = store('session', 'sra_sid');

  function device() {
    var ua = navigator.userAgent;
    if (/; wv\)|SRAApp|PatrikaApp/i.test(ua)) return 'Android ऐप';
    if (/iPad|Tablet/i.test(ua)) return 'टैबलेट';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'मोबाइल';
    return 'कंप्यूटर';
  }

  function send(ev) {
    ev.vid = vid; ev.p = location.pathname.replace(/\.html$/, '') || '/'; ev.d = device();
    var body = JSON.stringify(ev);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(API(), new Blob([body], { type: 'text/plain' }))) return;
    } catch (e) {}
    try { fetch(API(), { method: 'POST', body: body, keepalive: true, mode: 'no-cors', headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }

  // ── page view ──
  var pv = { k: 'pv' };
  if (sess.fresh) {
    pv.land = 1;
    pv.r = document.referrer || '';
    try {
      var q = new URLSearchParams(location.search);
      pv.u = q.get('utm_source') || '';
    } catch (e) {}
  }
  send(pv);

  // ── downloads ──
  var lastDl = {};
  function once(key) {
    var now = Date.now();
    if (lastDl[key] && now - lastDl[key] < 5000) return false;
    lastDl[key] = now; return true;
  }
  function isApp(el) {
    var href = (el.getAttribute && (el.getAttribute('href') || '')) || '';
    return /patrika-astro\.apk|play\.google\.com/i.test(href);
  }
  function reportLabel(el) {
    var t = (el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim().slice(0, 50);
    var title = (document.title || '').split('|')[0].split('—')[0].trim().slice(0, 50);
    return title + (t ? ' · ' + t : '');
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('a,button,[onclick],[role=button]');
    if (!el) return;
    if (isApp(el)) { if (once('app')) send({ k: 'app', l: 'Android ऐप (APK)' }); return; }
    var oc = el.getAttribute('onclick') || '';
    if (/AppDownload|btn-nav-app/i.test(oc + ' ' + el.className)) return;
    var text = (el.innerText || '') + ' ' + oc + ' ' + (el.className || '') + ' ' + (el.getAttribute('download') !== null ? 'download' : '');
    if (/pdf|download|print|डाउनलोड|प्रिंट/i.test(text)) {
      var l = reportLabel(el);
      if (once(l)) send({ k: 'dl', l: l });
    }
  }, true);
  // the app modal also starts the APK with a.click() on an anchor that is not on the page
  try {
    var realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      try { if (!this.isConnected && isApp(this) && once('app')) send({ k: 'app', l: 'Android ऐप (APK)' }); } catch (e) {}
      return realClick.apply(this, arguments);
    };
  } catch (e) {}

  // ── sign-in: link this visitor to the verified phone (once per visit) ──
  function identify() {
    try {
      if (sessionStorage.getItem('sra_vid_identified') === vid) return;
      var auth = window.firebase && firebase.auth && firebase.auth();
      var u = auth && auth.currentUser;
      if (!u || !u.phoneNumber) return;
      u.getIdToken().then(function (tok) {
        send({ k: 'identify', tok: tok, nm: (u.displayName || '').slice(0, 60) });
        try { sessionStorage.setItem('sra_vid_identified', vid); } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  }
  document.addEventListener('sra:auth', function () { setTimeout(identify, 300); });
  window.addEventListener('load', function () { setTimeout(identify, 4000); });
})();
