"""
Astrologer SaaS monthly plan (24 Nov 2026): ₹499 a month by Razorpay Subscription.
- OTP sign-in required; the plan belongs to the signed-in phone
- each paid month opens access to the period end + 3 days; never shortens a longer expiry
- Sutradhar gets 30% without GST (₹126) on every monthly payment, once per payment
- member can cancel: no further charge, the paid month keeps running

Run: .venv/bin/python -m pytest -q test_saas_monthly.py
"""
import os
import sys
import types
import tempfile
from datetime import datetime, timezone, timedelta

_tmp = tempfile.mkdtemp(prefix="saas_monthly_")
os.environ["SUTRADHAR_TEST_MODE"] = "1"
os.environ["SUTRADHAR_DATA_DIR"] = _tmp
os.environ["SRA_MASTER_TEST_PHONES"] = "9000000001"
os.environ["PAYOUT_MODE"] = "manual"

_fake_rzp = types.ModuleType("razorpay")


class _FailingClient:            # no network: every Razorpay call fails -> test ids are used
    def __init__(self, *a, **k):
        self.order = self.payment = self.plan = self.subscription = self

    def create(self, *a, **k):
        raise RuntimeError("offline test")

    def cancel(self, *a, **k):
        raise RuntimeError("offline test")


_fake_rzp.Client = _FailingClient
sys.modules["razorpay"] = _fake_rzp

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import sutradhar_engine as se  # noqa: E402

app = FastAPI()
app.include_router(se.router)
client = TestClient(app)
HOOK = {"X-Razorpay-Signature": "test_signature_bypass"}


def _auth(phone):
    return {"Authorization": f"Bearer mock_token_{phone}"}


def _lead(phone, sutra="SUTRA_M1"):
    lid = f"lead_{phone}"
    se.SutradharStore.set_doc("leads", lid, {
        "id": lid, "customer_phone": phone, "status": "active", "sutradhar_id": sutra, "sutradhar_code": sutra,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=72)).isoformat()})
    return lid


def _start(phone, name="पं. वर्मा"):
    r = client.post("/api/sutradhar/saas/monthly/start", headers=_auth(phone), json={"name": name})
    assert r.status_code == 200, r.text
    return r.json()["subscription_id"]


def _verify(phone, sub_id, pay_id):
    return client.post("/api/sutradhar/saas/monthly/verify", headers=_auth(phone), json={
        "razorpay_payment_id": pay_id, "razorpay_subscription_id": sub_id,
        "razorpay_signature": "test_signature_bypass"})


def _charged(sub_id, pay_id, end, amount=49900, status="active"):
    return client.post("/api/sutradhar/webhook/razorpay", headers=HOOK, json={
        "event": "subscription.charged",
        "payload": {"subscription": {"entity": {"id": sub_id, "status": status, "current_end": int(end.timestamp())}},
                    "payment": {"entity": {"id": pay_id, "amount": amount, "currency": "INR"}}}})


def _commissions(phone):
    return [c for c in se.SutradharStore.query_all("commissions") if c.get("customer_phone") == phone]


def test_price_and_commission():
    assert se.SERVICE_CATALOG["astrologer_saas_monthly"]["price"] == 499
    assert se.commission_for_payment("astrologer_saas_monthly", 499_00)["commission"] == 126
    assert not se.saas_unlockable("astrologer_saas_monthly")


def test_needs_sign_in():
    r = client.post("/api/sutradhar/saas/monthly/start", json={"name": "x"})
    assert r.status_code == 401


def test_not_sold_as_one_time_order():
    r = client.post("/api/sutradhar/orders/create", headers=_auth("9833300001"),
                    json={"customer_phone": "9833300001", "service_id": "astrologer_saas_monthly"})
    assert r.status_code == 400


