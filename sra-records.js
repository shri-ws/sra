/* SHRI RAMJI ASTRO — WHERE BOOKINGS, PAYMENTS, REVIEWS AND QUERIES ARE KEPT
   The pages were written for a Supabase project (now deleted) and PHP logs (GitHub Pages
   runs no PHP), so every record they sent was lost. This file catches those same requests
   and stores the record in Firestore instead, without changing the pages that send them:
     POST api/save_payment.php           → payments
     POST api/save_user.php              → user_queries
     POST …supabase.co/rest/v1/<table>   → <table>  (consultations, reviews, payments, students)
     GET  …supabase.co/rest/v1/reviews?status=eq.approved → approved reviews from Firestore
   Visitors may only add records; reading them is for the admin's Google account (firestore.rules).
   Pages call window.SRARecords.add(collection, data) directly where they need to. */
(function() {
  const TABLES = ['consultations', 'reviews', 'payments', 'students', 'forum_posts', 'user_queries'];
  const realFetch = window.fetch.bind(window);

  function firebaseReady() {
    if (window.SRAAuth && window.SRAAuth.ready) return window.SRAAuth.ready();
    return Promise.reject(new Error('sra-auth.js not loaded'));
  }

  // Firestore refuses undefined values and nested arrays; records are flat forms anyway
  function clean(data) {
    const out = {};
    Object.keys(data || {}).slice(0, 50).forEach(k => {
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
    const ref = (collection === 'payments' && /^pay_/.test(payId)) ? col.doc(payId) : col.doc();
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

  const json = (body, status) => new Response(JSON.stringify(body), { status: status || 200, headers: { 'Content-Type': 'application/json' } });
  function parseBody(init) {
    try { return typeof init.body === 'string' ? JSON.parse(init.body) : null; } catch (e) { return null; }
  }

  window.fetch = function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = String((init && init.method) || 'GET').toUpperCase();

    if (method === 'POST' && /api\/save_(payment|user)\.php/.test(url)) {
      const data = parseBody(init);
      if (data) {
        const col = /save_payment/.test(url) ? 'payments' : 'user_queries';
        return addSoon(col, data).then(rec => json(rec ? { status: 'success', id: rec.id } : { status: 'error' }, rec ? 200 : 503));
      }
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

  window.SRARecords = { add, approvedReviews };
})();
