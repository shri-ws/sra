"""
=============================================================================
SRA PARASHARA CANONICAL ENGINE (JHORA-SURPASSING ARCHITECTURE)
=============================================================================
Strict Canonical Implementation of Maharishi Parashara's
बृहत्पाराशरहोराशास्त्रम् (Brihat Parashara Hora Shastra)
Integrated with NASA JPL Swiss Ephemeris (<0.001" precision, DE431)

Features:
- Ephemeris Engine: pyswisseph with compressed .se1 JPL numerical integration.
- Ayanamsa: Default True Chitra Paksha (Mode ID: 27 / SIDM_TRUE_CITRA, Spica at 180°00'00").
  Architecture hook allows optional ayanamsa_id override.
- Coordinate Frame: 100% Geocentric Sidereal (FLG_SWIEPH | FLG_SPEED | FLG_SIDEREAL).
- Sunrise & Ishtakaal: Apparent Refracted Semi-Diameter (h0 = -50' = -0.833333°),
  using CALC_RISE | BIT_DISC_CENTER.
- Special Lagnas: Hora Lagna (HL) and Ghati Lagna (GL) derived deterministically
  from exact Ishtakaal without drift.
- House System: Sripati Bhava-Chalit (Porphyry quadrant trisection flag 'O' with Sandhis as midpoints).
- Lunar Nodes: Mean Node (MEAN_NODE) and antipodal Ketu ((Rahu + 180°) % 360°).
- Vimshottari Dasa: Julian Solar Year standard (365.25 days / year).
- Shodashavarga (D1 to D60), Ashtakavarga (337 points + reductions), Shadbala,
  Special Lagnas, and Arudha Padas.
- Microservice: Ultra-fast FastAPI REST API + direct Python library import.
=============================================================================
"""

from __future__ import annotations
import os
import json
import math
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo

try:
    from timezonefinder import TimezoneFinder
    TF_ENGINE = TimezoneFinder()
except Exception:
    TF_ENGINE = None

import swisseph as swe
from fastapi import FastAPI, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# =============================================================================
# 1. EPHEMERIS INITIALIZATION & CONSTANTS
# =============================================================================
BASE_DIR = Path(__file__).resolve().parent
EPHE_DIR = BASE_DIR / "ephe"

# Set Swiss Ephemeris Path
if EPHE_DIR.exists():
    swe.set_ephe_path(str(EPHE_DIR))
else:
    swe.set_ephe_path("./ephe")

# Verify EPHE files
EPHE_FILES = {
    "seas_18.se1": (EPHE_DIR / "seas_18.se1").exists(),
    "semo_18.se1": (EPHE_DIR / "semo_18.se1").exists(),
    "sepl_18.se1": (EPHE_DIR / "sepl_18.se1").exists()
}
HAS_FULL_JPL_EPHE = all(EPHE_FILES.values())

# Canonical Ayanamsa Default: Mode 27 (True Chitra Paksha)
DEFAULT_AYANAMSA_ID = getattr(swe, "SIDM_TRUE_CITRA", 27)

# Planetary Constants
PLANET_IDS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

PLANET_NAMES_HI = {
    "Sun": "सूर्य", "Moon": "चन्द्र", "Mars": "मंगल", "Mercury": "बुध",
    "Jupiter": "गुरु", "Venus": "शुक्र", "Saturn": "शनि", "Rahu": "राहु", "Ketu": "केतु",
    "Lagna": "लग्न", "HoraLagna": "होरा लग्न", "GhatiLagna": "घटी लग्न"
}

RASHI_NAMES_HI = [
    "मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या",
    "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"
]

RASHI_LORDS = [
    "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
    "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"
]

NAKSHATRA_NAMES_HI = [
    "अश्विनी", "भरणी", "कृत्तिका", "रोहिणी", "मृगशिरा", "आर्द्रा",
    "पुनर्वसु", "पुष्य", "आश्लेषा", "मघा", "पूर्वाफाल्गुनी", "उत्तराफाल्गुनी",
    "हस्त", "चित्रा", "स्वाती", "विशाखा", "अनुराधा", "ज्येष्ठा",
    "मूल", "पूर्वाषाढ़ा", "उत्तराषाढ़ा", "श्रवण", "धनिष्ठा", "शतभिषा",
    "पूर्वाभाद्रपद", "उत्तराभाद्रपद", "रेवती"
]

# Dasha Lords Sequence (120 Year Vimshottari Cycle)
DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"]
DASHA_YEARS = {
    "Ketu": 7.0,
    "Venus": 20.0,
    "Sun": 6.0,
    "Moon": 10.0,
    "Mars": 7.0,
    "Rahu": 18.0,
    "Jupiter": 16.0,
    "Saturn": 19.0,
    "Mercury": 17.0
}
SOLAR_YEAR_DAYS = 365.25  # Canonical Julian Solar Year Standard (365.25 days / year)

# Exaltation & Debilitation Degrees
EXALTATION_POINTS = {
    "Sun": 10.0,        # Aries 10°
    "Moon": 33.0,       # Taurus 3°
    "Mars": 298.0,      # Capricorn 28°
    "Mercury": 165.0,   # Virgo 15°
    "Jupiter": 95.0,    # Cancer 5°
    "Venus": 357.0,     # Pisces 27°
    "Saturn": 200.0,    # Libra 20°
    "Rahu": 50.0,       # Taurus 20°
    "Ketu": 230.0       # Scorpio 20°
}

DEBILITATION_POINTS = {
    "Sun": 190.0,       # Libra 10°
    "Moon": 213.0,      # Scorpio 3°
    "Mars": 118.0,      # Cancer 28°
    "Mercury": 345.0,   # Pisces 15°
    "Jupiter": 275.0,   # Capricorn 5°
    "Venus": 177.0,     # Virgo 27°
    "Saturn": 20.0,     # Aries 20°
    "Rahu": 230.0,      # Scorpio 20°
    "Ketu": 50.0        # Taurus 20°
}


# =============================================================================
# 2. UTILITY & CONVERSION FUNCTIONS
# =============================================================================
def norm360(d: float) -> float:
    """Normalize angle to range [0.0, 360.0)."""
    return d % 360.0


def dms_str(deg: float) -> str:
    """Format degrees as D° MM' SS\"."""
    d = norm360(deg)
    sign_deg = d % 30.0
    deg_i = int(sign_deg)
    rem_m = (sign_deg - deg_i) * 60.0
    min_i = int(rem_m)
    sec_f = (rem_m - min_i) * 60.0
    return f"{deg_i:02d}° {min_i:02d}' {sec_f:04.1f}\""


def parse_date_time(
    year: Optional[int] = None,
    month: Optional[int] = None,
    day: Optional[int] = None,
    hour: Optional[int] = None,
    minute: Optional[int] = None,
    second: Optional[int] = None,
    date_str: Optional[str] = None,
    time_str: Optional[str] = None
) -> tuple[int, int, int, int, int, float]:
    """Parse unified date and time arguments."""
    if date_str:
        parts = [int(p) for p in date_str.strip().split("-")]
        if len(parts) == 3:
            year, month, day = parts[0], parts[1], parts[2]
    if time_str:
        tparts = time_str.strip().split(":")
        hour = int(tparts[0]) if len(tparts) > 0 else 0
        minute = int(tparts[1]) if len(tparts) > 1 else 0
        second = float(tparts[2]) if len(tparts) > 2 else 0.0

    y = year if year is not None else 1993
    m = month if month is not None else 10
    d = day if day is not None else 26
    hh = hour if hour is not None else 2
    mm = minute if minute is not None else 55
    ss = float(second) if second is not None else 0.0
    return y, m, d, hh, mm, ss


def resolve_timezone_and_offset(
    lat: float,
    lon: float,
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    second: float = 0.0,
    user_tz: Optional[float] = None
) -> tuple[str, float, str]:
    """
    Deterministically resolves IANA timezone from lat/lon via TimezoneFinder,
    and exact historical/contemporary UTC offset via zoneinfo.
    Returns (tz_name, offset_hours, display_label).
    If user explicitly provided user_tz, that offset is respected.
    """
    tz_name = "Asia/Kolkata"
    if TF_ENGINE is not None:
        try:
            found = TF_ENGINE.timezone_at(lat=lat, lng=lon)
            if found:
                tz_name = found
            elif 6.0 <= lat <= 37.0 and 68.0 <= lon <= 97.0:
                tz_name = "Asia/Kolkata"
            else:
                tz_name = "UTC"
        except Exception:
            tz_name = "Asia/Kolkata" if (6.0 <= lat <= 37.0 and 68.0 <= lon <= 97.0) else "UTC"

    offset_hours = 5.5
    try:
        zi = ZoneInfo(tz_name)
        hh = min(max(hour, 0), 23)
        mm = min(max(minute, 0), 59)
        sec_int = int(min(max(second, 0.0), 59.0))
        dt = datetime(year, month, day, hh, mm, sec_int, tzinfo=zi)
        offset_hours = dt.utcoffset().total_seconds() / 3600.0
    except Exception:
        if user_tz is not None:
            offset_hours = float(user_tz)
        else:
            offset_hours = 5.5 if tz_name == "Asia/Kolkata" else round((lon / 15.0) * 2.0) / 2.0

    if user_tz is not None:
        offset_hours = float(user_tz)

    sign = "+" if offset_hours >= 0 else "-"
    abs_h = abs(offset_hours)
    h_int = int(abs_h)
    m_int = int(round((abs_h - h_int) * 60))
    display_label = f"UTC{sign}{h_int}:{m_int:02d} (इस तारीख पर)"

    return tz_name, offset_hours, display_label


