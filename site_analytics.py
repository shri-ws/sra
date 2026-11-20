"""
SHRI RAMJI ASTRO — WEBSITE VISITOR & DOWNLOAD ANALYTICS
Mounted at /api/analytics by parashara_canonical_engine.py.

Every page loads sra-analytics.js, which sends small beacons:
  pv        a page view (the first one in a visit carries where the visitor came from)
  dl        a report PDF downloaded or printed
  app       the Android app download clicked
  identify  the visitor signed in (carries the Firebase ID token, so the phone is verified here)

The engine keeps today's numbers in memory and writes one document per day
(site_analytics_daily/<YYYY-MM-DD>) plus one per signed-in phone (site_people/<phone>)
through SutradharStore (Firestore when FIREBASE_SERVICE_ACCOUNT_JSON is set).
Phones are never taken from the page: a visitor id is linked to a phone only by a verified token.
"""
import json
import re
import threading
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Header, Request
from fastapi.responses import Response

from sutradhar_engine import IST, SutradharStore, logger, require_admin, token_phone, verify_firebase_token

router = APIRouter(prefix="/api/analytics", tags=["Site Analytics"])

DAY_COL = "site_analytics_daily"
PEOPLE_COL = "site_people"
META_COL = "site_analytics_meta"
VIDMAP_DOC = "vidmap"

FLUSH_SECONDS = 45
MAX_EVENTS_PER_DAY = 1500
MAX_VISITORS_PER_DAY = 5000
MAX_KEYS = 300            # pages / sources / labels kept per day
MAX_VIDMAP = 20000
BOT_RE = re.compile(r"bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp/|python-requests|curl|wget", re.I)
OWN_HOSTS = ("shriramjiastro.in", "localhost", "127.0.0.1", "shri-ws.github.io")

_lock = threading.Lock()
_days: Dict[str, Dict[str, Any]] = {}
_people: Dict[str, Dict[str, Any]] = {}
_dirty_days: set = set()
_dirty_people: set = set()
_vidmap: Optional[Dict[str, str]] = None
_vidmap_dirty = False
_last_flush = time.time()


# ── helpers ─────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(IST)


def _clip(v: Any, n: int = 120) -> str:
    return str(v or "").replace("\n", " ").strip()[:n]


def _bump(d: Dict[str, int], key: str, by: int = 1):
    if not key:
        return
    if key not in d and len(d) >= MAX_KEYS:
        key = "(अन्य)"
    d[key] = d.get(key, 0) + by


def classify_source(ref: str, utm: str) -> Dict[str, str]:
    """Where a visit came from, in plain words, plus a search phrase when the referrer shows one."""
    utm = (utm or "").strip().lower()
    if utm:
        names = {"whatsapp": "WhatsApp", "wa": "WhatsApp", "instagram": "Instagram", "ig": "Instagram",
                 "facebook": "Facebook", "fb": "Facebook", "youtube": "YouTube", "yt": "YouTube",
                 "google": "Google खोज", "telegram": "Telegram", "sutradhar": "सूत्रधार लिंक"}
        return {"source": names.get(utm, "अभियान: " + utm[:30]), "query": ""}
    if not ref:
        return {"source": "सीधे (लिंक/WhatsApp/बुकमार्क)", "query": ""}
    try:
        u = urlparse(ref)
    except Exception:
        return {"source": "अन्य", "query": ""}
    host = (u.netloc or u.path or "").lower()
    if u.scheme == "android-app":
        host = u.netloc.lower()
        if "googlequicksearchbox" in host:
            return {"source": "Google खोज", "query": ""}
        if "whatsapp" in host:
            return {"source": "WhatsApp", "query": ""}
        if "instagram" in host:
            return {"source": "Instagram", "query": ""}
        if "facebook" in host:
            return {"source": "Facebook", "query": ""}
        if "youtube" in host:
            return {"source": "YouTube", "query": ""}
        return {"source": "ऐप: " + host[:40], "query": ""}
    if any(h in host for h in OWN_HOSTS):
        return {"source": "", "query": ""}
    q = ""
    try:
        qs = parse_qs(u.query)
        q = (qs.get("q") or qs.get("p") or qs.get("query") or qs.get("text") or [""])[0]
    except Exception:
        pass
    table = [
        ("google.", "Google खोज"), ("bing.", "Bing खोज"), ("duckduckgo.", "DuckDuckGo खोज"),
        ("yahoo.", "Yahoo खोज"), ("yandex.", "Yandex खोज"), ("instagram.", "Instagram"),
        ("facebook.", "Facebook"), ("fb.", "Facebook"), ("youtube.", "YouTube"), ("youtu.be", "YouTube"),
        ("whatsapp.", "WhatsApp"), ("wa.me", "WhatsApp"), ("t.co", "X / Twitter"), ("twitter.", "X / Twitter"),
        ("x.com", "X / Twitter"), ("telegram.", "Telegram"), ("t.me", "Telegram"), ("linkedin.", "LinkedIn"),
        ("quora.", "Quora"), ("pinterest.", "Pinterest"), ("reddit.", "Reddit"), ("chatgpt.", "ChatGPT"),
        ("perplexity.", "Perplexity"), ("gemini.google", "Gemini"),
    ]
    for frag, name in table:
        if frag in host:
            return {"source": name, "query": _clip(q, 80)}
    return {"source": host.replace("www.", "")[:40] or "अन्य", "query": _clip(q, 80)}


