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

  // ── Send box used when a Careers application is approved (admin.html) ──
  // WhatsApp's wa.me link can carry only text, so images go through the phone's share sheet.
  function linkFor(name) {
    const n = (name || '').trim();
    return SITE + 'sutradhar-invite.html' + (n ? '?n=' + encodeURIComponent(n) : '');
  }
  function approvedMessage(name) {
    const n = (name || '').trim();
    const hi = n ? (/\sजी$/.test(n) ? n : n + ' जी') : 'जी';
    return `🙏 नमस्ते ${hi},

आपका सूत्रधार आवेदन स्वीकार हो गया है 🎉

घर बैठे, अपने समय पर, बिना कोई पैसा लगाए — 2 मिनट में पूरी बात यहाँ समझिए, फिर वहीं से जुड़ जाइए 👇
${linkFor(n)}

— श्री राम जी एस्ट्रो`;
  }

  function openSend(opts) {
    const name = (opts && opts.name) || '';
    const digits = String((opts && opts.phone) || '').replace(/\D/g, '');
    const wa = digits.length === 10 ? '91' + digits : (digits.length === 12 && digits.startsWith('91') ? digits : '');
    const old = document.getElementById('inv-send-box'); if (old) old.remove();
    const box = document.createElement('div');
    box.id = 'inv-send-box';
    box.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    box.innerHTML = `<div style="background:var(--card,#fff);color:var(--text,#222);border-radius:14px;max-width:520px;width:100%;max-height:92vh;overflow:auto;padding:18px 18px 14px;box-shadow:0 20px 60px rgba(0,0,0,.4);font-size:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:16px">💌 ${name ? name.replace(/[<>&"]/g, '') + ' जी को' : ''} आमंत्रण भेजें</b>
        <button type="button" data-x style="border:0;background:none;font-size:22px;cursor:pointer;color:inherit">×</button></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:10px">${CARDS.map(c => `<img src="${c}" style="width:100%;border-radius:6px">`).join('')}</div>
      <textarea data-msg rows="8" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--card,#fff);color:inherit;font:inherit;font-size:13px"></textarea>
      <div style="display:grid;gap:8px;margin-top:10px">
        <button type="button" data-share style="background:#16a34a;color:#fff;border:0;border-radius:8px;padding:11px;font-weight:700;cursor:pointer;font-size:14px">📤 तस्वीरें + संदेश एक साथ भेजें</button>
        <button type="button" data-wa style="background:#fff;color:#15803d;border:1.5px solid #16a34a;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;font-size:14px" ${wa ? '' : 'disabled'}>🟢 सिर्फ़ संदेश — सीधे ${wa ? '+' + wa : 'नंबर'} पर</button>
        <button type="button" data-copy style="background:none;border:1px solid var(--border,#ddd);color:inherit;border-radius:8px;padding:8px;cursor:pointer;font-size:13px">📋 लिंक कॉपी करें</button>
      </div>
      <div data-st style="font-size:12px;opacity:.8;min-height:16px;margin-top:8px"></div>
      <div style="font-size:11.5px;opacity:.7;margin-top:4px">"एक साथ भेजें" से फ़ोन का शेयर खुलता है — उसमें WhatsApp और फिर व्यक्ति चुनें; पाँचों तस्वीरें संदेश के साथ जाती हैं। कंप्यूटर पर यह न चले तो तस्वीरें डाउनलोड हो जाएँगी और WhatsApp उसी नंबर पर खुल जाएगा — वहाँ तस्वीरें खींचकर डाल दें।</div>
    </div>`;
    document.body.appendChild(box);
    const q = sel => box.querySelector(sel);
    const st = t => { q('[data-st]').textContent = t; };
    q('[data-msg]').value = approvedMessage(name);
    const close = () => box.remove();
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-x]')) close(); });
    const openWa = () => window.open((wa ? 'https://wa.me/' + wa : 'https://wa.me/') + '?text=' + encodeURIComponent(q('[data-msg]').value), '_blank', 'noopener');
    q('[data-wa]').addEventListener('click', () => { openWa(); st('WhatsApp खुल गया — वहाँ Send दबाएँ।'); });
    q('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(linkFor(name)); st('✓ लिंक कॉपी हो गया।'); } catch (e) { st(linkFor(name)); }
    });
    q('[data-share]').addEventListener('click', async () => {
      st('तस्वीरें तैयार हो रही हैं…');
      let f;
      try { f = await files(); } catch (e) { st('तस्वीरें नहीं मिलीं: ' + (e.message || e)); return; }
      if (navigator.canShare && navigator.canShare({ files: f })) {
        try { await navigator.share({ files: f, text: q('[data-msg]').value }); st('✓ भेज दिया।'); }
        catch (e) { st(e && e.name === 'AbortError' ? 'रद्द किया।' : 'शेयर नहीं हो सका: ' + (e.message || e)); }
        return;
      }
      f.forEach((file, i) => setTimeout(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      }, i * 350));
      setTimeout(openWa, 2000);
      st('तस्वीरें डाउनलोड हो रही हैं; WhatsApp खुलेगा — संदेश के साथ तस्वीरें भी डाल दें।');
    });
  }

  window.SRAInvite = { openSend, linkFor, approvedMessage };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
