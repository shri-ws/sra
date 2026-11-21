/* Sutradhar video tutorials — a story-style player that plays like a short video:
   real screenshots of the site, a smooth zoom to the part being explained, a glowing box and a tap
   mark on it, a caption, and the phone's own Hindi voice (speechSynthesis) reading the narration.
   Tap right = next, tap left = back, tap middle = pause. A short quiz ends every lesson.
   Lessons come from tutorial/lessons-hi.js (window.SRA_TUTOR_LESSONS).
   API: SRATutor.open(id), SRATutor.done() -> { id: time }, SRATutor.onChange(fn). */
(function () {
  if (window.SRATutor) return;
  const BASE = ((document.currentScript && document.currentScript.src) || '').replace(/player\.js(\?.*)?$/, '');
  const FW = 375, FH = 812;                      // frame the focus boxes are measured in
  const DONE_KEY = 'sra_tutor_done_v1', MUTE_KEY = 'sra_tutor_mute';
  const listeners = [];

  const css = `
  .tt-ov{position:fixed;inset:0;z-index:2147483000;background:#0b1220;display:flex;align-items:center;justify-content:center;font-family:'Noto Sans Devanagari',system-ui,sans-serif;-webkit-tap-highlight-color:transparent}
  .tt-stage{position:relative;height:min(100dvh,100vh);aspect-ratio:375/812;max-width:100vw;background:#111827;overflow:hidden;box-shadow:0 0 60px rgba(0,0,0,.5)}
  @media (min-width:700px){.tt-stage{height:94vh;border-radius:22px}}
  .tt-bars{position:absolute;top:10px;left:10px;right:10px;display:flex;gap:4px;z-index:6}
  .tt-bar{flex:1;height:3px;border-radius:3px;background:rgba(255,255,255,.3);overflow:hidden}
  .tt-bar i{display:block;height:100%;width:0;background:#fff}
  .tt-top{position:absolute;top:20px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:center;z-index:6;color:#fff}
  .tt-top b{font-size:13px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.6);max-width:65%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tt-btn{border:0;background:rgba(0,0,0,.35);color:#fff;border-radius:999px;height:34px;min-width:34px;padding:0 10px;font:600 13px/34px inherit;cursor:pointer}
  .tt-view{position:absolute;inset:0;overflow:hidden}
  .tt-shot{position:absolute;left:0;top:0;width:100%;height:100%;transform-origin:0 0;transition:transform 1.3s cubic-bezier(.45,.05,.25,1);will-change:transform}
  .tt-shot img{width:100%;height:100%;display:block;object-fit:cover;user-select:none;-webkit-user-drag:none}
  .tt-dim{position:absolute;inset:0;pointer-events:none;transition:opacity .6s ease}
  .tt-box{position:absolute;border:3px solid #22c55e;border-radius:12px;box-shadow:0 0 0 9999px rgba(15,23,42,.42),0 0 18px rgba(34,197,94,.9);opacity:0;transform:scale(1.15);transition:opacity .45s ease .55s,transform .45s cubic-bezier(.2,.9,.3,1.3) .55s;pointer-events:none}
  .tt-box.on{opacity:1;transform:scale(1)}
  .tt-box.on::after{content:'';position:absolute;inset:-8px;border:2px solid rgba(34,197,94,.8);border-radius:16px;animation:ttPulse 1.6s ease-out 1.1s infinite}
  .tt-tap{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(255,255,255,.95);box-shadow:0 2px 10px rgba(0,0,0,.35);opacity:0;pointer-events:none}
  .tt-tap.on{animation:ttTap 1.4s ease 1.2s 2}
  @keyframes ttPulse{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.18)}}
  @keyframes ttTap{0%{opacity:0;transform:scale(1.8)}30%{opacity:1;transform:scale(1)}55%{transform:scale(.8)}100%{opacity:0;transform:scale(1)}}
  .tt-cap{position:absolute;left:0;right:0;bottom:0;z-index:5;padding:60px 18px 26px;background:linear-gradient(transparent,rgba(2,6,23,.92) 45%);color:#fff;font-size:18px;line-height:1.5;font-weight:600}
  .tt-cap span{display:block;animation:ttUp .5s cubic-bezier(.2,.8,.2,1)}
  @keyframes ttUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .tt-title{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:32px;color:#fff;background:radial-gradient(circle at 30% 20%,#1d4ed8,#0b1220 70%)}
  .tt-title small{font-size:14px;opacity:.8;letter-spacing:.04em;animation:ttUp .6s ease}
  .tt-title h2{font-size:30px;line-height:1.35;margin:10px 0 14px;animation:ttUp .7s ease .1s both}
  .tt-title p{font-size:15px;opacity:.85;animation:ttUp .7s ease .25s both}
  .tt-wa{position:absolute;inset:0;background:#efeae2;display:flex;flex-direction:column}
  .tt-wa-h{background:#075e54;color:#fff;padding:66px 16px 12px;font-weight:600;font-size:16px}
  .tt-wa-b{flex:1;padding:18px 12px;display:flex;flex-direction:column;justify-content:flex-start}
  .tt-msg{align-self:flex-end;max-width:86%;background:#d9fdd3;border-radius:10px 2px 10px 10px;padding:6px;box-shadow:0 1px 1px rgba(0,0,0,.12);animation:ttUp .7s cubic-bezier(.2,.8,.2,1) .5s both;font-size:14px;color:#111}
  .tt-prev{background:#f1f5f2;border-radius:8px;overflow:hidden;margin-bottom:6px;display:flex;gap:8px;align-items:center}
  .tt-prev img{width:62px;height:62px;object-fit:cover}
  .tt-prev b{display:block;font-size:13px;line-height:1.3}
  .tt-prev em{font-style:normal;font-size:11.5px;color:#555;display:block;margin-top:2px}
  .tt-msg p{margin:2px 4px;white-space:pre-line;line-height:1.45}
  .tt-msg u{color:#027eb5;text-decoration:none;word-break:break-all}
  .tt-tick{text-align:right;font-size:11px;color:#667;margin:2px 4px 0}
  .tt-zone{position:absolute;top:60px;bottom:0;z-index:4}
  .tt-paused{position:absolute;left:50%;top:66%;transform:translate(-50%,-50%);z-index:7;background:rgba(0,0,0,.55);color:#fff;border-radius:999px;padding:10px 18px;font-size:15px;font-weight:600;display:none}
  .tt-quiz{position:absolute;inset:0;z-index:8;background:#0b1220;color:#fff;display:flex;flex-direction:column;justify-content:center;padding:28px 22px}
  .tt-quiz small{opacity:.7;font-size:13px}
  .tt-quiz h3{font-size:21px;line-height:1.45;margin:8px 0 18px}
  .tt-opt{display:block;width:100%;text-align:left;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;font:600 16px/1.4 inherit;cursor:pointer;transition:background .2s,border-color .2s,transform .15s}
  .tt-opt:active{transform:scale(.98)}
  .tt-opt.ok{background:rgba(34,197,94,.18);border-color:#22c55e}
  .tt-opt.no{background:rgba(239,68,68,.18);border-color:#ef4444}
  .tt-why{min-height:44px;font-size:14.5px;line-height:1.5;opacity:.9;margin:6px 2px 14px}
  .tt-go{border:0;border-radius:14px;background:#2563eb;color:#fff;font:700 16px/1 inherit;padding:15px;width:100%;cursor:pointer}
  .tt-go.ghost{background:transparent;border:1.5px solid rgba(255,255,255,.3);margin-top:10px}
  .tt-end{text-align:center}
  .tt-end .big{font-size:54px;line-height:1;margin-bottom:8px;color:#22c55e;font-weight:800}
  @media (prefers-reduced-motion:reduce){.tt-shot{transition:none}.tt-box,.tt-box.on::after,.tt-tap.on,.tt-cap span{animation:none;transition:none}}
  `;

  function done() { try { return JSON.parse(localStorage.getItem(DONE_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function markDone(id) {
    const d = done(); d[id] = new Date().toISOString();
    try { localStorage.setItem(DONE_KEY, JSON.stringify(d)); } catch (e) {}
    try { if (typeof window.trackSutra === 'function') window.trackSutra('tutorial', id); } catch (e) {}
    listeners.forEach(fn => { try { fn(d); } catch (e) {} });
  }
  const lessons = () => window.SRA_TUTOR_LESSONS || [];
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- voice ----------
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^hi(-|_)?IN/i.test(v.lang) && /google/i.test(v.name)) || vs.find(v => /^hi/i.test(v.lang)) || null;
    return voice;
  }
  if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
  const muted = () => { try { return localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { return false; } };

  let ov = null, state = null;

  function open(id) {
    const all = lessons(), idx = Math.max(0, all.findIndex(l => l.id === id));
    const lesson = all[idx];
    if (!lesson) return;
    if (!document.getElementById('tt-css')) { const st = document.createElement('style'); st.id = 'tt-css'; st.textContent = css; document.head.appendChild(st); }
    close();
    state = { lesson, idx, i: -1, timer: null, start: 0, dur: 0, paused: false, left: 0 };
    ov = document.createElement('div');
    ov.className = 'tt-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-label', lesson.title);
    ov.innerHTML = `<div class="tt-stage">
      <div class="tt-view"><div class="tt-shot"><img alt=""><div class="tt-box"></div><div class="tt-tap"></div></div></div>
      <div class="tt-bars">${lesson.scenes.map(() => '<div class="tt-bar"><i></i></div>').join('')}</div>
      <div class="tt-top"><b>पाठ ${idx + 1} · ${esc(lesson.title)}</b>
        <span><button class="tt-btn tt-mute" type="button"></button> <button class="tt-btn tt-x" type="button" aria-label="बंद करें">✕</button></span></div>
      <div class="tt-zone" style="left:0;width:30%" data-z="prev"></div>
      <div class="tt-zone" style="left:30%;width:40%" data-z="pause"></div>
      <div class="tt-zone" style="right:0;width:30%" data-z="next"></div>
      <div class="tt-cap"></div>
      <div class="tt-paused">रुका है — चलाने के लिए टैप करें</div>
    </div>`;
    document.body.appendChild(ov);
    document.documentElement.style.overflow = 'hidden';
    const muteBtn = ov.querySelector('.tt-mute');
    const paintMute = () => { muteBtn.textContent = muted() ? 'आवाज़ बंद' : 'आवाज़ चालू'; };
    paintMute();
    muteBtn.addEventListener('click', e => {
      e.stopPropagation();
      try { localStorage.setItem(MUTE_KEY, muted() ? '0' : '1'); } catch (x) {}
      paintMute();
      if (muted() && 'speechSynthesis' in window) speechSynthesis.cancel();
      show(state.i);   // replay the scene with or without voice
    });
    ov.querySelector('.tt-x').addEventListener('click', e => { e.stopPropagation(); close(); });
    ov.querySelectorAll('.tt-zone').forEach(z => z.addEventListener('click', () => {
      const k = z.dataset.z;
      if (k === 'next') show(state.i + 1);
      else if (k === 'prev') show(Math.max(0, state.i - 1));
      else togglePause();
    }));
    document.addEventListener('keydown', onKey);
    // preload this lesson's pictures
    lesson.scenes.forEach(s => { if (s.img) { const im = new Image(); im.src = BASE + 'img/' + s.img + '.jpg'; } });
    show(0);
  }

  function onKey(e) {
    if (!ov) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(state.i + 1);
    else if (e.key === 'ArrowLeft') show(Math.max(0, state.i - 1));
    else if (e.key === ' ') { e.preventDefault(); togglePause(); }
  }

  function close() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (state) clearTimeout(state.timer);
    if (ov) { ov.remove(); ov = null; }
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
  }

  function focusTransform(f) {
    if (!f) return { s: 1, tx: 0, ty: 0 };
    const fw = f[2] / FW, fh = f[3] / FH, cx = (f[0] + f[2] / 2) / FW, cy = (f[1] + f[3] / 2) / FH;
    const s = Math.max(1, Math.min(1.6, 0.72 / Math.max(fw, fh * 1.6)));
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    return { s, tx: clamp(0.5 - cx * s, 1 - s, 0), ty: clamp(0.42 - cy * s, 1 - s, 0) };
  }

  function bars(i) {
    ov.querySelectorAll('.tt-bar i').forEach((b, k) => {
      b.style.transition = 'none';
      b.style.width = k < i ? '100%' : '0%';
    });
  }
  function runBar(i, ms) {
    const b = ov.querySelectorAll('.tt-bar i')[i];
    if (!b) return;
    b.style.transition = 'none'; b.style.width = '0%';
    void b.offsetWidth;
    b.style.transition = `width ${ms}ms linear`; b.style.width = '100%';
  }

  function sceneHTML(sc) {
    if (sc.type === 'title') {
      const n = state.idx + 1, total = lessons().length;
      return `<div class="tt-title"><small>सूत्रधार ट्यूटोरियल · पाठ ${n} / ${total}</small><h2>${esc(sc.c)}</h2><p>${esc(state.lesson.mins)} · देखें, समझें और करें</p></div>`;
    }
    if (sc.type === 'wa') {
      const o = (window.SRA_OFFERS && window.SRA_OFFERS[0]) || { wa: 'अभी तक आपने अपनी कालसर्प रिपोर्ट नहीं देखी? मात्र ₹501 में — आज ही जानिए।', slug: 'kaalsarp', name: 'कालसर्प व सर्प-योग रिपोर्ट', price: 501 };
      return `<div class="tt-wa"><div class="tt-wa-h">परिवार ग्रुप</div><div class="tt-wa-b"><div class="tt-msg">
        <div class="tt-prev"><img src="${BASE}../logo.jpg" alt=""><div><b>${esc(o.name)} — ₹${Number(o.price).toLocaleString('en-IN')}</b><em>shriramjiastro.in</em></div></div>
        <p>${esc(o.wa)}</p><p><u>https://shriramjiastro.in/offer/${esc(o.slug)}.html?ref=आपका-कोड</u></p><div class="tt-tick">अभी ✓✓</div></div></div></div>`;
    }
    return '';
  }

  function show(i) {
    if (!ov) return;
    const L = state.lesson;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    clearTimeout(state.timer);
    state.paused = false; ov.querySelector('.tt-paused').style.display = 'none';
    if (i >= L.scenes.length) { quiz(); return; }
    state.i = i;
    const sc = L.scenes[i];
    bars(i);
    const view = ov.querySelector('.tt-view'), shot = ov.querySelector('.tt-shot');
    view.querySelectorAll('.tt-extra').forEach(n => n.remove());
    const box = ov.querySelector('.tt-box'), tap = ov.querySelector('.tt-tap');
    box.classList.remove('on'); tap.classList.remove('on');
    if (sc.img) {
      shot.style.display = '';
      const img = shot.querySelector('img'), src = BASE + 'img/' + sc.img + '.jpg';
      const t = focusTransform(sc.f);
      if (img.getAttribute('src') !== src) {   // new picture: start it unzoomed, then glide to the focus
        shot.style.transition = 'none';
        shot.style.transform = 'translate(0,0) scale(1)';
        img.setAttribute('src', src);
        void shot.offsetWidth;
        shot.style.transition = '';
      }
      requestAnimationFrame(() => { shot.style.transform = `translate(${t.tx * 100}%, ${t.ty * 100}%) scale(${t.s})`; });
      if (sc.f) {
        const [x, y, w, h] = sc.f, pad = 4;
        Object.assign(box.style, { left: ((x - pad) / FW * 100) + '%', top: ((y - pad) / FH * 100) + '%', width: ((w + pad * 2) / FW * 100) + '%', height: ((h + pad * 2) / FH * 100) + '%' });
        Object.assign(tap.style, { left: ((x + w / 2) / FW * 100) + '%', top: ((y + h / 2) / FH * 100) + '%' });
        void box.offsetWidth;
        box.classList.add('on');
        if (w < 240 && h < 80) tap.classList.add('on');   // a button: show a tap
      }
    } else {
      shot.style.display = 'none';
      const extra = document.createElement('div');
      extra.className = 'tt-extra';
      extra.style.cssText = 'position:absolute;inset:0';
      extra.innerHTML = sceneHTML(sc);
      view.appendChild(extra);
    }
    ov.querySelector('.tt-cap').innerHTML = `<span>${esc(sc.c)}</span>`;
    speak(sc.s || sc.c, () => next(i));
  }

  function next(i) { if (state && state.i === i && !state.paused) show(i + 1); }

  // narration decides how long a scene stays; without a voice, reading time does
  function speak(text, then) {
    const minMs = 3800, readMs = Math.max(minMs, text.length * 75 + 1200);
    const useVoice = !muted() && 'speechSynthesis' in window && (voice || pickVoice());
    let finished = false;
    const end = () => { if (finished) return; finished = true; state.timer = setTimeout(then, 700); };
    state.dur = readMs; state.start = Date.now();
    runBar(state.i, useVoice ? readMs + 1500 : readMs);
    if (useVoice) {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang || 'hi-IN'; u.rate = 0.98; u.pitch = 1;
      u.onend = end; u.onerror = () => { state.timer = setTimeout(end, Math.max(0, readMs - (Date.now() - state.start))); };
      speechSynthesis.speak(u);
      state.timer = setTimeout(end, readMs + 9000);   // safety: some phones never fire onend
    } else {
      state.timer = setTimeout(end, readMs);
    }
  }

  function togglePause() {
    if (!state || state.i < 0) return;
    const p = ov.querySelector('.tt-paused'), bar = ov.querySelectorAll('.tt-bar i')[state.i];
    if (!state.paused) {
      state.paused = true;
      clearTimeout(state.timer);
      if ('speechSynthesis' in window) speechSynthesis.pause();
      if (bar) { const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w; }
      p.style.display = 'block';
    } else {
      state.paused = false;
      p.style.display = 'none';
      if ('speechSynthesis' in window && speechSynthesis.paused) {
        speechSynthesis.resume();
        state.timer = setTimeout(() => next(state.i), 12000);
        if (bar) { bar.style.transition = 'width 6000ms linear'; bar.style.width = '100%'; }
      } else show(state.i);
    }
  }

  function quiz() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    clearTimeout(state.timer);
    const L = state.lesson, qs = L.quiz || [];
    const stage = ov.querySelector('.tt-stage');
    const q = document.createElement('div'); q.className = 'tt-quiz'; stage.appendChild(q);
    let k = 0, right = 0;
    const ask = () => {
      if (k >= qs.length) return finish();
      const it = qs[k];
      q.innerHTML = `<small>छोटा सवाल ${k + 1} / ${qs.length}</small><h3>${esc(it.q)}</h3>
        ${it.o.map((o, j) => `<button class="tt-opt" data-j="${j}" type="button">${esc(o)}</button>`).join('')}
        <div class="tt-why"></div>`;
      q.querySelectorAll('.tt-opt').forEach(b => b.addEventListener('click', () => {
        if (q.dataset.answered === String(k)) return;
        q.dataset.answered = String(k);
        const j = +b.dataset.j, ok = j === it.a;
        if (ok) right++;
        b.classList.add(ok ? 'ok' : 'no');
        q.querySelectorAll('.tt-opt')[it.a].classList.add('ok');
        q.querySelector('.tt-why').textContent = (ok ? 'सही! ' : 'सही जवाब ऊपर हरे में है। ') + (it.why || '');
        const go = document.createElement('button'); go.className = 'tt-go'; go.type = 'button';
        go.textContent = k + 1 < qs.length ? 'अगला सवाल' : 'पाठ पूरा करें';
        go.addEventListener('click', () => { k++; ask(); });
        q.appendChild(go);
      }));
    };
    const finish = () => {
      markDone(L.id);
      const nextL = lessons()[state.idx + 1];
      q.innerHTML = `<div class="tt-end"><div class="big">✓</div><h3>पाठ ${state.idx + 1} पूरा!</h3>
        <div class="tt-why">${qs.length ? `${right} / ${qs.length} सवाल सही।` : ''} ${nextL ? 'अगला पाठ: ' + esc(nextL.title) : 'सारे पाठ पूरे — अब "पहली कमाई" से आज का काम शुरू कीजिए।'}</div>
        ${nextL ? '<button class="tt-go tt-next" type="button">अगला पाठ चलाएँ</button>' : ''}
        <button class="tt-go ghost tt-again" type="button">यह पाठ फिर देखें</button>
        <button class="tt-go ghost tt-close" type="button">बंद करें</button></div>`;
      const nb = q.querySelector('.tt-next'); if (nb) nb.addEventListener('click', () => open(nextL.id));
      q.querySelector('.tt-again').addEventListener('click', () => open(L.id));
      q.querySelector('.tt-close').addEventListener('click', close);
    };
    if (!qs.length) finish(); else ask();
  }

  window.SRATutor = { open, close, done, lessons, onChange: fn => listeners.push(fn) };
})();
