/* SHRI RAMJI ASTRO — 1-YEAR VEDIC IMMERSION BATCH INVITATION POPUP
   Dual Cohort Architecture:
   1. The Global Eleven: 11 Scholars Worldwide, Strictly 1 Seat Per Nation ($1,111 USD), 100% in English.
   2. Indian Classical Batch: Classical BPHS Curriculum in Hindi (₹24,000 INR), 11 seats.
   Classes Commence: March 11, 2027.
*/
(function () {
  if (window.__sraCoursePopup) return;
  window.__sraCoursePopup = true;

  var KEY = 'sra_course_popup_day';
  var today = new Date().toISOString().slice(0, 10);
  try { if (localStorage.getItem(KEY) === today) return; } catch (e) {}
  if (/[?&]nopopup=1/.test(location.search)) return;

  var LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var API = (LOCAL ? '' : (window.SRA_API_BASE || 'https://sra-canonical-engine.onrender.com')) + '/api/sutradhar/course';
  var FALLBACK = {
    start_date: '2027-03-11', registration_opens: '2026-11-20', registration_open: true,
    price_global_usd: 1111, price_global_inr: 94600, price_indian_inr: 24000,
    batches: [
      { id: 'batch_global_eleven', name: 'The Global Eleven (इंटरनेशनल बैच)', name_en: 'The Global Eleven (1-Year Immersion)', seats: 11, left: 11, full: false, price_usd: 1111, price: 94600 },
      { id: 'batch_indian', name: 'भारतीय शास्त्रीय वैदिक बैच', name_en: 'Indian Classical Vedic Batch', seats: 11, left: 11, full: false, price_usd: 451, price: 24000 }
    ]
  };

  var css = '' +
    '.sra-cbp{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",serif}' +
    '.sra-cbp-box{background:linear-gradient(145deg,#ffffff 0%,#faf8f5 60%,#f4efe6 100%);color:#0f172a;width:100%;max-width:540px;max-height:92vh;overflow:auto;border-radius:16px;box-shadow:0 25px 60px rgba(0,0,0,.35);padding:26px 26px 20px;position:relative;border:2px solid rgba(184,134,11,.35)}' +
    '.sra-cbp-x{position:absolute;top:12px;right:14px;border:0;background:none;font-size:24px;line-height:1;color:#64748b;cursor:pointer;padding:4px 8px;transition:color .2s}' +
    '.sra-cbp-x:hover{color:#0f172a}' +
    '.sra-cbp-crest{text-align:center;margin-bottom:8px}' +
    '.sra-cbp-crest span{display:inline-block;padding:4px 14px;border-radius:30px;background:rgba(184,134,11,.12);border:1px solid #b8860b;color:#78520a;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase}' +
    '.sra-cbp h3{margin:4px 0 6px;font-family:"Georgia",serif;font-size:22px;line-height:1.3;color:#0f172a;text-align:center;font-weight:900}' +
    '.sra-cbp-sub{font-size:13.5px;color:#475569;margin:0 auto 16px;line-height:1.5;text-align:center;max-width:460px}' +
    '.sra-cbp-cards{display:grid;gap:12px;margin-bottom:14px}' +
    '.sra-cbp-card{background:#ffffff;border:1.5px solid rgba(184,134,11,.25);border-radius:12px;padding:14px 16px;box-shadow:0 4px 12px rgba(0,0,0,.03);transition:all .2s;position:relative}' +
    '.sra-cbp-card.featured{border:2px solid #b8860b;background:linear-gradient(180deg,#ffffff 0%,#fbf9f4 100%);box-shadow:0 6px 18px rgba(184,134,11,.15)}' +
    '.sra-cbp-tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}' +
    '.sra-cbp-tag.gold{background:#926c15;color:#fff}' +
    '.sra-cbp-tag.maroon{background:#7c1305;color:#fff}' +
    '.sra-cbp-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}' +
    '.sra-cbp-title{font-family:"Georgia",serif;font-size:17px;font-weight:800;color:#0f172a}' +
    '.sra-cbp-price{font-family:"Georgia",serif;font-size:19px;font-weight:900;color:#926c15}' +
    '.sra-cbp-flags{font-size:15px;letter-spacing:3px;margin:3px 0 6px}' +
    '.sra-cbp-desc{font-size:12.5px;color:#475569;line-height:1.45;margin-bottom:10px}' +
    '.sra-cbp-act{display:flex;justify-content:space-between;align-items:center;border-top:1px dashed rgba(184,134,11,.25);padding-top:10px}' +
    '.sra-cbp-meta{font-size:11.5px;font-weight:700;color:#78520a}' +
    '.sra-cbp-btn{display:inline-block;border:0;border-radius:8px;background:#926c15;color:#fff !important;font-weight:800;font-size:13px;padding:8px 14px;text-decoration:none;cursor:pointer;white-space:nowrap;box-shadow:0 3px 8px rgba(146,108,21,.25);transition:all .2s}' +
    '.sra-cbp-btn:hover{background:#78520a;transform:translateY(-1px)}' +
    '.sra-cbp-btn.secondary{background:#7c1305;box-shadow:0 3px 8px rgba(124,19,5,.25)}' +
    '.sra-cbp-btn.secondary:hover{background:#5a0d03}' +
    '.sra-cbp-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px}' +
    '.sra-cbp-foot a{color:#926c15;font-weight:700;text-decoration:none}' +
    '.sra-cbp-foot a:hover{text-decoration:underline}' +
    '.sra-cbp-later{border:0;background:none;color:#64748b;cursor:pointer;font-size:12px;font-weight:600}';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function close(el) {
    try { localStorage.setItem(KEY, today); } catch (e) {}
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function render(d) {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var el = document.createElement('div');
    el.className = 'sra-cbp';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '1-Year Classical Vedic Immersion — Cohort Admissions');

    el.innerHTML = '<div class="sra-cbp-box">' +
      '<button class="sra-cbp-x" aria-label="Close">✕</button>' +
      '<div class="sra-cbp-crest"><span>Classical Jyotish · BPHS · March 11, 2027</span></div>' +
      '<h3>Admissions Protocol 2027–2028</h3>' +
      '<p class="sra-cbp-sub">Comprehensive 1-Year Classical Vedic Astrology Immersion with Astro Raamji. Select your sovereign cohort below:</p>' +
      
      '<div class="sra-cbp-cards">' +
        // Card 1: The Global Eleven
        '<div class="sra-cbp-card featured">' +
          '<div class="sra-cbp-head">' +
            '<div>' +
              '<span class="sra-cbp-tag gold">Worldwide Sovereign Immersion</span>' +
              '<div class="sra-cbp-title">The Global Eleven (2027)</div>' +
            '</div>' +
            '<div class="sra-cbp-price">$1,111 <span style="font-size:11px;font-weight:600;color:#64748b;">USD</span></div>' +
          '</div>' +
          '<div class="sra-cbp-flags">🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇩🇪 🇫🇷 🇪🇸 🇷🇺 🇦🇪 🇸🇬 🇯🇵</div>' +
          '<div class="sra-cbp-desc">100% in English • Strictly 11 Scholars Worldwide • <strong>Exactly 1 Seat Per Sovereign Nation</strong> (First-Come First-Served) • 48 Live Masterclasses • D1 to D60 Mastery.</div>' +
          '<div class="sra-cbp-act">' +
            '<div class="sra-cbp-meta">Seats: 11 Sovereign Spots</div>' +
            '<a class="sra-cbp-btn" href="payment.html?plan=global_eleven&batch=batch_global_eleven&cur=usd">Apply for Sovereign Seat ➔</a>' +
          '</div>' +
        '</div>' +

        // Card 2: Indian Classical Batch
        '<div class="sra-cbp-card">' +
          '<div class="sra-cbp-head">' +
            '<div>' +
              '<span class="sra-cbp-tag maroon">National Classical Cohort</span>' +
              '<div class="sra-cbp-title">भारतीय शास्त्रीय वैदिक बैच</div>' +
            '</div>' +
            '<div class="sra-cbp-price">₹24,000 <span style="font-size:11px;font-weight:600;color:#64748b;">INR</span></div>' +
          '</div>' +
          '<div class="sra-cbp-desc">हिंदी व संस्कृत माध्यम • 48 लाइव कक्षाएं • बृहत्पाराशरहोराशास्त्रम् संपूर्ण अध्ययन • आधिकारिक प्रमाण पत्र • EMI उपलब्ध (₹1,000/माह से)।</div>' +
          '<div class="sra-cbp-act">' +
            '<div class="sra-cbp-meta">सीमित 11 सीटें (National Batch)</div>' +
            '<a class="sra-cbp-btn secondary" href="payment.html?plan=course&batch=batch_indian">भारतीय बैच जॉइन करें ➔</a>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="sra-cbp-foot">' +
        '<a href="course.html?cur=usd">View Full Syllabus & Faculty ➔</a>' +
        '<button class="sra-cbp-later">Decide Later</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('.sra-cbp-x') || e.target.closest('.sra-cbp-later')) close(el);
    });
    document.addEventListener('keydown', function onEsc(e) { if (e.key === 'Escape') { close(el); document.removeEventListener('keydown', onEsc); } });
  }

  function loginWindowOpen() {
    return !!document.querySelector('.sra-auth-overlay.is-open, .sra-welcome.is-open, .sra-auth-modal.is-open');
  }

  function start() {
    var tries = 0;
    (function wait() {
      if (loginWindowOpen() && tries++ < 60) { setTimeout(wait, 2000); return; }
      if (loginWindowOpen()) return;
      fetch(API + '/batches').then(function (r) { return r.json(); }).then(render).catch(function () { render(FALLBACK); });
    })();
  }
  window.addEventListener('load', function () { setTimeout(start, 4000); });
})();
