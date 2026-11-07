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
FALLBACK_DATA_DIR = BASE_DIR / "data" / "sutradhar_store"
FALLBACK_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Razorpay Keys (Defaults to Test Mode credentials; overrides via Environment)
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_517117775DEMO")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "sra_rzp_test_secret_7775")
RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "sra_webhook_secret_7775")
RAZORPAYX_KEY_ID = os.environ.get("RAZORPAYX_KEY_ID", "rzp_test_TxKlwS0fIp5ncW")
RAZORPAYX_KEY_SECRET = os.environ.get("RAZORPAYX_KEY_SECRET", "qGH6KvI971tvR6iMqOLq1ojb")
RAZORPAYX_ACCOUNT_NUMBER = os.environ.get("RAZORPAYX_ACCOUNT_NUMBER", "2323230035609938")

# Standard Catalog Base Prices (Rupees)
CATALOG_PRICES: Dict[str, int] = {
    "mangal_dosha": 199,
    "manglik_report": 199,
    "dhana_yoga": 299,
    "gun_milan_manglik": 499,
    "parashara_report": 1111,
    "mega_parashara": 1111,
    "muhurta_vivah": 1111,
    "muhurta_vastu": 1111,
    "muhurta_yajno": 1111,
    "consultation_acharya": 5100,
    "consultation_gurukul": 24000
}

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


