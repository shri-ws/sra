"""
Shri Ramji Astro (SRA) - WhatsApp Direct Message Automation Helper
Provides automated replies to WhatsApp Cloud API messages using Gemini model
and SRA Sacred Rules (Daivajna Single Day Consultation, 10-minute discount coupon DAIVAJNA2100).
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_FILE = BASE_DIR / "social_agent" / "social_config.json"

DEFAULT_TOKEN = os.getenv(
    "WA_ACCESS_TOKEN",
    "EAAzxIRpfdn4BTM4IQfhieahbRmeZC3D0ZBkTSxhPPZBko3QTScZBxbFJTDWiDJthFbgT5kSkqZAaARrAVlL68IRdUhv1l5j4ZAEPs8k9j0QZB0ggZBP1RPZBV9gZAbQyuU70xmibGH4aUKXE0egzcO1GmmwjZAdjVFqzpgZCbZBZCcMZCv8TuAoyN49qcj9zSWvw0vvrjGYN5NZBp6EJeE5SvJqyaDb0eKTethIpogZBdCF5ZCifqZAljXdzKW76UKZA3wZDZD"
)
DEFAULT_PHONE_NUMBER_ID = os.getenv("WA_PHONE_NUMBER_ID", "1028717860322300")
DEFAULT_WABA_ID = os.getenv("WA_BUSINESS_ACCOUNT_ID", "1635359890991521")

def load_wa_config():
    cfg_data = {}
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg_data = json.load(f).get("platforms", {}).get("whatsapp", {})
        except Exception:
            pass
    return {
        "access_token": cfg_data.get("access_token", DEFAULT_TOKEN),
        "phone_number_id": cfg_data.get("phone_number_id", DEFAULT_PHONE_NUMBER_ID),
        "waba_id": cfg_data.get("waba_id", DEFAULT_WABA_ID),
        "enabled": cfg_data.get("enabled", True),
        "model": cfg_data.get("model", "gemini-3.5-flash")
    }

def save_wa_config(new_cfg: dict):
    if not CONFIG_FILE.exists():
        return False
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            full_cfg = json.load(f)
        if "platforms" not in full_cfg:
            full_cfg["platforms"] = {}
        if "whatsapp" not in full_cfg["platforms"]:
            full_cfg["platforms"]["whatsapp"] = {}
        full_cfg["platforms"]["whatsapp"].update(new_cfg)
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(full_cfg, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[WA-Bot] Error saving config: {e}")
        return False

def generate_wa_reply(user_query: str) -> str:
    """Generate dynamic Gemini AI reply with graceful fallback to contextual templates."""
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
                "You are the courteous and disciplined assistant for 'Shri Ramji Astro' (shriramjiastro.in) on WhatsApp.\n"
                f"A user sent this WhatsApp message: \"{user_query}\"\n\n"
                "Respond according to SRA Sacred Rules:\n"
                "1. If asking about consultation, fees, pricing, appointment, or kundali guidance:\n"
                "   - State the SRA Daivajna Rule (दैवज्ञ नियम): 'सिंगल डे, सिंगल कंसल्टेशन' (शुचिता व सूक्ष्म विश्लेषण हेतु एक दिन में केवल एक ही जातक का परामर्श लिया जाता है)।\n"
                "   - Normal Dakshina/Fee is ₹5,100.\n"
                "   - Special Instant Offer: यदि आप अगले 10 मिनट के भीतर स्लॉट आरक्षित करते हैं, तो कूपन कोड DAIVAJNA2100 से दक्षिणा ₹5,100 से घटकर सीधे ₹2,100 हो जाएगी (₹3,000 की विशेष छूट)।\n"
                "   - Provide direct booking link: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100\n"
                "2. If asking about Sutradhar/income/wfh: link to https://shriramjiastro.in/careers.html.\n"
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
            print(f"[WA-Bot] Gemini fallback to template: {e}")

    # Fallback template
    q = user_query.lower()
    if any(k in q for k in ["fee", "fees", "charge", "cost", "price", "kitna", "consultation", "paramarsh", "appointment", "booking", "slot"]):
        return (
            "प्रणाम! श्री रामजी एस्ट्रो 'दैवज्ञ नियम' के अनुसार शुचिता व गंभीर विश्लेषण हेतु 'सिंगल डे, सिंगल कंसल्टेशन' (एक दिन में केवल एक जातक) मर्यादा का पालन करता है।\n\n"
            "मानक दक्षिणा: ₹5,100\n"
            "विशेष 10-मिनट कूपन: यदि आप 10 मिनट के भीतर स्लॉट आरक्षित करते हैं, तो कूपन कोड 'DAIVAJNA2100' से दक्षिणा सीधे ₹2,100 हो जाएगी (₹3,000 की विशेष छूट)।\n\n"
            "स्लॉट आरक्षण लिंक: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100"
        )
    elif any(k in q for k in ["sutradhar", "income", "earning", "wfh", "job", "career"]):
        return (
            "प्रणाम! श्री रामजी एस्ट्रो 'सूत्रधार' कार्यक्रम के तहत आप घर बैठे प्रामाणिक ज्योतिष परामर्श जोड़कर सम्मानजनक आय प्राप्त कर सकते हैं।\n\n"
            "आवेदन व पूरी जानकारी: https://shriramjiastro.in/careers.html"
        )
    return (
        "नमस्ते! श्री रामजी एस्ट्रो में संपर्क करने के लिए धन्यवाद।\n\n"
        "हम 'दैवज्ञ नियम' एवं 'सिंगल डे, सिंगल कंसल्टेशन' के तहत व्यक्तिगत मार्गदर्शन प्रदान करते हैं।\n"
        "मानक दक्षिणा ₹5,100 है (10 मिनट में बुकिंग पर कूपन 'DAIVAJNA2100' से मात्र ₹2,100)।\n\n"
        "विवरण व आरक्षण: https://shriramjiastro.in/consultation.html?coupon=DAIVAJNA2100"
    )

def send_wa_message(to_phone: str, message_text: str, dry_run: bool = False) -> dict:
    """Send WhatsApp message to recipient phone using Meta WhatsApp Cloud API."""
    cfg = load_wa_config()
    token = cfg.get("access_token", DEFAULT_TOKEN).strip()
    phone_id = cfg.get("phone_number_id", DEFAULT_PHONE_NUMBER_ID).strip()

    clean_phone = "".join(filter(str.isdigit, str(to_phone)))
    if clean_phone.startswith("0"):
        clean_phone = clean_phone[1:]
    if len(clean_phone) == 10:
        clean_phone = "91" + clean_phone

    if dry_run or not token or not phone_id:
        return {"status": "simulated", "to": clean_phone, "text": message_text}

    url = f"https://graph.facebook.com/v19.0/{phone_id}/messages"
    payload = json.dumps({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": clean_phone,
        "type": "text",
        "text": {"preview_url": True, "body": message_text}
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
