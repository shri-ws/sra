"""
Shri Ramji Astro (SRA) - BPHS Vedic Content Curator
Curates authentic shlokas, yogas, kundli tips, and remedies from Brihat Parashara Hora Shastra (BPHS),
and synthesizes tailored content for Reddit, Quora, Facebook, Instagram Reels, and YouTube Shorts.
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
        # Fallback to any verse
        valid_verses = verses if verses else [{
            "verse_label": "श्लोक १",
            "shloka": "शान्तो विनीतः सत्यवादी जितक्रोधो जितेन्द्रियः। दैवज्ञः सर्वशास्त्रज्ञो लोकोपकारकारकः॥",
            "bhashya": "सच्चा दैवज्ञ शांत, विनम्र, सत्यवादी और सर्वशास्त्र का ज्ञाता होकर लोक-कल्याण करने वाला होता है।"
        }]
    
    # Pick verse based on day_num
    selected_verse = valid_verses[day_num % len(valid_verses)]
    
    return {
        "date": date_seed.isoformat(),
        "chapter_num": curated["ch"],
        "chapter_title": chapter_data.get("chapter_title_sanskrit", curated["theme"]),
        "chapter_english": chapter_data.get("chapter_title_english", ""),
        "theme": curated["theme"],
        "verse_label": selected_verse.get("verse_label", "महर्षि पराशर सूत्र"),
        "shloka": selected_verse.get("shloka", "").strip(),
        "bhashya": selected_verse.get("bhashya", "").strip(),
        "tags": curated["tags"]
    }

def call_gemini_api(api_key: str, model: str, prompt: str) -> str:
    """Call Gemini REST API for content synthesis with model fallback."""
    candidate_models = [model, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-flash-latest"]
    # Deduplicate while preserving order
    models_to_try = []
    for m in candidate_models:
        if m and m not in models_to_try:
            models_to_try.append(m)
            
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
    }
    data = json.dumps(payload).encode("utf-8")
    
    for m in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                return res_json["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            print(f"[Curator] Gemini API error with {m}: {e}")
            continue
            
    return ""

def synthesize_daily_social_package(topic_data: dict = None) -> dict:
    """
    Generate complete tailored content package for:
    1. Reddit (Markdown post for r/vedicastrology)
    2. Quora (Question & detailed Answer)
    3. Facebook (Engaging card post)
    4. Instagram Reel & YouTube Short (Script + Voiceover cues + Subtitle cards)
    """
    config = load_config()
    if not topic_data:
        topic_data = select_daily_topic()
    
    api_key = config["api_keys"].get("gemini_api_key", "").strip()
    model = config["api_keys"].get("gemini_model", "gemini-2.0-flash")
    
    # Extract core facts
    shloka = topic_data["shloka"]
    bhashya = topic_data["bhashya"]
    theme = topic_data["theme"]
    ch_num = topic_data["chapter_num"]
    verse_lbl = topic_data["verse_label"]
    
    # 1. Clean script for vertical 9:16 video (approx 45 seconds narration in Hindi)
    # 4 distinct slides/segments for visual engine
    slide_1_hook = f"क्या आपकी कुंडली में भी {theme.split('(')[0].strip()} का प्रभाव है?"
    slide_2_shloka = f"{verse_lbl}: {shloka[:100]}..." if len(shloka) > 100 else f"{verse_lbl}: {shloka}"
    slide_3_analysis = f"महर्षि पराशर के अनुसार: {bhashya[:140]}..." if len(bhashya) > 140 else bhashya
    slide_4_remedy = "अपनी जन्मपत्रिका में इस योग की स्थिति और सटीक वैदिक उपाय जानने के लिए श्री रामजी एस्ट्रो पर विजिट करें।"
    
    voice_script = (
        f"नमस्ते। आज हम जानेंगे बृहत्पाराशरहोराशास्त्रम् के अध्याय {ch_num} का एक अत्यंत गोपनीय सूत्र। "
        f"महर्षि पराशर बताते हैं—{shloka}। "
        f"इसका गूढ़ अर्थ यह है कि {bhashya}। "
        f"यदि आपकी कुंडली में यह ग्रह स्थिति बन रही है, तो शुभ फलों की वृद्धि और दोष शांति हेतु दैनिक वैदिक नियमों का पालन अवश्य करें। "
        f"अपनी जन्मपत्रिका की सटीक जांच के लिए आज ही श्री रामजी एस्ट्रो पर जाएं।"
    )

    # 2. Reddit Markdown post
    reddit_title = f"[BPHS Chapter {ch_num}] {theme} — Deep Vedic Principles & Kundli Analysis"
    reddit_body = f"""## बृहत्पाराशरहोराशास्त्रम् (BPHS) — {theme}
