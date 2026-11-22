"""
Sutradhar rules of 18 Nov 2026:
- prices are GST-inclusive; commission = rate% of the price without GST (66 / 30 / 0), whole rupees
- only "JAI HANUMAN" (for listed signed-in test phones) changes a price: to Rs 1, never with commission
- payout on the 2nd working day after payment (Sundays, 2nd/4th Saturdays, holidays skipped), manual with UTR
- Sutradhar and admin routes need a verified sign-in

Run: .venv/bin/python -m pytest -q test_sutradhar_rules.py
"""
import os
import sys
import json
import types
import tempfile
from datetime import datetime, timezone, timedelta

_tmp = tempfile.mkdtemp(prefix="sutra_rules_")
os.environ["SUTRADHAR_TEST_MODE"] = "1"
os.environ["SUTRADHAR_DATA_DIR"] = _tmp
os.environ["SRA_MASTER_TEST_PHONES"] = "9000000001"
os.environ["SRA_ADMIN_EMAILS"] = "owner@test.in"
os.environ["PAYOUT_MODE"] = "manual"
os.environ["SUTRADHAR_HOLIDAYS_FILE"] = os.path.join(_tmp, "holidays.json")
with open(os.environ["SUTRADHAR_HOLIDAYS_FILE"], "w", encoding="utf-8") as f:
    json.dump({"holidays": [{"date": "2026-12-25", "name": "क्रिसमस"}]}, f)

# No network: a razorpay module whose order creation always fails -> simulated test order
_fake_rzp = types.ModuleType("razorpay")


class _FailingClient:
    def __init__(self, *a, **k):
        self.order = self
        self.payment = self

    def create(self, *a, **k):
        raise RuntimeError("offline test")

    def all(self, *a, **k):
        return {"items": []}


_fake_rzp.Client = _FailingClient
sys.modules["razorpay"] = _fake_rzp

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
import sutradhar_engine as se  # noqa: E402

app = FastAPI()
app.include_router(se.router)
client = TestClient(app)

SUTRA_PHONE = "9811100001"
CUST_PHONE = "9822200002"
SUTRA = {"Authorization": f"Bearer mock_token_{SUTRA_PHONE}"}
CUST = {"Authorization": f"Bearer mock_token_{CUST_PHONE}"}
ADMIN = {"Authorization": "Bearer mock_admin_owner@test.in"}
WEBHOOK_HDR = {"X-Razorpay-Signature": "test_signature_bypass"}


def _capture(order_id, paise, payment_id):
    return client.post("/api/sutradhar/webhook/razorpay", headers=WEBHOOK_HDR, json={
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"id": payment_id, "order_id": order_id, "amount": paise}}},
    })


def test_commission_math():
    assert se.commission_for_payment("mangal_dosha", 251_00)["commission"] == 140
    assert se.commission_for_payment("mangal_dosha", 501_00)["commission"] == 280
    assert se.commission_for_payment("gun_milan_manglik", 1101_00)["commission"] == 615
    assert se.commission_for_payment("muhurta_vivah", 2100_00)["commission"] == 1174
    assert se.commission_for_payment("parashara_report", 1111_00)["commission"] == 621
    assert se.commission_for_payment("consultation_gurukul", 24000_00)["commission"] == 6101
    assert se.commission_for_payment("astrologer_saas", 5100_00)["commission"] == 2852
    assert se.commission_for_payment("astrologer_saas_renewal", 5100_00)["commission"] == 1296
    assert se.commission_for_payment("consultation_acharya", 5100_00)["commission"] == 0
    c = se.commission_for_payment("manglik_dosha", 251_00)  # old alias
    assert c["service_id"] == "mangal_dosha" and c["gst_amount"] == 38.29


def _ist(y, m, d, h=12):
    return datetime(y, m, d, h, tzinfo=se.IST).astimezone(timezone.utc)


def test_payout_due_dates():
    assert se.payout_due_date_for(_ist(2026, 11, 16)) == "2026-11-18"  # Mon -> Wed
    assert se.payout_due_date_for(_ist(2026, 11, 20)) == "2026-11-23"  # Fri -> Sat(3rd, working), skip Sun -> Mon
    assert se.payout_due_date_for(_ist(2026, 11, 13)) == "2026-11-17"  # Fri -> skip 2nd Sat, Sun -> Mon, Tue
    assert se.payout_due_date_for(_ist(2026, 12, 24)) == "2026-12-29"  # Christmas, 4th Sat, Sun skipped
    assert se.payout_due_date_for(_ist(2026, 11, 22, 23)) == "2026-11-24"  # Sunday 11 PM IST
    # 1 AM IST on Tuesday is still Tuesday in India (Monday in UTC)
    assert se.payout_due_date_for(_ist(2026, 11, 17, 1)) == "2026-11-19"


def test_routes_need_sign_in():
    assert client.post("/api/sutradhar/leads/add", json={"customer_phone": CUST_PHONE}).status_code == 401
    assert client.get("/api/sutradhar/summary").status_code == 401
    assert client.get("/api/sutradhar/login?phone=" + SUTRA_PHONE).status_code == 401
    assert client.get("/api/sutradhar/admin/reviews").status_code == 401
    assert client.get("/api/sutradhar/admin/payouts").status_code == 401
    wrong = {"Authorization": "Bearer mock_admin_someone@else.in"}
    assert client.get("/api/sutradhar/admin/payouts", headers=wrong).status_code == 401
    assert client.post("/api/sutradhar/payouts/process").status_code == 401
    # cannot register someone else's number
    r = client.post("/api/sutradhar/register", headers=SUTRA, json={"name": "x", "phone": "9999999999"})
    assert r.status_code == 403


