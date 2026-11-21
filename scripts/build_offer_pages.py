#!/usr/bin/env python3
"""Builds the shareable report offer pages and the list the Sutradhar portal shows.

Each report gets its own static page offer/<slug>.html. It is static because WhatsApp
reads only the page's own <meta> tags (no JavaScript) for the link preview.
The same data is written to sra-offers.js for the "रिपोर्ट लिंक भेजें" card in sutradhar.html.

Prices must match SERVICE_CATALOG in sutradhar_engine.py (the server decides the real price).
Run: python3 scripts/build_offer_pages.py
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://shriramjiastro.in"
GST = 18

OFFERS = [
    {
        "slug": "kaalsarp", "service": "kaalsarp_dosha", "price": 501, "rate": 66, "page": "kaalsarp-report.html",
        "name": "कालसर्प व सर्प-योग रिपोर्ट",
        "headline": "क्या आपकी कुंडली में कालसर्प योग है?",
        "preview": "कालसर्प योग है या नहीं, पूर्ण या आंशिक, और शास्त्र में बताए उपाय — हर नियम मूल श्लोक व ग्रंथ-प्रमाण सहित। मात्र ₹501।",
        "why": [
            "कालसर्प का नाम सुनकर लोग डर जाते हैं, पर बहुत बार यह योग होता ही नहीं, या केवल आंशिक होता है।",
            "बिना जाँचे महँगी पूजा कराने से पहले यह जानना ज़रूरी है कि आपकी कुंडली में सच में क्या है।",
            "यह रिपोर्ट राहु-केतु से बनने वाले हर शास्त्रीय योग को अलग से जाँचती है, ताकि आपको पूरी और सही तस्वीर मिले।",
        ],
        "gets": [
            "कालसर्प योग: हाँ या नहीं, पूर्ण या आंशिक, और 12 में से कौन-सा प्रकार",
            "सर्प-योग, सर्प-शाप, सर्प-भय, ग्रहण-जन्म जैसे 25 शास्त्रीय नियमों की जाँच",
            "हर नियम के साथ मूल श्लोक, ग्रंथ, अध्याय और पृष्ठ",
            "शास्त्रोक्त शान्ति व उपाय, और A4 PDF",
        ],
        "wa": "अभी तक आपने अपनी कालसर्प रिपोर्ट नहीं देखी? क्या आपकी कुंडली में सच में कालसर्प योग है, या केवल डर है? मात्र ₹501 में शास्त्र-प्रमाण सहित पूरी रिपोर्ट — आज ही जानिए।",
    },
    {
        "slug": "manglik", "service": "mangal_dosha", "price": 501, "rate": 66, "page": "manglik-dosh-calculator.html",
        "name": "मंगल दोष (मांगलिक) रिपोर्ट",
        "headline": "क्या आप मांगलिक हैं? विवाह से पहले पक्का जानिए",
        "preview": "मंगल दोष है या नहीं, कितना प्रबल है, और किन शास्त्रीय नियमों से दोष शान्त हो जाता है — पूरी रिपोर्ट मात्र ₹501 में।",
        "why": [
            "रिश्ता तय करते समय सबसे पहले पूछा जाता है: लड़का या लड़की मांगलिक तो नहीं?",
            "बहुत-सी कुंडलियों में मंगल दोष शास्त्र के अपवाद-नियमों से अपने-आप शान्त हो जाता है, पर यह बात कोई बताता नहीं।",
            "सही जानकारी से अच्छे रिश्ते केवल डर के कारण नहीं छूटते।",
        ],
        "gets": [
            "लग्न, चन्द्र और शुक्र से मंगल दोष की जाँच",
            "दोष कितना प्रबल है और कौन-से अपवाद लागू होते हैं",
            "विवाह के लिए उचित सलाह और शास्त्रीय उपाय",
            "कुंडली चार्ट सहित A4 PDF",
        ],
        "wa": "अभी तक आपने अपनी मांगलिक रिपोर्ट नहीं देखी? रिश्ता तय करने से पहले जानिए कि मंगल दोष सच में है या शास्त्र के नियम से शान्त हो चुका है। मात्र ₹501 में — आज ही जानिए।",
    },
    {
        "slug": "dhan-yoga", "service": "dhana_yoga", "price": 501, "rate": 66, "page": "dhan-yoga-calculator.html",
        "name": "धन योग रिपोर्ट",
        "headline": "आपकी कुंडली में धन के कौन-से योग हैं?",
        "preview": "कुंडली के धन योग, लक्ष्मी योग और धन आने का समय — शास्त्रीय नियमों से पूरी रिपोर्ट मात्र ₹501 में।",
        "why": [
            "मेहनत बहुत, पर पैसा टिकता नहीं? कुंडली बताती है कि धन किस रास्ते से और कब आता है।",
            "धन भाव, लाभ भाव और उनके स्वामियों की स्थिति से असली धन योग बनते हैं।",
            "सही समय जानकर बड़े आर्थिक निर्णय सोच-समझकर लिए जा सकते हैं।",
        ],
        "gets": [
            "आपकी कुंडली में बने शास्त्रीय धन योग और लक्ष्मी योग",
            "धन भाव और लाभ भाव का विश्लेषण",
            "दशा के अनुसार धन का समय",
        ],
        "wa": "अभी तक आपने अपनी धन योग रिपोर्ट नहीं देखी? आपकी कुंडली में धन के कौन-से योग हैं और पैसा कब, किस रास्ते से आएगा — मात्र ₹501 में आज ही जानिए।",
    },
    {
        "slug": "gun-milan", "service": "gun_milan_manglik", "price": 1101, "rate": 66, "page": "gun-milan.html",
        "name": "गुण मिलान + मांगलिक रिपोर्ट",
        "headline": "शादी से पहले कुंडली मिलान: 36 में से कितने गुण?",
        "preview": "अष्टकूट गुण मिलान, नाड़ी-भकूट दोष और दोनों की मांगलिक जाँच एक साथ — पूरी रिपोर्ट मात्र ₹1,101 में।",
        "why": [
            "विवाह जीवन भर का निर्णय है; कुंडली मिलान उसकी पहली जाँच है।",
            "केवल गुणों की गिनती काफ़ी नहीं; नाड़ी, भकूट और मंगल दोष भी देखने पड़ते हैं।",
            "एक ही रिपोर्ट में दोनों पक्षों की पूरी जाँच मिलती है।",
        ],
        "gets": [
            "अष्टकूट गुण मिलान: 36 में से अंक, हर कूट का अर्थ",
            "नाड़ी और भकूट दोष की जाँच और परिहार",
            "वर और कन्या दोनों की मांगलिक जाँच",
        ],
        "wa": "शादी की बात चल रही है? अभी तक कुंडली मिलान की पूरी रिपोर्ट नहीं देखी? 36 गुण, नाड़ी-भकूट दोष और दोनों की मांगलिक जाँच — मात्र ₹1,101 में आज ही जानिए।",
    },
    {
        "slug": "parashara", "service": "parashara_report", "price": 1111, "rate": 66, "page": "parashara-report.html",
        "name": "मेगा पाराशर रिपोर्ट",
        "headline": "आपकी पूरी कुंडली, महर्षि पाराशर के नियमों से",
        "preview": "बृहत्पाराशर होराशास्त्र के नियमों से आपकी पूरी जन्मकुंडली का विस्तृत विश्लेषण — मात्र ₹1,111 में।",
        "why": [
            "एक ही रिपोर्ट में जीवन के हर पक्ष की जाँच: स्वास्थ्य, धन, करियर, विवाह, संतान।",
            "हर बात महर्षि पाराशर के मूल ग्रंथ के नियमों पर आधारित है, अंदाज़े पर नहीं।",
            "दशा से पता चलता है कि कौन-सा समय किस काम के लिए अच्छा है।",
        ],
        "gets": [
            "बारह भावों का विस्तृत विश्लेषण",
            "ग्रहों का बल, योग और दशा-फल",
            "जीवन के मुख्य पक्षों पर शास्त्रीय फल और उपाय",
            "विस्तृत A4 PDF रिपोर्ट",
        ],
        "wa": "अभी तक आपने अपनी पूरी कुंडली की पाराशर रिपोर्ट नहीं देखी? स्वास्थ्य, धन, करियर, विवाह — सब कुछ महर्षि पाराशर के नियमों से, मात्र ₹1,111 में। आज ही जानिए।",
    },
    {
        "slug": "vivah-muhurta", "service": "muhurta_vivah", "price": 2100, "rate": 66, "page": "vmm.html",
        "name": "विवाह मुहूर्त",
        "headline": "शुभ विवाह के लिए शास्त्रीय मुहूर्त",
        "preview": "वर-कन्या की कुंडली के अनुसार मुहूर्त चिन्तामणि के नियमों से शुद्ध विवाह मुहूर्त — मात्र ₹2,100 में।",
        "why": [
            "विवाह का दिन जीवन भर याद रहता है; उसका शुभ होना ज़रूरी है।",
            "पंचांग का सामान्य मुहूर्त सबके लिए एक होता है; यहाँ वर-कन्या की अपनी कुंडली से मुहूर्त निकलता है।",
            "हर दिन की शुद्धि-अशुद्धि का कारण साफ़ लिखा मिलता है।",
        ],
        "gets": [
            "वर-कन्या के लिए शुद्ध विवाह तिथियाँ और लग्न-समय",
            "तिथि, वार, नक्षत्र, योग और लग्न शुद्धि की जाँच",
            "मुहूर्त चिन्तामणि के नियमों पर आधारित",
            "A4 PDF",
        ],
        "wa": "घर में शादी है? अभी तक वर-कन्या की कुंडली से विवाह मुहूर्त नहीं निकलवाया? मुहूर्त चिन्तामणि के नियमों से शुद्ध मुहूर्त — मात्र ₹2,100 में आज ही जानिए।",
    },
    {
        "slug": "vastu-muhurta", "service": "muhurta_vastu", "price": 1551, "rate": 66, "page": "vastu-muhurta.html",
        "name": "वास्तु (नींव / गृह प्रवेश) मुहूर्त",
        "headline": "नए घर के लिए शुभ मुहूर्त",
        "preview": "नींव (शिलान्यास) और गृह प्रवेश के लिए आपकी कुंडली से शास्त्रीय मुहूर्त — मात्र ₹1,551 में।",
        "why": [
            "घर जीवन की सबसे बड़ी पूँजी है; उसकी शुरुआत शुभ समय पर होनी चाहिए।",
            "नींव और गृह प्रवेश के मुहूर्त के नियम अलग-अलग होते हैं।",
            "आपकी अपनी कुंडली से मुहूर्त, सबके लिए एक जैसा नहीं।",
        ],
        "gets": [
            "नींव (शिलान्यास) और गृह प्रवेश की शुभ तिथियाँ",
            "तिथि, वार, नक्षत्र और लग्न शुद्धि",
            "शास्त्रीय नियमों पर आधारित",
            "A4 PDF",
        ],
        "wa": "नया घर ले रहे हैं या बनवा रहे हैं? अभी तक नींव या गृह प्रवेश का मुहूर्त नहीं देखा? आपकी कुंडली से शुद्ध मुहूर्त — मात्र ₹1,551 में आज ही जानिए।",
    },
    {
        "slug": "yajnopavita-muhurta", "service": "muhurta_yajno", "price": 1551, "rate": 66, "page": "yajnopavita.html",
        "name": "यज्ञोपवीत (जनेऊ) मुहूर्त",
        "headline": "यज्ञोपवीत संस्कार का शास्त्रीय मुहूर्त",
        "preview": "बटुक की कुंडली के अनुसार यज्ञोपवीत संस्कार का शुद्ध मुहूर्त — मात्र ₹1,551 में।",
        "why": [
            "यज्ञोपवीत सोलह संस्कारों में से एक प्रमुख संस्कार है।",
            "इसके मुहूर्त में बटुक की आयु, वर्ण और कुंडली का विचार होता है।",
            "सही मुहूर्त से संस्कार शास्त्र-सम्मत होता है।",
        ],
        "gets": [
            "बटुक के लिए शुद्ध तिथियाँ और समय",
            "तिथि, वार, नक्षत्र, लग्न और गुरु-शुद्धि की जाँच",
            "शास्त्रीय नियमों पर आधारित",
        ],
        "wa": "घर में जनेऊ संस्कार है? बटुक की कुंडली से शुद्ध यज्ञोपवीत मुहूर्त — मात्र ₹1,551 में आज ही जानिए।",
    },
    {
        "slug": "mundan-muhurta", "service": "muhurta_mundan", "price": 1551, "rate": 66, "page": "mmm.html",
        "name": "मुंडन (चूडाकर्म) मुहूर्त",
        "headline": "बच्चे के मुंडन का शास्त्रीय मुहूर्त",
        "preview": "बच्चे की कुंडली के अनुसार मुंडन (चूडाकर्म) संस्कार का शुद्ध मुहूर्त — मात्र ₹1,551 में।",
        "why": [
            "मुंडन बच्चे का पहला बड़ा संस्कार है।",
            "इसके मुहूर्त में बच्चे की आयु, माता की स्थिति और कुंडली का विचार होता है।",
            "शुभ मुहूर्त में किया संस्कार परिवार को संतोष देता है।",
        ],
        "gets": [
            "बच्चे के लिए शुद्ध मुंडन तिथियाँ और समय",
            "तिथि, वार, नक्षत्र और लग्न शुद्धि",
            "शास्त्रीय नियमों पर आधारित",
        ],
        "wa": "बच्चे का मुंडन कराना है? उसकी कुंडली से शुद्ध चूडाकर्म मुहूर्त — मात्र ₹1,551 में आज ही जानिए।",
    },
    {
        "slug": "jyotish-course", "service": "consultation_gurukul", "price": 24000, "rate": 30, "page": "course.html",
        "name": "1-वर्षीय वैदिक ज्योतिष कोर्स",
        "headline": "ज्योतिष सीखिए, शास्त्र से",
        "preview": "एक वर्ष का वैदिक ज्योतिष कोर्स: लाइव कक्षाएँ, रिकॉर्डिंग, प्रमाणपत्र। हर बैच में केवल 11 सीटें। ₹24,000, EMI उपलब्ध।",
        "why": [
            "ज्योतिष को अंधविश्वास नहीं, शास्त्र की तरह सीखिए: मूल ग्रंथों से।",
            "फ़ाउंडेशन बैच शुरुआत से, मास्टर बैच पहले से ज्ञान रखने वालों के लिए।",
            "हर बैच में केवल 11 सीटें, ताकि हर विद्यार्थी पर ध्यान दिया जा सके।",
        ],
        "gets": [
            "पूरे वर्ष लाइव कक्षाएँ और रिकॉर्डिंग",
            "मूल ग्रंथों से अध्ययन और अभ्यास",
            "कोर्स पूरा होने पर प्रमाणपत्र",
            "EMI की सुविधा",
        ],
        "wa": "ज्योतिष सीखना चाहते हैं? श्री राम जी एस्ट्रो का 1-वर्षीय वैदिक ज्योतिष कोर्स: लाइव कक्षाएँ, हर बैच में केवल 11 सीटें, EMI उपलब्ध।",
    },
]


def commission(price: int, rate: int) -> int:
    """Same arithmetic as commission_for_payment() on the server."""
    net_paise = price * 100 * 100 // (100 + GST)
    return (net_paise * rate // 100) // 100


def inr(n: int) -> str:
    s = str(n)
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts) + "," + tail


def page(o: dict) -> str:
    e = html.escape
    url = f"{SITE}/offer/{o['slug']}.html"
    why = "".join(f"<li>{e(w)}</li>" for w in o["why"])
    gets = "".join(f"<li>{e(g)}</li>" for g in o["gets"])
    price = inr(o["price"])
    return f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Built by scripts/build_offer_pages.py; edit the data there, not this file. -->
<title>{e(o['name'])} — ₹{price} | श्री राम जी एस्ट्रो</title>
<meta name="description" content="{e(o['preview'])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="श्री राम जी एस्ट्रो">
<meta property="og:title" content="{e(o['headline'])} — {e(o['name'])}, ₹{price}">
<meta property="og:description" content="{e(o['preview'])}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/logo.jpg">
<meta name="twitter:card" content="summary">
<link rel="icon" href="../logo.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="offer.css">
</head>
<body>
<header class="of-top"><a href="../index.html"><img src="../logo.jpg" alt=""> श्री राम जी एस्ट्रो</a></header>
<main class="of-wrap">
  <section class="of-hero">
    <p class="of-kicker">{e(o['name'])}</p>
    <h1>{e(o['headline'])}</h1>
    <p class="of-lead">{e(o['preview'])}</p>
    <a class="of-btn of-go" href="../{o['page']}">₹{price} — अभी शुरू करें</a>
    <p class="of-note">GST सहित · Razorpay से सुरक्षित भुगतान · UPI, कार्ड, नेट बैंकिंग</p>
  </section>
  <section class="of-card">
    <h2>यह क्यों ज़रूरी है</h2>
    <ul>{why}</ul>
  </section>
  <section class="of-card">
    <h2>आपको क्या मिलेगा</h2>
    <ul class="of-ticks">{gets}</ul>
  </section>
  <section class="of-card of-pay">
    <div><span>{e(o['name'])}</span><b>₹{price}</b></div>
    <a class="of-btn of-go" href="../{o['page']}">अभी भुगतान करें</a>
    <p class="of-note">भुगतान के लिए अगले पेज पर अपना जन्म-विवरण भरें। सहायता: support@shriramjiastro.in</p>
  </section>
</main>
<div class="of-bar"><span>₹{price}</span><a class="of-btn of-go" href="../{o['page']}">अभी शुरू करें</a></div>
<script src="../sra-coupon-engine.js"></script>
<script>
  // Keep the Sutradhar's ?ref= on the next page too (it is also saved by sra-coupon-engine.js)
  (function () {{
    var ref = new URLSearchParams(location.search).get('ref');
    if (!ref) return;
    document.querySelectorAll('a.of-go').forEach(function (a) {{
      a.href += (a.href.indexOf('?') < 0 ? '?' : '&') + 'ref=' + encodeURIComponent(ref);
    }});
  }})();
</script>
<script src="../sra-translate.js" defer></script>
<script src="../sra-i18n.js" defer></script>
<script src="../sra-analytics.js" defer></script>
</body>
</html>
"""


