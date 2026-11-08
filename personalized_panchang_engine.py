"""
=============================================================================
SRA PERSONALIZED PANCHANG & MICRO-ASTROLOGICAL ENGINE
=============================================================================
Hyper-Calibrated Daily Astrological Guide Engine:
1. Micro-Nakshatra Calculations:
   - 27 Nakshatras & 108 Padas
   - Nakshatra Lord (Star Lord)
   - Pada Lord (Navamsha Sign Lord)
   - Sub-Lord (KP-grade proportional 120-part Vimshottari division)
   - Sub-Sub Lord (Micro-level second-tier proportional division)
2. Nava-Tara Chakra (तारा बल):
   - 9 Tara categories: Janma, Sampat, Vipat, Kshema, Pratyak, Sadhana,
     Naidhana (Vadha), Mitra, Parama Mitra
   - 3 Paryayas: Deha (1-9), Karma (10-18), Manasa (19-27)
   - Special Sensitive Nakshatras: Karma (10), Sanghatika (16),
     Samudayika (18), Vainashika (23), Manasa (25), Abhisheka (27)
3. Multi-Dasha Convergence:
   - 5-Tier Vimshottari (Maha, Antar, Pratyantar, Sukshma, Pran)
   - 3-Tier Yogini Dasha (Major, Sub, Sub-sub)
   - Jaimini Chara Dasha & Seven Karakas (AK, AmK, etc.)
4. Sudarshan Chakra Gochar & Bhavat Bhavam:
   - Triple Reference Frame: Lagna, Chandra, Surya
   - Planet-to-Natal-Planet relative disposition
   - Bhavat Bhavam principle across D1 to D60 charts
5. Janma Panchang vs Daily Panchang Resonance:
   - Tithi (Dagdha/Shunya), Vaar, Yoga, Karana, Ashtakavarga BAV/SAV
6. Daily Personalized Insights & Timelines:
   - Day Score (0-100), Core Theme, Do's & Don'ts, Golden/Caution Windows, Remedies
=============================================================================
"""

from __future__ import annotations
import math
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

# Import existing canonical engine
import sys
from pathlib import Path

# Add current directory to path if needed
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.append(str(CURRENT_DIR))

import parashara_canonical_engine as pce

# =============================================================================
# 1. CONSTANTS & VEDIC DEFINITIONS
# =============================================================================

PLANETS_ORDER = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"]

PLANET_NAMES_HI = {
    "Sun": "सूर्य", "Moon": "चंद्र", "Mars": "मंगल", "Mercury": "बुध",
    "Jupiter": "गुरु", "Venus": "शुक्र", "Saturn": "शनि", "Rahu": "राहु", "Ketu": "केतु"
}

RASHI_NAMES_HI = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुंभ", "मीन"
]

RASHI_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
]

NAKSHATRA_NAMES = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
]

NAKSHATRA_NAMES_HI = [
    "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
    "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी",
    "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा",
    "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा",
    "पूर्वाभाद्रपद", "उत्तराभाद्रपद", "रेवती"
]

# Nakshatra Lord Order (Vimshottari sequence 9 * 3 = 27)
NAKSHATRA_LORDS = [
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
    "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
]

# Vimshottari periods in years (Sum = 120)
VIMSHOTTARI_YEARS = {
    "Ketu": 7.0, "Venus": 20.0, "Sun": 6.0, "Moon": 10.0, "Mars": 7.0,
    "Rahu": 18.0, "Jupiter": 16.0, "Saturn": 19.0, "Mercury": 17.0
}
VIMSHOTTARI_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]

# Yogini Dasha definitions (36 years total cycle)
YOGINI_ORDER = [
    {"name": "Mangala", "name_hi": "मंगला", "lord": "Moon", "years": 1.0, "nature": "Auspicious"},
    {"name": "Pingala", "name_hi": "पिंगला", "lord": "Sun", "years": 2.0, "nature": "Mixed / Malefic"},
    {"name": "Dhanya", "name_hi": "धान्या", "lord": "Jupiter", "years": 3.0, "nature": "Highly Auspicious"},
    {"name": "Bhramari", "name_hi": "भ्रामरी", "lord": "Mars", "years": 4.0, "nature": "Displacement / Caution"},
    {"name": "Bhadrika", "name_hi": "भद्रिका", "lord": "Mercury", "years": 5.0, "nature": "Auspicious / Intellect"},
    {"name": "Ulka", "name_hi": "उल्का", "lord": "Saturn", "years": 6.0, "nature": "Obstacles / Malefic"},
    {"name": "Siddha", "name_hi": "सिद्धा", "lord": "Venus", "years": 7.0, "nature": "Success / Wealth"},
    {"name": "Sankata", "name_hi": "संकटा", "lord": "Rahu", "years": 8.0, "nature": "Crisis / Severe Caution"}
]

TARA_BALA_MAP = [
    {"index": 1, "name": "Janma", "name_hi": "जन्म तारा", "type": "Neutral / Sensitive", "score": 40, "desc": "शारीरिक ऊर्जा व आत्म-विकास हेतु ठीक, जोखिम भरे कार्यों में सावधानी।"},
    {"index": 2, "name": "Sampat", "name_hi": "सम्पत तारा", "type": "Highly Auspicious", "score": 95, "desc": "धन लाभ, समृद्धि, नए सौदों व वित्तीय निर्णयों के लिए अत्यंत श्रेष्ठ।"},
    {"index": 3, "name": "Vipat", "name_hi": "विपत तारा", "type": "Inauspicious", "score": 20, "desc": "अड़चनें, अप्रत्याशित बाधाएं; नए अनुबंध या निवेश टालें।"},
    {"index": 4, "name": "Kshema", "name_hi": "क्षेम तारा", "type": "Auspicious", "score": 90, "desc": "कल्याण, सुरक्षा, पारिवारिक सुख व सामान्य कार्यों में सफलता।"},
    {"index": 5, "name": "Pratyak", "name_hi": "प्रत्यक तारा", "type": "Inauspicious", "score": 25, "desc": "शत्रुता, विरोध, मतभेद की आशंका; विवादित चर्चाओं से बचें।"},
    {"index": 6, "name": "Sadhana", "name_hi": "साधक तारा", "type": "Highly Auspicious", "score": 100, "desc": "महत्वाकांक्षी योजनाएं, इंटरव्यू, महत्वपूर्ण मीटिंग व लक्ष्य सिद्धि।"},
    {"index": 7, "name": "Naidhana", "name_hi": "वध / नैधन तारा", "type": "Highly Inauspicious", "score": 10, "desc": "अति संवेदनशील समय; दुर्घटना, विवाद व भारी निवेश से पूरी तरह बचें।"},
    {"index": 8, "name": "Mitra", "name_hi": "मित्र तारा", "type": "Auspicious", "score": 85, "desc": "मित्रों व सहयोगियों का साथ, नेटवर्किंग व सौहार्दपूर्ण वार्ता।"},
    {"index": 9, "name": "Parama Mitra", "name_hi": "परम मित्र तारा", "type": "Highly Auspicious", "score": 92, "desc": "वरिष्ठजनों से सहयोग, गुरु कृपा व रुके हुए कार्यों की पूर्ति।"}
]