def test_quote_rules():
    q = client.post("/api/sutradhar/quote", json={"customer_phone": CUST_PHONE, "service_id": "mangal_dosha"}).json()
    assert q["net_price"] == 501 and q["is_test"] is False
    q = client.post("/api/sutradhar/quote", json={"customer_phone": CUST_PHONE, "service_id": "mangal_dosha",
                                                   "input_code": "SRA123ABC"}).json()
    assert q["net_price"] == 501 and q["code_status"] == "invalid" and q["message"] == "कोड अमान्य है।"
    # master code without the listed signed-in phone: full price
    q = client.post("/api/sutradhar/quote", headers=CUST, json={"customer_phone": "9000000001",
                    "service_id": "muhurta_vivah", "input_code": "JAI HANUMAN"}).json()
    assert q["net_price"] == 2100 and q["code_status"] == "invalid" and q["message"] == "कोड अमान्य है।"
    # master code with the listed signed-in phone: Rs 1
    owner = {"Authorization": "Bearer mock_token_9000000001"}
    q = client.post("/api/sutradhar/quote", headers=owner, json={"customer_phone": "9000000001",
                    "service_id": "muhurta_vivah", "input_code": "jai_hanuman"}).json()
    assert q["net_price"] == 1 and q["is_test"] is True
    assert client.post("/api/sutradhar/quote", json={"customer_phone": CUST_PHONE,
                       "service_id": "free_stuff"}).status_code == 400


def test_full_flow_lead_payment_payout():
    r = client.post("/api/sutradhar/register", headers=SUTRA,
                    json={"name": "रमेश", "phone": SUTRA_PHONE, "upi_id": "ramesh@okhdfcbank"})
    assert r.status_code == 200, r.text
    sid = r.json()["sutradhar"]["id"]
    assert client.get("/api/sutradhar/login", headers=SUTRA).json()["sutradhar"]["id"] == sid

    r = client.post("/api/sutradhar/leads/add", headers=SUTRA,
                    json={"customer_phone": CUST_PHONE, "customer_name": "ग्राहक", "sutradhar_id": "SOMEONE-ELSE"})
    assert r.status_code == 200, r.text
    assert "66%" in r.json()["message"]

    # report bought inside 72h -> 66% of price without GST
    o = client.post("/api/sutradhar/orders/create", headers=CUST,
                    json={"customer_phone": CUST_PHONE, "service_id": "muhurta_vivah"}).json()
    assert o["amount"] == 2100_00 and o["sutradhar_code"]
    w = _capture(o["order_id"], 2100_00, "pay_vivah_1").json()
    assert w["commission_created"] is True
    comm = se.SutradharStore.get_doc("commissions", "comm_pay_vivah_1")
    assert comm["amount"] == 1174 and comm["sutradhar_id"] == sid and comm["status"] == "created"
    assert comm["payout_due_date"] == se.payout_due_date_for(datetime.now(timezone.utc))
    # duplicate webhook: still one commission
    assert _capture(o["order_id"], 2100_00, "pay_vivah_1").json()["commission_created"] is False

    # consultation by the same lead: no commission
    o2 = client.post("/api/sutradhar/orders/create", headers=CUST,
                     json={"customer_phone": CUST_PHONE, "service_id": "consultation_acharya"}).json()
    assert _capture(o2["order_id"], 5100_00, "pay_consult_1").json()["commission_created"] is False

    # Sutradhar dashboard
    s = client.get("/api/sutradhar/summary", headers=SUTRA).json()
    assert s["pending_payout"] == 1174 and s["today_commission"] == 1174
    assert s["next_payouts"][0]["date"] == comm["payout_due_date"]
    leads = client.get("/api/sutradhar/leads/list", headers=SUTRA).json()["leads"]
    assert leads[0]["commission_amount"] == 1174

    # Admin desk: not due today, due on its date
    desk = client.get("/api/sutradhar/admin/payouts", headers=ADMIN).json()
    assert desk["due_total"] == 0 and desk["upcoming"][0]["total"] == 1174
    desk = client.get(f"/api/sutradhar/admin/payouts?date={comm['payout_due_date']}", headers=ADMIN).json()
    g = desk["due"][0]
    assert g["sutradhar_id"] == sid and g["total"] == 1174 and g["upi_id"] == "ramesh@okhdfcbank"

    bad = client.post("/api/sutradhar/admin/payouts/mark-paid", headers=ADMIN,
                      json={"sutradhar_id": sid, "commission_ids": ["comm_pay_vivah_1"], "utr": "12"})
    assert bad.status_code == 400
    paid = client.post("/api/sutradhar/admin/payouts/mark-paid", headers=ADMIN,
                       json={"sutradhar_id": sid, "commission_ids": ["comm_pay_vivah_1"], "utr": "UTR 6612 3456 78"}).json()
    assert paid["total_paid"] == 1174 and paid["closed"] == ["comm_pay_vivah_1"]
    again = client.post("/api/sutradhar/admin/payouts/mark-paid", headers=ADMIN,
                        json={"sutradhar_id": sid, "commission_ids": ["comm_pay_vivah_1"], "utr": "UTR661234"}).json()
    assert again["closed"] == [] and again["total_paid"] == 0
    s = client.get("/api/sutradhar/summary", headers=SUTRA).json()
    assert s["paid_commission"] == 1174 and s["pending_payout"] == 0


def test_master_code_payment_earns_nothing():
    owner_phone = "9000000001"
    owner = {"Authorization": f"Bearer mock_token_{owner_phone}"}
    r = client.post("/api/sutradhar/leads/add", headers=SUTRA, json={"customer_phone": owner_phone})
    assert r.status_code == 200, r.text
    o = client.post("/api/sutradhar/orders/create", headers=owner,
                    json={"customer_phone": owner_phone, "service_id": "mega_parashara", "input_code": "JAI HANUMAN"}).json()
    assert o["amount"] == 100 and o["is_test"] is True and not o["sutradhar_code"]
    w = _capture(o["order_id"], 100, "pay_master_1").json()
    assert w["commission_created"] is False
    assert se.SutradharStore.get_doc("commissions", "comm_pay_master_1") is None


