"""
=============================================================================
SRA SUTRADHAR REFERRAL & AUTOMATED PAYOUT ENGINE
=============================================================================
Production-grade FastAPI router & engine for Sutradhar lead attribution,
server-controlled checkout quotations, Razorpay order creation, verified
webhooks, and automated RazorpayX payouts with idempotent commission tracking.

Architecture:
1. Firestore Collections (Server-only writes):
   - sutradhars
   - leads (72h strict attribution lock)
   - orders (tamper-proof server pricing)
   - commissions (1 payment ID = 1 commission strictly)
   - audit_logs (immutable timestamped decisions)
2. Razorpay & RazorpayX Test/Live integration.
3. Admin 'Requires Review' (जाँच ज़रूरी) management.
=============================================================================
"""

import os
import re
import json
import time
import hmac
import hashlib
import base64
import urllib.request
import logging
import asyncio
import threading
from typing import Optional, Dict, Any, List, Union
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Header, Query, status
from pydantic import BaseModel, Field

logger = logging.getLogger("sra_sutradhar")
logger.setLevel(logging.INFO)

# Global store lock for thread-safe in-memory/file operations and atomic transitions
_store_lock = threading.RLock()
_last_admin_alert_time: Dict[str, float] = {}

# =============================================================================
# 1. CONFIGURATION & CREDENTIALS
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent
FALLBACK_DATA_DIR = Path(os.environ.get("SUTRADHAR_DATA_DIR") or (BASE_DIR / "data" / "sutradhar_store"))
FALLBACK_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Razorpay Keys (Defaults to Test Mode credentials; overrides via Environment)
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_517117775DEMO")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "sra_rzp_test_secret_7775")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "sra_webhook_secret_7775")
RAZORPAYX_KEY_ID = os.environ.get("RAZORPAYX_KEY_ID", "rzp_test_TxKlwS0fIp5ncW")
RAZORPAYX_KEY_SECRET = os.environ.get("RAZORPAYX_KEY_SECRET", "qGH6KvI971tvR6iMqOLq1ojb")
RAZORPAYX_ACCOUNT_NUMBER = os.environ.get("RAZORPAYX_ACCOUNT_NUMBER", "2323230035609938")

# -----------------------------------------------------------------------------
# PRICES AND COMMISSION RULES (decided by the owner, 18 Nov 2026)
# - "price" is what the customer pays, GST (18%) included.
# - "rate" is the Sutradhar's commission in percent of the price WITHOUT GST.
#   66% on every report and on the first year of the astrologer SaaS,
#   30% on the 1-year Gurukul course and on SaaS renewals,
#   0 on the 1-on-1 consultation (one consultation a day, per the Daivagya rule).
# The server is the only place a price is decided; pages only display it.
# -----------------------------------------------------------------------------
GST_RATE_PERCENT = 18

SERVICE_CATALOG: Dict[str, Dict[str, Any]] = {
    "mangal_dosha":            {"price": 251,   "rate": 66, "name": "मंगल दोष रिपोर्ट"},
    "kaalsarp_dosha":          {"price": 251,   "rate": 66, "name": "कालसर्प दोष रिपोर्ट"},
    "ratna_report":            {"price": 301,   "rate": 66, "name": "रत्न एवं उपाय रिपोर्ट"},
    "dhana_yoga":              {"price": 301,   "rate": 66, "name": "धन योग रिपोर्ट"},
    "gun_milan_manglik":       {"price": 551,   "rate": 66, "name": "गुण मिलान + मांगलिक"},
    "parashara_report":        {"price": 1111,  "rate": 66, "name": "मेगा पाराशर रिपोर्ट (९७ अध्याय)"},
    "mega_parashara":          {"price": 2100,  "rate": 66, "name": "BPHS पाराशर रिपोर्ट (संपूर्ण, भविष्य का विकल्प)"},
    "muhurta_vivah":           {"price": 2100,  "rate": 66, "name": "विवाह मुहूर्त"},
    "muhurta_vastu":           {"price": 1551,  "rate": 66, "name": "वास्तु मुहूर्त"},
    "muhurta_yajno":           {"price": 1551,  "rate": 66, "name": "यज्ञोपवीत मुहूर्त"},
    "muhurta_mundan":          {"price": 1551,  "rate": 66, "name": "मुंडन (चूडाकर्म) मुहूर्त"},
    "patrika_rajyoga":         {"price": 251,   "rate": 66, "name": "राजयोग / रश्मि बल रिपोर्ट"},
    "patrika_vahan":           {"price": 251,   "rate": 66, "name": "वाहन एवं जनबल रिपोर्ट"},
    "consultation_acharya":    {"price": 5100,  "rate": 0,  "name": "दैवज्ञ 1-on-1 परामर्श"},
    "consultation_yearly":     {"price": 5100,  "rate": 0,  "name": "व्यक्तिगत परामर्श (1 वर्ष)"},
    "consultation_gurukul":    {"price": 24000, "rate": 30, "name": "1-वर्षीय गुरुकुल कोर्स"},
    "astrologer_saas":         {"price": 5100,  "rate": 66, "name": "ज्योतिषी SaaS (पहला वर्ष)"},
    "astrologer_saas_renewal": {"price": 5100,  "rate": 30, "name": "ज्योतिषी SaaS (नवीनीकरण)"},
}

# Older ids still sent by some pages
SERVICE_ALIASES: Dict[str, str] = {
    "manglik_report": "mangal_dosha",
    "manglik_dosha": "mangal_dosha",
    "mangal_dosha_report": "mangal_dosha",
    "kaalsarp": "kaalsarp_dosha",
    "dhan_yoga": "dhana_yoga",
    "gun_milan": "gun_milan_manglik",
    "saas_annual": "astrologer_saas",
    "gurukul_course": "consultation_gurukul",
}

CATALOG_PRICES: Dict[str, int] = {k: v["price"] for k, v in SERVICE_CATALOG.items()}


def resolve_service_id(service_id: str) -> str:
    sid = (service_id or "").strip().lower()
    return SERVICE_ALIASES.get(sid, sid)


def commission_for_payment(service_id: str, paid_paise: int) -> Dict[str, Any]:
    """Commission in whole rupees: rate% of the paid amount after removing GST (rounded down)."""
    sid = resolve_service_id(service_id)
    rate = int(SERVICE_CATALOG.get(sid, {}).get("rate", 0))
    paid_paise = max(0, int(paid_paise))
    net_paise = paid_paise * 100 // (100 + GST_RATE_PERCENT)
    amount = (net_paise * rate // 100) // 100
    return {
        "service_id": sid,
        "rate_percent": rate,
        "paid_amount": paid_paise / 100,
        "amount_excl_gst": round(net_paise / 100, 2),
        "gst_amount": round((paid_paise - net_paise) / 100, 2),
        "commission": float(amount),
    }


# -----------------------------------------------------------------------------
# MASTER TEST CODE: "JAI HANUMAN" turns any payment into Rs 1 so the owner can
# test the live payment flow. It works only for signed-in phones in the list
# below (the word itself is visible in page source, so the phone is the lock).
# Master-code orders never earn a commission.
# -----------------------------------------------------------------------------
MASTER_TEST_PRICE = 1
MASTER_CODES = {"JAIHANUMAN", "जयहनुमान"}


def master_test_phones() -> set:
    raw = os.environ.get("SRA_MASTER_TEST_PHONES", "9517117775")
    return {normalize_phone(p) for p in raw.split(",") if normalize_phone(p)}


def is_master_code(code: Optional[str]) -> bool:
    c = re.sub(r"[\s_\-]", "", (code or "")).upper()
    return c in MASTER_CODES


# -----------------------------------------------------------------------------
# PAYOUT SCHEDULE: like Razorpay settlements, T+2 working days.
# A payment made on day T (IST) is paid to the Sutradhar on the 2nd working day
# after T, in the evening (by 7 PM IST). Sundays, 2nd/4th Saturdays and the
# holidays in data/sutradhar_holidays.json (or SRA_PAYOUT_HOLIDAYS) are skipped.
# Payouts are manual (PAYOUT_MODE=manual) until a payout API is connected.
# -----------------------------------------------------------------------------
IST = timezone(timedelta(hours=5, minutes=30))
PAYOUT_SETTLEMENT_WORKING_DAYS = 2
PAYOUT_DEADLINE_TEXT = "शाम 7 बजे तक"
HOLIDAYS_FILE = Path(os.environ.get("SUTRADHAR_HOLIDAYS_FILE") or (BASE_DIR / "data" / "sutradhar_holidays.json"))


def payout_mode() -> str:
    return (os.environ.get("PAYOUT_MODE") or "manual").strip().lower()


def load_payout_holidays() -> Dict[str, str]:
    out: Dict[str, str] = {}
    try:
        if HOLIDAYS_FILE.exists():
            data = json.loads(HOLIDAYS_FILE.read_text(encoding="utf-8"))
            for h in data.get("holidays", []):
                if h.get("date"):
                    out[h["date"]] = h.get("name", "अवकाश")
    except Exception as e:
        logger.warning(f"[Payout] holidays file note: {e}")
    try:
        doc = SutradharStore.get_doc("settings", "payout_holidays") or {}
        for h in doc.get("holidays", []):
            if h.get("date"):
                out[h["date"]] = h.get("name", "अवकाश")
        for d in doc.get("removed", []):
            out.pop(d, None)
    except Exception as e:
        logger.warning(f"[Payout] holidays store note: {e}")
    for d in (os.environ.get("SRA_PAYOUT_HOLIDAYS") or "").split(","):
        d = d.strip()
        if d:
            out.setdefault(d, "अवकाश")
    return out


def is_payout_working_day(d, holidays: Optional[Dict[str, str]] = None) -> bool:
    if holidays is None:
        holidays = load_payout_holidays()
    if d.weekday() == 6:  # Sunday
        return False
    if d.weekday() == 5 and ((d.day - 1) // 7 + 1) in (2, 4):  # 2nd / 4th Saturday
        return False
    return d.isoformat() not in holidays


def payout_due_date_for(paid_at_utc: datetime) -> str:
    """IST date (YYYY-MM-DD) on which this payment's commission is paid out."""
    holidays = load_payout_holidays()
    d = paid_at_utc.astimezone(IST).date()
    counted = 0
    while counted < PAYOUT_SETTLEMENT_WORKING_DAYS:
        d = d + timedelta(days=1)
        if is_payout_working_day(d, holidays):
            counted += 1
    return d.isoformat()


def today_ist() -> str:
    return datetime.now(timezone.utc).astimezone(IST).date().isoformat()


UNPAID_COMMISSION_STATUSES = ("created", "approved", "failed_retry", "requires_review", "processing")

# =============================================================================
# 2. FIRESTORE / PERSISTENT STORAGE ADAPTER
# =============================================================================
_firestore_db = None
_firebase_initialized = False

try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    if not firebase_admin._apps:
        cred_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

        if cred_json:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred, {"projectId": "shriramjiastro-cee67"})
            _firestore_db = firestore.client()
            _firebase_initialized = True
            logger.info("[SRA Sutradhar] Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON")
        elif cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {"projectId": "shriramjiastro-cee67"})
            _firestore_db = firestore.client()
            _firebase_initialized = True
            logger.info("[SRA Sutradhar] Firebase Admin initialized from GOOGLE_APPLICATION_CREDENTIALS")
        else:
            logger.info("[SRA Sutradhar] No Firebase service account file provided; running robust persistent file-backed store.")
    else:
        _firestore_db = firestore.client()
        _firebase_initialized = True
except Exception as e:
    logger.warning(f"[SRA Sutradhar] Firebase Admin initialization note: {e}")
    _firestore_db = None