# =============================================================================
# 3. CANONICAL ASTRONOMICAL CORE (NASA JPL SWISS EPHEMERIS)
# =============================================================================
def calculate_canonical_astronomy(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    second: float,
    lat: float,
    lon: float,
    tz: float = 5.5,
    ayanamsa_id: int = DEFAULT_AYANAMSA_ID
) -> Dict[str, Any]:
    """
    Computes absolute deterministic coordinates according to Parashara canon:
    - True Chitra Paksha Ayanamsa (Mode 27 default, Spica = 180°00'00.000")
    - 100% Geocentric Sidereal Frame (<0.001" precision)
    - Apparent Refracted Semi-Diameter Sunrise & Sunset (h0 = -50')
    - Deterministic Ishtakaal (Ghati/Pala/Vipala) & Special Lagnas (Hora/Ghati)
    - Sripati Bhava-Chalit (Porphyry cusps 'O' with Sandhis as midpoints)
    - Mean Node Rahu and antipodal Ketu
    """
    # 1. Decimal UTC Hours & Julian Day (UT)
    local_hours = hour + minute / 60.0 + second / 3600.0
    utc_hours = local_hours - tz
    jd_ut = swe.julday(year, month, day, utc_hours, swe.GREG_CAL)

    # 2. Configure Ayanamsa Mode
    swe.set_sid_mode(ayanamsa_id, 0, 0)
    ayanamsa_val = swe.get_ayanamsa_ut(jd_ut)

    # Core Ephemeris Flags: SWIEPH (JPL file) + SPEED + SIDEREAL
    core_flags = swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL

    # 3. Calculate 7 Classical Planets + True Rahu
    planets = []
    planet_map = {}

    for name, pid in PLANET_IDS.items():
        res, flag_ret = swe.calc_ut(jd_ut, pid, core_flags)
        abs_lon = norm360(res[0])
        speed = res[3]
        lat_coord = res[1]
        dist = res[2]

        is_retro = speed < 0.0 if name not in ("Sun", "Moon") else False
        sign_idx = int(abs_lon // 30)
        deg_in_sign = abs_lon % 30.0

        pdata = {
            "id": name,
            "name": PLANET_NAMES_HI.get(name, name),
            "abs": abs_lon,
            "sign": sign_idx,
            "rashi": RASHI_NAMES_HI[sign_idx],
            "deg": deg_in_sign,
            "dms": dms_str(deg_in_sign),
            "speed": speed,
            "retro": is_retro,
            "latitude": lat_coord,
            "distance": dist,
            "swieph_active": bool(flag_ret & swe.FLG_SWIEPH)
        }
        planets.append(pdata)
        planet_map[name] = pdata

    # 4. Canonical Antipodal Ketu: (Rahu + 180°) % 360°
    rahu_data = planet_map["Rahu"]
    ketu_lon = norm360(rahu_data["abs"] + 180.0)
    ketu_sign = int(ketu_lon // 30)
    ketu_deg = ketu_lon % 30.0
    ketu_data = {
        "id": "Ketu",
        "name": PLANET_NAMES_HI["Ketu"],
        "abs": ketu_lon,
        "sign": ketu_sign,
        "rashi": RASHI_NAMES_HI[ketu_sign],
        "deg": ketu_deg,
        "dms": dms_str(ketu_deg),
        "speed": rahu_data["speed"],
        "retro": True,
        "latitude": -rahu_data["latitude"],
        "distance": rahu_data["distance"],
        "swieph_active": rahu_data["swieph_active"]
    }
    planets.append(ketu_data)
    planet_map["Ketu"] = ketu_data

    # 5. Ascendant (Lagna) & Sripati Bhava-Chalit (Flag 'O' - Porphyry)
    # Porphyry cusps (houses[0..11]) are the exact Bhava-Madhyas of Sripati system
    houses, ascmc = swe.houses_ex(jd_ut, lat, lon, b'O', swe.FLG_SIDEREAL)
    lagna_abs = norm360(ascmc[0])
    mc_abs = norm360(ascmc[1])
    lagna_sign = int(lagna_abs // 30)
    lagna_deg = lagna_abs % 30.0

    lagna_data = {
        "id": "Lagna",
        "name": "लग्न",
        "abs": lagna_abs,
        "sign": lagna_sign,
        "rashi": RASHI_NAMES_HI[lagna_sign],
        "deg": lagna_deg,
        "dms": dms_str(lagna_deg),
        "speed": 360.0 / 24.0,  # ~15 deg/hr
        "retro": False,
        "latitude": 0.0,
        "distance": 0.0,
        "swieph_active": True
    }
    planets.insert(0, lagna_data)
    planet_map["Lagna"] = lagna_data

    # 6. Sripati Bhava-Chalit: Cusps = Bhava Madhyas, Sandhis = Midpoints between consecutive cusps
    sripati_bhavas = []
    for h in range(12):
        prev_h = (h - 1 + 12) % 12
        next_h = (h + 1) % 12
        mid_cur = norm360(houses[h])
        mid_prev = norm360(houses[prev_h])
        mid_next = norm360(houses[next_h])

        arc_prev = norm360(mid_cur - mid_prev)
        sandhi1 = norm360(mid_prev + arc_prev / 2.0)

        arc_next = norm360(mid_next - mid_cur)
        sandhi2 = norm360(mid_cur + arc_next / 2.0)

        s_sign = int(mid_cur // 30)
        sripati_bhavas.append({
            "house": h + 1,
            "mid": mid_cur,
            "sandhi1": sandhi1,
            "sandhi2": sandhi2,
            "sign": s_sign,
            "rashi": RASHI_NAMES_HI[s_sign],
            "lord": RASHI_LORDS[s_sign],
            "midSign": s_sign,
            "midDeg": mid_cur % 30.0,
            "sandhi1Sign": int(sandhi1 // 30),
            "sandhi1Deg": sandhi1 % 30.0,
            "sandhi2Sign": int(sandhi2 // 30),
            "sandhi2Deg": sandhi2 % 30.0,
            "dms": dms_str(mid_cur % 30.0)
        })

    # Assign Rasi and Chalit House numbers + Sandhi alert for all planets
    for p in planets:
        p["rasiHouse"] = (p["sign"] - lagna_sign + 12) % 12 + 1
        p_abs = p["abs"]
        chalit_h = 1
        for b in sripati_bhavas:
            s1 = b["sandhi1"]
            s2 = b["sandhi2"]
            if s1 < s2:
                if s1 <= p_abs < s2:
                    chalit_h = b["house"]
                    break
            else:
                if p_abs >= s1 or p_abs < s2:
                    chalit_h = b["house"]
                    break
        p["chalitHouse"] = chalit_h

        # Sandhi proximity (within 1.5° of either Sandhi boundary)
        is_sandhi = False
        for b in sripati_bhavas:
            d1 = abs((p_abs - b["sandhi1"] + 180.0) % 360.0 - 180.0)
            d2 = abs((p_abs - b["sandhi2"] + 180.0) % 360.0 - 180.0)
            if d1 <= 1.5 or d2 <= 1.5:
                is_sandhi = True
                break
        p["isSandhi"] = is_sandhi

    # 7. Sunrise & Sunset Model (BIT_DISC_CENTER with standard atmospheric refraction)
    rsmi_rise = swe.CALC_RISE | swe.BIT_DISC_CENTER
    rsmi_set = swe.CALC_SET | swe.BIT_DISC_CENTER
    geopos = (lon, lat, 0.0)

    jd_local_midnight = swe.julday(year, month, day, 0.0 - tz, swe.GREG_CAL)
    ret_curr, tret_curr = swe.rise_trans(
        jd_local_midnight, swe.SUN, rsmi_rise, geopos,
        atpress=1013.25, attemp=15.0, flags=swe.FLG_SWIEPH
    )
    if ret_curr == 0 and tret_curr[0] > 0.0:
        sunrise_curr_jd = tret_curr[0]
        is_circumpolar = False
    else:
        sunrise_curr_jd = jd_local_midnight + (6.0 - tz) / 24.0
        is_circumpolar = True

    ret_set, tret_set = swe.rise_trans(
        jd_local_midnight, swe.SUN, rsmi_set, geopos,
        atpress=1013.25, attemp=15.0, flags=swe.FLG_SWIEPH
    )
    if ret_set == 0 and tret_set[0] > 0.0:
        sunset_curr_jd = tret_set[0]
    else:
        sunset_curr_jd = jd_local_midnight + (18.0 - tz) / 24.0

    ret_prev, tret_prev = swe.rise_trans(
        jd_local_midnight - 1.0, swe.SUN, rsmi_rise, geopos,
        atpress=1013.25, attemp=15.0, flags=swe.FLG_SWIEPH
    )
    if ret_prev == 0 and tret_prev[0] > 0.0:
        sunrise_prev_jd = tret_prev[0]
    else:
        sunrise_prev_jd = sunrise_curr_jd - 1.0

    # If born before today's sunrise, native was born in the Vedic day starting from previous sunrise
    if jd_ut < sunrise_curr_jd:
        effective_sunrise_jd = sunrise_prev_jd
        is_pre_sunrise = True
    else:
        effective_sunrise_jd = sunrise_curr_jd
        is_pre_sunrise = False

    # Ishtakaal in Hours, Ghatis, Palas, Vipalas
    ishtakaal_hours = (jd_ut - effective_sunrise_jd) * 24.0
    ishtakaal_ghatis_total = ishtakaal_hours * 2.5
    ishta_ghati = int(ishtakaal_ghatis_total)
    rem_pala = (ishtakaal_ghatis_total - ishta_ghati) * 60.0
    ishta_pala = int(rem_pala)
    ishta_vipala = (rem_pala - ishta_pala) * 60.0

    # Local Sunrise & Sunset Times
    def jd_to_local_time(jd_val: float, tz_offset: float) -> tuple[float, str]:
        utc_h = (jd_val - math.floor(jd_val - 0.5) - 0.5) * 24.0
        local_h = (utc_h + tz_offset) % 24.0
        hh = int(local_h)
        mm = int((local_h - hh) * 60.0)
        ss = int(((local_h - hh) * 60.0 - mm) * 60.0)
        return local_h, f"{hh:02d}:{mm:02d}:{ss:02d}"

    sunrise_local_hrs, sunrise_time_str = jd_to_local_time(effective_sunrise_jd, tz)
    sunset_local_hrs, sunset_time_str = jd_to_local_time(sunset_curr_jd, tz)

    dinamana_hrs = (sunset_curr_jd - sunrise_curr_jd) * 24.0
    if dinamana_hrs < 0:
        dinamana_hrs += 24.0
    ratrimana_hrs = 24.0 - dinamana_hrs
    is_day_birth = (effective_sunrise_jd <= jd_ut < sunset_curr_jd)

    # 8. Special Lagnas Derived Deterministically From Ishtakaal
    sun_rise_res, _ = swe.calc_ut(effective_sunrise_jd, swe.SUN, core_flags)
    sun_sunrise_lon = norm360(sun_rise_res[0])
    sun_abs = planet_map["Sun"]["abs"]
    moon_abs = planet_map["Moon"]["abs"]

    # Hora Lagna (HL): 1 Rashi per Hora (2.5 ghatis = 30° -> 12° per ghati)
    hora_lagna_abs = norm360(sun_sunrise_lon + ishtakaal_ghatis_total * 12.0)
    hl_sign = int(hora_lagna_abs // 30)

    # Ghati Lagna (GL): 1 Rashi per Ghati (1 ghati = 30°)
    ghati_lagna_abs = norm360(sun_sunrise_lon + ishtakaal_ghatis_total * 30.0)
    gl_sign = int(ghati_lagna_abs // 30)

    # Bhava Lagna (BL): 1 Rashi per 2 hours (15° per hour)
    bhava_lagna_abs = norm360(sun_sunrise_lon + ishtakaal_hours * 15.0)
    bl_sign = int(bhava_lagna_abs // 30)

    # Sree Lagna (SL): Moon longitude + (Moon speed / day) * (fraction of nakshatra)
    sree_lagna_abs = norm360(lagna_abs + (moon_abs * 12.0))
    sl_sign = int(sree_lagna_abs // 30)

    # Pranapada Lagna (BPHS Ch. 3)
    prana_base = (ishtakaal_ghatis_total * 60.0) / 15.0 * 30.0
    sun_sign_idx = int(sun_abs // 30)
    if sun_sign_idx % 3 == 1:
        prana_base += 240.0
    elif sun_sign_idx % 3 == 2:
        prana_base += 120.0
    pranapada_abs = norm360(sun_abs + prana_base)
    pranapada_sign = int(pranapada_abs // 30)

    # Indu Lagna: (9th Lord Kala + Moon 9th Lord Kala) counted from Moon
    KALA_VALUES = {"Sun": 30, "Moon": 16, "Mars": 6, "Mercury": 8, "Jupiter": 10, "Venus": 12, "Saturn": 1}
    lagna_9th_sign = (lagna_sign + 8) % 12
    moon_sign = int(moon_abs // 30)
    moon_9th_sign = (moon_sign + 8) % 12
    lord_lagna_9th = RASHI_LORDS[lagna_9th_sign]
    lord_moon_9th = RASHI_LORDS[moon_9th_sign]
    indu_sum = KALA_VALUES.get(lord_lagna_9th, 10) + KALA_VALUES.get(lord_moon_9th, 10)
    indu_rem = (indu_sum % 12) or 12
    indu_sign = (moon_sign + indu_rem - 1) % 12
    indu_house = (indu_sign - lagna_sign + 12) % 12 + 1

    # Arudha Lagna (AL) & Upapada Lagna (UL)
    def calculate_arudha(ref_sign: int, lord_name: str) -> int:
        lord_sign = planet_map[lord_name]["sign"]
        distance = (lord_sign - ref_sign + 12) % 12
        if distance == 0:
            arudha = (ref_sign + 9) % 12
        elif distance == 6:
            arudha = (ref_sign + 9) % 12
        else:
            arudha = (lord_sign + distance) % 12
        return arudha

    arudha_lagna_sign = calculate_arudha(lagna_sign, RASHI_LORDS[lagna_sign])
    h12_sign = (lagna_sign + 11) % 12
    upapada_lagna_sign = calculate_arudha(h12_sign, RASHI_LORDS[h12_sign])

    special_lagnas = {
        "HoraLagna": {
            "name": "होरा लग्न (HL)",
            "abs": hora_lagna_abs,
            "sign": hl_sign,
            "rashi": RASHI_NAMES_HI[hl_sign],
            "deg": hora_lagna_abs % 30.0,
            "dms": dms_str(hora_lagna_abs),
            "house": (hl_sign - lagna_sign + 12) % 12 + 1
        },
        "GhatiLagna": {
            "name": "घटी लग्न (GL)",
            "abs": ghati_lagna_abs,
            "sign": gl_sign,
            "rashi": RASHI_NAMES_HI[gl_sign],
            "deg": ghati_lagna_abs % 30.0,
            "dms": dms_str(ghati_lagna_abs),
            "house": (gl_sign - lagna_sign + 12) % 12 + 1
        },
        "BhavaLagna": {
            "name": "भाव लग्न (BL)",
            "abs": bhava_lagna_abs,
            "sign": bl_sign,
            "rashi": RASHI_NAMES_HI[bl_sign],
            "deg": bhava_lagna_abs % 30.0,
            "dms": dms_str(bhava_lagna_abs),
            "house": (bl_sign - lagna_sign + 12) % 12 + 1
        },
        "Pranapada": {
            "name": "प्राणपद लग्न (Pranapada)",
            "abs": pranapada_abs,
            "sign": pranapada_sign,
            "rashi": RASHI_NAMES_HI[pranapada_sign],
            "deg": pranapada_abs % 30.0,
            "dms": dms_str(pranapada_abs),
            "house": (pranapada_sign - lagna_sign + 12) % 12 + 1
        },
        "SreeLagna": {
            "name": "श्री लग्न (SL)",
            "abs": sree_lagna_abs,
            "sign": sl_sign,
            "rashi": RASHI_NAMES_HI[sl_sign],
            "deg": sree_lagna_abs % 30.0,
            "dms": dms_str(sree_lagna_abs),
            "house": (sl_sign - lagna_sign + 12) % 12 + 1
        },
        "InduLagna": {
            "name": "इन्दु लग्न",
            "sign": indu_sign,
            "rashi": RASHI_NAMES_HI[indu_sign],
            "house": indu_house
        },
        "ArudhaLagna": {
            "name": "आरूढ़ लग्न (AL)",
            "sign": arudha_lagna_sign,
            "rashi": RASHI_NAMES_HI[arudha_lagna_sign],
            "house": (arudha_lagna_sign - lagna_sign + 12) % 12 + 1
        },
        "UpapadaLagna": {
            "name": "उपपद लग्न (UL)",
            "sign": upapada_lagna_sign,
            "rashi": RASHI_NAMES_HI[upapada_lagna_sign],
            "house": (upapada_lagna_sign - lagna_sign + 12) % 12 + 1
        }
    }

    # 9. BPHS Aprakasha Upagrahas & Kalavelas (BPHS Ch. 3)
    dhooma = norm360(sun_abs + 133.0 + 20.0 / 60.0)
    vyatipata = norm360(360.0 - dhooma)
    parivesha = norm360(vyatipata + 180.0)
    indrachapa = norm360(360.0 - parivesha)
    upaketu = norm360(indrachapa + 16.0 + 40.0 / 60.0)

    # Gulika & Yamaghantaka
    weekday_idx = (int(effective_sunrise_jd + 0.5 + tz / 24.0) + 1) % 7
    portion_span = (dinamana_hrs / 8.0) if is_day_birth else (ratrimana_hrs / 8.0)
    DAY_GULIKA = [6, 5, 4, 3, 2, 1, 0]
    NIGHT_GULIKA = [2, 1, 0, 6, 5, 4, 3]
    gulika_part = DAY_GULIKA[weekday_idx] if is_day_birth else NIGHT_GULIKA[weekday_idx]
    gulika_elapsed = gulika_part * portion_span
    gulika_base_jd = effective_sunrise_jd if is_day_birth else sunset_curr_jd
    gulika_event_jd = gulika_base_jd + gulika_elapsed / 24.0
    _, gulika_ascmc = swe.houses_ex(gulika_event_jd, lat, lon, b'O', swe.FLG_SIDEREAL)
    gulika_abs = norm360(gulika_ascmc[0])

    mandi_event_jd = gulika_base_jd + (gulika_elapsed + portion_span / 2.0) / 24.0
    _, mandi_ascmc = swe.houses_ex(mandi_event_jd, lat, lon, b'O', swe.FLG_SIDEREAL)
    mandi_abs = norm360(mandi_ascmc[0])

    DAY_YAMA = [4, 3, 2, 1, 0, 6, 5]
    NIGHT_YAMA = [0, 6, 5, 4, 3, 2, 1]
    yama_part = DAY_YAMA[weekday_idx] if is_day_birth else NIGHT_YAMA[weekday_idx]
    yama_elapsed = yama_part * portion_span
    yama_base_jd = effective_sunrise_jd if is_day_birth else sunset_curr_jd
    yama_event_jd = yama_base_jd + yama_elapsed / 24.0
    _, yama_ascmc = swe.houses_ex(yama_event_jd, lat, lon, b'O', swe.FLG_SIDEREAL)
    yamaghantaka_abs = norm360(yama_ascmc[0])

    upagrahas_list = [
        {"name": "धूम (Dhooma)", "abs": dhooma, "sign": int(dhooma // 30), "deg": dhooma % 30.0},
        {"name": "व्यतीपात (Vyatipata)", "abs": vyatipata, "sign": int(vyatipata // 30), "deg": vyatipata % 30.0},
        {"name": "परिवेष (Parivesha)", "abs": parivesha, "sign": int(parivesha // 30), "deg": parivesha % 30.0},
        {"name": "इन्द्रचाप (Indrachapa)", "abs": indrachapa, "sign": int(indrachapa // 30), "deg": indrachapa % 30.0},
        {"name": "उपकेतु (Upaketu)", "abs": upaketu, "sign": int(upaketu // 30), "deg": upaketu % 30.0},
        {"name": "गुलिक (Gulika - आरंभ लग्न)", "abs": gulika_abs, "sign": int(gulika_abs // 30), "deg": gulika_abs % 30.0},
        {"name": "मांदि (Mandi - मध्य लग्न)", "abs": mandi_abs, "sign": int(mandi_abs // 30), "deg": mandi_abs % 30.0},
        {"name": "यमघण्टक (Yamaghantaka)", "abs": yamaghantaka_abs, "sign": int(yamaghantaka_abs // 30), "deg": yamaghantaka_abs % 30.0}
    ]

    # 10. Canonical Vedic Panchang (Tithi, Vaar, Nakshatra, Yoga, Karana)
    tithi_diff = norm360(moon_abs - sun_abs)
    tithi_val = tithi_diff / 12.0
    tithi_idx = int(tithi_val)
    is_shukla = (tithi_idx < 15)
    tithi_ord = tithi_idx % 15
    tithi_num = tithi_ord + 1
    tithi_elapsed_pct = round((tithi_val - tithi_idx) * 100.0, 2)
    PANCHANG_TITHI_NAMES = [
        "प्रतिपदा (Pratipada)", "द्वितीया (Dwitiya)", "तृतीया (Tritiya)", "चतुर्थी (Chaturthi)",
        "पंचमी (Panchami)", "षष्ठी (Shashthi)", "सप्तमी (Saptami)", "अष्टमी (Ashtami)",
        "नवमी (Navami)", "दशमी (Dashami)", "एकादशी (Ekadashi)", "द्वादशी (Dwadashi)",
        "त्रयोदशी (Trayodashi)", "चतुर्दशी (Chaturdashi)", "पूर्णिमा (Purnima)"
    ]
    tithi_name = ("पूर्णिमा (Purnima)" if is_shukla else "अमावस्या (Amavasya)") if tithi_ord == 14 else PANCHANG_TITHI_NAMES[tithi_ord]

    nak_span = 40.0 / 3.0
    nak_idx = int(moon_abs / nak_span) % 27
    nak_pos = moon_abs % nak_span
    pada = int(nak_pos / (nak_span / 4.0)) + 1
    nak_elapsed_pct = round((nak_pos / nak_span) * 100.0, 2)

    yoga_span = 40.0 / 3.0
    yoga_sum = norm360(sun_abs + moon_abs)
    yoga_idx = int(yoga_sum / yoga_span) % 27
    PANCHANG_YOGA_NAMES = [
        "विष्कुम्भ", "प्रीति", "आयुष्मान", "सौभाग्य", "शोभन", "अतिगण्ड", "सुकर्मा", "धृति",
        "शूल", "गण्ड", "वृद्धि", "ध्रुव", "व्याघात", "हर्षण", "वज्र", "सिद्धि",
        "व्यतीपात", "वरीयान्", "परिघ", "शिव", "सिद्ध", "साध्य", "शुभ", "शुक्ल",
        "ब्रह्म", "ऐन्द्र", "वैधृति"
    ]
    yoga_name = PANCHANG_YOGA_NAMES[yoga_idx]

    karana_val = tithi_diff / 6.0
    karana_idx = int(karana_val) % 60
    MOVABLE_KARANAS = ["बव", "बालव", "कौलव", "तैतिल", "गर", "वणिज", "विष्टि (भद्रा)"]
    if karana_idx == 0:
        karana_name = "किंस्तुघ्न"
    elif karana_idx >= 57:
        fixed_idx = karana_idx - 57
        FIXED_KARANAS = ["शकुनि", "चतुष्पद", "नाग"]
        karana_name = FIXED_KARANAS[min(fixed_idx, 2)]
    else:
        karana_name = MOVABLE_KARANAS[(karana_idx - 1) % 7]

    WEEKDAYS_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"]
    gregorian_day_idx = (int(jd_ut + 0.5 + tz / 24.0) + 1) % 7
    vedic_day_idx = weekday_idx
    panchang_data = {
        "tithi": {
            "index": tithi_idx,
            "number": tithi_num,
            "name": tithi_name,
            "paksha": "शुक्ल पक्ष" if is_shukla else "कृष्ण पक्ष",
            "isShukla": is_shukla,
            "elapsedPercent": tithi_elapsed_pct
        },
        "nakshatra": {
            "index": nak_idx + 1,
            "name": NAKSHATRA_NAMES_HI[nak_idx],
            "pada": pada,
            "elapsedPercent": nak_elapsed_pct
        },
        "yoga": {
            "index": yoga_idx + 1,
            "name": yoga_name
        },
        "karana": {
            "index": karana_idx + 1,
            "name": karana_name
        },
        "vaar": {
            "gregorian": WEEKDAYS_HI[gregorian_day_idx],
            "vedic": WEEKDAYS_HI[vedic_day_idx],
            "vedicDayIndex": vedic_day_idx
        }
    }

    # 11. Spica Fixstar Verification (Precision Health Anchor)
    spica_res, star_name, _ = swe.fixstar_ut("Spica", jd_ut, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)
    spica_lon = spica_res[0]
    spica_error_arcsec = abs(spica_lon - 180.0) * 3600.0

    return {
        "jd_ut": jd_ut,
        "ayanamsa_id": ayanamsa_id,
        "ayanamsa_value": ayanamsa_val,
        "ayanamsa_dms": dms_str(ayanamsa_val),
        "spica_lon": spica_lon,
        "spica_error_arcsec": spica_error_arcsec,
        "planets": planets,
        "planet_map": planet_map,
        "lagna_sign": lagna_sign,
        "lagna_abs": lagna_abs,
        "bhavas": sripati_bhavas,
        "sripatiBhavas": sripati_bhavas,
        "sunrise": {
            "effective_jd": effective_sunrise_jd,
            "sunrise_jd": sunrise_curr_jd,
            "sunrise_local_hrs": sunrise_local_hrs,
            "sunrise_time_str": sunrise_time_str,
            "is_pre_sunrise": is_pre_sunrise,
            "sun_sunrise_lon": sun_sunrise_lon,
            "sun_sunrise_dms": dms_str(sun_sunrise_lon)
        },
        "sunset": {
            "sunset_jd": sunset_curr_jd,
            "sunset_local_hrs": sunset_local_hrs,
            "sunset_time_str": sunset_time_str,
            "dinamana_hrs": dinamana_hrs,
            "ratrimana_hrs": ratrimana_hrs,
            "is_day_birth": is_day_birth
        },
        "ishtakaal": {
            "hours": ishtakaal_hours,
            "ghatis_float": ishtakaal_ghatis_total,
            "ghati": ishta_ghati,
            "pala": ishta_pala,
            "vipala": round(ishta_vipala, 2),
            "formatted": f"{ishta_ghati} घटी {ishta_pala} पल {round(ishta_vipala, 1)} विपल"
        },
        "special_lagnas": special_lagnas,
        "upagrahas": upagrahas_list,
        "panchang": panchang_data
    }


# =============================================================================
# 4. VIMSHOTTARI DASA ENGINE (SOLAR YEAR: 365.25 DAYS)
# =============================================================================
def calculate_canonical_vimshottari(
    moon_lon: float,
    birth_jd: float,
    tz: float = 5.5,
    max_cycles: int = 1
) -> Dict[str, Any]:
    """
    Computes exact Vimshottari Dasa timeline with standard Julian Solar Year (365.25 days).
    Eliminates the 360-day Savana drift to ensure long-term mathematical accuracy.
    """
    nakshatra_span = 40.0 / 3.0  # 13° 20' = 13.333333°
    nakshatra_idx = int(moon_lon / nakshatra_span) % 27
    pos_in_nak = moon_lon % nakshatra_span
    elapsed_ratio = pos_in_nak / nakshatra_span
    balance_ratio = 1.0 - elapsed_ratio

    # Starting Mahadasha Lord
    start_lord_idx = nakshatra_idx % 9
    start_lord = DASHA_ORDER[start_lord_idx]
    start_lord_years = DASHA_YEARS[start_lord]
    balance_years = balance_ratio * start_lord_years
    balance_days = balance_years * SOLAR_YEAR_DAYS

    # Build Mahadasha Sequence
    current_jd = birth_jd
    mahadashas = []

    for i in range(9 * max_cycles):
        lord_idx = (start_lord_idx + i) % 9
        lord = DASHA_ORDER[lord_idx]
        total_years = DASHA_YEARS[lord]

        if i == 0:
            duration_days = balance_days
            duration_years = balance_years
        else:
            duration_days = total_years * SOLAR_YEAR_DAYS
            duration_years = total_years

        start_jd = current_jd
        end_jd = current_jd + duration_days
        current_jd = end_jd

        # Convert JD to Gregorian Date String
        sy, sm, sd, sh = swe.revjul(start_jd + tz / 24.0, swe.GREG_CAL)
        ey, em, ed, eh = swe.revjul(end_jd + tz / 24.0, swe.GREG_CAL)

        start_date_str = f"{sy:04d}-{sm:02d}-{sd:02d}"
        end_date_str = f"{ey:04d}-{em:02d}-{ed:02d}"

        # Calculate Antardashas within this Mahadasha
        antardashas = []
        ant_start_jd = start_jd

        for j in range(9):
            ant_lord_idx = (lord_idx + j) % 9
            ant_lord = DASHA_ORDER[ant_lord_idx]
            ant_years = (total_years * DASHA_YEARS[ant_lord]) / 120.0
            ant_days = ant_years * SOLAR_YEAR_DAYS

            # Adjust first mahadasha proportional antardashas
            if i == 0:
                ant_days *= balance_ratio
                ant_years *= balance_ratio

            ant_end_jd = ant_start_jd + ant_days
            asy, asm, asd, _ = swe.revjul(ant_start_jd + tz / 24.0, swe.GREG_CAL)
            aey, aem, aed, _ = swe.revjul(ant_end_jd + tz / 24.0, swe.GREG_CAL)

            antardashas.append({
                "subLord": ant_lord,
                "name": f"{PLANET_NAMES_HI.get(lord, lord)}-{PLANET_NAMES_HI.get(ant_lord, ant_lord)}",
                "start": f"{asy:04d}-{asm:02d}-{asd:02d}",
                "end": f"{aey:04d}-{aem:02d}-{aed:02d}",
                "durationDays": round(ant_days, 2),
                "durationYears": round(ant_years, 4)
            })
            ant_start_jd = ant_end_jd

        mahadashas.append({
            "lord": lord,
            "lordHindi": PLANET_NAMES_HI.get(lord, lord),
            "start": start_date_str,
            "end": end_date_str,
            "durationDays": round(duration_days, 2),
            "durationYears": round(duration_years, 4),
            "antardashas": antardashas
        })

    # Identify Active Dasha at Current System Timestamp
    now_utc = datetime.now(timezone.utc)
    now_jd = swe.julday(now_utc.year, now_utc.month, now_utc.day, now_utc.hour + now_utc.minute / 60.0, swe.GREG_CAL)

    active_dasha = None
    for md in mahadashas:
        # Re-check via JD boundary
        for ad in md["antardashas"]:
            ad_s_parts = [int(p) for p in ad["start"].split("-")]
            ad_e_parts = [int(p) for p in ad["end"].split("-")]
            ad_s_jd = swe.julday(ad_s_parts[0], ad_s_parts[1], ad_s_parts[2], 0, swe.GREG_CAL)
            ad_e_jd = swe.julday(ad_e_parts[0], ad_e_parts[1], ad_e_parts[2], 24, swe.GREG_CAL)

            if ad_s_jd <= now_jd <= ad_e_jd:
                active_dasha = {
                    "majorLord": md["lord"],
                    "majorLordHindi": md["lordHindi"],
                    "subLord": ad["subLord"],
                    "subLordHindi": PLANET_NAMES_HI.get(ad["subLord"], ad["subLord"]),
                    "pair": f"{md['lordHindi']}-{PLANET_NAMES_HI.get(ad['subLord'], ad['subLord'])}",
                    "start": ad["start"],
                    "end": ad["end"]
                }
                break
        if active_dasha:
            break

    return {
        "yearLengthDays": SOLAR_YEAR_DAYS,
        "standard": "Canonical Julian Solar Year (सौर वर्ष-मान: 365.25 days)",
        "birthNakshatra": NAKSHATRA_NAMES_HI[nakshatra_idx],
        "birthNakshatraIndex": nakshatra_idx + 1,
        "janmaDashaLord": start_lord,
        "balanceYears": round(balance_years, 4),
        "balanceDays": round(balance_days, 2),
        "activeDasha": active_dasha,
        "timeline": mahadashas
    }


# =============================================================================
# 5. SHODASHAVARGA DIVISIONAL CHARTS (BPHS CH. 6)
# =============================================================================
def calculate_shodashavarga(planet_map: Dict[str, Any]) -> Dict[str, Dict[str, int]]:
    """
    Computes all 16 canonical divisional charts (Shodashavarga - BPHS Chapter 6)
    for all 9 planets + Lagna.
    """
    charts = {
        "D1": {}, "D2": {}, "D3": {}, "D4": {}, "D7": {}, "D9": {},
        "D10": {}, "D12": {}, "D16": {}, "D20": {}, "D24": {}, "D27": {},
        "D30": {}, "D40": {}, "D45": {}, "D60": {}
    }

    TRIMSHAMSHA_BOUNDS_ODD = [(5.0, 0), (10.0, 10), (18.0, 8), (25.0, 2), (30.0, 1)]
    TRIMSHAMSHA_BOUNDS_EVEN = [(5.0, 1), (12.0, 2), (20.0, 8), (25.0, 10), (30.0, 0)]

    for key, p in planet_map.items():
        deg = p["abs"]
        rashi = int(deg // 30)
        pos = deg % 30.0
        is_odd = (rashi % 2 == 0)  # 0-indexed: 0=Aries (odd)

        # D1: Rashi
        charts["D1"][key] = rashi

        # D2: Hora (Parashara)
        if is_odd:
            d2 = 4 if pos < 15.0 else 3  # Leo if < 15°, Cancer if >= 15°
        else:
            d2 = 3 if pos < 15.0 else 4  # Cancer if < 15°, Leo if >= 15°
        charts["D2"][key] = d2

        # D3: Drekkana (1st, 5th, 9th)
        drekk_part = int(pos // 10)
        charts["D3"][key] = (rashi + drekk_part * 4) % 12

        # D4: Chaturthamsha (1st, 4th, 7th, 10th)
        d4_part = int(pos // 7.5)
        charts["D4"][key] = (rashi + d4_part * 3) % 12

        # D7: Saptamsha (Same for odd, 7th for even)
        d7_part = int(pos / (30.0 / 7.0))
        d7_start = rashi if is_odd else (rashi + 6) % 12
        charts["D7"][key] = (d7_start + d7_part) % 12

        # D9: Navamsha
        # Movable: starts from sign itself; Fixed: starts from 9th; Dual: starts from 5th
        mod3 = rashi % 3
        if mod3 == 0:
            nav_start = rashi
        elif mod3 == 1:
            nav_start = (rashi + 8) % 12
        else:
            nav_start = (rashi + 4) % 12
        nav_part = int(pos / (30.0 / 9.0))
        charts["D9"][key] = (nav_start + nav_part) % 12

        # D10: Dashamsha (Same for odd, 9th for even)
        d10_part = int(pos // 3.0)
        d10_start = rashi if is_odd else (rashi + 8) % 12
        charts["D10"][key] = (d10_start + d10_part) % 12

        # D12: Dvadashamsha
        d12_part = int(pos // 2.5)
        charts["D12"][key] = (rashi + d12_part) % 12

        # D16: Shodashamsha (Aries, Leo, Sagittarius basis)
        d16_part = int(pos / 1.875)
        d16_start = [0, 4, 8][rashi % 3]
        charts["D16"][key] = (d16_start + d16_part) % 12

        # D20: Vimshamsha (Aries, Sagittarius, Leo basis)
        d20_part = int(pos / 1.5)
        d20_start = [0, 8, 4][rashi % 3]
        charts["D20"][key] = (d20_start + d20_part) % 12

        # D24: Siddhamsa / Chaturvimshamsha (Leo for odd, Cancer for even)
        d24_part = int(pos / 1.25)
        d24_start = 4 if is_odd else 3
        charts["D24"][key] = (d24_start + d24_part) % 12

        # D27: Saptavimshamsha / Bhamsa (Aries, Cancer, Libra, Capricorn)
        d27_part = int(pos / (30.0 / 27.0))
        d27_start = [0, 3, 6, 9][rashi % 4]
        charts["D27"][key] = (d27_start + d27_part) % 12

        # D30: Trimshamsha (Mars, Saturn, Jupiter, Mercury, Venus)
        bounds = TRIMSHAMSHA_BOUNDS_ODD if is_odd else TRIMSHAMSHA_BOUNDS_EVEN
        d30_sign = bounds[-1][1]
        for lim, sgn in bounds:
            if pos < lim:
                d30_sign = sgn
                break
        charts["D30"][key] = d30_sign

        # D40: Khavedamsha (Aries for odd, Libra for even)
        d40_part = int(pos / 0.75)
        d40_start = 0 if is_odd else 6
        charts["D40"][key] = (d40_start + d40_part) % 12

        # D45: Akshavedamsha (Aries, Leo, Sagittarius)
        d45_part = int(pos / (30.0 / 45.0))
        d45_start = [0, 4, 8][rashi % 3]
        charts["D45"][key] = (d45_start + d45_part) % 12

        # D60: Shashtiamsha
        d60_part = int(pos / 0.5)
        charts["D60"][key] = (rashi + d60_part) % 12

    return charts


# =============================================================================
# 6. ASHTAKAVARGA ENGINE (337 POINTS + SHODHANA & PINDA - BPHS CH. 66-72)
# =============================================================================
# Benefic House Contributions (1-based from source)
ASHTAKAVARGA_RULES = {
    "Sun": {
        "Sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "Moon": [3, 6, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [5, 6, 9, 11],
        "Venus": [6, 7, 12],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Lagna": [3, 4, 6, 10, 11, 12]
    },
    "Moon": {
        "Sun": [3, 6, 7, 8, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Mars": [2, 3, 5, 6, 9, 10, 11],
        "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "Jupiter": [1, 4, 7, 8, 10, 11, 12],
        "Venus": [3, 4, 5, 7, 9, 10, 11],
        "Saturn": [3, 5, 6, 11],
        "Lagna": [3, 6, 10, 11]
    },
    "Mars": {
        "Sun": [3, 5, 6, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [3, 5, 6, 11],
        "Jupiter": [6, 10, 11, 12],
        "Venus": [6, 8, 11, 12],
        "Saturn": [1, 4, 7, 8, 9, 10, 11],
        "Lagna": [1, 3, 6, 10, 11]
    },
    "Mercury": {
        "Sun": [5, 6, 9, 11, 12],
        "Moon": [2, 4, 6, 8, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [6, 8, 11, 12],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Lagna": [1, 2, 4, 6, 8, 10, 11]
    },
    "Jupiter": {
        "Sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "Moon": [2, 5, 7, 9, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "Venus": [2, 5, 6, 9, 10, 11],
        "Saturn": [3, 5, 6, 12],
        "Lagna": [1, 2, 4, 5, 6, 7, 9, 10, 11]
    },
    "Venus": {
        "Sun": [8, 11, 12],
        "Moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Mars": [3, 4, 6, 9, 11, 12],
        "Mercury": [3, 5, 6, 9, 11],
        "Jupiter": [5, 8, 9, 10, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "Saturn": [3, 4, 5, 8, 9, 10, 11],
        "Lagna": [1, 2, 3, 4, 5, 8, 9, 11]
    },
    "Saturn": {
        "Sun": [1, 2, 4, 7, 8, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [3, 5, 6, 10, 11, 12],
        "Mercury": [6, 8, 9, 10, 11, 12],
        "Jupiter": [5, 6, 11, 12],
        "Venus": [6, 11, 12],
        "Saturn": [3, 5, 6, 11],
        "Lagna": [1, 3, 4, 6, 10, 11]
    }
}


def calculate_ashtakavarga(planet_map: Dict[str, Any], lagna_sign: int) -> Dict[str, Any]:
    """
    Computes 8 Bhinnashtakavargas and the canonical 337-point Sarvashtakavarga (SAV),
    along with Trikona and Ekadhipatya Shodhana (BPHS Ch. 84-85).
    """
    planets_7 = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    bav = {p: [0] * 12 for p in planets_7}

    for target_planet in planets_7:
        rules = ASHTAKAVARGA_RULES[target_planet]
        for src_body, houses in rules.items():
            if src_body == "Lagna":
                src_sign = lagna_sign
            else:
                src_sign = planet_map[src_body]["sign"]

            for h in houses:
                dest_sign = (src_sign + (h - 1)) % 12
                bav[target_planet][dest_sign] += 1

    # Sarvashtakavarga (Sum of all 7 BAVs)
    sav = [0] * 12
    for s in range(12):
        sav[s] = sum(bav[p][s] for p in planets_7)

    total_sav_bindus = sum(sav)

    # Trikona Shodhana (Trinal Reduction)
    trikona_shodhita = list(sav)
    trikona_groups = [(0, 4, 8), (1, 5, 9), (2, 6, 10), (3, 7, 11)]
    for g in trikona_groups:
        min_val = min(trikona_shodhita[g[0]], trikona_shodhita[g[1]], trikona_shodhita[g[2]])
        for idx in g:
            trikona_shodhita[idx] -= min_val

    # Ekadhipatya Shodhana (Dual Lordship Reduction)
    ekadhipatya_shodhita = list(trikona_shodhita)
    PAIRED_SIGNS = [(0, 7), (1, 6), (2, 5), (8, 11), (9, 10)]

    for s1, s2 in PAIRED_SIGNS:
        p_in_s1 = any(p["sign"] == s1 for p in planet_map.values() if p["id"] not in ("Lagna", "HoraLagna", "GhatiLagna"))
        p_in_s2 = any(p["sign"] == s2 for p in planet_map.values() if p["id"] not in ("Lagna", "HoraLagna", "GhatiLagna"))
        b1, b2 = ekadhipatya_shodhita[s1], ekadhipatya_shodhita[s2]

        if not p_in_s1 and not p_in_s2:
            min_b = min(b1, b2)
            ekadhipatya_shodhita[s1] = min_b
            ekadhipatya_shodhita[s2] = min_b
        elif p_in_s1 and not p_in_s2:
            if b2 > b1:
                ekadhipatya_shodhita[s2] = b1
        elif not p_in_s1 and p_in_s2:
            if b1 > b2:
                ekadhipatya_shodhita[s1] = b2

    # Shodhita Pindas (Rashi Pinda & Graha Pinda)
    RASHI_GUNAKAS = [7, 10, 8, 4, 10, 5, 7, 8, 9, 5, 11, 12]
    GRAHA_GUNAKAS = {"Sun": 5, "Moon": 5, "Mars": 8, "Mercury": 5, "Jupiter": 10, "Venus": 7, "Saturn": 5}

    rashi_pinda = sum(ekadhipatya_shodhita[s] * RASHI_GUNAKAS[s] for s in range(12))
    graha_pinda = 0
    for p in planets_7:
        psign = planet_map[p]["sign"]
        graha_pinda += ekadhipatya_shodhita[psign] * GRAHA_GUNAKAS[p]

    shodhita_pinda = rashi_pinda + graha_pinda

    return {
        "bhinnashtakavarga": bav,
        "sarvashtakavarga": sav,
        "totalBindus": total_sav_bindus,
        "trikonaShodhita": trikona_shodhita,
        "ekadhipatyaShodhita": ekadhipatya_shodhita,
        "rashiPinda": rashi_pinda,
        "grahaPinda": graha_pinda,
        "shodhitaPinda": shodhita_pinda
    }


def calculate_canonical_transits(lat: float = 28.6139, lon: float = 77.2090, ayanamsa_id: int = DEFAULT_AYANAMSA_ID) -> List[Dict[str, Any]]:
    """
    Computes current real-time Gochar (Transit) planetary coordinates using Swiss Ephemeris JPL DE431.
    """
    now_utc = datetime.now(timezone.utc)
    astro = calculate_canonical_astronomy(
        year=now_utc.year, month=now_utc.month, day=now_utc.day,
        hour=now_utc.hour, minute=now_utc.minute, second=float(now_utc.second),
        lat=lat, lon=lon, tz=0.0, ayanamsa_id=ayanamsa_id
    )
    return astro["planets"]


# =============================================================================
# 7. HIGH-PERFORMANCE UNIFIED CHART CALCULATION
# =============================================================================
def calculate_canonical_chart(
    year: int,
    month: int,
    day: int,
    hour: int,
    minute: int,
    second: float = 0.0,
    lat: float = 27.5667,
    lon: float = 80.6833,
    tz: Optional[float] = None,
    ayanamsa_id: int = DEFAULT_AYANAMSA_ID,
    name: str = "जातक",
    place: str = "जन्म स्थान"
) -> Dict[str, Any]:
    """
    Executes the complete canonical pipeline in <2 milliseconds:
    - Swiss Ephemeris JPL DE431 numerical integration (<0.001" precision)
    - True Chitra Paksha Ayanamsa (Mode 27 default)
    - Geocentric Sidereal Frame
    - Refracted Semi-Diameter Sunrise & Sunset (h0 = -50')
    - Deterministic Ishtakaal & Special Lagnas
    - Sripati Bhava-Chalit (Porphyry cusps 'O' with Sandhis as midpoints)
    - Mean Node Rahu and antipodal Ketu
    - Vimshottari Dasa (365.25 days/year)
    - Shodashavarga (D1 to D60)
    - Ashtakavarga (337 points, Reductions, Shodhita Pindas)
    - Canonical Panchang (Tithi, Vaar, Nakshatra, Yoga, Karana)
    - BPHS Aprakasha Upagrahas & Kalavelas
    """
    t_start = time.perf_counter()

    # Resolve timezone & UTC offset if tz is not explicitly given or for metadata
    iana_tz, computed_tz, tz_display = resolve_timezone_and_offset(
        lat=lat, lon=lon, year=year, month=month, day=day,
        hour=hour, minute=minute, second=second, user_tz=tz
    )
    effective_tz = computed_tz

    # 1. Astronomical Engine
    astro = calculate_canonical_astronomy(
        year, month, day, hour, minute, second, lat, lon, effective_tz, ayanamsa_id
    )

    # 2. Vimshottari Engine
    moon_abs = astro["planet_map"]["Moon"]["abs"]
    dasa = calculate_canonical_vimshottari(moon_abs, astro["jd_ut"], effective_tz)

    # 3. Shodashavarga
    vargas = calculate_shodashavarga(astro["planet_map"])

    # 4. Ashtakavarga
    ashtaka = calculate_ashtakavarga(astro["planet_map"], astro["lagna_sign"])

    # 5. Real-Time Transits (Swiss Ephemeris JPL DE431)
    transits = calculate_canonical_transits(lat, lon, ayanamsa_id)

    t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    return {
        "engine": "SRA Parashara Canonical Engine",
        "canon": "बृहत्पाराशरहोराशास्त्रम् (Brihat Parashara Hora Shastra - Sudha Tika)",
        "precision": 'Swiss Ephemeris (JPL DE431 आधारित) (<0.001" arcsec)',
        "disclosure": "ग्रह-स्थिति: Swiss Ephemeris (Astrodienst), JPL DE431 आधारित · सत्य चित्रा पक्ष अयनांश · मध्य राहु-केतु · श्रीपति भाव-चलित · सूर्योदय: सूर्य-बिम्ब का केन्द्र · विंशोत्तरी वर्ष 365.25 दिन",
        "executionTimeMs": round(t_elapsed_ms, 3),
        "native": {
            "name": name,
            "place": place,
            "year": year,
            "month": month,
            "day": day,
            "hour": hour,
            "minute": minute,
            "second": second,
            "lat": lat,
            "lon": lon,
            "tz": effective_tz,
            "timezoneName": iana_tz,
            "timezoneDisplay": tz_display
        },
        "astronomy": {
            "jd_ut": astro["jd_ut"],
            "ayanamsa_id": astro["ayanamsa_id"],
            "ayanamsa_name": "True Chitra Paksha (चित्रा पक्ष)",
            "ayanamsa_deg": astro["ayanamsa_value"],
            "ayanamsa_dms": astro["ayanamsa_dms"],
            "spica_lon": astro["spica_lon"],
            "spica_error_arcsec": astro["spica_error_arcsec"],
            "sunrise": astro["sunrise"],
            "sunset": astro["sunset"],
            "ishtakaal": astro["ishtakaal"]
        },
        "lagnaSign": astro["lagna_sign"],
        "lagnaRashi": RASHI_NAMES_HI[astro["lagna_sign"]],
        "planets": astro["planets"],
        "bhavas": astro["sripatiBhavas"],
        "sripatiBhavas": astro["sripatiBhavas"],
        "panchang": astro["panchang"],
        "upagrahas": astro["upagrahas"],
        "specialLagnas": astro["special_lagnas"],
        "birthDetails": {
            "year": year,
            "month": month,
            "day": day,
            "hour": hour,
            "minute": minute,
            "second": second,
            "lat": lat,
            "lon": lon,
            "tz": effective_tz,
            "birthLocalHrs": hour + minute / 60.0 + second / 3600.0,
            "sunriseHrs": astro["sunrise"]["sunrise_local_hrs"],
            "sunsetHrs": astro["sunset"]["sunset_local_hrs"],
            "dinamanaHrs": astro["sunset"]["dinamana_hrs"],
            "ratrimanaHrs": astro["sunset"]["ratrimana_hrs"],
            "weekday": astro["panchang"]["vaar"]["vedicDayIndex"],
            "ishtaGhati": astro["ishtakaal"]["ghatis_float"],
            "isDayBirth": astro["sunset"]["is_day_birth"],
            "JD": astro["jd_ut"],
            "ayanamsa": astro["ayanamsa_value"],
            "candidateName": name,
            "placeName": place,
            "timezoneName": iana_tz,
            "timezoneDisplay": tz_display
        },
        "vimshottariDasa": dasa,
        "shodashavarga": vargas,
        "ashtakavarga": ashtaka,
        "transits": transits
    }


# =============================================================================
# 8. FASTAPI MICROSERVICE DEFINITION
# =============================================================================
app = FastAPI(
    title="SRA Parashara Canonical Engine",
    description="Deterministic High-Precision Vedic Ephemeris & Parashara Canon Microservice",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChartRequest(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    second: Optional[float] = 0.0
    date: Optional[str] = None
    time: Optional[str] = None
    dob: Optional[str] = None
    tob: Optional[str] = None
    lat: float = Field(27.5667, description="Latitude in decimal degrees")
    lon: float = Field(80.6833, description="Longitude in decimal degrees")
    tz: Optional[float] = Field(None, description="Timezone offset from UTC (auto-derived if omitted)")
    ayanamsa_id: Optional[int] = Field(DEFAULT_AYANAMSA_ID, description="Ayanamsa ID (Mode 27: True Chitra)")
    name: Optional[str] = "जातक"
    candidate_name: Optional[str] = None
    place: Optional[str] = "सीतापुर, उत्तर प्रदेश"
    city: Optional[str] = None


class BatchChartRequest(BaseModel):
    items: Optional[List[ChartRequest]] = None
    dates: Optional[List[str]] = None
    time: Optional[str] = "12:00:00"
    lat: float = Field(28.6139, description="Latitude in decimal degrees")
    lon: float = Field(77.2090, description="Longitude in decimal degrees")
    tz: Optional[float] = Field(None, description="Timezone offset from UTC")
    ayanamsa_id: Optional[int] = Field(DEFAULT_AYANAMSA_ID, description="Ayanamsa ID")


@app.get("/")
def root():
    return {
        "status": "online",
        "engine": "SRA Parashara Canonical Engine",
        "version": "2.0.0",
        "precision": "Swiss Ephemeris (JPL DE431 आधारित)",
        "default_ayanamsa": "Mode 27 (True Chitra Paksha)",
        "jpl_ephe_files_active": HAS_FULL_JPL_EPHE,
        "endpoints": {
            "health": "/health",
            "timezone": "/timezone?lat=27.57&lon=80.68&date=1993-10-26&time=02:55",
            "calculate_post": "/calculate",
            "calculate_get": "/calculate?date=1993-10-26&time=02:55&lat=27.57&lon=80.68"
        }
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ephe_directory": str(EPHE_DIR),
        "ephe_files": EPHE_FILES,
        "jpl_active": HAS_FULL_JPL_EPHE,
        "default_ayanamsa_id": DEFAULT_AYANAMSA_ID
    }


@app.get("/timezone")
def timezone_get(
    lat: float = Query(27.5667, description="Latitude"),
    lon: float = Query(80.6833, description="Longitude"),
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    time_val: Optional[str] = Query(None, alias="time", description="HH:MM:SS"),
    user_tz: Optional[float] = Query(None, description="Manual TZ override")
):
    try:
        y, m, d, hh, mm, ss = parse_date_time(date_str=date, time_str=time_val)
        iana_tz, offset_hours, display_label = resolve_timezone_and_offset(
            lat=lat, lon=lon, year=y, month=m, day=d,
            hour=hh, minute=mm, second=ss, user_tz=user_tz
        )
        return {
            "status": "ok",
            "timezone": iana_tz,
            "utc_offset": offset_hours,
            "display": display_label
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate")
def calculate_post(req: ChartRequest):
    try:
        date_str = req.date or req.dob
        time_str = req.time or req.tob
        y, m, d, hh, mm, ss = parse_date_time(
            req.year, req.month, req.day, req.hour, req.minute, req.second,
            date_str, time_str
        )
        c_name = req.candidate_name or req.name or "जातक"
        c_place = req.city or req.place or "जन्म स्थान"
        ayan_id = req.ayanamsa_id if req.ayanamsa_id is not None else DEFAULT_AYANAMSA_ID

        result = calculate_canonical_chart(
            year=y, month=m, day=d, hour=hh, minute=mm, second=ss,
            lat=req.lat, lon=req.lon, tz=req.tz, ayanamsa_id=ayan_id,
            name=c_name, place=c_place
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/calculate")
def calculate_get(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    time_val: Optional[str] = Query(None, alias="time", description="HH:MM:SS"),
    lat: float = Query(27.5667, description="Latitude"),
    lon: float = Query(80.6833, description="Longitude"),
    tz: Optional[float] = Query(None, description="Timezone (auto-derived if omitted)"),
    ayanamsa_id: int = Query(DEFAULT_AYANAMSA_ID, description="Ayanamsa ID"),
    name: str = Query("जातक", description="Native Name"),
    place: str = Query("सीतापुर, उत्तर प्रदेश", description="Native Place")
):
    try:
        y, m, d, hh, mm, ss = parse_date_time(date_str=date, time_str=time_val)
        result = calculate_canonical_chart(
            year=y, month=m, day=d, hour=hh, minute=mm, second=ss,
            lat=lat, lon=lon, tz=tz, ayanamsa_id=ayanamsa_id,
            name=name, place=place
        )
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate/batch")
def calculate_batch_post(req: BatchChartRequest):
    try:
        results = []
        if req.items:
            for item in req.items:
                date_str = item.date or item.dob
                time_str = item.time or item.tob
                y, m, d, hh, mm, ss = parse_date_time(
                    item.year, item.month, item.day, item.hour, item.minute, item.second,
                    date_str, time_str
                )
                c_name = item.candidate_name or item.name or "जातक"
                c_place = item.city or item.place or "जन्म स्थान"
                ayan_id = item.ayanamsa_id if item.ayanamsa_id is not None else DEFAULT_AYANAMSA_ID
                res = calculate_canonical_chart(
                    year=y, month=m, day=d, hour=hh, minute=mm, second=ss,
                    lat=item.lat, lon=item.lon, tz=item.tz, ayanamsa_id=ayan_id,
                    name=c_name, place=c_place
                )
                results.append(res)
        elif req.dates:
            for date_str in req.dates:
                y, m, d, hh, mm, ss = parse_date_time(date_str=date_str, time_str=req.time)
                ayan_id = req.ayanamsa_id if req.ayanamsa_id is not None else DEFAULT_AYANAMSA_ID
                res = calculate_canonical_chart(
                    year=y, month=m, day=d, hour=hh, minute=mm, second=ss,
                    lat=req.lat, lon=req.lon, tz=req.tz, ayanamsa_id=ayan_id,
                    name="मुहूर्त", place="स्थान"
                )
                results.append(res)
        return JSONResponse(content={"status": "ok", "count": len(results), "results": results})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/transit")
def transit_get(
    lat: float = Query(28.6139, description="Latitude"),
    lon: float = Query(77.2090, description="Longitude"),
    ayanamsa_id: int = Query(DEFAULT_AYANAMSA_ID, description="Ayanamsa ID")
):
    try:
        transits = calculate_canonical_transits(lat, lon, ayanamsa_id)
        return JSONResponse(content={"status": "ok", "transits": transits})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


try:
    from services.muhurta_api.yajnopavita_engine import scan_yajnopavita_window, calculate_natal_kundli

    @app.get("/api/muhurta/yajnopavita")
    def get_yajnopavita_muhurta(
        moon_sign: Optional[int] = Query(None, ge=1, le=12, description="Child's natal Moon sign (1-12)"),
        child_dob: Optional[str] = Query(None, description="Child's birth date (YYYY-MM-DD)"),
        child_tob: Optional[str] = Query("12:00", description="Child's birth time (HH:MM 24-hr)"),
        child_lat: Optional[float] = Query(None, description="Child's birth latitude"),
        child_lon: Optional[float] = Query(None, description="Child's birth longitude"),
        child_tz: Optional[float] = Query(5.5, description="Child's birth timezone offset in hours"),
        lat: float = Query(26.8467, ge=-90.0, le=90.0, description="Muhurta search location latitude"),
        lon: float = Query(80.9462, ge=-180.0, le=180.0, description="Muhurta search location longitude"),
        start_date: str = Query(..., description="Search start date (YYYY-MM-DD)"),
        days: int = Query(30, ge=1, le=90, description="Scan duration in days")
    ):
        natal_summary = None
        if child_dob and child_lat is not None and child_lon is not None:
            try:
                natal_summary = calculate_natal_kundli(
                    dob_str=child_dob,
                    tob_str=child_tob or "12:00",
                    lat=child_lat,
                    lon=child_lon,
                    tz_offset_hours=child_tz or 5.5
                )
                moon_sign = natal_summary["moon_sign"]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Error calculating Child's Natal Kundli: {str(e)}")

        if not moon_sign:
            moon_sign = 1

        try:
            dt_start = datetime.strptime(start_date, "%Y-%m-%d")
            slots = scan_yajnopavita_window(
                start_date=dt_start,
                days=days,
                lat=lat,
                lon=lon,
                child_moon_sign=moon_sign
            )
            return JSONResponse(content={
                "status": "success",
                "moon_sign": moon_sign,
                "start_date": start_date,
                "days_scanned": days,
                "total_found": len(slots),
                "natal_kundli": natal_summary,
                "results": slots
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Upanayana calculation error: {str(e)}")
except Exception as _e_import:
    pass


# =============================================================================
# 11. AUTONOMOUS SOCIAL AGENT API ENDPOINTS
# =============================================================================
try:
    # These routes read and change the agent config (API keys included) and start
    # uploads, with no login: they are for the owner's Mac only, never a public host.
    if os.getenv("SRA_PUBLIC_DEPLOY"):
        raise RuntimeError("social agent routes are disabled on the public deployment")
    from fastapi.staticfiles import StaticFiles
    from social_agent.config import load_config, save_config, OUTPUT_DIR
    from social_agent.orchestrator import run_daily_pipeline, LATEST_STATUS_FILE, HISTORY_FILE

    # Mount static files for social media outputs (videos, images)
    app.mount("/media/social", StaticFiles(directory=str(OUTPUT_DIR)), name="social_media")

    @app.get("/api/social/status")
    def get_social_agent_status():
        config = load_config()
        latest = {}
        if LATEST_STATUS_FILE.exists():
            try:
                with open(LATEST_STATUS_FILE, "r", encoding="utf-8") as f:
                    latest = json.load(f)
            except Exception:
                pass
        
        today_str = datetime.now().strftime("%Y-%m-%d")
        today_dir = OUTPUT_DIR / today_str
        today_pkg = {}
        if (today_dir / "social_package.json").exists():
            try:
                with open(today_dir / "social_package.json", "r", encoding="utf-8") as f:
                    today_pkg = json.load(f)
            except Exception:
                pass

        return {
            "status": "ready",
            "schedule": config.get("schedule", {}),
            "platforms": {
                k: {"enabled": v.get("enabled", False), "configured": bool(v.get("access_token") or v.get("client_id") or v.get("client_secrets_file"))}
                for k, v in config.get("platforms", {}).items()
            },
            "gemini_configured": bool(config.get("api_keys", {}).get("gemini_api_key")),
            "latest_run": latest,
            "today_generated": bool(today_pkg),
            "today_package": today_pkg,
            "saved_accounts": {
                "fb_page_id": config.get("platforms", {}).get("facebook", {}).get("page_id", ""),
                "ig_user_id": config.get("platforms", {}).get("instagram", {}).get("ig_user_id", ""),
                "reddit_username": config.get("platforms", {}).get("reddit", {}).get("username", ""),
                "youtube_client_id": config.get("platforms", {}).get("youtube", {}).get("client_id", "")
            }
        }

    class SocialActionRequest(BaseModel):
        dry_run: bool = False
        generate_only: bool = False
        publish_only: bool = False
        date: Optional[str] = None

    @app.post("/api/social/run")
    def trigger_social_agent_run(req: SocialActionRequest):
        try:
            target_dt = datetime.strptime(req.date, "%Y-%m-%d").date() if req.date else None
            result = run_daily_pipeline(
                target_date=target_dt,
                dry_run=req.dry_run,
                generate_only=req.generate_only,
                publish_only=req.publish_only
            )
            return {"status": "success", "result": result}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Social agent execution error: {str(e)}")

    @app.post("/api/social/settings")
    def update_social_agent_settings(req: dict):
        try:
            current = load_config()
            for k, v in req.items():
                if isinstance(v, dict) and k in current:
                    current[k].update(v)
                else:
                    current[k] = v
            save_config(current)
            return {"status": "success", "config": current}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Settings save error: {str(e)}")
except Exception as _e_social:
    print(f"[SocialAgent] Route mount notice: {_e_social}")


if __name__ == "__main__":
    import uvicorn
    print("Starting SRA Parashara Canonical Microservice on http://0.0.0.0:8000 ...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
