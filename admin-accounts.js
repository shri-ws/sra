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
        const errText = `Refused: "${email || 'this account'}" is not an authorised admin account. Sign in with ${PRIMARY_ADMIN}.`;
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
            <td>
              <button class="export-btn acc-edit-btn" type="button" style="background:#0284c7; color:#fff; font-size:11px; padding:3px 8px; font-weight:700; cursor:pointer;" data-uid="${esc(r.uid)}" title="नाम या विवरण सुधारें">Edit</button>
            </td>
          </tr>
          <tr class="acc-kund" hidden><td colspan="8">${r.kundalis.length
            ? `<table class="tbl acc-kund-tbl"><thead><tr><th>Kundali name</th><th>DOB</th><th>Time</th><th>Place</th><th>Lat / Lon</th><th>TZ</th><th>Saved</th></tr></thead><tbody>${kund}</tbody></table>`
            : '<div class="acc-empty">No kundalis saved in this account yet.</div>'}</td></tr>`;
      }).join('') : `<tr><td colspan="8" class="acc-empty">${rows.length ? 'No account matches the search.' : 'No accounts yet.'}</td></tr>`;
    }
  }

  function openEditAccount(uid) {
    const r = rows.find(x => x.uid === uid);
    if (!r) return;
    const p = r.profile || {};
    const modal = $('modalEditAccount');
    if (modal) {
      if ($('editAccountUid')) $('editAccountUid').value = uid;
      if ($('editAccountName')) $('editAccountName').value = p.name || '';
      if ($('editAccountPhone')) $('editAccountPhone').value = (p.phone || '').replace(/\D/g, '').slice(-10);
      if ($('editAccountEmail')) $('editAccountEmail').value = isPhoneMail(p.email) ? '' : (p.email || '');
      modal.style.display = 'flex';
    } else {
      const curName = p.name || '';
      const newName = window.prompt(`Edit account name for UID ${uid}:`, curName);
      if (newName === null) return;
      const cleanName = newName.trim();
      if (!cleanName) { alert('Name cannot be empty.'); return; }
      saveAccountData(uid, cleanName, p.phone, p.email);
    }
  }

  function closeEditAccountModal() {
    const modal = $('modalEditAccount');
    if (modal) modal.style.display = 'none';
  }

  async function saveEditAccount() {
    const uid = $('editAccountUid') ? $('editAccountUid').value : '';
    const name = $('editAccountName') ? $('editAccountName').value.trim() : '';
    const phone = $('editAccountPhone') ? $('editAccountPhone').value.replace(/\D/g, '').slice(-10) : '';
    const email = $('editAccountEmail') ? $('editAccountEmail').value.trim() : '';

    if (!uid) return;
    if (!name) { alert('कृपया नाम दर्ज करें।'); return; }

    const btn = $('editAccountSaveBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'सुरक्षित हो रहा है...'; }

    try {
      await saveAccountData(uid, name, phone, email);
      closeEditAccountModal();
      alert('खाता विवरण सफलतापूर्वक अपडेट किया गया।');
    } catch (e) {
      alert('Error: ' + (e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'सुरक्षित करें (Save)'; }
    }
  }

  async function saveAccountData(uid, name, phone, email) {
    setStatus('⏳ Updating account…');
    const ctx = await ensureAdminFirebase();
    const updateData = { name: name };
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;

    await ctx.firestore.collection('users').doc(uid).set(updateData, { merge: true });

    const r = rows.find(x => x.uid === uid);
    if (r) {
      r.profile.name = name;
      if (phone) r.profile.phone = phone;
      if (email) r.profile.email = email;
    }
    render();
    setStatus(`✓ Live from Firebase · Updated ${new Date().toLocaleTimeString('en-IN')}`);

    // If D.users is also active in window, keep it in sync
    if (window.D && Array.isArray(window.D.users)) {
      let matched = false;
      window.D.users.forEach(u => {
        if (u.id === uid || (phone && (u.phone || '').includes(phone))) {
          u.candidate_name = name;
          u.name = name;
          if (phone) u.phone = phone;
          matched = true;
        }
      });
      if (matched && typeof window.renderUserQueryRows === 'function') {
        window.renderUserQueryRows('users-tbody', window.D.users);
      }
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

  // ── Excel (.xlsx) download: one row per kundali, mobile number first ──
  // A tiny writer (stored zip + inline strings), so numbers like mobiles and dates stay as typed.
  function excelRows() {
    const head = ['Mobile / Email', 'Account name', 'Kundali name', 'Date of birth', 'Birth time', 'Birth place',
      'Latitude', 'Longitude', 'Time zone', 'Kundali saved on', 'Login method', 'Joined', 'Last login', 'UID'];
    const out = [head];
    const all = [];
    rows.forEach(r => {
      const p = r.profile;
      const acc = [contact(p), p.name || '', method(p), fmt(toDate(p.createdAt)), fmt(toDate(p.lastLoginAt)), r.uid];
      if (!r.kundalis.length) all.push({ t: 0, row: [acc[0], acc[1], '', '', '', '', '', '', '', '', acc[2], acc[3], acc[4], acc[5]] });
      r.kundalis.forEach(k => all.push({ t: k.savedTimestamp || 0, row: [acc[0], acc[1], k.name, k.date, k.time, k.city, k.lat, k.lon, k.tz,
        k.savedTimestamp ? fmt(new Date(k.savedTimestamp)) : (k.savedAt || ''), acc[2], acc[3], acc[4], acc[5]] }));
    });
    all.sort((a, b) => b.t - a.t).forEach(x => out.push(x.row));
    return out;
  }

  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  function zip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let off = 0;
    files.forEach(([name, text]) => {
      const n = enc.encode(name), d = enc.encode(text), c = crc32(d);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
      h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
      parts.push(new Uint8Array(h.buffer), n, d);
      const e = new DataView(new ArrayBuffer(46));
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true);
      e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, n.length, true);
      e.setUint32(42, off, true);
      central.push(new Uint8Array(e.buffer), n);
      off += 30 + n.length + d.length;
    });
    const size = central.reduce((s, x) => s + x.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, size, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  function exportXlsx() {
    const x = v => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const col = i => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
    const data = excelRows();
    const widths = [18, 20, 22, 13, 11, 34, 10, 10, 9, 20, 13, 20, 20, 30];
    const sheetRows = data.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) =>
      `<c r="${col(ci)}${ri + 1}" t="inlineStr"${ri === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${x(v)}</t></is></c>`).join('') + '</row>').join('');
    const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>'
      + `<sheetData>${sheetRows}</sheetData>`
      + `<autoFilter ref="A1:${col(data[0].length - 1)}${data.length}"/></worksheet>`;
    const files = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Kundalis" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Kundalis!$A$1:$' + col(data[0].length - 1) + '$' + data.length + '</definedName></definedNames></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF8A5A00"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
      ['xl/worksheets/sheet1.xml', sheet]
    ];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zip(files));
    a.download = `sra-kundalis-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }

  async function start() {
    if ($('acc-signin')) $('acc-signin').addEventListener('click', () => signIn(PRIMARY_ADMIN));
    if ($('acc-signout')) $('acc-signout').addEventListener('click', signOut);
    if ($('acc-refresh')) $('acc-refresh').addEventListener('click', load);
    if ($('acc-csv')) $('acc-csv').addEventListener('click', exportCsv);
    if ($('acc-xlsx')) $('acc-xlsx').addEventListener('click', exportXlsx);
    if ($('acc-search')) $('acc-search').addEventListener('input', render);
    if ($('acc-tbody')) {
      $('acc-tbody').addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.acc-toggle');
        if (toggleBtn) {
          const detail = toggleBtn.closest('tr').nextElementSibling;
          if (detail) detail.hidden = !detail.hidden;
          return;
        }
        const editBtn = e.target.closest('.acc-edit-btn');
        if (editBtn) {
          const uid = editBtn.dataset.uid;
          if (uid) openEditAccount(uid);
        }
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

        if ($('acc-who')) $('acc-who').textContent = '✓ ' + u.email + ' (admin)';
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
            if (errEl) errEl.textContent = `Refused: "${u.email || u.phoneNumber}" is not an authorised admin account. Sign in with ${PRIMARY_ADMIN}.`;
            setStatus(`Refused: ${esc(u.email || u.phoneNumber)} is not an admin. Sign in with ${PRIMARY_ADMIN}.`);
          });
        } else {
          setStatus(`Sign in with Google to see live Firebase account data (${PRIMARY_ADMIN}).`);
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

  window.openEditAccount = openEditAccount;
  window.closeEditAccountModal = closeEditAccountModal;
  window.saveEditAccount = saveEditAccount;

  window.SRAAdminAccounts = {
    load,
    signIn,
    signOut,
    ADMINS,
    PRIMARY_ADMIN,
    ensureFirebase: ensureAdminFirebase,
    isAdminSignedIn: () => !!adminUser,
    getAdminUser: () => adminUser,
    openEditAccount,
    closeEditAccountModal,
    saveEditAccount
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
