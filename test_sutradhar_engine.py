"""
=============================================================================
SRA SUTRADHAR REFERRAL & AUTOMATED PAYOUT ENGINE — VERIFICATION SUITE
=============================================================================
Tests all 6 core business scenarios specified in the roadmap:
1. सही लीड (Valid Lead Registration & 10% Auto-Quote)
2. बिना लीड (Without Lead - Full Price or manual code)
3. दूसरे सूत्रधार की लीड (Another Sutradhar's Lead - 72h Lock Rejection)
4. 72 घंटे बाद का भुगतान (Payment after 72h - Attribution Expiry)
5. भुगतान की सूचना दो बार आना (Webhook Received Twice - Idempotency Guard)
6. अमान्य UPI (Invalid UPI - 'Requires Review' / जाँच ज़रूरी Queue)
=============================================================================
"""

import os
import time
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from parashara_canonical_engine import app
from sutradhar_engine import SutradharStore

client = TestClient(app)

def test_full_sutradhar_suite():
    print("\n=======================================================")
    print("🚀 SRA SUTRADHAR AUTOMATED SUITE: RUNNING 6 SCENARIOS")
    print("=======================================================\n")

    # Setup 2 Sutradhars
    # Sutradhar A
    sutra_a_resp = client.post("/api/sutradhar/register", json={
        "name": "सुरेश सूत्रधार A",
        "phone": "9811111111",
        "email": "suresh@example.com",
        "upi_id": "suresh@okhdfcbank"
    })
    assert sutra_a_resp.status_code == 200, sutra_a_resp.text
    sutra_a = sutra_a_resp.json()["sutradhar"]
    sutra_a_id = sutra_a["id"]
    sutra_a_code = sutra_a["code"]
    print(f"✅ Setup Sutradhar A: {sutra_a_id} (Code: {sutra_a_code}, UPI: {sutra_a['upi_id']})")

    # Sutradhar B (Invalid UPI for Scenario 6)
    sutra_b_resp = client.post("/api/sutradhar/register", json={
        "name": "विकास सूत्रधार B",
        "phone": "9822222222",
        "email": "vikas@example.com",
        "upi_id": "vikas@upi"
    })
    assert sutra_b_resp.status_code == 200, sutra_b_resp.text
    sutra_b = sutra_b_resp.json()["sutradhar"]
    sutra_b_id = sutra_b["id"]
    sutra_b_code = sutra_b["code"]
    print(f"✅ Setup Sutradhar B: {sutra_b_id} (Code: {sutra_b_code})")

    # -------------------------------------------------------------------------
    # SCENARIO 1: सही लीड (Valid Lead Registration & 10% Auto-Quote)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 1] सही लीड (Valid Lead Registration & 10% Auto-Quote) ---")
    cust_1_phone = "9899001122"
    lead_resp = client.post("/api/sutradhar/leads/add", json={
        "sutradhar_id": sutra_a_id,
        "customer_phone": cust_1_phone,
        "customer_name": "राहुल जातक"
    })
    assert lead_resp.status_code == 200, lead_resp.text
    lead_data = lead_resp.json()
    assert lead_data["status"] == "success"
    assert lead_data["lock_hours"] == 72
    print(f"✅ Lead locked for 72 hours: {lead_data['lead_id']} for customer {cust_1_phone}")

    # Quote check: Customer logs in on checkout page, 10% discount auto-applies without typing code!
    quote_resp = client.post("/api/sutradhar/quote", json={
        "customer_phone": cust_1_phone,
        "service_id": "mangal_dosha"
    })
    assert quote_resp.status_code == 200
    q = quote_resp.json()
    assert q["valid"] is True
    assert q["has_active_lead"] is True
    assert q["sutradhar_code"] == sutra_a_code
    assert q["base_price"] == 199
    assert q["discount_amount"] == 20
    assert q["net_price"] == 179
    print(f"✅ Server Auto-Quote verified: Base ₹199 - 10% (₹20) = Net ₹179 (Auto-applied code: {sutra_a_code})")

    # -------------------------------------------------------------------------
    # SCENARIO 2: बिना लीड (Without Lead - Full Price & Wrong Code Protection)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 2] बिना लीड (Without Lead) ---")
    cust_2_phone = "9711002233"
    quote_no_lead = client.post("/api/sutradhar/quote", json={
        "customer_phone": cust_2_phone,
        "service_id": "mangal_dosha"
    })
    q2 = quote_no_lead.json()
    assert q2["has_active_lead"] is False
    assert q2["discount_amount"] == 0
    assert q2["net_price"] == 199
    print(f"✅ Without lead: Full price ₹{q2['net_price']} verified.")

    # Wrong code test on locked customer: Customer 1 tries entering fake code "FAKE99"
    wrong_code_resp = client.post("/api/sutradhar/quote", json={
        "customer_phone": cust_1_phone,
        "service_id": "mangal_dosha",
        "input_code": "FAKE99"
    })
    assert wrong_code_resp.json()["valid"] is False
    assert wrong_code_resp.json()["net_price"] == 199
    assert "मान्य नहीं" in wrong_code_resp.json()["message"]
    print(f"✅ Wrong code rejection on active lead verified: 'यह कूपन आपके लिए मान्य नहीं'.")

    # -------------------------------------------------------------------------
    # SCENARIO 3: दूसरे सूत्रधार की लीड (Another Sutradhar's Lead - 72h Lock)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 3] दूसरे सूत्रधार की लीड (72h Lock Collision Protection) ---")
    # Sutradhar B tries to claim Customer 1 who is already locked by Sutradhar A
    collision_resp = client.post("/api/sutradhar/leads/add", json={
        "sutradhar_id": sutra_b_id,
        "customer_phone": cust_1_phone,
        "customer_name": "राहुल जातक (Poach Attempt)"
    })
    assert collision_resp.status_code == 400
    assert "किसी अन्य सूत्रधार के पास 72-घंटे के ताले में सुरक्षित है" in collision_resp.json()["detail"]
    print("✅ 72h Cross-Sutradhar lock protected: Other Sutradhars cannot poach active leads!")

    # Self-phone check: Sutradhar tries to add their own phone
    self_resp = client.post("/api/sutradhar/leads/add", json={
        "sutradhar_id": sutra_a_id,
        "customer_phone": sutra_a["phone"]
    })
    assert self_resp.status_code == 400
    assert "स्वयं के मोबाइल नंबर" in self_resp.json()["detail"]
    print("✅ Self-phone lead entry blocked.")

    # -------------------------------------------------------------------------
    # SCENARIO 4: 72 घंटे बाद का भुगतान (Payment after 72h - Attribution Expiry)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 4] 72 घंटे बाद का भुगतान (Payment after 72h - Expiry) ---")
    cust_expired_phone = "9655443322"
    # Create a lead with expired timestamp (73 hours in past)
    past_time = datetime.now(timezone.utc) - timedelta(hours=73)
    exp_time = past_time + timedelta(hours=72) # expired 1 hour ago
    expired_lead_id = f"lead_{cust_expired_phone}_expired_test"
    SutradharStore.set_doc("leads", expired_lead_id, {
        "id": expired_lead_id,
        "customer_phone": cust_expired_phone,
        "sutradhar_id": sutra_a_id,
        "sutradhar_code": sutra_a_code,
        "created_at": past_time.isoformat(),
        "expires_at": exp_time.isoformat(),
        "status": "active"
    })

    # Webhook arrives for this expired customer
    exp_pay_id = f"pay_exp_{int(time.time())}"
    webhook_exp_resp = client.post("/api/sutradhar/webhook/razorpay", json={
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": exp_pay_id,
                    "order_id": f"order_exp_{int(time.time())}",
                    "amount": 19900,
                    "notes": {
                        "customer_phone": cust_expired_phone,
                        "sutradhar_id": sutra_a_id
                    }
                }
            }
        }
    })
    assert webhook_exp_resp.status_code == 200
    assert webhook_exp_resp.json()["commission_created"] is False
    # Commission should NOT be created for expired lead
    assert SutradharStore.get_doc("commissions", f"comm_{exp_pay_id}") is None
    print("✅ 72h Expiry strictly enforced: No commission created when payment happens after 72h.")

    # -------------------------------------------------------------------------
    # SCENARIO 5: भुगतान की सूचना दो बार आना (Webhook Received Twice - Idempotency Guard)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 5] भुगतान की सूचना दो बार आना (Idempotency - Exactly 1 Commission) ---")
    # Order creation for Customer 1 (Active lead under Sutradhar A)
    order_create_resp = client.post("/api/sutradhar/orders/create", json={
        "customer_phone": cust_1_phone,
        "service_id": "mangal_dosha"
    })
    assert order_create_resp.status_code == 200
    order_data = order_create_resp.json()
    order_id = order_data["order_id"]
    print(f"✅ Server created order: {order_id} (Amount: ₹{order_data['net_price']})")

    payment_id = f"pay_real_test_{int(time.time())}"
    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": order_id,
                    "amount": 17900,
                    "notes": {
                        "customer_phone": cust_1_phone,
                        "sutradhar_id": sutra_a_id,
                        "lead_id": lead_data["lead_id"]
                    }
                }
            }
        }
    }

    # First Webhook Delivery
    wh1 = client.post("/api/sutradhar/webhook/razorpay", json=webhook_payload)
    assert wh1.status_code == 200
    assert wh1.json()["commission_created"] is True
    print(f"✅ Webhook Call 1: Commission 'comm_{payment_id}' created successfully.")

    # Second Webhook Delivery (Duplicate / Retry by Razorpay)
    wh2 = client.post("/api/sutradhar/webhook/razorpay", json=webhook_payload)
    assert wh2.status_code == 200
    assert wh2.json()["status"] == "duplicate_handled"
    print("✅ Webhook Call 2: Duplicate gracefully intercepted. Zero double-commission!")

    # Verify single commission in store
    all_comms = SutradharStore.query_all("commissions")
    matching_comms = [c for c in all_comms if c.get("payment_id") == payment_id]
    assert len(matching_comms) == 1, f"Expected exactly 1 commission, found {len(matching_comms)}"
    print(f"✅ 'एक payment ID पर केवल एक कमीशन' verified. Count: {len(matching_comms)}")

    # -------------------------------------------------------------------------
    # SCENARIO 6: अमान्य UPI (Invalid UPI - Moved to 'Requires Review' / जाँच ज़रूरी Queue)
    # -------------------------------------------------------------------------
    print("\n--- [Scenario 6] अमान्य UPI (Moved to 'Requires Review' / जाँच ज़रूरी Queue) ---")
    # Invalidate Sutradhar B's UPI
    sutra_b_record = SutradharStore.get_doc("sutradhars", sutra_b_id)
    sutra_b_record["upi_id"] = "INVALID_UPI_NO_AT_SIGN"
    SutradharStore.set_doc("sutradhars", sutra_b_id, sutra_b_record)

    # Create Commission for Sutradhar B
    b_pay_id = f"pay_b_invalid_{int(time.time())}"
    SutradharStore.set_doc("commissions", f"comm_{b_pay_id}", {
        "id": f"comm_{b_pay_id}",
        "commission_id": f"comm_{b_pay_id}",
        "payment_id": b_pay_id,
        "sutradhar_id": sutra_b_id,
        "amount": 20,
        "status": "created"
    })

    # Trigger Payout Worker
    payout_res = client.post("/api/sutradhar/payouts/process")
    assert payout_res.status_code == 200
    flagged_comm = SutradharStore.get_doc("commissions", f"comm_{b_pay_id}")
    assert flagged_comm["status"] == "requires_review"
    assert "अमान्य UPI" in flagged_comm["failure_reason"]
    print(f"✅ Invalid UPI safely intercepted: Commission moved to 'requires_review' with reason: {flagged_comm['failure_reason']}")

    # Check Admin Review Queue
    admin_q = client.get("/api/sutradhar/admin/reviews")
    assert admin_q.status_code == 200
    queue = admin_q.json()["queue"]
    assert any(c["id"] == f"comm_{b_pay_id}" for c in queue)
    print(f"✅ Admin 'जाँच ज़रूरी' Queue reflects flagged item (Total in queue: {len(queue)})")

    # Test Admin Action: 'retry' after fixing UPI
    sutra_b_record["upi_id"] = "vikas.fixed@okaxis"
    SutradharStore.set_doc("sutradhars", sutra_b_id, sutra_b_record)

    action_res = client.post("/api/sutradhar/admin/review-action", json={
        "commission_id": f"comm_{b_pay_id}",
        "action": "retry"
    })
    assert action_res.status_code == 200
    # Now it should be paid with a verified UTR!
    fixed_comm = SutradharStore.get_doc("commissions", f"comm_{b_pay_id}")
    assert fixed_comm["status"] == "paid"
    assert fixed_comm["utr"].startswith("UTR")
    print(f"✅ Admin 'फिर से भेजें' Action successful! Payout paid with UTR: {fixed_comm['utr']}")

    print("\n=======================================================")
    print("🎉 ALL 6 PRODUCTION TEST SCENARIOS PASSED 100% PERFECTLY!")
    print("=======================================================\n")

if __name__ == "__main__":
    test_full_sutradhar_suite()
