"""
SHRI RAMJI ASTRO — MACHINE TRANSLATION FOR TEXT THE DICTIONARIES DO NOT COVER
Mounted at /api/i18n by parashara_canonical_engine.py.

The site's own dictionaries (sra-i18n/*.js) turn Hindi <-> English for known strings. Whatever is
still in the wrong language after that (runtime text, placeholders, pages without a dictionary)
is sent here by sra-i18n.js and translated by Gemini with the owner's key (GEMINI_API_KEY).
Every translation is kept: in memory, and through SutradharStore (Firestore in production) in
collection i18n_cache, one document per language + text, so each string is translated once.
"""
import hashlib
import json
import re
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from sutradhar_engine import SutradharStore, logger

router = APIRouter(prefix="/api/i18n", tags=["Site translation"])

CACHE_COL = "i18n_cache"
MAX_TEXTS = 60
MAX_CHARS = 2500
BATCH_CHARS = 3000            # one Gemini call: with longer lists the light model starts copying lines back
BATCH_ITEMS = 25
PARALLEL = 4
PER_IP_PER_HOUR = 240
ALLOWED_ORIGINS = ("https://shriramjiastro.in", "https://www.shriramjiastro.in", "https://shri-ws.github.io",
                   "http://localhost", "http://127.0.0.1")

LANG_NAMES = {
    "hi": "Hindi (Devanagari script)", "en": "English", "mr": "Marathi", "gu": "Gujarati", "bn": "Bengali",
    "pa": "Punjabi (Gurmukhi script)", "ta": "Tamil", "te": "Telugu", "kn": "Kannada", "ml": "Malayalam",
    "or": "Odia", "as": "Assamese", "ne": "Nepali", "sa": "Sanskrit", "ur": "Urdu", "sd": "Sindhi",
    "es": "Spanish", "fr": "French", "de": "German", "ru": "Russian", "ar": "Arabic",
    "zh-CN": "Simplified Chinese", "ja": "Japanese",
}

NATIVE = {"hi": "हिन्दी", "mr": "मराठी", "gu": "ગુજરાતી", "bn": "বাংলা", "pa": "ਪੰਜਾਬੀ", "ta": "தமிழ்", "te": "తెలుగు",
          "kn": "ಕನ್ನಡ", "ml": "മലയാളം", "or": "ଓଡ଼ିଆ", "as": "অসমীয়া", "ne": "नेपाली", "sa": "संस्कृतम्", "ur": "اردو",
          "sd": "سنڌي", "es": "Español", "fr": "Français", "de": "Deutsch", "ru": "Русский", "ar": "العربية",
          "zh-CN": "简体中文", "ja": "日本語"}

_mem: Dict[str, str] = {}
_lock = threading.Lock()
_recent: Dict[str, List[float]] = {}
_calls = {"day": "", "n": 0}


def _setting(name: str, default: str = "") -> str:
    try:
        from parashara_canonical_engine import _ai_setting
        return _ai_setting(name, default)
    except Exception:
        import os
        return os.getenv(name, default)


def _key(lang: str, text: str) -> str:
    return lang + "_" + hashlib.sha1(text.encode("utf-8")).hexdigest()[:24]


def _cached(lang: str, text: str) -> Optional[str]:
    k = _key(lang, text)
    if k in _mem:
        return _mem[k]
    try:
        doc = SutradharStore.get_doc(CACHE_COL, k)
    except Exception:
        doc = None
    if doc and doc.get("src") == text and isinstance(doc.get("out"), str):
        _mem[k] = doc["out"]
        return doc["out"]
    return None


def _remember(lang: str, text: str, out: str):
    k = _key(lang, text)
    _mem[k] = out
    try:
        SutradharStore.set_doc(CACHE_COL, k, {"lang": lang, "src": text, "out": out, "at": int(time.time())})
    except Exception as e:
        logger.warning(f"[i18n] cache write failed: {e}")


DEVANAGARI_LANGS = {"hi", "mr", "ne", "sa"}
_DEV = re.compile(r"[\u0900-\u097F]")
_LATIN_WORD = re.compile(r"[A-Za-z]{3,}")


