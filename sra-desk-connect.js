/* sra-desk-connect.js — Daivagya Desk: stay connected with clients (24 Nov 2026).
   1. "जातकों से WhatsApp पर जुड़ें": every client with a WhatsApp link; per client the day's
      personalised panchang (engine /api/panchang/personalized/calculate from the client's birth
      details) or the day's vrat / festival, written as a ready message the astrologer sends.
   2. "मंत्र, स्तोत्र व दैनिक उपाय": Navagraha and deity mantras and stotras with pictures
      (sra-mantra-library.js); any item goes to a client on WhatsApp or onto the open remedy slip.
   Uses the desk's own globals (clientsCache, currentClient, currentRemedies, rxDirty,
   renderRxItems, renderClientPreview, showToast) from consultant.html. */
(function () {
  'use strict';
  const LIB = window.SRAMantraLibrary;
  const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  const ENGINE = LOCAL ? '' : (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com');
  const inApp = () => !!window.SRAAndroid;
  const $ = id => document.getElementById(id);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clients = () => (typeof clientsCache !== 'undefined' ? clientsCache : []);
  const astroName = () => (window.deskMe && window.deskMe.name) || '';
  const todayHi = () => new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const toast = m => (typeof showToast === 'function' ? showToast(m) : alert(m));

  // ── WhatsApp ────────────────────────────────────────────────────────────
  function waUrl(phone, text) {
    const p = String(phone || '').replace(/\D/g, '').slice(-10);
    return 'https://wa.me/' + (p ? '91' + p : '') + '?text=' + encodeURIComponent(text);
  }
  // A window opened before an await is not blocked as a pop-up; the Android app hands wa.me to WhatsApp itself
  function prepareWindow() { return inApp() ? null : window.open('about:blank', '_blank'); }
  function go(w, url) {
    if (w && !w.closed) w.location.href = url;
    else location.href = url;
  }
  function signature() {
    const n = astroName();
    return '\n\n— ' + (n ? n + ', ' : '') + 'आपके ज्योतिषी';
  }

  // ── Client's birth place → coordinates (kept on this phone) ─────────────
  // 1) a saved kundali on this phone with the same person or the same city carries exact lat/lon;
  // 2) "23.25°, 77.40°" typed as the place; 3) open-meteo, then OpenStreetMap for small towns.
  function savedKundalis() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key.indexOf('sra_saved_kundalis_') !== 0) continue;
        const v = JSON.parse(localStorage.getItem(key) || '[]');
        if (Array.isArray(v)) v.forEach(k => { if (k && k.lat !== undefined && k.lat !== '' && !isNaN(Number(k.lat))) out.push(k); });
      }
    } catch (e) {}
    return out;
  }
  const norm = s => String(s || '').toLowerCase().replace(/[\s.,]+/g, ' ').trim();
  function fromSaved(c) {
    const list = savedKundalis();
    const place = norm(c.pob), first = norm(String(c.pob || '').split(',')[0]);
    const hit = list.find(k => k.date === c.dob && norm(k.name) === norm(c.name)) ||
      list.find(k => place && norm(k.city) === place) ||
      list.find(k => first && norm(String(k.city || '').split(',')[0]) === first);
    return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
  }
  async function coordsFor(c) {
    const saved = fromSaved(c);
    if (saved) return saved;
    const place = String(c.pob || '').trim();
    const m = place.match(/(-?\d{1,2}(?:\.\d+)?)\s*°?\s*[NS]?\s*,\s*(-?\d{1,3}(?:\.\d+)?)/i);
    if (m) return { lat: Number(m[1]), lon: Number(m[2]) };
    const q = place.split(',')[0].trim();
    if (!q) return null;
    const key = 'sra_desk_geo_' + norm(place);
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); if (v) return v; } catch (e) {}
    let geo = null;
    try {
      const d = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=hi&name=' + encodeURIComponent(q))).json();
      const g = d.results && d.results[0];
      if (g) geo = { lat: g.latitude, lon: g.longitude };
    } catch (e) {}
    if (!geo) {
      try {
        const d = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(place))).json();
        if (d && d[0]) geo = { lat: Number(d[0].lat), lon: Number(d[0].lon) };
      } catch (e) {}
    }
    if (geo) { try { localStorage.setItem(key, JSON.stringify(geo)); } catch (e) {} }
    return geo;
  }

  const forecastCache = {};
  async function forecastFor(c) {
    const k = c.phone + '|' + new Date().toDateString();
    if (forecastCache[k]) return forecastCache[k];
    if (!c.dob || !c.tob) throw new Error(c.name + ' की जन्म तिथि और समय खाते में भरें, तभी पंचांग बनेगा।');
    const geo = await coordsFor(c);
    if (!geo) throw new Error(c.name + ' का जन्म स्थान नहीं मिला। खाते में शहर का नाम ठीक लिखें।');
    const [y, mo, d] = c.dob.split('-').map(Number);
    const [h, mi] = c.tob.split(':').map(Number);
    const r = await fetch(ENGINE + '/api/panchang/personalized/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: c.name, year: y, month: mo, day: d, hour: h, minute: mi || 0, lat: geo.lat, lon: geo.lon, tz: 5.5 })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.data) throw new Error('पंचांग अभी नहीं बन सका। थोड़ी देर बाद फिर प्रयास करें।');
    return (forecastCache[k] = j.data);
  }

  function panchangText(c, f) {
    const x = f.explain || {};
    const lines = ['*' + c.name + ' जी, आपका आज का पंचांग*', todayHi()];
    if (x.line) lines.push('', x.line);
    if (f.headline) lines.push('', 'आज का दिन: ' + f.headline);
    (f.festivals || []).forEach(p => lines.push('', 'आज का पर्व: ' + p.name + (p.rules ? ' — ' + p.rules : '')));
    const dc = x.dincharya || {};
    ['सुबह की शुरुआत', 'वस्त्र का रंग', 'घर से निकलते समय'].forEach(k => { if (dc[k]) lines.push(k + ': ' + dc[k]); });
    if (x.upay) lines.push('', (x.h_upay || 'उपाय') + ': ' + x.upay);
    if (x.close) lines.push('', x.close);
    return lines.join('\n') + signature();
  }
  function festivalText(c, fests) {
    const p = fests[0];
    return c.name + ' जी, आज ' + p.name + ' है।' + (p.rules ? '\n' + p.rules : '') +
      '\nआपको और आपके परिवार को शुभकामनाएँ।' + signature();
  }

  // Today's festival: from the first client with full birth details (the day's parv is the same for all)
  let todayFests = null;
  async function loadTodayFestivals() {
    const c = clients().find(x => x.dob && x.tob && x.pob);
    const box = $('dc-parv');
    if (!c) { box.textContent = 'किसी जातक का पूरा जन्म विवरण (तिथि, समय, स्थान) भरते ही आज का पर्व यहाँ दिखेगा।'; return; }
    try {
      const f = await forecastFor(c);
      todayFests = f.festivals || [];
      const pl = f.panchang_line || {};
      box.innerHTML = '<b>' + esc(todayHi()) + '</b> · ' + esc([pl.masa, pl.paksha, pl.tithi, pl.nakshatra].filter(Boolean).join(', ')) +
        (todayFests.length ? '<br>आज का पर्व: <b>' + esc(todayFests.map(p => p.name).join(' · ')) + '</b>' : '<br>आज कोई बड़ा व्रत या पर्व नहीं है।');
      renderClients();
    } catch (e) { box.textContent = e.message; }
  }

  function renderClients() {
    const list = $('dc-clients');
    if (!list) return;
    const q = ($('dc-search').value || '').trim().toLowerCase();
    const rows = clients().filter(c => !q || (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
    if (!clients().length) { list.innerHTML = '<p class="dc-muted">अभी कोई जातक नहीं। "+ नया खाता" से जोड़ें।</p>'; return; }
    list.innerHTML = rows.map(c => `<div class="dc-row">
        <div class="dc-who"><b>${esc(c.name)}</b><span>+91 ${esc(c.phone)}${c.dob ? '' : ' · जन्म विवरण अधूरा'}</span></div>
        <div class="dc-acts">
          <button class="btn btn-primary btn-sm" data-act="panchang" data-p="${esc(c.phone)}">आज का पंचांग भेजें</button>
          <button class="btn btn-outline btn-sm" data-act="parv" data-p="${esc(c.phone)}" ${todayFests && !todayFests.length ? 'disabled title="आज कोई पर्व नहीं"' : ''}>पर्व संदेश</button>
          <a class="btn btn-outline btn-sm" href="${esc(waUrl(c.phone, c.name + ' जी, नमस्ते।'))}" target="_blank" rel="noopener">WhatsApp</a>
        </div></div>`).join('') || '<p class="dc-muted">इस खोज से कोई जातक नहीं मिला।</p>';
  }

  async function onClientAction(e) {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const c = clients().find(x => x.phone === b.dataset.p);
    if (!c) return;
    const w = prepareWindow();
    const old = b.textContent; b.disabled = true; b.textContent = 'तैयार हो रहा है…';
    try {
      if (b.dataset.act === 'panchang') {
        go(w, waUrl(c.phone, panchangText(c, await forecastFor(c))));
      } else {
        if (todayFests === null) await loadTodayFestivals();
        if (!todayFests || !todayFests.length) { if (w) w.close(); toast('आज कोई बड़ा व्रत या पर्व नहीं है।'); return; }
        go(w, waUrl(c.phone, festivalText(c, todayFests)));
      }
    } catch (err) { if (w) w.close(); toast(err.message); }
    finally { b.disabled = false; b.textContent = old; }
  }

  // ── Mantra library ──────────────────────────────────────────────────────
  // which client a mantra is sent to: the one open on the desk, else WhatsApp asks for a contact
  function shareText(title, text) {
    const c = typeof currentClient !== 'undefined' ? currentClient : null;
    const head = (c ? c.name + ' जी, ' : '') + 'आपके लिए — ' + title;
    window.open(waUrl(c && c.phone, head + '\n\n' + text + signature()), inApp() ? '_self' : '_blank');
  }
  // rows: [{ title, category, count, days?, timing? }]
  function addToSlip(rows) {
    if (typeof currentClient === 'undefined' || !currentClient) { toast('पहले बाईं सूची से किसी जातक का खाता चुनें।'); return; }
    const t = Date.now();
    rows.forEach((r, i) => currentRemedies.push({ id: 'rx_' + t + '_' + i, category: r.category, title: r.title,
      count: r.count || '108 बार (एक माला)', days: r.days || '40 दिन',
      timing: r.timing || 'प्रातःकाल (ब्रह्म मुहूर्त / सूर्योदय)', instructions: '' }));
    rxDirty = true;
    renderRxItems(); renderClientPreview();
    toast(currentClient.name + ' की पर्ची में ' + (rows.length > 1 ? rows.length + ' उपाय जोड़े गए' : 'उपाय जोड़ा गया') + '। "पर्ची सुरक्षित करें" दबाएँ।');
  }

  const items = [];   // every sendable piece, by index
  const picks = [];   // every remedy that can be ticked, by index
  function piece(title, text, category, count) {
    items.push({ title, text, category, count });
    const i = items.length - 1;
    return `<div class="dc-acts dc-piece-acts">
      <button class="btn btn-outline btn-sm" data-share="${i}">WhatsApp पर भेजें</button>
      <button class="btn btn-outline btn-sm" data-slip="${i}">पर्ची में जोड़ें</button></div>`;
  }

  function renderLibrary() {
    const box = $('dc-library');
    if (!box || !LIB) return;
    items.length = 0;
    const graha = LIB.graha.map(g => `<div class="dc-graha">
        <h4>${esc(g.name)} <small>${esc(g.day)} · जप संख्या ${esc(g.japa)}</small></h4>
        <p class="dc-mantra">${esc(g.beej)}</p>
        <p class="dc-shloka">${esc(g.shloka)}</p>
        ${g.src ? `<p class="dc-muted dc-src">श्लोक का स्रोत: ${esc(g.src)}</p>` : ''}
        ${piece(g.name + ' मंत्र', g.beej + '\n\n' + g.shloka + (g.src ? '\n\nश्लोक: ' + g.src : ''), 'मंत्र जप', '108 बार (एक माला)')}</div>`).join('');
    const devta = LIB.devta.map(d => `<details class="dc-dev">
        <summary><img src="${esc(d.img)}" alt="${esc(d.name)}" loading="lazy" width="72" height="96"/>
          <span><b>${esc(d.name)}</b><small>${esc(d.day)}</small></span></summary>
        <div class="dc-dev-body">
          ${d.mantras.map((m, k) => { const src = (d.mantraSrc || [])[k];
            return `<p class="dc-mantra">${esc(m)}</p>${src ? `<p class="dc-muted dc-src">स्रोत: ${esc(src)}</p>` : ''}${piece(d.name + ' — मंत्र', m + (src ? '\n\nस्रोत: ' + src : ''), 'मंत्र जप', '108 बार (एक माला)')}`; }).join('')}
          ${d.stotras.map(s => `<details class="dc-stotra"><summary>${esc(s.name)}</summary><p class="dc-shloka">${esc(s.text)}</p>
            ${s.src ? `<p class="dc-muted dc-src">स्रोत: ${esc(s.src)}</p>` : ''}
            ${piece(s.name, s.text + (s.src ? '\n\nस्रोत: ' + s.src : ''), 'पाठ / स्तोत्र', '1 पाठ')}</details>`).join('')}
        </div></details>`).join('');
    // remedies to tick: the astrologer picks any of them and sends or adds only those
    picks.length = 0;
    const tick = (label, row) => {
      picks.push(row);
      return `<li><label class="dc-check"><input type="checkbox" data-pick="${picks.length - 1}"/><span>${label}</span></label></li>`;
    };
    const daily = LIB.dailyUpay.map(u => tick(esc(u), { text: u, title: u, category: 'आचरण व नियम', count: 'प्रतिदिन', days: '40 दिन', timing: 'प्रतिदिन' })).join('');
    const week = LIB.weekdayUpay.map(u => tick(`<b>${esc(u.day)}:</b> ${esc(u.text)}`,
      { text: u.day + ': ' + u.text, title: u.day + ': ' + u.text, category: 'आचरण व नियम', count: 'हर ' + u.day, days: '11 सप्ताह', timing: u.day })).join('');
    const multi = t => esc(t).replace(/\n/g, '<br>');
    const tithi = (LIB.visheshTithi || []).map(v => tick(`<b>${esc(v.name)}</b> <small class="dc-muted">· ${esc(v.devta)}</small><br>${multi(v.text)}`,
      { text: '*' + v.name + '* (' + v.devta + ')\n' + v.text, title: v.name + ': ' + v.text.replace(/\n/g, ' '), category: 'व्रत / तिथि', count: 'हर ' + v.name.split(' (')[0], days: '1 वर्ष', timing: v.name.split(' (')[0] })).join('');
    const parv = (LIB.visheshParv || []).map(m => `<h5 class="dc-month">${esc(m.month)}</h5><ul class="dc-ul dc-checks">` +
      m.items.map(([n, t]) => tick(`<b>${esc(n)}</b>: ${esc(t)}`,
        { text: '*' + m.month + ' — ' + n + '*\n' + t, title: m.month + ' — ' + n + ': ' + t, category: 'पर्व', count: '1 बार (पर्व के दिन)', days: n, timing: m.month })).join('') + '</ul>').join('');
    const P = LIB.puja || { samagri: [], panchopachar: [], kram: [], niyam: [] };
    const pujaRow = (title, text, sec) => ({ text, title, sec, category: 'पूजा विधि', count: 'प्रतिदिन', days: 'नियमित', timing: 'प्रातः / सायं' });
    const pujaSamagri = P.samagri.map(x => tick(esc(x), pujaRow('सामग्री: ' + x, '• ' + x, 'पूजा की सामग्री'))).join('');
    const pujaPancho = P.panchopachar.map((x, i) => tick(`<b>${i + 1}. ${esc(x.name)}</b><br>${esc(x.mantra)}`,
      pujaRow('पंचोपचार ' + (i + 1) + '. ' + x.name + ' — ' + x.mantra, (i + 1) + '. ' + x.name + ': ' + x.mantra, 'पंचोपचार पूजन'))).join('');
    const pujaKram = P.kram.map((x, i) => tick(`<b>${i + 1}.</b> ${multi(x)}`, pujaRow('क्रम ' + (i + 1) + ': ' + x.replace(/\n/g, ' '), (i + 1) + '. ' + x, 'पूजा का क्रम'))).join('');
    const pujaNiyam = P.niyam.map(x => tick(`<b>${esc(x.title)}</b><br>${multi(x.text)}`, pujaRow(x.title + ': ' + x.text.replace(/\n/g, ' '), x.title + ': ' + x.text, 'घर की पूजा के नियम'))).join('');
    const pickBar = `<div class="dc-pick-bar">
          <span class="dc-pick-n">कोई उपाय नहीं चुना</span>
          <button class="btn btn-outline btn-sm" data-pick-all>सब चुनें</button>
          <button class="btn btn-primary btn-sm" data-pick-share disabled>चुने हुए WhatsApp पर भेजें</button>
          <button class="btn btn-outline btn-sm" data-pick-slip disabled>चुने हुए पर्ची में जोड़ें</button>
        </div>`;
    box.innerHTML = `
      <div class="dc-tabs" role="tablist">
        <button class="dc-tab on" data-tab="dev">देवी-देवता</button>
        <button class="dc-tab" data-tab="graha">नवग्रह मंत्र</button>
        <button class="dc-tab" data-tab="upay">दैनिक उपाय</button>
        <button class="dc-tab" data-tab="vishesh">विशेष उपाय</button>
        <button class="dc-tab" data-tab="puja">सामान्य पूजा विधि</button>
      </div>
      <div class="dc-pane" data-pane="dev">${devta}<p class="dc-muted dc-credit">${esc(LIB.credit)}</p></div>
      <div class="dc-pane" data-pane="graha" hidden>${LIB.grahaNote ? `<p class="dc-muted">${esc(LIB.grahaNote)}</p>` : ''}<div class="dc-graha-grid">${graha}</div></div>
      <div class="dc-pane" data-pane="upay" hidden>
        <p class="dc-muted">जो उपाय देने हैं उन पर सही का निशान लगाएँ, फिर नीचे से WhatsApp पर भेजें या पर्ची में जोड़ें।</p>
        <h4>रोज़ के सरल उपाय</h4><ul class="dc-ul dc-checks">${daily}</ul>
        <h4>वार के अनुसार उपाय</h4><ul class="dc-ul dc-checks">${week}</ul>
        ${pickBar}
      </div>
      <div class="dc-pane" data-pane="vishesh" hidden>
        <p class="dc-muted">हर महीने आने वाली तिथियों और महीने के पर्वों के पूजन, उपाय और मंत्र। जो देने हैं उन पर सही का निशान लगाएँ।</p>
        <h4>हर महीने की विशेष तिथियाँ</h4><ul class="dc-ul dc-checks">${tithi}</ul>
        <h4>महीने के पर्व <small class="dc-muted">(उत्तर भारत की पूर्णिमान्त मास गणना)</small></h4>${parv}
        ${pickBar}
      </div>
      <div class="dc-pane" data-pane="puja" hidden>
        <p class="dc-muted">घर में रोज़ की पूजा की सरल विधि। पूरी विधि भेजने के लिए "सब चुनें", या केवल ज़रूरी भाग चुनें।</p>
        <h4>पूजा की सामग्री</h4><ul class="dc-ul dc-checks">${pujaSamagri}</ul>
        <h4>पंचोपचार पूजन (पाँच उपचार, इसी क्रम से)</h4><ul class="dc-ul dc-checks">${pujaPancho}</ul>
        <h4>पूजा का क्रम</h4><ul class="dc-ul dc-checks">${pujaKram}</ul>
        <h4>घर की पूजा के नियम</h4><ul class="dc-ul dc-checks">${pujaNiyam}</ul>
        ${pickBar}
      </div>`;
  }
  // each tab keeps its own ticks and its own send / add bar
  const chosen = pane => [...pane.querySelectorAll('[data-pick]:checked')].map(x => picks[+x.dataset.pick]);
  function syncPicks(pane) {
    const n = chosen(pane).length, all = pane.querySelectorAll('[data-pick]').length;
    const word = pane.dataset.pane === 'puja' ? 'भाग' : 'उपाय';
    pane.querySelector('.dc-pick-n').textContent = n ? n + ' ' + word + ' चुने' : 'कुछ नहीं चुना';
    pane.querySelectorAll('[data-pick-share], [data-pick-slip]').forEach(b => { b.disabled = !n; });
    pane.querySelector('[data-pick-all]').textContent = n === all ? 'सब हटाएँ' : 'सब चुनें';
  }
  const shareTitle = (pane, n) => pane.dataset.pane === 'puja' ? 'घर में पूजा की विधि' :
    pane.dataset.pane === 'vishesh' ? (n > 1 ? 'विशेष दिनों के उपाय' : 'विशेष दिन का उपाय') : (n > 1 ? 'आपके उपाय' : 'आपका उपाय');
  function onLibraryClick(e) {
    const pane = e.target.closest('.dc-pane');
    if (pane && e.target.closest('[data-pick-all]')) {
      const boxes = [...pane.querySelectorAll('[data-pick]')];
      const on = boxes.some(b => !b.checked);
      boxes.forEach(b => { b.checked = on; });
      syncPicks(pane); return;
    }
    if (pane && e.target.closest('[data-pick-share]')) {
      const rows = chosen(pane);
      const sep = pane.dataset.pane === 'upay' ? '\n' : '\n\n';
      if (!rows.length) return;
      let body;
      if (pane.dataset.pane === 'puja') {   // one heading per section, its lines under it
        const secs = [];
        rows.forEach(r => { let g = secs.find(x => x.sec === r.sec); if (!g) secs.push(g = { sec: r.sec, lines: [] }); g.lines.push(r.text); });
        body = secs.map(g => '*' + g.sec + '*\n' + g.lines.join(g.sec === 'पूजा की सामग्री' || g.sec === 'पंचोपचार पूजन' ? '\n' : '\n\n')).join('\n\n');
      } else body = rows.map((r, i) => (rows.length > 1 && pane.dataset.pane === 'upay' ? (i + 1) + '. ' : '') + r.text).join(sep);
      shareText(shareTitle(pane, rows.length), body);
      return;
    }
    if (pane && e.target.closest('[data-pick-slip]')) { const rows = chosen(pane); if (rows.length) addToSlip(rows); return; }
    const t = e.target.closest('.dc-tab');
    if (t) {
      document.querySelectorAll('.dc-tab').forEach(x => x.classList.toggle('on', x === t));
      document.querySelectorAll('.dc-pane').forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
      return;
    }
    const s = e.target.closest('[data-share]');
    if (s) { const it = items[+s.dataset.share]; shareText(it.title, it.text); return; }
    const a = e.target.closest('[data-slip]');
    if (a) { const it = items[+a.dataset.slip]; addToSlip([{ title: it.title + (it.text.length < 160 ? ': ' + it.text.replace(/\n/g, ' ') : ''), category: it.category, count: it.count }]); }
  }

  // ── Mount ──────────────────────────────────────────────────────────────
  let fetchedFests = false;
  window.renderDeskConnect = function () {
    renderClients();
    if (!fetchedFests && clients().length) { fetchedFests = true; loadTodayFestivals(); }
  };
  function start() {
    if (!$('dc-clients')) return;
    $('dc-clients').addEventListener('click', onClientAction);
    $('dc-search').addEventListener('input', renderClients);
    $('dc-library').addEventListener('click', onLibraryClick);
    $('dc-library').addEventListener('change', e => { if (e.target.matches('[data-pick]')) syncPicks(e.target.closest('.dc-pane')); });
    renderLibrary();
    window.renderDeskConnect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
