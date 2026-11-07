"""
Shri Ramji Astro (SRA) - BPHS Vedic Content Curator
Curates authentic shlokas, yogas, kundli tips, and remedies from Brihat Parashara Hora Shastra (BPHS),
and synthesizes high-CTR, high-engagement content for YouTube Shorts, Instagram Reels, Facebook, WhatsApp Channel, Quora, and Reddit.
"""

import re
import json
import random
import datetime
from pathlib import Path
import urllib.request
import urllib.error

from .config import BPHS_DB_FILE, load_config

# High-impact curated chapters from BPHS for social media wisdom
CURATED_CHAPTERS = [
    {"ch": 35, "theme": "राजयोग विचार (Supreme Royal Yogas)", "tags": ["rajayoga", "bphs", "success"]},
    {"ch": 41, "theme": "द्वि-ग्रह युति फल (Planetary Conjunction Secrets)", "tags": ["conjunction", "graha", "kundli"]},
    {"ch": 42, "theme": "धन योग सूत्र (Wealth & Prosperity Yogas)", "tags": ["dhanayoga", "wealth", "prosperity"]},
    {"ch": 45, "theme": "दारिद्र्य योग एवं भंग राजयोग (Cancellation of Poverty Yogas)", "tags": ["kemadruma", "remedies", "bhanga"]},
    {"ch": 27, "theme": "षड्बल एवं ग्रह-बल रहस्य (Planetary Potency Secrets)", "tags": ["shadbala", "strength", "planets"]},
    {"ch": 29, "theme": "अष्टकवर्ग रेखा एवं बिन्दु शुद्धि (Ashtakavarga Matrix)", "tags": ["ashtakavarga", "transits", "gochar"]},
    {"ch": 87, "theme": "इष्ट-कष्ट फल एवं आत्मकारक (Soul Planet & Life Purpose)", "tags": ["atmakaraka", "ishtadev", "purpose"]},
    {"ch": 91, "theme": "सूर्य आदि नवग्रह समिधा होम (Vedic Fire Offerings & Samidha)", "tags": ["remedies", "upay", "navagraha"]},
    {"ch": 95, "theme": "अनिष्टग्रह शान्ति विधान (Pacifying Difficult Transits)", "tags": ["shanti", "mantra", "peace"]},
    {"ch": 96, "theme": "महामृत्युंजय कलशस्थापन एवं रक्षा-कवच (Maha Mrityunjaya Shield)", "tags": ["shiva", "mrityunjaya", "protection"]},
    {"ch": 11, "theme": "प्रथम भाव (तनु भाव) देह व व्यक्तित्व विचार (Ascendant & Vitality)", "tags": ["lagna", "personality", "health"]},
    {"ch": 18, "theme": "सप्तम भाव कलत्र एवं वैवाहिक सुख विचार (Spouse & Marriage Yogas)", "tags": ["marriage", "relationship", "7thhouse"]},
    {"ch": 21, "theme": "दशम भाव कर्म, पद-प्रतिष्ठा एवं कीर्ति विचार (Career & Stature)", "tags": ["career", "10thhouse", "leadership"]}
]

def load_bphs_database() -> dict:
    """Load BPHS JSON database."""
    if not BPHS_DB_FILE.exists():
        return {}
    try:
        with open(BPHS_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Curator] Error loading BPHS DB: {e}")
        return {}