def test_holiday_admin_edit():
    r = client.post("/api/sutradhar/admin/holidays", headers=ADMIN, json={"date": "2026-11-19", "name": "टेस्ट अवकाश"})
    assert r.status_code == 200
    assert se.payout_due_date_for(_ist(2026, 11, 17)) == "2026-11-20"  # Wed 18, skip Thu 19, Fri 20
    client.post("/api/sutradhar/admin/holidays", headers=ADMIN, json={"date": "2026-11-19", "remove": True})
    assert se.payout_due_date_for(_ist(2026, 11, 17)) == "2026-11-19"


# ---------------------------------------------------------------------------
# Astrologer SaaS: own login number as code, active subscription, 2 phones max
# ---------------------------------------------------------------------------
PANDIT = "9833300003"
PANDIT_HDR = {"Authorization": f"Bearer mock_token_{PANDIT}"}
OTHER_HDR = {"Authorization": "Bearer mock_token_9844400004"}


def _redeem(headers, code, device, service="muhurta_vivah"):
    return client.post("/api/sutradhar/saas/redeem", headers=headers,
                       json={"service_id": service, "code": code, "device_id": device}).json()


def test_saas_own_number_unlocks_only_for_subscriber():
    # not a subscriber yet: same reply as any wrong code
    assert _redeem(PANDIT_HDR, PANDIT, "devAAAA1111") == {"ok": False, "message": "कोड अमान्य है।"}
    r = client.post("/api/sutradhar/admin/saas", headers=ADMIN, json={"phone": PANDIT, "name": "पं. शर्मा", "add_days": 365})
    assert r.status_code == 200 and r.json()["subscriber"]["active"] is True
    # own number while signed in with it: unlocks
    assert _redeem(PANDIT_HDR, "+91 98333 00003", "devAAAA1111")["ok"] is True
    # someone else signed in, types the pandit's number: invalid
    assert _redeem(OTHER_HDR, PANDIT, "devZZZZ9999")["message"] == "कोड अमान्य है।"
    # not signed in at all: invalid
    assert _redeem({}, PANDIT, "devAAAA1111")["ok"] is False
    # consultation / course are not part of SaaS
    assert _redeem(PANDIT_HDR, PANDIT, "devAAAA1111", "consultation_acharya")["ok"] is False


def test_saas_two_device_limit_and_reset():
    assert _redeem(PANDIT_HDR, PANDIT, "devBBBB2222")["ok"] is True   # 2nd phone
    assert _redeem(PANDIT_HDR, PANDIT, "devAAAA1111")["ok"] is True   # known phone again
    third = _redeem(PANDIT_HDR, PANDIT, "devCCCC3333")
    assert third["ok"] is False and "2 फ़ोन" in third["message"]
    client.post("/api/sutradhar/admin/saas", headers=ADMIN, json={"phone": PANDIT, "reset_devices": True})
    assert _redeem(PANDIT_HDR, PANDIT, "devCCCC3333")["ok"] is True
    lst = client.get("/api/sutradhar/admin/saas", headers=ADMIN).json()
    me = next(s for s in lst["subscribers"] if s["phone"] == PANDIT)
    assert len(me["devices"]) == 1 and me["uses_this_month"] >= 4


def test_saas_owner_number_has_no_device_limit():
    owner = {"Authorization": "Bearer mock_token_9000000001"}
    for i in range(5):
        assert _redeem(owner, "9000000001", f"ownerdev{i:04d}")["ok"] is True


def test_saas_paused_and_expired():
    client.post("/api/sutradhar/admin/saas", headers=ADMIN, json={"phone": PANDIT, "status": "paused"})
    assert "रुका" in _redeem(PANDIT_HDR, PANDIT, "devCCCC3333")["message"]
    client.post("/api/sutradhar/admin/saas", headers=ADMIN,
                json={"phone": PANDIT, "status": "active", "expires_at": "2020-01-01"})
    assert "समाप्त" in _redeem(PANDIT_HDR, PANDIT, "devCCCC3333")["message"]


def test_saas_payment_creates_subscription_once():
    buyer = "9855500005"
    hdr = {"Authorization": f"Bearer mock_token_{buyer}"}
    o = client.post("/api/sutradhar/orders/create", headers=hdr,
                    json={"customer_phone": buyer, "service_id": "astrologer_saas", "customer_name": "पं. वर्मा"}).json()
    _capture(o["order_id"], 5100_00, "pay_saas_1")
    _capture(o["order_id"], 5100_00, "pay_saas_1")  # duplicate webhook must not add a second year
    sub = se.get_saas_subscriber(buyer)
    days = (datetime.fromisoformat(sub["expires_at"]) - datetime.now(timezone.utc)).days
    assert sub["status"] == "active" and 363 <= days <= 365
    assert _redeem(hdr, buyer, "buyerdev0001")["ok"] is True


# ---- report unlock: a paid report opens only with a server-confirmed pass ----
def _sig(order_id, payment_id):
    import hashlib, hmac
    return hmac.new(se.RAZORPAY_KEY_SECRET.encode(), f"{order_id}|{payment_id}".encode(), hashlib.sha256).hexdigest()