_KEEP_WORDS = {"upi", "pdf", "otp", "gst", "emi", "sms", "whatsapp", "razorpay", "google", "gmail", "facebook",
               "youtube", "instagram", "telegram", "android", "iphone", "paytm", "phonepe", "gpay", "bhim", "visa",
               "rupay", "mastercard", "shri", "ram", "astro", "sra", "srai", "bphs", "zoom", "shriramjiastro"}


def _english_words(s: str) -> List[str]:
    return [w for w in re.findall(r"[A-Za-z]{3,}", s) if w.lower() not in _KEEP_WORDS]


def _untranslated(lang: str, src: str, out: str) -> bool:
    """The model handed the string back (or left it in the source script)."""
    if lang not in DEVANAGARI_LANGS and _DEV.search(out):
        return True
    if lang == "hi":
        # most English words still there and the text barely changed
        return len(_english_words(out)) >= max(1, len(_english_words(src)) * 0.6) and len(_english_words(src)) > 0
    if lang == "en":
        return False
    return out.strip() == src.strip() and bool(_LATIN_WORD.search(src) or _DEV.search(src))


def _prompt(lang: str, texts: List[str]) -> str:
    name = LANG_NAMES.get(lang, lang)
    return (
        f"Translate each string in the JSON array below into {name}" + (f" ({NATIVE[lang]})" if lang in NATIVE else "") + ". They are labels, sentences and values "
        "from the website of Shri Ram Ji Astro, a Vedic astrology service in India (kundali, panchang, muhurta, "
        "reports, payments).\n"
        "Rules:\n"
        "- Return ONLY a JSON array of strings, the same length and order as the input.\n"
        "- Translate the MEANING into natural target-language words. Never just rewrite the source words in "
        "another script (wrong for Tamil: \"அபனி ஜன்ம பத்ரிகா தேகேன்\"; right: \"உங்கள் ஜாதகத்தைப் பாருங்கள்\").\n"
        "- Translate everything into the target language, including Hindi, Sanskrit or English parts of a mixed string.\n"
        "- Write Indian astrology terms the way a native reader of the target language knows them "
        "(for English: transliterate, e.g. Rahu, Ketu, Nakshatra, Tithi, Bhadra, Manglik, Kaal Sarp).\n"
        "- The brand is \"Shri Ram Ji Astro\" (in Hindi \"श्री राम जी एस्ट्रो\").\n"
        "- Keep unchanged: numbers and amounts (₹251), dates, times, URLs, e-mail addresses, and the names "
        "UPI, PDF, OTP, GST, EMI, SMS, AI, WhatsApp, Razorpay, Google, D1-D60.\n"
        "- Keep leading/trailing punctuation, bullets, line breaks and spacing style. Do not add notes.\n\n"
        + json.dumps(texts, ensure_ascii=False)
        + f"\n\nTarget language: {name}" + (f" ({NATIVE.get(lang)})" if NATIVE.get(lang) else "") + ". Every output string must be in it."
    )