def select_daily_topic(date_seed: datetime.date = None) -> dict:
    """Deterministically select a topic and shloka based on the current date."""
    bphs_db = load_bphs_database()
    if not date_seed:
        date_seed = datetime.date.today()
    
    # Day-of-year rotation
    day_num = date_seed.timetuple().tm_yday
    curated = CURATED_CHAPTERS[day_num % len(CURATED_CHAPTERS)]
    ch_key = str(curated["ch"])
    
    chapter_data = bphs_db.get(ch_key, {})
    verses = chapter_data.get("verses", [])
    
    # Pick a high-value verse with valid shloka and bhashya
    valid_verses = [v for v in verses if v.get("shloka") and len(v.get("shloka", "").strip()) > 15]
    if not valid_verses:
        valid_verses = verses if verses else [{
            "verse_label": "श्लोक १",
            "shloka": "शान्तो विनीतः सत्यवादी जितक्रोधो जितेन्द्रियः। दैवज्ञः सर्वशास्त्रज्ञो लोकोपकारकारकः॥",
            "bhashya": "सच्चा दैवज्ञ शांत, विनम्र, सत्यवादी और सर्वशास्त्र का ज्ञाता होकर लोक-कल्याण करने वाला होता है।"
        }]
    
    selected_verse = valid_verses[day_num % len(valid_verses)]
    
    return {
        "date": date_seed.isoformat(),
        "chapter_num": curated["ch"],
        "chapter_title": chapter_data.get("chapter_title_sanskrit", curated["theme"]),
        "chapter_english": chapter_data.get("chapter_title_english", "Vedic Wisdom"),
        "theme": curated["theme"],
        "verse_label": selected_verse.get("verse_label", "श्लोक"),
        "shloka": selected_verse.get("shloka", ""),
        "bhashya": selected_verse.get("bhashya", ""),
        "summary": chapter_data.get("shastra_summary_hindi", ""),
        "tags": curated["tags"]
    }

GEMINI_FALLBACK_MODELS = ["gemini-flash-latest"]

def call_gemini_api(api_key: str, model: str, prompt: str) -> str:
    """Call Google Gemini REST API directly; retries busy errors and falls back to other models."""
    if not api_key:
        return ""
    import time
    models = [model] + [m for m in GEMINI_FALLBACK_MODELS if m != model]
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 8192, "responseMimeType": "application/json"}
    }
    data = json.dumps(payload).encode("utf-8")
    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        for attempt in range(2):
            req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    return res_json["candidates"][0]["content"]["parts"][0]["text"]
            except urllib.error.HTTPError as e:
                print(f"[Curator] Gemini API error ({m}): {e}")
                if e.code not in (429, 500, 503):
                    break
                time.sleep(8 * (attempt + 1))
            except Exception as e:
                print(f"[Curator] Gemini API error ({m}): {e}")
                break
    return ""

def build_video_scenes(topic_data: dict, short_theme: str) -> list:
    """
    High-retention single-narrator cinematic format with human conversational pacing:
    Warm, curious hook -> Classical Parashara shloka -> Plain human explanation ->
    Actionable kundli check rule -> Direct, warm invitation to check chart & comment.
    """
    ch_num = topic_data["chapter_num"]
    summary = (topic_data.get("summary") or "").rstrip("।. ")
    shloka = topic_data["shloka"]
    bhashya = topic_data.get("bhashya", "")
    first_line = re.split(r"[।\n]", shloka)[0]
    shloka_spoken = re.sub(r"॥\s*[०-९\d]+\s*॥|[॥।]", " ", first_line).strip()
    topic = re.sub(r"\s*(रहस्य|सूत्र|विचार)$", "", short_theme)

    return [
        {
            "kind": "hook",
            "badge": "⚡ क्या आपकी कुंडली में है?",
            "display": f"क्या आपकी कुंडली में भी\n**{topic}** है?\nज़रा ध्यान से सुनिए...",
            "narration": f"क्या आपकी कुंडली में भी {topic} का योग बन रहा है? अक्सर लोग इसे लेकर भ्रमित रहते हैं, पर सच कुछ और है।"
        },
        {
            "kind": "shloka",
            "badge": f"📜 अध्याय {ch_num} का गुप्त सूत्र",
            "display": shloka,
            "source": f"बृहत्पाराशरहोराशास्त्रम् • अध्याय {ch_num} • {topic_data['verse_label']}",
            "narration": f"महर्षि पराशर ने बृहत्पाराशर होराशास्त्र में साफ़ कहा है—{shloka_spoken}।"
        },
        {
            "kind": "meaning",
            "badge": "🔍 सीधा और सच्चा अर्थ",
            "display": f"महर्षि पराशर का स्पष्ट नियम:\n**{summary or short_theme}**",
            "narration": f"इसका सीधा अर्थ यह है कि, {summary or bhashya[:85]}। इसलिए बिना समझे कभी घबराना नहीं चाहिए।"
        },
        {
            "kind": "tip",
            "badge": "💡 अपनी कुंडली में यह जाँचें",
            "display": "केवल राशि नहीं —\n**लग्नेश का बल** और\n**भाव-चलित** में ग्रह की असली स्थिति देखें",
            "narration": "एक बात हमेशा याद रखिए—केवल लग्न राशि मत देखिए, लग्नेश का बल और भाव-चलित में ग्रह की असली स्थिति परखिए।"
        },
        {
            "kind": "cta",
            "badge": "🙏 अपना लग्न बताएं",
            "display": "कमेंट में लिखें **अपना लग्न** 👇\nसटीक पत्रिका: **shriramjiastro.in**",
            "narration": "अपनी पूरी जन्मपत्रिका श्री रामजी एस्ट्रो डॉट इन पर मुफ़्त देखिए। रोज़ एक प्रामाणिक सूत्र के लिए सब्सक्राइब कीजिए, और कमेंट में अपना लग्न बताइए।"
        }
    ]