def get_authenticated_customer_phone(authorization: Optional[str]) -> Optional[str]:
    """
    R2: Extracts customer phone from verified Firebase ID token on the server.
    Order of precedence:
      1. token["phone_number"] (normalized to last 10 digits)
      2. User profile record in Firestore at users/{uid} (saved by sra-auth.js)
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token_str = authorization.split(" ", 1)[1].strip()
    if not token_str:
        return None

    # Test mode hook for unit/integration tests without live network calls
    if (os.environ.get("SUTRADHAR_TEST_MODE") == "1" or os.environ.get("TESTING") == "1") and token_str.startswith("mock_token_"):
        return normalize_phone(token_str.replace("mock_token_", ""))

    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth
        decoded = fb_auth.verify_id_token(token_str)
        # 1. token["phone_number"]
        if decoded.get("phone_number"):
            phone = normalize_phone(decoded["phone_number"])
            if len(phone) == 10:
                return phone
        # 2. Look up in users/{uid}
        uid = decoded.get("uid")
        if uid:
            user_doc = SutradharStore.get_doc("users", uid)
            if user_doc and user_doc.get("phone"):
                phone = normalize_phone(user_doc["phone"])
                if len(phone) == 10:
                    return phone
    except Exception as e:
        logger.warning(f"[Auth] Firebase ID token verification notice: {e}")
    return None


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
    sutradhar_id: str = Field(..., description="Sutradhar Unique ID e.g. SUTRA-7775-01 or SRA-7K3M9Q")
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
async def register_or_sync_sutradhar(req: RegisterSutradharRequest):
    """
    Registers or updates a Sutradhar profile with verified UPI & Unique Code.
    Q2: Validates UPI ID format and requires fresh OTP if changing existing UPI.
    """
    clean_phone = normalize_phone(req.phone)
    if len(clean_phone) != 10:
        raise HTTPException(status_code=400, detail="कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।")

    # Clean & validate UPI format
    clean_upi = (req.upi_id or "").strip().lower()
    if clean_upi:
        if not re.match(r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$", clean_upi):
            raise HTTPException(status_code=400, detail="कृपया मान्य UPI आईडी दर्ज करें (जैसे: name@okhdfcbank या 9876543210@paytm)।")

    # Find existing
    existing_all = SutradharStore.query_all("sutradhars")
    existing = next((s for s in existing_all if s.get("phone") == clean_phone), None)

    # Q2: Changing UPI ID requires fresh OTP verification
    if existing and existing.get("upi_id") and clean_upi and clean_upi != existing.get("upi_id"):
        if not req.otp:
            raise HTTPException(status_code=400, detail="सुरक्षा नियम: UPI आईडी बदलने हेतु OTP सत्यापन अनिवार्य है।")
        otp_rec = SutradharStore.get_doc("otps", clean_phone)
        if not otp_rec or otp_rec.get("otp") != req.otp.strip():
            raise HTTPException(status_code=400, detail="अमान्य अथवा समाप्त OTP। कृपया पुनः OTP मंगाएं।")
        # Clear used OTP
        SutradharStore.set_doc("otps", clean_phone, {})

    if existing:
        s_id = existing["id"]
        code = (req.code or existing.get("code") or existing.get("sutradhar_id") or f"SUTRA{clean_phone[-4:]}01").replace("-", "")
    else:
        s_id = f"SUTRA-{clean_phone[-4:]}-01"
        code = (req.code or f"SRA{os.urandom(3).hex().upper()}").replace("-", "")

    sutradhar_doc = {
        "id": s_id,
        "sutradhar_id": s_id,
        "name": req.name.strip(),
        "phone": clean_phone,
        "email": (req.email or "").strip().lower(),
        "code": code,
        "upi_id": clean_upi,
        "pan": (req.pan or "").strip().upper(),
        "status": "active",
        "fund_account_id": f"fa_upi_{clean_phone[-4:]}_{os.urandom(2).hex()}",
        "created_at": existing.get("created_at") if existing else datetime.now(timezone.utc).isoformat()
    }

    SutradharStore.set_doc("sutradhars", s_id, sutradhar_doc)
    log_audit_event("SUTRADHAR_REGISTERED", s_id, {"phone": clean_phone, "code": code, "upi": clean_upi})

    return {
        "status": "success",
        "message": f"सूत्रधार '{req.name}' सफलतापूर्वक सक्रिय है।",
        "sutradhar": sutradhar_doc
    }


# -----------------------------------------------------------------------------
# ENDPOINT 1: LEAD REGISTRATION WITH 72H LOCK & 1-DAY GAP RULE
# -----------------------------------------------------------------------------
@router.post("/leads/add")
async def add_lead(req: AddLeadRequest):
    """
    लीड दर्ज करना:
    1. सूत्रधार की पहचान पुष्टि।
    2. नंबर मानकीकरण।
    3. R5: सूत्रधार स्वयं का या किसी का भी नंबर दर्ज कर सकता है।
    4. R3 & P3: एटॉमिक 72-घंटे का ताला (एक समय में ठीक एक सक्रिय)।
    5. R4: ताला समाप्त होने पर कोई भी सूत्रधार (वही या दूसरा) तुरंत पुनः दर्ज कर सकता है (24h कूलडाउन हटा दिया गया)।
    """
    clean_customer_phone = normalize_phone(req.customer_phone)
    if len(clean_customer_phone) != 10:
        raise HTTPException(status_code=400, detail="कृपया ग्राहक का 10-अंकों का मान्य मोबाइल नंबर दर्ज करें।")

    sutradhar_id = req.sutradhar_id.strip().upper()
    sutradhar = SutradharStore.get_doc("sutradhars", sutradhar_id)

    # Allow fallback matching by phone or code if sutradhar doc not found directly
    if not sutradhar:
        all_sutras = SutradharStore.query_all("sutradhars")
        sutradhar = next((s for s in all_sutras if s.get("code") == sutradhar_id or s.get("sutradhar_id") == sutradhar_id or s.get("phone") == normalize_phone(sutradhar_id)), None)

    if not sutradhar:
        # Auto-create active level-1 profile for verified phone
        sutradhar = {
            "id": sutradhar_id,
            "sutradhar_id": sutradhar_id,
            "name": "सूत्रधार",
            "phone": normalize_phone(sutradhar_id) or "9517117775",
            "code": sutradhar_id,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        SutradharStore.set_doc("sutradhars", sutradhar_id, sutradhar)

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
        "message": "लीड 72 घंटे के लिए आपकी है। 72 घंटे के भीतर इस नंबर से किसी भी खरीद पर 30% कमीशन स्वतः आपके UPI खाते में आएगा।",
        "customer_phone": clean_customer_phone,
        "expires_at": expires_at.isoformat(),
        "lock_hours": 72
    }


# -----------------------------------------------------------------------------
# ENDPOINT 2: LEAD LISTING WITH LIVE COUNTDOWN FOR SUTRADHAR DASHBOARD
# -----------------------------------------------------------------------------
@router.get("/leads/list")
async def list_sutradhar_leads(sutradhar_id: str = Query(..., description="Sutradhar ID")):
    """Returns all leads for a given sutradhar with accurate countdown strings and statuses."""
    s_id = sutradhar_id.strip().upper()
    matching_ids = get_sutradhar_alias_ids(sutradhar_id)
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
        item["commission_amount"] = l.get("commission_amount", 0)
        item["utr"] = l.get("utr", "")
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
@router.post("/quote")
async def get_checkout_quote(req: QuoteRequest):
    """
    दाम बताना (checkout से पहले):
    1. Login किए ग्राहक के मोबाइल पर चालू 72-घंटे की लीड ढूँढता है (active अथवा converted)।
    2. मिल जाए, तो सूत्रधार एट्रिब्यूशन जोड़ता है।
    3. जय हनुमान मास्टर की 100% बायपास देती है।
    """
    clean_phone = normalize_phone(req.customer_phone)
    service_id = req.service_id.strip().lower()
    base_price = CATALOG_PRICES.get(service_id, 199)

    now = datetime.now(timezone.utc)
    all_leads = SutradharStore.query_all("leads")

    # R6 & R8: Find unexpired lead (active OR converted) for this customer phone
    active_lead = None
    for l in all_leads:
        if l.get("customer_phone") == clean_phone and l.get("status") in ("active", "converted"):
            try:
                exp_dt = datetime.fromisoformat(l["expires_at"])
                if exp_dt > now:
                    active_lead = l
                    break
            except Exception:
                continue

    input_code = (req.input_code or "").strip().upper()
    clean_input_code = input_code.replace("-", "").replace(" ", "").replace("_", "")
    is_master_code = clean_input_code in ("JAIHANUMAN", "जयहनुमान", "MASTER") or input_code in ("JAI HANUMAN", "जय हनुमान", "JAI_HANUMAN", "MASTER")

    # Master Key Check: 100% bypass
    if is_master_code:
        return {
            "status": "success",
            "valid": True,
            "has_active_lead": False,
            "service_id": service_id,
            "base_price": base_price,
            "discount_percent": 100,
            "discount_amount": base_price,
            "net_price": 0,
            "final_price": 0,
            "net_price_paise": 0,
            "message": "✨ जय हनुमान मास्टर की स्वीकृत! 100% अधिकृत।"
        }

    # Case A: Active Lead exists for this customer (Full price, Sutradhar gets 30% commission)
    if active_lead:
        sutra_code = (active_lead.get("sutradhar_code") or active_lead.get("sutradhar_id") or "").replace("-", "")
        return {
            "status": "success",
            "valid": True,
            "has_active_lead": True,
            "auto_applied": False,
            "lead_id": active_lead["id"],
            "sutradhar_id": active_lead["sutradhar_id"],
            "sutradhar_code": sutra_code,
            "service_id": service_id,
            "base_price": base_price,
            "original_price": base_price,
            "discount_percent": 0,
            "discount_amount": 0,
            "net_price": base_price,
            "final_price": base_price,
            "net_price_paise": base_price * 100,
            "message": "पूर्ण दक्षिणा मूल्य (सूत्रधार 72h लीड सुरक्षित)"
        }

    # Case B: Standard full price (no active lead)
    return {
        "status": "success",
        "valid": True,
        "has_active_lead": False,
        "auto_applied": False,
        "service_id": service_id,
        "base_price": base_price,
        "original_price": base_price,
        "discount_percent": 0,
        "discount_amount": 0,
        "net_price": base_price,
        "final_price": base_price,
        "net_price_paise": base_price * 100,
        "message": "पूर्ण दक्षिणा मूल्य"
    }


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

    # Quote determination
    quote_req = QuoteRequest(
        customer_phone=effective_phone,
        service_id=req.service_id,
        input_code=req.input_code
    )
    quote = await get_checkout_quote(quote_req)
    net_price = quote["net_price"]
    net_paise = net_price * 100

    # Try creating real order with Razorpay Client if sdk installed
    try:
        import razorpay
        client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
        rzp_order = client.order.create({
            "amount": net_paise,
            "currency": "INR",
            "receipt": order_id,
            "notes": {
                "service_id": req.service_id,
                "customer_phone": effective_phone,
                "sutradhar_id": attributed_sutradhar_id,
                "sutradhar_code": attributed_sutradhar_code,
                "lead_id": attributed_lead_id,
                "attributed_at": attributed_at or ""
            }
        })
        order_id = rzp_order.get("id", order_id)
    except Exception as e:
        logger.warning(f"[Razorpay Client note: using simulated test order {order_id}]: {e}")

    # Save to Firestore orders collection
    order_doc = {
        "id": order_id,
        "order_id": order_id,
        "customer_phone": effective_phone,
        "customer_name": req.customer_name or "जातक",
        "customer_email": req.customer_email or "",
        "service_id": req.service_id,
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
        "discount_applied": quote["discount_amount"] > 0
    }


# -----------------------------------------------------------------------------
# ENDPOINT 5: WEBHOOK VERIFICATION & SINGLE-COMMISSION IDEMPOTENT CREATION
# -----------------------------------------------------------------------------
# Flat commission lookup for special services (e.g. SaaS)
# SaaS is not sold through this checkout yet. When added, configure here e.g. {"astrologer_saas": 2500.0}
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

    # R9 & Answer 2: Commission calculation
    service_id = order.get("service_id", "")
    if service_id in FLAT_COMMISSION_BY_SERVICE:
        comm_amount = float(FLAT_COMMISSION_BY_SERVICE[service_id])
    else:
        # 30% of the amount actually paid, computed in integer paise
        comm_paise = (captured_paise * 30) // 100
        comm_amount = round(comm_paise / 100, 2)

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
        "order_amount": captured_paise / 100,
        "amount": comm_amount,
        "status": "created",
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

    # P4: Non-blocking payout trigger in background so webhook returns 200 immediately
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
async def trigger_payout_worker():
    """Manual or cron-triggered automated payout runner for pending commissions."""
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
            if not sutradhar_id or not lead_id:
                continue

            captured_paise = int(p.get("amount", 0))
            order_paise = int(order.get("net_amount_paise", order.get("net_amount", 0) * 100))
            if captured_paise != order_paise or captured_paise <= 0:
                continue

            service_id = order.get("service_id", "")
            if service_id in FLAT_COMMISSION_BY_SERVICE:
                comm_amount = float(FLAT_COMMISSION_BY_SERVICE[service_id])
            else:
                comm_paise = (captured_paise * 30) // 100
                comm_amount = round(comm_paise / 100, 2)

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
                "order_amount": captured_paise / 100,
                "amount": comm_amount,
                "status": "created",
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

        if recovered:
            await process_pending_payouts()
    except Exception as e:
        logger.warning(f"[Reconciliation] Error: {e}")
        return {"status": "error", "error": str(e)}

    return {"status": "success", "recovered_count": len(recovered), "recovered": recovered}


# -----------------------------------------------------------------------------
# ENDPOINT 7: ADMIN 'REQUIRES REVIEW' QUEUE (जाँच ज़रूरी)
# -----------------------------------------------------------------------------
@router.get("/admin/reviews")
async def get_admin_review_queue():
    """Returns all commissions in 'requires_review' state."""
    all_comms = SutradharStore.query_all("commissions")
    flagged = [c for c in all_comms if c.get("status") == "requires_review"]
    return {
        "status": "success",
        "count": len(flagged),
        "queue": flagged
    }


@router.post("/admin/review-action")
@router.post("/admin/reviews/action")
async def take_admin_review_action(req: ReviewActionRequest):
    """
    हर मामले पर दो बटन:
    1. 'retry': फिर से भेजें
    2. 'cancel': रद्द करें, कारण सहित
    """
    comm = SutradharStore.get_doc("commissions", req.commission_id)
    if not comm:
        raise HTTPException(status_code=404, detail="कमीशन रिकॉर्ड नहीं मिला।")

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
        log_audit_event("ADMIN_RETRY_PAYOUT", "admin", {"commission_id": req.commission_id, "upi": req.upi_id})
        # Try payout again immediately
        await process_pending_payouts()
        return {"status": "success", "message": "पेआउट पुनः प्रोसेस करने हेतु कतार में डाल दिया गया है।"}

    elif req.action == "cancel":
        comm["status"] = "cancelled"
        comm["failure_reason"] = req.reason or "व्यवस्थापक द्वारा रद्द"
        SutradharStore.set_doc("commissions", req.commission_id, comm)
        log_audit_event("ADMIN_CANCEL_PAYOUT", "admin", {"commission_id": req.commission_id, "reason": req.reason})
        return {"status": "success", "message": "कमीशन रद्द कर दिया गया है।"}

    raise HTTPException(status_code=400, detail="अमान्य एक्शन। केवल 'retry' या 'cancel' मान्य हैं।")


# -----------------------------------------------------------------------------
# ENDPOINT 8: SUTRADHAR SUMMARY FOR DASHBOARD STATS
# -----------------------------------------------------------------------------
@router.get("/login")
async def login_sutradhar(phone: str = Query(..., description="Registered Sutradhar phone")):
    """Returns sutradhar profile if phone is found, 404 otherwise. No OTP for MVP."""
    clean_phone = normalize_phone(phone)
    all_sutras = SutradharStore.query_all("sutradhars")
    sutradhar = next((s for s in all_sutras if s.get("phone") == clean_phone), None)
    if not sutradhar:
        raise HTTPException(status_code=404, detail="यह नंबर सूत्रधार के रूप में पंजीकृत नहीं है।")
    return {"status": "success", "sutradhar": sutradhar}


@router.get("/summary")
async def get_sutradhar_summary(sutradhar_id: str = Query(..., description="Sutradhar ID")):
    """Calculates live today, this month, and lifetime commissions for the Sutradhar."""
    matching_ids = get_sutradhar_alias_ids(sutradhar_id)
    all_comms = SutradharStore.query_all("commissions")
    sutra_comms = [
        c for c in all_comms 
        if (c.get("sutradhar_id", "").upper() in matching_ids or 
            c.get("sutradhar_code", "").upper() in matching_ids) and 
           c.get("status") in ("paid", "approved")
    ]

    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    month_str = now.strftime("%Y-%m")

    today_total = 0
    month_total = 0
    lifetime_total = 0
    paid_total = 0
    pending_payout_total = 0

    for c in sutra_comms:
        amt = c.get("amount", 0)
        lifetime_total += amt
        p_at = c.get("paid_at") or c.get("created_at") or ""
        if p_at.startswith(today_str):
            today_total += amt
        if p_at.startswith(month_str):
            month_total += amt
        if c.get("status") == "paid":
            paid_total += amt
        elif c.get("status") == "approved":
            pending_payout_total += amt

    all_leads = SutradharStore.query_all("leads")
    my_leads = [
        l for l in all_leads 
        if (l.get("sutradhar_id", "").upper() in matching_ids or 
            l.get("sutradhar_code", "").upper() in matching_ids or 
            l.get("sutradhar_phone", "") in matching_ids)
    ]
    active_leads = sum(1 for l in my_leads if l.get("status") == "active")
    converted_leads = sum(1 for l in my_leads if l.get("status") == "converted")

    # Look up profile by any matching ID
    sutradhar = None
    for mid in matching_ids:
        sutradhar = SutradharStore.get_doc("sutradhars", mid)
        if sutradhar:
            break

    profile_code = sutradhar.get("code", "") if sutradhar else ""
    profile_upi = sutradhar.get("upi_id", "") if sutradhar else ""
    primary_id = sutradhar.get("sutradhar_id") or sutradhar.get("id") or sutradhar_id

    return {
        "status": "success",
        "sutradhar_id": primary_id,
        "code": profile_code or primary_id,
        "upi_id": profile_upi,
        "today_commission": today_total,
        "month_commission": month_total,
        "lifetime_commission": lifetime_total,
        "total_commission": lifetime_total,
        "paid_commission": paid_total,
        "pending_payout": pending_payout_total,
        "active_leads": active_leads,
        "converted_leads": converted_leads,
        "total_leads": len(my_leads),
        "stats": {
            "today_commission": today_total,
            "month_commission": month_total,
            "total_commission": lifetime_total,
            "lifetime_commission": lifetime_total,
            "paid_commission": paid_total,
            "pending_payout": pending_payout_total,
            "active_leads": active_leads,
            "converted_leads": converted_leads,
            "total_leads": len(my_leads)
        }
    }
