"""
Website visitor analytics: beacons are counted, phones come only from a verified token,
bots are ignored, and the admin summary needs the admin sign-in.

Run: .venv/bin/python -m pytest -q test_site_analytics.py
"""
import json
import os
import sys
import tempfile
import types

_tmp = tempfile.mkdtemp(prefix="site_an_")
os.environ["SUTRADHAR_TEST_MODE"] = "1"
os.environ["SUTRADHAR_DATA_DIR"] = _tmp
os.environ["SRA_ADMIN_EMAILS"] = "owner@test.in"
sys.modules.setdefault("razorpay", types.ModuleType("razorpay"))

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import site_analytics as sa  # noqa: E402

app = FastAPI()
app.include_router(sa.router)
client = TestClient(app)
ADMIN = {"Authorization": "Bearer mock_admin_owner@test.in"}
UA = {"User-Agent": "Mozilla/5.0 (Linux; Android 14) Mobile"}


def beacon(ev, ua=UA):
    return client.post("/api/analytics/collect", content=json.dumps(ev), headers=dict(ua, **{"Content-Type": "text/plain"}))


def test_sources():
    assert sa.classify_source("https://www.google.com/", "")["source"] == "Google खोज"
    assert sa.classify_source("android-app://com.whatsapp/", "")["source"] == "WhatsApp"
    assert sa.classify_source("", "")["source"].startswith("सीधे")
    assert sa.classify_source("https://www.bing.com/search?q=kundli+milan", "") == {"source": "Bing खोज", "query": "kundli milan"}
    assert sa.classify_source("https://shriramjiastro.in/patrika", "")["source"] == ""
    assert sa.classify_source("https://x.in", "instagram")["source"] == "Instagram"


def test_flow_and_admin():
    assert beacon({"k": "pv", "vid": "v1", "p": "/", "land": 1, "r": "https://www.google.com/", "d": "मोबाइल"}).status_code == 204
    beacon({"k": "pv", "vid": "v1", "p": "/patrika"})
    # a phone typed into the page is ignored; only a verified token links it
    beacon({"k": "identify", "vid": "v1", "ph": "9999999999"})
    beacon({"k": "dl", "vid": "v1", "p": "/patrika", "l": "पत्रिका · PDF"})
    beacon({"k": "identify", "vid": "v1", "tok": "mock_token_9876500001", "nm": "राम"})
    beacon({"k": "dl", "vid": "v1", "p": "/manglik-dosh-calculator", "l": "मंगल दोष · PDF डाउनलोड"})
    beacon({"k": "app", "vid": "v2", "p": "/", "l": "Android ऐप (APK)", "land": 1})
    beacon({"k": "pv", "vid": "v3", "p": "/", "land": 1}, ua={"User-Agent": "Googlebot/2.1"})
    beacon({"k": "nonsense", "vid": "v4"})

    assert client.get("/api/analytics/admin/summary?days=1").status_code == 401
    r = client.get("/api/analytics/admin/summary?days=1", headers=ADMIN)
    assert r.status_code == 200, r.text
    d = r.json()
    t = d["totals"]
    assert t["pageviews"] == 2 and t["visits"] == 1 and t["downloads"] == 2 and t["app_downloads"] == 1
    assert t["visitors"] == 2 and t["signed_in"] == 1
    assert d["sources"][0]["name"] == "Google खोज"
    phones = [e.get("ph") for e in d["download_events"]]
    assert "9876500001" in phones and "9999999999" not in phones
    p = d["people"][0]
    assert p["phone"] == "9876500001" and p["name"] == "राम" and p["download_count"] == 1
    # saved to the store
    sa.flush(force=True)
    assert sa.SutradharStore.get_doc(sa.DAY_COL, d["to"])["downloads_total"] == 2
