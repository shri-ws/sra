/* Prices for customers outside India (22 Nov 2026).
   Visitors whose phone/computer clock is set outside India see report prices in US dollars and pay
   by international card (the server makes the Razorpay order in USD — sutradhar_engine.py, same table).
   Indian visitors see nothing new. Anyone can switch: the small "Prices in" line at the page bottom
   (shown only outside India or once dollars were chosen), or ?cur=usd / ?cur=inr in the address.
   Euro (25 Nov 2026): visitors whose clock is in a euro country see euro prices, paid the same way
   (?cur=eur also works). Tables below must match USD_PRICE_BY_INR / EUR_PRICE_BY_INR in sutradhar_engine.py.
   API: SRACurrency.get() -> 'INR' | 'USD' | 'EUR', SRACurrency.set(c), SRACurrency.usd(inrPrice),
        SRACurrency.price(inrPrice) -> number in the current currency, SRACurrency.symbol(). */
(function () {
  if (window.SRACurrency) return;
  var KEY = 'sra_currency';
  // rupee price -> dollar price (keep in step with USD_PRICE_BY_INR in sutradhar_engine.py)
  var USD = { 501: 11, 1101: 21, 1111: 21, 1551: 31, 2100: 41, 5100: 101, 24000: 451, 94600: 1111 };
  var EUR = { 501: 10, 1101: 19, 1111: 19, 1551: 29, 2100: 39, 5100: 95, 24000: 415, 94600: 1050 };
  var TABLE = { USD: USD, EUR: EUR }, RATE = { USD: 88, EUR: 100 }, SYM = { INR: '₹', USD: '$', EUR: '€' };
  // clocks in countries that pay in euros (euro area, small euro states, French overseas regions)
  var EURO_TZ = /^(Europe\/(Vienna|Brussels|Zagreb|Nicosia|Tallinn|Helsinki|Mariehamn|Paris|Berlin|Busingen|Athens|Dublin|Rome|Riga|Vilnius|Luxembourg|Malta|Amsterdam|Lisbon|Bratislava|Ljubljana|Madrid|Sofia|Monaco|San_Marino|Vatican|Andorra|Podgorica)|Asia\/(Nicosia|Famagusta)|Atlantic\/(Azores|Madeira|Canary)|Africa\/Ceuta|Indian\/(Reunion|Mayotte)|America\/(Martinique|Guadeloupe|Cayenne|St_Barthelemy|Marigot|Miquelon))$/;
  // pages for Sutradhars, the team and donations stay in rupees
  var SKIP = /(sutradhar|admin|donate|careers|consultant|sankalp|lab|terms|privacy|saas-demo|jyotishi)[^/]*$/i;
  var skipPage = SKIP.test(location.pathname);

  function inIndia() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      return !tz || /^Asia\/(Kolkata|Calcutta)$/.test(tz);
    } catch (e) { return true; }
  }
  function get() {
    if (skipPage) return 'INR';
    var m = location.search.match(/[?&]cur=(inr|usd|eur)\b/i);
    if (m) { try { localStorage.setItem(KEY, m[1].toUpperCase()); } catch (e) {} return m[1].toUpperCase(); }
    try { var v = localStorage.getItem(KEY); if (v === 'INR' || v === 'USD' || v === 'EUR') return v; } catch (e) {}
    return inIndia() ? 'INR' : (inEuroCountry() ? 'EUR' : 'USD');
  }
  function inEuroCountry() {
    try { return EURO_TZ.test(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch (e) { return false; }
  }
  var cur = get();
  function inCur(inr, c) {
    inr = Number(inr) || 0;
    if (c === 'INR') return inr;
    return TABLE[c][inr] || Math.max(1, Math.round(inr / RATE[c]));
  }
  function usd(inr) { return inCur(inr, 'USD'); }

  // ---------- show dollar / euro prices ----------
  var DEV = '०१२३४५६७८९';
  var RE = /₹\s?([0-9०-९][0-9०-९,]*)(?:\.[0-9०-९]+)?(\s?\/-)?/g;
  function toNum(s) {
    return Number(String(s).replace(/[०-९]/g, function (d) { return DEV.indexOf(d); }).replace(/,/g, ''));
  }
  function swap(text) {
    var out = text.replace(RE, function (all, n) {
      var v = toNum(n);
      var t = TABLE[cur] || USD;
      return t[v] ? SYM[cur] + t[v] : all;     // only real price tiers change; other rupee figures stay
    });
    // old hand-written dollar hints next to a rupee price ("₹5,100 / $99 USD") give way to the real price
    if (out !== text) out = out.replace(/([$€]\d+)\s*\/\s*\$\d+\s*USD/g, '$1');
    // a price that was swapped no longer says "INR" after it ("₹24,000 INR" -> "€415")
    if (out !== text) out = out.replace(/([$€]\d+)\s*INR\b/g, '$1');
    return out;
  }
  function struck(el) {
    for (var e = el, i = 0; e && i < 3; e = e.parentElement, i++) {
      if (/^(S|DEL|STRIKE)$/.test(e.tagName)) return e;
      try { if (/line-through/.test(getComputedStyle(e).textDecorationLine || getComputedStyle(e).textDecoration)) return e; } catch (x) {}
    }
    return null;
  }
  function walk(root) {
    if (!root) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentElement;
        if (!p || /^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT)$/.test(p.tagName) || p.closest('[data-sra-inr]')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf('₹') >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var list = [], n;
    while ((n = tw.nextNode())) list.push(n);
    list.forEach(function (t) {
      // struck-out rupee prices, and rupee EMI lines (Indian cards only), are not shown in dollars
      var s = struck(t.parentElement) || (/EMI/.test(t.nodeValue) ? t.parentElement : null);
      if (s) { s.style.setProperty('display', 'none', 'important'); s.setAttribute('data-sra-usd-hidden', '1'); return; }
      var v = swap(t.nodeValue);
      if (v !== t.nodeValue) t.nodeValue = v;
    });
    if (root.querySelectorAll) root.querySelectorAll('input[placeholder*="₹"],[title*="₹"]').forEach(function (el) {
      ['placeholder', 'title'].forEach(function (a) { var x = el.getAttribute(a); if (x && x.indexOf('₹') >= 0) el.setAttribute(a, swap(x)); });
    });
  }
  var pending = false;
  function later() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; walk(document.body); }, 120);
  }

  // ---------- the small switch at the bottom ----------
  function bar() {
    if (skipPage || document.getElementById('sraCurBar')) return;
    if (inIndia() && cur === 'INR') return;            // Indian visitors never see it
    var d = document.createElement('div');
    d.id = 'sraCurBar';
    d.className = 'notranslate';
    d.setAttribute('data-sra-inr', '1');
    d.style.cssText = 'text-align:center;font:500 13px/1.4 system-ui,sans-serif;color:#475569;padding:14px 10px 18px;background:#f8fafc;border-top:1px solid #e2e8f0';
    function link(c, label) {
      var on = cur === c;
      return '<a href="#" data-cur="' + c + '" style="margin:0 6px;color:' + (on ? '#0f172a' : '#2563eb') + ';font-weight:' + (on ? 700 : 500) +
        ';text-decoration:' + (on ? 'none' : 'underline') + '">' + label + '</a>';
    }
    d.innerHTML = 'Prices in: ' + link('EUR', '€ EUR (card)') + '|' + link('USD', 'US$ (card)') + '|' + link('INR', '₹ INR (India, UPI)');
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cur]');
      if (!a) return;
      e.preventDefault();
      set(a.getAttribute('data-cur'));
    });
    document.body.appendChild(d);
  }
  function set(c) {
    c = (c === 'USD' || c === 'EUR') ? c : 'INR';
    try { localStorage.setItem(KEY, c); } catch (e) {}
    var u = location.href.replace(/([?&])cur=(inr|usd|eur)&?/i, '$1').replace(/[?&]$/, '');
    if (u === location.href) location.reload(); else location.replace(u);
  }

  window.SRACurrency = {
    get: function () { return cur; }, set: set, usd: usd, inIndia: inIndia,
    price: function (inr) { return inCur(inr, cur); }, symbol: function () { return SYM[cur]; }
  };

  function start() {
    bar();
    if (cur === 'INR') return;
    document.documentElement.setAttribute('data-sra-currency', cur);
    // phone boxes made for 10-digit Indian numbers: allow a number with country code
    document.querySelectorAll('input[maxlength="10"]').forEach(function (el) {
      if (!/tel|phone|mobile|मोबाइल/i.test((el.type || '') + ' ' + (el.id || '') + ' ' + (el.name || '') + ' ' + (el.placeholder || ''))) return;
      el.setAttribute('maxlength', '16');
      el.removeAttribute('pattern');
      el.setAttribute('placeholder', cur === 'EUR' ? 'Mobile with country code, e.g. +49 151 2345 6789' : 'Mobile with country code, e.g. +1 555 123 4567');
    });
    walk(document.body);
    try { new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
