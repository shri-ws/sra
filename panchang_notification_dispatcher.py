"""
=============================================================================
SRA PERSONALIZED PANCHANG NOTIFICATION DISPATCHER & 7:00 AM SCHEDULER
=============================================================================
Automated Morning Astrological Guide Dispatcher:
- Computes user-specific forecast using PersonalizedPanchangEngine
- Builds FCM (Firebase Cloud Messaging) rich push notification payload
- Dispatches at 07:00 AM daily
- Stores delivery history in persistent ledger
- Provides test-run capabilities for any arbitrary Kundali details
=============================================================================
"""

from __future__ import annotations
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

# Define router early to eliminate any circular import issues
router = APIRouter(prefix="/api/panchang/personalized", tags=["Personalized Panchang"])

from personalized_panchang_engine import PersonalizedPanchangEngine

logger = logging.getLogger("PersonalizedPanchangDispatcher")


def _setting(name: str, default: str = "") -> str:
    """Render dashboard environment first; locally the git-ignored .env file."""
    value = os.environ.get(name, "")
    if not value:
        env_file = Path(__file__).resolve().parent / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                if line.startswith(name + "="):
                    value = line.split("=", 1)[1].strip().strip('"').strip("'")
    return value or default

DATA_DIR = Path(__file__).resolve().parent / "api"
DATA_DIR.mkdir(parents=True, exist_ok=True)
NOTIFICATIONS_LOG_FILE = DATA_DIR / "personalized_panchang_notifications_log.json"

# Firebase Admin Messaging Init (lazy-loaded on demand to avoid blocking app startup)
_fcm_initialized = False
_fcm_available = False

def _ensure_fcm_initialized() -> bool:
    global _fcm_initialized, _fcm_available
    if _fcm_initialized:
        return _fcm_available
    _fcm_initialized = True
    try:
        import firebase_admin
        from firebase_admin import credentials
        if not firebase_admin._apps:
            cred_json = _setting("FIREBASE_SERVICE_ACCOUNT_JSON")
            cred_path = _setting("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_json:
                cred = credentials.Certificate(json.loads(cred_json))
                firebase_admin.initialize_app(cred, {"projectId": "shriramjiastro-cee67"})
                _fcm_available = True
            elif cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {"projectId": "shriramjiastro-cee67"})
                _fcm_available = True
        else:
            _fcm_available = True
    except Exception as e:
        logger.info(f"[PanchangDispatcher] Firebase FCM setup notice: {e}")
        _fcm_available = False
    return _fcm_available


class NativeBirthProfile(BaseModel):
    name: str = Field("श्रीराम", description="जातक का नाम")
    year: int = Field(..., description="जन्म वर्ष (उदा. 1992)")
    month: int = Field(..., description="जन्म माह (1-12)")
    day: int = Field(..., description="जन्म दिनांक (1-31)")
    hour: int = Field(..., description="जन्म समय घंटा (0-23)")
    minute: int = Field(..., description="जन्म समय मिनट (0-59)")
    lat: float = Field(26.8467, description="जन्म स्थान अक्षांश (Latitude)")
    lon: float = Field(80.9462, description="जन्म स्थान देशांतर (Longitude)")
    current_lat: Optional[float] = Field(None, description="वर्तमान निवास स्थान अक्षांश (न दें तो जन्म स्थान)")
    current_lon: Optional[float] = Field(None, description="वर्तमान निवास स्थान देशांतर (न दें तो जन्म स्थान)")
    tz: Optional[float] = Field(None, description="जन्म समय क्षेत्र (UTC से घंटे); न दें तो जन्म स्थान से")
    fcm_token: Optional[str] = Field(None, description="डिवाइस FCM पुश टोकन")