def test_report_unlock_needs_real_payment():
    o = client.post("/api/sutradhar/orders/create", headers=CUST,
                    json={"customer_phone": CUST_PHONE, "service_id": "kaalsarp_dosha"}).json()
    oid, ref = o["order_id"], "kundali_A"
    base = {"service_id": "kaalsarp_dosha", "report_ref": ref}
    # no receipt, forged signature, or a receipt for another service: no pass
    assert not client.post("/api/sutradhar/unlock/verify", json=base).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/verify", json={**base, "order_id": oid, "payment_id": "pay_1", "signature": "0" * 64}).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/verify", json={**base, "service_id": "mangal_dosha", "order_id": oid, "payment_id": "pay_1", "signature": _sig(oid, "pay_1")}).json()["ok"]
    # genuine Razorpay receipt: pass for this kundali
    r = client.post("/api/sutradhar/unlock/verify", json={**base, "order_id": oid, "payment_id": "pay_1", "signature": _sig(oid, "pay_1")}).json()
    assert r["ok"] and r["proof"] == f"pay:{oid}"
    chk = {"service_id": "kaalsarp_dosha", "report_ref": ref, "proof": r["proof"], "token": r["token"]}
    assert client.post("/api/sutradhar/unlock/check", json=chk).json()["ok"]
    # the same payment cannot open another kundali, and a made-up pass is refused
    assert not client.post("/api/sutradhar/unlock/verify", json={**base, "report_ref": "kundali_B", "order_id": oid, "payment_id": "pay_1", "signature": _sig(oid, "pay_1")}).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/check", json={**chk, "report_ref": "kundali_B"}).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/check", json={**chk, "token": "f" * 64}).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/check", json={**chk, "proof": "pay:order_made_up"}).json()["ok"]
    # a refunded order stops opening the report
    order = se.SutradharStore.get_doc("orders", oid); order["status"] = "refunded"; se.SutradharStore.set_doc("orders", oid, order)
    assert not client.post("/api/sutradhar/unlock/check", json=chk).json()["ok"]


def test_report_unlock_by_saas_code():
    r = client.post("/api/sutradhar/saas/redeem", headers={"Authorization": "Bearer mock_token_9000000001"},
                    json={"service_id": "kaalsarp_dosha", "code": "9000000001", "device_id": "dev_test_0001", "report_ref": "kundali_S"}).json()
    assert r["ok"], r
    v = client.post("/api/sutradhar/unlock/verify", json={"service_id": "kaalsarp_dosha", "report_ref": "kundali_S", "unlock_id": r["unlock_id"]}).json()
    assert v["ok"]
    assert client.post("/api/sutradhar/unlock/check", json={"service_id": "kaalsarp_dosha", "report_ref": "kundali_S", "proof": v["proof"], "token": v["token"]}).json()["ok"]
    # that SaaS unlock was for kundali_S only
    assert not client.post("/api/sutradhar/unlock/verify", json={"service_id": "kaalsarp_dosha", "report_ref": "kundali_T", "unlock_id": r["unlock_id"]}).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/verify", json={"service_id": "kaalsarp_dosha", "report_ref": "kundali_S", "unlock_id": "use_made_up"}).json()["ok"]


def test_muhurta_unlock_is_a_timed_session():
    import time as _t
    o = client.post("/api/sutradhar/orders/create", headers=CUST,
                    json={"customer_phone": CUST_PHONE, "service_id": "muhurta_vivah"}).json()
    oid, ref = o["order_id"], "muhurta_dev_ABC123"
    rec = {"service_id": "muhurta_vivah", "report_ref": ref, "order_id": oid, "payment_id": "pay_m1", "signature": _sig(oid, "pay_m1")}
    r = client.post("/api/sutradhar/unlock/verify", json=rec).json()
    assert r["ok"] and 19 * 60 <= r["exp"] - _t.time() <= 20 * 60
    chk = {"service_id": "muhurta_vivah", "report_ref": ref, "proof": r["proof"], "token": r["token"], "exp": r["exp"]}
    assert client.post("/api/sutradhar/unlock/check", json=chk).json()["ok"]
    # the same receipt again gives the same end, not a fresh 20 minutes
    assert client.post("/api/sutradhar/unlock/verify", json=rec).json()["exp"] == r["exp"]
    # stretching the expiry in the browser breaks the pass; so does dropping it
    assert not client.post("/api/sutradhar/unlock/check", json={**chk, "exp": r["exp"] + 3600}).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/check", json={**chk, "exp": None}).json()["ok"]
    # another browser cannot use the receipt
    assert not client.post("/api/sutradhar/unlock/verify", json={**rec, "report_ref": "muhurta_dev_OTHER"}).json()["ok"]
    # once the session time is over the pass and the receipt stop working
    order = se.SutradharStore.get_doc("orders", oid); order["unlock_expires_at"] = int(_t.time()) - 1; se.SutradharStore.set_doc("orders", oid, order)
    chk_old = {**chk, "exp": order["unlock_expires_at"], "token": se._unlock_token("muhurta_vivah", ref, r["proof"], order["unlock_expires_at"])}
    assert not client.post("/api/sutradhar/unlock/check", json=chk_old).json()["ok"]
    assert not client.post("/api/sutradhar/unlock/verify", json=rec).json()["ok"]


def test_muhurta_saas_session():
    r = client.post("/api/sutradhar/saas/redeem", headers={"Authorization": "Bearer mock_token_9000000001"},
                    json={"service_id": "muhurta_vastu", "code": "9000000001", "device_id": "dev_test_0001", "report_ref": "muhurta_dev_S1"}).json()
    assert r["ok"], r
    v = client.post("/api/sutradhar/unlock/verify", json={"service_id": "muhurta_vastu", "report_ref": "muhurta_dev_S1", "unlock_id": r["unlock_id"]}).json()
    assert v["ok"] and v["exp"]
    assert client.post("/api/sutradhar/unlock/check", json={"service_id": "muhurta_vastu", "report_ref": "muhurta_dev_S1", "proof": v["proof"], "token": v["token"], "exp": v["exp"]}).json()["ok"]