class SutradharStore:
    """Thread-safe persistent store abstraction backing Firestore & Local JSON file mirror."""
    @staticmethod
    def _read_json(col_name: str) -> Dict[str, Any]:
        fp = FALLBACK_DATA_DIR / f"{col_name}.json"
        if fp.exists():
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    @staticmethod
    def _write_json(col_name: str, data: Dict[str, Any]):
        fp = FALLBACK_DATA_DIR / f"{col_name}.json"
        try:
            with open(fp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"[Store write error] {col_name}: {e}")

    @classmethod
    def get_doc(cls, col_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
        with _store_lock:
            if _firestore_db:
                try:
                    snap = _firestore_db.collection(col_name).document(doc_id).get()
                    if snap.exists:
                        d = snap.to_dict()
                        d["id"] = snap.id
                        return d
                except Exception as e:
                    logger.warning(f"Firestore get error: {e}")
            local = cls._read_json(col_name)
            return local.get(doc_id)

    @classmethod
    def set_doc(cls, col_name: str, doc_id: str, data: Dict[str, Any]):
        with _store_lock:
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            if _firestore_db:
                try:
                    _firestore_db.collection(col_name).document(doc_id).set(data, merge=True)
                except Exception as e:
                    logger.warning(f"Firestore set error: {e}")
            local = cls._read_json(col_name)
            local[doc_id] = data
            cls._write_json(col_name, local)

    @classmethod
    def create_doc_if_not_exists(cls, col_name: str, doc_id: str, data: Dict[str, Any]) -> bool:
        """Atomic create-if-not-exists. Returns True if created, False if already exists."""
        with _store_lock:
            existing = cls.get_doc(col_name, doc_id)
            if existing:
                return False
            data["updated_at"] = datetime.now(timezone.utc).isoformat()
            if _firestore_db:
                try:
                    doc_ref = _firestore_db.collection(col_name).document(doc_id)
                    snap = doc_ref.get()
                    if snap.exists:
                        return False
                    doc_ref.set(data)
                except Exception as e:
                    logger.warning(f"Firestore atomic create note: {e}")
            local = cls._read_json(col_name)
            if doc_id in local:
                return False
            local[doc_id] = data
            cls._write_json(col_name, local)
            return True

    @classmethod
    def compare_and_set_status(cls, col_name: str, doc_id: str, expected_statuses: List[str], new_fields: Dict[str, Any]) -> bool:
        """Atomic status transition check. Returns True if matched & updated, False otherwise."""
        with _store_lock:
            doc = cls.get_doc(col_name, doc_id)
            if not doc:
                return False
            curr = doc.get("status")
            if curr not in expected_statuses:
                return False
            doc.update(new_fields)
            doc["updated_at"] = datetime.now(timezone.utc).isoformat()
            cls.set_doc(col_name, doc_id, doc)
            return True

    @classmethod
    def query_all(cls, col_name: str) -> List[Dict[str, Any]]:
        with _store_lock:
            if _firestore_db:
                try:
                    docs = _firestore_db.collection(col_name).stream()
                    res = []
                    for d in docs:
                        item = d.to_dict()
                        item["id"] = d.id
                        res.append(item)
                    if res:
                        return res
                except Exception as e:
                    logger.warning(f"Firestore query error: {e}")
            local = cls._read_json(col_name)
            res = []
            for k, v in local.items():
                item = dict(v)
                item["id"] = k
                res.append(item)
            return res


def log_audit_event(event_type: str, actor: str, details: Dict[str, Any]):
    """Appends an immutable audit event to audit_logs."""
    now_iso = datetime.now(timezone.utc).isoformat()
    log_id = f"audit_{int(time.time()*1000)}_{os.urandom(3).hex()}"
    record = {
        "id": log_id,
        "event_type": event_type,
        "actor": actor,
        "timestamp": now_iso,
        "details": details
    }
    SutradharStore.set_doc("audit_logs", log_id, record)
    logger.info(f"[AUDIT] {event_type} | Actor: {actor} | Details: {details}")


# Helper phone normalizer
def normalize_phone(raw_phone: str) -> str:
    cleaned = re.sub(r"\D", "", str(raw_phone or ""))
    return cleaned[-10:] if len(cleaned) >= 10 else cleaned


_token_verify_app = None


def _get_token_verify_app():
    """Firebase app used only to verify ID tokens; needs the project id, not a service account."""
    global _token_verify_app
    if _token_verify_app is not None:
        return _token_verify_app
    import firebase_admin
    from firebase_admin import credentials as fb_credentials
    if firebase_admin._apps and _firebase_initialized:
        _token_verify_app = firebase_admin.get_app()
        return _token_verify_app
    import google.auth.credentials as g_credentials

    class _AnonymousCredential(fb_credentials.Base):
        def get_credential(self):
            return g_credentials.AnonymousCredentials()

    try:
        _token_verify_app = firebase_admin.get_app("sra-token-verify")
    except ValueError:
        _token_verify_app = firebase_admin.initialize_app(
            _AnonymousCredential(), {"projectId": "shriramjiastro-cee67"}, name="sra-token-verify"
        )
    return _token_verify_app


def _is_test_env() -> bool:
    return os.environ.get("SUTRADHAR_TEST_MODE") == "1" or os.environ.get("TESTING") == "1"


def verify_firebase_token(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    """Returns the verified Firebase ID token claims, or None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token_str = authorization.split(" ", 1)[1].strip()
    if not token_str:
        return None

    # Test mode hooks for unit/integration tests without live network calls
    if _is_test_env():
        if token_str.startswith("mock_token_"):
            return {"uid": token_str, "phone_number": "+91" + normalize_phone(token_str.replace("mock_token_", "")),
                    "auth_time": int(time.time())}
        if token_str.startswith("mock_old_token_"):
            return {"uid": token_str, "phone_number": "+91" + normalize_phone(token_str.replace("mock_old_token_", "")),
                    "auth_time": int(time.time()) - 86400}
        if token_str.startswith("mock_admin_"):
            return {"uid": token_str, "email": token_str.replace("mock_admin_", ""), "email_verified": True,
                    "auth_time": int(time.time())}

    try:
        from firebase_admin import auth as fb_auth
        return fb_auth.verify_id_token(token_str, app=_get_token_verify_app())
    except Exception as e:
        logger.warning(f"[Auth] Firebase ID token verification notice: {e}")
    return None


def token_phone(decoded: Optional[Dict[str, Any]]) -> Optional[str]:
    """Phone proven by Firebase Phone Auth (the token's own phone_number claim)."""
    if decoded and decoded.get("phone_number"):
        phone = normalize_phone(decoded["phone_number"])
        if len(phone) == 10:
            return phone
    return None


def get_authenticated_customer_phone(authorization: Optional[str]) -> Optional[str]:
    """
    R2: Extracts customer phone from verified Firebase ID token on the server.
    Order of precedence:
      1. token["phone_number"] (normalized to last 10 digits)
      2. User profile record in Firestore at users/{uid} (saved by sra-auth.js)
    """
    decoded = verify_firebase_token(authorization)
    if not decoded:
        return None
    phone = token_phone(decoded)
    if phone:
        return phone
    uid = decoded.get("uid")
    if uid:
        user_doc = SutradharStore.get_doc("users", uid)
        if user_doc and user_doc.get("phone"):
            phone = normalize_phone(user_doc["phone"])
            if len(phone) == 10:
                return phone
    return None


def admin_emails() -> set:
    raw = os.environ.get("SRA_ADMIN_EMAILS", "shriramjiastro7@gmail.com")
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def require_admin(authorization: Optional[str]) -> str:
    """Only the site owner's Google account (signed in on admin.html) may use admin routes."""
    decoded = verify_firebase_token(authorization)
    email = (decoded or {}).get("email", "").strip().lower()
    if not decoded or not decoded.get("email_verified") or email not in admin_emails():
        raise HTTPException(status_code=401, detail="केवल व्यवस्थापक (admin) के लिए। कृपया admin खाते से साइन इन करें।")
    return email


def find_sutradhar_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    return next((s for s in SutradharStore.query_all("sutradhars") if s.get("phone") == phone), None)


def require_sutradhar_phone(authorization: Optional[str]) -> str:
    phone = token_phone(verify_firebase_token(authorization))
    if not phone:
        raise HTTPException(status_code=401, detail="सत्र समाप्त। कृपया OTP से फिर लॉगिन करें।")
    return phone


def require_sutradhar(authorization: Optional[str]) -> Dict[str, Any]:
    phone = require_sutradhar_phone(authorization)
    sutradhar = find_sutradhar_by_phone(phone)
    if not sutradhar:
        raise HTTPException(status_code=404, detail="यह नंबर सूत्रधार के रूप में पंजीकृत नहीं है।")
    if sutradhar.get("status") == "paused":
        raise HTTPException(status_code=403, detail="आपका सूत्रधार खाता अभी रुका हुआ है। सहायता से संपर्क करें।")
    return sutradhar


def get_sutradhar_alias_ids(sutradhar_id: str) -> set:
    raw = (sutradhar_id or "").strip()
    clean_raw = raw.upper()
    matching_ids = {raw, clean_raw, clean_raw.replace("-", "")}
    clean_p = normalize_phone(raw)
    if clean_p and len(clean_p) == 10:
        matching_ids.add(clean_p)

    all_sutradhars = SutradharStore.query_all("sutradhars")
    for s in all_sutradhars:
        s_phone = s.get("phone", "")
        s_code = s.get("code", "")
        s_id = s.get("id", "")
        s_sutraid = s.get("sutradhar_id", "")

        is_match = False
        s_candidates = {
            s_id.upper(), s_code.upper(), s_sutraid.upper(),
            s_id.upper().replace("-", ""), s_code.upper().replace("-", ""), s_sutraid.upper().replace("-", "")
        }
        if clean_raw in s_candidates or clean_raw.replace("-", "") in s_candidates:
            is_match = True
        elif clean_p and s_phone == clean_p:
            is_match = True
        elif clean_raw.startswith("SUTRA"):
            clean_digits = re.sub(r"\D", "", clean_raw)
            if clean_digits and s_phone.endswith(clean_digits):
                is_match = True

        if is_match:
            if s_id: matching_ids.update({s_id.upper(), s_id.upper().replace("-", "")})
            if s_sutraid: matching_ids.update({s_sutraid.upper(), s_sutraid.upper().replace("-", "")})
            if s_code: matching_ids.update({s_code.upper(), s_code.upper().replace("-", "")})
            if s_phone: matching_ids.add(s_phone)

    return matching_ids


# =============================================================================
# 3. PYDANTIC SCHEMAS
# =============================================================================
class AddLeadRequest(BaseModel):
    sutradhar_id: Optional[str] = Field(None, description="Sutradhar Unique ID e.g. SUTRA-7775-01 or SRA-7K3M9Q")
    customer_phone: str = Field(..., description="10-digit customer mobile number")
    customer_email: Optional[str] = Field(None, description="Customer email address")
    customer_name: Optional[str] = Field("जातक", description="Customer full name")

class QuoteRequest(BaseModel):
    customer_phone: str = Field(..., description="10-digit customer mobile number")
    service_id: str = Field(..., description="Catalog service identifier")
    input_code: Optional[str] = Field(None, description="Promo code entered by customer (optional)")

class CreateOrderRequest(BaseModel):
    customer_phone: str = Field(..., description="Customer 10-digit mobile number")
    customer_name: Optional[str] = Field("जातक", description="Customer name")
    customer_email: Optional[str] = Field(None, description="Customer email")
    service_id: str = Field(..., description="Service identifier")
    input_code: Optional[str] = Field(None, description="Optional manual coupon")

class ReviewActionRequest(BaseModel):
    commission_id: str
    action: str = Field(..., description="'retry' or 'cancel'")
    reason: Optional[str] = Field(None, description="Reason for cancellation or notes")
    upi_id: Optional[str] = Field(None, description="Optional UPI ID for retry")

class RegisterSutradharRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    upi_id: Optional[str] = None
    pan: Optional[str] = None
    code: Optional[str] = None
    otp: Optional[str] = None


class OtpSendRequest(BaseModel):
    phone: str


class OtpVerifyRequest(BaseModel):
    phone: str
    otp: str


# Rate limit tracking for OTPs
_otp_rate_limits: Dict[str, List[float]] = {}

def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    now = time.time()
    with _store_lock:
        timestamps = _otp_rate_limits.get(key, [])
        valid_ts = [t for t in timestamps if now - t < window_seconds]
        if len(valid_ts) >= max_requests:
            _otp_rate_limits[key] = valid_ts
            return False
        valid_ts.append(now)
        _otp_rate_limits[key] = valid_ts
        return True


# =============================================================================
# 4. FASTAPI ROUTER & CORE LOGIC
# =============================================================================
router = APIRouter(prefix="/api/sutradhar", tags=["Sutradhar Referral & Payout Engine"])


# -----------------------------------------------------------------------------
# ENDPOINT OTP: SEND & VERIFY (Q1: Rate limits & no dev OTP in production)
# -----------------------------------------------------------------------------
@router.post("/otp/send")
async def send_otp(req: OtpSendRequest, request: Request):
    """
    Q1: Generate a 6-digit OTP with strict rate limiting per phone and per IP.
    Dev fallback OTP is completely disabled in production.
    """
    import random
    clean_phone = normalize_phone(req.phone)
    if len(clean_phone) != 10:
        raise HTTPException(status_code=400, detail="कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।")

    client_ip = request.client.host if request.client else "unknown"

    # Rate limits: max 3 per phone, max 10 per IP in 10 minutes (600s)
    if not check_rate_limit(f"phone_{clean_phone}", max_requests=3, window_seconds=600):
        raise HTTPException(status_code=429, detail="इस नंबर पर बहुत अधिक OTP अनुरोध भेजे गए हैं। कृपया 10 मिनट बाद प्रयास करें।")
    if not check_rate_limit(f"ip_{client_ip}", max_requests=10, window_seconds=600):
        raise HTTPException(status_code=429, detail="आपके नेटवर्क से बहुत अधिक OTP अनुरोध किए गए हैं। कृपया थोड़ी देर बाद प्रयास करें।")

    otp = str(random.randint(100000, 999999))
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()

    SutradharStore.set_doc("otps", clean_phone, {"phone": clean_phone, "otp": otp, "expires_at": expires_at})

    # Try MSG91 delivery if configured
    auth_key = os.environ.get("MSG91_AUTH_KEY", "")
    sms_sent = False
    if auth_key:
        try:
            import httpx
            template_id = os.environ.get("MSG91_TEMPLATE_ID", "")
            async with httpx.AsyncClient(timeout=5.0) as client_http:
                await client_http.post(
                    "https://api.msg91.com/api/v5/otp",
                    json={"template_id": template_id, "mobile": f"91{clean_phone}",
                          "authkey": auth_key, "otp": otp}
                )
            sms_sent = True
        except Exception:
            pass

    is_production = os.environ.get("ENV") == "production" or not (os.environ.get("SUTRADHAR_TEST_MODE") == "1")
    dev_otp_val = None if is_production else (otp if not sms_sent else None)

    return {"status": "sent", "message": "OTP भेजा गया।", "dev_otp": dev_otp_val}


@router.post("/otp/verify")
async def verify_otp(req: OtpVerifyRequest):
    """Verify OTP. Returns {exists: bool, sutradhar?: {...}} on success."""
    clean_phone = normalize_phone(req.phone)
    record = SutradharStore.get_doc("otps", clean_phone)

    if not record:
        raise HTTPException(status_code=400, detail="OTP नहीं मिला या समय सीमा समाप्त हो गई। पुनः OTP मंगाएं।")

    expires_at = datetime.fromisoformat(record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="OTP की समय सीमा समाप्त हो गई। पुनः OTP मंगाएं।")

    if record["otp"] != req.otp.strip():
        raise HTTPException(status_code=400, detail="OTP गलत है। पुनः प्रयास करें।")

    # Delete used OTP
    SutradharStore.set_doc("otps", clean_phone, {})

    # Check if already registered
    all_sutras = SutradharStore.query_all("sutradhars")
    sutradhar = next((s for s in all_sutras if s.get("phone") == clean_phone), None)

    return {"status": "verified", "exists": bool(sutradhar), "sutradhar": sutradhar}


# -----------------------------------------------------------------------------
# ENDPOINT 0: SUTRADHAR ONBOARDING & PROFILE SYNC (Q2: UPI format & OTP on change)
# -----------------------------------------------------------------------------
@router.post("/register")
async def register_or_sync_sutradhar(req: RegisterSutradharRequest, authorization: Optional[str] = Header(None)):
    """
    Registers or updates the signed-in Sutradhar's own profile.
    - The phone comes from the Firebase Phone Auth token; nobody can register or edit another number.
    - Changing an existing UPI ID needs a fresh OTP sign-in (within the last 15 minutes).
    """
    decoded = verify_firebase_token(authorization)
    clean_phone = token_phone(decoded)
    if not clean_phone:
        raise HTTPException(status_code=401, detail="सत्र समाप्त। कृपया OTP से फिर लॉगिन करें।")
    if req.phone and normalize_phone(req.phone) != clean_phone:
        raise HTTPException(status_code=403, detail="आप केवल अपने ही नंबर की प्रोफ़ाइल बदल सकते हैं।")

    # Clean & validate UPI format
    clean_upi = (req.upi_id or "").strip().lower()
    if clean_upi:
        if not re.match(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$", clean_upi):
            raise HTTPException(status_code=400, detail="कृपया मान्य UPI आईडी दर्ज करें (जैसे: name@okhdfcbank या 9876543210@paytm)।")

    existing = find_sutradhar_by_phone(clean_phone)

    # Changing an existing UPI ID needs a recent OTP sign-in
    if existing and existing.get("upi_id") and clean_upi and clean_upi != existing.get("upi_id"):
        auth_time = int((decoded or {}).get("auth_time", 0) or 0)
        if time.time() - auth_time > 15 * 60:
            raise HTTPException(status_code=409, detail="recent_login_required: सुरक्षा के लिए UPI बदलने से पहले फिर से OTP से लॉगिन करें।")

    if existing:
        s_id = existing["id"]
        code = (existing.get("code") or existing.get("sutradhar_id") or f"SUTRA{clean_phone[-4:]}01").replace("-", "")
    else:
        s_id = f"SUTRA-{clean_phone[-4:]}-01"
        if SutradharStore.get_doc("sutradhars", s_id):
            s_id = f"SUTRA-{clean_phone[-4:]}-{os.urandom(2).hex().upper()}"
        code = f"SRA{os.urandom(3).hex().upper()}"

    sutradhar_doc = dict(existing or {})
    sutradhar_doc.update({
        "id": s_id,
        "sutradhar_id": s_id,
        "name": (req.name or (existing or {}).get("name") or "सूत्रधार").strip(),
        "phone": clean_phone,
        "email": (req.email if req.email is not None else (existing or {}).get("email", "")).strip().lower(),
        "code": code,
        "upi_id": clean_upi or (existing or {}).get("upi_id", ""),
        "pan": (req.pan or (existing or {}).get("pan", "")).strip().upper(),
        "status": (existing or {}).get("status", "active"),
        "created_at": (existing or {}).get("created_at") or datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    if existing and clean_upi and clean_upi != existing.get("upi_id"):
        sutradhar_doc["upi_verified"] = False  # admin re-checks the name with a Rs 1 test payment

    SutradharStore.set_doc("sutradhars", s_id, sutradhar_doc)
    log_audit_event("SUTRADHAR_REGISTERED" if not existing else "SUTRADHAR_PROFILE_UPDATED", s_id,
                    {"phone": clean_phone, "code": code, "upi": sutradhar_doc["upi_id"]})

    return {
        "status": "success",
        "message": f"सूत्रधार '{sutradhar_doc['name']}' सक्रिय है।",
        "sutradhar": sutradhar_doc
    }


# -----------------------------------------------------------------------------
# ENDPOINT 1: LEAD REGISTRATION WITH 72H LOCK & 1-DAY GAP RULE
# -----------------------------------------------------------------------------
@router.post("/leads/add")
async def add_lead(req: AddLeadRequest, authorization: Optional[str] = Header(None)):
    """
    लीड दर्ज करना:
    1. सूत्रधार की पहचान केवल OTP-लॉगिन (Firebase token) से; body का sutradhar_id अनदेखा।
    2. नंबर मानकीकरण।
    3. R5: सूत्रधार स्वयं का, परिवार का या किसी का भी नंबर दर्ज कर सकता है।
    4. R3 & P3: एटॉमिक 72-घंटे का ताला (एक समय में ठीक एक सक्रिय)।
    5. R4: ताला समाप्त होने पर कोई भी सूत्रधार तुरंत पुनः दर्ज कर सकता है।
    """
    sutradhar = require_sutradhar(authorization)
    clean_customer_phone = normalize_phone(req.customer_phone)
    if len(clean_customer_phone) != 10:
        raise HTTPException(status_code=400, detail="कृपया ग्राहक का 10-अंकों का मान्य मोबाइल नंबर दर्ज करें।")

    sutradhar_id = sutradhar.get("sutradhar_id") or sutradhar["id"]
    sutra_phone = sutradhar.get("phone", "")

    # P3: Concurrency protection — exactly one simultaneous lead creation succeeds
    with _store_lock:
        now = datetime.now(timezone.utc)
        all_leads = SutradharStore.query_all("leads")

        # Find existing unexpired leads for this customer phone
        for lead in all_leads:
            if lead.get("customer_phone") == clean_customer_phone:
                exp_dt_str = lead.get("expires_at")
                try:
                    exp_dt = datetime.fromisoformat(exp_dt_str) if exp_dt_str else now
                except Exception:
                    exp_dt = now

                # R3: Check if lock is currently unexpired
                if exp_dt > now and lead.get("status") in ("active", "converted"):
                    lead_owner = lead.get("sutradhar_id", "")
                    diff_sec = int((exp_dt - now).total_seconds())
                    hrs = diff_sec // 3600
                    mins = (diff_sec % 3600) // 60
                    if lead_owner != sutradhar_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"यह ग्राहक अभी किसी अन्य सूत्रधार के पास 72-घंटे के ताले में सुरक्षित है (शेष समय: {hrs} घंटे {mins} मिनट)।"
                        )
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=f"नियम: यह ग्राहक पहले से आपकी सक्रिय सूची में सुरक्षित है ({hrs} घंटे {mins} मिनट शेष)।"
                        )

        # R4: If expired or never added, any agent can add immediately (no cooldown)
        expires_at = now + timedelta(hours=72)
        lead_id = f"lead_{clean_customer_phone}_{int(now.timestamp())}_{os.urandom(2).hex()}"
        lead_record = {
            "id": lead_id,
            "customer_phone": clean_customer_phone,
            "customer_email": (req.customer_email or "").strip().lower(),
            "customer_name": req.customer_name or "जातक",
            "sutradhar_id": sutradhar_id,
            "sutradhar_code": sutradhar.get("code") or sutradhar_id,
            "sutradhar_phone": sutra_phone,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "status": "active"
        }

        SutradharStore.set_doc("leads", lead_id, lead_record)
        log_audit_event("LEAD_CREATED", sutradhar_id, {
            "lead_id": lead_id,
            "customer_phone": clean_customer_phone,
            "expires_at": expires_at.isoformat()
        })

    return {
        "status": "success",
        "lead_id": lead_id,
        "message": "लीड 72 घंटे के लिए आपकी है। इस दौरान इस नंबर से हर खरीद का कमीशन (GST घटाकर 66%; कोर्स 30%; परामर्श पर नहीं) अपने आप आपके खाते में जुड़ेगा।",
        "customer_phone": clean_customer_phone,
        "expires_at": expires_at.isoformat(),
        "lock_hours": 72
    }


# -----------------------------------------------------------------------------
# ENDPOINT 2: LEAD LISTING WITH LIVE COUNTDOWN FOR SUTRADHAR DASHBOARD
# -----------------------------------------------------------------------------
@router.get("/leads/list")
async def list_sutradhar_leads(sutradhar_id: Optional[str] = Query(None, description="Ignored; the signed-in Sutradhar is used"),
                               authorization: Optional[str] = Header(None)):
    """Returns the signed-in Sutradhar's leads with countdowns, commission and payout date."""
    me = require_sutradhar(authorization)
    s_id = (me.get("sutradhar_id") or me["id"]).upper()
    matching_ids = get_sutradhar_alias_ids(s_id)
    comms_by_lead: Dict[str, List[Dict[str, Any]]] = {}
    for c in SutradharStore.query_all("commissions"):
        if c.get("lead_id"):
            comms_by_lead.setdefault(c["lead_id"], []).append(c)
    all_leads = SutradharStore.query_all("leads")
    now = datetime.now(timezone.utc)

    sutra_leads = [
        l for l in all_leads 
        if (l.get("sutradhar_id", "").upper() in matching_ids or 
            l.get("sutradhar_code", "").upper() in matching_ids or 
            l.get("sutradhar_phone", "") in matching_ids)
    ]
    enriched = []

    for l in sutra_leads:
        exp_dt_str = l.get("expires_at")
        try:
            exp_dt = datetime.fromisoformat(exp_dt_str) if exp_dt_str else now
        except Exception:
            exp_dt = now

        curr_status = l.get("status", "active")
        remaining_sec = max(0, int((exp_dt - now).total_seconds()))

        # Auto-expire if time passed and still active
        if curr_status == "active" and remaining_sec <= 0:
            curr_status = "expired"
            l["status"] = "expired"
            SutradharStore.set_doc("leads", l["id"], l)

        # Human-readable Hindi countdown
        days = remaining_sec // 86400
        hrs = (remaining_sec % 86400) // 3600
        mins = (remaining_sec % 3600) // 60

        if curr_status == "active":
            if days > 0:
                countdown_text = f"{days} दिन {hrs} घंटे शेष"
            elif hrs > 0:
                countdown_text = f"{hrs} घंटे {mins} मिनट शेष"
            else:
                countdown_text = f"{mins} मिनट शेष"
        elif curr_status == "converted":
            countdown_text = "खरीद पूर्ण ✅"
        else:
            countdown_text = "समय समाप्त ⏰"

        item = dict(l)
        item["lead_id"] = l.get("id", "")
        lead_comms = [c for c in comms_by_lead.get(l.get("id", ""), []) if c.get("status") != "cancelled"]
        item["commission_amount"] = sum(float(c.get("amount", 0) or 0) for c in lead_comms)
        item["commissions"] = [{
            "commission_id": c.get("id"),
            "product": c.get("product"),
            "product_name": SERVICE_CATALOG.get(resolve_service_id(c.get("product", "")), {}).get("name", c.get("product")),
            "order_amount": c.get("order_amount"),
            "amount": c.get("amount"),
            "status": c.get("status"),
            "payout_due_date": c.get("payout_due_date"),
            "utr": c.get("utr"),
            "paid_at": c.get("paid_at"),
        } for c in lead_comms]
        item["utr"] = next((c.get("utr") for c in lead_comms if c.get("utr")), "")
        item["remaining_seconds"] = remaining_sec
        item["countdown_text"] = countdown_text
        item["remaining_text"] = countdown_text
        item["status"] = curr_status
        item["status_label"] = "चालू (ताला सक्रिय)" if curr_status == "active" else ("सफल खरीद" if curr_status == "converted" else "समय समाप्त")
        enriched.append(item)

    # Sort newest first
    enriched.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {
        "status": "success",
        "sutradhar_id": s_id,
        "total_leads": len(enriched),
        "leads": enriched
    }


# -----------------------------------------------------------------------------
# ENDPOINT 3: SERVER QUOTATION (CHECKOUT PRICING & 72H PHONE ATTRIBUTION)
# -----------------------------------------------------------------------------
def find_active_lead_for_phone(phone: str, now: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
    """Unexpired 72h lead (active or converted) for this customer phone."""
    now = now or datetime.now(timezone.utc)
    for l in SutradharStore.query_all("leads"):
        if l.get("customer_phone") == phone and l.get("status") in ("active", "converted"):
            try:
                if datetime.fromisoformat(l["expires_at"]) > now:
                    return l
            except Exception:
                continue
    return None


def build_quote(customer_phone: str, service_id: str, input_code: Optional[str],
                verified_phone: Optional[str]) -> Dict[str, Any]:
    """
    दाम बताना (checkout से पहले):
    1. दाम केवल SERVICE_CATALOG से (GST सहित)। अनजान सेवा पर 400।
    2. ग्राहक को कोई कूपन छूट नहीं। केवल "JAI HANUMAN" मास्टर कोड, और वह भी केवल
       सूची वाले लॉगिन फ़ोन पर, दाम ₹1 करता है (टेस्ट; कोई कमीशन नहीं)।
    3. चालू 72-घंटे की लीड मिले तो सूत्रधार एट्रिब्यूशन जानकारी जोड़ता है।
    """
    sid = resolve_service_id(service_id)
    item = SERVICE_CATALOG.get(sid)
    if not item:
        raise HTTPException(status_code=400, detail=f"अज्ञात सेवा: {service_id}")
    base_price = int(item["price"])
    gst_inclusive = commission_for_payment(sid, base_price * 100)
    base = {
        "status": "success",
        "valid": True,
        "service_id": sid,
        "service_name": item["name"],
        "base_price": base_price,
        "original_price": base_price,
        "gst_percent": GST_RATE_PERCENT,
        "price_excl_gst": gst_inclusive["amount_excl_gst"],
        "gst_amount": gst_inclusive["gst_amount"],
        "auto_applied": False,
        "is_test": False,
    }

    code_given = bool((input_code or "").strip())
    if code_given and is_master_code(input_code):
        if verified_phone and verified_phone in master_test_phones():
            base.update({
                "has_active_lead": False,
                "is_test": True,
                "discount_amount": base_price - MASTER_TEST_PRICE,
                "discount_percent": round((base_price - MASTER_TEST_PRICE) * 100 / base_price, 2),
                "net_price": MASTER_TEST_PRICE,
                "final_price": MASTER_TEST_PRICE,
                "net_price_paise": MASTER_TEST_PRICE * 100,
                "code_status": "master_test",
                "message": "टेस्ट भुगतान ₹1 (कोई कमीशन नहीं)।"
            })
            return base
        code_message = "कोड अमान्य है।"  # same reply as any other code: nobody learns it is special
    elif code_given:
        code_message = "कोड अमान्य है।"
    else:
        code_message = ""

    base.update({
        "discount_amount": 0,
        "discount_percent": 0,
        "net_price": base_price,
        "final_price": base_price,
        "net_price_paise": base_price * 100,
        "code_status": "invalid" if code_given else "none",
    })

    active_lead = find_active_lead_for_phone(normalize_phone(customer_phone))
    if active_lead:
        base.update({
            "has_active_lead": True,
            "lead_id": active_lead["id"],
            "sutradhar_id": active_lead.get("sutradhar_id"),
            "sutradhar_code": (active_lead.get("sutradhar_code") or active_lead.get("sutradhar_id") or "").replace("-", ""),
            "message": code_message or "पूर्ण दक्षिणा मूल्य (GST सहित)",
        })
    else:
        base.update({"has_active_lead": False, "message": code_message or "पूर्ण दक्षिणा मूल्य (GST सहित)"})
    return base


@router.post("/quote")
async def get_checkout_quote(req: QuoteRequest, authorization: Optional[str] = Header(None)):
    verified_phone = token_phone(verify_firebase_token(authorization))
    return build_quote(req.customer_phone, req.service_id, req.input_code, verified_phone)


@router.get("/catalog")
async def get_service_catalog():
    """Public price list (GST included) and the Sutradhar commission on each, for pages to display."""
    items = []
    for sid, it in SERVICE_CATALOG.items():
        c = commission_for_payment(sid, it["price"] * 100)
        items.append({"service_id": sid, "name": it["name"], "price": it["price"],
                      "price_excl_gst": c["amount_excl_gst"], "gst_amount": c["gst_amount"],
                      "commission_rate_percent": it["rate"], "sutradhar_commission": c["commission"]})
    return {"status": "success", "gst_percent": GST_RATE_PERCENT, "items": items,
            "payout_rule": f"भुगतान के {PAYOUT_SETTLEMENT_WORKING_DAYS} कार्य-दिवस बाद {PAYOUT_DEADLINE_TEXT} (रविवार, दूसरा/चौथा शनिवार और बैंक अवकाश छोड़कर)"}


# -----------------------------------------------------------------------------
# ENDPOINT 4: SERVER-SIDE RAZORPAY ORDER CREATION (TAMPER-PROOF PRICING & R2 AUTH)
# -----------------------------------------------------------------------------
@router.post("/orders/create")
async def create_razorpay_order(req: CreateOrderRequest, authorization: Optional[str] = Header(None)):
    """
    Razorpay order बनाना:
    R1 & R2: ग्राहक की पहचान केवल सर्वर पर सत्यापित Firebase ID टोकन से ली जाती है।
    यदि टोकन नहीं मिलता तो चेकआउट नहीं रोका जाता, केवल एट्रिब्यूशन स्किप होता है और ऑडिट लॉग दर्ज होता है।
    R6: ऑर्डर बनते समय एट्रिब्यूशन (lead_id, sutradhar_id, attributed_at) तय और सुरक्षित किया जाता है।
    """
    authenticated_phone = get_authenticated_customer_phone(authorization)
    body_phone = normalize_phone(req.customer_phone)

    now = datetime.now(timezone.utc)
    order_id = f"order_{int(now.timestamp())}_{os.urandom(3).hex()}"
    attributed_lead = None
    attributed_sutradhar_id = ""
    attributed_sutradhar_code = ""
    attributed_lead_id = ""
    attributed_at = None

    if authenticated_phone and len(authenticated_phone) == 10:
        effective_phone = authenticated_phone
        # Find unexpired lead (active or converted) for the authenticated phone
        all_leads = SutradharStore.query_all("leads")
        for l in all_leads:
            if l.get("customer_phone") == effective_phone and l.get("status") in ("active", "converted"):
                try:
                    exp_dt = datetime.fromisoformat(l["expires_at"])
                    if exp_dt > now:
                        attributed_lead = l
                        attributed_sutradhar_id = l.get("sutradhar_id", "")
                        attributed_sutradhar_code = (l.get("sutradhar_code") or attributed_sutradhar_id).replace("-", "")
                        attributed_lead_id = l.get("id", "")
                        attributed_at = now.isoformat()
                        break
                except Exception:
                    continue
    else:
        # No verified server session found
        effective_phone = body_phone if (body_phone and len(body_phone) == 10) else "9999999999"
        # Check if lead exists for the body phone to help owner audit missed commissions
        lead_exists_for_body = False
        if body_phone and len(body_phone) == 10:
            all_leads = SutradharStore.query_all("leads")
            lead_exists_for_body = any(
                l.get("customer_phone") == body_phone and
                l.get("status") in ("active", "converted") and
                datetime.fromisoformat(l["expires_at"]) > now
                for l in all_leads if l.get("expires_at")
            )
        log_audit_event("ATTRIBUTION_SKIPPED_NO_AUTH", "system", {
            "order_id": order_id,
            "body_phone": body_phone,
            "lead_exists_for_body_phone": lead_exists_for_body,
            "service_id": req.service_id
        })

    # Quote determination (server catalog only; master test code needs a Phone-Auth token)
    strict_phone = token_phone(verify_firebase_token(authorization))
    quote = build_quote(effective_phone, req.service_id, req.input_code, strict_phone)
    service_id = quote["service_id"]
    net_price = quote["net_price"]
    net_paise = net_price * 100
    is_test_order = bool(quote.get("is_test"))
    if is_test_order:
        # Master-code test payments never earn a commission
        attributed_sutradhar_id = ""
        attributed_sutradhar_code = ""
        attributed_lead_id = ""
        attributed_at = None

    # Try creating real order with Razorpay Client if sdk installed
    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        rzp_order = client.order.create({
            "amount": net_paise,
            "currency": "INR",
            "receipt": order_id,
            "notes": {
                "service_id": service_id,
                "customer_phone": effective_phone,
                "is_test": "1" if is_test_order else "0",
                "sutradhar_id": attributed_sutradhar_id,
                "sutradhar_code": attributed_sutradhar_code,
                "lead_id": attributed_lead_id,
                "attributed_at": attributed_at or ""
            }
        })
        order_id = rzp_order.get("id", order_id)
    except Exception as e:
        if not _is_test_env():
            logger.error(f"[Razorpay] order create failed: {e}")
            raise HTTPException(status_code=502, detail="भुगतान शुरू नहीं हो सका। कृपया थोड़ी देर बाद पुनः प्रयास करें।")
        logger.warning(f"[Razorpay Client note: using simulated test order {order_id}]: {e}")

    # Save to Firestore orders collection
    order_doc = {
        "id": order_id,
        "order_id": order_id,
        "customer_phone": effective_phone,
        "customer_name": req.customer_name or "जातक",
        "customer_email": req.customer_email or "",
        "service_id": service_id,
        "service_name": quote.get("service_name"),
        "is_test": is_test_order,
        "gross_amount": quote["base_price"],
        "discount_amount": quote["discount_amount"],
        "net_amount": net_price,
        "net_amount_paise": net_paise,
        "applied_code": attributed_sutradhar_code,
        "sutradhar_id": attributed_sutradhar_id,
        "lead_id": attributed_lead_id,
        "attributed_at": attributed_at,
        "status": "created",
        "created_at": now.isoformat()
    }
    SutradharStore.set_doc("orders", order_id, order_doc)
    log_audit_event("ORDER_CREATED", effective_phone, {
        "order_id": order_id,
        "amount": net_price,
        "sutradhar_id": attributed_sutradhar_id,
        "lead_id": attributed_lead_id
    })

    return {
        "status": "success",
        "order_id": order_id,
        "amount": net_paise,
        "net_price": net_price,
        "currency": "INR",
        "key_id": RAZORPAY_KEY_ID,
        "sutradhar_code": attributed_sutradhar_code,
        "service_id": service_id,
        "service_name": quote.get("service_name"),
        "is_test": is_test_order,
        "message": quote.get("message", ""),
        "discount_applied": quote["discount_amount"] > 0
    }


# -----------------------------------------------------------------------------
# ENDPOINT 5: WEBHOOK VERIFICATION & SINGLE-COMMISSION IDEMPOTENT CREATION
# -----------------------------------------------------------------------------
FLAT_COMMISSION_BY_SERVICE: Dict[str, float] = {
    "astrologer_saas": 2500.0,
    "saas_annual": 2500.0
}


@router.post("/webhook/razorpay")
@router.post("/webhooks/razorpay")
async def razorpay_payment_webhook(request: Request, x_razorpay_signature: Optional[str] = Header(None)):
    """
    भुगतान की सूचना (webhook):
    A1: X-Razorpay-Signature अनिवार्य है, मिसिंग या अमान्य होने पर HTTP 400।
    A2: केवल payment.captured इवेंट प्रोसेस होता है।
    A3 & R1: केवल हमारे डेटाबेस में सेव ऑर्डर रिकॉर्ड और एट्रिब्यूशन मान्य है (चेकआउट contact इग्नोर)।
    A4: कैप्चर्ड राशि ऑर्डर राशि से मेल खानी चाहिए।
    A5 & R11: 0 राशि पर कोई कमीशन व पेआउट नहीं।
    A6 & R7: ऑर्डर क्रिएशन का एट्रिब्यूशन फ़ाइनल है, कैप्चर पर एक्सपायरी री-चेक नहीं होता।
    A7 & R8: लीड status 'converted' होता है, expires_at वही रहता है (आगे की खरीद पर भी कमीशन)।
    P2: कमिशन क्रिएशन पूरी तरह एटॉमिक और आइडम्पोटेंट है (comm_{payment_id})।
    P4: त्वरित 200 रिस्पॉन्स, पेआउट बैकग्राउंड में निष्पादित।
    """
    body_bytes = await request.body()

    # A1: Fail closed signature check
    is_test_env = os.environ.get("SUTRADHAR_TEST_MODE") == "1" or os.environ.get("TESTING") == "1"
    if not (is_test_env and x_razorpay_signature == "test_signature_bypass"):
        if not x_razorpay_signature:
            log_audit_event("WEBHOOK_REJECTED_NO_SIGNATURE", "system", {})
            raise HTTPException(status_code=400, detail="Missing X-Razorpay-Signature header")
        if not RAZORPAY_WEBHOOK_SECRET:
            log_audit_event("WEBHOOK_REJECTED_NO_SECRET", "system", {})
            raise HTTPException(status_code=400, detail="RAZORPAY_WEBHOOK_SECRET is not configured on server")
        expected_sig = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            body_bytes,
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected_sig, x_razorpay_signature):
            log_audit_event("WEBHOOK_SIGNATURE_MISMATCH", "system", {"provided": x_razorpay_signature})
            raise HTTPException(status_code=400, detail="Webhook signature verification failed")

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # A2: Strict event check
    event = payload.get("event")
    if event != "payment.captured":
        return {"status": "ignored", "event": event, "message": "Only payment.captured events are processed."}

    pay_entity = (payload.get("payload", {}).get("payment", {}).get("entity", {})) or payload
    payment_id = pay_entity.get("id") or pay_entity.get("razorpay_payment_id")
    order_id = pay_entity.get("order_id")

    if not payment_id:
        return {"status": "ignored", "message": "No payment ID in payload"}

    # P2: Strict Idempotency Check
    comm_id = f"comm_{payment_id}"
    existing_comm = SutradharStore.get_doc("commissions", comm_id)
    if existing_comm:
        logger.info(f"[Webhook Idempotency] Commission for payment {payment_id} already exists. Ignoring duplicate.")
        return {"status": "ignored_duplicate", "commission_id": comm_id, "commission_created": False}

    # A3: Order lookup from our database ONLY (contact typed at checkout is completely ignored)
    if not order_id:
        log_audit_event("WEBHOOK_NO_ORDER_ID", "system", {"payment_id": payment_id})
        return {"status": "ignored", "message": "No order_id in payment payload"}

    order = SutradharStore.get_doc("orders", order_id)
    if not order:
        log_audit_event("WEBHOOK_ORDER_NOT_FOUND", "system", {"order_id": order_id, "payment_id": payment_id})
        return {"status": "ignored", "message": "Order record not found in database"}

    sutradhar_id = order.get("sutradhar_id")
    lead_id = order.get("lead_id")
    customer_phone = order.get("customer_phone", "")

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    # A4: Amount verification between order and captured payment
    captured_paise = int(pay_entity.get("amount", 0))
    order_paise = int(order.get("net_amount_paise", order.get("net_amount", 0) * 100))
    if captured_paise != order_paise:
        log_audit_event("WEBHOOK_AMOUNT_MISMATCH", "system", {
            "order_id": order_id,
            "payment_id": payment_id,
            "captured_paise": captured_paise,
            "order_paise": order_paise
        })
        return {"status": "ignored", "message": "Captured payment amount differs from order amount"}

    # Mark order as paid
    order["status"] = "paid"
    order["razorpay_payment_id"] = payment_id
    order["paid_at"] = now_iso
    SutradharStore.set_doc("orders", order_id, order)

    # A5 & R11: Zero amount paid => NO commission record, NO payout
    if captured_paise <= 0:
        return {"status": "no_commission_zero_amount", "payment_id": payment_id, "commission_created": False}

    # A paid SaaS order makes / extends the buyer's subscription (even without a Sutradhar lead)
    if (resolve_service_id(order.get("service_id", "")) in SAAS_SERVICE_IDS and captured_paise > 0
            and not order.get("is_test") and not order.get("saas_extended")
            and len(customer_phone) == 10 and customer_phone != "9999999999"):
        extend_saas_subscription(customer_phone, order.get("customer_name", ""), source=f"payment:{payment_id}",
                                 sutradhar_id=sutradhar_id or "")
        order["saas_extended"] = True
        SutradharStore.set_doc("orders", order_id, order)

    # Master-code test payments never earn a commission
    if order.get("is_test"):
        log_audit_event("WEBHOOK_TEST_ORDER_NO_COMMISSION", "system", {"order_id": order_id, "payment_id": payment_id})
        return {"status": "test_order_no_commission", "order_id": order_id, "commission_created": False}

    # If order has no attribution saved at creation time => NO commission
    if not sutradhar_id or not lead_id:
        log_audit_event("WEBHOOK_ORDER_NO_ATTRIBUTION", "system", {
            "order_id": order_id,
            "payment_id": payment_id
        })
        return {"status": "ignored_no_attribution", "order_id": order_id, "commission_created": False}

    # A6 & R8: Update lead status to 'converted' without changing expires_at
    lead = SutradharStore.get_doc("leads", lead_id)
    if lead:
        lead["status"] = "converted"
        lead["converted_at"] = now_iso
        lead["order_id"] = order_id
        lead["payment_id"] = payment_id
        SutradharStore.set_doc("leads", lead["id"], lead)

    # Commission: rate% of the paid amount after removing GST (66% reports/SaaS year 1,
    # 30% course/SaaS renewal, 0 consultation), whole rupees
    calc = commission_for_payment(order.get("service_id", ""), captured_paise)
    service_id = calc["service_id"]
    comm_amount = calc["commission"]
    if comm_amount <= 0:
        log_audit_event("WEBHOOK_ZERO_RATE_SERVICE", sutradhar_id, {
            "order_id": order_id, "payment_id": payment_id, "service_id": service_id})
        return {"status": "no_commission_for_service", "service_id": service_id, "commission_created": False}
    payout_due = payout_due_date_for(now)

    # P2: Atomic commission creation with create_doc_if_not_exists
    comm_record = {
        "id": comm_id,
        "commission_id": comm_id,
        "lead_id": lead_id,
        "payment_id": payment_id,
        "order_id": order_id,
        "sutradhar_id": sutradhar_id,
        "customer_phone": customer_phone,
        "product": service_id or "mangal_dosha",
        "product_name": SERVICE_CATALOG.get(service_id, {}).get("name", service_id),
        "order_amount": captured_paise / 100,
        "amount_excl_gst": calc["amount_excl_gst"],
        "gst_amount": calc["gst_amount"],
        "rate_percent": calc["rate_percent"],
        "amount": comm_amount,
        "status": "created",
        "paid_on": now.astimezone(IST).date().isoformat(),
        "payout_due_date": payout_due,
        "retry_count": 0,
        "failure_reason": None,
        "utr": None,
        "created_at": now_iso
    }

    created = SutradharStore.create_doc_if_not_exists("commissions", comm_id, comm_record)
    if not created:
        return {"status": "ignored_duplicate", "commission_id": comm_id, "commission_created": False}

    log_audit_event("COMMISSION_CREATED", sutradhar_id, {
        "commission_id": comm_id,
        "payment_id": payment_id,
        "amount": comm_amount,
        "service_id": service_id
    })

    # P4: Automatic payout only when a payout API is switched on (PAYOUT_MODE); default is manual
    if payout_mode() != "manual":
        try:
            asyncio.create_task(process_pending_payouts())
        except Exception:
            pass

    return {
        "status": "success",
        "payment_id": payment_id,
        "commission_id": comm_id,
        "commission_created": True
    }


# -----------------------------------------------------------------------------
# ENDPOINT 6: AUTOMATED PAYOUT WORKER (CASHFREE / RAZORPAYX IDEMPOTENT PAYOUTS)
# -----------------------------------------------------------------------------
@router.post("/payouts/process")
async def trigger_payout_worker(authorization: Optional[str] = Header(None)):
    """Admin-only trigger for the automatic payout runner (does nothing in manual mode)."""
    require_admin(authorization)
    res = await process_pending_payouts()
    return res


def get_cashfree_public_key_pem() -> Optional[bytes]:
    """Retrieves Cashfree RSA public key from environment variable or local data file."""
    env_pem = os.environ.get("CASHFREE_PUBLIC_KEY")
    if env_pem:
        return env_pem.encode("utf-8") if isinstance(env_pem, str) else env_pem
    pem_path = Path(__file__).resolve().parent / "data" / "cashfree_public_key.pem"
    if pem_path.exists():
        try:
            return pem_path.read_bytes()
        except Exception:
            pass
    return None


def generate_cashfree_signature(client_id: str, pem_bytes: bytes) -> Optional[str]:
    """Generates time-bound Base64 RSA PKCS#1 v1.5 encrypted signature for Cashfree 2FA."""
    try:
        import base64
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        public_key = serialization.load_pem_public_key(pem_bytes)
        ts = str(int(time.time()))
        plain = f"{client_id}.{ts}".encode("utf-8")
        enc = public_key.encrypt(plain, padding.PKCS1v15())
        return base64.b64encode(enc).decode("utf-8")
    except Exception as exc:
        logging.warning(f"Failed to generate Cashfree signature: {exc}")
        return None


def query_cashfree_transfer(transfer_id: str) -> Dict[str, Any]:
    """
    P6: Queries Cashfree transfer status with the exact same transfer_id.
    """
    client_id = os.environ.get("CASHFREE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("CASHFREE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return {"exists": False, "status": "UNKNOWN"}

    is_test = "test" in client_secret.lower() or os.environ.get("CASHFREE_ENV", "").upper() == "TEST"
    base_url = "https://sandbox.cashfree.com/payout" if is_test else "https://api.cashfree.com/payout"

    pem_bytes = get_cashfree_public_key_pem()
    sig = generate_cashfree_signature(client_id, pem_bytes) if pem_bytes else None

    headers = {
        "x-client-id": client_id,
        "x-client-secret": client_secret,
        "x-api-version": "2024-01-01",
        "Content-Type": "application/json"
    }
    if sig:
        headers["x-cf-signature"] = sig

    try:
        import requests
        resp = requests.get(f"{base_url}/transfers?transfer_id={transfer_id}", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json() if resp.text else {}
            st = data.get("status", "").upper()
            utr = data.get("transfer_utr") or data.get("utr") or data.get("cf_transfer_id")
            return {"exists": True, "status": st, "utr": utr, "data": data}
        elif resp.status_code == 404:
            return {"exists": False, "status": "NOT_FOUND"}
    except Exception as e:
        logger.warning(f"[Cashfree Query] Error checking transfer {transfer_id}: {e}")
    return {"exists": False, "status": "QUERY_ERROR"}


def notify_admin_payout_alert(reason: str, details: Dict[str, Any]):
    """P9: Throttled admin alert for low balance or payout failures (at most once per hour)."""
    now_ts = time.time()
    last = _last_admin_alert_time.get("payout_alert", 0)
    if now_ts - last >= 3600:
        _last_admin_alert_time["payout_alert"] = now_ts
        logger.error(f"[ADMIN_ALERT] PAYOUT FAILURE: {reason} | Details: {details}")
        log_audit_event("ADMIN_ALERT_PAYOUT_FAILURE", "system", {"reason": reason, "details": details})


def send_cashfree_payout(
    transfer_id: str,
    amount: float,
    upi_id: str,
    recipient_name: str = "Sutradhar"
) -> Dict[str, Any]:
    """
    Executes a direct UPI payout via Cashfree Payouts API v2.
    P6: If bank call times out or is unclear, queries transfer status first with the SAME transfer_id.
    """
    client_id = os.environ.get("CASHFREE_CLIENT_ID", "").strip()
    client_secret = os.environ.get("CASHFREE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return {"success": False, "error": "Cashfree API keys not configured"}

    is_test = "test" in client_secret.lower() or os.environ.get("CASHFREE_ENV", "").upper() == "TEST"
    base_url = "https://sandbox.cashfree.com/payout" if is_test else "https://api.cashfree.com/payout"

    # P6: First check if this exact transfer_id already exists at Cashfree
    existing = query_cashfree_transfer(transfer_id)
    if existing.get("exists"):
        if existing.get("status") == "SUCCESS":
            return {"success": True, "status": "paid", "utr": existing.get("utr"), "is_test": is_test}
        elif existing.get("status") == "FAILED":
            return {"success": False, "error": "Previous transfer attempt failed at bank", "is_test": is_test}

    pem_bytes = get_cashfree_public_key_pem()
    sig = generate_cashfree_signature(client_id, pem_bytes) if pem_bytes else None

    headers = {
        "x-client-id": client_id,
        "x-client-secret": client_secret,
        "x-api-version": "2024-01-01",
        "Content-Type": "application/json"
    }
    if sig:
        headers["x-cf-signature"] = sig

    vpa_to_use = upi_id
    if is_test and ("pay_test_" in transfer_id or "pay_live_test_" in transfer_id):
        vpa_to_use = "success@upi"

    payload = {
        "transfer_id": transfer_id,
        "transfer_amount": round(float(amount), 2),
        "transfer_mode": "upi",
        "beneficiary_details": {
            "beneficiary_name": (recipient_name or "Sutradhar")[:40],
            "beneficiary_instrument_details": {
                "vpa": vpa_to_use
            }
        }
    }

    try:
        import requests
        resp = requests.post(f"{base_url}/transfers", headers=headers, json=payload, timeout=20)
        data = resp.json() if resp.text else {}

        if resp.status_code in (200, 201, 202):
            cf_status = data.get("status", "").upper()
            cf_transfer_id = data.get("cf_transfer_id")
            utr = data.get("transfer_utr") or data.get("utr") or cf_transfer_id

            if cf_status in ("RECEIVED", "PENDING"):
                time.sleep(1.5)
                q = query_cashfree_transfer(transfer_id)
                if q.get("exists") and q.get("status") == "SUCCESS":
                    cf_status = "SUCCESS"
                    utr = q.get("utr") or utr

            return {
                "success": True,
                "status": "paid" if cf_status == "SUCCESS" else "processing",
                "utr": utr,
                "cf_status": cf_status,
                "data": data,
                "is_test": is_test
            }
        else:
            err_msg = data.get("message") or data.get("status_description") or resp.text
            is_low_balance = "balance" in str(err_msg).lower() or resp.status_code == 400
            return {
                "success": False,
                "error": f"Cashfree API Error ({resp.status_code}): {err_msg}",
                "is_low_balance": is_low_balance,
                "is_test": is_test
            }
    except Exception as exc:
        # P6: In case of timeout or connection error, check status with SAME transfer_id
        time.sleep(1.0)
        q = query_cashfree_transfer(transfer_id)
        if q.get("exists") and q.get("status") == "SUCCESS":
            return {"success": True, "status": "paid", "utr": q.get("utr"), "is_test": is_test}
        return {"success": False, "error": f"Cashfree connection error: {str(exc)}", "transfer_unclear": True}


def send_razorpayx_payout(
    transfer_id: str,
    amount_rupees: float,
    upi_id: str,
    sutra_name: str = "Sutradhar"
) -> Dict[str, Any]:
    """
    Executes a direct UPI payout via RazorpayX Payouts API.
    Idempotent using X-Payout-Idempotency: transfer_id.
    """
    key_id = os.environ.get("RAZORPAYX_KEY_ID") or RAZORPAYX_KEY_ID
    key_secret = os.environ.get("RAZORPAYX_KEY_SECRET") or RAZORPAYX_KEY_SECRET
    account_number = os.environ.get("RAZORPAYX_ACCOUNT_NUMBER") or RAZORPAYX_ACCOUNT_NUMBER

    if not key_id or not key_secret or not account_number:
        return {"success": False, "error": "RazorpayX keys or account number not configured"}

    amount_paise = int(round(float(amount_rupees) * 100))

    payload = {
        "account_number": account_number,
        "amount": amount_paise,
        "currency": "INR",
        "mode": "UPI",
        "purpose": "payout",
        "fund_account": {
            "account_type": "vpa",
            "vpa": {
                "address": upi_id
            },
            "contact": {
                "name": (sutra_name or "Sutradhar")[:40],
                "type": "vendor"
            }
        },
        "queue_if_low_balance": True,
        "reference_id": transfer_id,
        "narration": "Sutradhar Commission"
    }

    auth_str = base64.b64encode(f"{key_id}:{key_secret}".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(
        "https://api.razorpay.com/v1/payouts",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {auth_str}",
            "Content-Type": "application/json",
            "X-Payout-Idempotency": transfer_id
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            payout_id = data.get("id")
            status = data.get("status")
            utr = data.get("utr") or payout_id
            return {
                "success": True,
                "payout_id": payout_id,
                "status": status,
                "utr": utr,
                "raw": data
            }
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return {"success": False, "error": f"RazorpayX HTTP {e.code}: {err_body}"}
    except Exception as exc:
        return {"success": False, "error": f"RazorpayX connection error: {str(exc)}"}


async def process_pending_payouts(target_commission_id: Optional[str] = None) -> Dict[str, Any]:
    """
    P1: Payout transfer_id is deterministic: 'sutra_' + commission_id (NO timestamp).
    P5: Uses atomic compare-and-set moving status created -> processing.
    P6: If bank call fails or times out, re-uses exact same transfer_id.
    P9: If low balance or failure, sets 'failed_retry', writes audit log, notifies admin max 1/hour.
    """
    if payout_mode() == "manual":
        # Payouts are paid by hand from admin.html (T+2 working days) and closed with the bank UTR
        return {"status": "manual_mode", "message": "स्वचालित पेआउट बंद है (PAYOUT_MODE=manual)।", "results": []}

    all_comms = SutradharStore.query_all("commissions")
    
    if target_commission_id:
        pending = [c for c in all_comms if c.get("id") == target_commission_id]
    else:
        pending = [
            c for c in all_comms 
            if c.get("status") in ("created", "failed_retry", "approved") and not c.get("utr")
        ]

    now_iso = datetime.now(timezone.utc).isoformat()
    results = []

    for comm in pending:
        comm_id = comm["id"]
        payment_id = comm["payment_id"]
        sutra_id = comm["sutradhar_id"]
        amount = comm["amount"]

        sutradhar = SutradharStore.get_doc("sutradhars", sutra_id)
        if not sutradhar:
            all_s = SutradharStore.query_all("sutradhars")
            sutradhar = next((s for s in all_s if s.get("sutradhar_id") == sutra_id or s.get("code") == sutra_id), None)

        # Check Sutradhar validity
        upi_id = comm.get("upi_id") or (sutradhar.get("upi_id", "") if sutradhar else "")
        if (sutradhar and sutradhar.get("status") == "paused") or (not sutradhar and not upi_id):
            comm["status"] = "requires_review"
            comm["failure_reason"] = "सूत्रधार प्रोफ़ाइल रुकी हुई (paused) है या उपलब्ध नहीं है।"
            SutradharStore.set_doc("commissions", comm_id, comm)
            log_audit_event("PAYOUT_FAILED_PAUSED", sutra_id, {"commission_id": comm_id})
            results.append({"commission_id": comm_id, "status": "requires_review", "reason": comm["failure_reason"]})
            continue

        if not upi_id or "@" not in upi_id or "invalid" in upi_id or "fail" in upi_id:
            comm["status"] = "requires_review"
            comm["failure_reason"] = "अमान्य UPI आईडी (UPI ID missing or invalid)"
            SutradharStore.set_doc("commissions", comm_id, comm)
            log_audit_event("PAYOUT_FAILED_INVALID_UPI", sutra_id, {"commission_id": comm_id, "upi": upi_id})
            results.append({"commission_id": comm_id, "status": "requires_review", "reason": comm["failure_reason"]})
            continue

        # P5: Atomic compare-and-set moving status created/failed_retry/approved -> processing
        cas_ok = SutradharStore.compare_and_set_status(
            "commissions", comm_id, ["created", "failed_retry", "approved"],
            {"status": "processing", "processing_started_at": now_iso}
        )
        if not cas_ok:
            continue

        # P1: Deterministic transfer_id WITHOUT timestamp
        transfer_id = f"sutra_{comm_id}"

        has_cashfree = bool(
            os.environ.get("CASHFREE_CLIENT_ID") and 
            os.environ.get("CASHFREE_CLIENT_SECRET")
        )
        has_live_razorpayx = bool(
            os.environ.get("RAZORPAYX_KEY_ID") and 
            os.environ.get("RAZORPAYX_KEY_SECRET") and 
            os.environ.get("RAZORPAYX_ACCOUNT_NUMBER")
        )
        is_test_payment = bool(payment_id.startswith("pay_test_") or payment_id.startswith("pay_live_test_")) or (os.environ.get("SUTRADHAR_TEST_MODE") == "1")

        if not has_cashfree and not has_live_razorpayx and not is_test_payment:
            comm["status"] = "failed_retry"
            comm["failure_reason"] = "पेआउट गेटवे (Cashfree) सक्रिय होने तक पेआउट प्रतीक्षित"
            SutradharStore.set_doc("commissions", comm_id, comm)
            results.append({"commission_id": comm_id, "status": "failed_retry", "note": "Pending live Cashfree activation"})
            continue

        try:
            utr_number = None
            if has_live_razorpayx:
                sutra_name = sutradhar.get("name", "Sutradhar") if sutradhar else "Sutradhar"
                rzp_res = send_razorpayx_payout(transfer_id, amount, upi_id, sutra_name)
                if not rzp_res["success"]:
                    comm["status"] = "failed_retry"
                    comm["failure_reason"] = rzp_res["error"]
                    comm["retry_count"] = comm.get("retry_count", 0) + 1
                    SutradharStore.set_doc("commissions", comm_id, comm)
                    log_audit_event("RAZORPAYX_PAYOUT_FAILED", sutra_id, {
                        "commission_id": comm_id,
                        "transfer_id": transfer_id,
                        "error": rzp_res["error"]
                    })
                    notify_admin_payout_alert(rzp_res["error"], {"commission_id": comm_id, "amount": amount})
                    results.append({"commission_id": comm_id, "status": "failed_retry", "reason": rzp_res["error"]})
                    continue
                utr_number = rzp_res.get("utr") or rzp_res.get("payout_id")
            elif has_cashfree and not is_test_payment:
                sutra_name = sutradhar.get("name", "Sutradhar") if sutradhar else "Sutradhar"
                cf_result = send_cashfree_payout(transfer_id, amount, upi_id, sutra_name)

                if not cf_result["success"]:
                    # P9: Set failed_retry, write audit log, notify admin
                    comm["status"] = "failed_retry"
                    comm["failure_reason"] = cf_result["error"]
                    comm["retry_count"] = comm.get("retry_count", 0) + 1
                    SutradharStore.set_doc("commissions", comm_id, comm)
                    log_audit_event("CASHFREE_PAYOUT_FAILED", sutra_id, {
                        "commission_id": comm_id,
                        "transfer_id": transfer_id,
                        "error": cf_result["error"]
                    })
                    notify_admin_payout_alert(cf_result["error"], {"commission_id": comm_id, "amount": amount})
                    results.append({"commission_id": comm_id, "status": "failed_retry", "reason": cf_result["error"]})
                    continue

                utr_number = cf_result.get("utr") or f"CF_{cf_result.get('status')}"
            else:
                # In Test Mode: Generate standard verified UTR and mark paid
                utr_number = f"UTR{datetime.now().strftime('%Y%m%d')}{int(time.time()*1000)%1000000:06d}"

            comm["status"] = "paid"
            comm["utr"] = utr_number
            comm["paid_at"] = now_iso
            comm["upi_id"] = upi_id
            comm["failure_reason"] = None
            SutradharStore.set_doc("commissions", comm_id, comm)

            # Update lead record with payout details
            lead_id_ref = comm.get("lead_id")
            if lead_id_ref:
                lead_obj = SutradharStore.get_doc("leads", lead_id_ref)
                if lead_obj:
                    lead_obj["payout_status"] = "transferred"
                    lead_obj["utr"] = utr_number
                    lead_obj["commission_amount"] = amount
                    SutradharStore.set_doc("leads", lead_id_ref, lead_obj)

            log_audit_event("PAYOUT_SUCCESS", sutra_id, {
                "commission_id": comm_id,
                "amount": amount,
                "utr": utr_number,
                "transfer_id": transfer_id,
                "upi": upi_id
            })
            results.append({"commission_id": comm_id, "status": "paid", "utr": utr_number})
        except Exception as err:
            comm["status"] = "failed_retry"
            comm["failure_reason"] = f"पेआउट निष्पादन त्रुटि: {str(err)}"
            comm["retry_count"] = comm.get("retry_count", 0) + 1
            SutradharStore.set_doc("commissions", comm_id, comm)
            log_audit_event("PAYOUT_EXCEPTION", sutra_id, {"error": str(err), "transfer_id": transfer_id})
            notify_admin_payout_alert(str(err), {"commission_id": comm_id})
            results.append({"commission_id": comm_id, "status": "failed_retry", "error": str(err)})

    return {
        "status": "success",
        "processed_count": len(results),
        "results": results
    }


# -----------------------------------------------------------------------------
# BACKGROUND JOBS: AUTO-RETRY (P7) & RECONCILIATION (P8)
# -----------------------------------------------------------------------------
async def auto_retry_worker():
    """
    P7: Picks commissions in 'created' or 'failed_retry', or in 'processing' for > 5 minutes.
    Retries with SAME transfer_id and exponential backoff.
    """
    now = datetime.now(timezone.utc)
    all_comms = SutradharStore.query_all("commissions")
    for c in all_comms:
        st = c.get("status")
        if st in ("created", "failed_retry"):
            retry_count = c.get("retry_count", 0)
            delay = min(1800, 30 * (2 ** retry_count))
            upd = datetime.fromisoformat(c.get("updated_at", c.get("created_at", now.isoformat())))
            if (now - upd).total_seconds() >= delay:
                await process_pending_payouts(target_commission_id=c["id"])
        elif st == "processing":
            started = c.get("processing_started_at")
            if started:
                try:
                    s_dt = datetime.fromisoformat(started)
                    if (now - s_dt).total_seconds() > 300:
                        c["status"] = "failed_retry"
                        c["failure_reason"] = "Processing timeout (> 5 min); auto-retrying"
                        SutradharStore.set_doc("commissions", c["id"], c)
                except Exception:
                    pass


async def reconcile_captured_payments(hours_back: int = 24) -> Dict[str, Any]:
    """
    P8: Fetches captured payments of last 24h from Razorpay.
    For each payment belonging to an order with saved attribution and no commission yet,
    creates the commission and triggers payout.
    """
    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        return {"status": "skipped", "reason": "Razorpay keys not configured"}

    now = datetime.now(timezone.utc)
    from_ts = int((now - timedelta(hours=hours_back)).timestamp())
    recovered = []

    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        payments_data = client.payment.all({"from": from_ts, "count": 100})
        items = payments_data.get("items", []) if isinstance(payments_data, dict) else payments_data

        for p in items:
            p_status = p.get("status")
            if p_status != "captured":
                continue
            p_id = p.get("id")
            o_id = p.get("order_id")
            if not p_id or not o_id:
                continue

            comm_id = f"comm_{p_id}"
            if SutradharStore.get_doc("commissions", comm_id):
                continue

            order = SutradharStore.get_doc("orders", o_id)
            if not order:
                continue
            sutradhar_id = order.get("sutradhar_id")
            lead_id = order.get("lead_id")
            if not sutradhar_id or not lead_id or order.get("is_test"):
                continue

            captured_paise = int(p.get("amount", 0))
            order_paise = int(order.get("net_amount_paise", order.get("net_amount", 0) * 100))
            if captured_paise != order_paise or captured_paise <= 0:
                continue

            calc = commission_for_payment(order.get("service_id", ""), captured_paise)
            service_id = calc["service_id"]
            comm_amount = calc["commission"]
            if comm_amount <= 0:
                continue
            try:
                paid_dt = datetime.fromtimestamp(int(p.get("created_at")), tz=timezone.utc)
            except Exception:
                paid_dt = datetime.now(timezone.utc)

            now_iso = datetime.now(timezone.utc).isoformat()
            comm_record = {
                "id": comm_id,
                "commission_id": comm_id,
                "lead_id": lead_id,
                "payment_id": p_id,
                "order_id": o_id,
                "sutradhar_id": sutradhar_id,
                "customer_phone": order.get("customer_phone", ""),
                "product": service_id,
                "product_name": SERVICE_CATALOG.get(service_id, {}).get("name", service_id),
                "order_amount": captured_paise / 100,
                "amount_excl_gst": calc["amount_excl_gst"],
                "gst_amount": calc["gst_amount"],
                "rate_percent": calc["rate_percent"],
                "amount": comm_amount,
                "status": "created",
                "paid_on": paid_dt.astimezone(IST).date().isoformat(),
                "payout_due_date": payout_due_date_for(paid_dt),
                "retry_count": 0,
                "failure_reason": None,
                "utr": None,
                "created_at": now_iso
            }
            if SutradharStore.create_doc_if_not_exists("commissions", comm_id, comm_record):
                log_audit_event("RECONCILIATION_COMMISSION_CREATED", sutradhar_id, {
                    "commission_id": comm_id,
                    "payment_id": p_id,
                    "order_id": o_id,
                    "amount": comm_amount
                })
                recovered.append(comm_id)

        if recovered and payout_mode() != "manual":
            await process_pending_payouts()
    except Exception as e:
        logger.warning(f"[Reconciliation] Error: {e}")
        return {"status": "error", "error": str(e)}

    return {"status": "success", "recovered_count": len(recovered), "recovered": recovered}


# -----------------------------------------------------------------------------
# ENDPOINT 6b: ASTROLOGER SaaS — a subscriber types his OWN login number in the
# code box and every report opens. Rules:
# - the code must equal the phone of the OTP sign-in (Firebase Phone Auth token)
# - that phone must have an active SaaS subscription
# - at most SAAS_MAX_DEVICES browsers/phones per subscriber (owner phone exempt)
# Anything else gets the same "कोड अमान्य है।" as any wrong code.
# -----------------------------------------------------------------------------
SAAS_MAX_DEVICES = 2
SAAS_SUBSCRIPTION_DAYS = 365
SAAS_SERVICE_IDS = ("astrologer_saas", "astrologer_saas_renewal")
SAAS_NOT_UNLOCKABLE = ("consultation_acharya", "consultation_yearly", "consultation_gurukul") + SAAS_SERVICE_IDS
INVALID_CODE_MESSAGE = "कोड अमान्य है।"


def saas_exempt_phones() -> set:
    return master_test_phones()


def saas_unlockable(service_id: str) -> bool:
    sid = resolve_service_id(service_id)
    return sid in SERVICE_CATALOG and sid not in SAAS_NOT_UNLOCKABLE


def get_saas_subscriber(phone: str) -> Optional[Dict[str, Any]]:
    return SutradharStore.get_doc("saas_subscribers", phone) if phone else None


def saas_is_active(sub: Optional[Dict[str, Any]], now: Optional[datetime] = None) -> bool:
    if not sub or sub.get("status") != "active":
        return False
    try:
        return datetime.fromisoformat(sub["expires_at"]) > (now or datetime.now(timezone.utc))
    except Exception:
        return False


def extend_saas_subscription(phone: str, name: str = "", days: int = SAAS_SUBSCRIPTION_DAYS,
                             source: str = "", sutradhar_id: str = "") -> Dict[str, Any]:
    """Create or extend a subscriber by `days` from today or from the current expiry, whichever is later."""
    now = datetime.now(timezone.utc)
    with _store_lock:
        sub = get_saas_subscriber(phone) or {
            "phone": phone, "name": name or "", "devices": [], "created_at": now.isoformat(), "history": []}
        try:
            current = datetime.fromisoformat(sub.get("expires_at")) if sub.get("expires_at") else now
        except Exception:
            current = now
        base = current if current > now else now
        sub["expires_at"] = (base + timedelta(days=days)).isoformat()
        sub["status"] = "active"
        if name and not sub.get("name"):
            sub["name"] = name
        if sutradhar_id and not sub.get("sold_by_sutradhar"):
            sub["sold_by_sutradhar"] = sutradhar_id
        sub.setdefault("history", []).append({"at": now.isoformat(), "days": days, "source": source})
        sub["updated_at"] = now.isoformat()
        SutradharStore.set_doc("saas_subscribers", phone, sub)
    log_audit_event("SAAS_SUBSCRIPTION_EXTENDED", phone, {"days": days, "source": source, "expires_at": sub["expires_at"]})
    return sub


class SaasRedeemRequest(BaseModel):
    service_id: str
    code: str
    device_id: str = Field(..., description="Random id kept in the browser's storage")
    report_ref: Optional[str] = None


@router.post("/saas/redeem")
async def saas_redeem(req: SaasRedeemRequest, authorization: Optional[str] = Header(None)):
    """Unlock one report for a SaaS subscriber who typed his own login number."""
    login_phone = token_phone(verify_firebase_token(authorization))
    code_phone = normalize_phone(req.code)
    if not login_phone or len(code_phone) != 10 or code_phone != login_phone:
        return {"ok": False, "message": INVALID_CODE_MESSAGE}

    exempt = login_phone in saas_exempt_phones()
    sub = get_saas_subscriber(login_phone)
    if not exempt and not sub:
        return {"ok": False, "message": INVALID_CODE_MESSAGE}
    if not exempt and sub.get("status") == "paused":
        return {"ok": False, "message": "आपका SaaS खाता अभी रुका हुआ है। सहायता से संपर्क करें।"}
    if not exempt and not saas_is_active(sub):
        return {"ok": False, "message": "आपकी SaaS सदस्यता समाप्त हो गई है। रिपोर्ट खोलने के लिए नवीनीकरण करें।"}

    sid = resolve_service_id(req.service_id)
    if not saas_unlockable(sid):
        return {"ok": False, "message": "यह सेवा SaaS में शामिल नहीं है।"}

    device_id = re.sub(r"[^A-Za-z0-9_-]", "", req.device_id or "")[:64]
    if len(device_id) < 8:
        return {"ok": False, "message": "डिवाइस पहचान नहीं हो सकी। पेज रीफ़्रेश करके पुनः प्रयास करें।"}

    now = datetime.now(timezone.utc)
    with _store_lock:
        if not exempt:
            sub = get_saas_subscriber(login_phone)
            devices = sub.get("devices", [])
            known = next((d for d in devices if d.get("device_id") == device_id), None)
            if known:
                known["last_seen"] = now.isoformat()
            elif len(devices) >= SAAS_MAX_DEVICES:
                log_audit_event("SAAS_DEVICE_LIMIT", login_phone, {"device_id": device_id})
                return {"ok": False, "message": f"यह SaaS खाता पहले से {SAAS_MAX_DEVICES} फ़ोन पर चल रहा है। नया फ़ोन जोड़ने के लिए सहायता से संपर्क करें।"}
            else:
                devices.append({"device_id": device_id, "first_seen": now.isoformat(), "last_seen": now.isoformat()})
            sub["devices"] = devices
            sub["last_used_at"] = now.isoformat()
            SutradharStore.set_doc("saas_subscribers", login_phone, sub)
        use_id = f"use_{login_phone}_{int(now.timestamp() * 1000)}_{os.urandom(2).hex()}"
        SutradharStore.set_doc("saas_usage", use_id, {
            "id": use_id, "phone": login_phone, "service_id": sid, "device_id": device_id,
            "report_ref": (req.report_ref or "")[:120], "at": now.isoformat(), "exempt": exempt})

    return {"ok": True, "service_id": sid, "unlock_id": use_id,
            "expires_at": (sub or {}).get("expires_at") if not exempt else None,
            "message": "SaaS सदस्यता से रिपोर्ट खुल गई।"}


# -----------------------------------------------------------------------------
# ENDPOINT 7: ADMIN 'REQUIRES REVIEW' QUEUE (जाँच ज़रूरी)
# -----------------------------------------------------------------------------
@router.get("/admin/reviews")
async def get_admin_review_queue(authorization: Optional[str] = Header(None)):
    """Returns all commissions in 'requires_review' state."""
    require_admin(authorization)
    all_comms = SutradharStore.query_all("commissions")
    flagged = [c for c in all_comms if c.get("status") == "requires_review"]
    return {
        "status": "success",
        "count": len(flagged),
        "queue": flagged
    }


@router.post("/admin/review-action")
@router.post("/admin/reviews/action")
async def take_admin_review_action(req: ReviewActionRequest, authorization: Optional[str] = Header(None)):
    """
    हर मामले पर दो बटन:
    1. 'retry': फिर से पेआउट सूची में डालें
    2. 'cancel': रद्द करें, कारण सहित
    """
    admin = require_admin(authorization)
    comm = SutradharStore.get_doc("commissions", req.commission_id)
    if not comm:
        raise HTTPException(status_code=404, detail="कमीशन रिकॉर्ड नहीं मिला।")
    if comm.get("status") == "paid":
        raise HTTPException(status_code=400, detail="यह कमीशन पहले ही चुकाया जा चुका है।")

    if req.action == "retry":
        comm["status"] = "created"
        comm["failure_reason"] = None
        if req.upi_id:
            comm["upi_id"] = req.upi_id.strip().lower()
            s_id = comm.get("sutradhar_id")
            if s_id:
                s_obj = SutradharStore.get_doc("sutradhars", s_id)
                if s_obj:
                    s_obj["upi_id"] = req.upi_id.strip().lower()
                    SutradharStore.set_doc("sutradhars", s_id, s_obj)
        SutradharStore.set_doc("commissions", req.commission_id, comm)
        log_audit_event("ADMIN_RETRY_PAYOUT", admin, {"commission_id": req.commission_id, "upi": req.upi_id})
        await process_pending_payouts()
        return {"status": "success", "message": "कमीशन फिर से पेआउट सूची में डाल दिया गया है।"}

    elif req.action == "cancel":
        comm["status"] = "cancelled"
        comm["failure_reason"] = req.reason or "व्यवस्थापक द्वारा रद्द"
        SutradharStore.set_doc("commissions", req.commission_id, comm)
        log_audit_event("ADMIN_CANCEL_PAYOUT", admin, {"commission_id": req.commission_id, "reason": req.reason})
        return {"status": "success", "message": "कमीशन रद्द कर दिया गया है।"}

    raise HTTPException(status_code=400, detail="अमान्य एक्शन। केवल 'retry' या 'cancel' मान्य हैं।")


# -----------------------------------------------------------------------------
# ENDPOINT 7b: MANUAL PAYOUT DESK (T+2 working days, paid by hand, closed with UTR)
# -----------------------------------------------------------------------------
class MarkPaidRequest(BaseModel):
    sutradhar_id: str
    commission_ids: List[str]
    utr: str = Field(..., description="Bank / UPI reference of the transfer")
    note: Optional[str] = None


class HolidayRequest(BaseModel):
    date: str = Field(..., description="YYYY-MM-DD")
    name: Optional[str] = "बैंक अवकाश"
    remove: bool = False


def _commission_due_date(c: Dict[str, Any]) -> str:
    """Due date stored on the commission; older records get one from their creation time."""
    if c.get("payout_due_date"):
        return c["payout_due_date"]
    try:
        return payout_due_date_for(datetime.fromisoformat(c.get("created_at")))
    except Exception:
        return today_ist()


@router.get("/admin/payouts")
async def get_admin_payout_desk(date: Optional[str] = Query(None, description="IST date YYYY-MM-DD; default today"),
                                authorization: Optional[str] = Header(None)):
    """
    Everything the owner needs for the evening payout:
    - due: unpaid commissions due on or before `date`, grouped per Sutradhar with UPI and total
    - upcoming: unpaid commissions due after `date`, totals per date
    - paid_today: what was closed on `date`
    """
    require_admin(authorization)
    day = date or today_ist()
    try:
        day_d = datetime.fromisoformat(day).date()
    except Exception:
        raise HTTPException(status_code=400, detail="तारीख़ YYYY-MM-DD रूप में दें।")

    sutradhars = {s.get("id"): s for s in SutradharStore.query_all("sutradhars")}
    for s in list(sutradhars.values()):
        if s.get("sutradhar_id"):
            sutradhars.setdefault(s["sutradhar_id"], s)

    due_groups: Dict[str, Dict[str, Any]] = {}
    upcoming: Dict[str, Dict[str, Any]] = {}
    paid_today: List[Dict[str, Any]] = []

    for c in SutradharStore.query_all("commissions"):
        st = c.get("status")
        if st == "paid":
            if (c.get("paid_at") or "")[:10] and datetime.fromisoformat(c["paid_at"]).astimezone(IST).date() == day_d:
                paid_today.append(c)
            continue
        if st not in UNPAID_COMMISSION_STATUSES:
            continue
        due = _commission_due_date(c)
        row = {
            "commission_id": c.get("id"),
            "payment_id": c.get("payment_id"),
            "product": c.get("product"),
            "product_name": c.get("product_name") or SERVICE_CATALOG.get(resolve_service_id(c.get("product", "")), {}).get("name", c.get("product")),
            "customer_phone_last4": (c.get("customer_phone") or "")[-4:],
            "order_amount": c.get("order_amount"),
            "amount": c.get("amount"),
            "paid_on": c.get("paid_on") or (c.get("created_at") or "")[:10],
            "payout_due_date": due,
            "status": st,
            "failure_reason": c.get("failure_reason"),
        }
        if due <= day:
            sid = c.get("sutradhar_id", "")
            s = sutradhars.get(sid) or {}
            g = due_groups.setdefault(sid, {
                "sutradhar_id": sid,
                "name": s.get("name", ""),
                "phone": s.get("phone", ""),
                "upi_id": c.get("upi_id") or s.get("upi_id", ""),
                "upi_verified": bool(s.get("upi_verified")),
                "pan": s.get("pan", ""),
                "total": 0.0,
                "overdue": False,
                "items": [],
            })
            g["items"].append(row)
            g["total"] += float(c.get("amount", 0) or 0)
            if due < day:
                g["overdue"] = True
        else:
            u = upcoming.setdefault(due, {"date": due, "total": 0.0, "count": 0})
            u["total"] += float(c.get("amount", 0) or 0)
            u["count"] += 1

    groups = sorted(due_groups.values(), key=lambda g: (-g["total"], g["name"]))
    holidays = load_payout_holidays()
    return {
        "status": "success",
        "date": day,
        "is_working_day": is_payout_working_day(day_d, holidays),
        "holiday_name": holidays.get(day, ""),
        "payout_mode": payout_mode(),
        "rule": f"भुगतान के {PAYOUT_SETTLEMENT_WORKING_DAYS} कार्य-दिवस बाद {PAYOUT_DEADLINE_TEXT}",
        "due_total": round(sum(g["total"] for g in groups), 2),
        "due_sutradhar_count": len(groups),
        "due": groups,
        "upcoming": [upcoming[k] for k in sorted(upcoming)],
        "paid_today_total": round(sum(float(c.get("amount", 0) or 0) for c in paid_today), 2),
        "paid_today": paid_today,
    }


@router.post("/admin/payouts/mark-paid")
async def admin_mark_payout_paid(req: MarkPaidRequest, authorization: Optional[str] = Header(None)):
    """Close the listed commissions of one Sutradhar after paying them by hand. Needs the real UTR."""
    admin = require_admin(authorization)
    utr = re.sub(r"\s", "", req.utr or "")
    if len(utr) < 6:
        raise HTTPException(status_code=400, detail="बैंक/UPI का सही UTR (कम से कम 6 अक्षर) दर्ज करें।")
    if not req.commission_ids:
        raise HTTPException(status_code=400, detail="कोई कमीशन नहीं चुना गया।")

    now = datetime.now(timezone.utc)
    closed, skipped, total = [], [], 0.0
    for cid in req.commission_ids:
        c = SutradharStore.get_doc("commissions", cid)
        if not c or c.get("sutradhar_id") != req.sutradhar_id:
            skipped.append({"commission_id": cid, "reason": "इस सूत्रधार का कमीशन नहीं मिला"})
            continue
        ok = SutradharStore.compare_and_set_status(
            "commissions", cid, list(UNPAID_COMMISSION_STATUSES),
            {"status": "paid", "utr": utr, "paid_at": now.isoformat(), "paid_by": admin,
             "payout_method": "manual_upi", "payout_note": req.note or "", "failure_reason": None})
        if ok:
            closed.append(cid)
            total += float(c.get("amount", 0) or 0)
            lead = SutradharStore.get_doc("leads", c.get("lead_id", "")) if c.get("lead_id") else None
            if lead:
                lead["utr"] = utr
                lead["payout_status"] = "transferred"
                SutradharStore.set_doc("leads", lead["id"], lead)
        else:
            skipped.append({"commission_id": cid, "reason": "पहले ही चुकाया या रद्द"})

    log_audit_event("ADMIN_MANUAL_PAYOUT", admin, {
        "sutradhar_id": req.sutradhar_id, "utr": utr, "total": total, "closed": closed, "skipped": skipped})
    return {"status": "success", "utr": utr, "total_paid": round(total, 2), "closed": closed, "skipped": skipped}


@router.get("/admin/holidays")
async def list_payout_holidays(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    h = load_payout_holidays()
    return {"status": "success", "holidays": [{"date": d, "name": n} for d, n in sorted(h.items())]}


@router.post("/admin/holidays")
async def edit_payout_holidays(req: HolidayRequest, authorization: Optional[str] = Header(None)):
    """Add or remove a bank holiday (payouts skip it). Saved in the settings store on top of data/sutradhar_holidays.json."""
    admin = require_admin(authorization)
    try:
        datetime.fromisoformat(req.date)
    except Exception:
        raise HTTPException(status_code=400, detail="तारीख़ YYYY-MM-DD रूप में दें।")
    with _store_lock:
        doc = SutradharStore.get_doc("settings", "payout_holidays") or {}
        items = [h for h in doc.get("holidays", []) if h.get("date") != req.date]
        removed = [d for d in doc.get("removed", []) if d != req.date]
        if req.remove:
            removed.append(req.date)
        else:
            items.append({"date": req.date, "name": req.name or "बैंक अवकाश"})
        SutradharStore.set_doc("settings", "payout_holidays", {
            "holidays": sorted(items, key=lambda h: h["date"]), "removed": sorted(removed)})
    log_audit_event("ADMIN_HOLIDAY_EDIT", admin, {"date": req.date, "remove": req.remove})
    return await list_payout_holidays(authorization)


# -----------------------------------------------------------------------------
# ENDPOINT 7c: ADMIN — SaaS subscribers (list, add / extend, pause, reset phones)
# -----------------------------------------------------------------------------
class SaasAdminRequest(BaseModel):
    phone: str
    name: Optional[str] = None
    add_days: Optional[int] = Field(None, description="Extend by this many days (365 = one year)")
    expires_at: Optional[str] = Field(None, description="Set an exact expiry date YYYY-MM-DD")
    status: Optional[str] = Field(None, description="'active' or 'paused'")
    reset_devices: bool = False
    remove_device_id: Optional[str] = None
    note: Optional[str] = None


def _saas_view(sub: Dict[str, Any], usage: List[Dict[str, Any]]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    month = now.astimezone(IST).strftime("%Y-%m")
    mine = [u for u in usage if u.get("phone") == sub.get("phone")]
    month_uses = [u for u in mine if datetime.fromisoformat(u["at"]).astimezone(IST).strftime("%Y-%m") == month]
    by_service: Dict[str, int] = {}
    for u in month_uses:
        by_service[u.get("service_id", "")] = by_service.get(u.get("service_id", ""), 0) + 1
    days_left = None
    try:
        days_left = (datetime.fromisoformat(sub["expires_at"]) - now).days
    except Exception:
        pass
    return {
        "phone": sub.get("phone"), "name": sub.get("name", ""), "status": sub.get("status"),
        "active": saas_is_active(sub, now), "expires_at": sub.get("expires_at"), "days_left": days_left,
        "devices": sub.get("devices", []), "device_limit": SAAS_MAX_DEVICES,
        "sold_by_sutradhar": sub.get("sold_by_sutradhar", ""), "last_used_at": sub.get("last_used_at"),
        "uses_this_month": len(month_uses), "uses_total": len(mine), "uses_by_service_this_month": by_service,
        "history": sub.get("history", [])[-10:], "note": sub.get("note", ""),
    }


@router.get("/admin/saas")
async def admin_list_saas(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    usage = SutradharStore.query_all("saas_usage")
    subs = [_saas_view(s, usage) for s in SutradharStore.query_all("saas_subscribers") if s.get("phone")]
    subs.sort(key=lambda v: (not v["active"], v.get("days_left") if v.get("days_left") is not None else 99999))
    return {"status": "success", "count": len(subs), "active_count": sum(1 for v in subs if v["active"]),
            "device_limit": SAAS_MAX_DEVICES, "subscribers": subs}


@router.post("/admin/saas")
async def admin_upsert_saas(req: SaasAdminRequest, authorization: Optional[str] = Header(None)):
    admin = require_admin(authorization)
    phone = normalize_phone(req.phone)
    if len(phone) != 10:
        raise HTTPException(status_code=400, detail="10 अंकों का मोबाइल नंबर दें।")
    if req.status and req.status not in ("active", "paused"):
        raise HTTPException(status_code=400, detail="status केवल 'active' या 'paused' हो सकता है।")
    if req.add_days:
        if not (1 <= req.add_days <= 3660):
            raise HTTPException(status_code=400, detail="दिन 1 से 3660 के बीच दें।")
        extend_saas_subscription(phone, req.name or "", days=req.add_days, source=f"admin:{admin}")
    now = datetime.now(timezone.utc)
    with _store_lock:
        sub = get_saas_subscriber(phone)
        if not sub:
            if not req.expires_at:
                raise HTTPException(status_code=404, detail="यह नंबर SaaS सूची में नहीं है। जोड़ने के लिए दिन (जैसे 365) दें।")
            sub = {"phone": phone, "name": req.name or "", "devices": [], "status": "active",
                   "created_at": now.isoformat(), "history": []}
        if req.expires_at:
            try:
                exp = datetime.fromisoformat(req.expires_at).replace(hour=23, minute=59, tzinfo=IST)
            except Exception:
                raise HTTPException(status_code=400, detail="तारीख़ YYYY-MM-DD रूप में दें।")
            sub["expires_at"] = exp.astimezone(timezone.utc).isoformat()
            sub.setdefault("history", []).append({"at": now.isoformat(), "set_expiry": req.expires_at, "source": f"admin:{admin}"})
        if req.name:
            sub["name"] = req.name
        if req.status:
            sub["status"] = req.status
        if req.reset_devices:
            sub["devices"] = []
        if req.remove_device_id:
            sub["devices"] = [d for d in sub.get("devices", []) if d.get("device_id") != req.remove_device_id]
        if req.note is not None:
            sub["note"] = req.note
        sub["updated_at"] = now.isoformat()
        SutradharStore.set_doc("saas_subscribers", phone, sub)
    log_audit_event("ADMIN_SAAS_UPDATE", admin, {"phone": phone, "add_days": req.add_days, "expires_at": req.expires_at,
                                                 "status": req.status, "reset_devices": req.reset_devices})
    return {"status": "success", "subscriber": _saas_view(sub, SutradharStore.query_all("saas_usage"))}


# -----------------------------------------------------------------------------
# ENDPOINT 8: SUTRADHAR LOGIN AND DASHBOARD SUMMARY (signed-in Sutradhar only)
# -----------------------------------------------------------------------------
@router.get("/login")
async def login_sutradhar(phone: Optional[str] = Query(None, description="Ignored; the phone comes from the OTP token"),
                          authorization: Optional[str] = Header(None)):
    """Returns the signed-in Sutradhar's profile, 404 if the OTP-verified number is not registered."""
    sutradhar = require_sutradhar(authorization)
    return {"status": "success", "sutradhar": sutradhar}


@router.get("/summary")
async def get_sutradhar_summary(sutradhar_id: Optional[str] = Query(None, description="Ignored; the signed-in Sutradhar is used"),
                                authorization: Optional[str] = Header(None)):
    """Today / month / lifetime commission, what is paid, and what will be paid on which date."""
    me = require_sutradhar(authorization)
    primary_id = me.get("sutradhar_id") or me["id"]
    matching_ids = get_sutradhar_alias_ids(primary_id)
    my_comms = [
        c for c in SutradharStore.query_all("commissions")
        if (str(c.get("sutradhar_id", "")).upper() in matching_ids or
            str(c.get("sutradhar_code", "")).upper() in matching_ids) and c.get("status") != "cancelled"
    ]

    today = today_ist()
    month = today[:7]
    today_total = month_total = lifetime_total = paid_total = pending_total = 0.0
    schedule: Dict[str, float] = {}
    for c in my_comms:
        amt = float(c.get("amount", 0) or 0)
        earned_on = c.get("paid_on") or (c.get("created_at") or "")[:10]
        lifetime_total += amt
        if earned_on == today:
            today_total += amt
        if earned_on.startswith(month):
            month_total += amt
        if c.get("status") == "paid":
            paid_total += amt
        else:
            pending_total += amt
            due = _commission_due_date(c)
            schedule[due] = schedule.get(due, 0.0) + amt

    my_leads = [
        l for l in SutradharStore.query_all("leads")
        if (str(l.get("sutradhar_id", "")).upper() in matching_ids or
            str(l.get("sutradhar_code", "")).upper() in matching_ids)
    ]
    now = datetime.now(timezone.utc)
    active_leads = 0
    for l in my_leads:
        try:
            if l.get("status") in ("active", "converted") and datetime.fromisoformat(l["expires_at"]) > now:
                active_leads += 1
        except Exception:
            pass
    converted_leads = sum(1 for l in my_leads if l.get("status") == "converted")
    next_payouts = [{"date": d, "amount": round(a, 2), "deadline": PAYOUT_DEADLINE_TEXT} for d, a in sorted(schedule.items())]
    stats = {
        "today_commission": round(today_total, 2),
        "month_commission": round(month_total, 2),
        "lifetime_commission": round(lifetime_total, 2),
        "total_commission": round(lifetime_total, 2),
        "paid_commission": round(paid_total, 2),
        "pending_payout": round(pending_total, 2),
        "active_leads": active_leads,
        "converted_leads": converted_leads,
        "total_leads": len(my_leads),
    }
    return {
        "status": "success",
        "sutradhar_id": primary_id,
        "code": me.get("code") or primary_id,
        "name": me.get("name", ""),
        "upi_id": me.get("upi_id", ""),
        "upi_verified": bool(me.get("upi_verified")),
        **stats,
        "next_payouts": next_payouts,
        "payout_rule": f"भुगतान के {PAYOUT_SETTLEMENT_WORKING_DAYS} कार्य-दिवस बाद {PAYOUT_DEADLINE_TEXT} (रविवार, दूसरा/चौथा शनिवार और बैंक अवकाश छोड़कर)",
        "stats": stats,
    }