CSS = """/* Offer pages (offer/*.html), built by scripts/build_offer_pages.py */
:root { --ink:#111827; --muted:#4b5563; --line:#e5e7eb; --blue:#2563eb; --blue-d:#1d4ed8; --bg:#f8fafc; }
* { box-sizing: border-box; }
body { margin:0; font-family:'Noto Sans Devanagari', system-ui, sans-serif; color:var(--ink); background:var(--bg); line-height:1.6; padding-bottom:76px; }
.of-top { background:#fff; border-bottom:1px solid var(--line); padding:10px 16px; }
.of-top a { display:flex; align-items:center; gap:10px; color:var(--ink); font-weight:700; text-decoration:none; max-width:720px; margin:0 auto; }
.of-top img { width:34px; height:34px; border-radius:50%; }
.of-wrap { max-width:720px; margin:0 auto; padding:18px 16px 30px; }
.of-hero { padding:22px 4px 18px; animation:ofIn .5s cubic-bezier(.2,.8,.2,1) both; }
.of-kicker { margin:0 0 6px; color:var(--blue); font-weight:700; font-size:14px; }
.of-hero h1 { margin:0 0 10px; font-size:clamp(24px, 6vw, 34px); line-height:1.3; }
.of-lead { margin:0 0 18px; color:var(--muted); font-size:16.5px; }
.of-btn { display:inline-block; background:var(--blue); color:#fff; font-weight:700; font-size:17px; padding:13px 22px; border-radius:12px; text-decoration:none; transition:transform .15s, background .15s, box-shadow .15s; box-shadow:0 6px 18px rgba(37,99,235,.25); }
.of-btn:hover { background:var(--blue-d); transform:translateY(-1px); }
.of-btn:active { transform:scale(.97); }
.of-go::after { content:"→"; display:inline-block; margin-left:.45em; transition:transform .22s cubic-bezier(.2,.8,.2,1); }
.of-go:hover::after { transform:translateX(5px); } .of-go:active::after { transform:translateX(8px); }
@media (hover:none) { .of-go::after { animation:ofNudge 3.6s cubic-bezier(.2,.8,.2,1) infinite; } }
@keyframes ofNudge { 0%, 78%, 100% { transform:none; } 86% { transform:translateX(5px); } 92% { transform:translateX(1px); } }
.of-note { margin:10px 0 0; color:var(--muted); font-size:13px; }
.of-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:18px 18px 8px; margin-top:14px; animation:ofIn .5s cubic-bezier(.2,.8,.2,1) both; }
.of-card:nth-of-type(2) { animation-delay:.06s; } .of-card:nth-of-type(3) { animation-delay:.12s; } .of-card:nth-of-type(4) { animation-delay:.18s; }
.of-card h2 { margin:0 0 8px; font-size:19px; }
.of-card ul { margin:0 0 10px; padding-left:20px; }
.of-card li { margin-bottom:8px; font-size:15.5px; }
.of-ticks { list-style:none; padding-left:0 !important; }
.of-ticks li { padding-left:24px; position:relative; }
.of-ticks li::before { content:'✓'; position:absolute; left:0; color:var(--blue); font-weight:700; }
.of-pay { padding-bottom:16px; }
.of-pay div { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; font-weight:600; }
.of-pay b { font-size:28px; }
.of-pay .of-btn { width:100%; text-align:center; }
.of-bar { position:fixed; left:0; right:0; bottom:0; background:#fff; border-top:1px solid var(--line); padding:10px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; box-shadow:0 -4px 16px rgba(0,0,0,.06); }
.of-bar span { font-weight:700; font-size:20px; }
.of-bar .of-btn { padding:11px 18px; font-size:16px; }
@keyframes ofIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) { .of-hero, .of-card, .of-go::after { animation:none; } .of-btn { transition:none; } }
"""


def main():
    out = ROOT / "offer"
    out.mkdir(exist_ok=True)
    (out / "offer.css").write_text(CSS, encoding="utf-8")
    for o in OFFERS:
        (out / f"{o['slug']}.html").write_text(page(o), encoding="utf-8")
    portal = [{
        "slug": o["slug"], "service": o["service"], "name": o["name"], "price": o["price"],
        "commission": commission(o["price"], o["rate"]), "wa": o["wa"],
    } for o in OFFERS]
    js = ("/* Built by scripts/build_offer_pages.py — the report links a Sutradhar can send (sutradhar.html). */\n"
          "window.SRA_OFFERS = " + json.dumps(portal, ensure_ascii=False, indent=1) + ";\n")
    (ROOT / "sra-offers.js").write_text(js, encoding="utf-8")
    print(f"{len(OFFERS)} offer pages written to {out}")


if __name__ == "__main__":
    main()