def test_owner_key_unlock_is_checked_by_the_server(monkeypatch):
    import hashlib as _h
    h = se.MASTER_KEY_SALT + "TESTKEY9"
    for _ in range(se.MASTER_KEY_ROUNDS):
        h = _h.sha256(h.encode()).hexdigest()
    monkeypatch.setattr(se, "MASTER_KEY_HASH", h)
    se._admin_key_failures.clear()
    base = {"service_id": "parashara_report", "report_ref": "_admin_session"}
    assert not client.post("/api/sutradhar/unlock/verify", json={**base, "admin_key": "WRONGKEY"}).json()["ok"]
    v = client.post("/api/sutradhar/unlock/verify", json={**base, "admin_key": "testkey9"}).json()
    assert v["ok"] and v["proof"].startswith("admin:") and v["exp"]
    chk = {**base, "proof": v["proof"], "token": v["token"], "exp": v["exp"]}
    assert client.post("/api/sutradhar/unlock/check", json=chk).json()["ok"]
    # the pass is for this service only
    assert not client.post("/api/sutradhar/unlock/check", json={**chk, "service_id": "muhurta_vivah"}).json()["ok"]
    # too many wrong keys from one client: even the right key waits
    for _ in range(se._ADMIN_FAIL_LIMIT):
        client.post("/api/sutradhar/unlock/verify", json={**base, "admin_key": "WRONGKEY"})
    assert not client.post("/api/sutradhar/unlock/verify", json={**base, "admin_key": "TESTKEY9"}).json()["ok"]
    se._admin_key_failures.clear()


def test_admin_sutradhar_list_and_pause():
    new_phone = "9833300003"
    hdr = {"Authorization": f"Bearer mock_token_{new_phone}"}
    # OTP done but not registered yet -> shows as unfinished
    assert client.get("/api/sutradhar/login", headers=hdr).status_code == 404
    assert client.get("/api/sutradhar/admin/sutradhars").status_code == 401
    d = client.get("/api/sutradhar/admin/sutradhars", headers=ADMIN).json()
    assert new_phone in [u["phone"] for u in d["unfinished"]]
    # registers -> listed as joined, gone from unfinished
    assert client.post("/api/sutradhar/register", headers=hdr, json={"name": "नया सूत्रधार", "phone": new_phone}).status_code == 200
    assert client.get("/api/sutradhar/login", headers=hdr).status_code == 200
    d = client.get("/api/sutradhar/admin/sutradhars", headers=ADMIN).json()
    me = next(u for u in d["sutradhars"] if u["phone"] == new_phone)
    assert me["state"] == "joined" and me["last_login_at"] and me["login_count"] == 1
    assert new_phone not in [u["phone"] for u in d["unfinished"]]
    # the earlier full-flow Sutradhar has a sale
    if any(u["phone"] == SUTRA_PHONE for u in d["sutradhars"]):
        s1 = next(u for u in d["sutradhars"] if u["phone"] == SUTRA_PHONE)
        assert s1["leads_total"] >= 1
    # pause blocks the portal, activate restores it
    r = client.post("/api/sutradhar/admin/sutradhars", headers=ADMIN, json={"sutradhar_id": me["sutradhar_id"], "status": "paused"})
    assert r.status_code == 200
    assert client.get("/api/sutradhar/login", headers=hdr).status_code == 403
    client.post("/api/sutradhar/admin/sutradhars", headers=ADMIN, json={"sutradhar_id": me["sutradhar_id"], "status": "active", "upi_verified": True})
    assert client.get("/api/sutradhar/login", headers=hdr).status_code == 200
    d = client.get("/api/sutradhar/admin/sutradhars", headers=ADMIN).json()
    assert next(u for u in d["sutradhars"] if u["phone"] == new_phone)["upi_verified"] is True


def test_course_batch_eleven_seats():
    os.environ["COURSE_REGISTRATION_OPENS"] = "2099-01-01"
    r = client.post("/api/sutradhar/orders/create", json={"customer_phone": "9700000000", "service_id": "consultation_gurukul", "batch_id": "batch_morning"})
    assert r.status_code == 403                                   # before 26 Dec: closed
    os.environ["COURSE_REGISTRATION_OPENS"] = "2020-01-01"
    assert client.post("/api/sutradhar/orders/create", json={"customer_phone": "9700000000", "service_id": "consultation_gurukul"}).status_code == 400
    orders = []
    for i in range(11):
        r = client.post("/api/sutradhar/orders/create", json={"customer_phone": f"97000000{i:02d}", "customer_name": f"छात्र {i}",
                                                              "service_id": "consultation_gurukul", "batch_id": "batch_morning"})
        assert r.status_code == 200, r.text
        orders.append(r.json())
    # the 12th person cannot even start paying for the morning batch
    r12 = client.post("/api/sutradhar/orders/create", json={"customer_phone": "9700000099", "service_id": "consultation_gurukul", "batch_id": "batch_morning"})
    assert r12.status_code == 409
    b = {x["id"]: x for x in client.get("/api/sutradhar/course/batches").json()["batches"]}
    assert b["batch_morning"]["full"] and b["batch_morning"]["left"] == 0 and b["batch_evening"]["left"] == 11
    # retrying with the same number replaces its own hold instead of taking a 2nd seat
    again = client.post("/api/sutradhar/orders/create", json={"customer_phone": "9700000000", "service_id": "consultation_gurukul", "batch_id": "batch_morning"})
    assert again.status_code == 200
    orders[0] = again.json()
    for i, o in enumerate(orders):
        assert _capture(o["order_id"], o["amount"], f"pay_course_{i}").status_code == 200
    # a 12th payment that slips through (expired hold) is refunded, never seated
    late = se.SutradharStore.get_doc("orders", orders[1]["order_id"])
    late = dict(late, order_id="order_late", id="order_late", seat_id="seat_late", customer_phone="9700000098")
    se.SutradharStore.set_doc("orders", "order_late", late)
    se.SutradharStore.set_doc("course_seats", "seat_late", {"id": "seat_late", "batch_id": "batch_morning", "phone": "9700000098",
                                                             "status": "held", "held_until": "2000-01-01T00:00:00+00:00"})
    r = _capture("order_late", late["net_amount_paise"], "pay_late")
    assert r.json()["status"] == "refunded_batch_full"
    admin = client.get("/api/sutradhar/admin/course", headers=ADMIN).json()
    morning = next(x for x in admin["batches"] if x["id"] == "batch_morning")
    assert len(morning["paid"]) == 11 and len(morning["refunds"]) == 1
    # interest list before opening
    assert client.post("/api/sutradhar/course/interest", json={"name": "सीमा", "phone": "9711111111", "batch_id": "batch_evening"}).status_code == 200
    assert any(x["phone"] == "9711111111" for x in client.get("/api/sutradhar/admin/course", headers=ADMIN).json()["interest"])
    os.environ.pop("COURSE_REGISTRATION_OPENS", None)


