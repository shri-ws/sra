#!/usr/bin/env python3
"""Builds the landing pages for Indian families in the Gulf (UAE, Saudi Arabia, Qatar, Oman,
Kuwait, Bahrain): gulf/<slug>.html in English and gulf/hi/<slug>.html in Hindi, plus a small
index page for each language and gulf/sitemap.xml.

Why English and Hindi, and no Arabic: see docs/marketing/ar/plan.md. In short, the buyers are
Indian expatriates, and advertising astrology to the Arabic-speaking public is restricted there.

Prices are the US-dollar prices the server charges outside India (USD_PRICE_BY_INR in
sutradhar_engine.py, same table in sra-currency.js). The dirham figure is only a guide: the
UAE dirham is pegged at AED 3.6725 to USD 1 (UAE Central Bank). The card is charged in USD.
The pages do not load sra-currency.js, because they carry no rupee prices to convert.

Run: python3 scripts/build_gulf_pages.py
"""
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://shriramjiastro.in"
AED_PER_USD = 3.6725
COUNTRIES = ["AE", "SA", "QA", "OM", "KW", "BH"]
LASTMOD = "2026-11-25"

REPORTS = [
    {
        "slug": "gun-milan", "usd": 21, "inr": 1101, "page": "gun-milan.html", "india": "offer/gun-milan.html",
        "en": {
            "name": "Gun Milan + Manglik report",
            "headline": "Kundli matching for a marriage being arranged from the Gulf",
            "lead": "Ashtakoot Gun Milan out of 36, Nadi and Bhakoot dosha with their classical cancellations, "
                    "and a Manglik check of both bride and groom, in one report.",
            "why": [
                "When you work in Dubai, Riyadh, Doha or Muscat and the family is talking to a proposal back home, "
                "the kundli is often matched without you. This report lets you see the whole match yourself.",
                "Counting gunas is not enough. Nadi, Bhakoot and Mangal dosha change the picture, and many doshas "
                "are cancelled by classical rules that a quick score does not show.",
                "Every rule in the report quotes the original Sanskrit shloka with the scripture and chapter, "
                "so a family elder or your own pandit can check it.",
            ],
            "gets": [
                "Ashtakoot Gun Milan: score out of 36 and the meaning of each of the 8 kootas",
                "Nadi and Bhakoot dosha, and the classical parihara (cancellation) rules",
                "Manglik check of both charts, from Lagna, Moon and Venus",
                "A4 PDF to print or send on WhatsApp to the family",
            ],
            "fit": "This is the North Indian Ashtakoot system (36 gunas). Families who match by the South Indian "
                   "10-porutham system should ask their own astrologer for that method.",
        },
        "hi": {
            "name": "गुण मिलान + मांगलिक रिपोर्ट",
            "headline": "खाड़ी देश में नौकरी, घर पर रिश्ते की बात? कुंडली मिलान खुद देखिए",
            "lead": "अष्टकूट गुण मिलान (36 में से अंक), नाड़ी-भकूट दोष और उनके शास्त्रीय परिहार, "
                    "और वर-कन्या दोनों की मांगलिक जाँच — एक ही रिपोर्ट में।",
            "why": [
                "आप दुबई, रियाद, दोहा या मस्कट में हैं और घर पर रिश्ते की बात चल रही है, तो अक्सर कुंडली आपके बिना मिलाई जाती है। "
                "यह रिपोर्ट पूरा मिलान आपके फ़ोन पर दिखाती है।",
                "केवल गुण गिनना काफ़ी नहीं; नाड़ी, भकूट और मंगल दोष भी देखने पड़ते हैं, और कई दोष शास्त्रीय नियमों से शान्त हो जाते हैं।",
                "हर नियम के साथ मूल संस्कृत श्लोक, ग्रंथ और अध्याय लिखा है, ताकि घर के बड़े या आपके पंडित जी उसे जाँच सकें।",
            ],
            "gets": [
                "अष्टकूट गुण मिलान: 36 में से अंक, हर कूट का अर्थ",
                "नाड़ी और भकूट दोष की जाँच और शास्त्रीय परिहार",
                "लग्न, चन्द्र और शुक्र से दोनों की मांगलिक जाँच",
                "A4 PDF, परिवार को WhatsApp पर भेजने के लिए",
            ],
            "fit": "यह उत्तर भारतीय अष्टकूट (36 गुण) पद्धति है। दक्षिण भारत की 10-पोरुथम पद्धति से मिलान कराने वाले परिवार उसके लिए अपने ज्योतिषी से पूछें।",
        },
    },
    {
        "slug": "vivah-muhurta", "usd": 41, "inr": 2100, "page": "vmm.html", "india": "offer/vivah-muhurta.html",
        "en": {
            "name": "Vivah (wedding) muhurta",
            "headline": "Fix the wedding date before you apply for leave",
            "lead": "Wedding dates and lagna times worked out from the bride's and groom's own charts by the rules "
                    "of Muhurta Chintamani, so you can book leave and tickets early.",
            "why": [
                "Leave from a Gulf job is fixed months ahead, and flights home get dear in the wedding season. "
                "A date found early is a date you can plan around.",
                "The panchang's general muhurta is the same for everyone. Here the dates come from the couple's own charts.",
                "Each date shows why it is pure or not: the 10 classical mahadoshas (Latta, Pata, Jamitra, Vedha, Bana, "
                "Ekargala, Upagraha, Dagdha tithi, Krantisamya, Shanku) are screened one by one.",
            ],
            "gets": [
                "Pure wedding dates and lagna times for the bride and groom",
                "Tithi, vara, nakshatra, yoga and lagna shuddhi checked for each date",
                "The reason a date is rejected, in plain words, with the shloka",
                "Times for the place where the wedding will be held",
            ],
            "fit": "Enter the town in India (or wherever the wedding will be) as the place; the times are for that place.",
        },
        "hi": {
            "name": "विवाह मुहूर्त",
            "headline": "छुट्टी की अर्ज़ी से पहले शादी की तारीख़ तय कीजिए",
            "lead": "वर-कन्या की अपनी कुंडली से, मुहूर्त चिन्तामणि के नियमों के अनुसार शुद्ध विवाह तिथियाँ और लग्न-समय — "
                    "ताकि छुट्टी और टिकट समय रहते बुक हो सकें।",
            "why": [
                "खाड़ी की नौकरी में छुट्टी महीनों पहले तय होती है, और शादी के मौसम में घर की टिकट महँगी हो जाती है। "
                "जल्दी मिली तारीख़ पर पूरी योजना बन सकती है।",
                "पंचांग का सामान्य मुहूर्त सबके लिए एक होता है; यहाँ मुहूर्त वर-कन्या की अपनी कुंडली से निकलता है।",
                "लत्ता, पात, जामित्र, वेध, बाण, एकार्गल, उपग्रह, दग्ध तिथि, क्रान्तिसाम्य और शंकु — दस महादोष हर तिथि पर अलग से जाँचे जाते हैं।",
            ],
            "gets": [
                "वर-कन्या के लिए शुद्ध विवाह तिथियाँ और लग्न-समय",
                "तिथि, वार, नक्षत्र, योग और लग्न शुद्धि की जाँच",
                "कोई तिथि क्यों छोड़ी गई, उसका कारण और श्लोक",
                "विवाह-स्थान के अनुसार समय",
            ],
            "fit": "स्थान में वह शहर लिखें जहाँ विवाह होगा (भारत में या कहीं और); समय उसी स्थान के अनुसार निकलेगा।",
        },
    },
    {
        "slug": "griha-pravesh", "usd": 31, "inr": 1551, "page": "vastu-muhurta.html", "india": "offer/vastu-muhurta.html",
        "en": {
            "name": "Vastu muhurta: Neev pujan and Griha pravesh",
            "headline": "Building a house back home? Fix the Griha pravesh date with your leave",
            "lead": "Muhurta for laying the foundation (Neev pujan) and for entering the new house (Griha pravesh), "
                    "worked out from the owner's chart and the classical muhurta rules.",
            "why": [
                "Many families in the Gulf build a house in India while they work abroad. The owner usually has to be "
                "there for the foundation and the house-warming, so the date has to fit the leave.",
                "A muhurta found from the owner's own chart, for the town where the house stands, is not the same as a "
                "general date from a calendar.",
                "Every date carries the reason and the shloka, so the family pandit at home can check it.",
            ],
            "gets": [
                "Neev pujan (foundation) and Griha pravesh dates and times",
                "Checks of tithi, vara, nakshatra, lagna and the owner's chart",
                "Times for the town where the house is",
                "A4 PDF to print or send to the family",
            ],
            "fit": "Give the town where the house is as the place; the times are for that town.",
        },
        "hi": {
            "name": "वास्तु मुहूर्त: नींव पूजन और गृह प्रवेश",
            "headline": "घर पर मकान बन रहा है? गृह प्रवेश की तारीख़ छुट्टी के साथ तय कीजिए",
            "lead": "नींव पूजन और नए घर में गृह प्रवेश का मुहूर्त — मालिक की कुंडली और शास्त्रीय मुहूर्त-नियमों से।",
            "why": [
                "खाड़ी में काम करने वाले बहुत-से परिवार भारत में घर बनवाते हैं। नींव और गृह प्रवेश पर मालिक का होना ज़रूरी है, "
                "इसलिए तारीख़ छुट्टी के साथ मिलनी चाहिए।",
                "मालिक की अपनी कुंडली और मकान वाले शहर से निकला मुहूर्त, कैलेंडर की सामान्य तारीख़ जैसा नहीं होता।",
                "हर तारीख़ के साथ कारण और श्लोक लिखा है, ताकि घर के पंडित जी उसे जाँच सकें।",
            ],
            "gets": [
                "नींव पूजन और गृह प्रवेश की तिथियाँ व समय",
                "तिथि, वार, नक्षत्र, लग्न और मालिक की कुंडली की जाँच",
                "मकान वाले शहर के अनुसार समय",
                "प्रिंट या परिवार को भेजने के लिए A4 PDF",
            ],
            "fit": "स्थान में वह शहर लिखें जहाँ मकान है; समय उसी शहर के अनुसार निकलेगा।",
        },
    },
]