def build_video_scenes_en(topic_data: dict, theme_en: str) -> list:
    """
    Cinematic English vertical video scenes with pure Sanskrit shloka recitation
    and crystal-clear English explanation, practical tips, and CTA.
    """
    ch_num = topic_data["chapter_num"]
    shloka = topic_data["shloka"]
    verse_lbl_en = re.sub(r"श्लोक", "Verse", topic_data.get("verse_label", "Verse"))
    first_line = re.split(r"[।\n]", shloka)[0]
    shloka_spoken = re.sub(r"॥\s*[०-९\d]+\s*॥|[॥।]", " ", first_line).strip()

    return [
        {
            "kind": "hook",
            "lang": "en",
            "voice": "en-US-ChristopherNeural",
            "badge": "VEDIC WISDOM",
            "display": f"Is this rare\n**{theme_en}**\nin your birth chart?",
            "narration": f"Do you have this rare {theme_en} in your birth chart? Sage Parashara reveals the classical truth."
        },
        {
            "kind": "shloka",
            "lang": "sa",
            "voice": "hi-IN-MadhurNeural",
            "badge": f"BPHS • CHAPTER {ch_num}",
            "display": shloka,
            "source": f"Brihat Parashara Hora Shastra • Chapter {ch_num} • {verse_lbl_en}",
            "narration": shloka_spoken
        },
        {
            "kind": "meaning",
            "lang": "en",
            "voice": "en-US-ChristopherNeural",
            "badge": "SACRED MEANING",
            "display": f"Sage Parashara's Principle:\n**{theme_en}**",
            "narration": "This classical formula governs life trajectory and reveals the deeper karmic blueprint behind planetary combinations."
        },
        {
            "kind": "tip",
            "lang": "en",
            "voice": "en-US-ChristopherNeural",
            "badge": "CHART CHECK",
            "display": "Never judge by sign alone —\ncheck **Ascendant Lord strength** &\n**Bhava Chalita** position",
            "narration": "Always remember—never judge by sign alone. Verify your Ascendant Lord's potency and its true position in Bhava Chalita."
        },
        {
            "kind": "cta",
            "lang": "en",
            "voice": "en-US-ChristopherNeural",
            "badge": "YOUR BIRTH CHART",
            "display": "Comment your **Rising Sign** 👇\nFree Chart: **shriramjiastro.in**",
            "narration": "Calculate your authentic birth chart with precision at shriramjiastro.in. Subscribe for daily classical wisdom, and comment your rising sign."
        }
    ]