def test_sutradhar_script_reminders():
    phone = "9844400004"
    hdr = {"Authorization": f"Bearer mock_token_{phone}"}
    client.post("/api/sutradhar/register", headers=hdr, json={"name": "स्मरण", "phone": phone})
    assert client.post("/api/sutradhar/push/subscribe", headers=hdr, json={"subscription": {"endpoint": "http://x"}}).status_code == 400
    sub = {"endpoint": "https://push.example/abc", "keys": {"p256dh": "k", "auth": "a"}}
    r = client.post("/api/sutradhar/push/subscribe", headers=hdr, json={"subscription": sub})
    assert r.status_code == 200 and r.json()["push_on"] is True
    assert client.get("/api/sutradhar/push/config").json()["today"]["url"].startswith("/sutradhar.html?tab=scripts")
    sent = []
    old = se.send_sutra_push
    se.send_sutra_push = lambda s, m: (sent.append((s["endpoint"], m["script"])), "sent")[1]
    os.environ["VAPID_PUBLIC_KEY"], os.environ["VAPID_PRIVATE_KEY"] = "pub", "priv"
    try:
        res = se.run_sutra_reminders("2026-11-22")
        assert res["sent"] >= 1 and ("https://push.example/abc", se.script_of_the_day("2026-11-22")["script"]) in sent
        n = len(sent)
        se.run_sutra_reminders("2026-11-22")          # once a day only
        assert len(sent) == n
        se.run_sutra_reminders("2026-11-23")          # next day: next script
        assert sent[-1][1] != sent[n - 1][1]
    finally:
        se.send_sutra_push = old
        os.environ.pop("VAPID_PUBLIC_KEY", None); os.environ.pop("VAPID_PRIVATE_KEY", None)


def test_sutradhar_inactive_after_30_days():
    phone = "9855500005"
    hdr = {"Authorization": f"Bearer mock_token_{phone}"}
    client.post("/api/sutradhar/register", headers=hdr, json={"name": "पुराना", "phone": phone})
    me = next(s for s in se.SutradharStore.query_all("sutradhars") if s.get("phone") == phone)
    me = dict(me, created_at="2026-01-01T00:00:00+00:00")
    se.SutradharStore.set_doc("sutradhars", me["id"], me)
    d = client.get("/api/sutradhar/admin/sutradhars", headers=ADMIN).json()
    row = next(u for u in d["sutradhars"] if u["phone"] == phone)
    assert row["group"] == "inactive" and row["days_idle"] >= 30 and d["inactive_count"] >= 1
    # a fresh lead makes him active again
    client.post("/api/sutradhar/leads/add", headers=hdr, json={"customer_phone": "9866600006", "customer_name": "ग्राहक"})
    d = client.get("/api/sutradhar/admin/sutradhars", headers=ADMIN).json()
    assert next(u for u in d["sutradhars"] if u["phone"] == phone)["group"] == "active"


def test_sutradhar_activity_for_admin():
    phone, cust = "9844400004", "9855500005"
    hdr = {"Authorization": f"Bearer mock_token_{phone}"}
    assert client.post("/api/sutradhar/register", headers=hdr, json={"name": "कामकाजी", "phone": phone}).status_code == 200
    sid = client.get("/api/sutradhar/login", headers=hdr).json()["sutradhar"]["id"]
    for kind, detail in [("tab", "scripts"), ("script_open", "vivah"), ("script_copy", "vivah"), ("script_copy", "vivah"),
                         ("task", "d2-1"), ("task", "d1-1")]:
        assert client.post("/api/sutradhar/activity", headers=hdr, json={"kind": kind, "detail": detail}).status_code == 200
    assert client.post("/api/sutradhar/activity", headers=hdr, json={"kind": "open"}).status_code == 400
    assert client.post("/api/sutradhar/activity", json={"kind": "tab", "detail": "home"}).status_code == 401
    assert client.post("/api/sutradhar/leads/add", headers=hdr, json={"customer_phone": cust, "customer_name": "सीता"}).status_code == 200
    o = client.post("/api/sutradhar/orders/create", headers={"Authorization": f"Bearer mock_token_{cust}"},
                    json={"customer_phone": cust, "service_id": "muhurta_vivah"}).json()
    assert _capture(o["order_id"], 2100_00, "pay_act_1").json()["commission_created"] is True

    url = f"/api/sutradhar/admin/sutradhar-activity?sutradhar_id={sid}"
    assert client.get(url).status_code == 401
    d = client.get(url, headers=ADMIN).json()
    m = d["summary"]
    assert m["leads_total"] == 1 and m["leads_sold"] == 1 and m["conversion_pct"] == 100 and m["sales"] == 1
    assert m["portal_days_30"] == 1 and m["opens_30"] == 1 and m["script_copies_30"] == 2 and m["script_opens_30"] == 1
    assert d["leads"][0]["outcome"] == "sale" and d["leads"][0]["name"] == "सीता"
    types_ = [e["type"] for e in d["timeline"]]
    assert {"joined", "lead", "sale", "portal"} <= set(types_)
    portal = next(e for e in d["timeline"] if e["type"] == "portal")
    assert "विवाह मिलान स्क्रिप्ट ×2" in portal["text"]
    assert "21-दिन के काम पूरे: दिन 1 काम 1, दिन 2 काम 1" in portal["text"]


