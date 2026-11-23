"""
Shri Ramji Astro (SRA) - Instagram Direct Message (DM) Automation Helper
Provides automated replies to Instagram DMs using predefined SRA intents
or Gemini model for incoming query handling.
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_FILE = BASE_DIR / "social_agent" / "social_config.json"

DEFAULT_TOKEN = "EAAzxIRpfdn4BTM4IQfhieahbRmeZC3D0ZBkTSxhPPZBko3QTScZBxbFJTDWiDJthFbgT5kSkqZAaARrAVlL68IRdUhv1l5j4ZAEPs8k9j0QZB0ggZBP1RPZBV9gZAbQyuU70xmibGH4aUKXE0egzcO1GmmwjZAdjVFqzpgZCbZBZCcMZCv8TuAoyN49qcj9zSWvw0vvrjGYN5NZBp6EJeE5SvJqyaDb0eKTethIpogZBdCF5ZCifqZAljXdzKW76UKZA3wZDZD"
DEFAULT_IG_USER_ID = "17841480651751645"

def load_ig_config():
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
            return cfg.get("platforms", {}).get("instagram", {})
    return {"access_token": DEFAULT_TOKEN, "ig_user_id": DEFAULT_IG_USER_ID}

def generate_dm_reply(user_query: str) -> str:
    """Generate dynamic Gemini AI reply with graceful fallback to contextual templates."""
    # Try Gemini AI first
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not gemini_key and CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                gemini_key = json.load(f).get("api_keys", {}).get("gemini_api_key", "").strip()
        except Exception:
            pass

    if gemini_key:
        try:
            model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash").strip()
            prompt = (
                "You are the courteous and helpful assistant for 'Shri Ramji Astro' (shriramjiastro.in) on Instagram (@astro_raamji).\n"
                f"A user sent this Instagram DM: \"{user_query}\"\n\n"
                "Write a warm, concise, engaging response (2-3 short sentences max) in natural polite Hindi/Hinglish (matching user's language).\n"
                "- If asking about fees/consultation: explain that transparent consultation & Parashara report fees are available on shriramjiastro.in, and invite them to share their query.\n"
                "- If asking about kundali/astrology: invite them to share their date, time, and place of birth, or visit shriramjiastro.in.\n"
                "- If asking about Sutradhar/income: invite them to view work-from-home earning details at shriramjiastro.in/careers.html.\n"
                "- If greeting (hi/hello/radhe radhe/pranam): greet warmly and ask how you can assist them today.\n"
                "Keep it under 40 words. Do not use hashtags."
            )
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
            body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode("utf-8")
            req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as res:
                data = json.loads(res.read().decode("utf-8"))
                text = "".join(p.get("text", "") for p in data["candidates"][0]["content"]["parts"]).strip()
                if text:
                    return text
        except Exception as e:
            print(f"[IG-DM-Bot] Gemini fallback to template: {e}")

    # Fallback to smart templates if Gemini unavailable
    q = user_query.lower()
    if any(k in q for k in ["fee", "fees", "charge", "cost", "price", "kitna"]):
        return (
            "प्रणाम! श्री रामजी एस्ट्रो में सटीक पाराशर कुंडली परामर्श व विभिन्न रिपोर्ट्स के पारदर्शी शुल्क shriramjiastro.in पर उपलब्ध हैं।\n"
            "आप किस विषय (विवाह, करियर, स्वास्थ्य या संपूर्ण पत्रिका) पर मार्गदर्शन चाहते हैं?"
        )
    elif any(k in q for k in ["sutradhar", "income", "earning", "wfh", "job", "career"]):
        return (
            "प्रणाम! श्री रामजी एस्ट्रो 'सूत्रधार' कार्यक्रम के तहत आप घर बैठे प्रामाणिक "
            "ज्योतिष परामर्श जोड़कर सम्मानजनक आय प्राप्त कर सकते हैं।\n\n"
            "आवेदन व पूरी जानकारी: https://shriramjiastro.in/careers.html"
        )
    elif any(k in q for k in ["kundali", "kundli", "chart", "horoscope", "bhavishya"]):
        return (
            "प्रणाम! सटीक पाराशर एवं NASA JPL गणना पर आधारित अपनी संपूर्ण कुंडली "
            "और दशा विश्लेषण के लिए आप अपनी जन्मतिथि, समय और स्थान साझा करें, या shriramjiastro.in पर पधारें।"
        )
    elif any(k in q for k in ["panchang", "tithi", "muhurta"]):
        return (
            "प्रणाम! आज का दैनिक शुद्ध पंचांग एवं शुभ मुहूर्त देखने के लिए यहाँ क्लिक करें:\n"
            "https://shriramjiastro.in/panchang"
        )
    return (
        "नमस्ते! श्री रामजी एस्ट्रो में संपर्क करने के लिए धन्यवाद।\n\n"
        "हमसे जुड़ने के लिए कृपया अपनी जन्मतिथि, समय और स्थान साझा करें, "
        "या अधिक जानकारी के लिए हमारी वेबसाइट shriramjiastro.in पर पधारें।"
    )

def send_ig_dm(recipient_id: str, message_text: str, dry_run: bool = False) -> dict:
    """Send DM to a user ID via Meta Graph API."""
    ig_cfg = load_ig_config()
    token = ig_cfg.get("access_token", DEFAULT_TOKEN).strip()
    ig_user_id = ig_cfg.get("ig_user_id", DEFAULT_IG_USER_ID).strip()

    if dry_run or not token:
        print(f"[IG-DM-Bot] Dry run / Token pending:")
        print(f"  Recipient: {recipient_id}")
        print(f"  Reply: {message_text}")
        return {"status": "simulated", "recipient_id": recipient_id, "text": message_text}

    url = f"https://graph.facebook.com/v19.0/{ig_user_id}/messages"
    payload = json.dumps({
        "recipient": {"id": recipient_id},
        "message": {"text": message_text}
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {"status": "success", "response": data}
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    test_queries = [
        "Hi, how can I earn as a Sutradhar?",
        "Mujhe apni kundali banwani hai",
        "Aaj ka panchang kya hai?",
        "Hello!"
    ]
    print("=== Testing Instagram DM Auto-Reply Generation ===")
    for q in test_queries:
        reply = generate_dm_reply(q)
        print(f"\n[Incoming]: {q}")
        print(f"[Auto-Reply]:\n{reply}")
