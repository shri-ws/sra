/* SHRI RAMJI ASTRO — 1-YEAR COURSE BATCH POPUP (main page)
   Two batches (morning / evening), 11 seats each, classes from 11 March 2027.
   Before 26 Dec 2026: registration notice + "tell me when it opens" form (/api/sutradhar/course/interest).
   From 26 Dec: seats left per batch, and a button to payment.html?plan=course&batch=<id>.
   The seat limit itself is enforced on the server when the order is created.
   Shown at most once a day, and never on top of the login/welcome window. */
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
    start_date: '2027-03-11', registration_opens: '2026-12-26', registration_open: false, price: 24000,
    batches: [{ id: 'batch_morning', name: 'फ़ाउंडेशन एस्ट्रोलॉजिकल बैच', seats: 11, left: 11, full: false },
              { id: 'batch_evening', name: 'मास्टर एस्ट्रोलॉजिकल बैच (रिसर्च — पहले से ज्योतिष का ज्ञान आवश्यक)', seats: 11, left: 11, full: false }]
  };

  var css = '' +
    '.sra-cbp{position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}' +
    '.sra-cbp-box{background:#fff;color:#111827;width:100%;max-width:440px;max-height:92vh;overflow:auto;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.25);padding:22px 22px 18px;position:relative}' +
    '.sra-cbp-x{position:absolute;top:10px;right:12px;border:0;background:none;font-size:22px;line-height:1;color:#6b7280;cursor:pointer;padding:4px 8px}' +
    '.sra-cbp h3{margin:0 0 4px;font-size:20px;line-height:1.35;color:#7c1305}' +
    '.sra-cbp-sub{font-size:14px;color:#4b5563;margin:0 0 14px;line-height:1.5}' +
    '.sra-cbp-b{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:10px}' +
    '.sra-cbp-b strong{display:block;font-size:16px}' +
    '.sra-cbp-b span{font-size:13px;color:#6b7280}' +
    '.sra-cbp-left{font-weight:700;color:#7c1305;white-space:nowrap;font-size:14px}' +
    '.sra-cbp-btn{display:inline-block;border:0;border-radius:8px;background:#7c1305;color:#fff !important;font-weight:700;font-size:14px;padding:9px 14px;text-decoration:none;cursor:pointer;white-space:nowrap}' +
    '.sra-cbp-btn[disabled]{background:#9ca3af;cursor:not-allowed}' +
    '.sra-cbp-note{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:10px 12px;font-size:14px;margin:4px 0 12px;line-height:1.5}' +
    '.sra-cbp input,.sra-cbp select{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:15px;margin-bottom:8px;font-family:inherit;color:#111827;background:#fff}' +
    '.sra-cbp-msg{font-size:14px;margin-top:6px;min-height:18px}' +
    '.sra-cbp-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:13px}' +
    '.sra-cbp-foot a{color:#7c1305;font-weight:600}' +
    '.sra-cbp-later{border:0;background:none;color:#6b7280;cursor:pointer;font-size:13px}';

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
    el.setAttribute('aria-label', '1-वर्षीय ज्योतिष कोर्स — नए बैच');
    var batches = (d.batches || []).map(function (b) {
      var left = b.full ? 'सीटें भर गईं' : (b.left + ' / ' + b.seats + ' सीटें बचीं');
      var action = d.registration_open
        ? (b.full ? '<button class="sra-cbp-btn" disabled>भर गया</button>'
                  : '<a class="sra-cbp-btn" href="payment.html?plan=course&batch=' + esc(b.id) + '">सीट पक्की करें</a>')
        : '<span class="sra-cbp-left">' + esc(b.seats) + ' सीटें</span>';
      return '<div class="sra-cbp-b"><div><strong>' + esc(b.name) + '</strong><span>' +
        (d.registration_open ? esc(left) : 'केवल ' + esc(b.seats) + ' सीटें') + '</span></div>' + action + '</div>';
    }).join('');
    var form = d.registration_open ? '' :
      '<div class="sra-cbp-note">पंजीकरण <b>26 दिसंबर 2026</b> से शुरू होगा। अपना नाम और नंबर छोड़ दें — पंजीकरण खुलते ही हम WhatsApp पर बता देंगे।</div>' +
      '<input type="text" id="cbpName" placeholder="आपका नाम" autocomplete="name">' +
      '<input type="tel" id="cbpPhone" placeholder="मोबाइल नंबर (10 अंक)" maxlength="10" inputmode="numeric" autocomplete="tel">' +
      '<select id="cbpBatch"><option value="">कौन-सा बैच? (बाद में भी चुन सकते हैं)</option>' +
      (d.batches || []).map(function (b) { return '<option value="' + esc(b.id) + '">' + esc(b.name) + '</option>'; }).join('') + '</select>' +
      '<button class="sra-cbp-btn" id="cbpSend" style="width:100%;padding:11px;">मुझे बताएँ</button><div class="sra-cbp-msg" id="cbpMsg"></div>';
    el.innerHTML = '<div class="sra-cbp-box">' +
      '<button class="sra-cbp-x" aria-label="बंद करें">✕</button>' +
      '<h3>1-वर्षीय वैदिक ज्योतिष कोर्स — नए बैच</h3>' +
      '<p class="sra-cbp-sub">कक्षाएँ <b>11 मार्च 2027</b> से। दो बैच — फ़ाउंडेशन (शुरुआत से) और मास्टर (रिसर्च, पहले से ज्योतिष का ज्ञान आवश्यक), हर बैच में <b>केवल 11 सीटें</b>। शुल्क ₹' +
      Number(d.price || 24000).toLocaleString('en-IN') + ' (GST सहित), EMI उपलब्ध।</p>' +
      batches + form +
      '<div class="sra-cbp-foot"><a href="course.html">कोर्स की पूरी जानकारी</a><button class="sra-cbp-later">बाद में</button></div>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.closest('.sra-cbp-x') || e.target.closest('.sra-cbp-later')) close(el);
    });
    document.addEventListener('keydown', function onEsc(e) { if (e.key === 'Escape') { close(el); document.removeEventListener('keydown', onEsc); } });
    var phoneIn = el.querySelector('#cbpPhone');
    if (phoneIn) phoneIn.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 10); });
    var send = el.querySelector('#cbpSend');
    if (send) send.addEventListener('click', function () {
      var name = el.querySelector('#cbpName').value.trim();
      var phone = el.querySelector('#cbpPhone').value.trim();
      var msg = el.querySelector('#cbpMsg');
      if (name.length < 2 || phone.length !== 10) { msg.style.color = '#b91c1c'; msg.textContent = 'कृपया नाम और 10 अंकों का मोबाइल नंबर दें।'; return; }
      send.disabled = true;
      fetch(API + '/interest', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, phone: phone, batch_id: el.querySelector('#cbpBatch').value || null }) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          msg.style.color = x.ok ? '#15803d' : '#b91c1c';
          msg.textContent = x.ok ? (x.j.message || 'धन्यवाद! हम आपको बताएँगे।') : (x.j.detail || 'सेव नहीं हो सका, पुनः प्रयास करें।');
          if (x.ok) setTimeout(function () { close(el); }, 2200); else send.disabled = false;
        })
        .catch(function () { msg.style.color = '#b91c1c'; msg.textContent = 'नेटवर्क समस्या, पुनः प्रयास करें।'; send.disabled = false; });
    });
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
  window.addEventListener('load', function () { setTimeout(start, 5000); });
})();