def test_consultant_desk_needs_saas_and_client_sees_remedies():
    astro, client_ph, other = "9866600006", "9877700007", "9888800008"
    A = {"Authorization": f"Bearer mock_token_{astro}"}
    C = {"Authorization": f"Bearer mock_token_{client_ph}"}
    O = {"Authorization": f"Bearer mock_token_{other}"}
    assert client.get("/api/sutradhar/desk/me").status_code == 401
    assert client.get("/api/sutradhar/desk/me", headers=A).json()["allowed"] is False
    assert client.get("/api/sutradhar/desk/clients", headers=A).status_code == 403
    # admin adds the astrologer to SaaS -> desk opens
    r = client.post("/api/sutradhar/admin/saas", headers=ADMIN, json={"phone": astro, "name": "पं. शर्मा", "add_days": 365})
    assert r.status_code == 200, r.text
    me = client.get("/api/sutradhar/desk/me", headers=A).json()
    assert me["allowed"] is True and me["plan"] == "saas"
    assert client.post("/api/sutradhar/desk/clients", headers=A, json={"phone": client_ph, "name": "सीता", "dob": "1990-01-01"}).status_code == 200
    r = client.post("/api/sutradhar/desk/remedies", headers=A, json={"client_phone": client_ph, "remedies": [
        {"id": "rx_1", "title": "हनुमान चालीसा", "category": "पाठ", "count": "11 बार", "days": "40 दिन", "timing": "सायं"},
        {"title": ""}]})
    assert r.status_code == 200 and len(r.json()["remedies"]) == 1
    # the client sees it with their own number; another number does not
    mine = client.get("/api/sutradhar/desk/my-remedies", headers=C).json()["sets"]
    assert mine[0]["consultant_name"] == "पं. शर्मा" and mine[0]["remedies"][0]["title"] == "हनुमान चालीसा"
    assert client.get("/api/sutradhar/desk/my-remedies", headers=O).json()["sets"] == []
    assert client.post("/api/sutradhar/desk/sankalp", headers=O, json={"consultant_phone": astro, "remedy_id": "rx_1"}).status_code == 404
    # the client ticks; the consultant sees today's tick
    assert client.post("/api/sutradhar/desk/sankalp", headers=C, json={"consultant_phone": astro, "remedy_id": "rx_1"}).json()["done_today"] == ["rx_1"]
    row = client.get("/api/sutradhar/desk/clients", headers=A).json()["clients"][0]
    assert row["done_today"] == ["rx_1"] and row["week"][-1]["done"] == 1
    # another astrologer without SaaS cannot see or write
    assert client.post("/api/sutradhar/desk/remedies", headers=O, json={"client_phone": client_ph, "remedies": []}).status_code == 403
    # subscription paused -> desk closed, data kept
    client.post("/api/sutradhar/admin/saas", headers=ADMIN, json={"phone": astro, "status": "paused"})
    assert client.get("/api/sutradhar/desk/clients", headers=A).status_code == 403
    assert client.get("/api/sutradhar/desk/my-remedies", headers=C).json()["sets"]
    assert client.get("/api/sutradhar/admin/desk", headers=ADMIN).json()["consultants"][0]["clients"] == 1


def test_offer_link_makes_the_sutradhar_lead():
    s_phone, buyer, taken = "9811100011", "9822200022", "9833300033"
    s_hdr = {"Authorization": f"Bearer mock_token_{s_phone}"}
    r = client.post("/api/sutradhar/register", headers=s_hdr, json={"name": "लिंक सूत्रधार", "phone": s_phone, "upi_id": "link@okaxis"})
    assert r.status_code == 200, r.text
    me = r.json()["sutradhar"]
    code = (me.get("code") or me["id"]).replace("-", "")

    # a customer with no lead pays through the shared link -> lead + commission for the link's Sutradhar
    o = client.post("/api/sutradhar/orders/create", headers={"Authorization": f"Bearer mock_token_{buyer}"},
                    json={"customer_phone": buyer, "service_id": "kaalsarp_dosha", "ref_code": code.lower()}).json()
    assert o["amount"] == 501_00 and o["sutradhar_code"]
    assert _capture(o["order_id"], 501_00, "pay_link_1").json()["commission_created"] is True
    comm = se.SutradharStore.get_doc("commissions", "comm_pay_link_1")
    assert comm["amount"] == 280 and comm["sutradhar_id"] == (me.get("sutradhar_id") or me["id"])
    lead = next(l for l in se.SutradharStore.query_all("leads") if l["customer_phone"] == buyer)
    assert lead["source"] == "offer_link"

    # a phone already locked by another Sutradhar stays with that Sutradhar
    assert client.post("/api/sutradhar/leads/add", headers=SUTRA, json={"customer_phone": taken, "customer_name": "x"}).status_code == 200
    o2 = client.post("/api/sutradhar/orders/create", headers={"Authorization": f"Bearer mock_token_{taken}"},
                     json={"customer_phone": taken, "service_id": "kaalsarp_dosha", "ref_code": code}).json()
    assert o2["sutradhar_code"] and o2["sutradhar_code"] != code

    # an unknown code changes nothing
    o3 = client.post("/api/sutradhar/orders/create", json={"customer_phone": "9844400044", "service_id": "kaalsarp_dosha", "ref_code": "SUTRA000000"}).json()
    assert not o3.get("sutradhar_code")


