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
    "mangal_dosha":            {"price": 501,   "rate": 66, "name": "मंगल दोष रिपोर्ट"},
    "kaalsarp_dosha":          {"price": 501,   "rate": 66, "name": "कालसर्प दोष रिपोर्ट"},
    "ratna_report":            {"price": 501,   "rate": 66, "name": "रत्न एवं उपाय रिपोर्ट"},
    "dhana_yoga":              {"price": 501,   "rate": 66, "name": "धन योग रिपोर्ट"},
    "gun_milan_manglik":       {"price": 1101,  "rate": 66, "name": "गुण मिलान + मांगलिक"},
    "parashara_report":        {"price": 1111,  "rate": 66, "name": "मेगा पाराशर रिपोर्ट (९७ अध्याय)"},
    "mega_parashara":          {"price": 2100,  "rate": 66, "name": "BPHS पाराशर रिपोर्ट (संपूर्ण, भविष्य का विकल्प)"},
    "muhurta_vivah":           {"price": 2100,  "rate": 66, "name": "विवाह मुहूर्त"},
    "muhurta_vastu":           {"price": 1551,  "rate": 66, "name": "वास्तु मुहूर्त"},
    "muhurta_yajno":           {"price": 1551,  "rate": 66, "name": "यज्ञोपवीत मुहूर्त"},
    "muhurta_mundan":          {"price": 1551,  "rate": 66, "name": "मुंडन (चूडाकर्म) मुहूर्त"},
    "patrika_rajyoga":         {"price": 501,   "rate": 66, "name": "राजयोग / रश्मि बल रिपोर्ट"},
    "patrika_vahan":           {"price": 501,   "rate": 66, "name": "वाहन एवं जनबल रिपोर्ट"},
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


def find_sutradhar_by_code(code: Optional[str]) -> Optional[Dict[str, Any]]:
    """The Sutradhar whose code (or id) is in a shared link; paused accounts are ignored."""
    c = re.sub(r"[\s\-_]", "", (code or "")).upper()
    if not c:
        return None
    for s in SutradharStore.query_all("sutradhars"):
        ids = {re.sub(r"[\s\-_]", "", str(s.get(k) or "")).upper() for k in ("code", "sutradhar_id", "id")}
        if c in ids and s.get("status") != "paused":
            return s
    return None


def lead_from_link(customer_phone: str, ref_code: Optional[str], now: datetime) -> Optional[Dict[str, Any]]:
    """A customer who pays through a Sutradhar's shared offer link becomes that Sutradhar's
    72-hour lead, unless another Sutradhar already holds an unexpired lead on the phone."""
    if len(customer_phone or "") != 10 or customer_phone == "9999999999":
        return None
    sutradhar = find_sutradhar_by_code(ref_code)
    if not sutradhar:
        return None
    sutradhar_id = sutradhar.get("sutradhar_id") or sutradhar["id"]
    with _store_lock:
        for lead in SutradharStore.query_all("leads"):
            if lead.get("customer_phone") != customer_phone or lead.get("status") not in ("active", "converted"):
                continue
            try:
                if datetime.fromisoformat(lead["expires_at"]) > now:
                    return lead if lead.get("sutradhar_id") == sutradhar_id else None
            except Exception:
                continue
        lead_id = f"lead_{customer_phone}_{int(now.timestamp())}_{os.urandom(2).hex()}"
        lead = {
            "id": lead_id,
            "customer_phone": customer_phone,
            "customer_email": "",
            "customer_name": "जातक",
            "sutradhar_id": sutradhar_id,
            "sutradhar_code": sutradhar.get("code") or sutradhar_id,
            "sutradhar_phone": sutradhar.get("phone", ""),
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=72)).isoformat(),
            "status": "active",
            "source": "offer_link",
        }
        SutradharStore.set_doc("leads", lead_id, lead)
    log_audit_event("LEAD_CREATED_FROM_LINK", sutradhar_id, {"lead_id": lead_id, "customer_phone": customer_phone})
    return lead


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
    batch_id: Optional[str] = Field(None, description="1-year course only: batch_morning / batch_evening")
    ref_code: Optional[str] = Field(None, description="Sutradhar code from a shared offer link (?ref=)")

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

    # Changing name or existing UPI ID needs a recent OTP sign-in (within 15 minutes)
    new_name = (req.name or "").strip()
    old_name = (existing or {}).get("name", "").strip()
    name_changed = bool(new_name and old_name and new_name != old_name)
    upi_changed = bool(existing and existing.get("upi_id") and clean_upi and clean_upi != existing.get("upi_id"))

    if (name_changed or upi_changed) and existing:
        auth_time = int((decoded or {}).get("auth_time", 0) or 0)
        if time.time() - auth_time > 15 * 60:
            raise HTTPException(status_code=409, detail="recent_login_required: सुरक्षा के लिए नाम या UPI बदलने से पहले फिर से OTP से सत्यापन करें।")

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
        "message": "लीड 72 घंटे के लिए आपकी है। इस दौरान इस नंबर से हर खरीद की दक्षिणा (GST घटाकर 66%; कोर्स 30%; परामर्श पर नहीं) अपने आप आपके खाते में जुड़ेगी।",
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
                "message": "टेस्ट भुगतान ₹1 (कोई दक्षिणा नहीं)।"
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


# =============================================================================
# 1-YEAR COURSE BATCHES: 11 seats each, registration from 26 Dec 2026, classes from 11 Mar 2027
# A seat is held for COURSE_HOLD_MINUTES when checkout starts; a batch takes no new order once
# paid + held seats reach the limit. A payment that still lands on a full batch is refunded.
# =============================================================================
COURSE_SERVICE_ID = "consultation_gurukul"
COURSE_START_DATE = "2027-03-11"
COURSE_HOLD_MINUTES = 20
COURSE_BATCHES = {
    "batch_morning": {"name": "फ़ाउंडेशन एस्ट्रोलॉजिकल बैच", "name_en": "Foundation Astrological Batch", "seats": 11},
    "batch_evening": {"name": "मास्टर एस्ट्रोलॉजिकल बैच (रिसर्च — पहले से ज्योतिष का ज्ञान आवश्यक)", "name_en": "Master Astrological Batch (Research — previous astrology knowledge required)", "seats": 11},
}
_course_lock = threading.Lock()


def course_registration_opens() -> str:
    return (os.environ.get("COURSE_REGISTRATION_OPENS") or "2026-12-26").strip()


def course_registration_open() -> bool:
    return today_ist() >= course_registration_opens()


def _seat_active(seat: Dict[str, Any], now: datetime) -> bool:
    if seat.get("status") == "paid":
        return True
    if seat.get("status") != "held":
        return False
    try:
        return datetime.fromisoformat(seat.get("held_until")) > now
    except Exception:
        return False


def course_seat_counts() -> Dict[str, Dict[str, int]]:
    now = datetime.now(timezone.utc)
    out = {b: {"paid": 0, "held": 0} for b in COURSE_BATCHES}
    for seat in SutradharStore.query_all("course_seats"):
        b = seat.get("batch_id")
        if b in out and _seat_active(seat, now):
            out[b]["paid" if seat.get("status") == "paid" else "held"] += 1
    return out


def hold_course_seat(batch_id: str, phone: str, name: str) -> str:
    """Reserves one seat for this phone (replacing its earlier hold) or refuses when the batch is full."""
    if batch_id not in COURSE_BATCHES:
        raise HTTPException(status_code=400, detail="कृपया बैच चुनें: फ़ाउंडेशन या मास्टर।")
    if not course_registration_open():
        raise HTTPException(status_code=403, detail="कोर्स का पंजीकरण 26 दिसंबर 2026 से खुलेगा।")
    if len(phone) != 10 or phone == "9999999999":
        raise HTTPException(status_code=400, detail="सीट पक्की करने के लिए अपना 10 अंकों का मोबाइल नंबर दें।")
    now = datetime.now(timezone.utc)
    with _course_lock:
        seats = SutradharStore.query_all("course_seats")
        if any(x.get("phone") == phone and x.get("status") == "paid" for x in seats):
            raise HTTPException(status_code=409, detail="इस नंबर से कोर्स का भुगतान पहले ही हो चुका है।")
        taken = 0
        for x in seats:
            if x.get("phone") == phone and x.get("status") == "held":
                x["status"] = "released"          # a fresh attempt replaces the old hold
                SutradharStore.set_doc("course_seats", x["id"], x)
                continue
            if x.get("batch_id") == batch_id and _seat_active(x, now):
                taken += 1
        b = COURSE_BATCHES[batch_id]
        if taken >= b["seats"]:
            raise HTTPException(status_code=409, detail=f"{b['name']} की सभी {b['seats']} सीटें भर चुकी हैं।")
        seat_id = f"seat_{int(now.timestamp())}_{os.urandom(3).hex()}"
        SutradharStore.set_doc("course_seats", seat_id, {
            "id": seat_id, "batch_id": batch_id, "phone": phone, "name": name or "",
            "status": "held", "held_until": (now + timedelta(minutes=COURSE_HOLD_MINUTES)).isoformat(),
            "created_at": now.isoformat(),
        })
    return seat_id


def release_course_seat(seat_id: str):
    seat = SutradharStore.get_doc("course_seats", seat_id)
    if seat and seat.get("status") == "held":
        seat["status"] = "released"
        SutradharStore.set_doc("course_seats", seat_id, seat)


