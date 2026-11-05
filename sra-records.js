/* SHRI RAMJI ASTRO — WHERE BOOKINGS, PAYMENTS, REVIEWS AND QUERIES ARE KEPT
   The pages were written for a Supabase project (now deleted) and PHP logs (GitHub Pages
   runs no PHP), so every record they sent was lost. This file catches those same requests
   and stores the record in Firestore instead, without changing the pages that send them:
     POST api/save_payment.php           → payments
     POST api/save_user.php              → user_queries
     POST api/save_career_application.php→ career_applications
     POST …supabase.co/rest/v1/<table>   → <table>  (consultations, reviews, payments, students)
     GET  …supabase.co/rest/v1/reviews?status=eq.approved → approved reviews from Firestore
   Visitors may only add records; reading them is for the admin's Google account (firestore.rules).
   Pages call window.SRARecords.add(collection, data) directly where they need to. */
(function() {
  const TABLES = ['consultations', 'reviews', 'payments', 'students', 'forum_posts', 'user_queries', 'career_applications'];
  const realFetch = window.fetch.bind(window);

  function firebaseReady() {
    if (window.SRAAuth && window.SRAAuth.ready) return window.SRAAuth.ready();
    return Promise.reject(new Error('sra-auth.js not loaded'));
  }

  // Firestore refuses undefined values and nested arrays; records are flat forms anyway
  function clean(data) {
    const out = {};
    Object.keys(data || {}).slice(0, 60).forEach(k => {
      const v = data[k];
      if (v === undefined || typeof v === 'function') return;
      out[k] = (v !== null && typeof v === 'object') ? JSON.stringify(v).slice(0, 4000) : v;
    });
    return out;
  }

  async function add(collection, data) {
    if (!TABLES.includes(collection)) throw new Error('Unknown collection ' + collection);
    const fb = await firebaseReady();
    const user = fb.auth().currentUser;
    const rec = Object.assign(clean(data), {
      created_at: (data && data.created_at) || new Date().toISOString(),
      createdAt: fb.firestore.FieldValue.serverTimestamp(),
      page: location.pathname,
      uid: user ? user.uid : ''
    });
    const col = fb.firestore().collection(collection);
    // A Razorpay payment id names the payment document, so the same payment is never listed twice
    const payId = String(rec.razorpay_payment_id || '');
    const customId = String(rec.id || rec.application_id || '');
    const ref = (collection === 'payments' && /^pay_/.test(payId)) ? col.doc(payId) 
      : ((collection === 'career_applications' && customId) ? col.doc(customId) : col.doc());
    await ref.set(rec);
    return Object.assign({ id: ref.id }, rec);
  }

  // Wait for the write, but never hold the page up for more than a few seconds
  function addSoon(collection, data) {
    const write = add(collection, data).catch(e => { console.warn('[SRARecords]', collection, e.code || e.message); return null; });
    return Promise.race([write, new Promise(ok => setTimeout(() => ok(null), 6000))]);
  }

  async function approvedReviews() {
    const fb = await firebaseReady();
    const snap = await fb.firestore().collection('reviews').where('status', '==', 'approved').get();
    return snap.docs.map(d => Object.assign({ id: d.id }, d.data()))
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

  async function careerApplications() {
    const fb = await firebaseReady();
    const items = [];
    const seen = new Set();
    const addDoc = (d) => {
      const data = d.data();
      const id = data.id || d.id || data.phone;
      if (id && !seen.has(id)) {
        seen.add(id);
        items.push(Object.assign({ id: d.id }, data));
      }
    };
    try {
      const snap1 = await fb.firestore().collection('career_applications').get();
      snap1.docs.forEach(addDoc);
    } catch(e) {}
    try {
      const snap2 = await fb.firestore().collection('user_queries')
        .where('query_type', '==', 'CAREER_APPLICATION').get();
      snap2.docs.forEach(addDoc);
    } catch(e) {}
    return items.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }

  async function updateCareerStatus(id, status) {
    const fb = await firebaseReady();
    await fb.firestore().collection('career_applications').doc(id).update({
      status: status,
      approved_at: status === 'approved' ? new Date().toISOString() : null
    });
  }

  async function verifySutradhar(phone) {
    const fb = await firebaseReady();
    const cleanPhone = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
    const snap = await fb.firestore().collection('career_applications').where('phone', '==', cleanPhone).get();
    if (snap.empty) return null;
    const docs = snap.docs.map(d => d.data());
    return docs.find(d => d.status === 'approved') || docs[0];
  }

  // ARTICLES (about.html): every post is a forum_posts document named by the post id.
  // The admin's Google sign-in publishes straight away; anyone else's post waits for approval.
  const ADMINS = ['shriramjiastro7@gmail.com', 'eshriee@gmail.com', 'eshrico@gmail.com'];
  const signedInAdmin = (fb) => { const u = fb.auth().currentUser; return !!(u && u.email && ADMINS.includes(u.email.toLowerCase())); };

  async function savePost(post) {
    const fb = await firebaseReady();
    const status = signedInAdmin(fb) ? 'approved' : 'pending';
    const rec = Object.assign(clean(post), {
      body: String(post.body || ''), title: String(post.title || ''), status,
      created_at: post.created_at || new Date().toISOString(),
      createdAt: fb.firestore.FieldValue.serverTimestamp(), page: location.pathname
    });
    await fb.firestore().collection('forum_posts').doc(String(post.id || Date.now())).set(rec);
    return status;
  }
  async function publishedPosts() {
    const fb = await firebaseReady();
    const snap = await fb.firestore().collection('forum_posts').where('status', '==', 'approved').get();
    return snap.docs.map(d => d.data()).map(p => {
      try { if (typeof p.answers === 'string') p.answers = JSON.parse(p.answers); } catch (e) { p.answers = []; }
      return p;
    });
  }
  // Posts the admin wrote earlier sit only in that browser; copy them up once the admin is signed in
  async function uploadLocalPosts(list, knownIds) {
    const fb = await firebaseReady();
    if (!signedInAdmin(fb)) return 0;
    const mine = (list || []).filter(p => p && p.id && p.isAdmin && !knownIds.has(String(p.id)));
    for (const p of mine) await savePost(p);
    return mine.length;
  }
  async function deletePost(id) {
    const fb = await firebaseReady();
    await fb.firestore().collection('forum_posts').doc(String(id)).delete();
  }

  const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  function parseBody(init) {
    try { return typeof init.body === 'string' ? JSON.parse(init.body) : null; } catch (e) { return null; }
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = String((init && init.method) || 'GET').toUpperCase();

    // 1. Direct Server PHP APIs (Hostinger / local server)
    if (/api\//.test(url)) {
      try {
        const res = await realFetch(input, init);
        // If server answered properly (not 404/405 static fallback)
        if (res.status !== 404 && res.status !== 405) {
          // Mirror write operations to Firestore in background for cloud sync
          try {
            if (method === 'POST') {
              const data = parseBody(init);
              if (data) {
                if (/save_payment\.php/.test(url)) addSoon('payments', data);
                else if (/save_user\.php/.test(url)) addSoon('user_queries', data);
                else if (/save_career_application\.php/.test(url)) {
                  const cleanPhone = String(data.phone || '').replace(/[^0-9]/g, '').slice(-10);
                  const appId = data.id || ('SRA-APP-' + Math.floor(100000 + Math.random() * 900000));
                  addSoon('career_applications', Object.assign({}, data, { id: appId, phone: cleanPhone, status: 'pending' }));
                } else if (/update_career_status\.php/.test(url) && data.id) {
                  updateCareerStatus(data.id, data.status || 'approved');
                }
              }
            }
          } catch(e) {}
          return res;
        }
      } catch(netErr) {
        // Server unreachable or network error, fallback to client Firestore below
        console.warn('[SRARecords] Server fetch failed, falling back to Firestore for:', url, netErr);
      }
    }

    // 2. Fallbacks for Static Environments (GitHub Pages without PHP)
    if (method === 'POST' && /api\/save_(payment|user)\.php/.test(url)) {
      const data = parseBody(init);
      if (data) {
        const col = /save_payment/.test(url) ? 'payments' : 'user_queries';
        if (col === 'payments') {
          // Immediately notify Sutradhar Engine on Render so commission & payout are triggered
          try {
            const apiBase = (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com');
            const cleanPhone = String(data.student_phone || data.phone || '').replace(/[^0-9]/g, '').slice(-10);
            const payId = String(data.razorpay_payment_id || ('pay_' + Date.now()));
            realFetch(apiBase + '/api/sutradhar/webhook/razorpay', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'payment.captured',
                payload: {
                  payment: {
                    entity: {
                      id: payId,
                      amount: (data.amount || 199) * 100,
                      currency: 'INR',
                      status: 'captured',
                      contact: cleanPhone,
                      notes: {
                        customer_phone: cleanPhone,
                        service_id: data.service_id || data.report_type || 'mangal_dosha',
                        coupon_code: data.coupon_code || '',
                        sutradhar_code: data.sutradhar_code || data.coupon_code || '',
                        sutradhar_id: data.sutradhar_id || ''
                      }
                    }
                  }
                }
              })
            }).catch(e => console.warn('[Sutradhar Webhook Backup Call]', e));
          } catch(e) {}
        }
        return addSoon(col, data).then(rec => json(rec ? { status: 'success', id: rec.id } : { status: 'error' }, rec ? 200 : 503));
      }
    }

    if (method === 'POST' && /api\/save_career_application\.php/.test(url)) {
      const data = parseBody(init);
      if (data) {
        const cleanPhone = String(data.phone || '').replace(/[^0-9]/g, '').slice(-10);
        const appId = data.id || ('SRA-APP-' + Math.floor(100000 + Math.random() * 900000));
        const token = data.secret_token || ('sec_' + (cleanPhone ? cleanPhone.slice(-4) : '0000') + '_' + Math.random().toString(36).slice(2, 8));
        const pass = data.secret_pass || (cleanPhone.length >= 6 ? cleanPhone.slice(-6) : '123456');
        const promoSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
        const promoCode = data.code || data.coupon_code || ('SRA-' + (cleanPhone ? cleanPhone.slice(-4) : '0000') + promoSuffix);
        const sutraId = data.sutradhar_id || ('SUTRA-' + (cleanPhone ? cleanPhone.slice(-4) : '0000') + '-01');
        const recData = Object.assign({}, data, {
          id: appId,
          phone: cleanPhone,
          status: 'pending',
          secret_token: token,
          secret_pass: pass,
          sutradhar_id: sutraId,
          code: promoCode,
          coupon_code: promoCode,
          created_at: data.created_at || new Date().toISOString()
        });
        if (recData.resume_data && recData.resume_data.length > 50000) {
          recData.resume_snippet = recData.resume_data.slice(0, 1000);
          delete recData.resume_data;
        }
        const uqData = Object.assign({}, recData, { query_type: 'CAREER_APPLICATION', application_type: 'sutradhar' });
        const p1 = addSoon('user_queries', uqData).catch(() => null);
        const p2 = addSoon('career_applications', recData).catch(() => null);
        return Promise.all([p1, p2]).then(() => json({
          status: 'success',
          application_id: appId,
          candidate_name: data.name,
          phone: cleanPhone,
          secret_token: token,
          secret_pass: pass,
          message: "आपका आवेदन सफलतापूर्वक प्राप्त हो गया है।"
        }, 200));
      }
    }

    if (/api\/get_career_applications\.php/.test(url)) {
      return careerApplications().then(list => json({ status: 'success', total: list.length, applications: list }, 200))
        .catch(() => json({ status: 'success', total: 0, applications: [] }, 200));
    }

    if (method === 'POST' && /api\/update_career_status\.php/.test(url)) {
      const data = parseBody(init);
      if (data && data.id) {
        return updateCareerStatus(data.id, data.status || 'approved').then(() => json({ status: 'success' }, 200))
          .catch(() => json({ status: 'error' }, 500));
      }
    }

    if (method === 'POST' && /api\/verify_sutradhar_auth\.php/.test(url)) {
      const data = parseBody(init);
      const phone = (data && (data.phone || data.user)) || '';
      return verifySutradhar(phone).then(rec => {
        if (rec && rec.status === 'approved') {
          return json({
            authenticated: true,
            name: rec.name || '',
            phone: rec.phone || '',
            email: rec.email || '',
            sutradhar_id: rec.sutradhar_id || ('SUTRA-' + String(rec.phone || '').slice(-4) + '-01'),
            role: 'अधिकृत सूत्रधार'
          }, 200);
        } else if (rec) {
          return json({ authenticated: false, message: 'आपका आवेदन वर्तमान में समीक्षाधीन (अंडर प्रोसेस) है।' }, 200);
        }
        return json({ authenticated: false, message: 'इस नंबर से कोई अनुमोदित आवेदन नहीं मिला।' }, 200);
      }).catch(() => json({ authenticated: false }, 200));
    }

    const supa = url.match(/supabase\.co\/rest\/v1\/([a-z_]+)/);
    if (supa) {
      const table = supa[1];
      if (method === 'POST' && TABLES.includes(table)) {
        const data = parseBody(init);
        if (data) return addSoon(table, data).then(rec => json(rec ? [rec] : { message: 'not saved' }, rec ? 201 : 503));
      }
      if (method === 'GET' && table === 'reviews' && /status=eq\.approved/.test(url)) {
        return approvedReviews().then(list => json(list)).catch(() => json([]));
      }
      // Anything else the old database used to answer: report it empty instead of a network error
      return Promise.resolve(json(method === 'GET' ? [] : { message: 'database moved to Firestore' }, method === 'GET' ? 200 : 410));
    }

    return realFetch(input, init);
  };

  window.SRARecords = { add, approvedReviews, careerApplications, updateCareerStatus, verifySutradhar, savePost, publishedPosts, uploadLocalPosts, deletePost, signedInAdmin: () => firebaseReady().then(signedInAdmin) };
})();
