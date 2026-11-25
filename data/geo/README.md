# Visitor country for payment currency

`dbip-country-lite.mmdb` — DB-IP "IP to Country Lite", November 2026 edition, CC BY 4.0 (credit on privacy.html: "IP Geolocation by DB-IP", https://db-ip.com).
Read by `sutradhar_engine.py` (`visitor_country`, `currency_for_visitor`) with the `maxminddb` package: India pays in rupees, a visitor abroad in the local currency.

Refresh about once a month (a new file comes out on the 1st):

    curl -o data/geo/dbip-country-lite.mmdb.gz https://download.db-ip.com/free/dbip-country-lite-YYYY-MM.mmdb.gz
    gunzip -f data/geo/dbip-country-lite.mmdb.gz

If the file is missing or unreadable, the server falls back to the currency the page sent (from the visitor's time zone).
