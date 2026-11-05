/* ADMIN → WEBSITE ACCOUNTS
   Lists every visitor account (Firebase Authentication, Google or mobile OTP) with the
   kundalis saved in it, read live from Firestore (users/{uid} and users/{uid}/kundalis).
   Dedicated isolated Firebase app (SRA_ADMIN_PORTAL) prevents customer OTP/Google logins
   on the main website from ever interfering with or clobbering admin authentication. */
(function() {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA9rvkSmF08JQkL08aAywj5zq-Zn4lqNHY",
    authDomain: "shriramjiastro-cee67.firebaseapp.com",
    projectId: "shriramjiastro-cee67",
    storageBucket: "shriramjiastro-cee67.firebasestorage.app",
    messagingSenderId: "918915221342",
    appId: "1:918915221342:web:fea3ed59b79be68ad6f1cf"
  };
  const SDK = 'https://www.gstatic.com/firebasejs/10.9.0/';
  const ADMIN_APP_NAME = 'SRA_ADMIN_PORTAL';
  const ADMINS = ['shriramjiastro7@gmail.com', 'eshriee@gmail.com', 'eshrico@gmail.com'];
  const PRIMARY_ADMIN = 'shriramjiastro7@gmail.com';

  let rows = [];          // [{ uid, profile, kundalis: [] }]
  let fbContextPromise = null;
  let adminUser = null;
  let adminWaiters = [];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function loadScript(src) {
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = no;
      document.head.appendChild(s);
    });
  }

  function ensureAdminFirebase() {
    if (!fbContextPromise) {
      fbContextPromise = (async () => {
        if (!(window.firebase && firebase.initializeApp)) await loadScript(SDK + 'firebase-app-compat.js');
        if (!firebase.auth) await loadScript(SDK + 'firebase-auth-compat.js');
        if (!firebase.firestore) await loadScript(SDK + 'firebase-firestore-compat.js');

        // ISOLATED NAMED APP: Never shares auth storage with [DEFAULT] customer app
        let app;
        try {
          app = firebase.app(ADMIN_APP_NAME);
        } catch(e) {
          app = firebase.initializeApp(FIREBASE_CONFIG, ADMIN_APP_NAME);
        }
        return {
          firebase,
          app,
          auth: app.auth(),
          firestore: app.firestore()
        };
      })();
      fbContextPromise.catch(() => { fbContextPromise = null; });
    }
    return fbContextPromise;
  }

  const toDate = (v) => (v && typeof v.toDate === 'function') ? v.toDate() : (v ? new Date(v) : null);
  const fmt = (d) => d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const isPhoneMail = (e) => /@shriramjiastro\.in$/.test(e || '');
  const contact = (p) => (p.email && !isPhoneMail(p.email)) ? p.email : (p.phone ? '+91 ' + p.phone : (p.email || '—'));
  const method = (p) => /google/.test(p.provider || '') ? 'Google' : (p.phone || /phone/.test(p.provider || '') ? 'Mobile OTP' : (p.provider || '—'));

  function setStatus(html) {
    const el = $('acc-status');
    if (el) el.innerHTML = html;
  }

  async function signIn(hintEmail) {
    const ctx = await ensureAdminFirebase();
    const provider = new ctx.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
      login_hint: hintEmail || PRIMARY_ADMIN
    });
    try {
      const res = await ctx.auth.signInWithPopup(provider);
      const email = (res.user && res.user.email) ? res.user.email.toLowerCase() : '';
      if (!ADMINS.includes(email)) {
        await ctx.auth.signOut();
        const errText = `अस्वीकृत: "${email || 'यह खाता'}" अधिकृत एडमिन खाता नहीं है। कृपया ${PRIMARY_ADMIN} से लॉगिन करें।`;
        setStatus(`<span class="acc-err">${esc(errText)}</span>`);
        throw new Error(errText);
      }
      adminUser = res.user;
      sessionStorage.setItem('sra_admin_auth', 'true');
      sessionStorage.setItem('sra_admin_email', email);
      return res.user;
    } catch (e) {
      if (!/popup-closed|cancelled/.test(e.code || '')) {
        setStatus(`<span class="acc-err">Google sign-in error: ${esc(e.code || e.message)}</span>`);
      }
      throw e;
    }
  }

  async function signOut() {
    try {
      const ctx = await ensureAdminFirebase();
      await ctx.auth.signOut();
    } catch(e) {}
    adminUser = null;
    sessionStorage.removeItem('sra_admin_auth');
    sessionStorage.removeItem('sra_admin_email');
    sessionStorage.removeItem('sra_admin_token');
    const loginScr = $('loginScreen');
    const appScr = $('app');
    if (loginScr) loginScr.style.display = 'flex';
    if (appScr) appScr.style.display = 'none';
  }

  let accountsLoaded = Promise.resolve();
  function load() { accountsLoaded = loadAccounts(); return accountsLoaded; }

  async function loadAccounts() {
    const ctx = await ensureAdminFirebase();
    const db = ctx.firestore;
    setStatus('⏳ Loading accounts…');
    try {
      const [usersSnap, kundSnap] = await Promise.all([db.collection('users').get(), db.collectionGroup('kundalis').get()]);
      const byUid = new Map();
      usersSnap.forEach(d => byUid.set(d.id, { uid: d.id, profile: d.data(), kundalis: [] }));
      kundSnap.forEach(d => {
        const uid = d.ref.parent.parent && d.ref.parent.parent.id;
        if (!uid) return;
        if (!byUid.has(uid)) byUid.set(uid, { uid, profile: {}, kundalis: [] });
        byUid.get(uid).kundalis.push(d.data());
      });
      rows = [...byUid.values()];
      rows.forEach(r => r.kundalis.sort((a, b) => (b.savedTimestamp || 0) - (a.savedTimestamp || 0)));
      rows.sort((a, b) => ((toDate(b.profile.lastLoginAt) || 0) - (toDate(a.profile.lastLoginAt) || 0)));
      render();
      setStatus(`✓ Live from Firebase · ${new Date().toLocaleTimeString('en-IN')}`);
    } catch (e) {
      console.warn('[Accounts]', e);
      setStatus(/permission/i.test(e.code || e.message || '')
        ? `<span class="acc-err">Firestore refused access. Please sign in with ${ADMINS.join(' or ')}.</span>`
        : `<span class="acc-err">Could not load accounts: ${esc(e.code || e.message)}</span>`);
    }
  }

  function render() {
    const q = ($('acc-search').value || '').toLowerCase().trim();
    const week = Date.now() - 7 * 864e5;
    const totalK = rows.reduce((n, r) => n + r.kundalis.length, 0);
    if ($('acc-s-total')) $('acc-s-total').textContent = rows.length;
    if ($('acc-s-new')) $('acc-s-new').textContent = rows.filter(r => (toDate(r.profile.createdAt) || 0) > week).length;
    if ($('acc-s-active')) $('acc-s-active').textContent = rows.filter(r => (toDate(r.profile.lastLoginAt) || 0) > week).length;
    if ($('acc-s-kund')) $('acc-s-kund').textContent = totalK;

    const shown = rows.filter(r => !q || [r.profile.name, r.profile.email, r.profile.phone, r.uid, ...r.kundalis.map(k => k.name + ' ' + (k.city || ''))]
      .join(' ').toLowerCase().includes(q));
    if ($('acc-tbody')) {
      $('acc-tbody').innerHTML = shown.length ? shown.map((r, i) => {
        const p = r.profile;
        const kund = r.kundalis.map(k => `<tr><td>${esc(k.name)}</td><td>${esc(k.date)}</td><td>${esc(k.time)}</td><td>${esc(k.city)}</td>
          <td>${esc(k.lat)}, ${esc(k.lon)}</td><td>${esc(k.tz)}</td><td>${fmt(k.savedTimestamp ? new Date(k.savedTimestamp) : null)}</td></tr>`).join('');
        return `<tr class="acc-row" data-i="${i}">
            <td><b>${esc(p.name || '—')}</b></td>
            <td>${esc(contact(p))}</td>
            <td><span class="badge ${method(p) === 'Google' ? 'completed' : 'pending'}">${esc(method(p))}</span></td>
            <td>${fmt(toDate(p.createdAt))}</td>
            <td>${fmt(toDate(p.lastLoginAt))}</td>
            <td><button class="export-btn acc-toggle" type="button">${r.kundalis.length} ▾</button></td>
            <td><code title="${esc(r.uid)}">${esc(r.uid.slice(0, 8))}…</code></td>
          </tr>
          <tr class="acc-kund" hidden><td colspan="7">${r.kundalis.length
            ? `<table class="tbl acc-kund-tbl"><thead><tr><th>Kundali name</th><th>DOB</th><th>Time</th><th>Place</th><th>Lat / Lon</th><th>TZ</th><th>Saved</th></tr></thead><tbody>${kund}</tbody></table>`
            : '<div class="acc-empty">No kundalis saved in this account yet.</div>'}</td></tr>`;
      }).join('') : `<tr><td colspan="7" class="acc-empty">${rows.length ? 'No account matches the search.' : 'No accounts yet.'}</td></tr>`;
    }
  }

  function exportCsv() {
    const lines = [['Account name', 'Email / Mobile', 'Method', 'Joined', 'Last login', 'UID', 'Kundali name', 'DOB', 'Time', 'Place', 'Lat', 'Lon', 'TZ']];
    rows.forEach(r => {
      const p = r.profile;
      const base = [p.name || '', contact(p), method(p), fmt(toDate(p.createdAt)), fmt(toDate(p.lastLoginAt)), r.uid];
      if (!r.kundalis.length) lines.push(base.concat(['', '', '', '', '', '', '']));
      r.kundalis.forEach(k => lines.push(base.concat([k.name, k.date, k.time, k.city, k.lat, k.lon, k.tz])));
    });
    const csv = lines.map(l => l.map(v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `sra-website-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function start() {
    if ($('acc-signin')) $('acc-signin').addEventListener('click', () => signIn(PRIMARY_ADMIN));
    if ($('acc-signout')) $('acc-signout').addEventListener('click', signOut);
    if ($('acc-refresh')) $('acc-refresh').addEventListener('click', load);
    if ($('acc-csv')) $('acc-csv').addEventListener('click', exportCsv);
    if ($('acc-search')) $('acc-search').addEventListener('input', render);
    if ($('acc-tbody')) {
      $('acc-tbody').addEventListener('click', (e) => {
        const btn = e.target.closest('.acc-toggle');
        if (!btn) return;
        const detail = btn.closest('tr').nextElementSibling;
        if (detail) detail.hidden = !detail.hidden;
      });
    }

    let ctx;
    try {
      ctx = await ensureAdminFirebase();
    } catch (e) {
      setStatus('<span class="acc-err">Could not load Firebase.</span>');
      return;
    }

    ctx.auth.onAuthStateChanged(u => {
      const isGoogleAdmin = !!(u && u.email && ADMINS.includes(u.email.toLowerCase()));

      if (isGoogleAdmin) {
        adminUser = u;
        sessionStorage.setItem('sra_admin_auth', 'true');
        sessionStorage.setItem('sra_admin_email', u.email.toLowerCase());

        if ($('acc-who')) $('acc-who').textContent = '✓ ' + u.email + ' (व्यवस्थापक)';
        if ($('acc-signin')) $('acc-signin').hidden = true;
        if ($('acc-signout')) $('acc-signout').hidden = false;
        if ($('acc-body')) $('acc-body').hidden = false;

        const adminBadge = $('admin-user-badge');
        if (adminBadge) adminBadge.textContent = '👤 ' + u.email;

        document.body.classList.add('acc-admin');

        const loginScr = $('loginScreen');
        const appScr = $('app');
        if (loginScr) loginScr.style.display = 'none';
        if (appScr) appScr.style.display = 'block';

        load();
        adminWaiters.splice(0).forEach(ok => ok(adminUser));
        if (window.loadAll) window.loadAll();
      } else {
        adminUser = null;
        sessionStorage.removeItem('sra_admin_auth');
        sessionStorage.removeItem('sra_admin_email');
        sessionStorage.removeItem('sra_admin_token');

        if ($('acc-who')) $('acc-who').textContent = 'Not signed in';
        if ($('acc-signin')) { $('acc-signin').hidden = false; $('acc-signin').textContent = 'Sign in with Google (' + PRIMARY_ADMIN + ')'; }
        if ($('acc-signout')) $('acc-signout').hidden = true;
        if ($('acc-body')) $('acc-body').hidden = true;

        const adminBadge = $('admin-user-badge');
        if (adminBadge) adminBadge.textContent = '👤 Not signed in';

        document.body.classList.remove('acc-admin');

        const loginScr = $('loginScreen');
        const appScr = $('app');
        if (loginScr) loginScr.style.display = 'flex';
        if (appScr) appScr.style.display = 'none';

        if (u) {
          ctx.auth.signOut().then(() => {
            const errEl = $('loginErr');
            if (errEl) errEl.textContent = `अस्वीकृत: "${u.email || u.phoneNumber}" अधिकृत एडमिन खाता नहीं है। कृपया ${PRIMARY_ADMIN} से लॉगिन करें।`;
            setStatus(`अस्वीकृत: ${esc(u.email || u.phoneNumber)} एडमिन नहीं है। कृपया ${PRIMARY_ADMIN} से लॉगिन करें।`);
          });
        } else {
          setStatus(`Firebase खातों का लाइव डेटा देखने हेतु Google से साइन इन करें (${PRIMARY_ADMIN})।`);
        }
      }
    });
  }

  function whenAdmin() {
    if (adminUser) return Promise.resolve(adminUser);
    return new Promise(ok => adminWaiters.push(ok));
  }

  async function list(collection) {
    try {
      const ctx = await ensureAdminFirebase();
      const snap = await ctx.firestore.collection(collection).get();
      return snap.docs.map(d => Object.assign({ id: d.id }, d.data(), { created_at: d.data().created_at || (toDate(d.data().createdAt) || new Date(0)).toISOString() }))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch(e) {
      console.warn('[Firestore list info]', collection, e.code || e.message);
      return [];
    }
  }

  async function update(collection, id, data) {
    try {
      const ctx = await ensureAdminFirebase();
      await ctx.firestore.collection(collection).doc(id).update(data);
    } catch(e) {
      console.warn('[Firestore update info]', collection, id, e.code || e.message);
    }
  }

  async function remove(collection, id) {
    try {
      const ctx = await ensureAdminFirebase();
      await ctx.firestore.collection(collection).doc(id).delete();
    } catch(e) {
      console.warn('[Firestore remove info]', collection, id, e.code || e.message);
    }
  }

  const accountRows = () => rows.filter(r => r.profile.email && !isPhoneMail(r.profile.email)).map(r => ({
    email: r.profile.email, candidate_name: r.profile.name || '', phone: r.profile.phone || '',
    login_method: 'GOOGLE', created_at: (toDate(r.profile.lastLoginAt) || toDate(r.profile.createdAt) || new Date(0)).toISOString()
  }));

  window.SRAAdminAccounts = {
    load,
    signIn,
    signOut,
    ADMINS,
    PRIMARY_ADMIN,
    ensureFirebase: ensureAdminFirebase,
    isAdminSignedIn: () => !!adminUser,
    getAdminUser: () => adminUser
  };
  window.SRAAdminData = {
    whenAdmin,
    list,
    update,
    remove,
    accountRows,
    isAdmin: () => !!adminUser,
    ready: () => accountsLoaded
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