def confirm_course_seat(order: Dict[str, Any], payment_id: str, captured_paise: int) -> Dict[str, Any]:
    """On payment: the held seat becomes paid; if the batch filled up meanwhile, the payment is refunded."""
    seat_id = order.get("seat_id")
    with _course_lock:
        seat = SutradharStore.get_doc("course_seats", seat_id) if seat_id else None
        if seat and seat.get("status") == "paid":
            return {"ok": True, "seat": seat}
        batch_id = (seat or {}).get("batch_id") or order.get("course_batch")
        limit = COURSE_BATCHES.get(batch_id, {}).get("seats", 0)
        now = datetime.now(timezone.utc)
        paid_others = sum(1 for x in SutradharStore.query_all("course_seats")
                          if x.get("batch_id") == batch_id and x.get("status") == "paid" and x.get("id") != seat_id)
        if not seat:
            seat = {"id": seat_id or f"seat_{payment_id}", "batch_id": batch_id, "phone": order.get("customer_phone", ""),
                    "name": order.get("customer_name", ""), "created_at": now.isoformat()}
        seat.update({"order_id": order.get("order_id"), "payment_id": payment_id,
                     "name": order.get("customer_name") or seat.get("name", "")})
        if batch_id in COURSE_BATCHES and paid_others < limit:
            seat.update({"status": "paid", "paid_at": now.isoformat()})
            SutradharStore.set_doc("course_seats", seat["id"], seat)
            return {"ok": True, "seat": seat}
        # full (the hold had run out and others paid): give the money back
        refund_status = "refunded"
        if not _is_test_env():
            try:
                import razorpay
                client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
                client.payment.refund(payment_id, {"amount": captured_paise, "notes": {"reason": "course batch full"}})
            except Exception as e:
                logger.error(f"[Course] refund failed for {payment_id}: {e}")
                refund_status = "refund_failed"
        seat.update({"status": refund_status, "refund_reason": "batch_full", "refunded_at": now.isoformat()})
        SutradharStore.set_doc("course_seats", seat["id"], seat)
        log_audit_event("COURSE_BATCH_FULL_REFUND", "system", {"payment_id": payment_id, "batch_id": batch_id, "status": refund_status})
        return {"ok": False, "seat": seat}


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

    # Shared offer link: no lead yet for this phone -> the link's Sutradhar gets it (72 hours)
    link_phone = effective_phone if effective_phone != "9999999999" else ""
    if not attributed_lead_id and req.ref_code and link_phone:
        link_lead = lead_from_link(link_phone, req.ref_code, now)
        if link_lead:
            attributed_lead = link_lead
            attributed_sutradhar_id = link_lead.get("sutradhar_id", "")
            attributed_sutradhar_code = (link_lead.get("sutradhar_code") or attributed_sutradhar_id).replace("-", "")
            attributed_lead_id = link_lead.get("id", "")
            attributed_at = now.isoformat()

    # Quote determination (server catalog only; master test code needs a Phone-Auth token)
    strict_phone = token_phone(verify_firebase_token(authorization))
    quote = build_quote(effective_phone, req.service_id, req.input_code, strict_phone)
    service_id = quote["service_id"]
    net_price = quote["net_price"]
    net_paise = net_price * 100
    is_test_order = bool(quote.get("is_test"))
    seat_id = ""
    if service_id == COURSE_SERVICE_ID:
        seat_phone = effective_phone if effective_phone != "9999999999" else (body_phone or "")
        seat_id = hold_course_seat((req.batch_id or "").strip(), seat_phone, req.customer_name or "")
        effective_phone = seat_phone
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
            if seat_id:
                release_course_seat(seat_id)
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
    if seat_id:
        order_doc["seat_id"] = seat_id
        order_doc["course_batch"] = req.batch_id
        seat = SutradharStore.get_doc("course_seats", seat_id) or {}
        seat["order_id"] = order_id
        SutradharStore.set_doc("course_seats", seat_id, seat)
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
        "seat_hold_minutes": COURSE_HOLD_MINUTES if seat_id else None,
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

    # Course: the held seat becomes paid, or the payment is refunded if the batch is already full
    if order.get("seat_id") or resolve_service_id(order.get("service_id", "")) == COURSE_SERVICE_ID:
        res = confirm_course_seat(order, payment_id, captured_paise)
        if not res["ok"]:
            order["status"] = "refunded_batch_full"
            SutradharStore.set_doc("orders", order_id, order)
            return {"status": "refunded_batch_full", "order_id": order_id, "commission_created": False}

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
# REPORT UNLOCK PROOF: a report page opens only when the server confirms payment
# -----------------------------------------------------------------------------
# After checkout the page sends Razorpay's signed receipt (order_id|payment_id signed with our
# key secret), a SaaS unlock_id, or the owner's master key. The server checks it, binds it to
# one report_ref (a kundali, or one browser for the muhurta tools) and returns a pass; every
# later opening of the page is checked again with /unlock/check.
# Muhurta tools are timed sessions: the pass carries an expiry (`exp`, unix seconds) that the
# server fixes at the first unlock and stores with the payment, so the same receipt cannot
# start a fresh session again.
UNLOCK_SECRET = os.environ.get("SRA_UNLOCK_SECRET") or RAZORPAY_KEY_SECRET

UNLOCK_SESSION_MINUTES: Dict[str, int] = {
    "muhurta_vivah": 20, "muhurta_vastu": 20, "muhurta_yajno": 20, "muhurta_mundan": 20,
}
ADMIN_UNLOCK_MINUTES = 12 * 60

# Owner master key: same salted, 50,000-times SHA-256 as sra-master.js / api/master_key.php.
# Only the hash is here; SRA_MASTER_KEY_HASH / SRA_MASTER_KEY_SALT override it.
MASTER_KEY_SALT = os.environ.get("SRA_MASTER_KEY_SALT", "ae6f38cffcbc76ea")
MASTER_KEY_HASH = os.environ.get("SRA_MASTER_KEY_HASH", "f0fe08d25612e21dfbf70e08a0028fc15c7dbc0d8089d335544586f4ac15c15a")
MASTER_KEY_ROUNDS = 50000
_ADMIN_FAIL_LIMIT = 8            # wrong owner keys per client in the window below
_ADMIN_FAIL_WINDOW = 15 * 60
_admin_key_failures: Dict[str, List[float]] = {}


def is_owner_master_key(code: Optional[str]) -> bool:
    key = (code or "").strip().upper()
    if not 8 <= len(key) <= 12:
        return False
    h = MASTER_KEY_SALT + key
    for _ in range(MASTER_KEY_ROUNDS):
        h = hashlib.sha256(h.encode()).hexdigest()
    return hmac.compare_digest(h, MASTER_KEY_HASH)


def _client_ip(request: Optional[Request]) -> str:
    if request is None:
        return "unknown"
    # Render's proxy appends the real client address last; earlier entries can be set by the client
    fwd = (request.headers.get("x-forwarded-for") or "").split(",")[-1].strip()
    return fwd or (request.client.host if request.client else "unknown")


class UnlockVerifyRequest(BaseModel):
    service_id: str
    report_ref: str
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    signature: Optional[str] = None
    unlock_id: Optional[str] = None
    admin_key: Optional[str] = None


class UnlockCheckRequest(BaseModel):
    service_id: str
    report_ref: str
    proof: str
    token: str
    exp: Optional[int] = None


def _unlock_token(sid: str, ref: str, proof: str, exp: Optional[int] = None) -> str:
    msg = f"{sid}|{ref}|{proof}" + (f"|{int(exp)}" if exp else "")
    return hmac.new(UNLOCK_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()


def _clean_ref(ref: Optional[str]) -> str:
    return re.sub(r"[^A-Za-z0-9_-]", "", ref or "")[:120]


def _proof_record(proof: str):
    kind, _, pid = proof.partition(":")
    coll = {"pay": "orders", "saas": "saas_usage", "admin": "admin_unlocks"}.get(kind)
    return (coll, pid, SutradharStore.get_doc(coll, pid)) if coll and pid else (None, pid, None)


def _proof_still_valid(sid: str, ref: str, proof: str, exp: Optional[int] = None) -> bool:
    kind, _, pid = proof.partition(":")
    _, _, doc = _proof_record(proof)
    if not doc:
        return False
    if kind == "pay":
        ok = resolve_service_id(doc.get("service_id", "")) == sid \
            and doc.get("report_ref") == ref and doc.get("status") not in ("refunded", "cancelled")
    elif kind == "saas":
        ok = doc.get("service_id") == sid and _clean_ref(doc.get("report_ref")) == ref
    elif kind == "admin":
        ok = doc.get("service_id") == sid and doc.get("report_ref") == ref
    else:
        return False
    if not ok:
        return False
    stored_exp = doc.get("unlock_expires_at")
    if sid in UNLOCK_SESSION_MINUTES or kind == "admin":
        # a timed pass: the expiry the server stored must match the pass and still be ahead
        return bool(stored_exp) and exp == int(stored_exp) and int(stored_exp) > int(time.time())
    return True


def _start_session(coll: str, pid: str, minutes: int) -> int:
    """Fix the session's end the first time; later calls return the same end."""
    with _store_lock:
        doc = SutradharStore.get_doc(coll, pid) or {}
        if not doc.get("unlock_expires_at"):
            doc["unlock_expires_at"] = int(time.time()) + minutes * 60
            SutradharStore.set_doc(coll, pid, doc)
        return int(doc["unlock_expires_at"])


@router.post("/unlock/verify")
async def unlock_verify(req: UnlockVerifyRequest, request: Request):
    """Turn a Razorpay receipt, a SaaS unlock or the owner key into a pass for one report_ref."""
    sid = resolve_service_id(req.service_id)
    ref = _clean_ref(req.report_ref)
    if sid not in SERVICE_CATALOG or not ref:
        return {"ok": False, "message": "रिपोर्ट की पहचान नहीं हो सकी।"}
    exp: Optional[int] = None
    if req.order_id and req.payment_id and req.signature:
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), f"{req.order_id}|{req.payment_id}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, req.signature):
            log_audit_event("UNLOCK_BAD_SIGNATURE", "system", {"order_id": req.order_id, "service_id": sid})
            return {"ok": False, "message": "भुगतान की पुष्टि नहीं हो सकी।"}
        with _store_lock:
            order = SutradharStore.get_doc("orders", req.order_id)
            if not order or resolve_service_id(order.get("service_id", "")) != sid:
                return {"ok": False, "message": "भुगतान इस रिपोर्ट का नहीं है।"}
            bound = order.get("report_ref")
            if bound and bound != ref:
                return {"ok": False, "message": "यह भुगतान किसी दूसरी कुंडली की रिपोर्ट के लिए हो चुका है।"}
            if not bound:
                order["report_ref"] = ref
                order["checkout_payment_id"] = req.payment_id
                order["report_bound_at"] = datetime.now(timezone.utc).isoformat()
                SutradharStore.set_doc("orders", req.order_id, order)
        proof = f"pay:{req.order_id}"
        if sid in UNLOCK_SESSION_MINUTES:
            exp = _start_session("orders", req.order_id, UNLOCK_SESSION_MINUTES[sid])
    elif req.unlock_id:
        use = SutradharStore.get_doc("saas_usage", req.unlock_id)
        if not use or use.get("service_id") != sid or _clean_ref(use.get("report_ref")) != ref:
            return {"ok": False, "message": "कोड से रिपोर्ट खोलने की पुष्टि नहीं हो सकी।"}
        proof = f"saas:{req.unlock_id}"
        if sid in UNLOCK_SESSION_MINUTES:
            exp = _start_session("saas_usage", req.unlock_id, UNLOCK_SESSION_MINUTES[sid])
    elif req.admin_key:
        ip = _client_ip(request)
        now_t = time.time()
        with _store_lock:
            fails = [t for t in _admin_key_failures.get(ip, []) if now_t - t < _ADMIN_FAIL_WINDOW]
            _admin_key_failures[ip] = fails
        if len(fails) >= _ADMIN_FAIL_LIMIT:
            return {"ok": False, "message": "बहुत बार गलत कोड। कुछ देर बाद प्रयास करें।"}
        if not await asyncio.to_thread(is_owner_master_key, req.admin_key):
            with _store_lock:
                _admin_key_failures.setdefault(ip, []).append(now_t)
            log_audit_event("UNLOCK_BAD_ADMIN_KEY", "system", {"service_id": sid, "ip": ip})
            return {"ok": False, "message": INVALID_CODE_MESSAGE}
        aid = f"adm_{int(now_t * 1000)}_{os.urandom(4).hex()}"
        exp = int(now_t) + ADMIN_UNLOCK_MINUTES * 60
        SutradharStore.set_doc("admin_unlocks", aid, {
            "id": aid, "service_id": sid, "report_ref": ref, "ip": ip,
            "at": datetime.now(timezone.utc).isoformat(), "unlock_expires_at": exp})
        proof = f"admin:{aid}"
    else:
        return {"ok": False, "message": "भुगतान की जानकारी नहीं मिली।"}
    if exp is not None and exp <= int(time.time()):
        return {"ok": False, "expired": True, "message": "इस भुगतान का सत्र समाप्त हो चुका है।"}
    log_audit_event("REPORT_UNLOCKED", "system", {"service_id": sid, "report_ref": ref, "proof": proof, "exp": exp})
    out = {"ok": True, "proof": proof, "token": _unlock_token(sid, ref, proof, exp)}
    if exp is not None:
        out["exp"] = exp
    return out