def _empty_day(date: str) -> Dict[str, Any]:
    return {"date": date, "pageviews": 0, "visits": 0, "downloads_total": 0, "app_downloads": 0,
            "visitors": {}, "sources": {}, "pages": {}, "devices": {}, "downloads": {},
            "searches": {}, "landing": {}, "events": [], "updated_at": ""}


def _day(date: str) -> Dict[str, Any]:
    d = _days.get(date)
    if d is None:
        stored = SutradharStore.get_doc(DAY_COL, date) or {}
        d = _empty_day(date)
        for k, v in stored.items():
            d[k] = v
        _days[date] = d
        # keep only today and yesterday in memory
        for old in sorted(_days.keys())[:-2]:
            if old not in _dirty_days:
                _days.pop(old, None)
    return d


def _load_vidmap() -> Dict[str, str]:
    global _vidmap
    if _vidmap is None:
        _vidmap = dict((SutradharStore.get_doc(META_COL, VIDMAP_DOC) or {}).get("map") or {})
    return _vidmap


def _person(phone: str) -> Dict[str, Any]:
    p = _people.get(phone)
    if p is None:
        p = SutradharStore.get_doc(PEOPLE_COL, phone) or {"phone": phone, "name": "", "first_seen": "",
                                                           "last_seen": "", "pageviews": 0, "downloads": [],
                                                           "download_count": 0, "app_downloads": 0,
                                                           "days": [], "last_page": "", "source": ""}
        _people[phone] = p
    return p


def flush(force: bool = False):
    """Write changed day and people documents to the store."""
    global _last_flush, _vidmap_dirty
    with _lock:
        if not force and time.time() - _last_flush < FLUSH_SECONDS:
            return
        _last_flush = time.time()
        days = {k: json.loads(json.dumps(_days[k], ensure_ascii=False)) for k in _dirty_days if k in _days}
        people = {k: dict(_people[k]) for k in _dirty_people if k in _people}
        vm = dict(_vidmap) if (_vidmap_dirty and _vidmap is not None) else None
        _dirty_days.clear()
        _dirty_people.clear()
        _vidmap_dirty = False
    try:
        for k, doc in days.items():
            doc["updated_at"] = _now().isoformat()
            SutradharStore.set_doc(DAY_COL, k, doc)
        for k, doc in people.items():
            SutradharStore.set_doc(PEOPLE_COL, k, doc)
        if vm is not None:
            if len(vm) > MAX_VIDMAP:
                vm = dict(list(vm.items())[-MAX_VIDMAP:])
            SutradharStore.set_doc(META_COL, VIDMAP_DOC, {"map": vm})
    except Exception as e:
        logger.error(f"[SRA Analytics] flush failed: {e}")


