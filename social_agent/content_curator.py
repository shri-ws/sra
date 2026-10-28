"""
Shri Ramji Astro (SRA) - BPHS Vedic Content Curator
Curates authentic shlokas, yogas, kundli tips, and remedies from Brihat Parashara Hora Shastra (BPHS),
and synthesizes high-CTR, high-engagement content for YouTube Shorts, Instagram Reels, Facebook, WhatsApp Channel, Quora, and Reddit.
"""

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
        "tags": curated["tags"]
    }

def call_gemini_api(api_key: str, model: str, prompt: str) -> str:
    """Call Google Gemini REST API directly."""
    if not api_key:
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 8192}
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            return res_json["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        print(f"[Curator] Gemini API error ({model}): {e}")
        return ""

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

    # 1. YouTube Title & Description
    yt_title = f"{short_theme} का रहस्य | महर्षि पराशर सूत्र #Shorts #Jyotish"
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

🌐 अपनी संपूर्ण जन्मपत्रिका (100% प्रामाणिक स्विस एफेमेरिस DE431 गणना आधारित) अभी देखें:
👉 https://shriramjiastro.in

{trending_hashtags}
"""

    # 2. Instagram Caption
    ig_caption = f"""✨ {short_theme} ✨
📖 बृहत्पाराशरहोराशास्त्रम् (अध्याय {ch_num} • {verse_lbl})

🕉️ श्लोक:
{shloka}

🔍 रहस्य व फलित:
{bhashya}

💡 फलित सूत्र: केवल राशि नहीं, बल्कि श्रीपति भाव-चलित में ग्रह की वास्तविक स्थिति और लग्नेश का बल अवश्य देखें।

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
Required Hashtags: #jyotish #vedicastrology #astrology #kundli #parashara #shriramjiastro

Return a valid JSON object with exact keys:
1. "youtube_title": Catchy, curiosity-inducing YouTube Shorts title under 95 characters (must end with "#Shorts #Jyotish")
2. "youtube_description": Full, highly engaging description with hook, shloka, meaning, tips, website link, and tags
3. "instagram_caption": Engaging Instagram caption with hook, shloka, takeaways, website link, and trending reels tags
4. "whatsapp_post": Beautifully formatted message with *bold* headers and emojis for WhatsApp Channel
5. "facebook_post": Formatted Facebook post with emojis and clean line breaks
6. "voice_script": Smooth, natural 45-second Hindi narration script for vertical video
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
                print("[Curator] Content successfully enhanced via Gemini AI!")
        except Exception as e:
            print(f"[Curator] Note: Using built-in canonical BPHS synthesis ({e})")

    # Safety check on YouTube title length
    if len(yt_title) > 98:
        yt_title = yt_title[:95]

    return {
        "date": topic_data["date"],
        "topic": topic_data,
        "video": {
            "title": f"BPHS सूत्र: {short_theme}",
            "voice_script": voice_script,
            "slides": [
                {"heading": "⚡ क्या आप जानते हैं?", "body": slide_1_hook, "duration": 6},
                {"heading": "📜 महर्षि पराशर सूत्र", "body": slide_2_shloka, "duration": 14},
                {"heading": "🔍 कुंडली फलित रहस्य", "body": slide_3_analysis, "duration": 15},
                {"heading": "🕉️ अचूक वैदिक उपाय", "body": slide_4_remedy, "duration": 10}
            ]
        },
        "youtube": {
            "title": yt_title,
            "description": yt_description,
            "tags": ["Shorts", "Jyotish", "VedicAstrology", "Astrology", "Kundli", "Rashifal", "Horoscope", "BPHS", "Parashara", "ShriRamjiAstro"]
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
