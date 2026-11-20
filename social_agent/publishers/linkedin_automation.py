"""
Shri Ramji Astro (SRA) - Daily LinkedIn & Professional Platform Automation Engine
Generates motivational, high-converting daily posts and high-resolution visual cards
focusing on:
1. Work-From-Home / Sutradhar earning opportunities (for homemakers, students, career transitioners).
2. The astronomical precision of SRA vs incorrect astrological calculations.
3. Shifting modern life from artificial calendars back to the astronomical Panchang & Tithi system.
4. Classical Parashara principles and dignified spiritual empowerment.
"""

import os
import sys
import json
import random
import datetime
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# Base paths
MODULE_DIR = Path(__file__).resolve().parent
SOCIAL_AGENT_DIR = MODULE_DIR.parent
ROOT_DIR = SOCIAL_AGENT_DIR.parent
OUTPUT_DIR = SOCIAL_AGENT_DIR / "output"

DAILY_CAMPAIGNS = [
    {
        "id": "sutradhar_empowerment",
        "category": "आत्मनिर्भरता एवं असीमित अवसर",
        "hook": "घर की चारदीवारी से निकलकर आत्मनिर्भर बनने की शक्ति: महिलाओं, विद्यार्थियों और हर जिज्ञासु साधक के लिए एक नया द्वार",
        "title": "अपने खाली समय को सम्मानजनक आय में बदलें — बनिए 'सूत्रधार'",
        "body_points": [
            "क्या आप जानते हैं कि भारत में लाखों लोग हर दिन विवाह, करियर और स्वास्थ्य के लिए सही ज्योतिषीय मार्गदर्शन तलाश रहे हैं?",
            "आपको कोई ज्योतिषी बनने की ज़रूरत नहीं है—न ही भविष्यवाणियां करनी हैं। गणितीय गणना हमारे आधुनिक स्विस एफेमेरिस सॉफ्टवेयर और प्रमाणित दैवज्ञ करते हैं।",
            "आपका कार्य केवल एक 'पुल' बनना है: अपने संपर्कों को सही और प्रामाणिक समाधान से जोड़ना।",
            "प्रतिदिन 1-2 घंटे समर्पित करके ₹20,000 से ₹50,000+ प्रति माह की आय सीधे आपके UPI या बैंक खाते में प्राप्त हो सकती है।"
        ],
        "quote": "जब नियत मदद करने की हो और तकनीक प्रामाणिक हो, तो लक्ष्मी का आगमन स्वाभाविक हो जाता है।",
        "cta": "आवेदन करें: shriramjiastro.in/careers.html | संपर्क: support@shriramjiastro.in",
        "hashtags": "#WorkFromHome #WomenEmpowerment #StudentJobs #PartTimeIncome #Sutradhar #ShriRamjiAstro #CareerOpportunity"
    },
    {
        "id": "precision_astronomy",
        "category": "खगोलीय शुद्धता बनाम गलत गणना",
        "hook": "गलत कुंडली गणना से जीवन के बड़े फैसले भटक जाते हैं: जानिए क्यों 'सटीक गणित' ही सच्चा ज्योतिष है",
        "title": "सटीक खगोल गणित (NASA JPL & Swiss Ephemeris) — आधुनिक समय की अनिवार्यता",
        "body_points": [
            "अधिकांश पारंपरिक और ऑनलाइन ऐप्स में 2 से 5 मिनट की गणितीय त्रुटि (Computational Drift) आ जाती है, जिससे नवमांश (D9) और दशमांश (D10) जैसे महत्वपूर्ण सूक्ष्म चक्र बदल जाते हैं।",
            "गलत गणना पर आधारित उपाय कभी सार्थक परिणाम नहीं दे सकते।",
            "श्री राम जी एस्ट्रो ने NASA JPL DE431 और स्विस एफेमेरिस के आधार पर उप-आर्कसेकंड (<0.001\") सटीकता का इंजन तैयार किया है।",
            "यह केवल भविष्यवाणी नहीं, बल्कि ब्रह्मांड के नियमों के साथ जीवन को पूर्ण सामंजस्य में लाने का पवित्र विज्ञान है।"
        ],
        "quote": "खगोल गणित की शुद्धता ही फलित की सत्यता का आधार है — महर्षि पाराशर।",
        "cta": "सटीक पत्रिका देखें: shriramjiastro.in | जुड़ें: shriramjiastro.in/careers.html",
        "hashtags": "#VedicAstronomy #HighPrecision #SwissEphemeris #JyotishScience #Patrika #BPHS #ShriRamjiAstro"
    },
    {
        "id": "calendar_to_panchang",
        "category": "काल चक्र एवं पंचांग क्रांति",
        "hook": "अंग्रेज़ी तारीखें कृत्रिम हैं, जबकि 'तिथि' ब्रह्मांड का स्पंदन है: समय की सच्ची समझ की वापसी",
        "title": "कैलेंडर से पंचांग की ओर: दैनिक जीवन में तिथि की कार्यात्मक वापसी",
        "body_points": [
            "हम सूर्य और चंद्रमा के निरंतर बदलते कोण (12 डिग्री = 1 तिथि) से संचालित होते हैं, न कि घड़ी की किसी कृत्रिम सुई से।",
            "जब आप अपनी दैनिक दिनचर्या, साधना, और संकल्पों को सही तिथि और नक्षत्र के अनुसार ढालते हैं, तो जीवन में ऊर्जा का प्रवाह स्वतः सुगम हो जाता है।",
            "हमारा विज़न है: आधुनिक समय-प्रणाली को पुनः खगोलीय पंचांग की लय से जोड़ना।",
            "इस क्रांति में देश के हर कोने से सहयोगी जुड़ रहे हैं। आप भी हमारे मिशन का हिस्सा बन सकते हैं।"
        ],
        "quote": "काल ही ब्रह्मांड का वास्तविक रूप है; समय की सही गणना ही सफलता का मार्ग है।",
        "cta": "पंचांग जानें: shriramjiastro.in/aaj-panchang.html | अभियान से जुड़ें: support@shriramjiastro.in",
        "hashtags": "#VedicPanchang #TithiSystem #CosmicTime #AncientWisdom #TimeRevolution #ShriRamjiAstro"
    },
    {
        "id": "one_day_one_soul",
        "category": "परामर्श की मर्यादा",
        "hook": "कॉल सेंटर जैसी 5 मिनट की जल्दबाज़ी नहीं: जानिए क्या है 'एक दिन, एक जातक' का कठोर शास्त्रीय नियम",
        "title": "दैवज्ञ परामर्श की पवित्र मर्यादा: एकाग्रता, साधना और समर्पण",
        "body_points": [
            "प्राचीन ग्रंथों का स्पष्ट नियम है कि एक दिन में दर्जनों कुंडलियां देखने से दैवज्ञ की 'प्रतिभा' (Intuitive Clarity) क्षीण हो जाती है।",
            "श्री राम जी एस्ट्रो में दिनभर में केवल एक जातक का 180 मिनट का सघन कुंडली विश्लेषण स्वीकार किया जाता है।",
            "यदि जातक का चंद्र-गोचर (जैसे अष्टम चंद्र) उस दिन अशांत हो, तो हमारा सिस्टम बुकिंग को स्वतः रोक देता है—क्योंकि हमारे लिए शास्त्र सर्वोपरि है, व्यापार नहीं।",
            "यह प्रामाणिकता ही आज भारत भर के लाखों परिवारों का अटूट विश्वास बन रही है।"
        ],
        "quote": "परामर्श व्यापार नहीं, जातक के आत्म-कल्याण का पवित्र अनुष्ठान है।",
        "cta": "परामर्श विवरण: shriramjiastro.in/consultation.html | पार्टनर बनें: shriramjiastro.in/careers.html",
        "hashtags": "#OneDayOneSoul #EthicalAstrology #SanctuaryConsultation #ChandraBal #AuthenticJyotish"
    },
    {
        "id": "doctor_prescription_sankalp",
        "category": "डिजिटल उपचार एवं नित्य साधना",
        "hook": "उपाय केवल पर्ची पर लिख देने से पूरे नहीं होते: दैनिक संकल्प पूर्ति का नया डिजिटल अनुशासन",
        "title": "डॉक्टर की तर्ज पर दैवज्ञ उपचार और 'आज का संकल्प पूर्ति' ट्रैकर",
        "body_points": [
            "जैसे डॉक्टर रोगी को नियमित दवा का चार्ट देता है, वैसे ही श्री राम जी एस्ट्रो पर दैवज्ञ लिखित रूप से सटीक मंत्र, आवृत्ति (जैसे 11 बार हनुमान चालीसा) और अवधि का डिजिटल प्रिस्क्रिप्शन जारी करते हैं।",
            "क्लाइंट अपने फोन से लॉगिन करके रोज़ाना अपना 'संकल्प पूर्ति' टिक मार्क कर सकता है: आज कितने पूर्ण, कितने शेष।",
            "अनुशासन ही उपाय की सफलता की कुंजी है। जब जातक नियम से साधना करता है, तभी ग्रह अनुकूल होते हैं।",
            "इस डिजिटल क्रांति को जन-जन तक पहुँचाकर आप भी सम्मानजनक मासिक आय अर्जित कर सकते हैं।"
        ],
        "quote": "नियमित साधना और दृढ़ संकल्प ही प्रारब्ध के कठिन बंधनों को काटने की शक्ति रखते हैं।",
        "cta": "दैनिक संकल्प: shriramjiastro.in/sankalp.html | सूत्रधार बनें: shriramjiastro.in/careers.html",
        "hashtags": "#SankalpPurti #DailyRemedies #AstrologyPrescription #SpiritualDiscipline #ShriRamjiAstro"
    }
]

