/* sra-saved-pick.js — "सेव्ड कुंडली से चुनें" on every birth-details form.
   Every muhurta / report form gets one button per person (वर, वधू, बालक, गृहस्वामी…).
   It lists the kundalis saved on this device for the logged-in account (the same
   list पत्रिका saves to and sra-auth.js syncs) and fills that person's fields.
   Loaded by sra-ui.js; pages not listed below are left alone (पत्रिका keeps its
   own सुरक्षित कुण्डलियां list, where kundalis are made and saved).
   A page may define window.sraOnSavedKundaliPicked(k, who) to react after filling. */
(function () {
  'use strict';
  if (window.__sraSavedPick) return;
  window.__sraSavedPick = true;

  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const call = (fn, ...a) => { try { if (typeof window[fn] === 'function') return window[fn](...a); } catch (e) {} };

  // Shared after-fill for vmm.html (वर / वधू)
  function vmmAfter(type) {
    return (k) => {
      const place = k.city || (k.lat ? Number(k.lat).toFixed(2) + '°, ' + Number(k.lon).toFixed(2) + '°' : '');
      const st = document.getElementById(type + 'WorldStatus');
      if (st) st.textContent = '✓ सेव्ड कुंडली से स्थान भर दिया गया।';
      const chip = document.getElementById(type + 'WorldChip');
      if (chip && place) { chip.innerHTML = '<span class="world-location-chip"></span>'; chip.firstChild.textContent = '📍 ' + place; }
      call(type === 'groom' ? 'handleGroomChange' : 'handleBrideChange');
    };
  }

  // Per page: each person block and where its fields are. `at` = [input id, container
  // selector]: the button goes just above that container.
  const FORMS = {
    'vmm.html': [
      { who: 'वर', at: ['groomDob', '.form-grid'], date: 'groomDob', time: 'groomTime', city: 'groomCityName',
        lat: 'groomLat', lon: 'groomLon', tz: 'groomWorldTimezone', after: vmmAfter('groom') },
      { who: 'वधू', at: ['brideDob', '.form-grid'], date: 'brideDob', time: 'brideTime', city: 'brideCityName',
        lat: 'brideLat', lon: 'brideLon', tz: 'brideWorldTimezone', after: vmmAfter('bride') }
    ],
    'gun-milan.html': [
      { who: 'वर', at: ['v-name', '.fld'], name: 'v-name', date: 'v-date', time: 'v-time', city: 'v-city', tz: 'v-tz', coordsOn: 'v-city' },
      { who: 'वधू', at: ['g-name', '.fld'], name: 'g-name', date: 'g-date', time: 'g-time', city: 'g-city', tz: 'g-tz', coordsOn: 'g-city' }
    ],
    'mmm.html': [
      { who: 'बालक/बालिका', at: ['childDob', '.form-grid'], date: 'childDob', time: 'childTime', city: 'childCity',
        lat: 'childLat', lon: 'childLon', tz: 'childTz', after: () => call('handleChildChange') }
    ],
    'yajnopavita.html': [
      { who: 'बालक', at: ['childName', '.form-grid'], name: 'childName', date: 'childDob', time: 'childTob',
        city: 'worldSearchInput', lat: 'latInput', lon: 'lonInput', tz: 'tzInput' }
    ],
    'vastu-muhurta.html': [
      { who: 'गृहस्वामी', at: ['ownerName', '.form-grid'], name: 'ownerName', date: 'ownerDob', time: 'ownerTob',
        city: 'citySearchInput', lat: 'lat', lon: 'lon', tz: 'tz' }
    ],
    'parashara-report.html': [
      { who: 'जातक', slot: 'sraPickSlotParashara', name: 'inName', date: 'inDate', time: 'inTime', city: 'inCitySearch',
        lat: 'inLat', lon: 'inLon', tz: 'inTz', gender: 'inGender' }
    ],
    'manglik-dosh-calculator.html': [
      { who: 'जातक', slot: 'sraPickSlotManglik', name: 'newKName', date: 'newKDob', time: 'newKTob', city: 'newKPlace',
        lat: 'newKLat', lon: 'newKLon', tz: 'newKTz', gender: 'newKGender' }
    ],
    'dhan-yoga-calculator.html': [
      { who: 'जातक', slot: 'sraPickSlotDhan', name: 'birthName', date: 'birthDate', time: 'birthTime', city: 'birthCity',
        lat: 'birthLat', lon: 'birthLon', tz: 'birthTz', gender: 'birthGender' }
    ],
    'consultation.html': [
      { who: 'जातक', at: ['clientName', '.form-group'], name: 'clientName', date: 'clientDob', time: 'clientTob',
        city: 'clientLocation', gender: 'clientGender' }
    ]
  };
  FORMS['dhana-yoga-calculator.html'] = FORMS['dhan-yoga-calculator.html'];
  // Pretty URLs (/manglik-dosh-calculator) serve the same pages
  const forms = FORMS[page] || FORMS[page + '.html'];
  if (!forms) return;

  // ── The saved list: same keys as patrika.html / sra-auth.js ──────────────
  function identifier() {
    try {
      const g = JSON.parse(localStorage.getItem('sra_verified_google_user') || 'null');
      if (g && (g.email || g.uid || g.name)) return String(g.email || g.uid || g.name).toLowerCase();
    } catch (e) {}
    const mob = (localStorage.getItem('sra_verified_mobile') || '').trim();
    return mob ? mob.toLowerCase() : 'guest_user';
  }
  function readList(key) {
    try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function savedList() {
    const id = identifier();
    const keys = ['sra_saved_kundalis_' + encodeURIComponent(id).replace(/[^a-zA-Z0-9_]/g, '_')];
    if (id !== 'guest_user') keys.push('sra_saved_kundalis_guest_user');
    const out = [];
    keys.forEach(k => readList(k).forEach(x => {
      if (x && x.date && !out.some(o => o.name === x.name && o.date === x.date && String(o.time || '').slice(0, 5) === String(x.time || '').slice(0, 5))) out.push(x);
    }));
    return out.sort((a, b) => (b.savedTimestamp || 0) - (a.savedTimestamp || 0));
  }

  // ── Filling a form ──────────────────────────────────────────────────────
  const el = id => id && document.getElementById(id);
  function put(id, v) {
    const e = el(id);
    if (!e || v === undefined || v === null || v === '') return;
    e.value = v;
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function putQuiet(id, v) { const e = el(id); if (e && v !== undefined && v !== null) e.value = v; }   // no search popups

  function fill(f, k) {
    const time = String(k.time || '');
    put(f.name, k.name);
    putQuiet(f.city, k.city || '');
    if (f.lat && k.lat !== undefined && k.lat !== '') putQuiet(f.lat, Number(k.lat).toFixed(4));
    if (f.lon && k.lon !== undefined && k.lon !== '') putQuiet(f.lon, Number(k.lon).toFixed(4));
    if (f.tz) putQuiet(f.tz, k.tz !== undefined && k.tz !== '' ? k.tz : '5.5');
    if (f.gender && k.gender) put(f.gender, k.gender);
    if (f.coordsOn) {   // pages that look the city up by name: hand them the exact coordinates
      const c = el(f.coordsOn);
      if (c && k.lat !== undefined && k.lat !== '') { c.dataset.lat = k.lat; c.dataset.lon = k.lon; c.dataset.city = k.city || ''; }
    }
    put(f.date, k.date);
    put(f.time, el(f.time) && el(f.time).step === '1' && time.length === 5 ? time + ':00' : time);
    if (f.after) { try { f.after(k); } catch (e) {} }
    if (typeof window.sraOnSavedKundaliPicked === 'function') { try { window.sraOnSavedKundaliPicked(k, f.who); } catch (e) {} }
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  const CSS = `
  .sra-sp-btn{display:inline-flex;align-items:center;gap:8px;margin:2px 0 14px;padding:8px 16px;border-radius:999px;cursor:pointer;
    border:1px solid var(--sra-hair-strong,#D9C9A3);background:var(--sra-vellum,#FFFDF8);color:var(--sra-kumkum,#7A1F2B);
    font:600 14px/1.2 inherit;font-family:inherit;box-shadow:0 1px 0 rgba(0,0,0,.02);transition:background .2s,border-color .2s}
  .sra-sp-btn:hover{border-color:var(--sra-gold-deep,#9A7128);background:var(--sra-wash,#F6EEDC)}
  .sra-sp-btn small{color:var(--sra-muted,#8A7C68);font-weight:500}
  .sra-sp-slot .sra-sp-btn{margin:0}
  .sra-sp-slot .sra-sp-done{margin:6px 0 0}
  .sra-sp-done{display:block;margin:-8px 0 12px;font-size:12.5px;color:var(--sra-gold-deep,#9A7128)}
  .sra-sp-back{position:fixed;inset:0;z-index:100000;background:rgba(20,14,10,.45);display:flex;align-items:center;justify-content:center;padding:16px}
  .sra-sp-box{width:min(520px,100%);max-height:min(640px,88vh);display:flex;flex-direction:column;border-radius:18px;overflow:hidden;
    background:var(--sra-paper,#FAF6EE);color:var(--sra-ink,#2A2420);border:1px solid var(--sra-hair-strong,#D9C9A3);box-shadow:0 24px 60px rgba(0,0,0,.25)}
  .sra-sp-head{padding:18px 20px 12px;border-bottom:1px solid var(--sra-hair,#E8DCC2)}
  .sra-sp-head h3{margin:0;font-size:20px;color:var(--sra-kumkum,#7A1F2B);font-family:var(--sra-display,inherit)}
  .sra-sp-head p{margin:4px 0 10px;font-size:13px;color:var(--sra-muted,#8A7C68)}
  .sra-sp-head input{width:100%;box-sizing:border-box;padding:10px 14px;border-radius:10px;border:1px solid var(--sra-hair-strong,#D9C9A3);
    background:var(--sra-vellum,#FFFDF8);color:inherit;font:inherit;font-size:14px}
  .sra-sp-x{float:right;border:0;background:none;font-size:22px;line-height:1;cursor:pointer;color:var(--sra-muted,#8A7C68);padding:0 2px}
  .sra-sp-list{overflow:auto;padding:8px 12px 14px}
  .sra-sp-item{display:block;width:100%;text-align:left;margin:6px 0;padding:12px 14px;border-radius:12px;cursor:pointer;font:inherit;color:inherit;
    border:1px solid var(--sra-hair,#E8DCC2);background:var(--sra-vellum,#FFFDF8)}
  .sra-sp-item:hover,.sra-sp-item:focus{border-color:var(--sra-gold-deep,#9A7128);outline:none;background:var(--sra-wash,#F6EEDC)}
  .sra-sp-item b{display:block;font-size:15.5px;color:var(--sra-ink,#2A2420)}
  .sra-sp-item span{display:block;margin-top:3px;font-size:12.5px;color:var(--sra-muted,#8A7C68)}
  .sra-sp-empty{padding:26px 14px;text-align:center;font-size:14px;color:var(--sra-muted,#8A7C68);line-height:1.6}
  .sra-sp-empty a{color:var(--sra-kumkum,#7A1F2B);font-weight:700}`;

  const fmtDate = d => { const p = String(d || '').split('-'); return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : (d || ''); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function openPicker(f, btn) {
    const list = savedList();
    const back = document.createElement('div');
    back.className = 'sra-sp-back';
    back.innerHTML = `<div class="sra-sp-box" role="dialog" aria-modal="true" aria-label="सेव्ड कुंडली चुनें">
      <div class="sra-sp-head"><button type="button" class="sra-sp-x" aria-label="बंद करें">×</button>
        <h3>${esc(f.who)} की कुंडली चुनें</h3>
        <p>आपकी सेव्ड कुंडलियाँ (${list.length}) — चुनते ही विवरण भर जाएगा।</p>
        ${list.length > 5 ? '<input type="search" placeholder="नाम, शहर या तिथि से खोजें…">' : ''}</div>
      <div class="sra-sp-list"></div></div>`;
    const box = back.querySelector('.sra-sp-list');
    function render(q) {
      q = (q || '').trim().toLowerCase();
      const items = list.filter(k => !q || [k.name, k.city, k.date, fmtDate(k.date)].some(v => String(v || '').toLowerCase().includes(q)));
      if (!list.length) {
        box.innerHTML = `<div class="sra-sp-empty">अभी कोई कुंडली सेव नहीं है।<br>
          <a href="patrika.html">पत्रिका</a> में जन्म विवरण भरकर कुंडली बनाते ही वह यहाँ अपने-आप आ जाएगी।
          ${identifier() === 'guest_user' ? '<br>पहले सेव की हैं तो लॉगिन करें — खाते की कुंडलियाँ लौट आएँगी।' : ''}</div>`;
        return;
      }
      if (!items.length) { box.innerHTML = '<div class="sra-sp-empty">इस खोज से कोई कुंडली नहीं मिली।</div>'; return; }
      box.innerHTML = items.map((k, i) => `<button type="button" class="sra-sp-item" data-i="${list.indexOf(k)}">
        <b>${esc(k.name || 'जातक')}</b><span>${esc(fmtDate(k.date))} · ${esc(String(k.time || '').slice(0, 5))}${k.city ? ' · ' + esc(k.city) : ''}</span></button>`).join('');
    }
    render('');
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); btn.focus(); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    back.addEventListener('click', e => {
      if (e.target === back || e.target.closest('.sra-sp-x')) return close();
      const it = e.target.closest('.sra-sp-item');
      if (!it) return;
      const k = list[+it.dataset.i];
      close();
      fill(f, k);
      let note = btn.nextElementSibling;
      if (!note || !note.classList.contains('sra-sp-done')) { note = document.createElement('span'); note.className = 'sra-sp-done'; btn.after(note); }
      note.textContent = '✓ ' + (k.name || 'जातक') + ' का विवरण भर दिया गया';
    });
    const s = back.querySelector('input[type=search]');
    if (s) s.addEventListener('input', () => render(s.value));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    (s || back.querySelector('.sra-sp-item') || back.querySelector('.sra-sp-x')).focus();
  }

  function mount() {
    if (!document.getElementById('sra-sp-css')) {
      const st = document.createElement('style'); st.id = 'sra-sp-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    forms.forEach(f => {
      if (f.slot) {
        const slot = el(f.slot);
        if (!slot || slot.querySelector('.sra-sp-btn')) return;
        slot.classList.add('sra-sp-slot');
        slot.appendChild(makeBtn(f));
        return;
      }
      const input = el(f.at[0]);
      const box = input && input.closest(f.at[1]);
      if (!box || box.previousElementSibling && box.previousElementSibling.dataset && box.previousElementSibling.dataset.sraSp === f.who) return;
      box.parentNode.insertBefore(makeBtn(f), box);
    });
  }
  function makeBtn(f) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sra-sp-btn';
    btn.dataset.sraSp = f.who;
    btn.innerHTML = '📂 <span>सेव्ड कुंडली से चुनें</span>' + (f.slot ? '' : ' <small>(' + esc(f.who) + ')</small>');
    btn.addEventListener('click', () => openPicker(f, btn));
    return btn;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
