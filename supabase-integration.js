const SUPA_URL = 'https://jhnfrlgodpvdhvndpoam.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobmZybGdvZHB2ZGh2bmRwb2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTE1ODIsImV4cCI6MjA4Nzk2NzU4Mn0.ta8NX0MEcu1CxIpPdQmemDav4j53LQVC0rxog0anI';

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