class PanchangNotificationDispatcher:
    """
    Manages generation, formatting, and dispatch of daily 07:00 AM alerts.
    """

    @staticmethod
    def log_dispatch(record: Dict[str, Any]):
        """Persists notification record into local ledger."""
        records = []
        if NOTIFICATIONS_LOG_FILE.exists():
            try:
                with open(NOTIFICATIONS_LOG_FILE, "r", encoding="utf-8") as f:
                    records = json.load(f)
            except Exception:
                records = []
        records.append(record)
        # Keep latest 500 records
        if len(records) > 500:
            records = records[-500:]
        with open(NOTIFICATIONS_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

    @classmethod
    def create_notification_payload(
        cls,
        profile: NativeBirthProfile,
        target_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Runs full astrological calculation and creates the formatted FCM notification.
        """
        if target_date is None:
            target_date = datetime.now(ZoneInfo("Asia/Kolkata"))

        # 1. Run hyper-precise engine
        forecast = PersonalizedPanchangEngine.generate_daily_forecast(
            birth_year=profile.year,
            birth_month=profile.month,
            birth_day=profile.day,
            birth_hour=profile.hour,
            birth_minute=profile.minute,
            birth_lat=profile.lat,
            birth_lon=profile.lon,
            current_lat=profile.current_lat or profile.lat,
            current_lon=profile.current_lon or profile.lon,
            target_date=target_date,
            name=profile.name,
            birth_tz=profile.tz
        )

        # 2. Formulate concise 7:00 AM Morning Notification
        title, body = build_message(profile.name, forecast)
        notification_payload = {
            "notification": {
                "title": title,
                "body": body
            },
            "data": {
                "type": "DAILY_PERSONALIZED_PANCHANG",
                "date": forecast["execution_date"],
                "score": str(forecast["overall_day_score"]),
                "sentiment": forecast["sentiment"],
                "theme": forecast["core_theme"],
                "tara_bala": forecast["tara_bala"]["tara_name_hi"],
                "is_chandrashtama": str(forecast["sudarshan_gochar_summary"]["is_chandrashtama"]),
                "micro_remedy": forecast["micro_remedy"],
                "click_action": "FLUTTER_NOTIFICATION_CLICK"
            },
            "forecast_details": forecast
        }

        return notification_payload

    @classmethod
    def dispatch_morning_alert(
        cls,
        profile: NativeBirthProfile,
        target_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Executes calculation and sends the notification to the user's device.
        """
        payload = cls.create_notification_payload(profile, target_date)
        notification_info = payload["notification"]
        data_info = payload["data"]

        dispatch_status = "simulated"
        fcm_message_id = None
        error_msg = None

        if profile.fcm_token and _ensure_fcm_initialized():
            try:
                from firebase_admin import messaging
                msg = messaging.Message(
                    notification=messaging.Notification(
                        title=notification_info["title"],
                        body=notification_info["body"]
                    ),
                    data=data_info,
                    token=profile.fcm_token
                )
                fcm_message_id = messaging.send(msg)
                dispatch_status = "delivered_via_fcm"
            except Exception as e:
                dispatch_status = "fcm_error"
                error_msg = str(e)
        else:
            dispatch_status = "simulated_ready_for_device"

        log_entry = {
            "timestamp": datetime.now(ZoneInfo("Asia/Kolkata")).isoformat(),
            "scheduled_time": "07:00 AM IST",
            "user_name": profile.name,
            "status": dispatch_status,
            "fcm_message_id": fcm_message_id,
            "error": error_msg,
            "notification": notification_info,
            "data": data_info
        }
        cls.log_dispatch(log_entry)

        return {
            "status": "success",
            "dispatch_status": dispatch_status,
            "scheduled_slot": "07:00 AM IST",
            "fcm_available": _fcm_available,
            "fcm_message_id": fcm_message_id,
            "notification": notification_info,
            "data": data_info,
            "forecast_details": payload["forecast_details"]
        }


# =============================================================================
# FASTAPI ROUTER ENDPOINTS
# =============================================================================


@router.post("/calculate")
def calculate_personalized_panchang(profile: NativeBirthProfile):
    """
    On-demand full personalized panchang calculation.
    """
    try:
        forecast = PersonalizedPanchangEngine.generate_daily_forecast(
            birth_year=profile.year,
            birth_month=profile.month,
            birth_day=profile.day,
            birth_hour=profile.hour,
            birth_minute=profile.minute,
            birth_lat=profile.lat,
            birth_lon=profile.lon,
            current_lat=profile.current_lat or profile.lat,
            current_lon=profile.current_lon or profile.lon,
            name=profile.name,
            birth_tz=profile.tz
        )
        return {"status": "success", "data": forecast}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-notification")
def test_morning_notification(profile: NativeBirthProfile):
    """
    Simulates / tests the daily 07:00 AM push notification generation for any Kundali.
    """
    try:
        result = PanchangNotificationDispatcher.dispatch_morning_alert(profile)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_notification_history(limit: int = Query(20, ge=1, le=100)):
    """
    Returns latest notification dispatch logs.
    """
    if not NOTIFICATIONS_LOG_FILE.exists():
        return {"records": []}
    try:
        with open(NOTIFICATIONS_LOG_FILE, "r", encoding="utf-8") as f:
            records = json.load(f)
        return {"records": records[-limit:]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# DAILY SUBSCRIPTIONS: browser push (Web Push / VAPID) + WhatsApp Cloud API
# Subscribers live in Firestore (project shriramjiastro-cee67), written only by this
# server, so birth details are never readable from the website.
# Render environment needed:
#   FIREBASE_SERVICE_ACCOUNT_JSON  - service account key (Firestore + admin)
#   VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT - browser push keys
#   PANCHANG_CRON_KEY              - shared secret for the 7 AM GitHub Actions trigger
#   WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE / WHATSAPP_TEMPLATE_LANG
# =============================================================================
import hashlib
import re
import secrets
import threading
import time
import urllib.request
import urllib.error

from fastapi import Request

SUB_COLLECTION = "panchang_subscribers"
IST = ZoneInfo("Asia/Kolkata")


def build_message(name: str, forecast: Dict[str, Any], ai: Optional[Dict[str, str]] = None) -> tuple:
    score = int(round(forecast["overall_day_score"]))
    mood = forecast["sentiment"].split(" (")[0]
    title = f"🌅 {name} — आज का पंचांग: {score}/100 ({mood})"
    golden = (forecast["personalized_windows"].get("golden_hours") or [""])[0].split(" (")[0]
    rahu = (forecast.get("day_timings") or {}).get("rahu_kaal", "")
    theme = ((ai or {}).get("short") or (forecast.get("explain") or {}).get("short")
             or forecast.get("headline") or forecast["core_theme"].split("। ")[0])
    lines = [theme]
    parv = [f["name"].split(" •")[0] for f in (forecast.get("festivals") or [])]
    if parv:
        lines.insert(0, "🪔 आज: " + ", ".join(parv[:2]))
    if golden:
        lines.append(f"✨ शुभ समय: {golden}")
    if rahu:
        lines.append(f"⚠️ राहुकाल: {rahu}")
    return title, "\n".join(lines)


def _db():
    if not _ensure_fcm_initialized():
        return None
    try:
        from firebase_admin import firestore
        return firestore.client()
    except Exception as e:
        logger.warning(f"[PanchangSubs] Firestore unavailable: {e}")
        return None


def _push_ready() -> bool:
    if not (_setting("VAPID_PUBLIC_KEY") and _setting("VAPID_PRIVATE_KEY")):
        return False
    try:
        import pywebpush  # noqa: F401
        return True
    except Exception:
        return False


def _whatsapp_ready() -> bool:
    # paused (Meta charges per message): set PANCHANG_WHATSAPP_ON=1 on Render to switch it on
    return (_setting("PANCHANG_WHATSAPP_ON") == "1"
            and bool(_setting("WHATSAPP_TOKEN") and _setting("WHATSAPP_PHONE_NUMBER_ID")))


def _clean_phone(raw: Optional[str]) -> Optional[str]:
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 10 and digits[0] in "6789":
        return "91" + digits
    if len(digits) == 12 and digits.startswith("91"):
        return digits
    if 11 <= len(digits) <= 15 and not digits.startswith("0"):
        return digits
    return None


class PushSubscription(BaseModel):
    endpoint: str = Field(..., max_length=1000)
    keys: Dict[str, str]


class SubscribeRequest(NativeBirthProfile):
    push: Optional[PushSubscription] = None
    whatsapp_consent: bool = False
    # Firebase ID token of the logged-in user; the WhatsApp number is read from it, so a
    # message can only go to the number that the subscriber proved with an OTP
    id_token: Optional[str] = Field(None, max_length=4096)
    # the Android app shows its own 7 AM notification (a WebView has no web push): it only
    # needs an entry whose /today it can read, keyed by the app's install id
    app_device: Optional[str] = Field(None, pattern=r"^[0-9a-fA-F-]{16,64}$")
    # where the person lives now (timings are for this place); empty = the birth place
    current_place: Optional[str] = Field(None, max_length=120)


def _verified_phone(id_token: Optional[str]) -> Optional[str]:
    if not id_token or not _ensure_fcm_initialized():
        return None
    try:
        from firebase_admin import auth as fb_auth
        claims = fb_auth.verify_id_token(id_token)
        return _clean_phone(claims.get("phone_number"))
    except Exception as e:
        logger.info(f"[PanchangSubs] id token rejected: {e}")
        return None


class TodayRequest(BaseModel):
    id: str = Field(..., max_length=64)
    secret: str = Field(..., max_length=64)


class UnsubscribeRequest(BaseModel):
    id: str = Field(..., max_length=64)
    secret: str = Field(..., max_length=64)


_sub_recent: Dict[str, List[float]] = {}


def _rate_ok(ip: str, limit: int = 10) -> bool:
    now = time.time()
    hits = [t for t in _sub_recent.get(ip, []) if now - t < 3600]
    if len(hits) >= limit:
        _sub_recent[ip] = hits
        return False
    hits.append(now)
    _sub_recent[ip] = hits
    return True


def _forecast_for(sub: Dict[str, Any]) -> Dict[str, Any]:
    return PersonalizedPanchangEngine.generate_daily_forecast(
        birth_year=sub["year"], birth_month=sub["month"], birth_day=sub["day"],
        birth_hour=sub["hour"], birth_minute=sub["minute"],
        birth_lat=sub["lat"], birth_lon=sub["lon"],
        current_lat=sub.get("current_lat") or sub["lat"], current_lon=sub.get("current_lon") or sub["lon"],
        name=sub.get("name") or "जातक", birth_tz=sub.get("tz"),
    )


# ---------------------------------------------------------------------------
# The conversational reading (Gemini). The rules above decide WHAT the day holds for this
# person; Gemini only says it the way a friendly family astrologer would, from those facts.
# One call per subscriber per day, kept on the subscriber's entry ("ai").
# ---------------------------------------------------------------------------
AI_PROMPT = """आप "श्री रामजी एस्ट्रो" के स्नेही पारिवारिक ज्योतिषी हैं और सुबह-सुबह अपने किसी जानने वाले को उसका
आज का पंचांग समझा रहे हैं। नीचे उसकी जन्म कुण्डली और आज के पंचांग से निकले तथ्य (JSON) हैं, और "नियमों_से_बना_पाठ"
में हर हिस्से का सीधा-सादा फल। आपको वही बातें सहज, आत्मीय, बोलचाल की हिन्दी (देवनागरी) में कहनी हैं — "आप" और
नाम के साथ "जी", जैसे कोई अपना समझा रहा हो।

नियम:
- केवल दिए गए तथ्यों और नियमों_से_बना_पाठ के फल पर बात करें; कोई नई भविष्यवाणी, घटना, बीमारी, मृत्यु, दुर्घटना या
  डर की बात न जोड़ें। अच्छे-कठिन का निर्णय वही रहे जो नियमों_से_बना_पाठ में है।
- समय (शुभ समय, राहुकाल, भद्रा) जैसे दिए हैं वैसे ही लिखें।
- भारी शब्द कम; जो आएँ उनका आसान अर्थ साथ में।

केवल यह JSON लौटाइए:
{
 "short": "सूचना की एक पंक्ति, अधिकतम 100 अक्षर, मैसेज जैसी",
 "dasha_phal": "3-4 वाक्य: आज के गोचर, प्रत्यन्तर्दशा व सूक्ष्म दशा, चन्द्र बल और तारा बल के अनुसार आपका दिन कैसा जाएगा",
 "savdhani": ["किन बातों में सावधानी रखनी है — 2 या 3 छोटी पंक्तियाँ"],
 "aage_badhen": ["किन कामों में आगे बढ़ सकते हैं — 2 या 3 छोटी पंक्तियाँ"],
 "dhyan": {"रिश्ते": "एक वाक्य", "धन": "एक वाक्य", "परिवार": "एक वाक्य", "सेहत": "एक वाक्य", "खान-पान": "एक वाक्य"}
}

तथ्य:
"""


def _ai_facts(name: str, f: Dict[str, Any]) -> Dict[str, Any]:
    v = f["active_dashas"]["vimshottari"]
    t = f.get("day_timings") or {}
    return {
        "नाम": name,
        "जन्म_कुण्डली": {**(f.get("natal") or {}),
                        "दशा": f"{v.get('maha_lord_hi')} महादशा, {v.get('antar_lord_hi')} अन्तर्दशा, {v.get('pratyantar_lord_hi')} प्रत्यन्तर्दशा"},
        "आज": {
            "वार": t.get("vaar"), "तिथि": f["panchang_summary"].get("tithi"), "नक्षत्र": f["panchang_summary"].get("nakshatra"),
            "चन्द्र_राशि": f.get("today_moon_rashi_hi"),
            "दिन_का_अंक": f"{int(round(f['overall_day_score']))}/100 ({f['sentiment'].split(' (')[0]})",
            "तारा": f["tara_bala"]["tara_name_hi"], "मुख्य_बात": f["core_theme"],
            "इन_दिनों_का_फोकस": f.get("dasha_focus"),
            "करें": f["dos"], "न_करें": f["donts"],
            "शुभ_समय": f["personalized_windows"]["golden_hours"][:2],
            "राहुकाल": t.get("rahu_kaal"), "दिन_की_सूचनाएँ": f.get("day_notes") or [],
            "उपाय": f["micro_remedy"],
            "सूक्ष्म_दशा": f.get("sukshma_lord_hi"),
        },
        "नियमों_से_बना_पाठ": {k: v for k, v in (f.get("explain") or {}).items() if k != "line"},
    }


def _gemini_reading(name: str, forecast: Dict[str, Any]) -> Optional[Dict[str, str]]:
    key = _setting("GEMINI_API_KEY").strip().strip('"').strip("'")
    if not key:
        return None
    body = {
        "contents": [{"parts": [{"text": AI_PROMPT + json.dumps(_ai_facts(name, forecast), ensure_ascii=False, indent=1)}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.8},
    }
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    # Google answers 503/429 when busy: wait and retry, then try the always-current flash model
    models = list(dict.fromkeys([_setting("GEMINI_MODEL", "gemini-3.5-flash").strip(), "gemini-flash-latest"]))
    import time as _time
    text = None
    deadline = _time.time() + 50          # the app waits about 90 s for /today; never hold it longer
    try:
        for model in models:
            for wait in (0, 3, 8):
                if wait:
                    _time.sleep(wait)
                left = deadline - _time.time()
                if left < 5:
                    break
                req = urllib.request.Request(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                    data=data, headers={"Content-Type": "application/json"})
                try:
                    with urllib.request.urlopen(req, timeout=min(25, left)) as r:
                        reply = json.load(r)
                    text = "".join(p.get("text", "") for p in reply["candidates"][0]["content"]["parts"])
                    break
                except urllib.error.HTTPError as e:
                    if e.code not in (429, 500, 503):
                        raise
                except (TimeoutError, urllib.error.URLError, OSError):
                    pass                  # slow or unreachable: next try
            if text or deadline - _time.time() < 5:
                break
        if not text:
            return None
        out = json.loads(text[text.find("{"): text.rfind("}") + 1])
        short = str(out.get("short", "")).strip()
        if not short:
            return None
        clean_list = lambda v: [str(x).strip()[:200] for x in v][:3] if isinstance(v, list) else None
        dhyan = out.get("dhyan") if isinstance(out.get("dhyan"), dict) else {}
        return {"short": short[:160],
                "dasha_phal": str(out.get("dasha_phal", "")).strip()[:900] or None,
                "savdhani": clean_list(out.get("savdhani")),
                "aage_badhen": clean_list(out.get("aage_badhen")),
                "dhyan": {k: str(dhyan.get(k, "")).strip()[:240] for k in ("रिश्ते", "धन", "परिवार", "सेहत", "खान-पान") if dhyan.get(k)}}
    except Exception as e:
        logger.warning(f"[PanchangSubs] Gemini reading failed: {type(e).__name__}: {str(e)[:200]}")
        return None


def _ai_for(sub: Dict[str, Any], ref, forecast: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Today's conversational reading for this subscriber, made once a day and kept.
    Off unless PANCHANG_AI_ON=1: the 30 rule-based voices (panchang_voices.py) are used."""
    if _setting("PANCHANG_AI_ON") != "1":
        return None
    day = forecast["execution_date"]
    cached = sub.get("ai") or {}
    if cached.get("day") == day and cached.get("short") and "dasha_phal" in cached:
        return {k: v for k, v in cached.items() if k != "day"}
    ai = _gemini_reading(sub.get("name") or "जातक", forecast)
    if ai and ref is not None:
        try:
            ref.update({"ai": {"day": day, **ai}})
        except Exception:
            pass
    return ai


def explain_for(forecast: Dict[str, Any], ai: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """The day's explanation in the fixed template: the panchang line is calculated; the
    other parts are Gemini's wording where it gave them, the rule-based text otherwise."""
    ex = dict(forecast.get("explain") or {})
    if ai:
        for k in ("dasha_phal", "savdhani", "aage_badhen"):
            if ai.get(k):
                ex[k] = ai[k]
        if ai.get("dhyan"):
            ex["dhyan"] = {**(ex.get("dhyan") or {}), **ai["dhyan"]}
        ex["by_ai"] = True
    return ex


def _send_push(sub: Dict[str, Any], title: str, body: str, info: Optional[Dict[str, Any]] = None) -> str:
    """Returns 'sent', 'gone' (browser unsubscribed) or 'error'; info gets the reason."""
    info = info if info is not None else {}
    from pywebpush import webpush, WebPushException
    payload = json.dumps({"title": title, "body": body,
                          "data": {"url": "/aaj-panchang.html", "type": "DAILY_PERSONALIZED_PANCHANG"}},
                         ensure_ascii=False)
    try:
        webpush(subscription_info=sub["push"], data=payload,
                vapid_private_key=_setting("VAPID_PRIVATE_KEY"),
                vapid_claims={"sub": _setting("VAPID_SUBJECT", "mailto:support@shriramjiastro.in")},
                ttl=6 * 3600, headers={"Urgency": "high"})
        return "sent"
    except WebPushException as e:
        code = getattr(getattr(e, "response", None), "status_code", None)
        info["error"] = f"{code}: {str(e)[:200]}"
        if code in (404, 410):
            return "gone"
        logger.warning(f"[PanchangSubs] push failed ({code}): {e}")
        return "error"
    except Exception as e:
        info["error"] = f"{type(e).__name__}: {str(e)[:200]}"
        logger.warning(f"[PanchangSubs] push failed: {e}")
        return "error"


def _wa_param(text: str) -> str:
    # WhatsApp template parameters may not hold new lines, tabs or 4+ spaces
    return re.sub(r"\s+", " ", text or "-").strip()[:900] or "-"


_wa_errors: List[str] = []


def _send_whatsapp(phone: str, name: str, forecast: Dict[str, Any]) -> str:
    timings = forecast.get("day_timings") or {}
    golden = (forecast["personalized_windows"].get("golden_hours") or ["-"])[0]
    params = [
        name,
        datetime.strptime(forecast["execution_date"], "%Y-%m-%d").strftime("%d-%m-%Y"),
        f"{int(round(forecast['overall_day_score']))}/100 {forecast['sentiment'].split(' (')[0]}",
        forecast["core_theme"],
        golden,
        timings.get("rahu_kaal", "-"),
        forecast.get("micro_remedy", "-"),
    ]
    body = {
        "messaging_product": "whatsapp", "to": re.sub(r"\D", "", phone), "type": "template",
        "template": {
            "name": _setting("WHATSAPP_TEMPLATE", "daily_panchang"),
            "language": {"code": _setting("WHATSAPP_TEMPLATE_LANG", "hi")},
            "components": [{"type": "body", "parameters": [{"type": "text", "text": _wa_param(p)} for p in params]}],
        },
    }
    req = urllib.request.Request(
        f"https://graph.facebook.com/v21.0/{_setting('WHATSAPP_PHONE_NUMBER_ID')}/messages",
        data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": "Bearer " + _setting("WHATSAPP_TOKEN"), "Content-Type": "application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return "sent" if r.status < 300 else "error"
    except urllib.error.HTTPError as e:
        raw = e.read()[:600]
        logger.warning(f"[PanchangSubs] WhatsApp failed {e.code}: {raw!r}")
        try:   # Meta's reason, without the number, for /dispatch-status
            err = json.loads(raw.decode("utf-8", "replace")).get("error", {})
            _wa_errors.append(f"{e.code} #{err.get('code')}: {err.get('message', '')} {(err.get('error_data') or {}).get('details', '')}".strip()[:300])
        except Exception:
            _wa_errors.append(f"{e.code}")
        return "error"
    except Exception as e:
        logger.warning(f"[PanchangSubs] WhatsApp failed: {e}")
        _wa_errors.append(type(e).__name__)
        return "error"


@router.get("/config")
def subscription_config():
    """What the subscribe box can offer right now."""
    return {
        "storage_ready": _db() is not None,
        "push_ready": _push_ready(),
        "whatsapp_ready": _whatsapp_ready(),
        "vapid_public_key": _setting("VAPID_PUBLIC_KEY"),
    }


@router.post("/subscribe")
def subscribe(req: SubscribeRequest, request: Request):
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="बहुत अधिक प्रयास — कृपया एक घंटे बाद पुनः प्रयास करें।")
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="दैनिक पंचांग सेवा अभी सक्रिय की जा रही है — कृपया कुछ समय बाद प्रयास करें।")
    phone = None
    if req.whatsapp_consent:
        phone = _verified_phone(req.id_token)
        if not phone:
            raise HTTPException(status_code=401, detail="WhatsApp के लिए पहले अपने मोबाइल नंबर से OTP द्वारा लॉगिन करें — संदेश केवल उसी नंबर पर जाएगा।")
    if not req.push and not phone and not req.app_device:
        raise HTTPException(status_code=400, detail="नोटिफ़िकेशन या WhatsApp — कम से कम एक चुनें।")
    if not (1800 <= req.year <= 2100 and 1 <= req.month <= 12 and 1 <= req.day <= 31 and 0 <= req.hour <= 23 and 0 <= req.minute <= 59
            and -90 <= req.lat <= 90 and -180 <= req.lon <= 180):
        raise HTTPException(status_code=400, detail="जन्म विवरण सही नहीं है।")

    key = ("push:" + req.push.endpoint) if req.push else ("app:" + req.app_device.lower()) if req.app_device else ("wa:" + phone)
    doc_id = hashlib.sha256(key.encode()).hexdigest()[:28]
    col = db.collection(SUB_COLLECTION)
    ref = col.document(doc_id)
    old = ref.get()
    secret = (old.to_dict() or {}).get("secret") if old.exists else None
    secret = secret or secrets.token_urlsafe(18)
    record = {
        "name": (req.name or "जातक").strip()[:60], "year": req.year, "month": req.month, "day": req.day,
        "hour": req.hour, "minute": req.minute, "lat": req.lat, "lon": req.lon, "tz": req.tz,
        "current_lat": req.current_lat if req.current_lat is not None else req.lat,
        "current_lon": req.current_lon if req.current_lon is not None else req.lon,
        "push": req.push.model_dump() if req.push else None,
        "app_device": req.app_device.lower() if req.app_device else None,
        "current_place": (req.current_place or "").strip()[:120] or None,
        "whatsapp": phone, "whatsapp_verified": bool(phone),
        "whatsapp_consent_at": datetime.now(timezone.utc).isoformat() if phone else None,
        "active": True, "secret": secret, "fails": 0,
        "ai": None,                       # birth details may have changed: write today's anew
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if not old.exists:
        record["created_at"] = record["updated_at"]
    ref.set(record, merge=True)
    if phone:   # one WhatsApp number gets one message a day
        for d in col.where("whatsapp", "==", phone).stream():
            if d.id != doc_id:
                if (d.to_dict() or {}).get("push"):
                    d.reference.update({"whatsapp": None})
                else:
                    d.reference.delete()   # it had no other way to reach this person

    forecast = _forecast_for(record)
    title, body = build_message(record["name"], forecast)
    return {"status": "success", "id": doc_id, "secret": secret,
            "channels": {"push": bool(req.push), "whatsapp": bool(phone), "app": bool(req.app_device)},
            "notification": {"title": title, "body": body}}


@router.post("/today")
def today_for_subscriber(req: TodayRequest):
    """The full forecast behind the 7 AM message; the page sends the id and secret that
    this device received when it subscribed."""
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="सेवा उपलब्ध नहीं")
    snap = db.collection(SUB_COLLECTION).document(req.id).get()
    sub = snap.to_dict() if snap.exists else None
    if not sub or not secrets.compare_digest(sub.get("secret", ""), req.secret):
        raise HTTPException(status_code=404, detail="सदस्यता नहीं मिली — कृपया दोबारा सब्सक्राइब करें।")
    forecast = _forecast_for(sub)
    ai = _ai_for(sub, db.collection(SUB_COLLECTION).document(req.id), forecast)
    title, body = build_message(sub.get("name") or "जातक", forecast, ai)
    forecast["explain"] = explain_for(forecast, ai)
    birth = f"{sub['day']:02d}-{sub['month']:02d}-{sub['year']} {sub['hour']:02d}:{sub['minute']:02d}"
    return {"status": "success", "name": sub.get("name") or "जातक", "birth": birth,
            "channels": {"push": bool(sub.get("push")), "whatsapp": bool(sub.get("whatsapp")), "app": bool(sub.get("app_device"))},
            "current_place": sub.get("current_place"),
            "notification": {"title": title, "body": body},
            "forecast": forecast}


@router.post("/unsubscribe")
def unsubscribe(req: UnsubscribeRequest):
    db = _db()
    if db is None:
        raise HTTPException(status_code=503, detail="सेवा उपलब्ध नहीं")
    ref = db.collection(SUB_COLLECTION).document(req.id)
    snap = ref.get()
    if snap.exists and secrets.compare_digest((snap.to_dict() or {}).get("secret", ""), req.secret):
        ref.delete()
    return {"status": "success"}


@router.post("/test-push")
def test_push(req: UnsubscribeRequest, request: Request):
    """Sends this device's notification now, so a subscriber can see that it arrives."""
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
    if not _rate_ok(ip):
        raise HTTPException(status_code=429, detail="बहुत अधिक प्रयास — कृपया एक घंटे बाद पुनः प्रयास करें।")
    db = _db()
    if db is None or not _push_ready():
        raise HTTPException(status_code=503, detail="नोटिफ़िकेशन सेवा अभी उपलब्ध नहीं")
    ref = db.collection(SUB_COLLECTION).document(req.id)
    snap = ref.get()
    sub = snap.to_dict() if snap.exists else None
    if not sub or not secrets.compare_digest(sub.get("secret", ""), req.secret):
        raise HTTPException(status_code=404, detail="सदस्यता नहीं मिली — कृपया दोबारा सब्सक्राइब करें।")
    if not sub.get("push"):
        raise HTTPException(status_code=400, detail="इस सदस्यता में नोटिफ़िकेशन चालू नहीं है।")
    forecast = _forecast_for(sub)
    title, body = build_message(sub.get("name") or "जातक", forecast, _ai_for(sub, ref, forecast))
    info: Dict[str, Any] = {}
    res = _send_push(sub, "🔔 " + title, body, info)
    if res == "gone":
        ref.update({"push": None})
    return {"result": res, "error": info.get("error")}


_dispatch_lock = threading.Lock()
_last_run: Dict[str, Any] = {}


def run_daily_dispatch() -> Dict[str, Any]:
    """Sends today's panchang to every active subscriber once (safe to call twice)."""
    db = _db()
    stats = {"started": datetime.now(IST).isoformat(), "subscribers": 0, "push_sent": 0, "push_gone": 0,
             "whatsapp_sent": 0, "errors": 0, "skipped_already_sent": 0}
    if db is None:
        stats["error"] = "storage_not_configured"
        return stats
    today = datetime.now(IST).strftime("%Y-%m-%d")
    _wa_errors.clear()
    push_ok, wa_ok = _push_ready(), _whatsapp_ready()
    for snap in db.collection(SUB_COLLECTION).where("active", "==", True).stream():
        sub = snap.to_dict() or {}
        stats["subscribers"] += 1
        # each channel goes once a day, so a failed WhatsApp can be retried without a second push
        # (entries from before per-channel dates count last_sent for push only: no WhatsApp went out yet)
        push_done = sub.get("push_sent_on", sub.get("last_sent")) == today
        wa_done = sub.get("wa_sent_on") == today
        if (push_done or not sub.get("push")) and (wa_done or not (sub.get("whatsapp") and sub.get("whatsapp_verified"))) \
                and sub.get("last_sent") == today:
            stats["skipped_already_sent"] += 1
            continue
        if not (sub.get("push") and not push_done) and not (sub.get("whatsapp") and sub.get("whatsapp_verified") and wa_ok and not wa_done):
            # app-only (the phone fetches its own message) or a channel that is switched off
            stats["not_sent_by_server"] = stats.get("not_sent_by_server", 0) + 1
            continue
        try:
            forecast = _forecast_for(sub)
            ai = _ai_for(sub, snap.reference, forecast) if (sub.get("push") and not push_done) else None
            title, body = build_message(sub.get("name") or "जातक", forecast, ai)
            update: Dict[str, Any] = {}
            sent_any = attempted = False
            if sub.get("push") and push_ok and not push_done:
                attempted = True
                res = _send_push(sub, title, body)
                if res == "sent":
                    stats["push_sent"] += 1; sent_any = True; update["push_sent_on"] = today
                elif res == "gone":
                    stats["push_gone"] += 1; update["push"] = None
                    if not sub.get("whatsapp"):
                        update["active"] = False
                else:
                    stats["errors"] += 1
            # only numbers proven by OTP login (entries typed into the first version are skipped)
            if sub.get("whatsapp") and sub.get("whatsapp_verified") and wa_ok and not wa_done:
                attempted = True
                if _send_whatsapp(sub["whatsapp"], sub.get("name") or "जातक", forecast) == "sent":
                    stats["whatsapp_sent"] += 1; sent_any = True; update["wa_sent_on"] = today
                else:
                    stats["errors"] += 1
            if not attempted:
                # no channel of this subscriber is switched on yet (e.g. WhatsApp
                # awaiting Meta approval): try again on the next run, count nothing
                stats["waiting_for_channel"] = stats.get("waiting_for_channel", 0) + 1
                if update:
                    snap.reference.update(update)
                continue
            update["last_sent"] = today
            update["fails"] = 0 if sent_any else int(sub.get("fails", 0)) + 1
            if update["fails"] >= 14:      # two weeks of failures: stop trying
                update["active"] = False
            snap.reference.update(update)
        except Exception as e:
            stats["errors"] += 1
            logger.warning(f"[PanchangSubs] {snap.id}: {e}")
    if _wa_errors:
        stats["whatsapp_errors"] = list(dict.fromkeys(_wa_errors))[:5]
    stats["finished"] = datetime.now(IST).isoformat()
    PanchangNotificationDispatcher.log_dispatch({"timestamp": stats["finished"], "type": "daily_run", **stats})
    return stats


_auto_ran_on: Optional[str] = None


def _auto_dispatch_loop():
    """Sends the day's run from inside the server at 07:00 IST (or as soon as it is awake
    after that, until 21:00). GitHub's schedule proved unreliable; an outside ping of
    /health at 07:00 only has to wake the free server. Each subscriber gets one per day."""
    global _auto_ran_on, _last_run
    import time
    time.sleep(20)
    while True:
        try:
            now = datetime.now(IST)
            today = now.strftime("%Y-%m-%d")
            if _auto_ran_on != today and 7 <= now.hour < 21 and _dispatch_lock.acquire(blocking=False):
                try:
                    _auto_ran_on = today
                    _last_run = run_daily_dispatch()
                    logger.info(f"[PanchangSubs] auto run: {_last_run}")
                    if _last_run.get("error"):    # storage not reachable: try again next round
                        _auto_ran_on = None
                finally:
                    _dispatch_lock.release()
        except Exception as e:
            logger.warning(f"[PanchangSubs] auto run failed: {e}")
        time.sleep(120)


if os.environ.get("RENDER") or os.environ.get("PANCHANG_AUTO_DISPATCH") == "1":
    threading.Thread(target=_auto_dispatch_loop, daemon=True, name="panchang-auto").start()


def _check_cron(request: Request):
    key = _setting("PANCHANG_CRON_KEY")
    if not key or not secrets.compare_digest(request.headers.get("x-cron-key", ""), key):
        raise HTTPException(status_code=403, detail="forbidden")


@router.post("/dispatch-daily")
def dispatch_daily(request: Request):
    """Called at 07:00 IST by .github/workflows/daily-panchang.yml; runs in the background."""
    _check_cron(request)
    if not _dispatch_lock.acquire(blocking=False):
        return {"status": "already_running"}

    def work():
        global _last_run
        try:
            _last_run = run_daily_dispatch()
        finally:
            _dispatch_lock.release()

    threading.Thread(target=work, daemon=True).start()
    return {"status": "started"}


@router.get("/dispatch-status")
def dispatch_status(request: Request):
    _check_cron(request)
    return {"running": _dispatch_lock.locked(), "last_run": _last_run}
