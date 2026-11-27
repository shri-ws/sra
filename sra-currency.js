/* Prices for customers outside India (22 Nov 2026).
   Visitors whose phone/computer clock is set outside India see report prices in US dollars and pay
   by international card (the server makes the Razorpay order in USD — sutradhar_engine.py, same table).
   Indian visitors see nothing new. Anyone can switch: the small "Prices in" line at the page bottom
   (shown only outside India or once dollars were chosen), or ?cur=usd / ?cur=inr in the address.
   Euro (25 Nov 2026): visitors whose clock is in a euro country see euro prices, paid the same way
   (?cur=eur also works). Tables below must match USD_PRICE_BY_INR / EUR_PRICE_BY_INR in sutradhar_engine.py.
   More local currencies (25 Nov 2026): Japan JPY, UK GBP, Australia AUD, Canada CAD, Singapore SGD,
   UAE AED, Switzerland/Liechtenstein CHF; later Russia RUB, China CNY, Hong Kong HKD, Saudi SAR, Qatar QAR,
   New Zealand NZD, Malaysia MYR, South Africa ZAR — chosen from the clock's time zone; everyone else abroad USD.
   Tables must match FOREIGN_PRICE_BY_INR in sutradhar_engine.py.
   API: SRACurrency.get() -> 'INR' | 'USD' | 'EUR' | 'JPY' | ..., SRACurrency.set(c), SRACurrency.usd(inrPrice),
        SRACurrency.price(inrPrice) -> number in the current currency, SRACurrency.symbol(). */