def find_chrome_binary():
    candidates = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "google-chrome",
        "chromium"
    ]
    for c in candidates:
        if Path(c).is_file():
            return c
        import shutil
        if shutil.which(c):
            return shutil.which(c)
    return None

def generate_visual_card(campaign: dict, output_image_path: Path) -> bool:
    """
    Renders a stunning 1200x1200px royal social media card using Chrome headless.
    """
    chrome_bin = find_chrome_binary()
    temp_html = output_image_path.parent / f"temp_{output_image_path.stem}.html"
    
    html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1200px;
    height: 1200px;
    background: radial-gradient(circle at 50% 25%, #1c102a 0%, #0d0617 60%, #06020c 100%);
    font-family: 'Noto Sans Devanagari', -apple-system, sans-serif;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 70px 80px;
    position: relative;
    overflow: hidden;
  }}
  .frame {{
    position: absolute;
    inset: 30px;
    border: 2px solid rgba(201, 168, 76, 0.4);
    border-radius: 20px;
    pointer-events: none;
  }}
  .frame-inner {{
    position: absolute;
    inset: 42px;
    border: 3.5px solid #c9a84c;
    border-radius: 14px;
    box-shadow: inset 0 0 40px rgba(201, 168, 76, 0.15), 0 0 30px rgba(201, 168, 76, 0.2);
    pointer-events: none;
  }}
  .top-badge {{
    background: linear-gradient(135deg, rgba(201, 168, 76, 0.2), rgba(201, 168, 76, 0.05));
    border: 1px solid #c9a84c;
    color: #f3d27a;
    font-size: 22px;
    font-weight: 700;
    padding: 8px 24px;
    border-radius: 30px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }}
  .brand-header {{
    text-align: center;
    margin-top: 10px;
  }}
  .brand-title {{
    font-family: 'Cinzel', serif;
    font-size: 34px;
    font-weight: 700;
    color: #f3d27a;
    letter-spacing: 2px;
  }}
  .brand-sub {{
    font-size: 18px;
    color: #a497bd;
    margin-top: 4px;
  }}
  .content-center {{
    text-align: center;
    max-width: 980px;
    margin: 20px 0;
  }}
  .main-title {{
    font-size: 42px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.35;
    margin-bottom: 24px;
    text-shadow: 0 4px 15px rgba(0,0,0,0.6);
  }}
  .quote-box {{
    background: rgba(201, 168, 76, 0.08);
    border-left: 6px solid #c9a84c;
    padding: 24px 30px;
    border-radius: 10px;
    font-size: 26px;
    font-weight: 600;
    color: #fce7ba;
    line-height: 1.5;
    margin: 20px auto;
  }}
  .footer-row {{
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1.5px solid rgba(201, 168, 76, 0.3);
    padding-top: 24px;
    font-size: 20px;
    color: #e5c07b;
    font-weight: 600;
  }}
