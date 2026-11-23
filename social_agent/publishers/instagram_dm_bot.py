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

def save_ig_config(new_cfg: dict):
    if not CONFIG_FILE.exists():
        return False
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            full_cfg = json.load(f)
        if "platforms" not in full_cfg:
            full_cfg["platforms"] = {}
        if "instagram" not in full_cfg["platforms"]:
            full_cfg["platforms"]["instagram"] = {}
        full_cfg["platforms"]["instagram"].update(new_cfg)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(full_cfg, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[IG-DM-Bot] Error saving config: {e}")
        return False

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
                "You are the courteous and disciplined assistant for 'Shri Ramji Astro' (shriramjiastro.in) on Instagram (@astro_raamji).\n"
                f"A user sent this Instagram DM: \"{user_query}\"\n\n"
                "Respond according to SRA Sacred Rules:\n"
                "1. If asking about consultation, fees, pricing, appointment, or kundali guidance:\n"
                "   - State the SRA Daivajna Rule (दैवज्ञ नियम): 'सिंगल डे, सिंगल कंसल्टेशन' (शुचिता व सूक्ष्म विश्लेषण हेतु एक दिन में केवल एक ही जातक का परामर्श लिया जाता है)।\n"
                "   - Normal Dakshina/Fee is ₹5,100.\n"
                "   - Special Instant Offer: यदि आप अगले 10 मिनट के भीतर स्लॉट आरक्षित करते हैं, तो कूपन कोड DAIVAJNA2100 से दक्षिणा ₹5,100 से घटकर सीधे ₹2,100 हो जाएगी (₹3,000 की विशेष छूट)।\n"
                "   - Provide direct booking link: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100\n"
                "2. If asking about Sutradhar/income/wfh: link to shriramjiastro.in/careers.html.\n"
                "3. If general greeting (hi/hello/radhe radhe/pranam): greet warmly with respect, mention SRA's 1-on-1 sacred consultation, standard fee ₹5,100, and the ₹2,100 special 10-min coupon DAIVAJNA2100.\n"
                "Tone: Spiritual, dignified, authentic, no commercial hype or fear-mongering. Language: Hindi / Hinglish matching user. Keep concise (under 75 words)."
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
    if any(k in q for k in ["fee", "fees", "charge", "cost", "price", "kitna", "consultation", "paramarsh", "appointment", "booking", "slot"]):
        return (
            "प्रणाम! श्री रामजी एस्ट्रो 'दैवज्ञ नियम' के अनुसार शुचिता व गंभीर विश्लेषण हेतु 'सिंगल डे, सिंगल कंसल्टेशन' (एक दिन में केवल एक जातक) मर्यादा का पालन करता है।\n\n"
            "मानक दक्षिणा: ₹5,100\n"
            "विशेष 10-मिनट कूपन: यदि आप 10 मिनट के भीतर स्लॉट आरक्षित करते हैं, तो कूपन कोड 'DAIVAJNA2100' से दक्षिणा सीधे ₹2,100 हो जाएगी (₹3,000 विशेष छूट)।\n\n"
            "आरक्षण लिंक: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100"
        )
    elif any(k in q for k in ["sutradhar", "income", "earning", "wfh", "job", "career"]):
        return (
            "प्रणाम! श्री रामजी एस्ट्रो 'सूत्रधार' कार्यक्रम के तहत आप घर बैठे प्रामाणिक "
            "ज्योतिष परामर्श जोड़कर सम्मानजनक आय प्राप्त कर सकते हैं।\n\n"
            "आवेदन व पूरी जानकारी: https://shriramjiastro.in/careers.html"
        )
    elif any(k in q for k in ["kundali", "kundli", "chart", "horoscope", "bhavishya"]):
        return (
            "प्रणाम! सटीक पाराशर एवं NASA JPL गणना पर आधारित 1-on-1 परामर्श हेतु 'सिंगल डे, सिंगल कंसल्टेशन' नियम लागू है।\n\n"
            "मानक शुल्क: ₹5,100 (10 मिनट के भीतर कूपन DAIVAJNA2100 से मात्र ₹2,100)।\n\n"
            "आरक्षण लिंक: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100"
        )
    elif any(k in q for k in ["panchang", "tithi", "muhurta"]):
        return (
            "प्रणाम! आज का दैनिक शुद्ध पंचांग एवं शुभ मुहूर्त देखने के लिए यहाँ क्लिक करें:\n"
            "https://shriramjiastro.in/panchang"
        )
    return (
        "नमस्ते! श्री रामजी एस्ट्रो में संपर्क करने के लिए धन्यवाद।\n\n"
        "हम 'दैवज्ञ नियम' एवं 'सिंगल डे, सिंगल कंसल्टेशन' के तहत व्यक्तिगत मार्गदर्शन प्रदान करते हैं।\n"
        "मानक दक्षिणा ₹5,100 है (10 मिनट में बुकिंग पर कूपन 'DAIVAJNA2100' से मात्र ₹2,100)।\n\n"
        "विवरण व आरक्षण: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100"
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
