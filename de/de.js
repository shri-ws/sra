/* German landing pages: the report pages are Hindi/English. A click on "Jetzt starten" opens the
   report page on its English base and asks the site's own translator (sra-translate.js) to show it
   in German, through the same "googtrans" cookie the language menu writes. Prices show in US dollars
   (sra-currency.js, ?cur=usd). A Sutradhar's ?ref= is carried along, as on offer/*.html. */
(function () {
  var ref = new URLSearchParams(location.search).get('ref');
  document.querySelectorAll('a.of-go').forEach(function (a) {
    var extra = 'cur=usd' + (ref ? '&ref=' + encodeURIComponent(ref) : '');
    a.href += (a.href.indexOf('?') < 0 ? '?' : '&') + extra;
    a.addEventListener('click', function () {
      try { localStorage.setItem('sra_lang', 'en'); } catch (e) {}
      var host = location.hostname, doms = ['', host, '.' + host.replace(/^www\./, '')];
      doms.forEach(function (d) { document.cookie = 'googtrans=/en/de;path=/' + (d ? ';domain=' + d : ''); });
    });
  });
})();
