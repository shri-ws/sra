/* ADMIN → WEBSITE ACCOUNTS
   Lists every visitor account (Firebase Authentication, Google or mobile OTP) with the
   kundalis saved in it, read live from Firestore (users/{uid} and users/{uid}/kundalis).
   Firestore rules let only the owner's Google accounts read other people's data, so the
   panel asks for that Google sign-in first. Read-only: nothing here changes user data. */
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
  const ADMINS = ['eshriee@gmail.com', 'shriramjiastro7@gmail.com'];

  let rows = [];          // [{ uid, profile, kundalis: [] }]
  let fbReady = null;
  let adminUser = null;
  let adminWaiters = [];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function loadScript(src) {
    return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  }
  function ensureFirebase() {
    if (!fbReady) {
      fbReady = (async () => {
        if (!(window.firebase && firebase.initializeApp)) await loadScript(SDK + 'firebase-app-compat.js');
        if (!firebase.auth) await loadScript(SDK + 'firebase-auth-compat.js');
        if (!firebase.firestore) await loadScript(SDK + 'firebase-firestore-compat.js');
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        return firebase;
      })();
      fbReady.catch(() => { fbReady = null; });
    }
    return fbReady;
  }

  const toDate = (v) => (v && typeof v.toDate === 'function') ? v.toDate() : (v ? new Date(v) : null);
  const fmt = (d) => d ? d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const isPhoneMail = (e) => /@shriramjiastro\.in$/.test(e || '');
  const contact = (p) => (p.email && !isPhoneMail(p.email)) ? p.email : (p.phone ? '+91 ' + p.phone : (p.email || '—'));
  const method = (p) => /google/.test(p.provider || '') ? 'Google' : (p.phone || /phone/.test(p.provider || '') ? 'Mobile OTP' : (p.provider || '—'));

  function setStatus(html) { $('acc-status').innerHTML = html; }

  async function signIn() {
    const fb = await ensureFirebase();
    const provider = new fb.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try { await fb.auth().signInWithPopup(provider); }
    catch (e) { if (!/popup-closed|cancelled/.test(e.code || '')) setStatus(`<span class="acc-err">Google sign-in failed: ${esc(e.code || e.message)}</span>`); }
  }
  async function signOut() { const fb = await ensureFirebase(); await fb.auth().signOut(); }

  let accountsLoaded = Promise.resolve();
  function load() { accountsLoaded = loadAccounts(); return accountsLoaded; }
  async function loadAccounts() {
    const fb = await ensureFirebase();
    const db = fb.firestore();
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
        ? `<span class="acc-err">Firestore refused access. Publish the latest <b>firestore.rules</b> (admin read) in the Firebase console, and sign in with ${ADMINS.join(' or ')}.</span>`
        : `<span class="acc-err">Could not load accounts: ${esc(e.code || e.message)}</span>`);
    }
  }

  function render() {
    const q = ($('acc-search').value || '').toLowerCase().trim();
    const week = Date.now() - 7 * 864e5;
    const totalK = rows.reduce((n, r) => n + r.kundalis.length, 0);
    $('acc-s-total').textContent = rows.length;
    $('acc-s-new').textContent = rows.filter(r => (toDate(r.profile.createdAt) || 0) > week).length;
    $('acc-s-active').textContent = rows.filter(r => (toDate(r.profile.lastLoginAt) || 0) > week).length;
    $('acc-s-kund').textContent = totalK;

    const shown = rows.filter(r => !q || [r.profile.name, r.profile.email, r.profile.phone, r.uid, ...r.kundalis.map(k => k.name + ' ' + (k.city || ''))]
      .join(' ').toLowerCase().includes(q));
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
    $('acc-signin').addEventListener('click', signIn);
    $('acc-signout').addEventListener('click', signOut);
    $('acc-refresh').addEventListener('click', load);
    $('acc-csv').addEventListener('click', exportCsv);
    $('acc-search').addEventListener('input', render);
    $('acc-tbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.acc-toggle');
      if (!btn) return;
      const detail = btn.closest('tr').nextElementSibling;
      detail.hidden = !detail.hidden;
    });
    let fb;
    try { fb = await ensureFirebase(); } catch (e) { setStatus('<span class="acc-err">Could not load Firebase.</span>'); return; }
    fb.auth().onAuthStateChanged(u => {
      const isAdmin = !!(u && u.email && ADMINS.includes(u.email.toLowerCase()));
      $('acc-who').textContent = u ? (u.email || u.phoneNumber || u.uid) : 'Not signed in';
      $('acc-signin').hidden = isAdmin;
      $('acc-signout').hidden = !u;
      $('acc-body').hidden = !isAdmin;
      adminUser = isAdmin ? u : null;
      document.body.classList.toggle('acc-admin', isAdmin);
      if (isAdmin) {
        load();
        adminWaiters.splice(0).forEach(ok => ok(u));
        // Every other panel reads Firestore too, so reload them now that access is granted
        if (typeof window.loadAll === 'function' && sessionStorage.getItem('sra_admin_auth') === 'true') window.loadAll();
      }
      else setStatus(u ? `<span class="acc-err">${esc(u.email || u.phoneNumber)} is not an admin account. Sign in with ${ADMINS.join(' or ')}.</span>`
                       : `Sign in with ${ADMINS.join(' or ')} to load consultations, payments, students, reviews and accounts.`);
    });
  }

  // Records the website stores in Firestore (sra-records.js): consultations, payments,
  // students, reviews, user_queries, forum_posts. Read by admin.html's loadAll().
  function whenAdmin() {
    return adminUser ? Promise.resolve(adminUser) : new Promise(ok => adminWaiters.push(ok));
  }
  async function list(collection) {
    if (!adminUser) return [];
    const fb = await ensureFirebase();
    const snap = await fb.firestore().collection(collection).get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data(), { created_at: d.data().created_at || (toDate(d.data().createdAt) || new Date(0)).toISOString() }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }
  async function update(collection, id, data) {
    const fb = await ensureFirebase();
    await fb.firestore().collection(collection).doc(id).update(data);
  }
  // Google sign-ins from Website Accounts, as rows for the Verified Email Logins table
  const accountRows = () => rows.filter(r => r.profile.email && !isPhoneMail(r.profile.email)).map(r => ({
    email: r.profile.email, candidate_name: r.profile.name || '', phone: r.profile.phone || '',
    login_method: 'GOOGLE', created_at: (toDate(r.profile.lastLoginAt) || toDate(r.profile.createdAt) || new Date(0)).toISOString()
  }));

  window.SRAAdminAccounts = { load };
  window.SRAAdminData = { whenAdmin, list, update, accountRows, isAdmin: () => !!adminUser, ready: () => accountsLoaded };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