</style>
</head>
<body>
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="brand-header">
    <div class="top-badge">{campaign['category']}</div>
    <h1 class="brand-title">SHRI RAMJI ASTRO</h1>
    <div class="brand-sub">Modern Computational Vedic Astronomy & High-Precision Astrology</div>
  </div>

  <div class="content-center">
    <div class="main-title">{campaign['title']}</div>
    <div class="quote-box">"{campaign['quote']}"</div>
  </div>

  <div class="footer-row">
    <span>🌐 shriramjiastro.in</span>
    <span>🤝 सूत्रधार अवसर: careers.html</span>
    <span>📧 support@shriramjiastro.in</span>
  </div>
</body>
</html>
"""
    try:
        with open(temp_html, "w", encoding="utf-8") as f:
            f.write(html)
            
        if chrome_bin:
            cmd = [
                chrome_bin,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--window-size=1200,1200",
                f"--screenshot={str(output_image_path.resolve())}",
                str(temp_html.resolve())
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if res.returncode == 0 and output_image_path.exists():
                return True
    except Exception as e:
        print(f"[LinkedInAutomation] Chrome card error: {e}")
    finally:
        if temp_html.exists():
            temp_html.unlink()
            
    # PIL Fallback if Chrome screenshot fails
    try:
        img = Image.new("RGB", (1200, 1200), color=(14, 8, 24))
        draw = ImageDraw.Draw(img)
        draw.rectangle([(30, 30), (1170, 1170)], outline=(201, 168, 76), width=4)
        draw.text((600, 100), "SHRI RAMJI ASTRO", fill=(243, 210, 122), anchor="mm")
        draw.text((600, 500), campaign['title'][:40], fill=(255, 255, 255), anchor="mm")
        draw.text((600, 1100), "🌐 shriramjiastro.in/careers.html", fill=(201, 168, 76), anchor="mm")
        img.save(output_image_path)
        return True
    except Exception as e:
        print(f"[LinkedInAutomation] PIL fallback error: {e}")
        return False

def generate_daily_linkedin_package(target_date: datetime.date = None) -> dict:
    """
    Synthesizes the complete daily post content and generates the matching high-res image card.
    """
    if not target_date:
        target_date = datetime.date.today()
        
    date_str = target_date.isoformat()
    day_idx = target_date.timetuple().tm_yday
    campaign = DAILY_CAMPAIGNS[day_idx % len(DAILY_CAMPAIGNS)]
    
    daily_dir = OUTPUT_DIR / date_str
    daily_dir.mkdir(parents=True, exist_ok=True)
    card_path = daily_dir / f"linkedin_card_{campaign['id']}.png"
    
    # Generate image card
    generate_visual_card(campaign, card_path)
    
    # Compose structured post copy
    post_text = f"🕉️ {campaign['hook']}\n\n"
    post_text += f"🌟 {campaign['title']}\n\n"
    for pt in campaign['body_points']:
        post_text += f"• {pt}\n"
    post_text += f"\n💡 \"{campaign['quote']}\"\n\n"
    post_text += f"🎯 {campaign['cta']}\n\n"
    post_text += f"{campaign['hashtags']}"
    
    result = {
        "date": date_str,
        "campaign_id": campaign['id'],
        "category": campaign['category'],
        "title": campaign['title'],
        "post_text": post_text,
        "image_card_path": str(card_path.resolve()) if card_path.exists() else None,
        "created_at": datetime.datetime.now().isoformat()
    }
    
    # Save package to disk
    json_path = daily_dir / "linkedin_package.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        
    print(f"[LinkedInAutomation] Daily package generated for {date_str} ({campaign['category']})")
    print(f"[LinkedInAutomation] Image card: {card_path}")
    return result

if __name__ == "__main__":
    pkg = generate_daily_linkedin_package()
    print("\n--- GENERATED POST PREVIEW ---")
    print(pkg["post_text"])