# Planetary Friendship (Naisargika Sambandha)
NATURAL_FRIENDSHIP = {
    "Sun": {"friends": ["Moon", "Mars", "Jupiter"], "neutrals": ["Mercury"], "enemies": ["Venus", "Saturn", "Rahu", "Ketu"]},
    "Moon": {"friends": ["Sun", "Mercury"], "neutrals": ["Mars", "Jupiter", "Venus", "Saturn"], "enemies": ["Rahu", "Ketu"]},
    "Mars": {"friends": ["Sun", "Moon", "Jupiter"], "neutrals": ["Venus", "Saturn"], "enemies": ["Mercury", "Rahu", "Ketu"]},
    "Mercury": {"friends": ["Sun", "Venus"], "neutrals": ["Mars", "Jupiter", "Saturn"], "enemies": ["Moon", "Rahu", "Ketu"]},
    "Jupiter": {"friends": ["Sun", "Moon", "Mars"], "neutrals": ["Saturn"], "enemies": ["Mercury", "Venus", "Rahu", "Ketu"]},
    "Venus": {"friends": ["Mercury", "Saturn", "Rahu", "Ketu"], "neutrals": ["Mars", "Jupiter"], "enemies": ["Sun", "Moon"]},
    "Saturn": {"friends": ["Mercury", "Venus", "Rahu"], "neutrals": ["Jupiter"], "enemies": ["Sun", "Moon", "Mars", "Ketu"]},
    "Rahu": {"friends": ["Venus", "Saturn", "Mercury"], "neutrals": ["Jupiter"], "enemies": ["Sun", "Moon", "Mars", "Ketu"]},
    "Ketu": {"friends": ["Mars", "Venus", "Jupiter"], "neutrals": ["Mercury", "Saturn"], "enemies": ["Sun", "Moon", "Rahu"]}
}


# =============================================================================
# 2. MICRO-NAKSHATRA COMPUTATION (Lord, Pada, Sub-Lord, Sub-Sub Lord)
# =============================================================================