@router.post("/unlock/check")
async def unlock_check(req: UnlockCheckRequest):
    """Called every time a paid page opens: is this pass genuine, still backed by a payment, and not expired?"""
    sid = resolve_service_id(req.service_id)
    ref = _clean_ref(req.report_ref)
    if not ref or not hmac.compare_digest(_unlock_token(sid, ref, req.proof, req.exp), req.token or ""):
        return {"ok": False}
    ok = _proof_still_valid(sid, ref, req.proof, req.exp)
    return {"ok": ok, "exp": req.exp} if ok and req.exp else {"ok": ok}


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
        raise HTTPException(status_code=404, detail="दक्षिणा रिकॉर्ड नहीं मिला।")
    if comm.get("status") == "paid":
        raise HTTPException(status_code=400, detail="यह दक्षिणा पहले ही चुकाई जा चुकी है।")

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
        return {"status": "success", "message": "दक्षिणा फिर से पेआउट सूची में डाल दी गई है।"}

    elif req.action == "cancel":
        comm["status"] = "cancelled"
        comm["failure_reason"] = req.reason or "व्यवस्थापक द्वारा रद्द"
        SutradharStore.set_doc("commissions", req.commission_id, comm)
        log_audit_event("ADMIN_CANCEL_PAYOUT", admin, {"commission_id": req.commission_id, "reason": req.reason})
        return {"status": "success", "message": "दक्षिणा रद्द कर दी गई है।"}

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
        raise HTTPException(status_code=400, detail="कोई दक्षिणा नहीं चुनी गई।")

    now = datetime.now(timezone.utc)
    closed, skipped, total = [], [], 0.0
    for cid in req.commission_ids:
        c = SutradharStore.get_doc("commissions", cid)
        if not c or c.get("sutradhar_id") != req.sutradhar_id:
            skipped.append({"commission_id": cid, "reason": "इस सूत्रधार की दक्षिणा नहीं मिली"})
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
# ═════════════════════════════════════════════════════════════════════════════
# CONSULTANT DESK (consultant.html) and the client's daily sankalp (sankalp.html)
# A consultant is an astrologer with an active SaaS subscription (or the owner's number).
# The consultant's ID and the client's ID are their 10-digit phone numbers (from the OTP token).
# desk_records/<consultant>_<client>: client details, notes and the remedies the consultant set.
# desk_sankalp/<client>_<consultant>_<date>: which remedies the client marked done that day.
# ═════════════════════════════════════════════════════════════════════════════
DESK_COL = "desk_records"
SANKALP_COL = "desk_sankalp"
DESK_MAX_REMEDIES = 40


def _desk_phone(authorization: Optional[str]) -> str:
    phone = token_phone(verify_firebase_token(authorization))
    if not phone:
        raise HTTPException(status_code=401, detail="कृपया अपने मोबाइल नंबर से OTP लॉगिन करें।")
    return phone


def desk_access(phone: str) -> Dict[str, Any]:
    if phone in saas_exempt_phones():
        return {"allowed": True, "phone": phone, "plan": "owner", "name": "श्री राम जी एस्ट्रो", "expires_at": ""}
    sub = get_saas_subscriber(phone)
    if saas_is_active(sub):
        return {"allowed": True, "phone": phone, "plan": "saas", "name": sub.get("name", ""), "expires_at": sub.get("expires_at", "")}
    return {"allowed": False, "phone": phone, "plan": "", "name": (sub or {}).get("name", ""),
            "expires_at": (sub or {}).get("expires_at", ""),
            "reason": "expired" if sub else "no_subscription"}


def require_consultant(authorization: Optional[str]) -> Dict[str, Any]:
    acc = desk_access(_desk_phone(authorization))
    if not acc["allowed"]:
        msg = ("आपकी ज्योतिषी सॉफ़्टवेयर (SaaS) सदस्यता समाप्त हो गई है। नवीनीकरण के बाद डेस्क फिर खुल जाएगी।"
               if acc.get("reason") == "expired" else
               "कंसल्टेंट डेस्क केवल ज्योतिषी सॉफ़्टवेयर (SaaS) सदस्यों के लिए है।")
        raise HTTPException(status_code=403, detail=msg)
    return acc


def _clip(v: Any, n: int) -> str:
    return str(v or "").strip()[:n]


class DeskClientRequest(BaseModel):
    phone: str
    name: str
    dob: Optional[str] = ""
    tob: Optional[str] = ""
    pob: Optional[str] = ""
    notes: Optional[str] = None


class DeskRemediesRequest(BaseModel):
    client_phone: str
    remedies: List[Dict[str, Any]]


class SankalpMarkRequest(BaseModel):
    consultant_phone: str
    remedy_id: str
    done: bool = True


def _sankalp_done(client: str, consultant: str, day: str) -> List[str]:
    return list((SutradharStore.get_doc(SANKALP_COL, f"{client}_{consultant}_{day}") or {}).get("done") or [])


