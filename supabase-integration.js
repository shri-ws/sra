const SUPA_URL = 'https://jhnfrlgodpvdhvndpoam.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobmZybGdvZHB2ZGh2bmRwb2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTE1ODIsImV4cCI6MjA4Nzk2NzU4Mn0.ta_8NX0MEcu1CxIpPdQmemDav4j53L_QVC0rxog0anI';

const SUPA_HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// 🔥 REGISTRATION → students table
window.saveRegistration = async (fn, ln, em, phone, city, course) => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/students`, {
      method: 'POST',
      headers: SUPA_HEADERS,
      body: JSON.stringify({
        first_name: fn,
        last_name: ln,
        email: em.toLowerCase(),
        phone: phone,
        city: city,
        course_interest: course
      })
    });
    if (res.ok) console.log('✅ Student saved to Supabase');
    else console.error('❌ Save failed:', await res.text());
  } catch (e) { console.error('Save error:', e); }
};

// 🔥 CONSULTATION → consultations table
window.saveConsultation = async (name, phone, email, dob, tob, pob, q) => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/consultations`, {
      method: 'POST',
      headers: SUPA_HEADERS,
      body: JSON.stringify({
        full_name: name,
        phone: phone,
        email: email || null,
        dob: dob,
        tob: tob,
        place_of_birth: pob,
        question: q,
        status: 'pending'
      })
    });
    if (res.ok) console.log('✅ Consultation saved');
    else console.error('❌ Consult failed:', await res.text());
  } catch (e) { console.error('Consult error:', e); }
};

// 📚 ARTICLES: stored in Firestore forum_posts through sra-records.js (the Supabase project is gone).
// The names stay the same because about.html calls them.
const sraRecordsReady = () => new Promise((ok, no) => {
  let tries = 0;
  (function wait() { if (window.SRARecords) ok(window.SRARecords); else if (++tries > 100) no(new Error('sra-records.js not loaded')); else setTimeout(wait, 100); })();
});

window.saveBlogToSupabase = async (blogObj) => {
  try {
    const status = await (await sraRecordsReady()).savePost(blogObj);
    if (status === 'pending' && blogObj.isAdmin) {
      alert('लेख सुरक्षित हो गया, पर अभी सबको नहीं दिख रहा। सीधे पब्लिश करने के लिए वेबसाइट पर अपने Google admin अकाउंट (eshriee@gmail.com) से लॉगिन करें, या Admin → Forum Posts में Approve करें।');
    }
  } catch (e) { console.error('Article save error:', e); }
};

window.fetchBlogsFromSupabase = async () => {
  try {
    const R = await sraRecordsReady();
    const posts = await R.publishedPosts();
    let local = [];
    try { local = JSON.parse(localStorage.getItem('sra_blogs_database') || '[]'); } catch (e) {}
    R.uploadLocalPosts(local, new Set(posts.map(p => String(p.id)))).catch(() => {});
    return posts;
  } catch (e) { console.error('Fetch articles error:', e); }
  return null;
};

window.deleteBlogFromSupabase = async (id) => {
  try { await (await sraRecordsReady()).deletePost(id); }
  catch (e) { console.error('Delete article error:', e); alert('Firebase से हटाने के लिए Google admin अकाउंट से लॉगिन करें।'); }
};

// 🔥 ADMIN FETCH FUNCTIONS
window.fetchStudents = async () => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/students?select=*&order=created_at.desc`, {
      headers: SUPA_HEADERS
    });
    return await res.json();
  } catch (e) { console.error('Fetch students error:', e); return []; }
};

window.fetchPayments = async () => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/payments?select=*&order=created_at.desc`, {
      headers: SUPA_HEADERS
    });
    return await res.json();
  } catch (e) { console.error('Fetch payments error:', e); return []; }
};

window.fetchConsults = async () => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/consultations?select=*&order=created_at.desc`, {
      headers: SUPA_HEADERS
    });
    return await res.json();
  } catch (e) { console.error('Fetch consults error:', e); return []; }
};
