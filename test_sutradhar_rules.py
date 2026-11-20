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
    assert q["net_price"] == 251 and q["is_test"] is False
    q = client.post("/api/sutradhar/quote", json={"customer_phone": CUST_PHONE, "service_id": "mangal_dosha",
                                                   "input_code": "SRA123ABC"}).json()
    assert q["net_price"] == 251 and q["code_status"] == "invalid" and q["message"] == "कोड अमान्य है।"
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
