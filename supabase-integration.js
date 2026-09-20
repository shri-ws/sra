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

// 📚 BLOGS & DISCUSSIONS PERMANENT CLOUD DATABASE ENGINE
window.saveBlogToSupabase = async (blogObj) => {
  try {
    const payload = {
      full_name: blogObj.author || "एस्ट्रो रामजी (Founder)",
      phone: blogObj.category || "blog",
      email: blogObj.avatar || "logo.png",
      dob: (blogObj.title || "").substring(0, 100),
      tob: String(blogObj.id || Date.now()),
      place_of_birth: blogObj.cred || "Shri Ramji Astro Member",
      question: JSON.stringify(blogObj),
      status: 'published_blog'
    };

    const res = await fetch(`${SUPA_URL}/rest/v1/consultations`, {
      method: 'POST',
      headers: SUPA_HEADERS,
      body: JSON.stringify(payload)
    });

    if (res.ok) console.log('✅ Permanent Blog Post saved to Supabase Cloud DB!');
    else console.error('❌ Supabase blog save failed:', await res.text());
  } catch (e) { console.error('Blog cloud save error:', e); }
};

window.fetchBlogsFromSupabase = async () => {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/consultations?status=eq.published_blog&order=created_at.desc`, {
      headers: SUPA_HEADERS
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const blogs = rows.map(r => {
          try {
            return JSON.parse(r.question);
          } catch(e) {
            return {
              id: r.tob || Date.now(),
              author: r.full_name,
              avatar: r.email || "logo.png",
              cred: r.place_of_birth,
              title: r.dob,
              body: r.question,
              category: r.phone || "general",
              isVerified: true,
              isAdmin: r.full_name.includes("रामजी") || r.full_name.includes("Founder"),
              isBlog: true,
              upvotes: 1,
              answers: [],
              status: "approved",
              created_at: r.created_at
            };
          }
        });
        return blogs;
      }
    }
  } catch (e) { console.error('Fetch blogs cloud error:', e); }
  return null;
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