**अध्याय {ch_num} • {verse_lbl}**

### 📜 मूल संस्कृत श्लोक:
```text
{shloka}
```

### 🔍 शास्त्रीय अन्वय एवं भावार्थ:
{bhashya}

---

### 🏛️ कुंडली में इस योग की पहचान कैसे करें? (Analysis Guide)
1. **लग्न एवं भावेश की स्थिति**: इस योग के पूर्ण फलित होने के लिए लग्नेश का बली होना अनिवार्य है।
2. **दृष्टि एवं युति संबंध**: शुभ ग्रहों (गुरु, शुक्र, बली बुध) की दृष्टि इसके फल को कई गुना बढ़ा देती है।
3. **भाव-चलित स्थिति**: श्रीपति भाव-चलित में ग्रह की वास्तविक स्थिति अवश्य जांचें कि ग्रह संधि पर तो नहीं है।

### 🕉️ महर्षि पराशर निर्देशित कल्याणकारी उपाय:
- संबंधित ग्रह के मंत्र का नित्य जप एवं सात्विक आचरण।
- अनुकूल समिधा द्वारा नवग्रह पूजन एवं योग्य विप्र का सम्मान।

*क्या आपकी कुंडली में भी यह योग उपस्थित है? कमेंट्स में अपनी लग्न व ग्रह स्थिति साझा करें।*