def generate_social_package(topic_data: dict = None) -> dict:
    """
    Generate an authoritative, captivating, multi-platform social media package.
    Includes YouTube Shorts, Instagram Reels, Facebook, WhatsApp Channel, Quora, and Reddit.
    Always includes prominent website links and trending astrological hashtags.
    """
    config = load_config()
    if not topic_data:
        topic_data = select_daily_topic()
    
    api_key = config["api_keys"].get("gemini_api_key", "").strip()
    model = config["api_keys"].get("gemini_model", "gemini-3.5-flash")
    
    shloka = topic_data["shloka"]
    bhashya = topic_data["bhashya"]
    theme = topic_data["theme"]
    short_theme = theme.split("(")[0].strip()
    ch_num = topic_data["chapter_num"]
    verse_lbl = topic_data["verse_label"]
    
    # 4 distinct slides for visual engine
    slide_1_hook = f"क्या आपकी कुंडली में भी {short_theme} का प्रभाव है?"
    slide_2_shloka = f"{verse_lbl}:\n{shloka}"
    slide_3_analysis = f"महर्षि पराशर सूत्र:\n{bhashya[:130]}..." if len(bhashya) > 130 else f"महर्षि पराशर सूत्र:\n{bhashya}"
    slide_4_remedy = "सटीक वैदिक उपाय:\n१. नित्य वैदिक मंत्र जप व सात्विक आचरण।\n२. लग्नेश व भाव-चलित की स्थिति जांचें।\n३. अपनी कुंडली shriramjiastro.in पर देखें।"
    
    voice_script = (
        f"नमस्ते। आज हम जानेंगे बृहत्पाराशरहोराशास्त्रम् के अध्याय {ch_num} का एक अत्यंत गोपनीय सूत्र। "
        f"महर्षि पराशर बताते हैं—{shloka}। "
        f"इसका गूढ़ अर्थ यह है कि {bhashya}। "
        f"यदि आपकी कुंडली में यह ग्रह स्थिति बन रही है, तो शुभ फलों की वृद्धि और दोष शांति हेतु दैनिक वैदिक नियमों का पालन अवश्य करें। "
        f"अपनी जन्मपत्रिका की सटीक जांच के लिए आज ही श्री रामजी एस्ट्रो पर जाएं।"
    )

    # Standard trending hashtags
    trending_hashtags = "#jyotish #vedicastrology #astrology #kundli #rashifal #horoscope #parashara #shriramjiastro #astrologytips #sanatandharma #shorts #viralastrology"
    ig_hashtags = "#jyotish #vedicastrology #reels #kundli #astrology #rashifal #horoscope #parashara #shriramjiastro #trending #viralreels #astrologytips"
    wa_group_url = "https://chat.whatsapp.com/CbJyZIEC5Lc02ytEVTGPIb"

    # 1. YouTube Title & Description
    scenes = build_video_scenes(topic_data, short_theme)
    yt_title = f"{re.sub(r'\s*(रहस्य|सूत्र|विचार)$', '', short_theme)} पर महर्षि पराशर का यह नियम 🔱 #Shorts #Jyotish"
    if len(yt_title) > 95:
        yt_title = f"{short_theme} | पराशर सूत्र #Shorts #Jyotish"

    yt_description = f"""✨ महर्षि पराशर सूत्र: {theme} (BPHS अध्याय {ch_num}) ✨

📜 मूल संस्कृत श्लोक ({verse_lbl}):
{shloka}

🔍 शास्त्रीय भावार्थ एवं कुंडली रहस्य:
{bhashya}

💡 कुंडली विश्लेषण एवं अचूक वैदिक उपाय:
✔️ अपनी लग्न कुंडली और श्रीपति भाव-चलित में संबंधित ग्रहों की वास्तविक स्थिति जांचें।
✔️ शुभ ग्रहों (गुरु, शुक्र) की दृष्टि और लग्नेश के बल का विचार करें।
✔️ नवग्रह शांति एवं वैदिक मंत्र जप से शुभ फलों में वृद्धि करें।

💬 दैनिक शास्त्रीय ज्योतिष चर्चा एवं निःशुल्क मार्गदर्शन हेतु हमारे WhatsApp ग्रुप से जुड़ें:
👉 {wa_group_url}

🌐 अपनी संपूर्ण जन्मपत्रिका (100% प्रामाणिक स्विस एफेमेरिस DE431 गणना आधारित) अभी देखें:
👉 https://shriramjiastro.in

{trending_hashtags}
"""

    # English Channel (Channel 2) Scenes and Metadata
    m = re.search(r"\(([^)]+)\)", theme)
    theme_en = m.group(1).strip() if m else topic_data.get("chapter_english", "Vedic Wisdom")
    verse_lbl_en = re.sub(r"श्लोक", "Verse", verse_lbl)
    scenes_en = build_video_scenes_en(topic_data, theme_en)

    yt_title_en = f"{theme_en} | Sage Parashara's Rule 🔱 #Shorts #VedicAstrology"
    if len(yt_title_en) > 95:
        yt_title_en = yt_title_en[:95]

    yt_description_en = f"""✨ Sage Parashara Vedic Sutra: {theme_en} (BPHS Chapter {ch_num}) ✨

📜 Original Sanskrit Shloka ({verse_lbl_en}):
{shloka}

🔍 Classical Wisdom & Meaning:
In Brihat Parashara Hora Shastra, Maharishi Parashara reveals how specific planetary configurations shape intellect, fortune, and karmic destiny.

💡 Essential Kundli Analysis Checklist:
✔️ Verify the real planetary degrees in Sripati Bhava Chalita.
✔️ Inspect the strength of your Ascendant Lord (Lagnesha) and benefic aspects (Jupiter, Venus).
✔️ Perform daily mantra recitation and satvik karma to harmonize challenging transits.

💬 Join our official Vedic Astrology WhatsApp Community for daily Sutras:
👉 {wa_group_url}

🌐 Explore your complete 100% authentic Vedic Birth Chart (NASA JPL DE431 Swiss Ephemeris):
👉 https://shriramjiastro.in

#vedicastrology #astrology #kundli #bphs #parashara #shriramjiastro #shorts #zodiac #jyotish
"""

    # 2. Instagram Caption
    ig_caption = f"""✨ {short_theme} ✨
📖 बृहत्पाराशरहोराशास्त्रम् (अध्याय {ch_num} • {verse_lbl})

🕉️ श्लोक:
{shloka}

🔍 रहस्य व फलित:
{bhashya}

💡 फलित सूत्र: केवल राशि नहीं, बल्कि श्रीपति भाव-चलित में ग्रह की वास्तविक स्थिति और लग्नेश का बल अवश्य देखें।

💬 दैनिक ज्योतिष चर्चा एवं अध्ययन WhatsApp ग्रुप:
👉 {wa_group_url}

👉 अपनी संपूर्ण जन्मपत्रिका जांचें: https://shriramjiastro.in

{ig_hashtags}
"""

    # 3. WhatsApp Channel Post
    whatsapp_post = f"""✨ *आज का वैदिक ज्योतिष सूत्र | श्री रामजी एस्ट्रो* ✨
📖 *विषय:* {short_theme} (BPHS अध्याय {ch_num})

🕉️ *मूल श्लोक ({verse_lbl}):*
_{shloka}_

🔍 *गूढ़ अर्थ एवं कुंडली सूत्र:*
{bhashya}

🌿 *अचूक वैदिक उपाय:*
✔️ अपनी लग्न कुंडली में लग्नेश और संबंधित भावेश की दृष्टि अवश्य देखें।
✔️ श्रीपति भाव-चलित में ग्रह की संधि स्थिति जांचें।
✔️ शुभ फलों की प्राप्ति हेतु नित्य वैदिक मंत्र जप करें।

💬 *हमारे मुख्य ज्योतिष चर्चा WhatsApp समूह से जुड़ें:*
👉 {wa_group_url}

🌐 *अपनी संपूर्ण कुंडली व सटीक फलादेश अभी देखें:*
👉 https://shriramjiastro.in

#jyotish #vedicastrology #astrology #kundli #parashara #shriramjiastro
"""

    # 4. Facebook Post
    fb_post = f"""✨ आज का वैदिक ज्योतिष सूत्र | बृहत्पाराशरहोराशास्त्रम् ✨

📖 {theme} (अध्याय {ch_num} • {verse_lbl})

श्लोक:
"{shloka}"

भावार्थ:
{bhashya}

💡 कुंडली विश्लेषण टिप्स:
✔️ अपनी कुंडली में लग्नेश और संबंधित भावेश की दृष्टि अवश्य देखें।
✔️ केवल राशि नहीं, बल्कि श्रीपति भाव-चलित में ग्रह की स्थिति जांचें।
✔️ शुभ फलों की प्राप्ति हेतु नित्य वैदिक मंत्र जप करें।

💬 निःशुल्क वैदिक ज्योतिष ज्ञान, श्लोक व कुंडली चर्चा WhatsApp ग्रुप से जुड़ें:
👉 {wa_group_url}

🌐 अपनी कुंडली का 100% प्रामाणिक स्विस एफेमेरिस आधारित विश्लेषण करने के लिए आज ही विजिट करें:
👉 https://shriramjiastro.in

{trending_hashtags}
"""

    # 5. Quora Q&A
    quora_question = f"कुंडली में '{short_theme}' का क्या महत्व है और महर्षि पराशर इसके बारे में क्या कहते हैं?"
    quora_answer = f"""बृहत्पाराशरहोराशास्त्रम् (BPHS) वैदिक ज्योतिष का सबसे प्रमाणिक ग्रंथ है। अध्याय {ch_num} ({verse_lbl}) में पराशर मुनि स्पष्ट निर्देश देते हैं:

**मूल श्लोक:**
> *{shloka}*

**सरल व्याख्या व व्यावहारिक प्रभाव:**
{bhashya}

**जातक को इसे अपनी कुंडली में कैसे देखना चाहिए?**
1. **नवमांश (D9)** में ग्रह की शक्ति जांचें।
2. **षड्बल** में ग्रह का स्थान-बल और दिग्बल देखें।
3. **श्रीपति भाव-चलित** में सुनिश्चित करें कि ग्रह भाव-मध्य के निकट है या भाव-संधि पर।

💬 *दैनिक वैदिक ज्योतिष चर्चा और प्रामाणिक श्लोक अध्ययन के लिए हमारे [आधिकारिक WhatsApp समूह]({wa_group_url}) से जुड़ें।*

🌐 *अधिक शास्त्रीय अध्ययन एवं अपनी व्यक्तिगत जन्मपत्रिका के सटीक विश्लेषण के लिए आप [श्री रामजी एस्ट्रो (Shri Ramji Astro)](https://shriramjiastro.in) देख सकते हैं।*
"""

    # 6. Reddit Markdown post
    reddit_title = f"[BPHS Chapter {ch_num}] {short_theme} — Deep Vedic Principles & Kundli Analysis"
    reddit_body = f"""## बृहत्पाराशरहोराशास्त्रम् (BPHS) — {theme}
**अध्याय {ch_num} • {verse_lbl}**

### 📜 मूल संस्कृत श्लोक:
```text
{shloka}
```

### 🔍 शास्त्रीय अन्वय एवं भावार्थ:
{bhashya}

---
💬 *Join our Vedic Astrology study & discussion WhatsApp group:* {wa_group_url}

🌐 *Authentic Parashara Calculations powered by Swiss Ephemeris (JPL DE431) at [Shri Ramji Astro](https://shriramjiastro.in)*
"""

    # If Gemini API key is available, enhance with AI refinement
    if api_key:
        try:
            prompt = f"""
You are the Chief Vedic Astrologer at Shri Ramji Astro. Enhance the following daily social media content package based on this authentic BPHS shloka:
Theme: {theme} (BPHS Chapter {ch_num}, {verse_lbl})
Shloka: {shloka}
Bhashya: {bhashya}

Website to promote: https://shriramjiastro.in
WhatsApp Group to promote: {wa_group_url}
Required Hashtags: #jyotish #vedicastrology #astrology #kundli #parashara #shriramjiastro
Always include both the website link and the WhatsApp group invite link ({wa_group_url}) in youtube_description, youtube_description_en, instagram_caption, facebook_post, and whatsapp_post.

Return a valid JSON object with exact keys:
1. "youtube_title": Catchy, curiosity-inducing YouTube Shorts title under 95 characters (must end with "#Shorts #Jyotish")
2. "youtube_description": Full, highly engaging description with hook, shloka, meaning, tips, website link, and tags
3. "instagram_caption": Engaging Instagram caption with hook, shloka, takeaways, website link, and trending reels tags
4. "whatsapp_post": Beautifully formatted message with *bold* headers and emojis for WhatsApp Channel
5. "facebook_post": Formatted Facebook post with emojis and clean line breaks
6. "voice_script": Smooth, natural 45-second Hindi narration script for vertical video
7. "hook_display": On-screen hook for the first 2 seconds of the Short: a Hindi question of at most 9 words about this theme that makes the viewer ask "is this in MY kundli?". Wrap the 1-3 key words in **double asterisks**. No fear-mongering, no invented statistics.
8. "hook_narration": Warm, human, engaging spoken hook in conversational Hindi (under 18 words). Ask directly and naturally if this is in their chart. Sound like a knowledgeable, warm mentor talking one-on-one. NEVER say "अंत तक देखिए", "लाइक करें", or robotic filler phrases.
9. "meaning_narration": Warm, human Hindi explanation of what this shloka means for a person's life (under 28 words). Keep it relatable and grounded in Parashara; do not sound like a machine.
10. "tip_narration": One practical, eye-opening classical check in warm Hindi (under 24 words). e.g. checking lagnesha strength or bhava chalita.
10b. "tip_display": The same rule as on-screen text, at most 10 Hindi words, key words in **double asterisks**.
11. "cta_narration": Warm, genuine ending (under 22 words): invite them to check their chart at "श्री रामजी एस्ट्रो डॉट इन", subscribe for daily wisdom, and write their lagna in the comments.
12. "youtube_title_en": Catchy, curiosity-inducing English Shorts title under 90 characters (must end with "#Shorts #VedicAstrology")
13. "youtube_description_en": Full engaging English description with theme, shloka, meaning, tips, website link, and hashtags
14. "hook_display_en": On-screen English hook under 9 words with key words in **double asterisks**
15. "hook_narration_en": Spoken English hook in warm, authoritative voice under 18 words
16. "meaning_display_en": English display text under 14 words with key words in **double asterisks**
17. "meaning_narration_en": Clear, eloquent English explanation of this shloka under 28 words
18. "tip_display_en": English display text under 10 words with key words in **double asterisks**
19. "tip_narration_en": Spoken practical chart check in English under 22 words
20. "cta_narration_en": Spoken English ending under 20 words inviting them to shriramjiastro.in
DO NOT wrap in markdown ticks or say anything else, return raw JSON only.
"""
            gemini_resp = call_gemini_api(api_key, model, prompt)
            if gemini_resp:
                clean_json = gemini_resp.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json[7:]
                elif clean_json.startswith("```"):
                    clean_json = clean_json[3:]
                if clean_json.endswith("```"):
                    clean_json = clean_json[:-3]
                enhanced = json.loads(clean_json.strip(), strict=False)
                
                yt_title = enhanced.get("youtube_title", yt_title)
                yt_description = enhanced.get("youtube_description", yt_description)
                ig_caption = enhanced.get("instagram_caption", ig_caption)
                whatsapp_post = enhanced.get("whatsapp_post", whatsapp_post)
                fb_post = enhanced.get("facebook_post", fb_post)
                voice_script = enhanced.get("voice_script", voice_script)
                limits = {"hook": ("hook_narration", 160), "meaning": ("meaning_narration", 300),
                          "tip": ("tip_narration", 240), "cta": ("cta_narration", 240)}
                tip_display = (enhanced.get("tip_display") or "").strip()
                for sc in scenes:
                    key, cap = limits.get(sc["kind"], (None, 0))
                    val = (enhanced.get(key) or "").strip() if key else ""
                    if val and len(val) <= cap:
                        sc["narration"] = val
                        # On-screen tip must say what the voice says
                        if sc["kind"] == "tip":
                            sc["display"] = tip_display if tip_display and len(tip_display) <= 80 else "💡 अपनी कुंडली में\n**यह नियम** जाँचें"
                hook_display = (enhanced.get("hook_display") or "").strip()
                if hook_display and len(hook_display) <= 70:
                    scenes[0]["display"] = hook_display

                # Channel 2 (English) enhancements
                yt_title_en = enhanced.get("youtube_title_en", yt_title_en)
                yt_description_en = enhanced.get("youtube_description_en", yt_description_en)
                limits_en = {"hook": ("hook_narration_en", 160), "meaning": ("meaning_narration_en", 300),
                             "tip": ("tip_narration_en", 240), "cta": ("cta_narration_en", 240)}
                tip_display_en = (enhanced.get("tip_display_en") or "").strip()
                for sc in scenes_en:
                    key, cap = limits_en.get(sc["kind"], (None, 0))
                    val = (enhanced.get(key) or "").strip() if key else ""
                    if val and len(val) <= cap:
                        sc["narration"] = val
                        if sc["kind"] == "tip" and tip_display_en and len(tip_display_en) <= 80:
                            sc["display"] = tip_display_en
                hook_display_en = (enhanced.get("hook_display_en") or "").strip()
                if hook_display_en and len(hook_display_en) <= 70:
                    scenes_en[0]["display"] = hook_display_en
                meaning_display_en = (enhanced.get("meaning_display_en") or "").strip()
                if meaning_display_en and len(meaning_display_en) <= 80:
                    scenes_en[2]["display"] = meaning_display_en
                print("[Curator] Content successfully enhanced via Gemini AI (Hindi & English)!")
        except Exception as e:
            print(f"[Curator] Note: Using built-in canonical BPHS synthesis ({e})")

    # Safety check on YouTube title lengths
    if len(yt_title) > 98:
        yt_title = yt_title[:95]
    if len(yt_title_en) > 98:
        yt_title_en = yt_title_en[:95]

    return {
        "date": topic_data["date"],
        "topic": topic_data,
        "video": {
            "title": f"BPHS सूत्र: {short_theme}",
            "lang": "hi",
            "voice_script": voice_script,
            "scenes": scenes,
            "slides": [
                {"heading": "⚡ क्या आप जानते हैं?", "body": slide_1_hook, "duration": 6},
                {"heading": "📜 महर्षि पराशर सूत्र", "body": slide_2_shloka, "duration": 14},
                {"heading": "🔍 कुंडली फलित रहस्य", "body": slide_3_analysis, "duration": 15},
                {"heading": "🕉️ अचूक वैदिक उपाय", "body": slide_4_remedy, "duration": 10}
            ]
        },
        "video_en": {
            "title": f"BPHS: {theme_en}",
            "lang": "en",
            "voice": "en-US-ChristopherNeural",
            "branding": "SHRI RAMJI ASTRO • VEDIC WISDOM",
            "scenes": scenes_en
        },
        "youtube": {
            "title": yt_title,
            "description": yt_description,
            "tags": ["Shorts", "Jyotish", "VedicAstrology", "Astrology", "Kundli", "Rashifal", "Horoscope", "BPHS", "Parashara", "ShriRamjiAstro"]
        },
        "youtube_channel2": {
            "title": yt_title_en,
            "description": yt_description_en,
            "tags": ["Shorts", "VedicAstrology", "Astrology", "Kundli", "Horoscope", "BPHS", "Parashara", "ShriRamjiAstro", "Zodiac", "SpiritualWisdom"]
        },
        "instagram": {
            "caption": ig_caption
        },
        "whatsapp": {
            "text": whatsapp_post
        },
        "facebook": {
            "text": fb_post
        },
        "quora": {
            "question": quora_question,
            "answer": quora_answer,
            "topics": ["Vedic Astrology", "Horoscopes", "Hinduism", "Astrology Tips"]
        },
        "reddit": {
            "title": reddit_title,
            "body": reddit_body,
            "subreddits": config["platforms"]["reddit"]["target_subreddits"]
        }
    }

# Alias for orchestrator compatibility
synthesize_daily_social_package = generate_social_package