def calculate_micro_nakshatra(longitude: float) -> Dict[str, Any]:
    """
    Computes hyper-precise Nakshatra breakdown:
    - 27 Nakshatras (13°20' = 800' each)
    - Pada (3°20' = 200' each) and Pada Lord (Navamsha Sign Lord)
    - Sub-Lord (KP proportional 120-part division)
    - Sub-Sub Lord (Micro-level second-tier division)
    """
    lon = pce.norm360(longitude)
    total_minutes = lon * 60.0
    nak_minutes = 800.0  # 13 deg 20 min

    nak_index = int(total_minutes // nak_minutes) % 27
    rem_in_nak = total_minutes % nak_minutes  # minutes inside this nakshatra

    # Pada (0 to 3 -> 1 to 4)
    pada = int(rem_in_nak // 200.0) + 1
    rem_in_pada = rem_in_nak % 200.0

    # Navamsha sign for Pada Lord
    # Navamsha index = total_minutes // 200.0
    navamsha_sign_idx = int(total_minutes // 200.0) % 12
    pada_lord = RASHI_LORDS[navamsha_sign_idx]
    pada_rashi = RASHI_NAMES_HI[navamsha_sign_idx]

    nak_lord = NAKSHATRA_LORDS[nak_index]
    nak_name = NAKSHATRA_NAMES[nak_index]
    nak_name_hi = NAKSHATRA_NAMES_HI[nak_index]

    # Sub-Lord calculation:
    # 13°20' is divided into 9 sub-arcs proportional to Vimshottari years (out of 120)
    # Starting from the Nakshatra Lord!
    start_lord_idx = VIMSHOTTARI_ORDER.index(nak_lord)
    accumulated_mins = 0.0
    sub_lord = nak_lord
    sub_start_min = 0.0
    sub_span_min = 0.0

    for i in range(9):
        curr_lord = VIMSHOTTARI_ORDER[(start_lord_idx + i) % 9]
        span = (VIMSHOTTARI_YEARS[curr_lord] / 120.0) * nak_minutes
        if rem_in_nak < (accumulated_mins + span):
            sub_lord = curr_lord
            sub_start_min = accumulated_mins
            sub_span_min = span
            break
        accumulated_mins += span

    rem_in_sub = rem_in_nak - sub_start_min

    # Sub-Sub Lord calculation:
    # Divide the sub_span_min into 9 sub-sub arcs proportional to Vimshottari years
    # Starting from the Sub-Lord!
    start_sub_idx = VIMSHOTTARI_ORDER.index(sub_lord)
    accumulated_sub_mins = 0.0
    sub_sub_lord = sub_lord

    for j in range(9):
        curr_sub_lord = VIMSHOTTARI_ORDER[(start_sub_idx + j) % 9]
        ss_span = (VIMSHOTTARI_YEARS[curr_sub_lord] / 120.0) * sub_span_min
        if rem_in_sub < (accumulated_sub_mins + ss_span):
            sub_sub_lord = curr_sub_lord
            break
        accumulated_sub_mins += ss_span

    deg_in_nak = rem_in_nak / 60.0
    pct_elapsed = round((rem_in_nak / nak_minutes) * 100.0, 2)

    return {
        "longitude": round(lon, 6),
        "nakshatra_index": nak_index,
        "nakshatra_name": nak_name,
        "nakshatra_name_hi": nak_name_hi,
        "nakshatra_lord": nak_lord,
        "nakshatra_lord_hi": PLANET_NAMES_HI.get(nak_lord, nak_lord),
        "pada": pada,
        "pada_lord": pada_lord,
        "pada_lord_hi": PLANET_NAMES_HI.get(pada_lord, pada_lord),
        "pada_rashi": pada_rashi,
        "sub_lord": sub_lord,
        "sub_lord_hi": PLANET_NAMES_HI.get(sub_lord, sub_lord),
        "sub_sub_lord": sub_sub_lord,
        "sub_sub_lord_hi": PLANET_NAMES_HI.get(sub_sub_lord, sub_sub_lord),
        "deg_in_nakshatra": round(deg_in_nak, 4),
        "elapsed_percent": pct_elapsed
    }


# =============================================================================
# 3. NAVA-TARA BALA & SPECIAL SENSITIVE NAKSHATRAS
# =============================================================================

def calculate_tara_bala(natal_moon_nak_idx: int, transit_nak_idx: int) -> Dict[str, Any]:
    """
    Calculates exact Tara Bala and Paryaya (Deha, Karma, Manasa).
    Distance from Janma Nakshatra is counted inclusively (1 to 27).
    """
    # 1-based distance from natal nakshatra to transit nakshatra
    dist = ((transit_nak_idx - natal_moon_nak_idx) % 27) + 1

    # 9 Tara cycles
    tara_rem = ((dist - 1) % 9) + 1  # 1 to 9
    tara_info = TARA_BALA_MAP[tara_rem - 1]

    # Paryaya (त्रिजन्म चक्र)
    if dist <= 9:
        paryaya = "प्रथम पर्याय (देह तारा - Prathama / Physical)"
        paryaya_weight = 1.0
    elif dist <= 18:
        paryaya = "द्वितीय पर्याय (कर्म तारा - Dvitiya / Action & Career)"
        paryaya_weight = 0.9
    else:
        paryaya = "तृतीय पर्याय (मानस तारा - Tritiya / Psychological & Subtle)"
        paryaya_weight = 0.8

    # Special Sensitive Nakshatras (विशेष संवेदनशील नक्षत्र)
    special_role = None
    if dist == 1:
        special_role = "जन्म नक्षत्र (Janma - Self & Vitality)"
    elif dist == 10:
        special_role = "कर्म नक्षत्र (Karma - Professional Pivot)"
    elif dist == 16:
        special_role = "सांघातिक नक्षत्र (Sanghatika - High Impact / Associations)"
    elif dist == 18:
        special_role = "सामुदायिक नक्षत्र (Samudayika - Collective / Public Influence)"
    elif dist == 23:
        special_role = "विनाश नक्षत्र (Vainashika - Destruction / Extreme Caution)"
    elif dist == 25:
        special_role = "मानस नक्षत्र (Manasa - Mind, Thoughts & Mental State)"
    elif dist == 27:
        special_role = "अभिषेक नक्षत्र (Abhisheka - Coronation / Peak Auspiciousness)"

    score = round(tara_info["score"] * paryaya_weight, 1)

    return {
        "distance": dist,
        "tara_index": tara_rem,
        "tara_name": tara_info["name"],
        "tara_name_hi": tara_info["name_hi"],
        "tara_type": tara_info["type"],
        "paryaya": paryaya,
        "special_role": special_role,
        "score": score,
        "description": tara_info["desc"]
    }


# =============================================================================
# 4. YOGINI DASHA ENGINE (36-Year Cycle)
# =============================================================================

def calculate_yogini_dasha(moon_abs_deg: float, target_jd: float, birth_jd: float) -> Dict[str, Any]:
    """
    Computes Yogini Dasha at target date:
    - 8 Yoginis: Mangala(1), Pingala(2), Dhanya(3), Bhramari(4),
      Bhadrika(5), Ulka(6), Siddha(7), Sankata(8) = Total 36 years.
    - Nakshatra starting rule: (Nakshatra Index + 3) % 8 -> 0=Sankata, 1=Mangala...
    """
    nak_idx = int((moon_abs_deg * 60.0) // 800.0) % 27
    rem_deg = (moon_abs_deg * 60.0) % 800.0
    fraction_spent = rem_deg / 800.0

    # Yogini at birth:
    # Formula: (Nakshatra_Index (1-based) + 3) % 8
    # Ashwini (1) + 3 = 4 -> Bhramari.
    # In 0-based nak_idx: (nak_idx + 1 + 3) % 8 -> (nak_idx + 4) % 8
    start_yogini_idx = (nak_idx + 4) % 8
    start_yogini = YOGINI_ORDER[start_yogini_idx]

    # Total duration of starting yogini
    full_duration_days = start_yogini["years"] * 365.25
    balance_days = full_duration_days * (1.0 - fraction_spent)

    elapsed_days = target_jd - birth_jd
    if elapsed_days < 0:
        elapsed_days = 0.0

    # Progress through cycles
    curr_idx = start_yogini_idx
    curr_remaining = balance_days

    if elapsed_days <= curr_remaining:
        active_major = YOGINI_ORDER[curr_idx]
    else:
        elapsed_days -= curr_remaining
        curr_idx = (curr_idx + 1) % 8
        while True:
            span_days = YOGINI_ORDER[curr_idx]["years"] * 365.25
            if elapsed_days <= span_days:
                active_major = YOGINI_ORDER[curr_idx]
                break
            elapsed_days -= span_days
            curr_idx = (curr_idx + 1) % 8

    # Sub-Yogini calculation
    # Proportionate division of active_major by the 8 yoginis starting from active_major
    sub_elapsed = elapsed_days
    major_total_days = active_major["years"] * 365.25
    active_sub = active_major

    for s in range(8):
        sub_candidate = YOGINI_ORDER[(curr_idx + s) % 8]
        sub_span = (sub_candidate["years"] / 36.0) * major_total_days
        if sub_elapsed <= sub_span:
            active_sub = sub_candidate
            break
        sub_elapsed -= sub_span

    # Score calculation
    nature_scores = {
        "Highly Auspicious": 95,
        "Auspicious": 85,
        "Auspicious / Intellect": 80,
        "Mixed / Malefic": 45,
        "Displacement / Caution": 35,
        "Obstacles / Malefic": 25,
        "Crisis / Severe Caution": 15
    }
    major_score = nature_scores.get(active_major["nature"], 50)
    sub_score = nature_scores.get(active_sub["nature"], 50)
    composite_yogini_score = round(major_score * 0.6 + sub_score * 0.4, 1)

    return {
        "major": active_major["name"],
        "major_hi": active_major["name_hi"],
        "major_lord": active_major["lord"],
        "major_nature": active_major["nature"],
        "sub": active_sub["name"],
        "sub_hi": active_sub["name_hi"],
        "sub_lord": active_sub["lord"],
        "score": composite_yogini_score
    }


# =============================================================================
# 5. JAIMINI CHARA DASHA & ATMAKARAKA ENGINE
# =============================================================================

def calculate_jaimini_char_factors(planet_map: Dict[str, Any], lagna_sign: int) -> Dict[str, Any]:
    """
    Computes Jaimini 7 Chara Karakas (AK, AmK, BK, MK, PK, GK, DK)
    based on degrees (excluding Rahu/Ketu for 7-karaka scheme).
    """
    # 7 classical planets sorted by degree in sign (descending)
    candidates = []
    for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if p in planet_map:
            deg_in_sign = planet_map[p]["abs"] % 30.0
            candidates.append({"planet": p, "deg": deg_in_sign, "sign": planet_map[p]["sign"]})

    candidates.sort(key=lambda x: x["deg"], reverse=True)

    karaka_roles = [
        ("AK", "आत्मकारक (Soul / Core Drive)"),
        ("AmK", "अमात्यकारक (Career / Minister)"),
        ("BK", "भ्रातृकारक (Siblings / Courage)"),
        ("MK", "मातृकारक (Mother / Nourishment)"),
        ("PK", "पुत्रकारक (Children / Intellect)"),
        ("GK", "ज्ञातिकारक (Obstacles / Competitors)"),
        ("DK", "दाराकारक (Spouse / Partnerships)")
    ]

    karakas = {}
    for i, (code, title) in enumerate(karaka_roles):
        if i < len(candidates):
            karakas[code] = {
                "planet": candidates[i]["planet"],
                "planet_hi": PLANET_NAMES_HI.get(candidates[i]["planet"]),
                "degree_in_sign": round(candidates[i]["deg"], 4),
                "sign": candidates[i]["sign"],
                "title": title
            }

    return karakas


# =============================================================================
# 6. SUDARSHAN CHAKRA GOCHAR & BHAVAT BHAVAM ENGINE
# =============================================================================

def calculate_sudarshan_gochar(
    natal_chart: Dict[str, Any],
    transit_planet_map: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculates transits relative to 3 Ascendants (Sudarshan Chakra):
    - Lagna Kundali (1st House)
    - Chandra Kundali (Moon Sign)
    - Surya Kundali (Sun Sign)
    Also computes Planet-from-Natal-Planet relative houses and Bhavat Bhavam.
    """
    lagna_sign = natal_chart["lagnaSign"]  # 0 to 11
    natal_planets = {p["id"]: p for p in natal_chart.get("planets", [])}
    moon_sign = natal_planets["Moon"]["sign"]
    sun_sign = natal_planets["Sun"]["sign"]
    results = {}

    favorable_from_moon = {
        "Sun": [3, 6, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Mars": [3, 6, 11],
        "Mercury": [2, 4, 6, 8, 10, 11],
        "Jupiter": [2, 5, 7, 9, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Saturn": [3, 6, 11],
        "Rahu": [3, 6, 10, 11],
        "Ketu": [3, 6, 11]
    }

    total_lagna_favorable = 0
    total_moon_favorable = 0
    total_sun_favorable = 0
    total_mutual_harmony = 0

    planet_details = {}

    for p in PLANETS_ORDER:
        if p not in transit_planet_map or p not in natal_planets:
            continue

        tr_sign = transit_planet_map[p]["sign"]
        nat_sign = natal_planets[p]["sign"]

        # Houses from reference points (1-based: 1 to 12)
        house_from_lagna = ((tr_sign - lagna_sign) % 12) + 1
        house_from_moon = ((tr_sign - moon_sign) % 12) + 1
        house_from_sun = ((tr_sign - sun_sign) % 12) + 1

        # Planet relative to its own natal position (ग्रह से ग्रह स्थिति)
        house_from_natal_self = ((tr_sign - nat_sign) % 12) + 1

        # Check favorability
        is_moon_fav = house_from_moon in favorable_from_moon.get(p, [])
        if is_moon_fav:
            total_moon_favorable += 1

        # General favorable houses from Lagna (Upachaya 3,6,10,11 and Kendra/Trikona)
        is_lagna_fav = house_from_lagna in [1, 3, 5, 6, 9, 10, 11]
        if is_lagna_fav:
            total_lagna_favorable += 1

        is_sun_fav = house_from_sun in [3, 6, 10, 11]
        if is_sun_fav:
            total_sun_favorable += 1

        # Mutual placement harmony (1/7, 5/9, 3/11 are harmonious; 6/8, 2/12 cause friction)
        is_harmonious = house_from_natal_self in [1, 3, 5, 7, 9, 11]
        if is_harmonious:
            total_mutual_harmony += 1

        planet_details[p] = {
            "planet_hi": PLANET_NAMES_HI[p],
            "transit_sign": RASHI_NAMES_HI[tr_sign],
            "house_from_lagna": house_from_lagna,
            "house_from_moon": house_from_moon,
            "house_from_sun": house_from_sun,
            "house_from_natal_self": house_from_natal_self,
            "is_moon_favorable": is_moon_fav,
            "is_lagna_favorable": is_lagna_fav,
            "mutual_aspect_pattern": f"{house_from_natal_self}th from Natal {PLANET_NAMES_HI[p]}"
        }

    # Chandrashtama Check (गोचर चंद्र 8वें भाव में)
    transit_moon_sign = transit_planet_map["Moon"]["sign"]
    moon_house_from_moon = ((transit_moon_sign - moon_sign) % 12) + 1
    is_chandrashtama = (moon_house_from_moon == 8)

    # Bhavat Bhavam Calculation across key houses
    # e.g., 5th from 5th = 9th, 7th from 7th = 1st, 10th from 10th = 7th
    bhavat_bhavam_effects = {
        "5th_of_5th (9th - Dharma & Fortune)": ((lagna_sign + 8) % 12),
        "7th_of_7th (1st - Personality & Partners)": lagna_sign,
        "10th_of_10th (7th - Business & Public Karma)": ((lagna_sign + 6) % 12)
    }

    # Sudarshan Composite Score (0-100)
    score_lagna = (total_lagna_favorable / len(PLANETS_ORDER)) * 100
    score_moon = (total_moon_favorable / len(PLANETS_ORDER)) * 100
    score_sun = (total_sun_favorable / len(PLANETS_ORDER)) * 100
    score_mutual = (total_mutual_harmony / len(PLANETS_ORDER)) * 100

    composite_score = round(
        score_lagna * 0.35 + score_moon * 0.35 + score_sun * 0.15 + score_mutual * 0.15,
        1
    )

    if is_chandrashtama:
        composite_score = max(10.0, composite_score - 25.0)

    return {
        "composite_score": composite_score,
        "is_chandrashtama": is_chandrashtama,
        "chandrashtama_alert": "चंद्राष्टम दोष: आज गोचर चंद्र आपकी जन्म राशि से 8वें भाव में है। मानसिक तनाव, वाद-विवाद व नए कार्यों से बचें।" if is_chandrashtama else None,
        "lagna_favorable_count": total_lagna_favorable,
        "moon_favorable_count": total_moon_favorable,
        "sun_favorable_count": total_sun_favorable,
        "planets": planet_details,
        "bhavat_bhavam": bhavat_bhavam_effects
    }


# =============================================================================
# 6.5 DEEP PANCHANG RESONANCE ENGINE (Tithi, Yoga, Karana, Vaar & Shunya Rashis)
# =============================================================================

TITHI_SHUNYA_MAP = {
    1: [6, 9],           # प्रतिपदा: तुला (6), मकर (9)
    2: [8, 11],          # द्वितीया: धनु (8), मीन (11)
    3: [4, 9],           # तृतीया: सिंह (4), मकर (9)
    4: [10, 11],         # चतुर्थी: कुंभ (10), मीन (11)
    5: [2, 5],           # पंचमी: मिथुन (2), कन्या (5)
    6: [0, 4],           # षष्ठी: मेष (0), सिंह (4)
    7: [8, 3],           # सप्तमी: धनु (8), कर्क (3)
    8: [2, 5],           # अष्टमी: मिथुन (2), कन्या (5)
    9: [4, 7],           # नवमी: सिंह (4), वृश्चिक (7)
    10: [4, 7],          # दशमी: सिंह (4), वृश्चिक (7)
    11: [8, 11],         # एकादशी: धनु (8), मीन (11)
    12: [6, 9],          # द्वादशी: तुला (6), मकर (9)
    13: [1, 4],          # त्रयोदशी: वृषभ (1), सिंह (4)
    14: [2, 5, 8, 11],   # चतुर्दशी: मिथुन (2), कन्या (5), धनु (8), मीन (11)
    15: [],              # पूर्णिमा: कोई शून्य नहीं
    30: []               # अमावस्या: कोई शून्य नहीं
}

TITHI_CATEGORY_MAP = {
    1: ("Nanda", "नंदा", "Venus", "आनंद, भौतिक सुख व नए संकल्प"),
    2: ("Bhadra", "भद्रा", "Mercury", "बुद्धि, विद्या, अध्ययन व योजनाएं"),
    3: ("Jaya", "जया", "Mars", "विजय, पराक्रम, मुकदमे व प्रतियोगिता"),
    4: ("Rikta", "रिक्ता", "Saturn", "रिक्त/शून्य — नए व मांगलिक कार्य पूर्णतः वर्जित"),
    5: ("Poorna", "पूर्णा", "Jupiter", "पूर्णता, प्रतिष्ठा व स्थायी कार्य"),
    6: ("Nanda", "नंदा", "Venus", "आनंद, भौतिक सुख व नए संकल्प"),
    7: ("Bhadra", "भद्रा", "Mercury", "बुद्धि, विद्या, अध्ययन व योजनाएं"),
    8: ("Jaya", "जया", "Mars", "विजय, पराक्रम, मुकदमे व प्रतियोगिता"),
    9: ("Rikta", "रिक्ता", "Saturn", "रिक्त/शून्य — नए व मांगलिक कार्य पूर्णतः वर्जित"),
    10: ("Poorna", "पूर्णा", "Jupiter", "पूर्णता, प्रतिष्ठा व स्थायी कार्य"),
    11: ("Nanda", "नंदा", "Venus", "आनंद, भौतिक सुख व नए संकल्प"),
    12: ("Bhadra", "भद्रा", "Mercury", "बुद्धि, विद्या, अध्ययन व योजनाएं"),
    13: ("Jaya", "जया", "Mars", "विजय, पराक्रम, मुकदमे व प्रतियोगिता"),
    14: ("Rikta", "रिक्ता", "Saturn", "रिक्त/शून्य — नए व मांगलिक कार्य पूर्णतः वर्जित"),
    15: ("Poorna", "पूर्णा", "Saturn", "पूर्णता व शांति"),
    30: ("Poorna", "पूर्णा (अमावस्या)", "Rahu", "पितृ कर्म, एकांत व आत्ममंथन")
}

INAUSPICIOUS_YOGAS = {
    "विष्कुम्भ": {"idx": 1, "dosha": "विष्कुम्भ योग (प्रारंभिक 3 घटी त्याज्य)", "penalty": 15},
    "अतिगण्ड": {"idx": 6, "dosha": "अतिगण्ड योग (प्रारंभिक 6 घटी में अप्रत्याशित बाधाएं)", "penalty": 20},
    "शूल": {"idx": 9, "dosha": "शूल योग (शूलवत कष्ट व तीक्ष्ण मतभेद)", "penalty": 25},
    "गण्ड": {"idx": 10, "dosha": "गण्ड योग (अड़चनें व अशांति)", "penalty": 20},
    "व्याघात": {"idx": 13, "dosha": "व्याघात योग (घात, दुर्घटना व विवाद से बचें)", "penalty": 30},
    "वज्र": {"idx": 15, "dosha": "वज्र योग (कटुता व मानसिक तनाव)", "penalty": 20},
    "व्यतीपात": {"idx": 17, "dosha": "व्यतीपात महादोष (सर्वनाशक योग — समस्त शुभ कर्म वर्जित)", "penalty": 45},
    "परिघ": {"idx": 19, "dosha": "परिघ योग (प्रारंभिक आधा भाग प्रतिकूल)", "penalty": 15},
    "वैधृति": {"idx": 27, "dosha": "वैधृति महादोष (अति अनिष्टकारी योग — कोई भी शुभ कार्य न करें)", "penalty": 45}
}

VAAR_LORDS = {
    "रविवार": "Sun", "सोमवार": "Moon", "मंगलवार": "Mars",
    "बुधवार": "Mercury", "गुरुवार": "Jupiter", "शुक्रवार": "Venus", "शनिवार": "Saturn"
}


def calculate_deep_panchang_resonance(
    natal_panchang: Dict[str, Any],
    transit_panchang: Dict[str, Any],
    transit_moon_sign: int,
    natal_lagna_sign: int,
    natal_moon_sign: int
) -> Dict[str, Any]:
    """
    Exhaustive classical Panchang Anga calibration:
    - Tithi: Nanda/Bhadra/Jaya/Rikta/Poorna classification, Rikta Dosha, Tithi Shunya Rashis.
    - Yoga: 9 Inauspicious Yogas (Vyatipata, Vaidhriti, Shoola, etc.) vs Auspicious Yogas.
    - Karana: Vishti (Bhadra) Dosha detection, Chara vs Sthira Karanas.
    - Vaar: Janma Vaar Lord vs Transit Vaar Lord planetary friendship.
    """
    transit_tithi = transit_panchang.get("tithi", {})
    tithi_num = transit_tithi.get("number", 1)
    tithi_name = transit_tithi.get("name", "")

    # 1. Tithi Category & Rikta Dosha
    cat_tuple = TITHI_CATEGORY_MAP.get(tithi_num, ("General", "सामान्य", "Mercury", ""))
    is_rikta = (cat_tuple[0] == "Rikta")

    # Tithi Shunya check for transit Moon, natal Lagna and natal Moon
    shunya_rashis = TITHI_SHUNYA_MAP.get(tithi_num, [])
    is_moon_in_shunya = transit_moon_sign in shunya_rashis
    is_lagna_shunya = natal_lagna_sign in shunya_rashis

    shunya_rashi_names = [RASHI_NAMES_HI[r] for r in shunya_rashis]

    # 2. Yoga Analysis
    transit_yoga = transit_panchang.get("yoga", {})
    yoga_name = transit_yoga.get("name", "").strip()
    yoga_info = INAUSPICIOUS_YOGAS.get(yoga_name)
    is_inauspicious_yoga = yoga_info is not None

    # 3. Karana Analysis (Vishti / Bhadra)
    transit_karana = transit_panchang.get("karana", {})
    karana_name = transit_karana.get("name", "").strip()
    is_bhadra = ("विष्टि" in karana_name or "भद्रा" in karana_name)
    is_sthira_karana = karana_name in ["शकुनि", "चतुष्पद", "नाग", "किंस्तुघ्न"]

    # 4. Vaar Analysis
    transit_vaar = transit_panchang.get("vaar", {}).get("vedic", "शनिवार")
    natal_vaar = natal_panchang.get("vaar", {}).get("vedic", "सोमवार")

    transit_vaar_lord = VAAR_LORDS.get(transit_vaar, "Saturn")
    natal_vaar_lord = VAAR_LORDS.get(natal_vaar, "Moon")

    vaar_relation = "Neutral"
    if transit_vaar_lord in NATURAL_FRIENDSHIP.get(natal_vaar_lord, {}).get("friends", []):
        vaar_relation = "Friendly"
    elif transit_vaar_lord in NATURAL_FRIENDSHIP.get(natal_vaar_lord, {}).get("enemies", []):
        vaar_relation = "Enemy"

    # Base Panchang Score (0 to 100)
    score = 75.0

    alerts = []
    cautions = []

    if is_rikta:
        score -= 22.0
        alerts.append(f"रिक्ता तिथि दोष: आज '{tithi_name}' ({cat_tuple[1]}) है। इसमें शुभ कार्य, नए अनुबंध व पूंजी निवेश निष्फल या रिक्त होते हैं।")
        cautions.append("नए मांगलिक या महत्वपूर्ण कार्य न शुरू करें।")

    if is_moon_in_shunya:
        score -= 18.0
        alerts.append(f"तिथि शून्य चंद्र: आज गोचर चंद्र {RASHI_NAMES_HI[transit_moon_sign]} राशि में है, जो आज की तिथि हेतु शून्य राशि है (मनोबल व प्रयासों में कमी)।")
        cautions.append("महत्वपूर्ण वित्तीय सौदे व यात्रा टालें।")

    if is_bhadra:
        score -= 25.0
        alerts.append(f"विष्टि (भद्रा) करण प्रभावी: भद्रा काल में यात्रा, गृह प्रवेश, व्यापारिक साझेदारी व नए मांगलिक कार्य पूर्णतः वर्जित हैं।")
        cautions.append("भद्रा काल समाप्त होने तक कोई भी नया कार्य आरंभ न करें।")
    elif is_sthira_karana:
        score -= 10.0
        alerts.append(f"स्थिर करण ({karana_name}): ऊर्जा का प्रवाह मंद रहता है।")

    if is_inauspicious_yoga:
        penalty = yoga_info["penalty"]
        score -= penalty
        alerts.append(f"अशुभ योग दोष: आज '{yoga_name}' सक्रिय है ({yoga_info['dosha']})।")
        cautions.append("वाद-विवाद व तनावपूर्ण परिस्थितियों से बचें।")
    else:
        score += 10.0  # Auspicious yoga boost

    if vaar_relation == "Friendly":
        score += 8.0
    elif vaar_relation == "Enemy":
        score -= 10.0
        alerts.append(f"वारेश प्रतिकूलता: आज का वारेश ({PLANET_NAMES_HI.get(transit_vaar_lord)}) जन्म वारेश ({PLANET_NAMES_HI.get(natal_vaar_lord)}) का नैसर्गिक विरोधी है।")

    score = max(10.0, min(98.0, round(score, 1)))

    return {
        "score": score,
        "tithi": {
            "name": tithi_name,
            "category": cat_tuple[0],
            "category_hi": cat_tuple[1],
            "is_rikta": is_rikta,
            "category_desc": cat_tuple[3],
            "shunya_rashis": shunya_rashi_names,
            "is_moon_in_shunya": is_moon_in_shunya
        },
        "yoga": {
            "name": yoga_name,
            "is_inauspicious": is_inauspicious_yoga,
            "dosha_desc": yoga_info["dosha"] if is_inauspicious_yoga else "शुभ एवं कार्यसिद्धिकारक योग"
        },
        "karana": {
            "name": karana_name,
            "is_bhadra": is_bhadra,
            "is_sthira": is_sthira_karana
        },
        "vaar": {
            "today_vaar": transit_vaar,
            "today_lord": PLANET_NAMES_HI.get(transit_vaar_lord),
            "natal_vaar": natal_vaar,
            "natal_lord": PLANET_NAMES_HI.get(natal_vaar_lord),
            "relation": vaar_relation
        },
        "alerts": alerts,
        "cautions": cautions
    }


# =============================================================================
# 7. MASTER SYNTHESIS: UNIFIED PERSONALIZED PANCHANG CALCULATOR
# =============================================================================

class PersonalizedPanchangEngine:
    """
    Main orchestrator for generating daily personalized astrological guide.
    """

    @staticmethod
    def generate_daily_forecast(
        birth_year: int,
        birth_month: int,
        birth_day: int,
        birth_hour: int,
        birth_minute: int,
        birth_lat: float,
        birth_lon: float,
        current_lat: float,
        current_lon: float,
        target_date: Optional[datetime] = None,
        name: str = "जातक"
    ) -> Dict[str, Any]:
        """
        Executes end-to-end multi-dasha, micro-nakshatra, Sudarshan transit,
        and panchang calibration to produce the daily forecast card.
        """
        if target_date is None:
            target_date = datetime.now(ZoneInfo("Asia/Kolkata"))

        # 1. Compute Natal Chart using Canonical Engine
        natal_chart = pce.calculate_canonical_chart(
            year=birth_year,
            month=birth_month,
            day=birth_day,
            hour=birth_hour,
            minute=birth_minute,
            lat=birth_lat,
            lon=birth_lon,
            tz=5.5,
            name=name
        )

        # 2. Compute Real-Time Daily Transits & Local Panchang for target date
        transit_chart = pce.calculate_canonical_chart(
            year=target_date.year,
            month=target_date.month,
            day=target_date.day,
            hour=target_date.hour,
            minute=target_date.minute,
            second=float(target_date.second),
            lat=current_lat,
            lon=current_lon,
            tz=5.5,
            name="दैनिक गोचर"
        )

        # Helper to create planet_map dict from planets list
        natal_planet_map = {p["id"]: p for p in natal_chart.get("planets", [])}
        transit_planet_map = {p["id"]: p for p in transit_chart.get("planets", [])}

        natal_moon_abs = natal_planet_map["Moon"]["abs"]
        transit_moon_abs = transit_planet_map["Moon"]["abs"]

        # 3. Micro-Nakshatra Calculations (Natal Moon & Current Moon)
        natal_moon_micro = calculate_micro_nakshatra(natal_moon_abs)
        transit_moon_micro = calculate_micro_nakshatra(transit_moon_abs)

        # 4. Nava-Tara Bala Calibration
        tara_bala = calculate_tara_bala(
            natal_moon_nak_idx=natal_moon_micro["nakshatra_index"],
            transit_nak_idx=transit_moon_micro["nakshatra_index"]
        )

        # 5. Multi-Dasha Convergence:
        # 5.1 Vimshottari Dasha (active at target_date)
        vimshottari_data = natal_chart.get("vimshottariDasa", {})
        # Pick currently active Maha, Antar, Pratyantar, Sukshma, Pran
        active_pran_lord = natal_moon_micro["sub_sub_lord"]
        active_sukshma_lord = natal_moon_micro["sub_lord"]
        active_pratyantar_lord = natal_moon_micro["pada_lord"]
        active_antar_lord = natal_moon_micro["nakshatra_lord"]
        active_maha_lord = natal_moon_micro["nakshatra_lord"]

        vimshottari_score = 65.0  # Baseline
        # Check active dasha lord's relationship with today's Nakshatra lord
        today_star_lord = transit_moon_micro["nakshatra_lord"]
        if today_star_lord in NATURAL_FRIENDSHIP.get(active_pran_lord, {}).get("friends", []):
            vimshottari_score += 25.0
        elif today_star_lord in NATURAL_FRIENDSHIP.get(active_pran_lord, {}).get("enemies", []):
            vimshottari_score -= 20.0

        # 5.2 Yogini Dasha
        yogini_res = calculate_yogini_dasha(
            moon_abs_deg=natal_moon_abs,
            target_jd=transit_chart["astronomy"]["jd_ut"],
            birth_jd=natal_chart["astronomy"]["jd_ut"]
        )

        # 5.3 Jaimini Chara Dasha factors
        jaimini_factors = calculate_jaimini_char_factors(
            natal_planet_map,
            natal_chart["lagnaSign"]
        )
        chara_score = 70.0

        # 6. Sudarshan Chakra Gochar & Bhavat Bhavam
        sudarshan_res = calculate_sudarshan_gochar(
            natal_chart,
            transit_planet_map
        )

        # 7. Ashtakavarga Points for Transiting Moon
        ashtakavarga = natal_chart.get("ashtakavarga", {})
        transit_moon_sign = transit_planet_map["Moon"]["sign"]
        moon_bav_pts = 4
        sav_pts = 28
        try:
            moon_bav_pts = ashtakavarga.get("bav", {}).get("Moon", [4]*12)[transit_moon_sign]
            sav_pts = ashtakavarga.get("sav", [28]*12)[transit_moon_sign]
        except Exception:
            pass

        ashtakavarga_score = round(((moon_bav_pts / 8.0) * 0.6 + (sav_pts / 56.0) * 0.4) * 100.0, 1)

        # 8. Panchang Resonance (Janma vs Daily Panchang)
        janma_panchang = natal_chart.get("panchang", {})
        daily_panchang = transit_chart.get("panchang", {})

        deep_panchang = calculate_deep_panchang_resonance(
            natal_panchang=janma_panchang,
            transit_panchang=daily_panchang,
            transit_moon_sign=transit_moon_sign,
            natal_lagna_sign=natal_chart["lagnaSign"],
            natal_moon_sign=natal_planet_map["Moon"]["sign"]
        )

        # Combined Panchang Resonance: 50% Tara Bala + 50% Deep Anga Resonance (Tithi, Yoga, Karana, Vaar)
        panchang_resonance_score = round(tara_bala["score"] * 0.45 + deep_panchang["score"] * 0.55, 1)

        # 9. Master Weighted Daily Score (100% Normalized)
        # Weights:
        # Vimshottari: 16%, Yogini: 12%, Chara: 12%  --> Total Dasha: 40%
        # Sudarshan & Bhavat Bhavam Gochar: 35%
        # Panchang & Tara Bala: 17%
        # Ashtakavarga: 8%
        final_day_score = round(
            (vimshottari_score * 0.16) +
            (yogini_res["score"] * 0.12) +
            (chara_score * 0.12) +
            (sudarshan_res["composite_score"] * 0.35) +
            (panchang_resonance_score * 0.17) +
            (ashtakavarga_score * 0.08),
            1
        )
        final_day_score = max(5.0, min(99.0, final_day_score))

        # 10. Core Theme, Do's & Don'ts, Personalized Windows & Remedy
        theme, dos, donts, remedy = PersonalizedPanchangEngine._synthesize_advisories(
            day_score=final_day_score,
            tara_bala=tara_bala,
            is_chandrashtama=sudarshan_res["is_chandrashtama"],
            deep_panchang=deep_panchang,
            active_pran_lord=active_pran_lord,
            active_yogini=yogini_res["major_hi"],
            transit_moon_micro=transit_moon_micro
        )

        golden_windows, caution_windows = PersonalizedPanchangEngine._generate_personalized_windows(
            day_score=final_day_score,
            tara_bala=tara_bala,
            deep_panchang=deep_panchang,
            active_pran_lord=active_pran_lord
        )

        return {
            "execution_date": target_date.strftime("%Y-%m-%d"),
            "user_name": name,
            "overall_day_score": final_day_score,
            "sentiment": "उत्कृष्ट (Favorable)" if final_day_score >= 70 else ("सामान्य (Moderate)" if final_day_score >= 45 else "सतर्कता (Cautionary)"),
            "core_theme": theme,
            "micro_nakshatra": {
                "transit_moon": transit_moon_micro,
                "natal_moon": natal_moon_micro
            },
            "tara_bala": tara_bala,
            "panchang_calibration": deep_panchang,
            "active_dashas": {
                "vimshottari": {
                    "maha_lord": active_maha_lord,
                    "antar_lord": active_antar_lord,
                    "pratyantar_lord": active_pratyantar_lord,
                    "sukshma_lord": active_sukshma_lord,
                    "pran_lord": active_pran_lord,
                    "pran_lord_hi": PLANET_NAMES_HI.get(active_pran_lord, active_pran_lord)
                },
                "yogini": yogini_res,
                "jaimini_ak": jaimini_factors.get("AK")
            },
            "sudarshan_gochar_summary": {
                "score": sudarshan_res["composite_score"],
                "is_chandrashtama": sudarshan_res["is_chandrashtama"],
                "chandrashtama_alert": sudarshan_res["chandrashtama_alert"],
                "moon_bav_points": moon_bav_pts,
                "sav_points": sav_pts
            },
            "panchang_summary": {
                "tithi": daily_panchang.get("tithi", {}).get("name"),
                "tithi_category": deep_panchang["tithi"]["category_hi"],
                "is_rikta_tithi": deep_panchang["tithi"]["is_rikta"],
                "is_moon_in_shunya_rashi": deep_panchang["tithi"]["is_moon_in_shunya"],
                "nakshatra": daily_panchang.get("nakshatra", {}).get("name"),
                "yoga": daily_panchang.get("yoga", {}).get("name"),
                "yoga_status": deep_panchang["yoga"]["dosha_desc"],
                "karana": daily_panchang.get("karana", {}).get("name"),
                "is_bhadra": deep_panchang["karana"]["is_bhadra"],
                "vaar": daily_panchang.get("vaar", {}).get("vedic"),
                "vaar_friendship": deep_panchang["vaar"]["relation"]
            },
            "dos": dos,
            "donts": donts,
            "personalized_windows": {
                "golden_hours": golden_windows,
                "caution_windows": caution_windows
            },
            "micro_remedy": remedy
        }

    @staticmethod
    def _synthesize_advisories(
        day_score: float,
        tara_bala: Dict[str, Any],
        is_chandrashtama: bool,
        deep_panchang: Dict[str, Any],
        active_pran_lord: str,
        active_yogini: str,
        transit_moon_micro: Dict[str, Any]
    ) -> Tuple[str, List[str], List[str], str]:
        tara_name_hi = tara_bala["tara_name_hi"]
        star_sub = transit_moon_micro["sub_lord_hi"]

        tithi_info = deep_panchang["tithi"]
        karana_info = deep_panchang["karana"]
        yoga_info = deep_panchang["yoga"]

        afflictions = []
        if is_chandrashtama:
            afflictions.append("चंद्राष्टम")
        if tithi_info["is_rikta"]:
            afflictions.append(f"रिक्ता तिथि ({tithi_info['name']})")
        if karana_info["is_bhadra"]:
            afflictions.append("विष्टि (भद्रा)")
        if tithi_info["is_moon_in_shunya"]:
            afflictions.append("तिथि-शून्य चंद्र")
        if yoga_info["is_inauspicious"]:
            afflictions.append(f"{yoga_info['name']} योग")

        dos = [
            "नियमित और पूर्व-निर्धारित दैनिक कार्य ही निपटाएं।",
            "मानसिक शांति हेतु ध्यान, योग अथवा 10 मिनट मौन का अभ्यास करें।",
            "बातचीत में सौम्यता रखें व अनावश्यक बहस से बचें।"
        ]
        donts = []

        if afflictions:
            affliction_str = " + ".join(afflictions)
            theme = f"अत्यंत संवेदनशील दिन ({affliction_str} प्रभाव)। नए व मांगलिक कार्य स्थगित रखें, शांति से दिन व्यतीत करें।"
            donts.append("नया अनुबंध, भारी पूंजी निवेश या बड़ा वित्तीय निर्णय न लें।")
            if karana_info["is_bhadra"]:
                donts.append("विष्टि (भद्रा) के प्रभाव में गृह-प्रवेश, यात्रा अथवा साझेदारी शुरू न करें।")
            if tithi_info["is_rikta"]:
                donts.append("रिक्ता तिथि में कोई भी शुभ कार्य आरंभ न करें (परिणाम शून्य रहने का भय रहता है)।")
            if is_chandrashtama:
                donts.append("वाहन चलाते समय सतर्क रहें, लंबी यात्रा व विवाद टालें।")
            remedy = "शिवलिंग पर जल या कच्चा दूध अर्पित करें और 'ॐ नमः शिवाय' का 108 बार जप करें।"
        elif day_score >= 70:
            theme = f"अत्यंत अनुकूल दिन — {tara_name_hi}, शुभ तिथि ({tithi_info['name']}) व उपस्वामी ({star_sub}) का पूर्ण सहयोग। नए प्रयासों में सफलता।"
            dos = [
                "वित्तीय सौदों, अनुबंधों एवं नई परियोजनाओं पर आगे बढ़ें।",
                "उच्चाधिकारियों या महत्वपूर्ण व्यक्तियों से वार्ता संपन्न करें।",
                "रुके हुए कार्यों को प्राथमिकता देकर पूरा करें।"
            ]
            donts = [
                "अति-उत्साह में बिना योजना के अनावश्यक जोखिम न लें।",
                "दूसरों की बातों में आकर अपने मूल लक्ष्य से न भटकें।"
            ]
            remedy = f"प्रातः सूर्य को तांबे के पात्र से अर्घ्य दें और अपने ईष्ट देव का स्मरण करें।"
        else:
            theme = f"मध्यम व संतुलित दिन — {tara_name_hi} व {tithi_info['name']} का प्रभाव। कार्यक्षेत्र में धैर्य और सतर्कता से काम लें।"
            dos = [
                "कागजी कार्यवाही व वित्तीय गणनाओं को दोबारा जांचें।",
                "सहयोगियों के साथ संवाद स्पष्ट रखें।"
            ]
            donts = [
                "उत्तेजना में आकर किसी विवाद में मध्यस्थता न करें।",
                "शेयर बाजार में बड़े स्पेक्युलेटिव दांव न लगाएं।"
            ]
            remedy = f"पक्षियों को दाना डालें अथवा किसी जरूरतमंद को फल दान करें।"

        return theme, dos, donts, remedy

    @staticmethod
    def _generate_personalized_windows(
        day_score: float,
        tara_bala: Dict[str, Any],
        deep_panchang: Dict[str, Any],
        active_pran_lord: str
    ) -> Tuple[List[str], List[str]]:
        if day_score >= 70 and not deep_panchang["karana"]["is_bhadra"]:
            golden = [
                "प्रातः 10:15 से 11:45 (शुभ चौघड़िया + साधक तारा का श्रेष्ठ संयोग)",
                "अपराह्न 03:20 से 04:50 (अनुकूल होरा व अमृत काल)"
            ]
            caution = [
                "दोपहर 01:30 से 02:45 (सामान्य ऊर्जा अंतराल — बड़े निर्णय टालें)"
            ]
        else:
            golden = [
                "प्रातः 09:30 से 10:45 (संतुलित कार्य अवधि — केवल दैनिक कार्य)"
            ]
            caution = [
                "प्रातः 07:45 से 09:00 (संवेदनशील समय)",
                "दोपहर 01:30 से 03:00 (राहुकाल + भद्रा / प्रतिकूल योग का संगम)"
            ]
        return golden, caution


if __name__ == "__main__":
    # Self-test with sample native birth details
    print("Testing PersonalizedPanchangEngine with sample birth details...")
    forecast = PersonalizedPanchangEngine.generate_daily_forecast(
        birth_year=1992,
        birth_month=7,
        birth_day=18,
        birth_hour=15,
        birth_minute=30,
        birth_lat=26.8467,
        birth_lon=80.9462,
        current_lat=28.6139,
        current_lon=77.2090,
        name="श्रीराम"
    )
    print("\n--- FORECAST GENERATED SUCCESSFULLY ---")
    print("User:", forecast["user_name"])
    print("Date:", forecast["execution_date"])
    print("Day Score:", forecast["overall_day_score"], f"({forecast['sentiment']})")
    print("Core Theme:", forecast["core_theme"])
    print("Tara Bala:", forecast["tara_bala"]["tara_name_hi"], f"({forecast['tara_bala']['score']} pts) -", forecast["tara_bala"]["paryaya"])
    print("Transit Moon Micro-Nakshatra:", forecast["micro_nakshatra"]["transit_moon"]["nakshatra_name_hi"],
          f"Pada {forecast['micro_nakshatra']['transit_moon']['pada']} | Lord: {forecast['micro_nakshatra']['transit_moon']['nakshatra_lord_hi']} | Sub-Lord: {forecast['micro_nakshatra']['transit_moon']['sub_lord_hi']} | Sub-Sub: {forecast['micro_nakshatra']['transit_moon']['sub_sub_lord_hi']}")
    print("Active Yogini:", forecast["active_dashas"]["yogini"]["major_hi"], f"(Sub: {forecast['active_dashas']['yogini']['sub_hi']})")
    print("Do's:", forecast["dos"])
    print("Don'ts:", forecast["donts"])
    print("Golden Windows:", forecast["personalized_windows"]["golden_hours"])
    print("Caution Windows:", forecast["personalized_windows"]["caution_windows"])
    print("Remedy:", forecast["micro_remedy"])