def test_first_month_opens_access_and_pays_sutradhar_once():
    ph = "9833300002"
    _lead(ph)
    sub_id = _start(ph)
    r = _verify(ph, sub_id, "pay_m_1")
    assert r.status_code == 200, r.text
    sub = se.get_saas_subscriber(ph)
    assert se.saas_is_active(sub)
    left = datetime.fromisoformat(sub["expires_at"]) - datetime.now(timezone.utc)
    assert timedelta(days=32) < left <= timedelta(days=33)
    # the webhook for the same payment does not count it again
    end = datetime.now(timezone.utc) + timedelta(days=30)
    assert _charged(sub_id, "pay_m_1", end).json()["status"] == "ignored_duplicate"
    comms = _commissions(ph)
    assert len(comms) == 1 and comms[0]["amount"] == 126 and comms[0]["rate_percent"] == 30
    assert se.SutradharStore.get_doc("leads", f"lead_{ph}")["status"] == "converted"
    # desk shows the plan
    me = client.get("/api/sutradhar/desk/me", headers=_auth(ph)).json()
    assert me["allowed"] and me["monthly"]["status"] == "active"


def test_next_month_extends_to_period_end_plus_grace_and_pays_again():
    ph = "9833300003"
    _lead(ph)
    sub_id = _start(ph)
    _verify(ph, sub_id, "pay_m_a")
    end = datetime.now(timezone.utc) + timedelta(days=61)
    assert _charged(sub_id, "pay_m_b", end).json()["status"] == "success"
    sub = se.get_saas_subscriber(ph)
    assert abs(datetime.fromisoformat(sub["expires_at"]) - (end + timedelta(days=3))) < timedelta(seconds=2)
    assert sorted(c["amount"] for c in _commissions(ph)) == [126, 126]


def test_wrong_amount_is_not_counted():
    ph = "9833300004"
    sub_id = _start(ph)
    end = datetime.now(timezone.utc) + timedelta(days=30)
    assert _charged(sub_id, "pay_m_bad", end, amount=100).json()["status"] == "ignored_duplicate"
    assert not se.saas_is_active(se.get_saas_subscriber(ph))


def test_no_lead_no_commission_but_access():
    ph = "9833300005"
    sub_id = _start(ph)
    _verify(ph, sub_id, "pay_m_nolead")
    assert se.saas_is_active(se.get_saas_subscriber(ph))
    assert _commissions(ph) == []


def test_cancel_keeps_paid_month_and_stops_once():
    ph = "9833300006"
    sub_id = _start(ph)
    _verify(ph, sub_id, "pay_m_c1")
    before = se.get_saas_subscriber(ph)["expires_at"]
    r = client.post("/api/sutradhar/saas/monthly/cancel", headers=_auth(ph))
    assert r.status_code == 200, r.text
    assert r.json()["access_until"] == before
    assert se.get_saas_subscriber(ph)["monthly"]["cancel_requested"] is True
    assert client.post("/api/sutradhar/saas/monthly/cancel", headers=_auth(ph)).status_code == 404
    # after a cancel request a new plan may be started
    assert _start(ph)


def test_halted_keeps_expiry_and_second_start_blocked_while_active():
    ph = "9833300007"
    sub_id = _start(ph)
    _verify(ph, sub_id, "pay_m_h1")
    assert client.post("/api/sutradhar/saas/monthly/start", headers=_auth(ph), json={}).status_code == 409
    before = se.get_saas_subscriber(ph)["expires_at"]
    r = client.post("/api/sutradhar/webhook/razorpay", headers=HOOK, json={
        "event": "subscription.halted", "payload": {"subscription": {"entity": {"id": sub_id, "status": "halted"}}}})
    assert r.json()["subscription_status"] == "halted"
    sub = se.get_saas_subscriber(ph)
    assert sub["expires_at"] == before and sub["monthly"]["status"] == "halted"


def test_monthly_never_shortens_a_yearly_membership():
    ph = "9833300008"
    se.extend_saas_subscription(ph, "पं. जोशी", days=365, source="test")
    yearly = se.get_saas_subscriber(ph)["expires_at"]
    sub_id = _start(ph)
    _verify(ph, sub_id, "pay_m_y1")
    assert se.get_saas_subscriber(ph)["expires_at"] == yearly


def test_admin_pause_survives_status_events():
    ph = "9833300009"
    sub_id = _start(ph)
    _verify(ph, sub_id, "pay_m_p1")
    s = se.get_saas_subscriber(ph)
    s["status"] = "paused"
    se.SutradharStore.set_doc("saas_subscribers", ph, s)
    client.post("/api/sutradhar/webhook/razorpay", headers=HOOK, json={
        "event": "subscription.pending", "payload": {"subscription": {"entity": {"id": sub_id, "status": "pending"}}}})
    assert se.get_saas_subscriber(ph)["status"] == "paused"
