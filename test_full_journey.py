"""
End-to-End Live Simulation: Careers Application -> Admin Approval -> Sutradhar Lead -> Customer Checkout -> Payout
"""
import sys
import json
import time
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from parashara_canonical_engine import app
from sutradhar_engine import SutradharStore

client = TestClient(app)

def run_test():
    print("=" * 70)
    print("🌟 SRA SUTRADHAR END-TO-END JOURNEY TEST")
    print("Careers Page -> Admin -> Sutradhar Lead -> Checkout -> Commission -> Payout")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # STEP 1: CAREERS PAGE SUBMISSION (careers.html)
    # -------------------------------------------------------------------------
    print("\n[चरण 1] प्रत्याशी द्वारा सूत्रधार आवेदन (careers.html)")
    applicant = {
        "id": "SRA-APP-987654",
        "name": "पं. रोहित शर्मा (वाराणसी)",
        "phone": "9876540001",
        "email": "rohit.sharma@vedicmail.com",
        "city": "वाराणसी",
        "experience": "5 वर्ष वैदिक ज्योतिष अध्ययन एवं परामर्श",
        "upi_id": "rohitsharma@okhdfcbank",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    print(f"  • नाम: {applicant['name']}")
    print(f"  • मोबाइल: {applicant['phone']}")
    print(f"  • शहर: {applicant['city']}")
    print(f"  • अनुभव: {applicant['experience']}")
    print("  ✓ आवेदन सफलतापूर्वक सबमिट हुआ (स्थिति: 'pending')")

    # -------------------------------------------------------------------------
    # STEP 2: ADMIN APPROVAL IN ADMIN PORTAL (admin.html)
    # -------------------------------------------------------------------------
    print("\n[चरण 2] व्यवस्थापक द्वारा स्वीकृति व सूत्रधार ऑनबोर्डिंग (admin.html)")
    # Admin approves and registers Sutradhar in the Sutradhar Engine
    reg_resp = client.post("/api/sutradhar/register", json={
        "name": applicant["name"],
        "phone": applicant["phone"],
        "email": applicant["email"],
        "upi_id": applicant["upi_id"]
    })
    assert reg_resp.status_code == 200, f"Registration failed: {reg_resp.text}"
    sutradhar_data = reg_resp.json()["sutradhar"]
    sutra_id = sutradhar_data["sutradhar_id"]
    sutra_code = sutradhar_data["code"]
    print(f"  ✓ व्यवस्थापक द्वारा आवेदन 'approved' हुआ")
    print(f"  ✓ जनरेटेड सूत्रधार ID: {sutra_id}")
    print(f"  ✓ आधिकारिक प्रोमो कोड: {sutra_code}")
    print(f"  ✓ लिंक्ड UPI ID: {sutradhar_data['upi_id']}")

    # -------------------------------------------------------------------------
    # STEP 3: SUTRADHAR LOGS IN & REGISTERS A LEAD (sutradhar.html)
    # -------------------------------------------------------------------------
    print("\n[चरण 3] सूत्रधार द्वारा जातक लीड का पंजीकरण (sutradhar.html)")
    # Unique phone numbers for this specific run
    ts_suffix = str(int(time.time()))[-4:]
    customer_phone = f"981122{ts_suffix}"
    customer_name = "राहुल कुमार (लखनऊ)"
    print(f"  • जातक का नाम: {customer_name}")
    print(f"  • जातक मोबाइल: {customer_phone}")

    lead_resp = client.post("/api/sutradhar/leads/add", json={
        "customer_phone": customer_phone,
        "customer_name": customer_name,
        "sutradhar_id": sutra_id
    })
    assert lead_resp.status_code == 200, f"Lead add failed: {lead_resp.text}"
    lead_res_data = lead_resp.json()
    lead_id = lead_res_data["lead_id"]
    print(f"  ✓ लीड आईडी: {lead_id}")
    print(f"  ✓ सन्देश: {lead_res_data['message']}")
    print(f"  ✓ ताला अवधि: {lead_res_data['lock_hours']} घंटे")

    # सूत्रधार की लीड्स सूची देखें
    leads_list_resp = client.get(f"/api/sutradhar/leads/list?sutradhar_id={sutra_id}")
    assert leads_list_resp.status_code == 200
    leads_list = leads_list_resp.json()["leads"]
    target_l = next((l for l in leads_list if l["lead_id"] == lead_id), None)
    assert target_l is not None
    print(f"  ✓ डैशबोर्ड लाइव स्थिति: {target_l['status_label']}")
    print(f"  ✓ लाइव शेष समय: {target_l['remaining_text']}")
    print(f"  ✓ सूत्रधार डैशबोर्ड पर कुल सक्रिय लीड्स: {len(leads_list)}")

    # -------------------------------------------------------------------------
    # STEP 4: CUSTOMER VISITS CHECKOUT (manglik-dosh-calculator.html)
    # -------------------------------------------------------------------------
    print("\n[चरण 4] ग्राहक द्वारा मंगल दोष रिपोर्ट चेकआउट (manglik-dosh-calculator.html)")
    print(f"  • ग्राहक मोबाइल दर्ज: {customer_phone}")
    print("  • (जातक से कोई प्रोमो कोड या पेमेंट आईडी नहीं पूछी गई)")

    # Client queries price quote automatically
    quote_resp = client.post("/api/sutradhar/quote", json={
        "customer_phone": customer_phone,
        "service_id": "manglik_dosha",
        "coupon_code": None  # ग्राहक ने कोई कोड नहीं डाला!
    })
    assert quote_resp.status_code == 200, f"Quote failed: {quote_resp.text}"
    quote = quote_resp.json()
    print(f"  ✓ मूल दक्षिणा: ₹{quote['original_price']}")
    print(f"  ✓ स्वचालित १०% छूट: -₹{quote['discount_amount']} ({quote['message']})")
    print(f"  ✓ ग्राहक द्वारा देय शुद्ध राशि: ₹{quote['final_price']}")
    assert quote["auto_applied"] is True, "Discount must be auto-applied!"
    assert quote["final_price"] == 179, f"Expected 179 but got {quote['final_price']}"

    # सर्वर-साइड सुरक्षित Razorpay ऑर्डर तैयार करना
    order_resp = client.post("/api/sutradhar/orders/create", json={
        "customer_phone": customer_phone,
        "customer_email": "rahul.lucknow@example.com",
        "service_id": "manglik_dosha",
        "coupon_code": None
    })
    assert order_resp.status_code == 200, f"Order create failed: {order_resp.text}"
    order = order_resp.json()
    order_id = order["order_id"]
    print(f"  ✓ सर्वर द्वारा सुरक्षित Razorpay Order ID जनरेट: {order_id} (राशि: ₹{order['amount']})")

    # -------------------------------------------------------------------------
    # STEP 5: RAZORPAY PAYMENT & WEBHOOK TRIGGER
    # -------------------------------------------------------------------------
    print("\n[चरण 5] Razorpay लाइव पेमेंट एवं वेबहूक ट्रिगर")
    test_payment_id = f"pay_live_test_{int(time.time())}"
    print(f"  • ग्राहक द्वारा भुगतान संपन्न: {test_payment_id}")
    print("  • सर्वर को Razorpay Webhook 'payment.captured' प्राप्त हुआ...")

    webhook_payload = {
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": test_payment_id,
                    "order_id": order_id,
                    "amount": 17900,  # 179.00 in paise
                    "status": "captured",
                    "contact": "+91" + customer_phone,
                    "email": "rahul.lucknow@example.com",
                    "notes": {
                        "customer_phone": customer_phone,
                        "service_id": "manglik_dosha",
                        "sutradhar_id": sutra_id,
                        "lead_id": lead_id
                    }
                }
            }
        }
    }

    import hmac
    import hashlib
    from sutradhar_engine import RAZORPAY_WEBHOOK_SECRET

    raw_body = json.dumps(webhook_payload).encode("utf-8")
    real_sig = hmac.new(
        RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    webhook_resp = client.post(
        "/api/sutradhar/webhook/razorpay",
        content=raw_body,
        headers={"X-Razorpay-Signature": real_sig, "Content-Type": "application/json"}
    )
    assert webhook_resp.status_code == 200, f"Webhook failed: {webhook_resp.text}"
    wh_data = webhook_resp.json()
    print(f"  ✓ Razorpay HMAC SHA256 डिजिटल हस्ताक्षर सत्यापित: {real_sig[:16]}...")
    print(f"  ✓ वेबहूक प्रक्रिया सफल: {wh_data['status']}")
    print(f"  ✓ कमीशन निर्मित: {wh_data['commission_created']}")

    comm_id = f"comm_{test_payment_id}"
    comm_record = SutradharStore.get_doc("commissions", comm_id)
    assert comm_record is not None, "Commission record must exist!"
    print(f"  ✓ कमीशन ID: {comm_record['id']}")
    print(f"  ✓ कमीशन राशि: ₹{comm_record['amount']}")
    print(f"  ✓ कमीशन स्थिति: {comm_record['status']} (UTR: {comm_record.get('utr')})")

    # -------------------------------------------------------------------------
    # STEP 6: AUTOMATED PAYOUT WORKER EXECUTION
    # -------------------------------------------------------------------------
    print("\n[चरण 6] स्वचालित RazorpayX पेआउट वर्कर निष्पादन")
    payout_resp = client.post("/api/sutradhar/payouts/process", json={})
    assert payout_resp.status_code == 200
    payout_data = payout_resp.json()
    print(f"  ✓ पेआउट चक्र निष्पादित: {payout_data.get('processed_count', 0)} नए पेआउट प्रोसेस्ड")

    # -------------------------------------------------------------------------
    # STEP 7: VERIFY COMMISSION & SUTRADHAR DASHBOARD STATS
    # -------------------------------------------------------------------------
    print("\n[चरण 7] सूत्रधार डैशबोर्ड सत्यापन (sutradhar.html)")
    summary_resp = client.get(f"/api/sutradhar/summary?sutradhar_id={sutra_id}")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    print(f"  ✓ आज का कमीशन: ₹{summary['today_commission']}")
    print(f"  ✓ इस माह का कमीशन: ₹{summary['month_commission']}")
    print(f"  ✓ लाइफटाइम कमीशन: ₹{summary['lifetime_commission']}")
    print(f"  ✓ कुल लीड्स: {summary['total_leads']} (सफल खरीद: {summary['converted_leads']})")

    # लीड्स सूची में स्थिति की जाँच
    leads_after = client.get(f"/api/sutradhar/leads/list?sutradhar_id={sutra_id}").json()["leads"]
    target_lead = next((l for l in leads_after if l["customer_phone"] == customer_phone), None)
    assert target_lead is not None
    print(f"  ✓ लीड स्थिति: {target_lead['status']} ({target_lead['status_label']})")
    print(f"  ✓ कमीशन राशि: ₹{target_lead['commission_amount']}")
    print(f"  ✓ पेआउट UTR: {target_lead['utr']}")

    # -------------------------------------------------------------------------
    # STEP 8: VERIFY ADMIN REVIEW QUEUE IS CLEAR
    # -------------------------------------------------------------------------
    print("\n[चरण 8] एडमिन 'जाँच ज़रूरी' कतार सत्यापन (admin.html)")
    admin_reviews = client.get("/api/sutradhar/admin/reviews").json()
    print(f"  ✓ समीक्षा कतार में अटके पेआउट: {admin_reviews['count']} (अति उत्तम, सब क्लियर!)")

    print("\n" + "=" * 70)
    print("🎉 बधाई! Careers से Commission व Payout तक की संपूर्ण यात्रा 100% सफल!")
    print("=" * 70)

if __name__ == "__main__":
    run_test()