def record(ev: Dict[str, Any], user_agent: str):
    """Apply one beacon to today's numbers."""
    global _vidmap_dirty
    kind = _clip(ev.get("k"), 12)
    vid = re.sub(r"[^A-Za-z0-9_-]", "", str(ev.get("vid") or ""))[:40]
    if kind not in ("pv", "dl", "app", "identify") or not vid:
        return
    now = _now()
    date = now.strftime("%Y-%m-%d")
    path = _clip(ev.get("p"), 120) or "/"
    label = _clip(ev.get("l"), 120)
    device = _clip(ev.get("d"), 20) or "?"

    verified_phone = ""
    if kind == "identify" and ev.get("tok"):
        try:
            verified_phone = token_phone(verify_firebase_token("Bearer " + str(ev.get("tok"))[:4096])) or ""
        except Exception:
            verified_phone = ""

    with _lock:
        vm = _load_vidmap()
        if verified_phone:
            if vm.get(vid) != verified_phone:
                vm[vid] = verified_phone
                _vidmap_dirty = True
        phone = vm.get(vid, "")
        day = _day(date)
        visitors = day["visitors"]
        v = visitors.get(vid)
        if v is None:
            if len(visitors) >= MAX_VISITORS_PER_DAY:
                v = {}
            else:
                v = visitors[vid] = {"first": now.strftime("%H:%M"), "pv": 0, "dl": 0, "device": device,
                                     "source": "", "landing": path, "phone": ""}
        if phone and v is not None:
            v["phone"] = phone
        v["last"] = now.strftime("%H:%M")

        event = {"t": now.strftime("%H:%M:%S"), "k": kind, "p": path, "vid": vid[:10], "ph": phone}
        new_dl = False
        if kind == "pv":
            day["pageviews"] += 1
            v["pv"] = v.get("pv", 0) + 1
            _bump(day["pages"], path)
            pages = v.setdefault("pages", [])
            if path not in pages and len(pages) < 15:
                pages.append(path)
            if ev.get("land"):
                day["visits"] += 1
                v["visits"] = v.get("visits", 0) + 1
                src = classify_source(_clip(ev.get("r"), 400), _clip(ev.get("u"), 40))
                source = src["source"] or "सीधे (लिंक/WhatsApp/बुकमार्क)"
                v["source"] = v.get("source") or source
                _bump(day["sources"], source)
                _bump(day["landing"], path)
                _bump(day["devices"], device)
                if src["query"]:
                    _bump(day["searches"], src["query"].lower())
                event["src"] = source
            else:
                event = None  # inner page views are counted, not listed
        elif kind in ("dl", "app"):
            # one person, one report, one day = one download (repeat clicks are not counted again)
            key = (label or path) if kind == "dl" else "app"
            dls = v.setdefault("dls", [])
            if key in dls:
                event = None
            else:
                new_dl = True
                if len(dls) < 30:
                    dls.append(key)
                if kind == "dl":
                    day["downloads_total"] += 1
                    v["dl"] = v.get("dl", 0) + 1
                    _bump(day["downloads"], key)
                else:
                    day["app_downloads"] += 1
                event["l"] = label
        elif kind == "identify":
            event = None  # a sign-in is shown on the person's row, not as its own line

        if event:
            day["events"].append(event)
            if len(day["events"]) > MAX_EVENTS_PER_DAY:
                day["events"] = day["events"][-MAX_EVENTS_PER_DAY:]
        _dirty_days.add(date)

        if phone:
            p = _person(phone)
            if kind == "identify" and ev.get("nm"):
                p["name"] = _clip(ev.get("nm"), 60)
            p["first_seen"] = p.get("first_seen") or now.isoformat()
            p["last_seen"] = now.isoformat()
            if date not in p.get("days", []):
                p["days"] = (p.get("days", []) + [date])[-60:]
            if kind == "pv":
                p["pageviews"] = p.get("pageviews", 0) + 1
                p["last_page"] = path
                if v.get("source") and not p.get("source"):
                    p["source"] = v["source"]
            elif kind == "dl" and new_dl:
                p["download_count"] = p.get("download_count", 0) + 1
                p["downloads"] = (p.get("downloads", []) + [{"at": now.isoformat(), "l": label, "p": path}])[-30:]
            elif kind == "app" and new_dl:
                p["app_downloads"] = p.get("app_downloads", 0) + 1
            _dirty_people.add(phone)


# ── public beacon ───────────────────────────────────────────────────
@router.post("/collect")
async def collect(request: Request, user_agent: Optional[str] = Header(None)):
    """Beacon from sra-analytics.js (text/plain JSON, so browsers send it without a CORS preflight)."""
    ua = user_agent or ""
    if BOT_RE.search(ua):
        return Response(status_code=204)
    try:
        raw = (await request.body())[:8192]
        body = json.loads(raw.decode("utf-8") or "{}")
    except Exception:
        return Response(status_code=204)
    events = body if isinstance(body, list) else [body]
    for ev in events[:10]:
        if isinstance(ev, dict):
            try:
                record(ev, ua)
            except Exception as e:
                logger.error(f"[SRA Analytics] record failed: {e}")
    flush()
    return Response(status_code=204)