def _gemini(lang: str, texts: List[str]) -> List[str]:
    key = _setting("GEMINI_API_KEY").strip().strip('"').strip("'")
    if not key:
        raise HTTPException(status_code=503, detail="translation is not configured")
    day = time.strftime("%Y-%m-%d")
    limit = int(_setting("I18N_DAILY_CALLS", "4000") or 4000)
    with _lock:
        if _calls["day"] != day:
            _calls.update(day=day, n=0)
        if _calls["n"] >= limit:
            raise HTTPException(status_code=429, detail="daily translation limit reached")
        _calls["n"] += 1
    # flash-lite answers in ~3 s; the thinking models took 30 s or more per batch, so they run with
    # thinking off and only when the light model is busy (Google answers 503/429 at peak hours)
    models = [(_setting("I18N_MODEL", "") or "gemini-3.5-flash-lite").strip(), (_setting("GEMINI_MODEL", "") or "gemini-3.5-flash").strip()]
    raw, last = None, 0
    for model in dict.fromkeys(models):
        gen = {"temperature": 0.1, "responseMimeType": "application/json"}
        if "lite" not in model:
            gen["thinkingConfig"] = {"thinkingBudget": 0}
        body = {"contents": [{"parts": [{"text": _prompt(lang, texts)}]}], "generationConfig": gen}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        for attempt in range(3):
            req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"), headers={"Content-Type": "application/json"})
            try:
                with urllib.request.urlopen(req, timeout=45) as res:
                    reply = json.load(res)
                raw = "".join(p.get("text", "") for p in reply["candidates"][0]["content"]["parts"])
                break
            except urllib.error.HTTPError as e:
                last = e.code
                if e.code not in (429, 500, 503):
                    break
                time.sleep(1.5 * (attempt + 1))
            except Exception:
                last = 0
                time.sleep(1)
        if raw is not None:
            break
    if raw is None:
        raise HTTPException(status_code=502, detail=f"translator busy ({last})")
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    try:
        out = json.loads(raw)
    except ValueError:
        out = None
    if not isinstance(out, list) or len(out) != len(texts):
        # the model merged or dropped a line: ask again in two halves (a single string is returned as it was)
        if len(texts) == 1:
            return list(texts)
        mid = len(texts) // 2
        return _gemini(lang, texts[:mid]) + _gemini(lang, texts[mid:])
    return [str(x) if x is not None else t for x, t in zip(out, texts)]


class TranslateRequest(BaseModel):
    lang: str = Field(..., max_length=8)
    texts: List[str] = Field(..., max_length=MAX_TEXTS)


@router.post("/translate")
def translate(body: TranslateRequest, request: Request):
    origin = request.headers.get("origin", "")
    if origin and not origin.startswith(ALLOWED_ORIGINS):
        raise HTTPException(status_code=403, detail="origin not allowed")
    lang = body.lang if body.lang in LANG_NAMES else ""
    if not lang:
        raise HTTPException(status_code=400, detail="unknown language")
    texts = [str(t)[:MAX_CHARS] for t in body.texts]

    result: List[Optional[str]] = [None] * len(texts)
    missing: Dict[str, List[int]] = {}
    for i, t in enumerate(texts):
        if not t.strip():
            result[i] = t
            continue
        hit = _cached(lang, t)
        if hit is not None:
            result[i] = hit
        else:
            missing.setdefault(t, []).append(i)

    if missing:
        visitor = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "?")).split(",")[0].strip()
        now = time.time()
        recent = [x for x in _recent.get(visitor, []) if now - x < 3600]
        if len(recent) >= PER_IP_PER_HOUR:
            raise HTTPException(status_code=429, detail="too many translations this hour")
        _recent[visitor] = recent + [now]

        todo = list(missing.keys())
        batch: List[str] = []
        size = 0
        batches: List[List[str]] = []
        for t in todo:
            if batch and (size + len(t) > BATCH_CHARS or len(batch) >= BATCH_ITEMS):
                batches.append(batch)
                batch, size = [], 0
            batch.append(t)
            size += len(t)
        if batch:
            batches.append(batch)

        def run(b: List[str]) -> List[str]:
            outs = _gemini(lang, b)
            bad = [j for j, (src, out) in enumerate(zip(b, outs)) if _untranslated(lang, src, out)]
            if bad:   # the light model sometimes hands a string back unchanged: ask once more for those
                again = _gemini(lang, [b[j] for j in bad])
                for j, out in zip(bad, again):
                    outs[j] = out
            return outs

        with ThreadPoolExecutor(max_workers=PARALLEL) as pool:
            results = list(pool.map(run, batches))
        for b, outs in zip(batches, results):
            for src, out in zip(b, outs):
                # After the second try the model's answer is kept (bilingual "हिंदी (English)" lines are fine),
                # unless it is still in the source script where the target uses another one.
                if not (lang not in DEVANAGARI_LANGS and _DEV.search(out)):
                    _remember(lang, src, out)
                for i in missing[src]:
                    result[i] = out

    return {"lang": lang, "translations": [r if r is not None else t for r, t in zip(result, texts)]}