TEXT = {
    "en": {
        "lang": "en", "brand": "Shri Ramji Astro", "home": "../index.html", "root": "../",
        "kicker_all": "For Indian families in the Gulf",
        "start": "Start", "pay": "Continue to the report",
        "price_note": "Card is charged in US dollars; your bank shows it in AED, SAR, QAR, OMR, KWD or BHD and may add its own fee.",
        "aed": "about AED {aed}",
        "why_h": "Why it helps", "gets_h": "What you get", "fit_h": "Good to know",
        "next": "On the next page you enter the birth details, then pay by international card through Razorpay. "
                "Help: support@shriramjiastro.in",
        "proof": "Calculated with the Swiss Ephemeris, Lahiri ayanamsa.",
        "india": "Paying from India? See the rupee price",
        "other": ("हिन्दी में पढ़ें", "hi"),
        "index_title": "Vedic reports for Indian families in the Gulf",
        "index_lead": "Kundli matching, wedding muhurta and Griha pravesh muhurta from the original shastra, "
                      "each rule with its shloka. For families in the UAE, Saudi Arabia, Qatar, Oman, Kuwait and Bahrain.",
        "see": "See the report",
    },
    "hi": {
        "lang": "hi", "brand": "श्री राम जी एस्ट्रो", "home": "../../index.html", "root": "../../",
        "kicker_all": "खाड़ी देशों में बसे भारतीय परिवारों के लिए",
        "start": "शुरू करें", "pay": "रिपोर्ट के लिए आगे बढ़ें",
        "price_note": "कार्ड से US डॉलर में भुगतान होता है; आपका बैंक इसे AED, SAR, QAR, OMR, KWD या BHD में दिखाता है और अपना शुल्क जोड़ सकता है।",
        "aed": "लगभग AED {aed}",
        "why_h": "यह क्यों काम का है", "gets_h": "आपको क्या मिलेगा", "fit_h": "ध्यान दें",
        "next": "अगले पेज पर जन्म-विवरण भरें, फिर Razorpay से अंतरराष्ट्रीय कार्ड द्वारा भुगतान करें। "
                "सहायता: support@shriramjiastro.in",
        "proof": "गणना Swiss Ephemeris और लाहिरी अयनांश से।",
        "india": "भारत से भुगतान कर रहे हैं? रुपये का मूल्य देखें",
        "other": ("Read in English", "en"),
        "index_title": "खाड़ी देशों के भारतीय परिवारों के लिए वैदिक रिपोर्ट",
        "index_lead": "कुंडली मिलान, विवाह मुहूर्त और गृह प्रवेश मुहूर्त — मूल शास्त्र से, हर नियम श्लोक सहित। "
                      "UAE, सऊदी अरब, क़तर, ओमान, कुवैत और बहरीन में बसे परिवारों के लिए।",
        "see": "रिपोर्ट देखें",
    },
}

