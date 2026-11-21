"""
Site translation: cached strings are translated once, unknown languages and other origins are refused.

Run: .venv/bin/python -m pytest -q test_site_i18n.py
"""
import os
import sys
import tempfile
import types

_tmp = tempfile.mkdtemp(prefix="site_i18n_")
os.environ["SUTRADHAR_TEST_MODE"] = "1"
os.environ["SUTRADHAR_DATA_DIR"] = _tmp
sys.modules.setdefault("razorpay", types.ModuleType("razorpay"))

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import site_i18n as si  # noqa: E402

app = FastAPI()
app.include_router(si.router)
client = TestClient(app)
calls = []


def fake_gemini(lang, texts):
    calls.append((lang, list(texts)))
    return [f"<{lang}:{len(t)}>" for t in texts]


def test_translate_once_and_cache(monkeypatch):
    monkeypatch.setattr(si, "_gemini", fake_gemini)
    r = client.post("/api/i18n/translate", json={"lang": "en", "texts": ["आपका नाम", "", "आपका नाम", "मात्र ₹251"]})
    assert r.status_code == 200, r.text
    assert r.json()["translations"] == ["<en:8>", "", "<en:8>", "<en:10>"]
    assert calls == [("en", ["आपका नाम", "मात्र ₹251"])]
    # second time: from the cache, no new call
    si._mem.clear()   # also survives a restart (stored through SutradharStore)
    r = client.post("/api/i18n/translate", json={"lang": "en", "texts": ["मात्र ₹251"]})
    assert r.json()["translations"] == ["<en:10>"] and len(calls) == 1
    # other language is a different entry
    client.post("/api/i18n/translate", json={"lang": "es", "texts": ["मात्र ₹251"]})
    assert calls[-1] == ("es", ["मात्र ₹251"])


def test_refusals():
    assert client.post("/api/i18n/translate", json={"lang": "xx", "texts": ["a"]}).status_code == 400
    assert client.post("/api/i18n/translate", json={"lang": "en", "texts": ["a"]},
                       headers={"Origin": "https://evil.example"}).status_code == 403
    assert client.post("/api/i18n/translate", json={"lang": "en", "texts": ["x"] * 61}).status_code == 422
