/* SHRI RAMJI ASTRO — ONE LOGIN FOR THE WHOLE SITE, KUNDALIS SAVED TO THE ACCOUNT
   - Sign-in with Google or mobile OTP through Firebase Authentication. Firebase keeps
     the session on the device until the visitor logs out, on every page.
   - The existing page code reads the login from localStorage (sra_verified_google_user,
     sra_verified_mobile, ...); this file writes those same keys from the Firebase user,
     so every page agrees on who is logged in.
   - Kundalis stay in localStorage as before (sra_saved_kundalis_<user>) and are mirrored
     to Firestore at users/{uid}/kundalis/{id}. Logging in on any device brings them back;
     logging out never deletes them.
   Presentation and storage only: no calculation code is touched. */
(function() {
  if (/admin\.html$/.test(location.pathname)) return;

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA9rvkSmF08JQkL08aAywj5zq-Zn4lqNHY",
    authDomain: "shriramjiastro-cee67.firebaseapp.com",
    projectId: "shriramjiastro-cee67",
    storageBucket: "shriramjiastro-cee67.firebasestorage.app",
    messagingSenderId: "918915221342",
    appId: "1:918915221342:web:fea3ed59b79be68ad6f1cf",
    measurementId: "G-0KZ45B2HL7"
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.9.0/';
  const GUEST_KEY = 'sra_saved_kundalis_guest_user';
  const LEGACY_KEYS = ['sra_verified_google_user', 'sra_verified_mobile', 'sra_verified_email', 'sra_user_name', 'sra_user_session'];

  const isHindi = () => document.documentElement.getAttribute('lang') !== 'en';
  const tr = (hi, en) => (isHindi() ? hi : en);

  // ── Firebase SDK ────────────────────────────────────────────────────────
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  let sdkPromise = null;
  function ensureFirebase() {
    if (!sdkPromise) {
      sdkPromise = (async () => {
        if (!(window.firebase && window.firebase.initializeApp)) await loadScript(SDK + 'firebase-app-compat.js');
        if (!window.firebase.auth) await loadScript(SDK + 'firebase-auth-compat.js');
        if (!window.firebase.firestore) await loadScript(SDK + 'firebase-firestore-compat.js');
        if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
        return window.firebase;
      })();
      sdkPromise.catch(() => { sdkPromise = null; });
    }
    return sdkPromise;
  }

  // ── Legacy login keys the pages already read ────────────────────────────
  function readLegacyUser() {
    try { return JSON.parse(localStorage.getItem('sra_verified_google_user') || 'null'); } catch (e) { return null; }
  }
  // Same rule as patrika.html getActiveUserIdentifier()
  function identifier() {
    const g = readLegacyUser();
    if (g && (g.email || g.uid || g.name)) return String(g.email || g.uid || g.name).toLowerCase();
    const mob = (localStorage.getItem('sra_verified_mobile') || '').trim();
    if (mob) return mob.toLowerCase();
    return 'guest_user';
  }
  const userKey = () => 'sra_saved_kundalis_' + encodeURIComponent(identifier()).replace(/[^a-zA-Z0-9_]/g, '_');

  function writeLegacy(u) {
    const phone = (u.phoneNumber || '').replace(/\D/g, '').slice(-10);
    const data = phone && !u.email
      ? { name: localStorage.getItem('sra_user_name') || u.displayName || ('+91 ' + phone), email: phone + '@shriramjiastro.in',
          phone, uid: u.uid, action: 'FIREBASE_SMS_VERIFIED' }
      : { name: u.displayName || (u.email || '').split('@')[0], email: u.email || '', photo: u.photoURL || '',
          phone, uid: u.uid, action: 'FIREBASE_GOOGLE' };
    localStorage.setItem('sra_verified_google_user', JSON.stringify(data));
    localStorage.setItem('sra_verified_mobile', data.email || data.phone || u.uid);
    if (data.email) localStorage.setItem('sra_verified_email', data.email);
    if (data.name) localStorage.setItem('sra_user_name', data.name);
    return data;
  }

  function clearLegacy() {
    LEGACY_KEYS.forEach(k => localStorage.removeItem(k));
    try { sessionStorage.removeItem('sra_guest_dismissed_auth'); } catch (e) {}
  }

  function refreshUi() {
    ['updateNavUserPill', 'updateDrawerUserProfile', 'updateSavedKundaliBadge', 'updateIndexUserUI'].forEach(fn => {
      try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {}
    });
    document.dispatchEvent(new CustomEvent('sra:auth', { detail: { user: currentUser() } }));
  }

  function currentUser() {
    const g = readLegacyUser();
    const id = identifier();
    if (id === 'guest_user') return null;
    return { id, name: (g && g.name) || localStorage.getItem('sra_user_name') || id, email: g && g.email, phone: g && g.phone,
             photo: g && g.photo, uid: g && g.uid };
  }

  // ── Kundali lists in localStorage ───────────────────────────────────────
  let applyingLocal = false;
  function readList(key) {
    try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeList(key, list) {
    applyingLocal = true;
    try { localStorage.setItem(key, JSON.stringify(list)); } finally { applyingLocal = false; }
  }
  const sameKundali = (a, b) => (a.id && b.id && a.id === b.id) ||
    (a.name === b.name && a.date === b.date && String(a.time || '').slice(0, 5) === String(b.time || '').slice(0, 5));
  function mergeLists(...lists) {
    const out = [];
    lists.flat().forEach(k => {
      if (!k || !k.date) return;
      const i = out.findIndex(x => sameKundali(x, k));
      if (i < 0) out.push(k);
      else if ((k.savedTimestamp || 0) > (out[i].savedTimestamp || 0)) out[i] = Object.assign({}, out[i], k);
    });
    out.forEach(k => { if (!k.id) k.id = 'knd_' + (k.savedTimestamp || Date.now()) + '_' + Math.floor(Math.random() * 1000); });
    return out.sort((a, b) => (b.savedTimestamp || 0) - (a.savedTimestamp || 0));
  }
  // Only plain values go to the cloud
  function clean(k) {
    const o = {};
    Object.keys(k).forEach(f => { const v = k[f]; if (v !== undefined && (typeof v !== 'object' || v === null)) o[f] = v; });
    return o;
  }
  const docId = (k) => String(k.id).replace(/[\/\s]/g, '_').slice(0, 140);

  // ── Cloud sync (Firestore users/{uid}/kundalis) ─────────────────────────
  let fbUser = null, cloudOk = true, pushTimer = null, lastSent = new Map();
  const cloudCol = (fb) => fb.firestore().collection('users').doc(fbUser.uid).collection('kundalis');

  async function pull(fb) {
    const snap = await cloudCol(fb).get();
    const cloud = snap.docs.map(d => d.data());
    lastSent = new Map(cloud.map(k => [docId(k), JSON.stringify(clean(k))]));
    // Kundalis made as a guest on this device join the account on login
    const merged = mergeLists(readList(userKey()), readList(GUEST_KEY), cloud);
    writeList(userKey(), merged);
    applyingLocal = true;
    try { localStorage.removeItem(GUEST_KEY); } finally { applyingLocal = false; }
    refreshUi();
    await push(fb);
  }

  async function push(fb) {
    if (!fbUser || !cloudOk) return;
    const list = mergeLists(readList(userKey()), readList(GUEST_KEY));
    const now = new Map(list.map(k => [docId(k), JSON.stringify(clean(k))]));
    const batch = fb.firestore().batch();
    let ops = 0;
    now.forEach((json, id) => { if (lastSent.get(id) !== json) { batch.set(cloudCol(fb).doc(id), JSON.parse(json)); ops++; } });
    lastSent.forEach((json, id) => { if (!now.has(id)) { batch.delete(cloudCol(fb).doc(id)); ops++; } });
    if (!ops) return;
    await batch.commit();
    lastSent = now;
  }

  function schedulePush() {
    if (!fbUser || !cloudOk) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => ensureFirebase().then(push).catch(cloudError), 1200);
  }

  function cloudError(e) {
    console.warn('[SRA Auth] cloud sync unavailable, kundalis stay on this device:', e && (e.code || e.message || e));
    if (e && /permission|not.*(enabled|found)|PERMISSION_DENIED|failed-precondition/i.test(String(e.code || e.message))) cloudOk = false;
  }

  // Any page that saves or deletes a kundali writes localStorage; mirror it to the account
  const nativeSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function(k, v) {
    nativeSet.call(this, k, v);
    if (this === window.localStorage && !applyingLocal && /^sra_saved_kundalis_/.test(k)) schedulePush();
  };

  async function saveProfile(fb, legacy) {
    const ref = fb.firestore().collection('users').doc(fbUser.uid);
    const snap = await ref.get();
    const now = fb.firestore.FieldValue.serverTimestamp();
    await ref.set(Object.assign({
      name: legacy.name || '', email: fbUser.email || '', phone: legacy.phone || '',
      provider: (fbUser.providerData[0] || {}).providerId || 'phone', lastLoginAt: now
    }, snap.exists ? {} : { createdAt: now }), { merge: true });
  }

  // ── Session restore on every page ───────────────────────────────────────
  async function start() {
    let fb;
    try { fb = await ensureFirebase(); } catch (e) { return; }
    fb.auth().onAuthStateChanged(async (u) => {
      fbUser = u;
      if (u) {
        const legacy = readLegacyUser();
        const data = (legacy && legacy.uid === u.uid) ? legacy : writeLegacy(u);
        refreshUi();
        try { await saveProfile(fb, data); await pull(fb); } catch (e) { cloudError(e); }
      } else {
        // Firebase has no session: a stored Firebase login is stale and must not look logged in
        const legacy = readLegacyUser();
        if (legacy && legacy.uid) { clearLegacy(); refreshUi(); }
      }
    });
  }

  // ── Login window (Google + mobile OTP) ──────────────────────────────────
  let modal, confirmation = null;
  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'sra-auth-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="sra-auth-card">
        <button type="button" class="sra-auth-x" data-close>✕</button>
        <img src="logo.png" alt="" class="sra-auth-logo">
        <h3 class="sra-auth-title"></h3>
        <p class="sra-auth-sub"></p>
        <button type="button" class="sra-auth-google" data-google>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-4 7-9.9 7-17.1z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
          <span data-t-google></span>
        </button>
        <div class="sra-auth-or"><span data-t-or></span></div>
        <div class="sra-auth-step" data-step="phone">
          <div class="sra-auth-phone"><span>+91</span><input type="tel" inputmode="numeric" maxlength="10" autocomplete="tel" data-phone></div>
          <button type="button" class="sra-auth-primary" data-send></button>
        </div>
        <div class="sra-auth-step" data-step="code" hidden>
          <input type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="sra-auth-code" data-code placeholder="••••••">
          <button type="button" class="sra-auth-primary" data-verify></button>
          <button type="button" class="sra-auth-link" data-back></button>
        </div>
        <p class="sra-auth-msg" data-msg></p>
        <p class="sra-auth-note" data-t-note></p>
        <div id="sra-auth-recaptcha"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.closest('[data-close]')) close();
      else if (e.target.closest('[data-google]')) google();
      else if (e.target.closest('[data-send]')) sendOtp();
      else if (e.target.closest('[data-verify]')) verifyOtp();
      else if (e.target.closest('[data-back]')) showStep('phone');
    });
    modal.querySelector('[data-code]').addEventListener('keydown', (e) => { if (e.key === 'Enter') verifyOtp(); });
    modal.querySelector('[data-phone]').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendOtp(); });
  }
  function texts() {
    const q = (s) => modal.querySelector(s);
    q('.sra-auth-title').textContent = tr('लॉगिन / रजिस्टर', 'Log in / Register');
    q('.sra-auth-sub').textContent = tr('एक बार लॉगिन करें — आपकी सारी कुण्डलियां आपके खाते में सुरक्षित रहेंगी।',
                                        'Log in once — all your kundalis stay saved in your account.');
    q('[data-t-google]').textContent = tr('Google से जारी रखें', 'Continue with Google');
    q('[data-t-or]').textContent = tr('अथवा मोबाइल नंबर', 'or mobile number');
    q('[data-phone]').placeholder = tr('10-अंकीय मोबाइल नंबर', '10-digit mobile number');
    q('[data-send]').textContent = tr('OTP भेजें', 'Send OTP');
    q('[data-verify]').textContent = tr('सत्यापित करें व प्रवेश करें', 'Verify & continue');
    q('[data-back]').textContent = tr('← नंबर बदलें', '← Change number');
    q('[data-t-note]').textContent = tr('नया खाता अपने आप बन जाता है। लॉग आउट करने तक आप इस फ़ोन पर लॉगिन रहेंगे।',
                                        'A new account is created automatically. You stay logged in on this device until you log out.');
    q('[data-close]').setAttribute('aria-label', tr('बंद करें', 'Close'));
  }
  const msg = (t, ok) => { const m = modal.querySelector('[data-msg]'); m.textContent = t || ''; m.classList.toggle('ok', !!ok); };
  function showStep(step) {
    modal.querySelectorAll('[data-step]').forEach(s => { s.hidden = s.dataset.step !== step; });
    msg('');
    if (step === 'code') setTimeout(() => modal.querySelector('[data-code]').focus(), 50);
  }
  function open() {
    if (currentUser()) { if (window.SRANav) window.SRANav.open(); return; }
    if (!modal) buildModal();
    texts();
    showStep('phone');
    modal.classList.add('is-open');
    document.documentElement.classList.add('sra-auth-lock');
    ensureFirebase().catch(() => msg(tr('लॉगिन सेवा लोड नहीं हो सकी। इंटरनेट जाँचें।', 'Could not load the login service. Check your internet.')));
  }
  function close() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.documentElement.classList.remove('sra-auth-lock');
  }
  function done(name) {
    close();
    const toast = tr(`🙏 स्वागत है, ${name || 'जातक'}! आप लॉगिन हो गए हैं।`, `🙏 Welcome, ${name || 'friend'}! You are logged in.`);
    if (typeof window.showKundaliToast === 'function') window.showKundaliToast(toast);
  }

  async function google() {
    msg(tr('⏳ Google विंडो खुल रही है…', '⏳ Opening Google…'), true);
    try {
      const fb = await ensureFirebase();
      const provider = new fb.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        const res = await fb.auth().signInWithPopup(provider);
        done(res.user && res.user.displayName);
      } catch (e) {
        if (/popup-blocked|operation-not-supported|web-storage/.test(e.code || '')) await fb.auth().signInWithRedirect(provider);
        else if (!/popup-closed|cancelled-popup/.test(e.code || '')) throw e;
        else msg('');
      }
    } catch (e) {
      console.warn('[SRA Auth] Google sign-in:', e);
      msg(tr('Google लॉगिन नहीं हो सका। कृपया मोबाइल OTP से प्रयास करें।', 'Google sign-in failed. Please try mobile OTP.'));
    }
  }

  async function sendOtp() {
    const num = modal.querySelector('[data-phone]').value.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(num)) { msg(tr('कृपया 10-अंकों का वैध मोबाइल नंबर दर्ज करें।', 'Please enter a valid 10-digit mobile number.')); return; }
    const btn = modal.querySelector('[data-send]');
    btn.disabled = true;
    msg(tr('⏳ OTP भेजा जा रहा है…', '⏳ Sending OTP…'), true);
    try {
      const fb = await ensureFirebase();
      fb.auth().languageCode = isHindi() ? 'hi' : 'en';
      if (!window.sraAuthRecaptcha) window.sraAuthRecaptcha = new fb.auth.RecaptchaVerifier('sra-auth-recaptcha', { size: 'invisible' });
      confirmation = await fb.auth().signInWithPhoneNumber('+91' + num, window.sraAuthRecaptcha);
      showStep('code');
      msg(tr(`✓ 6-अंकों का OTP +91 ${num} पर भेज दिया गया है।`, `✓ A 6-digit OTP was sent to +91 ${num}.`), true);
    } catch (e) {
      console.warn('[SRA Auth] OTP send:', e);
      try { window.sraAuthRecaptcha && window.sraAuthRecaptcha.clear(); } catch (_) {}
      window.sraAuthRecaptcha = null;
      msg(e && e.code === 'auth/too-many-requests'
        ? tr('बहुत अधिक प्रयास हुए। कुछ देर बाद पुनः प्रयास करें।', 'Too many attempts. Please try again later.')
        : tr('OTP भेजा नहीं जा सका। पुनः प्रयास करें या Google चुनें।', 'Could not send the OTP. Try again or use Google.'));
    } finally {
      btn.disabled = false;
    }
  }

  async function verifyOtp() {
    const code = modal.querySelector('[data-code]').value.replace(/\D/g, '');
    if (!confirmation) { showStep('phone'); return; }
    if (code.length !== 6) { msg(tr('कृपया SMS में आया 6-अंकों का OTP दर्ज करें।', 'Please enter the 6-digit OTP from the SMS.')); return; }
    try {
      const res = await confirmation.confirm(code);
      confirmation = null;
      done(res.user && (res.user.displayName || res.user.phoneNumber));
    } catch (e) {
      msg(tr('❌ गलत OTP। कृपया सही कोड दर्ज करें।', '❌ Wrong OTP. Please enter the correct code.'));
    }
  }

  async function logout(skipConfirm) {
    if (!skipConfirm && !confirm(tr('क्या आप लॉग आउट करना चाहते हैं? आपकी कुण्डलियां खाते में सुरक्षित रहेंगी।',
                                   'Log out? Your kundalis stay saved in your account.'))) return;
    try { await push(await ensureFirebase()); } catch (e) {}
    try { const fb = await ensureFirebase(); await fb.auth().signOut(); } catch (e) {}
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) {}
    fbUser = null;
    lastSent = new Map();
    clearLegacy();            // kundalis are not touched: they stay in localStorage and in the account
    refreshUi();
    if (typeof window.showKundaliToast === 'function') window.showKundaliToast(tr('✓ आप लॉग आउट हो गए हैं।', '✓ You are logged out.'));
  }

  // ── Route every existing login / logout button here ─────────────────────
  function takeOver() {
    window.openAuthModal = open;
    window.performUserLogout = () => logout(false);
    // index.html: its own email/password dialogs kept users only in this browser
    const nativeOpenModal = window.openModal;
    if (typeof nativeOpenModal === 'function' && !nativeOpenModal.sraWrapped) {
      window.openModal = function(id) {
        if (id === 'loginModal' || id === 'registerModal') { open(); return; }
        return nativeOpenModal.apply(this, arguments);
      };
      window.openModal.sraWrapped = true;
    }
  }

  window.SRAAuth = { open, close, logout, user: currentUser, ready: ensureFirebase };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { takeOver(); start(); });
  else { takeOver(); start(); }
  // theme.js may define its own versions after this file runs
  window.addEventListener('load', takeOver);
})();