# Extra rules for these pages only; the rest comes from offer/offer.css (same look as the India offer pages)
GULF_CSS = """/* Gulf landing pages (gulf/), built by scripts/build_gulf_pages.py; the base look is offer/offer.css */
html[lang="en"] body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
.of-top { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.of-top > a { margin:0; }
.gf-lang { font-size:14px; color:var(--blue); text-decoration:none; white-space:nowrap; }
.gf-price { margin:0 0 16px; font-size:15px; color:var(--muted); }
.gf-price b { color:var(--ink); font-size:22px; margin-right:6px; }
.of-pay div small { display:block; font-weight:500; color:var(--muted); font-size:13px; text-align:right; }
.gf-fit { color:var(--muted); font-size:15px; margin:0 0 12px; }
.gf-list { list-style:none; padding:0 !important; }
.gf-list li { border-top:1px solid var(--line); padding:12px 0; margin:0 !important; display:flex; justify-content:space-between; align-items:center; gap:12px; }
.gf-list li:first-child { border-top:0; }
.gf-list a { color:var(--blue); font-weight:700; text-decoration:none; }
.gf-foot { text-align:center; font-size:13px; color:var(--muted); margin:18px 0 0; }
.gf-foot a { color:var(--blue); }
"""


def aed(usd: int) -> int:
    return round(usd * AED_PER_USD)


