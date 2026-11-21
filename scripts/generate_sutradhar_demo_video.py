#!/usr/bin/env python3
"""
Generate high-impact, elegant Sutradhar self-explanatory onboarding & first income demo video.
Colors: Elegant White, Deep Royal Blue, Emerald Green, Warm Gold.
"""

import os
import re
import asyncio
import subprocess
from pathlib import Path
import edge_tts
import imageio_ffmpeg

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

SLIDES_DATA = [
    {
        "id": 1,
        "badge": "🌟 श्री राम जी एस्ट्रो • सूत्रधार प्रोग्राम",
        "title": "बिना निवेश के महीने का ₹50,000 से ₹1,00,000 कमाएं",
        "card_icon": "💼",
        "card_title": "घर बैठे अपनी सम्मानजनक डिजिटल आय शुरू करें",
        "content_html": """
            <div style="display:flex; flex-direction:column; gap:24px; width:100%; text-align:left;">
                <div style="background:#eff6ff; border:2px solid #bfdbfe; border-radius:20px; padding:24px; display:flex; align-items:center; gap:20px;">
                    <div style="font-size:48px;">📱</div>
                    <div>
                        <div style="font-size:32px; font-weight:800; color:#1e40af;">केवल अपने मोबाइल फोन से</div>
                        <div style="font-size:24px; color:#4b5563; margin-top:4px;">कोई लैपटॉप या ऑफिस की ज़रूरत नहीं</div>
                    </div>
                </div>
                <div style="background:#f0fdf4; border:2px solid #bbf7d0; border-radius:20px; padding:24px; display:flex; align-items:center; gap:20px;">
                    <div style="font-size:48px;">🚫</div>
                    <div>
                        <div style="font-size:32px; font-weight:800; color:#166534;">₹0 निवेश • शून्य लागत</div>
                        <div style="font-size:24px; color:#4b5563; margin-top:4px;">कोई सामान पैक या डिलीवरी नहीं, कोई रिटर्न का झंझट नहीं</div>
                    </div>
                </div>
                <div style="background:#fefce8; border:2px solid #fef08a; border-radius:20px; padding:24px; display:flex; align-items:center; gap:20px;">
                    <div style="font-size:48px;">⚡</div>
                    <div>
                        <div style="font-size:32px; font-weight:800; color:#854d0e;">सीधे बैंक UPI में भुगतान</div>
                        <div style="font-size:24px; color:#4b5563; margin-top:4px;">हर सेल पर पारदर्शी व सुरक्षित पेआउट</div>
                    </div>
                </div>
            </div>
        """,
        "footer_tip": "💡 पूरे भारत से हजारों सूत्रधार घर बैठे कमा रहे हैं",
        "narration": "नमस्ते साथियों! क्या आप घर बैठे बिना किसी निवेश के महीने का पचास हज़ार से एक लाख रुपये कमाना चाहते हैं? श्री राम जी एस्ट्रो प्रस्तुत करता है 'सूत्रधार' पार्टनर प्रोग्राम — जहाँ आप बिना किसी सामान या डिलीवरी के, केवल अपने मोबाइल से एक शानदार डिजिटल इनकम शुरू कर सकते हैं।"
    },
    {
        "id": 2,
        "badge": "📜 क्या बिकता है? • हर घर की आवश्यकता",
        "title": "भारत की प्रामाणिक डिजिटल वैदिक ज्योतिष सेवाएं",
        "card_icon": "🪐",
        "card_title": "BPHS पर आधारित तत्काल डिजिटल रिपोर्ट्स व कोर्स",
        "content_html": """
            <div style="display:flex; flex-direction:column; gap:20px; width:100%; text-align:left;">
                <div style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:18px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                    <div style="font-size:26px; font-weight:800; color:#1e3a8a; margin-bottom:6px;">📜 लोकप्रिय वैदिक रिपोर्ट्स (₹501 – ₹1,111)</div>
                    <div style="font-size:22px; color:#475569; line-height:1.5;">जन्मकुण्डली, मंगल दोष, कालसर्प, धन योग, वर्षफल व विवाह गुण मिलान — तुरंत डाउनलोड!</div>
                </div>
                <div style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:18px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                    <div style="font-size:26px; font-weight:800; color:#1e3a8a; margin-bottom:6px;">🎓 1-वर्षीय गुरुकुल ज्योतिष कोर्स (₹24,000)</div>
                    <div style="font-size:22px; color:#475569; line-height:1.5;">लाइव मेंटरशिप व शास्त्रीय ज्योतिष प्रशिक्षण — हर बैच में केवल 11 सीटें।</div>
                </div>
                <div style="background:#ffffff; border:1.5px solid #e2e8f0; border-radius:18px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
                    <div style="font-size:26px; font-weight:800; color:#1e3a8a; margin-bottom:6px;">💻 ज्योतिषी SaaS सॉफ्टवेयर (₹5,100/वर्ष)</div>
                    <div style="font-size:22px; color:#475569; line-height:1.5;">अभ्यास करने वाले ज्योतिषियों के लिए क्लाउड सॉफ्टवेयर व पंचांग।</div>
                </div>
            </div>
        """,
        "footer_tip": "✨ 100% डिजिटल सेवाएं • ग्राहक को तत्काल रिपोर्ट मिलती है",
        "narration": "श्री राम जी एस्ट्रो भारत की अग्रणी वैदिक ज्योतिष सेवा है। यहाँ विवाह गुण मिलान, मंगल दोष, कालसर्प, धन योग और संपूर्ण पाराशर रिपोर्ट्स तुरंत डिजिटल रूप में मिलती हैं। साथ ही एक-वर्षीय ज्योतिष गुरुकुल कोर्स भी उपलब्ध है। ये ऐसी सेवाएं हैं जिनकी हर परिवार को हमेशा ज़रूरत होती है।"
    },
    {
        "id": 3,
        "badge": "🎯 आपका काम क्या है? • केवल 3 आसान कदम",
        "title": "पूरी तरह स्वचालित व सुरक्षित रेफरल सिस्टम",
        "card_icon": "⚙️",
        "card_title": "आपको न बेचना है, न समझाना है — सिस्टम सब करेगा",
        "content_html": """
            <div style="display:flex; flex-direction:column; gap:20px; width:100%; text-align:left;">
                <div style="background:#eff6ff; border:2px solid #3b82f6; border-radius:18px; padding:20px; display:flex; gap:18px; align-items:flex-start;">
                    <div style="background:#2563eb; color:#fff; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; shrink:0;">1</div>
                    <div>
                        <div style="font-size:26px; font-weight:800; color:#1e40af;">ग्राहक का नंबर दर्ज करें / लिंक दें</div>
                        <div style="font-size:21px; color:#4b5563; margin-top:4px;">सूतधार पोर्टल में 'नई लीड जोड़ें' में मोबाइल नंबर डालें या अपना लिंक शेयर करें।</div>
                    </div>
                </div>
                <div style="background:#fefce8; border:2px solid #eab308; border-radius:18px; padding:20px; display:flex; gap:18px; align-items:flex-start;">
                    <div style="background:#ca8a04; color:#fff; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; shrink:0;">2</div>
                    <div>
                        <div style="font-size:26px; font-weight:800; color:#854d0e;">72 घंटे का सुरक्षित ताला (Lead Lock)</div>
                        <div style="font-size:21px; color:#4b5563; margin-top:4px;">वह ग्राहक 72 घंटे के लिए आपके नाम पर लॉक हो जाता है। कोई अन्य क्रेडिट नहीं ले सकता।</div>
                    </div>
                </div>
                <div style="background:#f0fdf4; border:2px solid #22c55e; border-radius:18px; padding:20px; display:flex; gap:18px; align-items:flex-start;">
                    <div style="background:#16a34a; color:#fff; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:800; shrink:0;">3</div>
                    <div>
                        <div style="font-size:26px; font-weight:800; color:#166534;">खरीद होते ही कमीशन आपके खाते में!</div>
                        <div style="font-size:21px; color:#4b5563; margin-top:4px;">ग्राहक वेबसाइट से कुछ भी खरीदे, आपका भारी कमीशन अपने आप जुड़ जाता है।</div>
                    </div>
                </div>
            </div>
        """,
        "footer_tip": "🔒 72 घंटे की सुरक्षा • आपकी मेहनत का हर रुपया सुरक्षित",
        "narration": "सूत्रधार के रूप में आपका काम बहुत आसान है — केवल तीन कदम! पहला कदम: सूत्रधार पोर्टल में 'नई लीड जोड़ें' पर जाकर अपने ग्राहक का नाम और मोबाइल नंबर दर्ज करें या अपना पर्सनल लिंक शेयर करें। दूसरा: वह नंबर बहत्तर घंटे के लिए आपके नाम पर लॉक हो जाता है। तीसरा: ग्राहक जैसे ही कोई रिपोर्ट या कोर्स लेता है, भारी कमीशन सीधे आपके खाते में जुड़ जाता है।"
    },
    {
        "id": 4,
        "badge": "💰 कमाई का गणित • नौकरी से भी ज्यादा!",
        "title": "हर बिक्री पर सीधा 66% तक दक्षिणा कमीशन",
        "card_icon": "📈",
        "card_title": "रोज़ाना 1-2 घंटे काम करके ₹60,000+ प्रति माह",
        "content_html": """
            <div style="display:flex; flex-direction:column; gap:18px; width:100%; text-align:left;">
                <div style="display:flex; gap:14px;">
                    <div style="flex:1; background:#f0fdf4; border:2px solid #16a34a; border-radius:16px; padding:18px; text-align:center;">
                        <div style="font-size:20px; color:#15803d; font-weight:700;">रिपोर्ट्स पर कमीशन</div>
                        <div style="font-size:42px; font-weight:900; color:#166534; margin:4px 0;">66%</div>
                        <div style="font-size:18px; color:#4b5563;">₹280 से ₹1,174 / रिपोर्ट</div>
                    </div>
                    <div style="flex:1; background:#eff6ff; border:2px solid #2563eb; border-radius:16px; padding:18px; text-align:center;">
                        <div style="font-size:20px; color:#1d4ed8; font-weight:700;">गुरुकुल कोर्स पर</div>
                        <div style="font-size:38px; font-weight:900; color:#1e40af; margin:4px 0;">₹3,500+</div>
                        <div style="font-size:18px; color:#4b5563;">प्रति एडमिशन सीधा UPI</div>
                    </div>
                </div>
                <div style="background:#ffffff; border:2px solid #cbd5e1; border-radius:16px; padding:20px;">
                    <div style="font-size:22px; font-weight:800; color:#1e293b; margin-bottom:10px;">📊 मासिक कमाई का सीधा उदाहरण:</div>
                    <div style="font-size:21px; color:#334155; line-height:1.6;">
                        • केवल 3 रिपोर्ट रोज़ = ₹1,500/दिन ➔ <strong>₹45,000 / माह</strong><br>
                        • महीने में केवल 2 कोर्स एडमिशन ➔ <strong>₹7,000 अतिरिक्त</strong><br>
                        • <strong>कुल मासिक आय: ₹52,000 से ₹75,000+</strong> (बिना किसी बॉस के!)
                    </div>
                </div>
            </div>
        """,
        "footer_tip": "🏆 लेवल 2 बोनस: ₹1 लाख कमाई पर ₹10,000 अतिरिक्त नकद पुरस्कार!",
        "narration": "अब समझिए असली कमाई का गणित! हर रिपोर्ट पर आपको मिलता है सीधा छियासठ प्रतिशत तक का भारी कमीशन — यानी दो सौ अस्सी रुपये से लेकर ग्यारह सौ चौहत्तर रुपये प्रति रिपोर्ट। और गुरुकुल कोर्स पर साढ़े तीन हज़ार से छह हज़ार रुपये प्रति एडमिशन। रोज़ की केवल तीन रिपोर्ट से आप महीने के पैंतालीस हज़ार से साठ हज़ार रुपये कमा सकते हैं, जो एक अच्छी नौकरी से भी कहीं ज्यादा है।"
    },
    {
        "id": 5,
        "badge": "⚡ पहली कमाई आज ही करें • Instant Payout",
        "title": "2 कार्य-दिवसों में सीधे आपके UPI में भुगतान",
        "card_icon": "💸",
        "card_title": "Google Pay, PhonePe, Paytm में सीधा पैसा",
        "content_html": """
            <div style="display:flex; flex-direction:column; gap:20px; width:100%; text-align:left;">
                <div style="background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:18px; padding:22px;">
                    <div style="font-size:24px; font-weight:800; color:#0f172a; margin-bottom:8px;">⏱️ नियमित व पारदर्शी पेआउट चक्र</div>
                    <div style="font-size:21px; color:#475569; line-height:1.5;">
                        ग्राहक के भुगतान के 2 कार्य-दिवस बाद शाम 7 बजे तक सीधे आपके बैंक UPI आईडी में पैसा ट्रांसफर कर दिया जाता है।
                    </div>
                </div>
                <div style="background:#ecfdf5; border:2px dashed #059669; border-radius:18px; padding:22px;">
                    <div style="font-size:24px; font-weight:800; color:#065f46; margin-bottom:8px;">🎯 अपनी पहली कमाई आज ही कैसे करें?</div>
                    <div style="font-size:21px; color:#047857; line-height:1.5;">
                        1. सूत्रधार पोर्टल में अपना खुद का या परिवार के सदस्य का नंबर दर्ज करें।<br>
                        2. वेबसाइट से कोई भी छोटी रिपोर्ट (उदा. ₹501) ऑर्डर करें।<br>
                        3. 2 कार्य-दिवस में 66% कमीशन आपके UPI में टेस्ट पेआउट के रूप में आ जाएगा!
                    </div>
                </div>
            </div>
        """,
        "footer_tip": "✅ 100% पारदर्शी • कोई न्यूनतम सीमा नहीं • सीधा बैंक ट्रांसफर",
        "narration": "पैसे सीधे आपके गूगल पे, फोन पे या बैंक यूपीआई में दो कार्य-दिवसों में शाम सात बजे तक क्रेडिट हो जाते हैं। कोई रोक नहीं, कोई छिपे नियम नहीं। अपनी पहली कमाई आज ही करें — अपना या अपने परिवार का नंबर दर्ज करके पहली रिपोर्ट ऑर्डर करें और तुरंत कमीशन पाएं।"
    },
    {
        "id": 6,
        "badge": "🚀 अभी शुरुआत करें • Join as Sutradhar",
        "title": "श्री राम जी एस्ट्रो परिवार से आज ही जुड़ें",
        "card_icon": "🤝",
        "card_title": "1 मिनट में अपना मोबाइल नंबर OTP से सत्यापित करें",
        "content_html": """
            <div style="display:flex; flex-direction:column; gap:24px; width:100%; text-align:center;">
                <div style="background:linear-gradient(135deg, #2563eb, #1d4ed8); border-radius:22px; padding:32px 24px; color:#ffffff; box-shadow:0 12px 30px rgba(37,99,235,0.25);">
                    <div style="font-size:28px; font-weight:800; margin-bottom:10px;">आधिकारिक पोर्टल लिंक:</div>
                    <div style="font-size:36px; font-weight:900; color:#fef08a; font-family:monospace; word-break:break-all;">shriramjiastro.in/sutradhar.html</div>
                    <div style="font-size:22px; color:#bfdbfe; margin-top:12px;">अपना नाम और 10 अंकों का मोबाइल नंबर डालें</div>
                </div>
                <div style="background:#ffffff; border:2px solid #22c55e; border-radius:20px; padding:24px; display:flex; align-items:center; justify-content:center; gap:16px;">
                    <div style="font-size:48px;">💬</div>
                    <div style="text-align:left;">
                        <div style="font-size:26px; font-weight:800; color:#166534;">व्हाट्सएप आधिकारिक हेल्पलाइन:</div>
                        <div style="font-size:32px; font-weight:900; color:#15803d; font-family:monospace;">+91 95171-17775</div>
                    </div>
                </div>
                <div style="font-size:24px; font-weight:700; color:#1e40af;">जय श्री राम! आज ही से अपनी सफलता का नया अध्याय शुरू करें।</div>
            </div>
        """,
        "footer_tip": "🪐 Shri Ramji Astro • भारत का प्रामाणिक वैदिक ज्योतिष संस्थान",
        "narration": "तो देर किस बात की? अभी खोलें shriramjiastro.in/sutradhar.html, अपना ओटीपी सत्यापित करें और आज ही अपनी पहली लीड दर्ज करके कमाई शुरू करें। किसी भी सहायता के लिए हमारे हेल्पलाइन नंबर पंचानवे एक सौ इकहत्तर सत्रह सात सौ पचहत्तर पर व्हाट्सएप करें। जय श्री राम!"
    }
]