# ── admin ───────────────────────────────────────────────────────────
def _people_of_day(vis: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Visitor ids of one day folded into people: a signed-in number is one person on every device."""
    out: Dict[str, Dict[str, Any]] = {}
    for vid, v in vis.items():
        key = v.get("phone") or ("v:" + vid)
        r = out.get(key)
        if r is None:
            r = out[key] = {"phone": v.get("phone", ""), "first": v.get("first", ""), "last": v.get("last", ""),
                            "visits": 0, "pv": 0, "pages": [], "downloads": [], "source": v.get("source", ""),
                            "device": v.get("device", ""), "devices": 0}
        r["devices"] += 1
        r["visits"] += int(v.get("visits") or (1 if v.get("pv") else 0))
        r["pv"] += int(v.get("pv") or 0)
        if v.get("first") and (not r["first"] or v["first"] < r["first"]):
            r["first"] = v["first"]
        if v.get("last") and v["last"] > r["last"]:
            r["last"] = v["last"]
        for pg in v.get("pages") or [v.get("landing")]:
            if pg and pg not in r["pages"]:
                r["pages"].append(pg)
        for dl in v.get("dls") or []:
            if dl not in r["downloads"]:
                r["downloads"].append(dl)
        if not r["source"] and v.get("source"):
            r["source"] = v["source"]
    return out


@router.get("/admin/summary")
async def admin_summary(days: int = 7, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    flush(force=True)
    days = max(1, min(int(days or 7), 90))
    today = _now().date()
    dates = [(today - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    totals = {"people": 0, "people_days": 0, "returning": 0, "visits": 0, "pageviews": 0,
              "downloads": 0, "app_downloads": 0, "signed_in": 0}
    merged = {"sources": {}, "pages": {}, "devices": {}, "downloads": {}, "searches": {}, "landing": {}}
    per_day, events, rows, seen_people, phones = [], [], [], {}, set()
    for date in dates:
        with _lock:
            d = _days.get(date)
            d = json.loads(json.dumps(d, ensure_ascii=False)) if d else None
        if d is None:
            d = SutradharStore.get_doc(DAY_COL, date)
        if not d:
            per_day.append({"date": date, "people": 0, "visits": 0, "pageviews": 0, "downloads": 0, "app_downloads": 0})
            continue
        ppl = _people_of_day(d.get("visitors") or {})
        for key, r in ppl.items():
            seen_people[key] = seen_people.get(key, 0) + 1
            if r["phone"]:
                phones.add(r["phone"])
            rows.append(dict(r, date=date, key=key))
        per_day.append({"date": date, "people": len(ppl), "visits": d.get("visits", 0), "pageviews": d.get("pageviews", 0),
                        "downloads": d.get("downloads_total", 0), "app_downloads": d.get("app_downloads", 0),
                        "signed_in": sum(1 for r in ppl.values() if r["phone"])})
        totals["people_days"] += len(ppl)
        totals["pageviews"] += d.get("pageviews", 0)
        totals["visits"] += d.get("visits", 0)
        totals["downloads"] += d.get("downloads_total", 0)
        totals["app_downloads"] += d.get("app_downloads", 0)
        for key in merged:
            for k, n in (d.get(key) or {}).items():
                merged[key][k] = merged[key].get(k, 0) + n
        for e in d.get("events") or []:
            if e.get("k") in ("dl", "app"):
                events.append(dict(e, date=date))
    totals["people"] = len(seen_people)
    totals["returning"] = sum(1 for n in seen_people.values() if n > 1)
    totals["signed_in"] = len(phones)

    def top(m: Dict[str, int], n: int = 25):
        return [{"name": k, "count": c} for k, c in sorted(m.items(), key=lambda x: -x[1])[:n]]

    people = [p for p in SutradharStore.query_all(PEOPLE_COL) if (p.get("last_seen") or "")[:10] >= dates[-1]]
    people.sort(key=lambda p: p.get("last_seen", ""), reverse=True)
    names = {p.get("phone"): p.get("name", "") for p in people}
    for r in rows:
        r["name"] = names.get(r["phone"], "")
        r["days_seen"] = seen_people.get(r["key"], 1)
    # signed-in people and those who downloaded first, then the latest
    rows.sort(key=lambda r: (r["date"], bool(r["phone"]) or bool(r["downloads"]), r["last"]), reverse=True)
    events.sort(key=lambda e: (e.get("date", ""), e.get("t", "")), reverse=True)
    return {
        "days": days, "from": dates[-1], "to": dates[0], "totals": totals,
        "per_day": list(reversed(per_day)),
        "sources": top(merged["sources"]), "pages": top(merged["pages"]), "landing": top(merged["landing"]),
        "devices": top(merged["devices"], 10), "downloads": top(merged["downloads"]),
        "searches": top(merged["searches"]),
        "download_events": events[:400],
        "daily_people": rows[:600],
        "people": people[:500],
    }
