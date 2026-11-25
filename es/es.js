/* Spanish landing pages: forward ?cur=usd, carry ?ref=, set language cookie to Spanish */
(function () {
  var ref = new URLSearchParams(location.search).get('ref');
  document.querySelectorAll('a.of-go, a.btn').forEach(function (a) {
    if (!a.href || a.href.indexOf('javascript') === 0 || a.href.indexOf('#') === 0) return;
    var extra = 'cur=usd' + (ref ? '&ref=' + encodeURIComponent(ref) : '');
    a.href += (a.href.indexOf('?') < 0 ? '?' : '&') + extra;
    a.addEventListener('click', function () {
      try { localStorage.setItem('sra_lang', 'en'); } catch (e) {}
      var host = location.hostname, doms = ['', host, '.' + host.replace(/^www\./, '')];
      doms.forEach(function (d) { document.cookie = 'googtrans=/en/es;path=/' + (d ? ';domain=' + d : ''); });
    });
  });
})();