def test_saas_call_list_import_and_update():
    url = "/api/sutradhar/admin/saas-leads"
    assert client.get(url).status_code in (401, 403)
    rows = [{"name": "पं. रमेश शर्मा", "phone": "+91 98765 43210", "city": "इंदौर"},
            {"name": "आचार्य सुनील", "phone": "09876500011"},
            {"name": "ग़लत", "phone": "12345"}]
    r = client.post(url + "/import", headers=ADMIN, json={"rows": rows, "source": "test.xlsx"}).json()
    assert (r["added"], r["updated"], r["skipped"]) == (2, 0, 1)
    d = client.get(url, headers=ADMIN).json()
    assert d["count"] == 2 and d["counts"]["new"] == 2
    assert [l["phone"] for l in d["leads"]] == ["9876543210", "9876500011"]

    u = client.post(url + "/update", headers=ADMIN, json={"phone": "9876543210", "status": "interested", "called": True, "note": "शाम को"}).json()
    assert u["lead"]["status"] == "interested" and u["lead"]["calls"] == 1
    assert client.post(url + "/update", headers=ADMIN, json={"phone": "9876543210", "status": "xyz"}).status_code == 400

    # the same Excel again: status and note stay, a new number is added
    r = client.post(url + "/import", headers=ADMIN, json={"rows": rows + [{"name": "नया", "phone": "9123456780"}]}).json()
    assert (r["added"], r["updated"]) == (1, 2)
    d = client.get(url, headers=ADMIN).json()
    ramesh = next(l for l in d["leads"] if l["phone"] == "9876543210")
    assert ramesh["status"] == "interested" and ramesh["note"] == "शाम को" and d["count"] == 3

    # a number with an active SaaS subscription shows as a buyer; delete hides a row
    se.extend_saas_subscription("9876500011", "आचार्य सुनील", source="test")
    d = client.get(url, headers=ADMIN).json()
    assert next(l for l in d["leads"] if l["phone"] == "9876500011")["is_subscriber"] is True
    client.post(url + "/update", headers=ADMIN, json={"phone": "9123456780", "delete": True})
    assert client.get(url, headers=ADMIN).json()["count"] == 2


def test_foreign_customer_pays_in_dollars():
    """22 Nov 2026: currency USD -> dollar price from the rupee tier; commission on the rupee value."""
    q = client.post("/api/sutradhar/quote", json={"customer_phone": "", "service_id": "kaalsarp_dosha", "currency": "usd"}).json()
    assert q["currency"] == "USD" and q["price_usd"] == 11 and q["display_price"] == "$11"
    cat = {i["service_id"]: i for i in client.get("/api/sutradhar/catalog").json()["items"]}
    assert cat["gun_milan_manglik"]["price_usd"] == 21 and cat["muhurta_vivah"]["price_usd"] == 41
    # unknown currency -> rupees
    assert client.post("/api/sutradhar/quote", json={"customer_phone": "", "service_id": "kaalsarp_dosha", "currency": "XYZ"}).json()["currency"] == "INR"

    s_phone, buyer = "9811100071", "9822200072"
    s_hdr = {"Authorization": f"Bearer mock_token_{s_phone}"}
    me = client.post("/api/sutradhar/register", headers=s_hdr, json={"name": "विदेश सूत्रधार", "phone": s_phone, "upi_id": "abroad@okaxis"}).json()["sutradhar"]
    code = (me.get("code") or me["id"]).replace("-", "")
    o = client.post("/api/sutradhar/orders/create", headers={"Authorization": f"Bearer mock_token_{buyer}"},
                    json={"customer_phone": buyer, "service_id": "kaalsarp_dosha", "ref_code": code, "currency": "USD"}).json()
    assert o["currency"] == "USD" and o["amount"] == 11_00 and o["display_price"] == "$11"
    rate = se.usd_inr_rate()
    assert o["net_price"] == round(11 * rate)
    # a payment in the wrong currency or amount earns nothing
    bad = client.post("/api/sutradhar/webhook/razorpay", headers=WEBHOOK_HDR, json={"event": "payment.captured",
          "payload": {"payment": {"entity": {"id": "pay_usd_bad", "order_id": o["order_id"], "amount": 11_00, "currency": "INR"}}}}).json()
    assert bad["status"] == "ignored"
    ok = client.post("/api/sutradhar/webhook/razorpay", headers=WEBHOOK_HDR, json={"event": "payment.captured",
         "payload": {"payment": {"entity": {"id": "pay_usd_1", "order_id": o["order_id"], "amount": 11_00, "currency": "USD"}}}}).json()
    assert ok["commission_created"] is True
    comm = se.SutradharStore.get_doc("commissions", "comm_pay_usd_1")
    assert comm["amount"] == (round(11 * rate) * 100 * 100 // 118) * 66 // 100 // 100

    # the master test code stays ₹1 in rupees
    owner = {"Authorization": "Bearer mock_token_9000000001"}
    t = client.post("/api/sutradhar/orders/create", headers=owner, json={"customer_phone": "9000000001",
                    "service_id": "kaalsarp_dosha", "input_code": "jai hanuman", "currency": "USD"}).json()
    assert t["currency"] == "INR" and t["amount"] == 100