def render_slide_html(slide: dict, output_img: Path) -> bool:
    """Render a pixel-perfect 1080x1920 slide using Google Chrome headless."""
    html_code = f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1080px;
    height: 1920px;
    background: linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 45%, #F0FDF4 100%);
    font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', -apple-system, sans-serif;
    color: #0F172A;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 80px 60px 80px;
    position: relative;
    overflow: hidden;
  }}
  /* Outer decorative border in brand blue & subtle gold */
  .outer-frame {{
    position: absolute;
    inset: 30px;
    border: 3px solid #3B82F6;
    border-radius: 36px;
    pointer-events: none;
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.08);
  }}
  .inner-frame {{
    position: absolute;
    inset: 44px;
    border: 1.5px dashed #D97706;
    border-radius: 26px;
    pointer-events: none;
    opacity: 0.5;
  }}

  /* Top branding header */
  .top-header {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 100%;
    z-index: 2;
  }}
  .brand-logo-row {{
    display: flex;
    align-items: center;
    gap: 14px;
    background: #ffffff;
    border: 1.5px solid #E2E8F0;
    padding: 12px 28px;
    border-radius: 50px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
  }}
  .brand-name {{
    font-size: 26px;
    font-weight: 800;
    color: #1E3A8A;
    letter-spacing: 0.5px;
  }}
  .badge-tag {{
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #ffffff;
    padding: 12px 36px;
    border-radius: 50px;
    font-size: 24px;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(37,99,235,0.25);
    border: 1px solid rgba(255,255,255,0.3);
  }}
  .slide-title {{
    font-size: 44px;
    font-weight: 900;
    color: #0F172A;
    text-align: center;
    line-height: 1.3;
    max-width: 920px;
    margin-top: 8px;
  }}

  /* Main Center Card */
  .center-card {{
    background: #FFFFFF;
    border: 2px solid #DBEAFE;
    border-radius: 36px;
    padding: 50px 48px;
    width: 100%;
    max-width: 960px;
    min-height: 980px;
    box-shadow: 0 25px 60px rgba(30, 58, 138, 0.08), 0 4px 16px rgba(0,0,0,0.02);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 32px;
    z-index: 2;
    position: relative;
  }}
  .card-header-row {{
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #F1F5F9;
    padding-bottom: 20px;
    width: 100%;
    justify-content: center;
  }}
  .card-icon {{
    font-size: 46px;
  }}
  .card-headline {{
    font-size: 34px;
    font-weight: 800;
    color: #1E3A8A;
    text-align: center;
  }}

  /* Bottom Footer */
  .footer-row {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    width: 100%;
    z-index: 2;
  }}
  .footer-tip-pill {{
    background: #ECFDF5;
    border: 1.5px solid #10B981;
    color: #065F46;
    padding: 10px 28px;
    border-radius: 50px;
    font-size: 22px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(16,185,129,0.12);
  }}
  .dots-row {{
    display: flex;
    gap: 10px;
  }}
  .dot {{
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #CBD5E1;
  }}
  .dot.active {{
    background: #2563EB;
    width: 36px;
    border-radius: 10px;
  }}