def url(lang: str, slug: str) -> str:
    return f"{SITE}/gulf/{'hi/' if lang == 'hi' else ''}{slug}.html"


def alternates(slug: str) -> str:
    lines = []
    for lang in ("en", "hi"):
        for c in COUNTRIES:
            lines.append(f'<link rel="alternate" hreflang="{lang}-{c}" href="{url(lang, slug)}">')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{url("en", slug)}">')
    return "\n".join(lines)


def head(lang: str, slug: str, title: str, desc: str, og_title: str) -> str:
    e = html.escape
    t = TEXT[lang]
    fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
             '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
             '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">\n'
             if lang == "hi" else "")
    return f"""<!DOCTYPE html>
<html lang="{lang}" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Built by scripts/build_gulf_pages.py; edit the data there, not this file. -->
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url(lang, slug)}">
{alternates(slug)}
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(t['brand'])}">
<meta property="og:locale" content="{'en_AE' if lang == 'en' else 'hi_IN'}">
<meta property="og:title" content="{e(og_title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url(lang, slug)}">
<meta property="og:image" content="{SITE}/logo.jpg">
<meta name="twitter:card" content="summary">
<link rel="icon" href="{t['root']}logo.jpg">
{fonts}<link rel="stylesheet" href="{t['root']}offer/offer.css">
<link rel="stylesheet" href="{t['root']}gulf/gulf.css">
</head>
<body>
"""


def topbar(lang: str, slug: str) -> str:
    t = TEXT[lang]
    label, other = t["other"]
    href = (f"hi/{slug}.html" if other == "hi" else f"../{slug}.html")
    return (f'<header class="of-top"><a href="{t["home"]}"><img src="{t["root"]}logo.jpg" alt=""> {html.escape(t["brand"])}</a>'
            f'<a class="gf-lang" href="{href}" hreflang="{other}" lang="{other}">{html.escape(label)}</a></header>\n')


FOOT = """<script src="{root}sra-coupon-engine.js"></script>
<script>
  // Keep a Sutradhar's ?ref= on the report page too (it is also saved by sra-coupon-engine.js)
  (function () {{
    var ref = new URLSearchParams(location.search).get('ref');
    if (!ref) return;
    document.querySelectorAll('a.of-go').forEach(function (a) {{
      a.href += (a.href.indexOf('?') < 0 ? '?' : '&') + 'ref=' + encodeURIComponent(ref);
    }});
  }})();
</script>
<script src="{root}sra-analytics.js" defer></script>
</body>
</html>
"""


