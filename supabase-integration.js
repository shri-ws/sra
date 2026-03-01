// ════════════════════════════════════════
//  SHRI RAMJI ASTRO — Supabase Integration
//  Add this as supabase-integration.js
//  Then add <script src="supabase-integration.js"></script>
//  just before </body> in index.html
// ════════════════════════════════════════

const SUPA_URL = 'https://jhnfrlgodpvdhvndpoam.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpobmZybGdvZHB2ZGh2bmRwb2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzOTE1ODIsImV4cCI6MjA4Nzk2NzU4Mn0.ta_8NX0MEcu1CxIpPdQmemDav4j53L_QVC0rxog0anI';

const supa = {
  async query(table, method = 'GET', body = null, filters = '') {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}${filters}`, {
      method,
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : '',
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!res.ok) { const e = await res.text(); console.error('Supabase error:', e); return null; }
    return method === 'DELETE' ? true : res.json();
  },

  async saveStudent(data)      { return this.query('students', 'POST', data); },
  async savePayment(data)      { return this.query('payments', 'POST', data); },
  async saveConsultation(data) { return this.query('consultations', 'POST', data); },
  async getStudentByEmail(email) {
    return this.query('students', 'GET', null, `?email=eq.${encodeURIComponent(email)}&limit=1`);
  },
  async updatePaymentStatus(paymentId, status) {
    return this.query('payments', 'PATCH', { status }, `?razorpay_payment_id=eq.${paymentId}`);
  },
};

// ── Hook into existing Registration form ──
(function patchRegisterForm() {
  // Wait for DOM
  document.addEventListener('DOMContentLoaded', () => {
    // Find the register form submit button (works with your existing openM modal system)
    const origRegister = window.submitRegister;
    window.submitRegister = async function(...args) {
      // Call original function if exists
      if (typeof origRegister === 'function') origRegister(...args);

      // Also save to Supabase
      const firstName = document.getElementById('reg-fname')?.value
                     || document.getElementById('regFirstName')?.value || '';
      const lastName  = document.getElementById('reg-lname')?.value
                     || document.getElementById('regLastName')?.value || '';
      const email     = document.getElementById('reg-email')?.value
                     || document.getElementById('regEmail')?.value || '';
      const phone     = document.getElementById('reg-phone')?.value
                     || document.getElementById('regPhone')?.value || '';
      const city      = document.getElementById('reg-city')?.value
                     || document.getElementById('regCity')?.value || '';
      const interest  = document.getElementById('reg-interest')?.value
                     || document.getElementById('regInterest')?.value || '';

      if (email) {
        await supa.saveStudent({ first_name: firstName, last_name: lastName, email, phone, city, course_interest: interest });
        console.log('✅ Student saved to Supabase');
      }
    };

    // Hook consultation form
    const origConsult = window.submitConsultation;
    window.submitConsultation = async function(...args) {
      if (typeof origConsult === 'function') origConsult(...args);

      const name   = document.getElementById('consult-name')?.value
                  || document.querySelector('[name="consultName"]')?.value || '';
      const phone  = document.getElementById('consult-phone')?.value
                  || document.querySelector('[name="consultPhone"]')?.value || '';
      const email  = document.getElementById('consult-email')?.value
                  || document.querySelector('[name="consultEmail"]')?.value || '';
      const dob    = document.getElementById('consult-dob')?.value || '';
      const tob    = document.getElementById('consult-tob')?.value || '';
      const pob    = document.getElementById('consult-pob')?.value || '';
      const q      = document.getElementById('consult-q')?.value || '';

      if (name) {
        await supa.saveConsultation({ full_name: name, phone, email, dob, tob, place_of_birth: pob, question: q });
        console.log('✅ Consultation saved to Supabase');
      }
    };
  });
})();

// ── Expose globally so payment.html can use it ──
window.supaDB = supa;