(function () {
  if (window.SRACurrency) return;
  var KEY = 'sra_currency';
  // rupee price -> dollar price (keep in step with USD_PRICE_BY_INR in sutradhar_engine.py)
  var USD = { 501: 11, 1101: 21, 1111: 21, 1551: 31, 2100: 41, 5100: 101, 24000: 451, 94600: 1111 };
  var EUR = { 501: 10, 1101: 19, 1111: 19, 1551: 29, 2100: 39, 5100: 95, 24000: 415, 94600: 1050 };
  var TABLE = {
    USD: USD, EUR: EUR,
    JPY: { 501: 1700, 1101: 3200, 1111: 3200, 1551: 4800, 2100: 6300, 5100: 15500, 24000: 69000, 94600: 170000 },
    GBP: { 501: 9, 1101: 17, 1111: 17, 1551: 25, 2100: 33, 5100: 79, 24000: 355, 94600: 870 },
    AUD: { 501: 17, 1101: 32, 1111: 32, 1551: 47, 2100: 62, 5100: 155, 24000: 685, 94600: 1690 },
    CAD: { 501: 15, 1101: 29, 1111: 29, 1551: 43, 2100: 57, 5100: 139, 24000: 625, 94600: 1540 },
    SGD: { 501: 15, 1101: 28, 1111: 28, 1551: 41, 2100: 55, 5100: 135, 24000: 599, 94600: 1470 },
    AED: { 501: 41, 1101: 77, 1111: 77, 1551: 114, 2100: 151, 5100: 371, 24000: 1651, 94600: 4080 },
    CHF: { 501: 10, 1101: 19, 1111: 19, 1551: 27, 2100: 36, 5100: 89, 24000: 395, 94600: 970 },
    RUB: { 501: 900, 1101: 1700, 1111: 1700, 1551: 2500, 2100: 3400, 5100: 8300, 24000: 37000, 94600: 91000 },
    CNY: { 501: 75, 1101: 139, 1111: 139, 1551: 209, 2100: 275, 5100: 679, 24000: 2999, 94600: 7399 },
    HKD: { 501: 86, 1101: 165, 1111: 165, 1551: 243, 2100: 321, 5100: 792, 24000: 3536, 94600: 8710 },
    SAR: { 501: 41, 1101: 79, 1111: 79, 1551: 116, 2100: 154, 5100: 379, 24000: 1690, 94600: 4170 },
    QAR: { 501: 40, 1101: 76, 1111: 76, 1551: 113, 2100: 149, 5100: 368, 24000: 1640, 94600: 4040 },
    NZD: { 501: 20, 1101: 39, 1111: 39, 1551: 57, 2100: 75, 5100: 185, 24000: 829, 94600: 2045 },
    MYR: { 501: 45, 1101: 87, 1111: 87, 1551: 128, 2100: 169, 5100: 416, 24000: 1858, 94600: 4577 },
    ZAR: { 501: 195, 1101: 369, 1111: 369, 1551: 545, 2100: 719, 5100: 1769, 24000: 7899, 94600: 19449 }
  };
  var RATE = { USD: 88, EUR: 100, JPY: 0.58, GBP: 112, AUD: 58, CAD: 63, SGD: 66, AED: 24, CHF: 104, RUB: 1.07, CNY: 13.2, HKD: 11.2, SAR: 23.5, QAR: 24.2, NZD: 47.8, MYR: 21.4, ZAR: 5.03 };
  var SYM = { INR: '₹', USD: '$', EUR: '€', JPY: '¥', GBP: '£', AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'AED ', CHF: 'CHF ', RUB: '₽', CNY: 'CN¥', HKD: 'HK$', SAR: 'SAR ', QAR: 'QAR ', NZD: 'NZ$', MYR: 'RM ', ZAR: 'R ' };
  var NAME = { USD: 'US$', EUR: '€ EUR', JPY: '¥ JPY', GBP: '£ GBP', AUD: 'A$ AUD', CAD: 'C$ CAD', SGD: 'S$ SGD', AED: 'AED', CHF: 'CHF', RUB: '₽ RUB', CNY: 'CN¥ CNY', HKD: 'HK$ HKD', SAR: 'SAR', QAR: 'QAR', NZD: 'NZ$ NZD', MYR: 'RM MYR', ZAR: 'R ZAR' };
  var PHONE = { EUR: '+49 151 2345 6789', JPY: '+81 90 1234 5678', GBP: '+44 7700 900123', AUD: '+61 412 345 678',
                CAD: '+1 416 555 0123', SGD: '+65 8123 4567', AED: '+971 50 123 4567', CHF: '+41 79 123 45 67', RUB: '+7 912 345 6789', CNY: '+86 139 1234 5678', HKD: '+852 5123 4567', SAR: '+966 50 123 4567', QAR: '+974 3312 3456', NZD: '+64 21 123 4567', MYR: '+60 12 345 6789', ZAR: '+27 82 123 4567' };
  // time zone -> local currency (only where we sell in that currency)
  var LOCAL_TZ = [
    ['JPY', /^Asia\/Tokyo$/],
    ['GBP', /^Europe\/(London|Belfast|Guernsey|Jersey|Isle_of_Man)$/],
    ['AUD', /^Australia\//],
    ['CAD', /^America\/(Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Dawson|Dawson_Creek|Fort_Nelson|Creston|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Swift_Current|Atikokan|Coral_Harbour|Nipigon|Thunder_Bay|Rainy_River|Pangnirtung)$|^Canada\//],
    ['SGD', /^(Asia\/Singapore|Singapore)$/],
    ['AED', /^Asia\/Dubai$/],
    ['CHF', /^Europe\/(Zurich|Vaduz)$/],
    ['RUB', /^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Saratov|Ulyanovsk|Astrakhan|Kirov)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr)|W-SU)$/],
    ['CNY', /^(Asia\/(Shanghai|Chongqing|Chungking|Harbin|Urumqi|Kashgar)|PRC)$/],
    ['HKD', /^(Asia\/Hong_Kong|Hongkong)$/],
    ['SAR', /^Asia\/Riyadh$/],
    ['QAR', /^Asia\/Qatar$/],
    ['NZD', /^(Pacific\/(Auckland|Chatham)|NZ|NZ-CHAT)$/],
    ['MYR', /^Asia\/(Kuala_Lumpur|Kuching)$/],
    ['ZAR', /^Africa\/Johannesburg$/]
  ];
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

  function isEnglishVersion() {
    if (location.pathname.indexOf('/en/') !== -1) return true;
    if (/[?&]cur=usd\b/i.test(location.search)) return true;
    if (/[?&]lang=en\b/i.test(location.search)) return true;
    try {
      if (document.documentElement.getAttribute('lang') === 'en') return true;
      if (localStorage.getItem('sra_lang') === 'en') return true;
    } catch (e) {}
    return false;
  }

  try { localStorage.removeItem(KEY); } catch (e) {}
  function get() {
    if (skipPage) return 'INR';
    var m = location.search.match(/[?&]cur=([a-z]{3})\b/i);
    if (m && ok(m[1].toUpperCase())) {
      var sel = m[1].toUpperCase();
      try { sessionStorage.setItem(KEY, sel); } catch (e) {}
      return sel;
    }
    try {
      var v = sessionStorage.getItem(KEY);
      if (ok(v)) return v;
    } catch (e) {}

    // English version or English language preference -> Always US Dollars (USD)
    if (isEnglishVersion()) return 'USD';

    // Foreign visitors: USA, UK, Canada, Europe, or any country outside India -> US Dollars (USD)
    if (!inIndia()) return 'USD';

    return 'INR';
  }
  function ok(c) { return c === 'INR' || !!TABLE[c]; }
  function localCurrency() {
    return 'USD';
  }
  function inEuroCountry() {
    return false;
  }
  var cur = get();
  function inCur(inr, c) {
    inr = Number(inr) || 0;
    if (c === 'INR') return inr;
    return TABLE[c][inr] || Math.max(1, Math.round(inr / RATE[c]));
  }
  function usd(inr) { return inCur(inr, 'USD'); }
  function money(n) { return SYM[cur] + Number(n).toLocaleString('en-US'); }

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
      return t[v] ? money(t[v]) : all;     // only real price tiers change; other rupee figures stay
    });
    if (out !== text) {
      var P = '((?:A\\$|C\\$|S\\$|HK\\$|NZ\\$|CN¥|AED |CHF |SAR |QAR |RM |R |[$€¥£₽])[\\d,]+)';
      // old hand-written dollar hints next to a rupee price ("₹5,100 / $99 USD") give way to the real price
      out = out.replace(new RegExp(P + '\\s*\\/\\s*\\$[\\d,]+\\s*USD', 'g'), '$1');
      // a price that was swapped no longer says "INR" after it ("₹24,000 INR" -> "€415")
      out = out.replace(new RegExp(P + '\\s*INR\\b', 'g'), '$1');
    }
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
    var local = inIndia() ? 'USD' : localCurrency(), opts = [];
    if (local !== 'USD') opts.push(link(local, NAME[local] + ' (card)'));
    if (cur !== 'INR' && cur !== 'USD' && cur !== local) opts.push(link(cur, NAME[cur] + ' (card)'));
    opts.push(link('USD', 'US$ (card)'), link('INR', '₹ INR (India, UPI)'));
    d.innerHTML = 'Prices in: ' + opts.join('|');
    d.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cur]');
      if (!a) return;
      e.preventDefault();
      set(a.getAttribute('data-cur'));
    });
    document.body.appendChild(d);
  }
  function set(c) {
    c = ok(c) ? c : 'INR';
    try { sessionStorage.setItem(KEY, c); } catch (e) {}
    var u = location.href.replace(/([?&])cur=[a-z]{3}&?/i, '$1').replace(/[?&]$/, '');
    if (u === location.href) location.reload(); else location.replace(u);
  }

  function formatIn(inr, c) { return c === 'INR' ? '₹' + Number(inr).toLocaleString('en-IN') : SYM[c] + Number(inCur(inr, c)).toLocaleString('en-US'); }
  window.SRACurrency = {
    get: function () { return cur; }, set: set, usd: usd, inIndia: inIndia,
    price: function (inr) { return inCur(inr, cur); }, symbol: function () { return SYM[cur]; },
    format: function (inr) { return formatIn(inr, cur); },
    // for the payment step: every currency we take, and the price in each
    local: function () { return skipPage ? 'INR' : (inIndia() ? 'INR' : localCurrency()); },
    all: function () { return ['INR'].concat(Object.keys(TABLE)); },
    name: function (c) { return c === 'INR' ? '₹ INR' : NAME[c]; },
    priceIn: function (inr, c) { return inCur(inr, c); }, formatIn: formatIn,
    rupeesOnly: function () { return skipPage; }
  };

  function start() {
    if (cur === 'INR') return;
    document.documentElement.setAttribute('data-sra-currency', cur);
    // phone boxes made for 10-digit Indian numbers: allow a number with country code
    document.querySelectorAll('input[maxlength="10"]').forEach(function (el) {
      if (!/tel|phone|mobile|मोबाइल/i.test((el.type || '') + ' ' + (el.id || '') + ' ' + (el.name || '') + ' ' + (el.placeholder || ''))) return;
      el.setAttribute('maxlength', '16');
      el.removeAttribute('pattern');
      el.setAttribute('placeholder', 'Mobile with country code, e.g. ' + (PHONE[cur] || '+1 555 123 4567'));
    });
    walk(document.body);
    try { new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