def report_page(r: dict, lang: str) -> str:
    e = html.escape
    t = TEXT[lang]
    d = r[lang]
    usd, a = r["usd"], aed(r["usd"])
    go = f'{t["root"]}{r["page"]}?cur=usd'
    title = f"{d['name']} — US${usd} | {t['brand']}"
    out = head(lang, r["slug"], title, d["lead"], f"{d['headline']} — {d['name']}, US${usd}")
    out += topbar(lang, r["slug"])
    out += f"""<main class="of-wrap">
  <section class="of-hero">
    <p class="of-kicker">{e(t['kicker_all'])} · {e(d['name'])}</p>
    <h1>{e(d['headline'])}</h1>
    <p class="of-lead">{e(d['lead'])}</p>
    <p class="gf-price"><b>US${usd}</b>{e(t['aed'].format(aed=a))}</p>
    <a class="of-btn of-go" href="{go}">{e(t['start'])}</a>
    <p class="of-note">{e(t['price_note'])}</p>
  </section>
  <section class="of-card">
    <h2>{e(t['why_h'])}</h2>
    <ul>{''.join(f'<li>{e(w)}</li>' for w in d['why'])}</ul>
  </section>
  <section class="of-card">
    <h2>{e(t['gets_h'])}</h2>
    <ul class="of-ticks">{''.join(f'<li>{e(g)}</li>' for g in d['gets'])}</ul>
    <p class="gf-fit"><b>{e(t['fit_h'])}:</b> {e(d['fit'])}</p>
  </section>
  <section class="of-card of-pay">
    <div><span>{e(d['name'])}</span><b>US${usd}<small>{e(t['aed'].format(aed=a))}</small></b></div>
    <a class="of-btn of-go" href="{go}">{e(t['pay'])}</a>
    <p class="of-note">{e(t['next'])}</p>
    <p class="of-note">{e(t['proof'])}</p>
  </section>
  <p class="gf-foot"><a href="{t['root']}{r['india']}?cur=inr">{e(t['india'])}</a></p>
</main>
<div class="of-bar"><span>US${usd}</span><a class="of-btn of-go" href="{go}">{e(t['start'])}</a></div>
"""
    return out + FOOT.format(root=t["root"])


def index_page(lang: str) -> str:
    e = html.escape
    t = TEXT[lang]
    out = head(lang, "index", f"{t['index_title']} | {t['brand']}", t["index_lead"], t["index_title"])
    out += topbar(lang, "index")
    items = "".join(
        f'<li><span>{e(r[lang]["name"])}<br><small>US${r["usd"]} · {e(t["aed"].format(aed=aed(r["usd"])))}</small></span>'
        f'<a href="{r["slug"]}.html">{e(t["see"])}</a></li>' for r in REPORTS)
    out += f"""<main class="of-wrap">
  <section class="of-hero">
    <p class="of-kicker">{e(t['kicker_all'])}</p>
    <h1>{e(t['index_title'])}</h1>
    <p class="of-lead">{e(t['index_lead'])}</p>
  </section>
  <section class="of-card">
    <ul class="gf-list">{items}</ul>
  </section>
  <p class="gf-foot">{e(t['proof'])}</p>
</main>
"""
    return out + FOOT.format(root=t["root"])


def sitemap() -> str:
    rows = []
    for slug in ["index"] + [r["slug"] for r in REPORTS]:
        alt = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{lang}-{c}" href="{url(lang, slug)}"/>'
            for lang in ("en", "hi") for c in COUNTRIES)
        alt += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{url("en", slug)}"/>'
        for lang in ("en", "hi"):
            rows.append(f"""  <url>
    <loc>{url(lang, slug)}</loc>
    <lastmod>{LASTMOD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.60</priority>{alt}
  </url>""")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<!-- Built by scripts/build_gulf_pages.py: landing pages for Indian families in the Gulf -->\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + "\n".join(rows) + "\n</urlset>\n")


def main():
    out = ROOT / "gulf"
    (out / "hi").mkdir(parents=True, exist_ok=True)
    (out / "gulf.css").write_text(GULF_CSS, encoding="utf-8")
    for lang, folder in (("en", out), ("hi", out / "hi")):
        (folder / "index.html").write_text(index_page(lang), encoding="utf-8")
        for r in REPORTS:
            (folder / f"{r['slug']}.html").write_text(report_page(r, lang), encoding="utf-8")
    (out / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    print(f"{2 * (len(REPORTS) + 1)} pages and gulf/sitemap.xml written to {out}")


if __name__ == "__main__":
    main()