def _sankalp_week(client: str, consultant: str, total: int) -> List[Dict[str, Any]]:
    """Last 7 days: how many of the remedies the client marked done each day."""
    out = []
    today = datetime.fromisoformat(today_ist()).date()
    for i in range(6, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        out.append({"day": day, "done": len(_sankalp_done(client, consultant, day)), "total": total})
    return out


@router.get("/desk/me")
async def desk_me(authorization: Optional[str] = Header(None)):
    """Who is signed in and whether the consultant desk is open for them."""
    return desk_access(_desk_phone(authorization))


@router.get("/desk/clients")
async def desk_clients(authorization: Optional[str] = Header(None)):
    me = require_consultant(authorization)
    day = today_ist()
    rows = []
    for r in SutradharStore.query_all(DESK_COL):
        if r.get("consultant_phone") != me["phone"]:
            continue
        rems = r.get("remedies") or []
        rows.append(dict(r, done_today=_sankalp_done(r.get("client_phone", ""), me["phone"], day),
                         week=_sankalp_week(r.get("client_phone", ""), me["phone"], len(rems))))
    rows.sort(key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)
    return {"consultant": me, "clients": rows}


@router.post("/desk/clients")
async def desk_save_client(req: DeskClientRequest, authorization: Optional[str] = Header(None)):
    """Add a client, or update the client's details / notes."""
    me = require_consultant(authorization)
    cp = normalize_phone(req.phone)
    if len(cp) != 10:
        raise HTTPException(status_code=400, detail="क्लाइंट का 10 अंकों का मोबाइल नंबर दें।")
    if not _clip(req.name, 80):
        raise HTTPException(status_code=400, detail="क्लाइंट का नाम दें।")
    now = datetime.now(timezone.utc).isoformat()
    doc_id = f"{me['phone']}_{cp}"
    with _store_lock:
        doc = SutradharStore.get_doc(DESK_COL, doc_id) or {
            "consultant_phone": me["phone"], "client_phone": cp, "remedies": [], "notes": "", "created_at": now}
        doc.update({"name": _clip(req.name, 80), "dob": _clip(req.dob, 10), "tob": _clip(req.tob, 5), "pob": _clip(req.pob, 120),
                    "consultant_name": me.get("name", ""), "updated_at": now})
        if req.notes is not None:
            doc["notes"] = _clip(req.notes, 4000)
        SutradharStore.set_doc(DESK_COL, doc_id, doc)
    return {"status": "success", "client": doc}


@router.post("/desk/remedies")
async def desk_save_remedies(req: DeskRemediesRequest, authorization: Optional[str] = Header(None)):
    """Saves the remedy list the consultant set for this client; the client sees it on sankalp.html."""
    me = require_consultant(authorization)
    cp = normalize_phone(req.client_phone)
    doc_id = f"{me['phone']}_{cp}"
    if len(req.remedies) > DESK_MAX_REMEDIES:
        raise HTTPException(status_code=400, detail=f"एक पर्ची में अधिकतम {DESK_MAX_REMEDIES} उपाय।")
    clean = []
    for i, r in enumerate(req.remedies):
        title = _clip(r.get("title"), 120)
        if not title:
            continue
        rid = re.sub(r"[^\w\-]", "", str(r.get("id") or ""))[:40] or f"rx_{int(time.time()*1000)}_{i}"
        clean.append({"id": rid, "title": title, "category": _clip(r.get("category"), 40), "count": _clip(r.get("count"), 60),
                      "days": _clip(r.get("days"), 40), "timing": _clip(r.get("timing"), 60),
                      "instructions": _clip(r.get("instructions"), 1000)})
    with _store_lock:
        doc = SutradharStore.get_doc(DESK_COL, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="पहले यह क्लाइंट जोड़ें।")
        doc = dict(doc)
        doc["remedies"] = clean
        doc["remedies_updated_at"] = doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        doc["consultant_name"] = me.get("name", "") or doc.get("consultant_name", "")
        SutradharStore.set_doc(DESK_COL, doc_id, doc)
    return {"status": "success", "remedies": clean}


@router.get("/desk/my-remedies")
async def desk_my_remedies(authorization: Optional[str] = Header(None)):
    """The signed-in client's remedies from every consultant, with today's ticks."""
    phone = _desk_phone(authorization)
    day = today_ist()
    out = []
    for r in SutradharStore.query_all(DESK_COL):
        if r.get("client_phone") != phone or not r.get("remedies"):
            continue
        c = r.get("consultant_phone", "")
        out.append({"consultant_phone": c, "consultant_name": r.get("consultant_name") or "दैवज्ञ",
                    "client_name": r.get("name", ""), "remedies": r.get("remedies") or [],
                    "updated_at": r.get("remedies_updated_at") or r.get("updated_at", ""),
                    "done_today": _sankalp_done(phone, c, day),
                    "week": _sankalp_week(phone, c, len(r.get("remedies") or []))})
    out.sort(key=lambda x: x.get("updated_at") or "", reverse=True)
    return {"phone": phone, "day": day, "sets": out}


@router.post("/desk/sankalp")
async def desk_mark_sankalp(req: SankalpMarkRequest, authorization: Optional[str] = Header(None)):
    """The client ticks (or un-ticks) one remedy for today."""
    phone = _desk_phone(authorization)
    c = normalize_phone(req.consultant_phone)
    rec = SutradharStore.get_doc(DESK_COL, f"{c}_{phone}")
    if not rec or not any(r.get("id") == req.remedy_id for r in rec.get("remedies") or []):
        raise HTTPException(status_code=404, detail="यह उपाय आपके खाते में नहीं मिला।")
    day = today_ist()
    doc_id = f"{phone}_{c}_{day}"
    with _store_lock:
        doc = SutradharStore.get_doc(SANKALP_COL, doc_id) or {"client_phone": phone, "consultant_phone": c, "day": day, "done": []}
        done = [x for x in (doc.get("done") or []) if x != req.remedy_id]
        if req.done:
            done.append(req.remedy_id)
        doc["done"] = done
        doc["updated_at"] = datetime.now(timezone.utc).isoformat()
        SutradharStore.set_doc(SANKALP_COL, doc_id, doc)
    return {"status": "success", "done_today": done, "total": len(rec.get("remedies") or [])}


@router.get("/admin/desk")
async def admin_desk(authorization: Optional[str] = Header(None)):
    """How many clients each consultant keeps on the desk."""
    require_admin(authorization)
    per: Dict[str, Dict[str, Any]] = {}
    for r in SutradharStore.query_all(DESK_COL):
        c = r.get("consultant_phone", "")
        p = per.setdefault(c, {"consultant_phone": c, "name": r.get("consultant_name", ""), "clients": 0, "with_remedies": 0, "last_at": ""})
        p["clients"] += 1
        p["with_remedies"] += 1 if r.get("remedies") else 0
        p["last_at"] = max(p["last_at"], r.get("updated_at") or "")
    return {"consultants": sorted(per.values(), key=lambda x: x["last_at"], reverse=True)}


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


# =============================================================================
# SUTRADHAR SCRIPT REMINDERS: a daily phone notification with the day's calling script
# (Web Push with the site's VAPID keys; the notification opens sutradhar.html on that script)
# =============================================================================
SUTRA_SCRIPTS = [
    ("upgrade", "आज की स्क्रिप्ट: सॉफ्टवेयर अपग्रेड (मास्टर पिच)", "किसी एक ज्योतिषी को यह पिच सुनाइए और उसका नंबर लीड में जोड़िए।"),
    ("vivah", "आज की स्क्रिप्ट: 10 विवाह महादोष स्कैनर", "विवाह की बात चल रहे किसी परिवार को यह स्क्रिप्ट सुनाइए।"),
    ("patrika", "आज की स्क्रिप्ट: 50+ पेज की पत्रिका", "किसी को उसकी पूरी पत्रिका के बारे में बताइए — नंबर लीड में डालना न भूलें।"),
    ("faq", "आज: ग्राहकों के आम सवाल", "सवालों के जवाब एक बार पढ़ लीजिए, बात करना आसान हो जाएगा।"),
]
SUTRA_REMINDER_HOUR = int(os.environ.get("SUTRADHAR_REMINDER_HOUR", "10") or 10)


class SutraPushRequest(BaseModel):
    subscription: Optional[Dict[str, Any]] = None
    enabled: bool = True


def _vapid(name: str) -> str:
    return (os.environ.get(name) or "").strip()


def script_of_the_day(day: Optional[str] = None) -> Dict[str, str]:
    d = datetime.fromisoformat(day or today_ist()).date()
    sid, title, body = SUTRA_SCRIPTS[d.toordinal() % len(SUTRA_SCRIPTS)]
    return {"script": sid, "title": title, "body": body, "url": f"/sutradhar.html?tab=scripts&script={sid}"}


@router.get("/push/config")
async def sutra_push_config():
    return {"vapid_public_key": _vapid("VAPID_PUBLIC_KEY"), "reminder_hour": SUTRA_REMINDER_HOUR,
            "today": script_of_the_day()}


@router.post("/push/subscribe")
async def sutra_push_subscribe(req: SutraPushRequest, authorization: Optional[str] = Header(None)):
    """The signed-in Sutradhar turns the daily script notification on (with a browser subscription) or off."""
    me = require_sutradhar(authorization)
    doc = dict(me)
    if req.enabled:
        sub = req.subscription or {}
        if not str(sub.get("endpoint", "")).startswith("https://") or not (sub.get("keys") or {}).get("p256dh"):
            raise HTTPException(status_code=400, detail="सूचना चालू नहीं हो सकी। ब्राउज़र ने अनुमति नहीं दी।")
        doc["push"] = {"endpoint": sub["endpoint"], "keys": {"p256dh": sub["keys"]["p256dh"], "auth": sub["keys"].get("auth", "")}}
        doc["push_on"] = True
        doc["push_since"] = datetime.now(timezone.utc).isoformat()
    else:
        doc["push_on"] = False
    SutradharStore.set_doc("sutradhars", doc.get("id") or doc.get("sutradhar_id"), doc)
    return {"status": "success", "push_on": doc["push_on"], "today": script_of_the_day()}


def send_sutra_push(sub: Dict[str, Any], msg: Dict[str, str]) -> str:
    try:
        from pywebpush import webpush, WebPushException
    except Exception:
        return "no_pywebpush"
    try:
        webpush(subscription_info=sub, data=json.dumps({"title": msg["title"], "body": msg["body"],
                                                        "data": {"url": msg["url"], "type": "SUTRADHAR_SCRIPT"}}, ensure_ascii=False),
                vapid_private_key=_vapid("VAPID_PRIVATE_KEY"),
                vapid_claims={"sub": _vapid("VAPID_SUBJECT") or "mailto:support@shriramjiastro.in"},
                ttl=8 * 3600)
        return "sent"
    except WebPushException as e:
        code = getattr(getattr(e, "response", None), "status_code", None)
        return "gone" if code in (404, 410) else "error"
    except Exception:
        return "error"


def run_sutra_reminders(day: Optional[str] = None) -> Dict[str, int]:
    """One reminder per active Sutradhar per day."""
    day = day or today_ist()
    msg = script_of_the_day(day)
    out = {"sent": 0, "gone": 0, "error": 0, "skipped": 0}
    if not (_vapid("VAPID_PUBLIC_KEY") and _vapid("VAPID_PRIVATE_KEY")):
        out["skipped"] = -1
        return out
    for s in SutradharStore.query_all("sutradhars"):
        if not s.get("push_on") or not s.get("push") or s.get("status") == "paused" or s.get("reminded_on") == day:
            out["skipped"] += 1
            continue
        r = send_sutra_push(s["push"], msg)
        doc = dict(s)
        if r == "sent":
            doc["reminded_on"] = day
            out["sent"] += 1
        elif r == "gone":
            doc["push_on"] = False          # the phone withdrew permission
            out["gone"] += 1
        else:
            out["error"] += 1
            continue
        SutradharStore.set_doc("sutradhars", doc.get("id") or doc.get("sutradhar_id"), doc)
    logger.info(f"[Sutradhar] script reminders {day}: {out}")
    return out


def _sutra_reminder_loop():
    time.sleep(40)
    ran_on = None
    while True:
        try:
            now = datetime.now(IST)
            day = now.strftime("%Y-%m-%d")
            if ran_on != day and SUTRA_REMINDER_HOUR <= now.hour < 21:
                res = run_sutra_reminders(day)
                if res.get("skipped") != -1:
                    ran_on = day
        except Exception as e:
            logger.warning(f"[Sutradhar] reminder loop: {e}")
        time.sleep(300)


if os.environ.get("RENDER") or os.environ.get("SUTRADHAR_REMINDERS") == "1":
    threading.Thread(target=_sutra_reminder_loop, daemon=True, name="sutradhar-reminders").start()


# =============================================================================
# COURSE BATCHES: public seat count, interest list, admin view
# =============================================================================
class CourseInterestRequest(BaseModel):
    name: str
    phone: str
    batch_id: Optional[str] = None


@router.get("/course/batches")
async def course_batches():
    counts = course_seat_counts()
    batches = []
    for bid, b in COURSE_BATCHES.items():
        taken = counts[bid]["paid"] + counts[bid]["held"]
        batches.append({"id": bid, "name": b["name"], "name_en": b["name_en"], "seats": b["seats"],
                        "taken": taken, "left": max(0, b["seats"] - taken), "full": taken >= b["seats"]})
    return {"start_date": COURSE_START_DATE, "registration_opens": course_registration_opens(),
            "registration_open": course_registration_open(), "price": SERVICE_CATALOG[COURSE_SERVICE_ID]["price"],
            "hold_minutes": COURSE_HOLD_MINUTES, "batches": batches}


@router.post("/course/interest")
async def course_interest(req: CourseInterestRequest):
    phone = normalize_phone(req.phone)
    name = (req.name or "").strip()[:80]
    if len(phone) != 10 or len(name) < 2:
        raise HTTPException(status_code=400, detail="कृपया नाम और 10 अंकों का मोबाइल नंबर दें।")
    batch = req.batch_id if req.batch_id in COURSE_BATCHES else ""
    now = datetime.now(timezone.utc).isoformat()
    doc = SutradharStore.get_doc("course_interest", phone) or {"phone": phone, "created_at": now}
    doc.update({"name": name, "batch_id": batch, "updated_at": now})
    SutradharStore.set_doc("course_interest", phone, doc)
    return {"status": "success", "message": "धन्यवाद! पंजीकरण खुलते ही (26 दिसंबर) हम आपको WhatsApp पर बताएँगे।"}


@router.get("/admin/course")
async def admin_course(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    now = datetime.now(timezone.utc)
    seats = SutradharStore.query_all("course_seats")
    batches = []
    for bid, b in COURSE_BATCHES.items():
        mine = [x for x in seats if x.get("batch_id") == bid]
        paid = sorted([x for x in mine if x.get("status") == "paid"], key=lambda x: x.get("paid_at") or "")
        held = [x for x in mine if x.get("status") == "held" and _seat_active(x, now)]
        refunds = [x for x in mine if (x.get("status") or "").startswith("refund")]
        batches.append({"id": bid, "name": b["name"], "seats": b["seats"], "paid": paid, "held": held,
                        "refunds": refunds, "left": max(0, b["seats"] - len(paid) - len(held))})
    interest = sorted(SutradharStore.query_all("course_interest"), key=lambda x: x.get("updated_at") or "", reverse=True)
    return {"start_date": COURSE_START_DATE, "registration_opens": course_registration_opens(),
            "registration_open": course_registration_open(), "batches": batches, "interest": interest}


# =============================================================================
# ADMIN: SUTRADHAR LIST — who joined, who is active, what they earned
# =============================================================================
SUTRADHAR_INACTIVE_DAYS = int(os.environ.get("SUTRADHAR_INACTIVE_DAYS", "30") or 30)


class SutradharAdminRequest(BaseModel):
    sutradhar_id: str
    status: Optional[str] = None          # "active" | "paused"
    upi_verified: Optional[bool] = None   # after the Rs 1 name check


@router.get("/admin/sutradhars")
async def admin_list_sutradhars(authorization: Optional[str] = Header(None)):
    """Every registered Sutradhar with leads, sales, दक्षिणा and last login; plus numbers that did the OTP but did not finish."""
    require_admin(authorization)
    now = datetime.now(timezone.utc)
    leads = SutradharStore.query_all("leads")
    comms = SutradharStore.query_all("commissions")
    seen, out = set(), []
    for s in SutradharStore.query_all("sutradhars"):
        sid = s.get("sutradhar_id") or s.get("id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        ids = get_sutradhar_alias_ids(sid) | {sid, s.get("id") or sid}
        my_leads = [l for l in leads if l.get("sutradhar_id") in ids]
        active = 0
        for l in my_leads:
            try:
                exp = datetime.fromisoformat(l.get("expires_at"))
                if exp.tzinfo is None:
                    exp = exp.replace(tzinfo=timezone.utc)
                if exp > now:
                    active += 1
            except Exception:
                pass
        my_comms = [c for c in comms if c.get("sutradhar_id") in ids and c.get("status") not in ("cancelled", "rejected")]
        earned = sum(int(c.get("amount") or 0) for c in my_comms)
        paid = sum(int(c.get("amount") or 0) for c in my_comms if c.get("status") == "paid")
        last_sale = max((c.get("created_at") or "" for c in my_comms), default="")
        last_lead = max((l.get("created_at") or "" for l in my_leads), default="")
        # inactive: no lead and no sale for SUTRADHAR_INACTIVE_DAYS (counted from joining if never active)
        last_activity = max(last_sale, last_lead, s.get("created_at") or "")
        days_idle = None
        try:
            la = datetime.fromisoformat(last_activity)
            if la.tzinfo is None:
                la = la.replace(tzinfo=timezone.utc)
            days_idle = (now - la).days
        except Exception:
            pass
        inactive = s.get("status") != "paused" and days_idle is not None and days_idle >= SUTRADHAR_INACTIVE_DAYS
        if s.get("status") == "paused":
            state = "paused"
        elif my_comms:
            state = "earning"
        elif my_leads:
            state = "leads_only"
        else:
            state = "joined"
        out.append({
            "sutradhar_id": sid, "name": s.get("name", ""), "phone": s.get("phone", ""), "email": s.get("email", ""),
            "status": s.get("status", "active"), "state": state,
            "upi_id": s.get("upi_id", ""), "upi_verified": bool(s.get("upi_verified")),
            "joined_at": s.get("created_at", ""), "last_login_at": s.get("last_login_at", ""),
            "login_count": int(s.get("login_count") or 0),
            "leads_total": len(my_leads), "leads_active": active, "last_lead_at": last_lead,
            "sales": len(my_comms), "earned": earned, "paid": paid, "pending": earned - paid, "last_sale_at": last_sale,
            "last_activity_at": last_activity, "days_idle": days_idle, "inactive": inactive,
            "group": "paused" if state == "paused" else ("inactive" if inactive else "active"),
        })
    out.sort(key=lambda x: x.get("joined_at") or "", reverse=True)
    phones = {x["phone"] for x in out}
    unfinished = [d for d in SutradharStore.query_all("sutradhar_signups") if d.get("phone") and d["phone"] not in phones]
    unfinished.sort(key=lambda d: d.get("last_at") or "", reverse=True)
    return {
        "count": len(out),
        "active_count": sum(1 for x in out if x["group"] == "active"),
        "earning_count": sum(1 for x in out if x["state"] == "earning"),
        "inactive_count": sum(1 for x in out if x["group"] == "inactive"),
        "paused_count": sum(1 for x in out if x["group"] == "paused"),
        "inactive_days": SUTRADHAR_INACTIVE_DAYS,
        "sutradhars": out,
        "unfinished": unfinished[:300],
    }


@router.post("/admin/sutradhars")
async def admin_update_sutradhar(req: SutradharAdminRequest, authorization: Optional[str] = Header(None)):
    """Pause / re-activate a Sutradhar, or mark the UPI as checked."""
    admin = require_admin(authorization)
    target = next((s for s in SutradharStore.query_all("sutradhars")
                   if req.sutradhar_id in (s.get("sutradhar_id"), s.get("id"))), None)
    if not target:
        raise HTTPException(status_code=404, detail="सूत्रधार नहीं मिला।")
    doc = dict(target)
    if req.status is not None:
        if req.status not in ("active", "paused"):
            raise HTTPException(status_code=400, detail="status active या paused होना चाहिए।")
        doc["status"] = req.status
    if req.upi_verified is not None:
        doc["upi_verified"] = bool(req.upi_verified)
    SutradharStore.set_doc("sutradhars", doc.get("id") or doc.get("sutradhar_id"), doc)
    log_audit_event("ADMIN_SUTRADHAR_UPDATE", admin, {"sutradhar_id": req.sutradhar_id, "status": req.status, "upi_verified": req.upi_verified})
    return {"status": "success", "sutradhar": doc}


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


# ── SaaS call list: astrologers the owner calls about the software (Excel upload in admin) ──
# One document per phone. Status is what the last call ended in; re-importing the same Excel
# never resets a status that was already set.
SAAS_LEADS_COL = "saas_leads"
SAAS_LEAD_STATUSES = ("new", "no_answer", "callback", "interested", "not_interested", "demo_sent", "bought")
SAAS_LEADS_MAX_IMPORT = 5000


class SaasLeadRow(BaseModel):
    phone: str
    name: Optional[str] = ""
    city: Optional[str] = ""
    note: Optional[str] = ""


class SaasLeadImportRequest(BaseModel):
    rows: List[SaasLeadRow]
    source: Optional[str] = ""


class SaasLeadUpdateRequest(BaseModel):
    phone: str
    status: Optional[str] = None
    note: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    called: bool = False          # a call was made just now
    demo_sent: bool = False       # the demo link was sent just now (WhatsApp / copy)
    delete: bool = False


@router.get("/admin/saas-leads")
async def admin_list_saas_leads(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    active_subs = {s.get("phone") for s in SutradharStore.query_all("saas_subscribers") if saas_is_active(s)}
    leads = []
    for l in SutradharStore.query_all(SAAS_LEADS_COL):
        if l.get("deleted") or not l.get("phone"):
            continue
        l["is_subscriber"] = l["phone"] in active_subs
        leads.append(l)
    leads.sort(key=lambda l: (l.get("row_no") or 0))
    counts = {s: 0 for s in SAAS_LEAD_STATUSES}
    for l in leads:
        counts[l.get("status") if l.get("status") in counts else "new"] += 1
    return {"status": "success", "count": len(leads), "counts": counts, "leads": leads}


@router.post("/admin/saas-leads/import")
async def admin_import_saas_leads(req: SaasLeadImportRequest, authorization: Optional[str] = Header(None)):
    admin = require_admin(authorization)
    if len(req.rows) > SAAS_LEADS_MAX_IMPORT:
        raise HTTPException(status_code=400, detail=f"एक बार में अधिकतम {SAAS_LEADS_MAX_IMPORT} नाम डालें।")
    now = datetime.now(timezone.utc).isoformat()
    added = updated = skipped = 0
    changed: Dict[str, Dict[str, Any]] = {}
    with _store_lock:
        local = SutradharStore._read_json(SAAS_LEADS_COL)
        existing = {d.get("phone") or k: d for k, d in local.items()}
        if _firestore_db:
            for d in SutradharStore.query_all(SAAS_LEADS_COL):
                existing[d.get("phone") or d.get("id")] = d
        next_no = max([d.get("row_no") or 0 for d in existing.values()] + [0]) + 1
        for row in req.rows:
            phone = normalize_phone(row.phone)
            if len(phone) != 10:
                skipped += 1
                continue
            name, city, note = (row.name or "").strip()[:80], (row.city or "").strip()[:60], (row.note or "").strip()[:300]
            doc = changed.get(phone) or existing.get(phone)
            if doc and not doc.get("deleted"):
                doc = dict(doc)
                doc["name"] = doc.get("name") or name
                doc["city"] = doc.get("city") or city
                if note and note not in (doc.get("note") or ""):
                    doc["note"] = ((doc.get("note") or "") + (" | " if doc.get("note") else "") + note)[:600]
                if phone not in changed:
                    updated += 1
            else:
                doc = {"phone": phone, "name": name, "city": city, "note": note, "status": "new", "calls": 0,
                       "row_no": next_no, "source": (req.source or "")[:80], "created_at": now, "created_by": admin}
                next_no += 1
                added += 1
            doc["updated_at"] = now
            doc.pop("id", None)
            doc.pop("is_subscriber", None)
            changed[phone] = doc
        if changed:
            if _firestore_db:
                try:
                    items = list(changed.items())
                    for i in range(0, len(items), 400):
                        batch = _firestore_db.batch()
                        for phone, doc in items[i:i + 400]:
                            batch.set(_firestore_db.collection(SAAS_LEADS_COL).document(phone), doc)
                        batch.commit()
                except Exception as e:
                    logger.warning(f"Firestore saas_leads import error: {e}")
            local.update(changed)
            SutradharStore._write_json(SAAS_LEADS_COL, local)
    log_audit_event("ADMIN_SAAS_LEADS_IMPORT", admin, {"added": added, "updated": updated, "skipped": skipped})
    return {"status": "success", "added": added, "updated": updated, "skipped": skipped}


@router.post("/admin/saas-leads/update")
async def admin_update_saas_lead(req: SaasLeadUpdateRequest, authorization: Optional[str] = Header(None)):
    admin = require_admin(authorization)
    phone = normalize_phone(req.phone)
    if req.status and req.status not in SAAS_LEAD_STATUSES:
        raise HTTPException(status_code=400, detail="अमान्य स्थिति।")
    now = datetime.now(timezone.utc).isoformat()
    with _store_lock:
        doc = SutradharStore.get_doc(SAAS_LEADS_COL, phone)
        if not doc:
            raise HTTPException(status_code=404, detail="यह नंबर सूची में नहीं है।")
        doc.pop("id", None)
        doc.pop("is_subscriber", None)
        if req.delete:
            doc["deleted"] = True
        if req.status:
            doc["status"] = req.status
            doc["status_at"] = now
        if req.note is not None:
            doc["note"] = req.note.strip()[:600]
        if req.name is not None:
            doc["name"] = req.name.strip()[:80]
        if req.city is not None:
            doc["city"] = req.city.strip()[:60]
        if req.called:
            doc["calls"] = int(doc.get("calls") or 0) + 1
            doc["called_at"] = now
        if req.demo_sent:
            doc["demo_sent_at"] = now
            doc["demo_sends"] = int(doc.get("demo_sends") or 0) + 1
        doc["updated_by"] = admin
        SutradharStore.set_doc(SAAS_LEADS_COL, phone, doc)
    return {"status": "success", "lead": doc}


# ── Who joined: last login of each Sutradhar, and numbers that did the OTP but never finished ──
def note_sutradhar_login(sutradhar: Dict[str, Any]):
    """Keeps last_login_at (written at most once an hour)."""
    try:
        now = datetime.now(timezone.utc)
        last = sutradhar.get("last_login_at") or ""
        if last and (now - datetime.fromisoformat(last)).total_seconds() < 3600:
            return
        doc = dict(sutradhar)
        doc["last_login_at"] = now.isoformat()
        doc["login_count"] = int(doc.get("login_count") or 0) + 1
        SutradharStore.set_doc("sutradhars", doc.get("id") or doc.get("sutradhar_id"), doc)
    except Exception as e:
        logger.warning(f"[Sutradhar] last-login note failed: {e}")


def note_signup_attempt(phone: Optional[str]):
    """A number verified by OTP on sutradhar.html that is not a Sutradhar yet (slides/test not finished)."""
    if not phone:
        return
    try:
        now = datetime.now(timezone.utc).isoformat()
        doc = SutradharStore.get_doc("sutradhar_signups", phone) or {"phone": phone, "first_at": now, "count": 0}
        doc["last_at"] = now
        doc["count"] = int(doc.get("count") or 0) + 1
        SutradharStore.set_doc("sutradhar_signups", phone, doc)
    except Exception as e:
        logger.warning(f"[Sutradhar] signup note failed: {e}")


# ── Sutradhar activity: what each Sutradhar did on the portal, one document per Sutradhar per day ──
ACTIVITY_COL = "sutradhar_activity"
ACTIVITY_KINDS = {"open", "script_open", "script_copy", "tab", "lead_form", "offer_share", "offer_copy", "task", "tutorial", "nudge_open"}
ACTIVITY_MAX_EVENTS = 120          # per Sutradhar per day


def note_sutra_activity(sutradhar_id: str, kind: str, detail: str = ""):
    """Counts the action for today (IST) and keeps a short list of the day's events."""
    if not sutradhar_id or kind not in ACTIVITY_KINDS:
        return
    try:
        day = today_ist()
        doc_id = f"{sutradhar_id}_{day}"
        now = datetime.now(timezone.utc).isoformat()
        detail = re.sub(r"[^\w\-]", "", str(detail or ""))[:30]
        with _store_lock:
            doc = SutradharStore.get_doc(ACTIVITY_COL, doc_id) or {"sutradhar_id": sutradhar_id, "day": day, "counts": {}, "events": []}
            key = f"{kind}:{detail}" if detail else kind
            counts = dict(doc.get("counts") or {})
            counts[key] = int(counts.get(key) or 0) + 1
            doc["counts"] = counts
            events = list(doc.get("events") or [])
            if len(events) < ACTIVITY_MAX_EVENTS:
                events.append({"t": now, "k": kind, "d": detail})
            doc["events"] = events
            doc["first_at"] = doc.get("first_at") or now
            doc["last_at"] = now
            SutradharStore.set_doc(ACTIVITY_COL, doc_id, doc)
    except Exception as e:
        logger.warning(f"[Sutradhar] activity note failed: {e}")


class SutraActivityRequest(BaseModel):
    kind: str
    detail: Optional[str] = ""


@router.post("/activity")
async def sutra_activity(req: SutraActivityRequest, authorization: Optional[str] = Header(None)):
    """The portal reports what the signed-in Sutradhar did (opened or copied a script, opened a tab)."""
    me = require_sutradhar(authorization)
    if req.kind not in ACTIVITY_KINDS - {"open"}:
        raise HTTPException(status_code=400, detail="unknown activity")
    note_sutra_activity(me.get("sutradhar_id") or me.get("id"), req.kind, req.detail or "")
    return {"status": "ok"}


SCRIPT_NAMES = {"upgrade": "अपग्रेड स्क्रिप्ट", "vivah": "विवाह मिलान स्क्रिप्ट", "patrika": "पत्रिका स्क्रिप्ट", "faq": "सवाल-जवाब"}
TAB_NAMES = {"home": "होम", "start": "पहली कमाई", "articles": "सीखें", "scripts": "स्क्रिप्ट", "incentive": "इंसेंटिव", "payout": "पेआउट", "profile": "प्रोफ़ाइल"}


def _activity_days(ids: set) -> List[Dict[str, Any]]:
    return [d for d in SutradharStore.query_all(ACTIVITY_COL) if d.get("sutradhar_id") in ids]


def _aware(iso: str) -> Optional[datetime]:
    try:
        dt = datetime.fromisoformat(iso)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


@router.get("/admin/sutradhar-activity")
async def admin_sutradhar_activity(sutradhar_id: str = Query(...), days: int = Query(90, ge=1, le=400),
                                   authorization: Optional[str] = Header(None)):
    """Everything one Sutradhar has done: joining, portal visits, scripts, leads (and what became of them), sales, payouts."""
    require_admin(authorization)
    s = next((x for x in SutradharStore.query_all("sutradhars")
              if sutradhar_id in (x.get("sutradhar_id"), x.get("id"))), None)
    if not s:
        raise HTTPException(status_code=404, detail="सूत्रधार नहीं मिला।")
    sid = s.get("sutradhar_id") or s.get("id")
    ids = get_sutradhar_alias_ids(sid) | {sid, s.get("id") or sid}
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    since_day = since.astimezone(IST).date().isoformat()
    d7 = now - timedelta(days=7)
    d30 = now - timedelta(days=30)

    leads = [l for l in SutradharStore.query_all("leads") if l.get("sutradhar_id") in ids]
    comms = [c for c in SutradharStore.query_all("commissions") if c.get("sutradhar_id") in ids]
    by_lead = {c.get("lead_id"): c for c in comms if c.get("lead_id")}
    timeline: List[Dict[str, Any]] = []

    if s.get("created_at"):
        timeline.append({"at": s["created_at"], "type": "joined", "text": "पोर्टल पर पंजीकरण पूरा किया (परीक्षण पास)"})
    if s.get("push_since"):
        timeline.append({"at": s["push_since"], "type": "push",
                         "text": "रोज़ की स्क्रिप्ट सूचना चालू की" + ("" if s.get("push_on") else " (अब बंद है)")})

    lead_rows = []
    for l in sorted(leads, key=lambda x: x.get("created_at") or "", reverse=True):
        c = by_lead.get(l.get("id"))
        exp = _aware(l.get("expires_at") or "")
        if c:
            outcome = "sale"
        elif exp and exp > now:
            outcome = "active"
        else:
            outcome = "expired"
        lead_rows.append({"name": l.get("customer_name", ""), "phone": l.get("customer_phone", ""),
                          "created_at": l.get("created_at", ""), "expires_at": l.get("expires_at", ""),
                          "outcome": outcome, "product": (c or {}).get("product_name", ""), "amount": (c or {}).get("amount", 0)})
        ca = _aware(l.get("created_at") or "")
        if ca and ca >= since:
            timeline.append({"at": l["created_at"], "type": "lead",
                             "text": f"लीड डाली: {l.get('customer_name') or 'जातक'} ({l.get('customer_phone', '')})"})

    for c in comms:
        ca = _aware(c.get("created_at") or "")
        if ca and ca >= since:
            timeline.append({"at": c["created_at"], "type": "sale",
                             "text": f"बिक्री: {c.get('product_name') or c.get('product')} — ग्राहक {c.get('customer_phone', '')}, "
                                     f"भुगतान ₹{int(c.get('order_amount') or 0):,}, दक्षिणा ₹{int(c.get('amount') or 0):,}"
                                     + (" (रद्द)" if c.get("status") in ("cancelled", "rejected") else "")})
        if c.get("status") == "paid" and c.get("paid_at"):
            pa = _aware(c["paid_at"])
            if pa and pa >= since:
                timeline.append({"at": c["paid_at"], "type": "payout",
                                 "text": f"दक्षिणा ₹{int(c.get('amount') or 0):,} चुकाई" + (f" (UTR {c['utr']})" if c.get("utr") else "")})

    act_days = sorted(_activity_days(ids), key=lambda d: d.get("day") or "", reverse=True)
    day_rows = []
    totals = {"portal_days_30": 0, "opens_30": 0, "script_opens_30": 0, "script_copies_30": 0}
    d30_day = d30.astimezone(IST).date().isoformat()
    for a in act_days:
        counts = a.get("counts") or {}
        opens = int(counts.get("open") or 0)
        sopen = {k.split(":", 1)[1]: v for k, v in counts.items() if k.startswith("script_open:")}
        scopy = {k.split(":", 1)[1]: v for k, v in counts.items() if k.startswith("script_copy:")}
        tabs = {k.split(":", 1)[1]: v for k, v in counts.items() if k.startswith("tab:")}
        if (a.get("day") or "") >= d30_day:
            totals["portal_days_30"] += 1
            totals["opens_30"] += opens
            totals["script_opens_30"] += sum(sopen.values())
            totals["script_copies_30"] += sum(scopy.values())
        if (a.get("day") or "") < since_day:
            continue
        parts = []
        if opens:
            parts.append(f"पोर्टल {opens} बार खोला")
        if sopen:
            parts.append("स्क्रिप्ट पढ़ी: " + ", ".join(f"{SCRIPT_NAMES.get(k, k)} ×{v}" for k, v in sopen.items()))
        if scopy:
            parts.append("स्क्रिप्ट कॉपी की: " + ", ".join(f"{SCRIPT_NAMES.get(k, k)} ×{v}" for k, v in scopy.items()))
        if tabs:
            parts.append("खोले: " + ", ".join(f"{TAB_NAMES.get(k, k)} ×{v}" for k, v in tabs.items()))
        if int(counts.get("lead_form") or 0):
            parts.append(f"लीड फ़ॉर्म खोला ×{counts['lead_form']}")
        if int(counts.get("nudge_open") or 0):
            parts.append(f"आपके संदेश/सूचना से पोर्टल खोला ×{counts['nudge_open']}")
        oshare = {k.split(":", 1)[1]: v for k, v in counts.items() if k.startswith("offer_share:")}
        ocopy = {k.split(":", 1)[1]: v for k, v in counts.items() if k.startswith("offer_copy:")}
        if oshare:
            parts.append("रिपोर्ट लिंक WhatsApp पर भेजे: " + ", ".join(f"{k} ×{v}" for k, v in oshare.items()))
        if ocopy:
            parts.append("रिपोर्ट लिंक कॉपी किए: " + ", ".join(f"{k} ×{v}" for k, v in ocopy.items()))
        tasks = sorted({k.split(":", 1)[1] for k in counts if k.startswith("task:")},
                       key=lambda x: [int(n) for n in re.findall(r"\d+", x)] or [0])
        vids = sorted({k.split(":", 1)[1] for k in counts if k.startswith("tutorial:")})
        if vids:   # lesson ids l1..l8 of the video tutorials
            parts.append("वीडियो पाठ पूरे: " + ", ".join(v.replace("l", "पाठ ") for v in vids))
        if tasks:   # ids like d3-1 = day 3, task 1 of the 21-day first-income path
            parts.append("21-दिन के काम पूरे: " + ", ".join(t.replace("d", "दिन ").replace("-", " काम ") for t in tasks))
        day_rows.append({"day": a.get("day"), "first_at": a.get("first_at", ""), "last_at": a.get("last_at", ""),
                         "opens": opens, "script_opens": sum(sopen.values()), "script_copies": sum(scopy.values()),
                         "summary": " · ".join(parts)})
        if parts:
            timeline.append({"at": a.get("last_at") or a.get("first_at") or "", "type": "portal", "day": a.get("day"),
                             "text": " · ".join(parts)})

    timeline.sort(key=lambda x: x.get("at") or "", reverse=True)
    live = [c for c in comms if c.get("status") not in ("cancelled", "rejected")]
    sold_leads = sum(1 for r in lead_rows if r["outcome"] == "sale")
    summary = {
        "leads_total": len(leads),
        "leads_7": sum(1 for l in leads if (_aware(l.get("created_at") or "") or since) >= d7),
        "leads_30": sum(1 for l in leads if (_aware(l.get("created_at") or "") or since) >= d30),
        "leads_active": sum(1 for r in lead_rows if r["outcome"] == "active"),
        "leads_sold": sold_leads,
        "conversion_pct": round(100 * sold_leads / len(leads)) if leads else 0,
        "sales": len(live),
        "sales_30": sum(1 for c in live if (_aware(c.get("created_at") or "") or since) >= d30),
        "earned": sum(int(c.get("amount") or 0) for c in live),
        "paid": sum(int(c.get("amount") or 0) for c in live if c.get("status") == "paid"),
        "login_count": int(s.get("login_count") or 0),
        "last_login_at": s.get("last_login_at", ""),
        "push_on": bool(s.get("push_on")),
        "reminded_on": s.get("reminded_on", ""),
        **totals,
    }
    summary["pending"] = summary["earned"] - summary["paid"]
    return {
        "sutradhar": {"sutradhar_id": sid, "name": s.get("name", ""), "phone": s.get("phone", ""), "email": s.get("email", ""),
                      "joined_at": s.get("created_at", ""), "status": s.get("status", "active"), "upi_id": s.get("upi_id", "")},
        "days": days,
        "summary": summary,
        "leads": lead_rows[:300],
        "portal_days": day_rows[:120],
        "timeline": timeline[:400],
    }


# =============================================================================
# ADMIN: DAILY PUSH BOARD — who worked today, who went quiet, and a ready message for each
# =============================================================================
# one line per day of the 21-day first-income path (mirrors START_PLAN tips in sutradhar.html)
START_DAY_TIPS = [
    "UPI जोड़िए, 20 लोगों की सूची बनाइए और 10 को कालसर्प या मांगलिक रिपोर्ट का link भेजिए।",
    "कल जिन्होंने link देखा, उन्हें फ़ोन कीजिए और रुचि वालों का नंबर लीड में डालिए।",
    "आज पहली बिक्री का दिन है: जिसने हाँ कहा, उसे फ़ोन करके भुगतान करवाइए।",
    "शादी वाले घरों को गुण मिलान का link भेजिए, एक बिक्री में ₹615 दक्षिणा।",
    "पिछले 4 दिन के सारे \"बाद में देखेंगे\" वालों को फ़ोन कीजिए।",
    "किसी पंडित को हमारा सॉफ़्टवेयर बताइए, एक बार में ₹2,852 दक्षिणा।",
    "पहला हफ़्ता पूरा: कमाई देखिए, और जिन लीड का ताला ख़त्म हो रहा है उन्हें आज फ़ोन कीजिए।",
    "पड़ोस, दुकान या ऑफ़िस के 5 नए लोगों से बात कीजिए और अपनी पत्रिका दिखाइए।",
    "किसी ज्योतिषी को सॉफ़्टवेयर के बारे में बताइए, एक बार में ₹2,852।",
    "जिनके घर शादी तय हो रही है, उन्हें विवाह मुहूर्त का link भेजिए (दक्षिणा ₹1,174)।",
    "पिछले हफ़्ते के 2 लोगों को फ़ॉलो-अप कॉल कीजिए; फ़ॉलो-अप से ही बिक्री होती है।",
    "नए घर वालों को वास्तु मुहूर्त, बच्चे वालों को मुंडन मुहूर्त का link भेजिए।",
    "\"सवाल-जवाब\" स्क्रिप्ट दोबारा पढ़िए और 5 नए लोगों को link भेजिए।",
    "दो हफ़्ते पूरे: ₹4,000 से कम हो तो आज 10 लोगों को link भेजिए और 3 को फ़ोन कीजिए।",
    "10 लोगों को अलग-अलग रिपोर्ट link भेजिए, जिसको जो सूट करे।",
    "जिन्होंने रिपोर्ट ली, उनसे 2-2 ऐसे लोगों के नाम माँगिए जिन्हें इसकी ज़रूरत हो।",
    "अपने Facebook या Telegram ग्रुप में रिपोर्ट link डालिए।",
    "जिन लीड का ताला ख़त्म हो गया, उनसे फिर बात कीजिए और फिर से लीड डालिए।",
    "पूरी कुंडली चाहने वालों को मेगा पाराशर रिपोर्ट बताइए (दक्षिणा ₹621)।",
    "आज सारे बाकी फ़ॉलो-अप पूरे कीजिए।",
    "21 दिन पूरे! कमाई देखिए और इंसेंटिव में अगले महीने का लक्ष्य बनाइए।",
]
PORTAL_URL = "https://shriramjiastro.in/sutradhar.html?n=1"   # n=1: the portal reports that a message brought them back
NUDGE_KINDS = {
    # kind: (label for the admin, needs a push today?)
    "badhai":   ("आज बिक्री हुई", False),
    "followup": ("लीड का ताला ख़त्म होने वाला", True),
    "shabash":  ("आज काम किया", False),
    "start":    ("शुरुआत बाकी: अभी कोई लीड नहीं", True),
    "gentle":   ("1-2 दिन से चुप", True),
    "wake":     ("3-6 दिन से चुप", True),
    "comeback": ("7+ दिन से चुप", True),
}
NUDGE_ORDER = ["followup", "start", "gentle", "wake", "comeback", "shabash", "badhai"]


def _ist_day(iso: str) -> str:
    dt = _aware(iso or "")
    return dt.astimezone(IST).date().isoformat() if dt else ""


def _pick(options: List[str], seed: str) -> str:
    return options[int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(options)]


def _nudge_message(kind: str, r: Dict[str, Any], day: str) -> Dict[str, str]:
    """Title + push text + WhatsApp text for one Sutradhar. Wording changes by day so it never reads like a copy."""
    name = (r.get("name") or "").strip()
    ji = f"{name} जी" if name else "जी"
    seed = f"{r['sutradhar_id']}_{day}_{kind}"
    inr = lambda n: f"₹{int(n or 0):,}"
    tip = START_DAY_TIPS[min(max(r["day_n"], 1), 21) - 1]
    month = inr(r["month_earned"])
    tab = "start" if r["day_n"] <= 21 else "home"
    if kind == "badhai":
        title = "बधाई! आज बिक्री हुई"
        body = f"आज आपकी {r['sales_today']} बिक्री से {inr(r['earned_today'])} दक्षिणा बनी। इस महीने अब तक {month}। यही रफ़्तार रखिए।"
        wa = _pick([
            f"नमस्ते {ji},\n\nबहुत-बहुत बधाई! आज आपकी {r['sales_today']} बिक्री हुई और {inr(r['earned_today'])} दक्षिणा बनी। इस महीने की कुल दक्षिणा अब {month} है।\n\nजिसने आज रिपोर्ट ली, उससे 2 ऐसे लोगों के नाम माँग लीजिए जिन्हें इसकी ज़रूरत हो। खुश ग्राहक ही अगला ग्राहक लाता है।",
            f"नमस्ते {ji},\n\nआज की बिक्री के लिए शाबाश! {inr(r['earned_today'])} दक्षिणा आपके खाते में दर्ज हो गई है, भुगतान समय पर UPI में आएगा।\n\nकल भी इसी तरह 5 लोगों से बात कीजिए। आप सही रास्ते पर हैं।",
        ], seed)
    elif kind == "followup":
        n = r["leads_expiring"]
        title = f"{n} लीड का ताला जल्दी ख़त्म होगा"
        body = f"आपकी {n} लीड का 72 घंटे का ताला 24 घंटे में ख़त्म होगा। आज ही फ़ोन करके भुगतान करवाइए।"
        wa = _pick([
            f"नमस्ते {ji},\n\nआपकी {n} लीड का 72 घंटे का ताला अगले 24 घंटे में ख़त्म हो जाएगा। आज ही उन्हें फ़ोन कीजिए और हो सके तो फ़ोन पर रहते-रहते भुगतान करवा दीजिए।\n\nलीड देखें: {PORTAL_URL}",
            f"नमस्ते {ji},\n\nएक ज़रूरी बात: आपकी {n} लीड जल्दी आपके नाम से हट जाएँगी। आज एक फ़ॉलो-अप कॉल ही बिक्री में बदल सकती है।\n\n{PORTAL_URL}",
        ], seed)
        tab = "home"
    elif kind == "shabash":
        streak = r["streak"]
        title = f"शाबाश! लगातार {streak} दिन" if streak > 1 else "शाबाश! आज आपने काम किया"
        body = f"आज का अगला कदम: {tip}" if r["day_n"] <= 21 else f"इस महीने अब तक {month}। आज 2 फ़ॉलो-अप कॉल और कर लीजिए।"
        wa = _pick([
            f"नमस्ते {ji},\n\n{'लगातार ' + str(streak) + ' दिन से आप काम कर रहे हैं, बहुत अच्छा!' if streak > 1 else 'आज आपने पोर्टल पर काम किया, बहुत अच्छा!'} इस महीने की दक्षिणा अब तक {month}।\n\n" + (f"आज के {r['day_n']}वें दिन का काम: {tip}" if r["day_n"] <= 21 else "आज 2 पुराने लोगों को फ़ॉलो-अप कॉल ज़रूर कीजिए।"),
            f"नमस्ते {ji},\n\nआपकी मेहनत दिख रही है। {('आज ' + str(r['leads_today']) + ' लीड डाली। ') if r['leads_today'] else ''}रोज़ थोड़ा-थोड़ा करने से ही महीने के अंत में बड़ी दक्षिणा बनती है।\n\n" + (f"अगला कदम: {tip}" if r["day_n"] <= 21 else f"{PORTAL_URL}"),
        ], seed)
    elif kind == "start":
        title = f"दिन {min(r['day_n'], 21)}: आज का एक काम"
        body = tip
        wa = _pick([
            f"नमस्ते {ji},\n\nसूत्रधार के रूप में आपका {r['day_n']}वाँ दिन है। आज बस यह एक काम कीजिए:\n{tip}\n\nपहली लीड डालते ही 72 घंटे तक उस ग्राहक की हर खरीद पर आपकी दक्षिणा बनेगी।\n\n{PORTAL_URL}",
            f"नमस्ते {ji},\n\nपहली बिक्री सबसे कठिन होती है, उसके बाद रास्ता खुल जाता है। आज का काम:\n{tip}\n\nकोई दिक्कत हो तो इसी नंबर पर बताइए, मैं साथ हूँ।\n\n{PORTAL_URL}",
        ], seed)
    elif kind == "gentle":
        title = "आज 10 मिनट सूत्रधार के लिए"
        body = f"आज सिर्फ़ 5 लोगों को रिपोर्ट का link भेजिए। इस महीने अब तक {month}।"
        wa = _pick([
            f"नमस्ते {ji},\n\nकल पोर्टल पर आपकी कोई गतिविधि नहीं दिखी। आज सिर्फ़ 10 मिनट निकालिए और 5 लोगों को कोई भी रिपोर्ट link WhatsApp पर भेज दीजिए।\n\n{PORTAL_URL}",
            f"नमस्ते {ji},\n\nरोज़ का थोड़ा काम ही बड़ी दक्षिणा बनाता है। आज किसी एक व्यक्ति से बात कीजिए जिसके घर शादी या नया काम हो।\n\nआज की स्क्रिप्ट पोर्टल पर है: {PORTAL_URL}",
        ], seed)
    elif kind == "wake":
        q = r["quiet_days"]
        title = f"{q} दिन हो गए, आज वापस आइए"
        body = "एक रिपोर्ट पर ₹280 दक्षिणा। आज 3 लोगों को link भेजिए।"
        wa = _pick([
            f"नमस्ते {ji},\n\n{q} दिन से पोर्टल पर आपकी कोई गतिविधि नहीं है। सब ठीक है? अगर कोई दिक्कत हो, कोई सवाल हो तो बताइए, मिलकर हल करेंगे।\n\nएक छोटी रिपोर्ट पर ₹280 दक्षिणा बनती है। आज बस 3 लोगों को link भेजिए।\n\n{PORTAL_URL}",
            f"नमस्ते {ji},\n\nआपकी याद आई। {q} दिन का ब्रेक हो गया, आज फिर शुरू करते हैं। अपने परिवार के WhatsApp ग्रुप में मांगलिक या कालसर्प रिपोर्ट का link डाल दीजिए, यही आज का काम है।\n\n{PORTAL_URL}",
        ], seed)
    else:   # comeback
        q = r["quiet_days"]
        title = "आपकी जगह अब भी आपकी है"
        body = "नई शुरुआत: आज एक रिपोर्ट link भेजिए, बाकी पोर्टल बताएगा।"
        wa = _pick([
            f"नमस्ते {ji},\n\n{q} दिन से आपसे बात नहीं हुई। आपका सूत्रधार खाता चालू है और आपकी जगह अब भी आपकी है।\n\nक्या कुछ अटका हुआ है? 2 मिनट फ़ोन पर बात कर लें? आज बस एक रिपोर्ट link किसी को भेज दीजिए, नई शुरुआत वहीं से।\n\n{PORTAL_URL}",
            f"नमस्ते {ji},\n\nइस महीने कई सूत्रधार रोज़ थोड़ा काम करके दक्षिणा कमा रहे हैं। आप भी कर सकते हैं। एक बार पोर्टल खोलिए, \"आज की स्क्रिप्ट\" पढ़िए और एक व्यक्ति से बात कीजिए।\n\nकोई सवाल हो तो इसी नंबर पर लिखिए।\n\n{PORTAL_URL}",
        ], seed)
    url = f"/sutradhar.html?tab={tab}&n=1"
    return {"title": title, "body": body, "whatsapp": wa, "url": url}


def build_daily_board(day: Optional[str] = None) -> Dict[str, Any]:
    day = day or today_ist()
    d0 = datetime.fromisoformat(day).date()
    yday = (d0 - timedelta(days=1)).isoformat()
    month = day[:7]
    now = datetime.now(timezone.utc)
    leads_all = SutradharStore.query_all("leads")
    comms_all = [c for c in SutradharStore.query_all("commissions") if c.get("status") not in ("cancelled", "rejected")]
    acts_all = SutradharStore.query_all(ACTIVITY_COL)
    rows, seen = [], set()
    for s in SutradharStore.query_all("sutradhars"):
        sid = s.get("sutradhar_id") or s.get("id")
        if not sid or sid in seen or s.get("status") == "paused":
            continue
        seen.add(sid)
        ids = get_sutradhar_alias_ids(sid) | {sid, s.get("id") or sid}
        leads = [l for l in leads_all if l.get("sutradhar_id") in ids]
        comms = [c for c in comms_all if c.get("sutradhar_id") in ids]
        acts = {a.get("day"): a for a in acts_all if a.get("sutradhar_id") in ids and a.get("day")}
        sold_leads = {c.get("lead_id") for c in comms if c.get("lead_id")}

        active_days = set(acts) | {_ist_day(l.get("created_at")) for l in leads} | {_ist_day(c.get("created_at")) for c in comms}
        active_days = {x for x in active_days if x and x <= day}
        # streak: consecutive active days ending today (or yesterday, if today has nothing yet)
        streak, cur = 0, d0 if day in active_days else d0 - timedelta(days=1)
        while cur.isoformat() in active_days:
            streak += 1
            cur -= timedelta(days=1)
        last_active = max(active_days, default="")
        joined_day = _ist_day(s.get("created_at")) or day
        since = last_active or joined_day
        quiet_days = max(0, (d0 - datetime.fromisoformat(since).date()).days)
        day_n = max(1, (d0 - datetime.fromisoformat(joined_day).date()).days + 1)

        counts = (acts.get(day) or {}).get("counts") or {}
        csum = lambda prefix: sum(int(v or 0) for k, v in counts.items() if k == prefix or k.startswith(prefix + ":"))
        leads_today = sum(1 for l in leads if _ist_day(l.get("created_at")) == day)
        sales_today = [c for c in comms if _ist_day(c.get("created_at")) == day]
        expiring = 0
        live_leads = 0
        for l in leads:
            exp = _aware(l.get("expires_at") or "")
            if exp and exp > now and l.get("id") not in sold_leads:
                live_leads += 1
                if exp - now <= timedelta(hours=24):
                    expiring += 1
        nudges = list(s.get("nudges") or [])
        r = {
            "sutradhar_id": sid, "name": s.get("name", ""), "phone": s.get("phone", ""),
            "joined_at": s.get("created_at", ""), "day_n": day_n,
            "push_on": bool(s.get("push_on") and s.get("push")),
            "opens_today": int(counts.get("open") or 0),
            "scripts_today": csum("script_open") + csum("script_copy"),
            "shares_today": csum("offer_share") + csum("offer_copy"),
            "tasks_today": csum("task"), "lessons_today": csum("tutorial"),
            "nudge_opens_today": csum("nudge_open"),
            "leads_today": leads_today, "leads_yesterday": sum(1 for l in leads if _ist_day(l.get("created_at")) == yday),
            "sales_today": len(sales_today), "earned_today": sum(int(c.get("amount") or 0) for c in sales_today),
            "month_earned": sum(int(c.get("amount") or 0) for c in comms if _ist_day(c.get("created_at")).startswith(month)),
            "month_sales": sum(1 for c in comms if _ist_day(c.get("created_at")).startswith(month)),
            "leads_live": live_leads, "leads_expiring": expiring, "leads_total": len(leads), "sales_total": len(comms),
            "active_today": day in active_days, "streak": streak, "quiet_days": quiet_days,
            "active_days_7": sum(1 for i in range(7) if (d0 - timedelta(days=i)).isoformat() in active_days),
            "last_active_day": last_active, "last_login_at": s.get("last_login_at", ""),
            "nudged_today": [n for n in nudges if n.get("day") == day],
            "last_nudge": nudges[-1] if nudges else None,
        }
        if r["sales_today"]:
            kind = "badhai"
        elif expiring:
            kind = "followup"
        elif r["active_today"]:
            kind = "shabash"
        elif not leads and day_n <= 21 and quiet_days <= 2:
            kind = "start"
        elif quiet_days <= 2:
            kind = "gentle"
        elif quiet_days <= 6:
            kind = "wake"
        else:
            kind = "comeback"
        r["kind"] = kind
        r["kind_label"] = NUDGE_KINDS[kind][0]
        r["needs_push"] = NUDGE_KINDS[kind][1]
        r["message"] = _nudge_message(kind, r, day)
        rows.append(r)
    rows.sort(key=lambda r: (NUDGE_ORDER.index(r["kind"]), -r["quiet_days"] if r["kind"] in ("wake", "comeback") else 0, r["name"]))
    summary = {
        "total": len(rows),
        "active_today": sum(1 for r in rows if r["active_today"]),
        "need_push": sum(1 for r in rows if r["needs_push"]),
        "nudged_today": sum(1 for r in rows if r["nudged_today"]),
        "push_ready": sum(1 for r in rows if r["push_on"]),
        "leads_today": sum(r["leads_today"] for r in rows),
        "sales_today": sum(r["sales_today"] for r in rows),
        "earned_today": sum(r["earned_today"] for r in rows),
        "quiet_3plus": sum(1 for r in rows if not r["active_today"] and r["quiet_days"] >= 3),
        "opened_from_nudge": sum(1 for r in rows if r["nudge_opens_today"]),
    }
    return {"day": day, "summary": summary, "kinds": {k: v[0] for k, v in NUDGE_KINDS.items()}, "rows": rows}


def _record_nudge(sutradhar_id: str, entry: Dict[str, Any]):
    with _store_lock:
        s = next((x for x in SutradharStore.query_all("sutradhars") if sutradhar_id in (x.get("sutradhar_id"), x.get("id"))), None)
        if not s:
            return
        doc = dict(s)
        doc["nudges"] = (list(doc.get("nudges") or []) + [entry])[-60:]
        if entry.get("via") == "push" and entry.get("result") == "gone":
            doc["push_on"] = False
        SutradharStore.set_doc("sutradhars", doc.get("id") or doc.get("sutradhar_id"), doc)


class NudgeRequest(BaseModel):
    sutradhar_id: Optional[str] = None     # empty with all=True: push everyone who needs it today
    via: str = "whatsapp"                  # "whatsapp" (admin sent it from wa.me) | "push"
    all: bool = False


@router.get("/admin/sutradhar-daily")
async def admin_sutradhar_daily(day: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    """Today's work of every Sutradhar, the streak, quiet days, and a ready motivation message for each."""
    require_admin(authorization)
    if day and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", day):
        raise HTTPException(status_code=400, detail="तारीख़ YYYY-MM-DD रूप में दें।")
    return build_daily_board(day)


@router.post("/admin/sutradhar-nudge")
async def admin_sutradhar_nudge(req: NudgeRequest, authorization: Optional[str] = Header(None)):
    """Notes a WhatsApp nudge, or sends the day's message as a phone notification (one person, or everyone who needs a push)."""
    admin = require_admin(authorization)
    if req.via not in ("whatsapp", "push"):
        raise HTTPException(status_code=400, detail="via whatsapp या push होना चाहिए।")
    day = today_ist()
    board = build_daily_board(day)
    now_iso = datetime.now(timezone.utc).isoformat()
    if req.all:
        if req.via != "push":
            raise HTTPException(status_code=400, detail="सबको एक साथ केवल सूचना भेजी जा सकती है।")
        targets = [r for r in board["rows"] if r["needs_push"] and r["push_on"]
                   and not any(n.get("via") == "push" for n in r["nudged_today"])]
    else:
        targets = [r for r in board["rows"] if r["sutradhar_id"] == req.sutradhar_id]
        if not targets:
            raise HTTPException(status_code=404, detail="सूत्रधार नहीं मिला (या खाता रुका हुआ है)।")
    if req.via == "push" and not (_vapid("VAPID_PUBLIC_KEY") and _vapid("VAPID_PRIVATE_KEY")):
        raise HTTPException(status_code=503, detail="सर्वर पर सूचना की चाबी (VAPID) नहीं लगी है।")
    out = {"sent": 0, "no_push": 0, "gone": 0, "error": 0, "noted": 0}
    subs = {(x.get("sutradhar_id") or x.get("id")): x for x in SutradharStore.query_all("sutradhars")}
    for r in targets:
        entry = {"day": day, "at": now_iso, "via": req.via, "kind": r["kind"], "by": admin}
        if req.via == "whatsapp":
            entry["result"] = "noted"
            out["noted"] += 1
        else:
            s = subs.get(r["sutradhar_id"]) or {}
            if not (s.get("push_on") and s.get("push")):
                out["no_push"] += 1
                continue
            m = r["message"]
            res = send_sutra_push(s["push"], {"title": m["title"], "body": m["body"], "url": m["url"]})
            entry["result"] = res
            out["sent" if res == "sent" else ("gone" if res == "gone" else "error")] += 1
        _record_nudge(r["sutradhar_id"], entry)
    log_audit_event("ADMIN_SUTRADHAR_NUDGE", admin, {"via": req.via, "all": req.all, "sutradhar_id": req.sutradhar_id, **out})
    return {"status": "success", **out}

# -----------------------------------------------------------------------------
# ENDPOINT 8: SUTRADHAR LOGIN AND DASHBOARD SUMMARY (signed-in Sutradhar only)
# -----------------------------------------------------------------------------
@router.get("/login")
async def login_sutradhar(phone: Optional[str] = Query(None, description="Ignored; the phone comes from the OTP token"),
                          authorization: Optional[str] = Header(None)):
    """Returns the signed-in Sutradhar's profile, 404 if the OTP-verified number is not registered."""
    try:
        sutradhar = require_sutradhar(authorization)
    except HTTPException as e:
        if e.status_code == 404:
            note_signup_attempt(token_phone(verify_firebase_token(authorization)))
        raise
    note_sutradhar_login(sutradhar)
    note_sutra_activity(sutradhar.get("sutradhar_id") or sutradhar.get("id"), "open")
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
