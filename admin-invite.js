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

  function promptOnlyHindi(name) {
    const n = (name || '').trim();
    const hi = n ? (/\sजी$/.test(n) ? n : n + ' जी') : '';
    return `🙏 ${hi ? 'नमस्ते ' + hi + ',' : 'नमस्ते,'}

आप श्री राम जी एस्ट्रो (shriramjiastro.in) से कितना कमा सकते हैं? 
आप नीचे दिए गए प्रॉम्प्ट को चला करके अपने किसी भी गूगल एआई (Google Gemini) या चैटजीपीटी (ChatGPT) पे डाल करके समझ सकते हैं:

━━━━━━━━━━━━━━━━━━━━━
👇 [AI Earning Prompt — इसे कॉपी करके AI में डालें]:
"मैं 'श्री राम जी एस्ट्रो (shriramjiastro.in)' का अधिकृत सूत्रधार बनने जा रहा हूँ।
प्लेटफॉर्म पर सेवाएं GST (18%) सहित हैं और मेरी तय दक्षिणा (कमीशन) इस प्रकार है:
- लघु रिपोर्ट (₹501): मेरी कमाई ₹280 (66%)
- BPHS मेगा पाराशर / गुण मिलान (₹1,111 / ₹1,101): मेरी कमाई ₹621 / ₹615 (66%)
- विवाह मुहूर्त (₹2,100): मेरी कमाई ₹1,174 (66%)
- ज्योतिषी SaaS नया (₹5,100): मेरी कमाई ₹2,852 (प्रथम वर्ष 66%)
- ज्योतिषी SaaS वार्षिक रिन्यूअल (₹5,100): मेरी कमाई ₹1,296 (दूसरे वर्ष से 30%)
- ज्योतिषी SaaS मासिक (₹499/माह): मेरी कमाई ₹126 हर माह, पहले 12 महीने (30%)
- १-वर्षीय गुरुकुल कोर्स (₹24,000): मेरी कमाई ₹6,101 (30%)

कृपया विश्लेषण करें:
1. मेरी मासिक संभावित कमाई (पार्ट-टाइम 15-20 रिपोर्ट, एक्टिव 40-50 रिपोर्ट, और टॉप परफॉर्मर)।
2. मेरे द्वारा जोड़े गए ज्योतिषियों के वार्षिक ₹5,100 रिन्यूअल से मिलने वाली ₹1,296 की पैसिव इनकम 2 साल में मेरी मासिक आय को कैसे स्थिर बनाएगी?
3. नासा JPL DE431 आधारित शुद्ध गणना वाले प्लेटफॉर्म से जुड़कर 1 से 3 साल में मेरा करियर और वित्तीय भविष्य क्या हो सकता है?"
━━━━━━━━━━━━━━━━━━━━━

— श्री राम जी एस्ट्रो (shriramjiastro.in)`;
  }

  function promptOnlyEnglish(name) {
    const n = (name || '').trim();
    const hi = n ? (/\sजी$/.test(n) ? n : n + ' Ji') : '';
    return `🙏 ${hi ? 'Hello ' + hi + ',' : 'Hello,'}

How much can you earn monthly from Shri Ramji Astro (shriramjiastro.in)? 
You can run the prompt below in Google Gemini, ChatGPT or any AI to calculate and understand your earnings potential:

━━━━━━━━━━━━━━━━━━━━━
👇 [AI Earning Prompt — Copy & Paste into AI]:
"I am joining 'Shri Ramji Astro (shriramjiastro.in)' as an Authorized Sutradhar.
The customer prices (including 18% GST) and my fixed earnings/commissions are:
- Small Reports (₹501): My earning is ₹280 (66%)
- BPHS Mega Parashara / Gun Milan (₹1,111 / ₹1,101): My earning is ₹621 / ₹615 (66%)
- Vivah Muhurta (₹2,100): My earning is ₹1,174 (66%)
- Astrologer SaaS New (₹5,100): My earning is ₹2,852 (Year 1: 66%)
- Astrologer SaaS Annual Renewal (₹5,100): My earning is ₹1,296 (Year 2 onwards: 30%)
- Astrologer SaaS Monthly (₹499/month): My earning is ₹126 a month for the first 12 months (30%)
- 1-Year Gurukul Course (₹24,000): My earning is ₹6,101 (30%)

Please calculate:
1. My monthly earnings potential (Part-time: 15-20 reports, Full-time: 40-50 reports, Top performer).
2. How the recurring passive income of ₹1,296 per annual renewal will compound my monthly income over 2 years.
3. My 1-to-3-year financial and career outlook working with a platform powered by NASA JPL DE431 ephemeris."
━━━━━━━━━━━━━━━━━━━━━

— Shri Ramji Astro (shriramjiastro.in)`;
  }

  function promptMessageHindi(name) {
    const n = (name || '').trim();
    const hi = n ? (/\sजी$/.test(n) ? n : n + ' जी') : '';
    const lk = linkFor(n);
    return `🙏 ${hi ? 'नमस्ते ' + hi + ',' : 'नमस्ते,'}

आप श्री राम जी एस्ट्रो (shriramjiastro.in) से कितना कमा सकते हैं? 
आप नीचे दिए गए प्रॉम्प्ट को कॉपी करके Google Gemini या ChatGPT पर डालकर खुद लाइव समझ सकते हैं:

━━━━━━━━━━━━━━━━━━━━━
👇 [AI Earning Prompt — इसे कॉपी करके AI में डालें]:
"मैं 'श्री राम जी एस्ट्रो (shriramjiastro.in)' का अधिकृत सूत्रधार बनने जा रहा हूँ।
प्लेटफॉर्म पर सेवाएं GST (18%) सहित हैं और मेरी तय दक्षिणा (कमीशन) इस प्रकार है:
- लघु रिपोर्ट (₹501): मेरी कमाई ₹280 (66%)
- BPHS मेगा पाराशर / गुण मिलान (₹1,111 / ₹1,101): मेरी कमाई ₹621 / ₹615 (66%)
- विवाह मुहूर्त (₹2,100): मेरी कमाई ₹1,174 (66%)
- ज्योतिषी SaaS नया (₹5,100): मेरी कमाई ₹2,852 (प्रथम वर्ष 66%)
- ज्योतिषी SaaS वार्षिक रिन्यूअल (₹5,100): मेरी कमाई ₹1,296 (दूसरे वर्ष से 30%)
- ज्योतिषी SaaS मासिक (₹499/माह): मेरी कमाई ₹126 हर माह, पहले 12 महीने (30%)
- १-वर्षीय गुरुकुल कोर्स (₹24,000): मेरी कमाई ₹6,101 (30%)

कृपया विश्लेषण करें:
1. मेरी मासिक संभावित कमाई (पार्ट-टाइम 15-20 रिपोर्ट, एक्टिव 40-50 रिपोर्ट, और टॉप परफॉर्मर)।
2. मेरे द्वारा जोड़े गए ज्योतिषियों के वार्षिक ₹5,100 रिन्यूअल से मिलने वाली ₹1,296 की पैसिव इनकम 2 साल में मेरी मासिक आय को कैसे स्थिर बनाएगी?
3. नासा JPL DE431 आधारित शुद्ध गणना वाले प्लेटफॉर्म से जुड़कर 1 से 3 साल में मेरा करियर और वित्तीय भविष्य क्या हो सकता है?"
━━━━━━━━━━━━━━━━━━━━━

घर बैठे, अपने समय पर, बिना कोई पैसा लगाए — 2 मिनट में पूरी बात यहाँ समझिए और जुड़िए 👇
${lk}

— श्री राम जी एस्ट्रो`;
  }

  function promptMessageEnglish(name) {
    const n = (name || '').trim();
    const hi = n ? (/\sजी$/.test(n) ? n : n + ' Ji') : '';
    const lk = linkFor(n);
    return `🙏 ${hi ? 'Hello ' + hi + ',' : 'Hello,'}

How much can you earn monthly from Shri Ramji Astro (shriramjiastro.in)? 
You can copy the prompt below and run it in Google Gemini or ChatGPT to calculate and understand your earnings potential:

━━━━━━━━━━━━━━━━━━━━━
👇 [AI Earning Prompt — Copy & Paste into AI]:
"I am joining 'Shri Ramji Astro (shriramjiastro.in)' as an Authorized Sutradhar.
The customer prices (including 18% GST) and my fixed earnings/commissions are:
- Small Reports (₹501): My earning is ₹280 (66%)
- BPHS Mega Parashara / Gun Milan (₹1,111 / ₹1,101): My earning is ₹621 / ₹615 (66%)
- Vivah Muhurta (₹2,100): My earning is ₹1,174 (66%)
- Astrologer SaaS New (₹5,100): My earning is ₹2,852 (Year 1: 66%)
- Astrologer SaaS Annual Renewal (₹5,100): My earning is ₹1,296 (Year 2 onwards: 30%)
- Astrologer SaaS Monthly (₹499/month): My earning is ₹126 a month for the first 12 months (30%)
- 1-Year Gurukul Course (₹24,000): My earning is ₹6,101 (30%)

Please calculate:
1. My monthly earnings potential (Part-time: 15-20 reports, Full-time: 40-50 reports, Top performer).
2. How the recurring passive income of ₹1,296 per annual renewal will compound my monthly income over 2 years.
3. My 1-to-3-year financial and career outlook working with a platform powered by NASA JPL DE431 ephemeris."
━━━━━━━━━━━━━━━━━━━━━

Work from home in your own time with zero investment. See full details & join here 👇
${lk}

— Shri Ramji Astro`;
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
      `<a href="${src}" download="sutradhar-${i + 1}.jpg" title="Download"><img src="${src}" alt="Card ${i + 1}" loading="lazy"><span>${i + 1}</span></a>`).join('');
    refresh();
    $('inv-name').addEventListener('input', refresh);
    $('inv-msg').addEventListener('input', () => { edited = true; });

    $('inv-send').addEventListener('click', () => {
      const p = phone();
      if (p === null) { status('That number looks wrong — enter a 10-digit mobile.'); return; }
      if (edited && !$('inv-msg').value.includes('sutradhar-invite.html')) {
        if (!confirm('The message has no invite link. Send anyway?')) return;
      }
      const url = 'https://wa.me/' + p + '?text=' + encodeURIComponent($('inv-msg').value);
      window.open(url, '_blank', 'noopener');
      status('WhatsApp opened — press Send there.');
    });

    $('inv-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('inv-msg').value); status('Message copied.'); }
      catch (e) { $('inv-msg').select(); status('Selected — press Ctrl/⌘+C.'); }
    });

    $('inv-share-imgs').addEventListener('click', async () => {
      try {
        const f = await files();
        if (navigator.canShare && navigator.canShare({ files: f })) {
          await navigator.share({ files: f, text: $('inv-msg').value });
          status('Shared.');
        } else {
          status('This browser cannot share pictures together — press "Download all".');
        }
      } catch (e) { if (e && e.name !== 'AbortError') status('Could not share: ' + (e.message || e)); }
    });

    $('inv-dl-imgs').addEventListener('click', async () => {
      const f = await files();
      f.forEach((file, i) => setTimeout(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      }, i * 350));
      status('Downloading all five pictures.');
    });

    const sendPrompt = (lang) => {
      const p = phone();
      if (p === null) { status('That number looks wrong — enter a 10-digit mobile.'); return; }
      const n = ($('inv-name').value || '').trim();
      const txt = lang === 'en' ? promptOnlyEnglish(n) : promptOnlyHindi(n);
      $('inv-msg').value = txt;
      edited = true;
      const url = 'https://wa.me/' + p + '?text=' + encodeURIComponent(txt);
      window.open(url, '_blank', 'noopener');
      status(`WhatsApp opened with ${lang === 'en' ? 'English' : 'Hindi'} AI Prompt.`);
    };

    const copyPrompt = async (lang) => {
      const n = ($('inv-name').value || '').trim();
      const txt = lang === 'en' ? promptOnlyEnglish(n) : promptOnlyHindi(n);
      $('inv-msg').value = txt;
      edited = true;
      try { await navigator.clipboard.writeText(txt); status(`Copied ${lang === 'en' ? 'English' : 'Hindi'} AI prompt.`); }
      catch (e) { $('inv-msg').select(); status('Selected — press Ctrl/⌘+C.'); }
    };

    if ($('inv-send-prompt-hi')) $('inv-send-prompt-hi').addEventListener('click', () => sendPrompt('hi'));
    if ($('inv-send-prompt-en')) $('inv-send-prompt-en').addEventListener('click', () => sendPrompt('en'));
    if ($('inv-copy-prompt-hi')) $('inv-copy-prompt-hi').addEventListener('click', () => copyPrompt('hi'));
    if ($('inv-copy-prompt-en')) $('inv-copy-prompt-en').addEventListener('click', () => copyPrompt('en'));
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
    box.innerHTML = `<div style="background:var(--card,#fff);color:var(--text,#222);border-radius:14px;max-width:540px;width:100%;max-height:92vh;overflow:auto;padding:18px 18px 14px;box-shadow:0 20px 60px rgba(0,0,0,.4);font-size:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:16px">💌 ${name ? name.replace(/[<>&"]/g, '') + '' : ''} — Send Invite / AI Prompt</b>
        <button type="button" data-x style="border:0;background:none;font-size:22px;cursor:pointer;color:inherit">×</button></div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:10px">${CARDS.map(c => `<img src="${c}" style="width:100%;border-radius:6px">`).join('')}</div>
      <textarea data-msg rows="8" style="width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--card,#fff);color:inherit;font:inherit;font-size:13px"></textarea>
      
      <div style="display:grid;gap:8px;margin-top:10px">
        <div style="font-size:12px;font-weight:700;color:var(--text);margin-top:2px;">१. इनवाइट भेजें (Invite Links):</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <button type="button" data-share style="background:#16a34a;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;font-size:12.5px">Pictures + Invite link</button>
          <button type="button" data-wa style="background:#fff;color:#15803d;border:1.5px solid #16a34a;border-radius:8px;padding:9px;font-weight:700;cursor:pointer;font-size:12.5px" ${wa ? '' : 'disabled'}>Invite link only</button>
        </div>

        <div style="font-size:12px;font-weight:700;color:var(--text);margin-top:4px;">२. केवल AI कमाई प्रॉम्प्ट भेजें (Separate AI Prompt):</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <button type="button" data-prompt-hi style="background:#2563eb;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;font-size:12.5px" title="Send pure AI Prompt on WhatsApp">WhatsApp प्रॉम्प्ट (हिंदी)</button>
          <button type="button" data-prompt-en style="background:#0284c7;color:#fff;border:0;border-radius:8px;padding:10px;font-weight:700;cursor:pointer;font-size:12.5px" title="Send pure AI Prompt in English on WhatsApp">WhatsApp Prompt (English)</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:2px;">
          <button type="button" data-copy style="background:none;border:1px solid var(--border,#ddd);color:inherit;border-radius:8px;padding:7px;cursor:pointer;font-size:11.5px">Copy invite link</button>
          <button type="button" data-copy-prompt-hi style="background:none;border:1px solid var(--border,#ddd);color:inherit;border-radius:8px;padding:7px;cursor:pointer;font-size:11.5px">Copy प्रॉम्प्ट (हि)</button>
          <button type="button" data-copy-prompt-en style="background:none;border:1px solid var(--border,#ddd);color:inherit;border-radius:8px;padding:7px;cursor:pointer;font-size:11.5px">Copy Prompt (En)</button>
        </div>
      </div>
      <div data-st style="font-size:12px;opacity:.8;min-height:16px;margin-top:8px"></div>
      <div style="font-size:11.5px;opacity:.7;margin-top:4px">"Pictures + Invite" opens the phone share sheet. "WhatsApp प्रॉम्प्ट" opens WhatsApp with only the earnings prompt for the candidate to run in Gemini / ChatGPT.</div>
    </div>`;
    document.body.appendChild(box);
    const q = sel => box.querySelector(sel);
    const st = t => { q('[data-st]').textContent = t; };
    q('[data-msg]').value = approvedMessage(name);
    const close = () => box.remove();
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-x]')) close(); });
    const openWa = () => window.open((wa ? 'https://wa.me/' + wa : 'https://wa.me/') + '?text=' + encodeURIComponent(q('[data-msg]').value), '_blank', 'noopener');
    q('[data-wa]').addEventListener('click', () => { q('[data-msg]').value = approvedMessage(name); openWa(); st('WhatsApp opened with invite link.'); });
    q('[data-prompt-hi]').addEventListener('click', () => {
      q('[data-msg]').value = promptOnlyHindi(name);
      openWa();
      st('WhatsApp opened with Hindi AI Prompt.');
    });
    q('[data-prompt-en]').addEventListener('click', () => {
      q('[data-msg]').value = promptOnlyEnglish(name);
      openWa();
      st('WhatsApp opened with English AI Prompt.');
    });
    q('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(linkFor(name)); st('Invite link copied.'); } catch (e) { st(linkFor(name)); }
    });
    q('[data-copy-prompt-hi]').addEventListener('click', async () => {
      const txt = promptOnlyHindi(name);
      q('[data-msg]').value = txt;
      try { await navigator.clipboard.writeText(txt); st('Hindi AI prompt copied.'); } catch (e) { st('Could not copy.'); }
    });
    q('[data-copy-prompt-en]').addEventListener('click', async () => {
      const txt = promptOnlyEnglish(name);
      q('[data-msg]').value = txt;
      try { await navigator.clipboard.writeText(txt); st('English AI prompt copied.'); } catch (e) { st('Could not copy.'); }
    });
    q('[data-share]').addEventListener('click', async () => {
      st('Preparing pictures…');
      let f;
      try { f = await files(); } catch (e) { st('Pictures not found: ' + (e.message || e)); return; }
      if (navigator.canShare && navigator.canShare({ files: f })) {
        try { await navigator.share({ files: f, text: q('[data-msg]').value }); st('Sent.'); }
        catch (e) { st(e && e.name === 'AbortError' ? 'Cancelled.' : 'Could not share: ' + (e.message || e)); }
        return;
      }
      f.forEach((file, i) => setTimeout(() => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      }, i * 350));
      setTimeout(openWa, 2000);
      st('Downloading pictures; WhatsApp will open — add the pictures with the message.');
    });
  }

  window.SRAInvite = { openSend, linkFor, approvedMessage, promptOnlyHindi, promptOnlyEnglish, promptMessageHindi, promptMessageEnglish };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
