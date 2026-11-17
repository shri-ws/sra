"""
30 ways of saying the daily personalised panchang (personalized_panchang_engine.py).

The engine decides every fact from the person's chart and today's transits: the panchang,
the dashas, chandra bal, tara bal, the Saturn/Jupiter transit, ashtakavarga, cautions,
go-aheads and the life-area lines. A voice only words them: greeting, how the panchang line
and the dasha reading are put, the section headings, and the closing. Facts go in through
{placeholders}; no voice adds or changes a fact.

Each person gets a different voice every day and none repeats within 30 days
(voice = (date + a fixed number from the person's birth details) mod 30).
"""
from __future__ import annotations

import hashlib
from datetime import date
from typing import Any, Dict

# Placeholders available to every frame:
#  {name} {masa} {paksha} {tithi} {nakshatra} {moon_rashi} {vaar}
#  {maha} {antar} {pratyantar} {sukshma} {yogini}
#  {chandra}  chandra bal sentence     {tara}   tara bal sentence
#  {gochar}   Saturn & Jupiter transit {av}     ashtakavarga sentence
#  {mood}     अच्छा / सामान्य / संभलकर चलने वाला   {score}  0-100
#  {focus}    life area of the running dasha        {today_area} where the mind goes today
#  {headline} the day's one-line verdict
VOICES = [
    {  # 1 warm elder
        "greet": "{name} जी, नमस्कार! आशा है आपकी सुबह अच्छी शुरू हुई होगी।",
        "line": "आज {masa} मास, {paksha} की {tithi} तिथि है। आज {nakshatra} नक्षत्र है और चन्द्रमा {moon_rashi} राशि में है।",
        "lead": "देखते हैं, आज की ग्रह दशा आपकी कुण्डली के अनुसार कैसा फल देगी।",
        "dasha": "अभी आपकी {maha} महादशा में {antar} की अन्तर्दशा, {pratyantar} की प्रत्यन्तर्दशा और {sukshma} की सूक्ष्म दशा चल रही है; योगिनी दशा {yogini} की है। गोचर में {gochar}। चन्द्र बल: {chandra}। तारा बल: {tara}। {av}। इन सबको मिलाकर आज का दिन {mood} रहेगा ({score}/100)।",
        "h_savdhani": "इन बातों में सावधानी रखें", "h_aage": "इन कामों में आगे बढ़ सकते हैं",
        "h_dhyan": "आज इनका ध्यान रखें", "h_upay": "आज का उपाय",
        "close": "बस इतना ध्यान रखिए, बाकी दिन शुभ हो!",
        "short": "{name} जी, {headline}",
    },
    {  # 2 morning tea chat
        "greet": "सुप्रभात {name} जी! चाय के साथ आज का पंचांग देख लेते हैं।",
        "line": "पंचांग कहता है — {masa} का महीना, {paksha}, तिथि {tithi}। नक्षत्र {nakshatra} है और चन्दा मामा आज {moon_rashi} में हैं।",
        "lead": "अब ज़रा आपकी कुण्डली से आज का मेल मिलाते हैं।",
        "dasha": "आपकी कुण्डली में {maha}–{antar} की दशा चल रही है, और इन दिनों {pratyantar} की प्रत्यन्तर्दशा व {sukshma} की सूक्ष्म दशा का असर है (योगिनी: {yogini})। आसमान में {gochar}। आज चन्द्रमा की स्थिति यह है — {chandra}, और तारा है {tara}। {av}। कुल मिलाकर दिन {mood} है — {score} में से 100।",
        "h_savdhani": "ज़रा संभलकर", "h_aage": "इनमें हाथ आज़माइए",
        "h_dhyan": "आज की छोटी-छोटी बातें", "h_upay": "आज का छोटा-सा उपाय",
        "close": "चलिए, दिन मज़े से बिताइए!",
        "short": "सुप्रभात {name} जी — {headline}",
    },
    {  # 3 crisp guide
        "greet": "{name} जी, आज का आपका व्यक्तिगत पंचांग तैयार है।",
        "line": "तिथि: {masa} {paksha} {tithi}। नक्षत्र: {nakshatra}। चन्द्र राशि: {moon_rashi}।",
        "lead": "आपकी कुण्डली और आज के गोचर का सार:",
        "dasha": "दशा — {maha} / {antar} / {pratyantar} / सूक्ष्म {sukshma}; योगिनी {yogini}। गोचर — {gochar}। चन्द्र बल — {chandra}। तारा बल — {tara}। {av}। परिणाम: दिन {mood}, अंक {score}/100।",
        "h_savdhani": "सावधानी", "h_aage": "आगे बढ़ें", "h_dhyan": "ध्यान दें", "h_upay": "उपाय",
        "close": "आज का दिन सफल हो।",
        "short": "{name} जी: {headline}",
    },
    {  # 4 storyteller
        "greet": "{name} जी, प्रणाम। आइए, आज के आकाश की कहानी आपकी कुण्डली के साथ पढ़ें।",
        "line": "आज {vaar} है — {masa} मास के {paksha} की {tithi}। चन्द्रमा {nakshatra} नक्षत्र में होकर {moon_rashi} राशि में विचर रहे हैं।",
        "lead": "अब देखें कि यह आकाश आपकी कुण्डली से क्या कह रहा है।",
        "dasha": "आपके जीवन की घड़ी अभी {maha} की महादशा पर है, जिसमें {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा के रूप में आगे बढ़ रही है; योगिनी {yogini} है। बड़े ग्रहों में {gochar}। मन के कारक चन्द्रमा की बात करें तो {chandra}, और नक्षत्रों की चाल से {tara}। {av}। इसलिए आज का दिन {mood} कहा जाएगा ({score}/100)।",
        "h_savdhani": "जहाँ थोड़ा रुककर चलना है", "h_aage": "जहाँ क़दम बढ़ाना है",
        "h_dhyan": "जीवन के इन पहलुओं पर नज़र", "h_upay": "आज का शुभ उपाय",
        "close": "ईश्वर आपका दिन मंगलमय करें।",
        "short": "{name} जी, आज का संकेत: {headline}",
    },
    {  # 5 friendly coach
        "greet": "हैलो {name} जी! आज के दिन का प्लान बनाते हैं।",
        "line": "आज {masa} मास, {paksha}, {tithi} तिथि। नक्षत्र {nakshatra}, और चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली के हिसाब से आज की स्थिति कुछ ऐसी है —",
        "dasha": "चल रही दशा: {maha} महादशा → {antar} अन्तर्दशा → {pratyantar} प्रत्यन्तर्दशा → {sukshma} सूक्ष्म दशा (योगिनी {yogini})। गोचर: {gochar}। चन्द्र बल: {chandra}। तारा बल: {tara}। {av}। स्कोर {score}/100 — यानी दिन {mood}।",
        "h_savdhani": "आज इनसे बचिए", "h_aage": "आज ये कर डालिए",
        "h_dhyan": "आज का बैलेंस चेक", "h_upay": "आज का बूस्टर उपाय",
        "close": "आपका दिन बढ़िया जाए!",
        "short": "{name} जी, आज का प्लान: {headline}",
    },
    {  # 6 traditional pandit
        "greet": "जय श्री राम {name} जी।",
        "line": "आज {masa} मास, {paksha}, {tithi} तिथि, {vaar} है। {nakshatra} नक्षत्र में चन्द्रदेव {moon_rashi} राशि में स्थित हैं।",
        "lead": "अब आपकी जन्म कुण्डली से आज के ग्रहों का फल विचारते हैं।",
        "dasha": "आपकी {maha} महादशा, {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा एवं {sukshma} सूक्ष्म दशा प्रभावी है; योगिनी दशा {yogini} की है। गोचर में {gochar}। चन्द्र बल विचार: {chandra}। तारा बल विचार: {tara}। {av}। अतः आज का दिन {mood} फल देने वाला है ({score}/100)।",
        "h_savdhani": "सावधानी के विषय", "h_aage": "शुभ कार्य जिनमें प्रवृत्त हों",
        "h_dhyan": "दिनचर्या में विचारणीय", "h_upay": "शान्ति उपाय",
        "close": "प्रभु श्री राम की कृपा बनी रहे।",
        "short": "जय श्री राम {name} जी — {headline}",
    },
    {  # 7 gentle friend
        "greet": "{name} जी, कैसे हैं आप? आज के दिन पर एक नज़र डालते हैं।",
        "line": "आज {masa} की {paksha} {tithi} है, नक्षत्र {nakshatra} और चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली के साथ इसे मिलाकर देखा तो —",
        "dasha": "इन दिनों आप {maha} की महादशा और {antar} की अन्तर्दशा से गुज़र रहे हैं; ख़ास तौर पर {pratyantar} की प्रत्यन्तर्दशा और {sukshma} की सूक्ष्म दशा आज का रंग तय कर रही हैं (योगिनी {yogini})। {gochar}। {chandra}। {tara}। {av}। तो दिन {mood} रहने वाला है ({score}/100)।",
        "h_savdhani": "थोड़ा ध्यान से", "h_aage": "इनमें मन लगाइए",
        "h_dhyan": "अपना और अपनों का ख़याल", "h_upay": "आज के लिए एक उपाय",
        "close": "ख़ुश रहिए, मुस्कुराते रहिए।",
        "short": "{name} जी, आज — {headline}",
    },
    {  # 8 straight talk
        "greet": "{name} जी, सीधी बात — आज का दिन ऐसा है।",
        "line": "{masa} मास, {paksha}, {tithi}; नक्षत्र {nakshatra}; चन्द्रमा {moon_rashi} में।",
        "lead": "आपकी कुण्डली पर इसका असर:",
        "dasha": "दशा {maha}–{antar}, प्रत्यन्तर {pratyantar}, सूक्ष्म {sukshma}, योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। फ़ैसला: दिन {mood} ({score}/100)।",
        "h_savdhani": "मत कीजिए", "h_aage": "कीजिए", "h_dhyan": "पाँच बातें", "h_upay": "उपाय",
        "close": "बस, इतना याद रखिए।",
        "short": "{name} जी — {headline}",
    },
    {  # 9 poetic
        "greet": "{name} जी, नई सुबह, नई उम्मीद — नमस्कार!",
        "line": "{masa} मास की {paksha} {tithi} आज आई है; {nakshatra} नक्षत्र में चन्द्रमा {moon_rashi} राशि को रोशन कर रहे हैं।",
        "lead": "आइए देखें, आपकी कुण्डली के तारे आज कौन-सा गीत गा रहे हैं।",
        "dasha": "{maha} की महादशा की छाँव में {antar} की अन्तर्दशा चल रही है, और {pratyantar} की प्रत्यन्तर्दशा व {sukshma} की सूक्ष्म दशा आज के सुर सजा रही हैं; योगिनी {yogini} है। {gochar}। {chandra}। {tara}। {av}। आज का सुर {mood} है ({score}/100)।",
        "h_savdhani": "जहाँ क़दम धीमे रखें", "h_aage": "जहाँ पंख फैलाएँ",
        "h_dhyan": "दिल, घर और सेहत की बातें", "h_upay": "आज की साधना",
        "close": "आपका दिन सुन्दर और सफल हो।",
        "short": "नई सुबह, {name} जी — {headline}",
    },
    {  # 10 caring parent
        "greet": "{name}, ढेर सारा आशीर्वाद! आज का दिन देख लेते हैं।",
        "line": "आज {masa} महीने का {paksha} है, {tithi} तिथि, {nakshatra} नक्षत्र, और चन्द्रमा {moon_rashi} राशि में हैं।",
        "lead": "तुम्हारी कुण्डली के हिसाब से आज कुछ बातें ध्यान रखने वाली हैं।",
        "dasha": "अभी {maha} की महादशा और {antar} की अन्तर्दशा चल रही है; इन दिनों {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा है, योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। कुल मिलाकर दिन {mood} है ({score}/100)।",
        "h_savdhani": "इनसे बचकर रहना", "h_aage": "ये काम आज कर लेना",
        "h_dhyan": "इनका ख़याल रखना", "h_upay": "आज यह ज़रूर करना",
        "close": "ख़ुश रहो, आगे बढ़ो।",
        "short": "{name}, आशीर्वाद — {headline}",
    },
    {  # 11 news-anchor
        "greet": "नमस्कार {name} जी, आज की ग्रह-ख़बरें आपके लिए।",
        "line": "आज की मुख्य ख़बर: {masa} मास, {paksha}, {tithi}। नक्षत्र {nakshatra}, चन्द्रमा {moon_rashi} में।",
        "lead": "अब आपकी कुण्डली से जुड़ी ख़ास रिपोर्ट —",
        "dasha": "दशा अपडेट: {maha} महादशा, {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा, {sukshma} सूक्ष्म दशा; योगिनी {yogini}। गोचर अपडेट: {gochar}। चन्द्र रिपोर्ट: {chandra}। तारा रिपोर्ट: {tara}। {av}। आज का मौसम: {mood} ({score}/100)।",
        "h_savdhani": "चेतावनी", "h_aage": "अवसर", "h_dhyan": "आज के मुख्य विषय", "h_upay": "आज का उपाय",
        "close": "इतनी थी आज की ख़बर — दिन शुभ हो।",
        "short": "{name} जी, आज की ख़बर: {headline}",
    },
    {  # 12 devotional
        "greet": "हरि ॐ {name} जी।",
        "line": "आज {masa} मास, {paksha} की पावन {tithi} है; {nakshatra} नक्षत्र और चन्द्रमा {moon_rashi} राशि में।",
        "lead": "प्रभु के स्मरण के साथ देखें, आज ग्रह आपके लिए क्या संकेत देते हैं।",
        "dasha": "आपकी {maha} महादशा में {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा चल रही है; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। आज का दिन {mood} है ({score}/100) — ईश्वर पर भरोसा रखकर चलें।",
        "h_savdhani": "संयम रखें", "h_aage": "कृपा का लाभ उठाएँ",
        "h_dhyan": "आज का सदाचार", "h_upay": "आज की आराधना",
        "close": "हरि ॐ, मंगल हो।",
        "short": "हरि ॐ {name} जी — {headline}",
    },
    {  # 13 checklist
        "greet": "{name} जी, आज की चेकलिस्ट तैयार है।",
        "line": "📅 {masa} {paksha} {tithi} • ⭐ {nakshatra} • 🌙 {moon_rashi}",
        "lead": "आपकी कुण्डली से मिलान:",
        "dasha": "दशा: {maha} › {antar} › {pratyantar} › {sukshma} (योगिनी {yogini})। गोचर: {gochar}। चन्द्र: {chandra}। तारा: {tara}। {av}। दिन: {mood} — {score}/100।",
        "h_savdhani": "❌ टालें", "h_aage": "✅ करें", "h_dhyan": "🔎 जाँचें", "h_upay": "🙏 उपाय",
        "close": "चेकलिस्ट पूरी करें, दिन अपना है!",
        "short": "{name} जी की आज की चेकलिस्ट: {headline}",
    },
    {  # 14 philosophical
        "greet": "{name} जी, नमस्ते। समय की चाल को समझकर चलना ही बुद्धिमानी है।",
        "line": "आज काल-चक्र में {masa} मास का {paksha} है, {tithi} तिथि; चन्द्रमा {nakshatra} नक्षत्र से होकर {moon_rashi} राशि में हैं।",
        "lead": "आपकी कुण्डली में यह समय किस रूप में उतरता है, देखते हैं।",
        "dasha": "जीवन का यह अध्याय {maha} की महादशा का है, जिसमें {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा अपना-अपना रंग दे रही हैं; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। इस मेल से आज का दिन {mood} बनता है ({score}/100)।",
        "h_savdhani": "जहाँ विवेक चाहिए", "h_aage": "जहाँ साहस चाहिए",
        "h_dhyan": "संतुलन के पाँच सूत्र", "h_upay": "आज का साधन",
        "close": "समय के साथ चलिए, समय आपके साथ चलेगा।",
        "short": "{name} जी, आज का सूत्र: {headline}",
    },
    {  # 15 brief & bright
        "greet": "{name} जी, गुड मॉर्निंग!",
        "line": "आज: {masa} • {paksha} • {tithi} • {nakshatra} नक्षत्र • चन्द्र {moon_rashi} में",
        "lead": "आपके लिए आज का हाल —",
        "dasha": "{maha}-{antar}-{pratyantar}-{sukshma} दशा, योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। दिन {mood} ({score}/100)।",
        "h_savdhani": "बचें", "h_aage": "बढ़ें", "h_dhyan": "ध्यान", "h_upay": "उपाय",
        "close": "हैव अ ग्रेट डे!",
        "short": "गुड मॉर्निंग {name} जी — {headline}",
    },
    {  # 16 family astrologer on phone
        "greet": "हाँ {name} जी, मैं बोल रहा हूँ — आपके आज के दिन के बारे में बताता हूँ।",
        "line": "देखिए, आज {masa} मास है, {paksha} चल रहा है और तिथि {tithi} है। नक्षत्र {nakshatra} है, चन्द्रमा {moon_rashi} राशि में बैठे हैं।",
        "lead": "अब आपकी कुण्डली खोलकर देखता हूँ...",
        "dasha": "हाँ, तो आपकी {maha} की महादशा चल रही है, उसमें {antar} की अन्तर्दशा है, और इन दिनों {pratyantar} की प्रत्यन्तर्दशा व {sukshma} की सूक्ष्म दशा है; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। मेरी नज़र में आज का दिन {mood} है ({score}/100)।",
        "h_savdhani": "इतना ध्यान रखिएगा", "h_aage": "ये काम बेझिझक कीजिए",
        "h_dhyan": "और हाँ, ये बातें भी", "h_upay": "एक उपाय बता देता हूँ",
        "close": "ठीक है जी, फिर बात करते हैं।",
        "short": "{name} जी, फ़ोन पर बताऊँ तो — {headline}",
    },
    {  # 17 motivational
        "greet": "{name} जी, आज का दिन आपका है — नमस्कार!",
        "line": "आज {masa} मास, {paksha}, {tithi}; {nakshatra} नक्षत्र में चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली बताती है कि आज आपकी ऊर्जा किस ओर बहेगी —",
        "dasha": "{maha} महादशा और {antar} अन्तर्दशा की नींव पर अभी {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा काम कर रही हैं; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। आज का दिन {mood} है ({score}/100) — सही दिशा में ऊर्जा लगाइए।",
        "h_savdhani": "ऊर्जा यहाँ न गँवाएँ", "h_aage": "ऊर्जा यहाँ लगाएँ",
        "h_dhyan": "जीत के पाँच स्तम्भ", "h_upay": "आज का शक्ति उपाय",
        "close": "आगे बढ़िए, आप कर सकते हैं!",
        "short": "{name} जी, आज की दिशा: {headline}",
    },
    {  # 18 calm & mindful
        "greet": "{name} जी, एक गहरी साँस लीजिए... और आज के दिन का स्वागत कीजिए।",
        "line": "आज {masa} मास के {paksha} की {tithi} है। चन्द्रमा {nakshatra} नक्षत्र में, {moon_rashi} राशि में शान्त भाव से हैं।",
        "lead": "आपकी कुण्डली के साथ आज की लय को समझते हैं।",
        "dasha": "आप {maha} महादशा और {antar} अन्तर्दशा में हैं, और {pratyantar} प्रत्यन्तर्दशा व {sukshma} सूक्ष्म दशा आज की लय बना रही हैं; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। आज का दिन {mood} है ({score}/100) — धीरे और सजग रहिए।",
        "h_savdhani": "जहाँ ठहरना है", "h_aage": "जहाँ बहना है",
        "h_dhyan": "मन-तन का ध्यान", "h_upay": "आज का शान्ति अभ्यास",
        "close": "शान्त रहिए, सजग रहिए।",
        "short": "{name} जी, शान्ति से — {headline}",
    },
    {  # 19 business-minded
        "greet": "{name} जी, आज के दिन की ग्रह-रणनीति पेश है।",
        "line": "आज {masa}, {paksha}, {tithi}; नक्षत्र {nakshatra}; चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली के अनुसार आज की स्थिति का विश्लेषण:",
        "dasha": "मुख्य काल: {maha} महादशा, {antar} अन्तर्दशा। अल्पकालीन: {pratyantar} प्रत्यन्तर्दशा, {sukshma} सूक्ष्म दशा; योगिनी {yogini}। बाहरी माहौल (गोचर): {gochar}। मनोबल (चन्द्र बल): {chandra}। अनुकूलता (तारा बल): {tara}। {av}। समग्र आकलन: {mood}, {score}/100।",
        "h_savdhani": "जोखिम", "h_aage": "अवसर", "h_dhyan": "संतुलन सूची", "h_upay": "सहायक उपाय",
        "close": "सोच-समझकर क़दम बढ़ाइए, सफलता मिलेगी।",
        "short": "{name} जी, आज की रणनीति: {headline}",
    },
    {  # 20 rhythmic, simple Hindi
        "greet": "राम-राम {name} जी!",
        "line": "आज {masa} का महीना है, {paksha} है, {tithi} की तिथि है; {nakshatra} नक्षत्र है, चन्द्रमा {moon_rashi} में है।",
        "lead": "आपकी जन्मपत्री में आज क्या लिखा है, सुनिए।",
        "dasha": "{maha} की बड़ी दशा, {antar} की अन्तर्दशा, {pratyantar} की प्रत्यन्तर्दशा और {sukshma} की सूक्ष्म दशा चल रही है; योगिनी {yogini} की है। {gochar}। {chandra}। {tara}। {av}। तो भैया, दिन {mood} है ({score}/100)।",
        "h_savdhani": "ये मत करना", "h_aage": "ये ज़रूर करना",
        "h_dhyan": "घर-बाहर की बातें", "h_upay": "आज का टोटका-उपाय",
        "close": "राम-राम, दिन बढ़िया बीते।",
        "short": "राम-राम {name} जी — {headline}",
    },
    {  # 21 reflective question
        "greet": "{name} जी, आज आप किस काम को सबसे पहले करना चाहेंगे? पहले ग्रह देख लें।",
        "line": "आज {masa} मास, {paksha}, {tithi} तिथि; नक्षत्र {nakshatra}, चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली इस पर क्या कहती है —",
        "dasha": "इस समय {maha}–{antar} दशा के भीतर {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा सक्रिय है; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। जवाब यह है कि दिन {mood} है ({score}/100)।",
        "h_savdhani": "किससे बचें?", "h_aage": "किसमें आगे बढ़ें?",
        "h_dhyan": "किसका ध्यान रखें?", "h_upay": "क्या उपाय करें?",
        "close": "सवाल आपका, जवाब ग्रहों का — दिन शुभ हो।",
        "short": "{name} जी, आज का जवाब: {headline}",
    },
    {  # 22 respectful formal
        "greet": "आदरणीय {name} जी, सादर नमस्कार।",
        "line": "आज {masa} मास, {paksha}, {tithi} तिथि, {vaar}। नक्षत्र {nakshatra}; चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी जन्म कुण्डली के आधार पर आज का फल निम्न है।",
        "dasha": "वर्तमान में {maha} की महादशा, {antar} की अन्तर्दशा, {pratyantar} की प्रत्यन्तर्दशा तथा {sukshma} की सूक्ष्म दशा है; योगिनी दशा {yogini}। गोचर स्थिति: {gochar}। चन्द्र बल: {chandra}। तारा बल: {tara}। {av}। तदनुसार आज का दिन {mood} है ({score}/100)।",
        "h_savdhani": "सावधानियाँ", "h_aage": "अनुकूल कार्य",
        "h_dhyan": "विशेष ध्यान", "h_upay": "अनुशंसित उपाय",
        "close": "शुभकामनाओं सहित।",
        "short": "आदरणीय {name} जी — {headline}",
    },
    {  # 23 sunrise imagery
        "greet": "{name} जी, सूरज निकल आया है — आज की शुरुआत ग्रहों के आशीर्वाद से करें।",
        "line": "आज {vaar}, {masa} मास के {paksha} की {tithi}; {nakshatra} नक्षत्र में चन्द्रमा {moon_rashi} राशि में।",
        "lead": "सूर्योदय के साथ आपकी कुण्डली का आज का संदेश —",
        "dasha": "आपकी {maha} महादशा, {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा और {sukshma} सूक्ष्म दशा आज की रोशनी तय कर रही है; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। आज का उजाला {mood} है ({score}/100)।",
        "h_savdhani": "छाँव वाले हिस्से", "h_aage": "धूप वाले हिस्से",
        "h_dhyan": "दिन भर के लिए", "h_upay": "सुबह का उपाय",
        "close": "दिन रोशन रहे!",
        "short": "{name} जी, आज की रोशनी: {headline}",
    },
    {  # 24 teacher explains
        "greet": "{name} जी, आज ग्रहों की कक्षा में आपका स्वागत है!",
        "line": "आज की तिथि समझिए: {masa} मास, {paksha}, {tithi}। नक्षत्र {nakshatra} है और चन्द्रमा {moon_rashi} राशि में हैं।",
        "lead": "अब इसे आपकी कुण्डली से जोड़ते हैं — आसान भाषा में।",
        "dasha": "पहली बात — दशा: {maha} महादशा, {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा, {sukshma} सूक्ष्म दशा (योगिनी {yogini})। दूसरी — गोचर: {gochar}। तीसरी — चन्द्र बल: {chandra}। चौथी — तारा बल: {tara}। पाँचवीं — {av}। निष्कर्ष: दिन {mood} ({score}/100)।",
        "h_savdhani": "गृहकार्य: इनसे बचें", "h_aage": "गृहकार्य: ये करें",
        "h_dhyan": "पाँच ज़रूरी विषय", "h_upay": "आज का अभ्यास",
        "close": "कक्षा समाप्त — दिन शुभ हो!",
        "short": "{name} जी, आज का पाठ: {headline}",
    },
    {  # 25 neighbourly
        "greet": "अरे {name} जी, नमस्ते! आज का हाल-चाल ग्रहों से पूछ लिया है।",
        "line": "आज {masa} मास का {paksha} है, {tithi} तिथि। नक्षत्र {nakshatra} और चन्द्रमा {moon_rashi} में हैं।",
        "lead": "आपकी कुण्डली से मिलाकर बताऊँ तो —",
        "dasha": "आपकी {maha}-{antar} की दशा चल ही रही है, अभी {pratyantar} की प्रत्यन्तर्दशा और {sukshma} की सूक्ष्म दशा भी है; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। तो दिन {mood} ही समझिए ({score}/100)।",
        "h_savdhani": "इन चक्करों में न पड़ें", "h_aage": "इनमें लग जाइए",
        "h_dhyan": "घर-परिवार-सेहत की बात", "h_upay": "आज का उपाय",
        "close": "चलिए, शाम को मिलते हैं!",
        "short": "नमस्ते {name} जी — {headline}",
    },
    {  # 26 data-first
        "greet": "{name} जी, आज का पंचांग आँकड़ों के साथ।",
        "line": "मास {masa} | पक्ष {paksha} | तिथि {tithi} | नक्षत्र {nakshatra} | चन्द्र {moon_rashi}",
        "lead": "आपकी कुण्डली पर इनका प्रभाव —",
        "dasha": "दशा क्रम {maha} › {antar} › {pratyantar} › {sukshma}; योगिनी {yogini}। गोचर: {gochar}। चन्द्र बल: {chandra}। तारा बल: {tara}। {av}। दिन का अंक {score}/100 — {mood}।",
        "h_savdhani": "सावधानी सूची", "h_aage": "अनुकूल सूची", "h_dhyan": "पाँच क्षेत्र", "h_upay": "उपाय",
        "close": "आँकड़े आपके पक्ष में हों!",
        "short": "{name} जी, आज {score}/100 — {headline}",
    },
    {  # 27 elder sister/brother
        "greet": "{name} जी, अपने किसी बड़े की तरह एक बात कहूँ?",
        "line": "आज {masa} मास, {paksha}, {tithi} है; {nakshatra} नक्षत्र में चन्द्रमा {moon_rashi} राशि में हैं।",
        "lead": "आपकी कुण्डली देखी है, सुनिए —",
        "dasha": "{maha} की महादशा में {antar} की अन्तर्दशा चल रही है, और अभी {pratyantar} प्रत्यन्तर्दशा व {sukshma} सूक्ष्म दशा है; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। मेरी मानें तो दिन {mood} है ({score}/100)।",
        "h_savdhani": "प्लीज़, इनसे बचिए", "h_aage": "हिम्मत करके ये कीजिए",
        "h_dhyan": "अपना ख़याल रखिए", "h_upay": "एक छोटा-सा उपाय",
        "close": "अपना ध्यान रखना!",
        "short": "{name} जी, एक बात — {headline}",
    },
    {  # 28 nature metaphor
        "greet": "{name} जी, नमस्कार। जैसे हर मौसम का अपना मिज़ाज होता है, वैसे हर दिन का भी।",
        "line": "आज {masa} मास का {paksha} है, तिथि {tithi}; चन्द्रमा {nakshatra} नक्षत्र में, {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली में आज का मौसम कैसा है, देखते हैं।",
        "dasha": "आपकी {maha} महादशा और {antar} अन्तर्दशा मौसम की तरह हैं, और {pratyantar} प्रत्यन्तर्दशा व {sukshma} सूक्ष्म दशा आज की हवा; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। आज का मौसम {mood} है ({score}/100)।",
        "h_savdhani": "जहाँ आँधी से बचना है", "h_aage": "जहाँ बीज बोने हैं",
        "h_dhyan": "बगिया की देखभाल", "h_upay": "आज का उपाय",
        "close": "मौसम सुहाना रहे!",
        "short": "{name} जी, आज का मौसम: {headline}",
    },
    {  # 29 concise blessing
        "greet": "शुभ प्रभात {name} जी, मंगल हो।",
        "line": "{masa} मास, {paksha}, {tithi} — {nakshatra} नक्षत्र, चन्द्र {moon_rashi} राशि।",
        "lead": "आपकी कुण्डली अनुसार आज —",
        "dasha": "{maha} महादशा, {antar} अन्तर्दशा, {pratyantar} प्रत्यन्तर्दशा, {sukshma} सूक्ष्म दशा, योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। दिन {mood} ({score}/100)।",
        "h_savdhani": "वर्ज्य", "h_aage": "करणीय", "h_dhyan": "ध्यातव्य", "h_upay": "उपाय",
        "close": "शुभमस्तु।",
        "short": "शुभ प्रभात {name} जी — {headline}",
    },
    {  # 30 journey
        "greet": "{name} जी, आज के सफ़र पर निकलने से पहले रास्ता देख लेते हैं।",
        "line": "आज {masa} मास, {paksha}, {tithi} तिथि है; {nakshatra} नक्षत्र और चन्द्रमा {moon_rashi} राशि में।",
        "lead": "आपकी कुण्डली के नक़्शे पर आज का रास्ता —",
        "dasha": "बड़ा रास्ता {maha} महादशा और {antar} अन्तर्दशा का है, और आज के मोड़ {pratyantar} प्रत्यन्तर्दशा व {sukshma} सूक्ष्म दशा तय कर रहे हैं; योगिनी {yogini}। {gochar}। {chandra}। {tara}। {av}। आज का सफ़र {mood} है ({score}/100)।",
        "h_savdhani": "रास्ते के गड्ढे", "h_aage": "खुली सड़क",
        "h_dhyan": "साथ रखने की चीज़ें", "h_upay": "सफ़र का उपाय",
        "close": "सफ़र सुखद हो!",
        "short": "{name} जी, आज का रास्ता: {headline}",
    },
]
assert len(VOICES) == 30


def person_offset(year: int, month: int, day: int, hour: int, minute: int) -> int:
    key = f"{year:04d}{month:02d}{day:02d}{hour:02d}{minute:02d}".encode()
    return int(hashlib.md5(key).hexdigest()[:8], 16)


def voice_index(on: date, offset: int) -> int:
    """Different every day for a person; no repeat within 30 days."""
    return (on.toordinal() + offset) % len(VOICES)


class _Safe(dict):
    def __missing__(self, key):        # a missing fact leaves the slot empty, never crashes
        return ""


def render(voice_no: int, facts: Dict[str, Any]) -> Dict[str, str]:
    v = VOICES[voice_no % len(VOICES)]
    f = _Safe(facts)
    out = {k: " ".join(v[k].format_map(f).split()) for k in v}
    out["voice"] = voice_no + 1
    return out
