/* admin.html → सूत्रधार आमंत्रण: send the private invite page (sutradhar-invite.html?n=<name>)
   and its five image cards on WhatsApp. Everything runs in the browser; nothing is stored. */
(function () {
  const SITE = 'https://shriramjiastro.in/';
  const CARDS = [1, 2, 3, 4, 5].map(i => `assets/sutradhar-invite/card${i}.jpg`);
  const $ = id => document.getElementById(id);

  function link() {
    const n = ($('inv-name').value || '').trim();
    return SITE + 'sutradhar-invite.html' + (n ? '?n=' + encodeURIComponent(n) : '');
  }

  function message() {
    const n = ($('inv-name').value || '').trim();
    const hi = n ? (/\sजी$/.test(n) ? n : n + ' जी') : '';
    return `🙏 ${hi ? 'नमस्ते ' + hi + ',' : 'नमस्ते,'}

आपके लिए एक अवसर है — घर बैठे, अपने समय पर, बिना कोई पैसा लगाए एक अतिरिक्त कमाई।
ज्योतिष का ज्ञान ज़रूरी नहीं, कोई टारगेट नहीं।

2 मिनट में पूरी बात यहाँ समझिए 👇
${link()}

— श्री राम जी एस्ट्रो`;
  }

  let edited = false;
  function refresh() {
    if (!edited) $('inv-msg').value = message();
    $('inv-open').href = link().replace(SITE, '');
  }

  function status(t) { $('inv-status').textContent = t; }

  function phone() {
    const d = ($('inv-phone').value || '').replace(/\D/g, '');
    if (!d) return '';
    if (d.length === 10) return '91' + d;
    if (d.length === 12 && d.startsWith('91')) return d;
    return null;
  }

  async function files() {
    return Promise.all(CARDS.map(async (src, i) => {
      const b = await (await fetch(src, { cache: 'force-cache' })).blob();
      return new File([b], `sutradhar-${i + 1}.jpg`, { type: 'image/jpeg' });
    }));
  }

  function init() {
    if (!$('inv-msg')) return;
    $('inv-cards').innerHTML = CARDS.map((src, i) =>
      `<a href="${src}" download="sutradhar-${i + 1}.jpg" title="डाउनलोड"><img src="${src}" alt="कार्ड ${i + 1}" loading="lazy"><span>${i + 1}</span></a>`).join('');
    refresh();
    $('inv-name').addEventListener('input', refresh);
    $('inv-msg').addEventListener('input', () => { edited = true; });

    $('inv-send').addEventListener('click', () => {
      const p = phone();
      if (p === null) { status('नंबर सही नहीं लगा — 10 अंकों का मोबाइल डालें।'); return; }
      if (edited && !$('inv-msg').value.includes('sutradhar-invite.html')) {
        if (!confirm('संदेश में आमंत्रण का लिंक नहीं है। फिर भी भेजें?')) return;
      }
      const url = 'https://wa.me/' + p + '?text=' + encodeURIComponent($('inv-msg').value);
      window.open(url, '_blank', 'noopener');
      status('WhatsApp खुल गया — वहाँ Send दबाएँ।');
    });

    $('inv-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('inv-msg').value); status('✓ संदेश कॉपी हो गया।'); }
      catch (e) { $('inv-msg').select(); status('चुन लिया है — Ctrl/⌘+C दबाएँ।'); }
    });

    $('inv-share-imgs').addEventListener('click', async () => {
      try {
        const f = await files();
        if (navigator.canShare && navigator.canShare({ files: f })) {
          await navigator.share({ files: f, text: $('inv-msg').value });
          status('✓ शेयर हो गया।');
        } else {
          status('यह ब्राउज़र एक साथ तस्वीरें शेयर नहीं कर सकता — "सभी डाउनलोड" दबाएँ।');
        }
      } catch (e) { if (e && e.name !== 'AbortError') status('शेयर नहीं हो सका: ' + (e.message || e)); }
    });

    $('inv-dl-imgs').addEventListener('click', async () => {
      const f = await files();
      f.forEach((file, i) => setTimeout(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      }, i * 350));
      status('पाँचों तस्वीरें डाउनलोड हो रही हैं।');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
