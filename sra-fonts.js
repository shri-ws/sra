/* sra-fonts.js — keeps Hindi letters joined on every phone (25 Nov 2026).
   letter-spacing (and turning ligatures off) splits Devanagari conjuncts and matras on many Android
   browsers: "क्ष" shows as "क्‌ष", matras float loose. Headings and buttons across the site use small
   letter-spacing for English, so any element whose own text is Hindi gets letter-spacing: normal here,
   also for text that pages add later. English text is left as designed. Fonts: sra-fonts.css. */
(function () {
  'use strict';
  if (window.__sraFonts) return;
  window.__sraFonts = true;
  const DEVA = /[ऀ-ॿ]/;

  function fixEl(el) {
    if (!el) return;
    const cs = getComputedStyle(el);
    if (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) !== 0) el.style.setProperty('letter-spacing', 'normal', 'important');
    if (cs.fontVariantLigatures === 'none') el.style.setProperty('font-variant-ligatures', 'normal', 'important');
  }
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (DEVA.test(root.nodeValue)) fixEl(root.parentElement); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (DEVA.test(n.nodeValue) ? 1 : 2) });
    let n;
    while ((n = w.nextNode())) fixEl(n.parentElement);
  }

  let queue = [], planned = false;
  function later(node) {
    queue.push(node);
    if (planned) return;
    planned = true;
    requestAnimationFrame(() => { planned = false; const q = queue; queue = []; q.forEach(scan); });
  }
  // scripts like sra-nav.js add their styles after building the elements, so the whole page is
  // checked again after load as well as for every change
  function start() {
    scan(document.body);
    window.addEventListener('load', () => scan(document.body));
    [1500, 4000].forEach(t => setTimeout(() => scan(document.body), t));
    new MutationObserver(ms => ms.forEach(m => {
      if (m.type === 'characterData') later(m.target);
      else m.addedNodes.forEach(later);
    })).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