</style>
</head>
<body>
  <div class="outer-frame"></div>
  <div class="inner-frame"></div>

  <!-- Top Header -->
  <div class="top-header">
    <div class="brand-logo-row">
      <span style="font-size:28px;">🪐</span>
      <span class="brand-name">श्री राम जी एस्ट्रो • shriramjiastro.in</span>
    </div>
    <div class="badge-tag">{slide["badge"]}</div>
    <div class="slide-title">{slide["title"]}</div>
  </div>

  <!-- Center Card -->
  <div class="center-card">
    <div class="card-header-row">
      <span class="card-icon">{slide["card_icon"]}</span>
      <span class="card-headline">{slide["card_title"]}</span>
    </div>
    {slide["content_html"]}
  </div>

  <!-- Footer -->
  <div class="footer-row">
    <div class="footer-tip-pill">{slide["footer_tip"]}</div>
    <div class="dots-row">
      {' '.join([f'<div class="dot {"active" if i+1 == slide["id"] else ""}"></div>' for i in range(len(SLIDES_DATA))])}
    </div>
  </div>
</body>
</html>"""

    temp_html = output_img.with_suffix(".temp.html")
    try:
        temp_html.write_text(html_code, encoding="utf-8")
        cmd = [
            CHROME_BIN,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=1080,1920",
            f"--screenshot={output_img.resolve()}",
            str(temp_html.resolve())
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        return proc.returncode == 0 and output_img.exists()
    finally:
        if temp_html.exists():
            temp_html.unlink()

async def generate_slide_audio(slide: dict, audio_path: Path) -> float:
    """Generate audio via edge-tts and return duration."""
    communicate = edge_tts.Communicate(slide["narration"], "hi-IN-MadhurNeural", rate="+3%")
    await communicate.save(str(audio_path))
    
    # probe duration
    p = subprocess.run([FFMPEG_EXE, "-i", str(audio_path)], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d\.]+)", p.stderr or p.stdout)
    if m:
        hrs, mins, secs = float(m.group(1)), float(m.group(2)), float(m.group(3))
        return hrs * 3600 + mins * 60 + secs
    return 15.0

def make_slide_video(img_path: Path, audio_path: Path, duration: float, out_segment: Path):
    """Combine static slide image with audio using ffmpeg."""
    # Add 0.5s pause padding at end of audio
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-loop", "1",
        "-i", str(img_path),
        "-i", str(audio_path),
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-t", str(duration + 0.5),
        "-shortest",
        str(out_segment)
    ]
    subprocess.run(cmd, check=True, capture_output=True)

async def main():
    work_dir = Path("social_agent/output/sutradhar_demo")
    work_dir.mkdir(parents=True, exist_ok=True)
    
    segment_files = []
    
    print("🚀 Starting Sutradhar Demo Video Generation...")
    
    for slide in SLIDES_DATA:
        s_id = slide["id"]
        print(f"\n▶ Processing Slide {s_id} / {len(SLIDES_DATA)}: {slide['title'][:35]}...")
        
        img_path = work_dir / f"slide_{s_id}.png"
        audio_path = work_dir / f"slide_{s_id}.mp3"
        seg_path = work_dir / f"seg_{s_id}.mp4"
        
        # 1. Render Chrome Slide Image
        print(f"  [1/3] Rendering 1080x1920 Chrome Slide...")
        ok = render_slide_html(slide, img_path)
        if not ok:
            raise RuntimeError(f"Failed to render slide {s_id}")
            
        # 2. Generate Audio Narration
        print(f"  [2/3] Generating Neural Hindi Voiceover...")
        dur = await generate_slide_audio(slide, audio_path)
        print(f"        Duration: {dur:.2f}s")
        
        # 3. Compile Segment MP4
        print(f"  [3/3] Encoding MP4 Segment...")
        make_slide_video(img_path, audio_path, dur, seg_path)
        segment_files.append(seg_path)

    # 4. Concatenate all segments into final video
    print("\n🎬 Concatenating all segments into final MP4...")
    concat_list = work_dir / "concat_list.txt"
    with open(concat_list, "w") as f:
        for seg in segment_files:
            f.write(f"file '{seg.resolve()}'\n")
            
    final_mp4 = Path("public/sutradhar_demo_video.mp4")
    final_mp4.parent.mkdir(parents=True, exist_ok=True)
    
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list),
        "-c", "copy",
        str(final_mp4)
    ]
    subprocess.run(cmd, check=True, capture_output=True)
    
    # Also save in social_agent/output
    shutil_dest = Path("social_agent/output/sutradhar_demo_video.mp4")
    import shutil
    shutil.copyfile(final_mp4, shutil_dest)
    
    # Probe final duration and size
    p = subprocess.run([FFMPEG_EXE, "-i", str(final_mp4)], capture_output=True, text=True)
    dur_match = re.search(r"Duration:\s*(\d+):(\d+):([\d\.]+)", p.stderr or p.stdout)
    dur_str = dur_match.group(0) if dur_match else "unknown"
    size_mb = os.path.getsize(final_mp4) / (1024 * 1024)
    
    print(f"\n✅ Video generated successfully!")
    print(f"   Output: {final_mp4.resolve()}")
    print(f"   {dur_str} | Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    asyncio.run(main())
