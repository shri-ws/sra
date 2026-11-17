/* Daily personalised panchang subscription (patrika.html).
   The calculation server keeps the subscriber list (Firestore, server-side only) and sends
   the 07:00 IST message as a browser notification (Web Push) and/or on WhatsApp.
   Endpoints: /api/panchang/personalized/{config,subscribe,unsubscribe} on SRA_API_BASE. */
(function () {
  'use strict';
  const API = () => (window.SRA_API_BASE || '') + '/api/panchang/personalized';
  const STORE = 'sra_panchang_sub';
  const hi = () => !(document.documentElement.lang || '').startsWith('en');
  const L = (h, e) => hi() ? h : e;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BTN_SEL = '#btnSubscribePanchang, #btnSubscribePanchangTop, .btn-subscribe-panchang-top';
  const STATUS_SEL = '#subPanchangStatus, #subPanchangTopStatus';

  const saved = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } };
  const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // Our Android app (a WebView: no web push) shows its own 7 AM notification through window.SRAAndroid
  const appBridge = () => (window.SRAAndroid && typeof window.SRAAndroid.enableDaily === 'function') ? window.SRAAndroid : null;
  const oldAndroidApp = () => !appBridge() && /Android/.test(navigator.userAgent) && /; wv\)/.test(navigator.userAgent);
  // opens in the phone's browser (the old app keeps only our own hosts inside), which downloads it
  const APK_URL = 'https://raw.githubusercontent.com/shri-ws/sra/main/downloads/patrika-astro.apk';
  const apiAbs = () => window.SRA_API_BASE || location.origin;

  function appPermission() {
    const b = appBridge();
    const st = b.notifyPermission();
    if (st !== 'default') return Promise.resolve(st);
    return new Promise(res => {
      const t = setTimeout(() => { window.SRAAndroidPermission = null; res(b.notifyPermission()); }, 60000);
      window.SRAAndroidPermission = v => { clearTimeout(t); window.SRAAndroidPermission = null; res(v); };
      b.requestNotify();
    });
  }

  function toast(msg) {
    if (typeof window.showKundaliToast === 'function') window.showKundaliToast(msg); else alert(msg);
  }

  function b64ToBytes(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }

  // "Where do you live now": the day's timings are for this city (birth place if unchanged)
  async function findPlace(q) {
    q = (q || '').trim();
    if (!q) return null;
    try {
      const c = typeof findCityInPresets === 'function' ? findCityInPresets(q) : null;   // eslint-disable-line no-undef
      if (c) return { lat: c.lat, lon: c.lon, name: `${c.name} (${c.en})` };
    } catch (e) { /* not on patrika */ }
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`, { headers: { 'Accept-Language': 'hi,en' } });
      const d = r.ok ? await r.json() : [];
      if (d && d[0]) return { lat: +d[0].lat, lon: +d[0].lon, name: d[0].display_name.split(',').slice(0, 2).join(',') };
    } catch (e) { /* try the next */ }
    try {
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&format=json`);
      const d = r.ok ? await r.json() : {};
      const i = d.results && d.results[0];
      if (i) return { lat: i.latitude, lon: i.longitude, name: `${i.name}${i.admin1 ? ', ' + i.admin1 : ''}` };
    } catch (e) { /* none found */ }
    return null;
  }

  function profileFromPage() {
    // patrika keeps it in a top-level `let`, which is not a window property
    const calc = window.currentCalculation || (typeof currentCalculation !== 'undefined' ? currentCalculation : null); // eslint-disable-line no-undef
    const bd = calc && calc.birthDetails;
    if (!bd || !bd.year) return null;
    return {
      name: String((typeof calc.native === 'string' && calc.native) || (calc.native && calc.native.name) || bd.candidateName || (document.getElementById('inName') || {}).value || 'जातक').trim().slice(0, 60),
      year: bd.year, month: bd.month, day: bd.day, hour: bd.hour, minute: bd.minute,
      lat: bd.lat, lon: bd.lon, tz: typeof bd.tz === 'number' ? bd.tz : null,
      current_lat: bd.lat, current_lon: bd.lon,
      birth_place: String(bd.placeName || (document.getElementById('inCitySearch') || {}).value || (document.getElementById('inPlace') || {}).value || '').trim().slice(0, 60)
    };
  }

  function paintButtons() {
    const s = saved();
    document.querySelectorAll(BTN_SEL).forEach(b => {
      b.disabled = false;
      if (s) {
        b.style.background = '#047857';
        b.innerHTML = `<span>✅ ${esc(L('दैनिक पंचांग सक्रिय — बदलें / बंद करें', 'Daily panchang on — change / stop'))}</span>`;
      } else {
        b.style.background = 'linear-gradient(135deg, #7c1305, #b45309)';
        b.innerHTML = `<span>🔔 ${esc(L('निःशुल्क दैनिक पर्सनलाइज़्ड पंचांग पाएँ', 'Subscribe free for daily personalised panchang'))}</span>`;
      }
    });
    document.querySelectorAll(STATUS_SEL).forEach(el => {
      if (!s) { el.style.display = 'none'; return; }
      const ch = [s.channels && (s.channels.push || s.channels.app) ? L('नोटिफ़िकेशन', 'notification') : '', s.channels && s.channels.whatsapp ? 'WhatsApp' : ''].filter(Boolean).join(' + ');
      el.style.display = 'block';
      el.textContent = L(`✨ ${s.name || ''} — हर सुबह 7 बजे (${ch})`, `✨ ${s.name || ''} — every morning at 7 AM (${ch})`);
    });
  }

  function injectCss() {
    if (document.getElementById('ps-css')) return;
    const st = document.createElement('style');
    st.id = 'ps-css';
    st.textContent = `
body.ps-open #sra-wa-float-container{display:none !important;}
.ps-back{position:fixed;inset:0;z-index:100000;background:rgba(20,8,4,.55);display:flex;align-items:flex-end;justify-content:center;}
@media(min-width:640px){.ps-back{align-items:center;}}
.ps-card{background:#fffdf8;color:#1f1a17;width:100%;max-width:440px;border-radius:18px 18px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom, 0px));box-shadow:0 -10px 40px rgba(0,0,0,.25);max-height:92vh;overflow:auto;font-family:inherit;}
@media(min-width:640px){.ps-card{border-radius:18px;}}
[data-theme="night"] .ps-card{background:#140f1a;color:#f7efe4;}
.ps-card h4{margin:0 0 4px;color:#7c1305;font-size:18px;}
[data-theme="night"] .ps-card h4{color:#e9c46a;}
.ps-sub{font-size:13px;opacity:.8;margin:0 0 14px;}
.ps-opt{display:flex;gap:10px;align-items:flex-start;border:1.5px solid rgba(176,141,62,.35);border-radius:12px;padding:11px 12px;margin-bottom:10px;cursor:pointer;}
.ps-opt input[type=checkbox]{width:20px;height:20px;margin-top:2px;accent-color:#7c1305;flex:none;}
.ps-opt b{display:block;font-size:15px;}
.ps-opt small{display:block;font-size:12px;opacity:.75;line-height:1.4;margin-top:2px;}
.ps-phone{display:flex;margin-top:8px;border:1.5px solid rgba(176,141,62,.45);border-radius:10px;overflow:hidden;}
.ps-phone span{padding:9px 10px;font-weight:700;background:rgba(176,141,62,.12);}
.ps-phone input{flex:1;min-width:0;border:0;outline:0;padding:9px 10px;font-size:16px;background:transparent;color:inherit;}
.ps-note{font-size:12px;background:rgba(176,141,62,.1);border-radius:10px;padding:9px 11px;margin:4px 0 12px;line-height:1.45;}
.ps-err{color:#b91c1c;font-size:13px;min-height:18px;margin:2px 0 6px;}
.ps-row{display:flex;gap:10px;}
.ps-go{flex:1;border:0;border-radius:12px;padding:13px;font-weight:700;font-size:15px;color:#fff;background:linear-gradient(135deg,#7c1305,#b45309);cursor:pointer;}
.ps-go:disabled{opacity:.6;}
.ps-x{border:1.5px solid rgba(176,141,62,.45);background:transparent;color:inherit;border-radius:12px;padding:13px 16px;font-weight:600;cursor:pointer;}
.ps-stop{display:block;width:100%;margin-top:10px;background:none;border:0;color:#b91c1c;font-weight:600;cursor:pointer;padding:6px;}`;
    document.head.appendChild(st);
  }

  // WhatsApp goes only to the number the user proved with an OTP: the server reads it
  // from the Firebase ID token, nothing typed here is trusted
  async function otpUser() {
    try {
      if (!window.SRAAuth || !window.SRAAuth.ready) return null;
      const fb = await window.SRAAuth.ready();
      const u = await new Promise(res => { const un = fb.auth().onAuthStateChanged(x => { un(); res(x); }); setTimeout(() => res(fb.auth().currentUser), 4000); });
      return u && u.phoneNumber ? u : null;
    } catch (e) { return null; }
  }

  // The free calculation server sleeps and takes up to a minute to wake: ask early (page
  // load) and keep asking, so the box does not wrongly say notifications are unavailable.
  let cfgPromise = null;
  function getConfig() {
    if (!cfgPromise) {
      cfgPromise = (async () => {
        for (let i = 0; i < 6; i++) {
          try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 25000);
            const r = await fetch(API() + '/config', { signal: ctl.signal, cache: 'no-store' });
            clearTimeout(t);
            if (r.ok) return await r.json();
          } catch (e) { /* asleep or offline */ }
          await new Promise(res => setTimeout(res, 4000));
        }
        return null;
      })().then(c => { if (!c) cfgPromise = null; return c; });
    }
    return cfgPromise;
  }

  async function testPush(btn) {
    const s = saved();
    if (!s) return;
    if (s.channels && s.channels.app && appBridge()) {
      const b = appBridge();
      if (b.notifyPermission() === 'denied') { b.openNotifySettings(); toast(L('इस ऐप की सूचनाएँ बंद हैं — खुली सेटिंग में चालू करें, फिर दोबारा टेस्ट करें।', 'Notifications are off for this app — turn them on in the settings that opened, then test again.')); return; }
      if (!b.isDailyOn()) b.enableDaily(apiAbs(), s.id, s.secret);
      b.testNow();
      toast(L('✅ अनुरोध भेजा — 5–60 सेकंड में फ़ोन पर सूचना दिखनी चाहिए।', '✅ Requested — the notification should appear in 5–60 seconds.'));
      return;
    }
    btn.disabled = true; btn.textContent = L('⏳ भेज रहे हैं…', '⏳ Sending…');
    let msg;
    try {
      const r = await fetch(API() + '/test-push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, secret: s.secret }) });
      const d = await r.json().catch(() => ({}));
      msg = !r.ok ? (d.detail || ('HTTP ' + r.status))
        : d.result === 'sent' ? L('✅ भेज दी — कुछ सेकंड में फ़ोन पर सूचना दिखनी चाहिए। न दिखे तो फ़ोन की Settings → Apps → Chrome → Notifications चालू करें।', '✅ Sent — the notification should appear in a few seconds. If not, turn on Settings → Apps → Chrome → Notifications.')
        : d.result === 'gone' ? L('इस फ़ोन की सदस्यता ब्राउज़र ने रद्द कर दी है — कृपया दोबारा सब्सक्राइब करें।', 'The browser cancelled this subscription — please subscribe again.')
        : L('नहीं भेज सके: ', 'Could not send: ') + (d.error || '');
    } catch (e) { msg = L('सर्वर से नहीं जुड़ सके, थोड़ी देर बाद प्रयास करें।', 'Could not reach the server, try again shortly.'); }
    btn.disabled = false; btn.textContent = '🔔 ' + L('अभी एक टेस्ट सूचना भेजें', 'Send a test notification now');
    toast(msg);
  }

  async function pushSubscription(vapidKey) {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('denied');
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // a subscription made with another server key cannot be reused
      const k = sub.options && sub.options.applicationServerKey;
      const same = k && btoa(String.fromCharCode(...new Uint8Array(k))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') === vapidKey;
      if (!same) { await sub.unsubscribe(); sub = null; }
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(vapidKey) });
    return sub.toJSON();
  }

  async function open() {
    const profile = profileFromPage();
    if (!profile) { toast(L('कृपया पहले अपनी कुण्डली बनाएँ (जन्म तिथि, समय व स्थान)।', 'Please make your kundali first (birth date, time and place).')); return; }
    injectCss();
    const s = saved();
    const slow = setTimeout(() => toast(L('⏳ सर्वर से जुड़ रहे हैं… (पहली बार में एक मिनट तक लग सकता है)', '⏳ Connecting to the server… (the first time can take up to a minute)')), 1500);
    const [cfg, waUser] = await Promise.all([getConfig(), otpUser()]);
    clearTimeout(slow);
    const waOn = !!(cfg && cfg.whatsapp_ready);
    const waPhone = waUser ? waUser.phoneNumber : '';
    const serverReady = !!(cfg && cfg.storage_ready);
    const app = appBridge();
    const deviceCanPush = !!app || (pushSupported() && !(isIOS() && !standalone()));
    const canPush = app ? !!(cfg && cfg.storage_ready) : deviceCanPush && !!(cfg && cfg.push_ready && cfg.vapid_public_key);

    const back = document.createElement('div');
    back.className = 'ps-back';
    back.setAttribute('data-no-i18n', '');
    back.innerHTML = `<div class="ps-card" role="dialog" aria-modal="true">
      <h4>🌅 ${esc(L('दैनिक पर्सनलाइज़्ड पंचांग', 'Daily personalised panchang'))}</h4>
      <p class="ps-sub">${esc(L(`${profile.name} की कुण्डली के अनुसार — हर सुबह 7 बजे: आज का अंक, शुभ समय, राहुकाल, दशा और उपाय।`, `For ${profile.name}'s kundali — every morning at 7 AM: today's score, good hours, Rahu kaal, dasha and remedy.`))}</p>
      <div class="ps-opt" style="display:block;cursor:default">
        <b>📍 ${esc(L('अभी आप कहाँ रहते हैं?', 'Where do you live now?'))}</b>
        <small style="display:block;margin:2px 0 8px;color:#6b5a3e">${esc(L('सूर्योदय, राहुकाल और शुभ समय इसी शहर के हिसाब से बनेंगे।', 'Sunrise, Rahu kaal and good hours are worked out for this city.'))}</small>
        <label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer"><input type="radio" name="psPlace" value="birth" ${s && s.place ? '' : 'checked'}>
          <span>${esc(L('जन्म-स्थान पर ही', 'At my birth place'))}${profile.birth_place ? ` (${esc(profile.birth_place)})` : ''}</span></label>
        <label style="display:flex;gap:8px;align-items:center;margin:4px 0;cursor:pointer"><input type="radio" name="psPlace" value="other" ${s && s.place ? 'checked' : ''}>
          <span>${esc(L('किसी दूसरे शहर में', 'In another city'))}</span></label>
        <div id="psPlaceRow" style="display:${s && s.place ? 'flex' : 'none'};gap:8px;margin-top:6px">
          <input id="psPlaceIn" type="text" autocomplete="off" value="${esc(s && s.place ? s.place.name : '')}" placeholder="${esc(L('शहर का नाम, जैसे मुंबई', 'City, e.g. Mumbai'))}" style="flex:1;min-width:0;padding:9px 10px;border:1.5px solid rgba(176,141,62,.45);border-radius:10px;font:inherit">
          <button type="button" class="ps-x" id="psPlaceFind" style="padding:8px 12px">${esc(L('खोजें', 'Find'))}</button>
        </div>
        <small id="psPlaceSt" style="display:block;margin-top:4px;color:#047857">${s && s.place ? '✅ ' + esc(s.place.name) : ''}</small>
      </div>
      <label class="ps-opt"><input type="checkbox" id="psPush" ${canPush ? 'checked' : 'disabled'}>
        <span><b>📱 ${esc(app ? L('ऐप नोटिफ़िकेशन', 'App notification') : L('फ़ोन / ब्राउज़र नोटिफ़िकेशन', 'Phone / browser notification'))}</b>
        <small>${esc(canPush ? (app ? L('हर सुबह 7 बजे इसी फ़ोन पर सूचना आएगी।', 'Arrives on this phone every morning at 7.') : L('इसी फ़ोन या कंप्यूटर पर सूचना आएगी।', 'Arrives on this phone or computer.'))
          : oldAndroidApp() ? L('ऐप के इस संस्करण में सूचना नहीं आ सकती — नीचे से नया संस्करण (2.5) इंस्टॉल करें।', 'This version of the app cannot show notifications — install the new version (2.5) below.')
          : deviceCanPush ? L('सर्वर से नहीं जुड़ सके — इंटरनेट जाँचकर पेज दोबारा खोलें।', 'Could not reach the server — check the internet and reopen the page.')
          : isIOS() ? L('iPhone पर: Safari में Share → "Add to Home Screen" करें, फिर वहीं से साइट खोलकर सब्सक्राइब करें।', 'On iPhone: Safari Share → "Add to Home Screen", then open the site from there and subscribe.')
          : L('यह ब्राउज़र नोटिफ़िकेशन नहीं दिखा सकता — साइट को Chrome में खोलें (WhatsApp/Instagram के अंदर वाले ब्राउज़र में नहीं)।', 'This browser cannot show notifications — open the site in Chrome (not inside WhatsApp/Instagram).'))}</small>
        ${oldAndroidApp() ? `<a class="ps-x" href="${APK_URL}" style="display:inline-block;margin-top:8px;padding:8px 12px;text-decoration:none">⬇️ ${esc(L('नया ऐप डाउनलोड करें', 'Download the new app'))}</a><small>${esc(L('डाउनलोड के बाद फ़ाइल खोलकर "अपडेट/इंस्टॉल" दबाएँ — आपकी कुण्डलियाँ बनी रहेंगी।', 'After it downloads, open the file and tap Update/Install — your kundalis stay.'))}</small>` : ''}</span></label>
      <label class="ps-opt"${waOn ? '' : ' style="display:none"'}><input type="checkbox" id="psWa" ${waOn && waPhone ? ((s && s.channels && s.channels.whatsapp) || !canPush ? 'checked' : '') : 'disabled'}>
        <span style="flex:1"><b>💬 WhatsApp</b>
        ${waPhone ? `<small>${esc(L('आपके लॉगिन नंबर पर: ', 'To your login number: '))}<b style="display:inline">${esc(waPhone)}</b></small>` : ''}
        <small>${esc(!waPhone ? L('WhatsApp केवल उसी नंबर पर जाता है जिससे आपने OTP द्वारा लॉगिन किया है।', 'WhatsApp goes only to the number you logged in with by OTP.')
          : cfg && cfg.whatsapp_ready ? L('हर सुबह आपके WhatsApp पर संदेश।', 'A message on your WhatsApp every morning.')
          : L('WhatsApp संदेश जल्द शुरू होंगे — शुरू होते ही अपने-आप आने लगेंगे। तब तक नोटिफ़िकेशन भी चुनें।', 'WhatsApp messages start soon and will then begin by themselves. Choose notifications too meanwhile.'))}</small>
        ${waPhone ? '' : `<button type="button" class="ps-x" id="psLogin" style="margin-top:8px;padding:8px 12px">📲 ${esc(L('मोबाइल OTP से लॉगिन करें', 'Log in with mobile OTP'))}</button>`}</span></label>
      ${serverReady ? '' : `<div class="ps-note" style="background:rgba(185,28,28,.08)">${esc(L('दैनिक पंचांग सेवा अभी सक्रिय की जा रही है — कुछ समय बाद सब्सक्राइब कर सकेंगे।', 'The daily panchang service is being switched on — you can subscribe a little later.'))}</div>`}
      <div class="ps-note"${waOn ? '' : ' style="display:none"'}>${esc(L('WhatsApp चुनने पर आप प्रतिदिन सुबह संदेश पाने की सहमति देते हैं। कभी भी यहीं से बंद कर सकते हैं।', 'By choosing WhatsApp you agree to get a message every morning. You can stop it here any time.'))}</div>
      <div class="ps-err" id="psErr" role="alert"></div>
      <div class="ps-row"><button type="button" class="ps-x" id="psClose">${esc(L('रद्द करें', 'Cancel'))}</button>
        <button type="button" class="ps-go" id="psGo">🔔 ${esc(s ? L('अपडेट करें', 'Update') : L('सब्सक्राइब करें', 'Subscribe'))}</button></div>
      ${s && s.channels && (s.channels.push || (s.channels.app && app)) ? `<button type="button" class="ps-x" id="psTest" style="width:100%;margin-top:10px">🔔 ${esc(L('अभी एक टेस्ट सूचना भेजें', 'Send a test notification now'))}</button>` : ''}
      ${s ? `<button type="button" class="ps-stop" id="psStop">${esc(L('दैनिक पंचांग बंद करें', 'Stop daily panchang'))}</button>` : ''}
    </div>`;
    document.body.appendChild(back);
    document.body.classList.add('ps-open');
    const $ = id => back.querySelector('#' + id);
    const close = () => { back.remove(); document.body.classList.remove('ps-open'); };
    $('psClose').onclick = close;
    back.addEventListener('click', e => { if (e.target === back) close(); });
    if ($('psLogin')) $('psLogin').onclick = e => {
      e.preventDefault();
      close();
      const logged = window.SRAAuth && window.SRAAuth.user && window.SRAAuth.user();
      if (logged) toast(L('आप Google से लॉगिन हैं। WhatsApp के लिए लॉग-आउट करके मोबाइल नंबर (OTP) से लॉगिन करें, फिर यहीं सब्सक्राइब करें।', 'You are logged in with Google. For WhatsApp, log out and log in with your mobile number (OTP), then subscribe here.'));
      else if (window.SRAAuth) window.SRAAuth.open();
    };
    let place = s && s.place ? s.place : null;
    back.querySelectorAll('input[name=psPlace]').forEach(r => r.onchange = () => {
      $('psPlaceRow').style.display = back.querySelector('input[name=psPlace][value=other]').checked ? 'flex' : 'none';
    });
    const findNow = async () => {
      const st = $('psPlaceSt');
      st.style.color = '#6b5a3e'; st.textContent = L('⏳ खोज रहे हैं…', '⏳ Searching…');
      const p = await findPlace($('psPlaceIn').value);
      place = p;
      st.style.color = p ? '#047857' : '#b91c1c';
      st.textContent = p ? '✅ ' + p.name : L('शहर नहीं मिला — नाम दूसरी तरह लिखकर देखें (जैसे Mumbai)।', 'City not found — try another spelling (e.g. Mumbai).');
      return p;
    };
    $('psPlaceFind').onclick = findNow;
    $('psPlaceIn').addEventListener('input', () => { place = null; $('psPlaceSt').textContent = ''; });
    $('psPlaceIn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); findNow(); } });
    if ($('psTest')) $('psTest').onclick = () => testPush($('psTest'));
    if ($('psStop')) $('psStop').onclick = async () => { await stop(); close(); };

    $('psGo').onclick = async () => {
      const err = $('psErr'), go = $('psGo');
      err.textContent = '';
      const wantPush = $('psPush').checked, wantWa = $('psWa').checked;
      if (!wantPush && !wantWa) { err.textContent = L('कम से कम एक तरीका चुनें।', 'Choose at least one way.'); return; }
      go.disabled = true; go.textContent = L('⏳ जुड़ रहा है…', '⏳ Connecting…');
      try {
        const other = back.querySelector('input[name=psPlace][value=other]').checked;
        if (other && !place) place = await findNow();
        if (other && !place) throw new Error(L('अभी जहाँ रहते हैं वह शहर लिखकर "खोजें" दबाएँ।', 'Type the city you live in now and press Find.'));
        const here = other ? place : null;
        profile.current_lat = here ? here.lat : profile.lat;
        profile.current_lon = here ? here.lon : profile.lon;
        profile.current_place = here ? here.name : null;
        if (!serverReady) throw new Error(L('दैनिक पंचांग सेवा अभी सक्रिय की जा रही है — कृपया कुछ समय बाद प्रयास करें।', 'The daily panchang service is being switched on — please try again a little later.'));
        let push = null, appDevice = null;
        if (wantPush && app) {
          const st = await appPermission();
          if (st !== 'granted') {
            app.openNotifySettings();
            throw new Error(L('इस ऐप की सूचनाएँ बंद हैं। खुली सेटिंग में "सूचनाएँ/Notifications" चालू करें, फिर दोबारा सब्सक्राइब करें।', 'Notifications are off for this app. Turn on Notifications in the settings that opened, then subscribe again.'));
          }
          appDevice = app.deviceId();
        } else if (wantPush) {
          if (!cfg.push_ready || !cfg.vapid_public_key) throw new Error(L('नोटिफ़िकेशन सेवा अभी चालू नहीं है — अभी WhatsApp चुनें।', 'Notifications are not switched on yet — choose WhatsApp for now.'));
          try { push = await pushSubscription(cfg.vapid_public_key); }
          catch (e) {
            throw new Error(e.message === 'denied'
              ? L('नोटिफ़िकेशन की अनुमति नहीं मिली। Chrome में पता-पट्टी के 🔒 पर टैप करके Notifications → Allow करें, फिर दोबारा सब्सक्राइब करें।', 'Notification permission was not given. Tap the 🔒 in the Chrome address bar → Notifications → Allow, then subscribe again.')
              : L('इस ब्राउज़र में नोटिफ़िकेशन चालू नहीं हो सका', 'Could not turn on notifications in this browser') + ' (' + (e.name || '') + ': ' + (e.message || e) + ')');
          }
        }
        const idToken = wantWa && waUser ? await waUser.getIdToken() : null;
        const r = await fetch(API() + '/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({}, profile, { push, app_device: appDevice, whatsapp_consent: wantWa, id_token: idToken }))
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.detail || L('सब्सक्राइब नहीं हो सका, कृपया पुनः प्रयास करें।', 'Could not subscribe, please try again.'));
        const old = saved();
        if (old && old.id && old.id !== data.id) {   // moved to another channel key: drop the old entry
          fetch(API() + '/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: old.id, secret: old.secret }) }).catch(() => {});
        }
        localStorage.setItem(STORE, JSON.stringify({ id: data.id, secret: data.secret, channels: data.channels, name: profile.name, place: profile.current_place ? { name: profile.current_place, lat: profile.current_lat, lon: profile.current_lon } : null }));
        if (appDevice) { app.enableDaily(apiAbs(), data.id, data.secret); app.testNow(); }
        localStorage.removeItem('sra_panchang_subscribed');
        paintButtons();
        close();
        toast(L('✅ सब्सक्राइब हो गया! कल से हर सुबह 7 बजे आपका पंचांग आएगा। आज का:', '✅ Subscribed! From tomorrow your panchang arrives at 7 AM. Today:') + '\n' + data.notification.title);
        if (push && data.notification) {
          navigator.serviceWorker.ready.then(reg => reg.showNotification(data.notification.title, { body: data.notification.body, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: '/aaj-panchang.html' } })).catch(() => {});
        }
      } catch (e) {
        err.textContent = e.message || String(e);
        go.disabled = false; go.textContent = '🔔 ' + L('सब्सक्राइब करें', 'Subscribe');
      }
    };
  }

  async function stop() {
    const s = saved();
    if (!s) return;
    try {
      await fetch(API() + '/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, secret: s.secret }) });
      if (s.channels && s.channels.app && appBridge()) appBridge().disableDaily();
      if (s.channels && s.channels.push && navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        const sub = reg && await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
    } catch (e) { /* the server drops dead entries by itself */ }
    localStorage.removeItem(STORE);
    paintButtons();
    toast(L('दैनिक पंचांग बंद कर दिया गया।', 'Daily panchang stopped.'));
  }

  window.handlePanchangSubscription = open;
  window.SRAPanchangSubscribe = { open, stop };
  // the old flow only set this flag without really subscribing
  try { localStorage.removeItem('sra_panchang_subscribed'); } catch (e) {}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintButtons); else paintButtons();
  setTimeout(() => { getConfig(); }, 2500);
  try {
    const s0 = saved(), b0 = appBridge();
    if (s0 && s0.channels && s0.channels.app && b0 && !b0.isDailyOn()) b0.enableDaily(apiAbs(), s0.id, s0.secret);
  } catch (e) { /* not in the app */ }   // wakes the server before anyone opens the box
  new MutationObserver(paintButtons).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