---
🌐 *Authentic Parashara Calculations powered by Swiss Ephemeris (JPL DE431) at [Shri Ramji Astro](https://shri-ramji-astro.org)*
"""

    # 3. Quora Question & Answer
    quora_question = f"कुंडली में '{theme.split('(')[0].strip()}' का क्या महत्व है और महर्षि पराशर इसके बारे में क्या बताते हैं?"
    quora_answer = f"""महर्षि पराशर द्वारा रचित 'बृहत्पाराशरहोराशास्त्रम्' वैदिक ज्योतिष का सर्वोच्च प्रमाणिक ग्रंथ है। अध्याय {ch_num} ({verse_lbl}) में पराशर मुनि स्पष्ट निर्देश देते हैं:

**मूल श्लोक:**
> *{shloka}*

**सरल व्याख्या व व्यावहारिक प्रभाव:**
{bhashya}

**जातक को इसे अपनी कुंडली में कैसे देखना चाहिए?**
अक्सर लोग केवल लग्न कुंडली (D1) देखकर निर्णय ले लेते हैं, जबकि पराशर संहिता के अनुसार:
1. **नवमांश (D9)** में ग्रह की शक्ति जांचें।
2. **षड्बल** में ग्रह का स्थान-बल और दिग्बल देखें।
3. **श्रीपति भाव-चलित** में सुनिश्चित करें कि ग्रह भाव-मध्य के निकट है या भाव-संधि पर।

यदि यह योग शुभ अवस्था में हो तो जातक को जीवन में असाधारण सफलता, आत्म-बल और प्रतिष्ठा प्राप्त होती है।

*अधिक शास्त्रीय अध्ययन एवं अपनी व्यक्तिगत जन्मपत्रिका के निःशुल्क विश्लेषण के लिए आप श्री रामजी एस्ट्रो (Shri Ramji Astro) के प्रामाणिक कैलकुलेटर देख सकते हैं।*
"""

    # 4. Facebook Post
    fb_post = f"""✨ आज का वैदिक ज्योतिष सूत्र | बृहत्पाराशरहोराशास्त्रम् ✨

📖 {theme} (अध्याय {ch_num})

श्लोक:
"{shloka}"

भावार्थ:
{bhashya}

💡 कुंडली विश्लेषण टिप्स:
✔️ अपनी कुंडली में लग्नेश और संबंधित भावेश की दृष्टि अवश्य देखें।
✔️ केवल राशि नहीं, बल्कि श्रीपति भाव-चलित में ग्रह की स्थिति जांचें।
✔️ शुभ फलों की प्राप्ति हेतु नित्य वैदिक मंत्र जप करें।

🌐 अपनी कुंडली का 100% प्रामाणिक स्विस एफेमेरिस आधारित विश्लेषण करने के लिए आज ही विजिट करें:
👉 https://shri-ramji-astro.org

#VedicAstrology #Kundli #BPHS #Jyotish #ShriRamjiAstro #AstrologyTips
"""

    # If Gemini API key is available, enhance with AI refinement
    if api_key:
        try:
            prompt = f"""
You are the Chief Vedic Astrologer at Shri Ramji Astro. Enhance the following daily social media content package based on this BPHS shloka:
Topic: {theme} (BPHS Chapter {ch_num})
Shloka: {shloka}
Bhashya: {bhashya}

Return a valid JSON object with exact keys:
1. "reddit_title": compelling post title for Reddit
2. "reddit_body": detailed markdown post with shloka, breakdown, and question
3. "quora_question": viral inquisitive question
4. "quora_answer": rich, educational answer citing BPHS
5. "facebook_post": formatted Facebook post with emojis and clean lines
6. "voice_script": clear, smooth 45-second Hindi narration script for an Instagram Reel / YouTube Short.
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
                reddit_title = enhanced.get("reddit_title", reddit_title)
                reddit_body = enhanced.get("reddit_body", reddit_body)
                quora_question = enhanced.get("quora_question", quora_question)
                quora_answer = enhanced.get("quora_answer", quora_answer)
                fb_post = enhanced.get("facebook_post", fb_post)
                voice_script = enhanced.get("voice_script", voice_script)
                print("[Curator] Content successfully enhanced via Gemini AI!")
        except Exception as e:
            print(f"[Curator] Note: Using built-in canonical BPHS synthesis ({e})")

    return {
        "date": topic_data["date"],
        "topic": topic_data,
        "video": {
            "title": f"BPHS सूत्र: {theme.split('(')[0].strip()}",
            "voice_script": voice_script,
            "slides": [
                {"heading": "⚡ क्या आप जानते हैं?", "body": slide_1_hook, "duration": 6},
                {"heading": "📜 महर्षि पराशर सूत्र", "body": slide_2_shloka, "duration": 14},
                {"heading": "🔍 कुंडली फलित रहस्य", "body": slide_3_analysis, "duration": 15},
                {"heading": "🕉️ अचूक वैदिक उपाय", "body": slide_4_remedy, "duration": 10}
            ]
        },
        "reddit": {
            "title": reddit_title,
            "body": reddit_body,
            "subreddits": config["platforms"]["reddit"]["target_subreddits"]
        },
        "quora": {
            "question": quora_question,
            "answer": quora_answer,
            "topics": ["Vedic Astrology", "Horoscopes", "Hinduism", "Astrology Tips"]
        },
        "facebook": {
            "text": fb_post
        },
        "youtube": {
            "title": f"{theme.split('(')[0].strip()} | पराशर ज्योतिष रहस्य #Shorts",
            "description": f"{bhashya}\n\n#Shorts #VedicAstrology #Kundli #ShriRamjiAstro\nVisit: https://shri-ramji-astro.org",
            "tags": ["Shorts", "VedicAstrology", "Astrology", "BPHS", "Kundli", "Jyotish"]
        },
        "instagram": {
            "caption": f"✨ {theme.split('(')[0].strip()} ✨\n\nमहर्षि पराशर के अनुसार: {bhashya[:200]}...\n\n👉 अपनी जन्मपत्रिका जांचें: shri-ramji-astro.org\n\n#reels #vedicastrology #astrology #kundli #parashara #shriramjiastro"
        }
    }
