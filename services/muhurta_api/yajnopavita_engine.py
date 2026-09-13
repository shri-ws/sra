import swisseph as swe
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any, Optional

# Configure Swiss Ephemeris path and Lahiri Ayanāṁśa
swe.set_sid_mode(swe.SIDM_LAHIRI)

PLANET_IDS = {
    "Sun": swe.SUN, "Moon": swe.MOON, "Mars": swe.MARS,
    "Mercury": swe.MERCURY, "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS, "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE
}

# Muhūrta Cintāmaṇi Prescribed Constellations for Upanayana (1-indexed)
UPANAYANA_NAKSHATRAS = {1, 4, 5, 7, 8, 12, 13, 14, 15, 16, 17, 21, 23, 26, 27}

# Top Choice Asterisms for Upanayana
SUPREME_NAKSHATRAS = {4, 8, 12, 13, 14, 15, 21, 26, 27} # Rohini, Pushya, U.Phalguni, Hasta, Chitra, Swati, U.Ashadha, U.Bhadra, Revati

# Prohibited Tithis
PROHIBITED_TITHIS = {4, 6, 8, 9, 12, 14, 19, 21, 23, 24, 27, 29, 30}

# Top Tithis (Sukla Paksha 2, 3, 5, 7, 10, 11, 13)
SUPREME_TITHIS = {2, 3, 5, 7, 10, 11, 13}

# Permissible Weekdays: 0 (Sunday), 1 (Monday), 3 (Wednesday), 4 (Thursday), 5 (Friday)
PERMISSIBLE_WEEKDAYS = {0, 1, 3, 4, 5}

NAKSHATRA_NAMES = [
    "", "Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśirā", "Ārdrā",
    "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrvāphālgunī", "Uttarāphālgunī",
    "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeshṭhā",
    "Mūla", "Pūrvāṣāḍhā", "Uttarāṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
    "Pūrvābhādrapadā", "Uttarābhādrapadā", "Revatī"
]

RASHI_NAMES = [
    "", "Meṣa (Aries)", "Vṛṣabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
    "Siṁha (Leo)", "Kanyā (Virgo)", "Tulā (Libra)", "Vṛścika (Scorpio)",
    "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Mīna (Pisces)"
]

TITHI_NAMES = [
    "", "Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī",
    "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī",
    "Trayodaśī", "Caturdaśī", "Pūrṇimā",
    "Pratipadā (K)", "Dvitīyā (K)", "Tṛtīyā (K)", "Caturthī (K)", "Pañcamī (K)",
    "Ṣaṣṭhī (K)", "Saptamī (K)", "Aṣṭamī (K)", "Navamī (K)", "Daśamī (K)",
    "Ekādaśī (K)", "Dvādaśī (K)", "Trayodaśī (K)", "Caturdaśī (K)", "Amāvāsyā"
]

def get_julian_day(dt_utc: datetime) -> float:
    return swe.julday(
        dt_utc.year, dt_utc.month, dt_utc.day,
        dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0
    )

def calculate_natal_kundli(
    dob_str: str,
    tob_str: str,
    lat: float,
    lon: float,
    tz_offset_hours: float = 5.5
) -> Dict[str, Any]:
    dt_local = datetime.strptime(f"{dob_str} {tob_str}", "%Y-%m-%d %H:%M")
    dt_utc = dt_local - timedelta(hours=tz_offset_hours)
    jd_ut = get_julian_day(dt_utc)

    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED

    res_moon, _ = swe.calc_ut(jd_ut, swe.MOON, flags)
    moon_lon = res_moon[0]
    moon_rashi = int(moon_lon // 30) + 1
    
    nak_num = int(moon_lon // (360.0 / 27.0)) + 1
    nak_degree_in = moon_lon % (360.0 / 27.0)
    pada = int(nak_degree_in // (360.0 / 27.0 / 4.0)) + 1
    nak_name = NAKSHATRA_NAMES[nak_num] if nak_num < len(NAKSHATRA_NAMES) else str(nak_num)

    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'E', flags)
    ascendant_lon = ascmc[0]
    ascendant_sign = int(ascendant_lon // 30) + 1

    res_sun, _ = swe.calc_ut(jd_ut, swe.SUN, flags)
    sun_sign = int(res_sun[0] // 30) + 1

    res_jup, _ = swe.calc_ut(jd_ut, swe.JUPITER, flags)
    jup_sign = int(res_jup[0] // 30) + 1

    return {
        "dob": dob_str,
        "tob": tob_str,
        "lat": lat,
        "lon": lon,
        "tz_offset": tz_offset_hours,
        "moon_sign": moon_rashi,
        "moon_sign_name": RASHI_NAMES[moon_rashi],
        "nakshatra": nak_num,
        "nakshatra_name": nak_name,
        "pada": pada,
        "lagna_sign": ascendant_sign,
        "lagna_name": RASHI_NAMES[ascendant_sign],
        "sun_sign": sun_sign,
        "sun_sign_name": RASHI_NAMES[sun_sign],
        "jup_sign": jup_sign,
        "jup_sign_name": RASHI_NAMES[jup_sign]
    }

def calculate_astronomy_state(jd_ut: float, lat: float, lon: float) -> Dict[str, Any]:
    flags = swe.FLG_SWIEPH | swe.FLG_SIDEREAL | swe.FLG_SPEED
    planets = {}
    
    for name, pid in PLANET_IDS.items():
        res, _ = swe.calc_ut(jd_ut, pid, flags)
        planets[name] = {
            "lon": res[0],
            "lat": res[1],
            "speed": res[3],
            "sign": int(res[0] // 30) + 1,
            "nakshatra": int(res[0] // (360.0 / 27.0)) + 1
        }
    
    ketu_lon = (planets["Rahu"]["lon"] + 180.0) % 360.0
    planets["Ketu"] = {
        "lon": ketu_lon,
        "sign": int(ketu_lon // 30) + 1,
        "nakshatra": int(ketu_lon // (360.0 / 27.0)) + 1
    }

    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'E', flags)
    ascendant_lon = ascmc[0]
    ascendant_sign = int(ascendant_lon // 30) + 1

    house_occupants = {i: [] for i in range(1, 13)}
    for p_name, p_data in planets.items():
        h = ((p_data["sign"] - ascendant_sign) % 12) + 1
        house_occupants[h].append(p_name)

    sun_lon = planets["Sun"]["lon"]
    moon_lon = planets["Moon"]["lon"]
    elongation = (moon_lon - sun_lon) % 360.0
    
    tithi = int(elongation // 12.0) + 1
    nakshatra = int(moon_lon // (360.0 / 27.0)) + 1
    yoga = int(((sun_lon + moon_lon) % 360.0) // (360.0 / 27.0)) + 1
    karana = int(elongation // 6.0) + 1

    jup_combust = abs((planets["Jupiter"]["lon"] - sun_lon + 180) % 360 - 180) < 11.0
    ven_combust = abs((planets["Venus"]["lon"] - sun_lon + 180) % 360 - 180) < 9.0

    is_uttarayana = planets["Sun"]["sign"] in {10, 11, 12, 1, 2, 3}
    is_bhadra = karana in {7, 14, 21, 28, 35, 42, 49, 56}

    return {
        "jd": jd_ut,
        "planets": planets,
        "ascendant": {"lon": ascendant_lon, "sign": ascendant_sign},
        "houses": house_occupants,
        "tithi": tithi,
        "nakshatra": nakshatra,
        "yoga": yoga,
        "karana": karana,
        "is_uttarayana": is_uttarayana,
        "is_bhadra": is_bhadra,
        "combustion": {"jupiter": jup_combust, "venus": ven_combust}
    }

def evaluate_yajnopavita_slot(
    dt_local: datetime,
    lat: float,
    lon: float,
    child_moon_sign: int
) -> Optional[Dict[str, Any]]:
    dt_utc = dt_local.astimezone(timezone.utc)
    jd = get_julian_day(dt_utc)
    state = calculate_astronomy_state(jd, lat, lon)

    weekday = dt_local.weekday()
    py_to_vedic_varna = {6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6}
    vedic_varna = py_to_vedic_varna[weekday]

    # Rule 1: Ayana (Must be Uttarāyaṇa)
    if not state["is_uttarayana"]:
        return None

    # Rule 2: Weekday Verification
    if vedic_varna not in PERMISSIBLE_WEEKDAYS:
        return None

    # Rule 3: Nakshatra Verification
    if state["nakshatra"] not in UPANAYANA_NAKSHATRAS:
        return None

    # Rule 4: Tithi Verification
    if state["tithi"] in PROHIBITED_TITHIS:
        return None

    # Rule 5: Combustion
    if state["combustion"]["jupiter"] or state["combustion"]["venus"]:
        return None

    # Rule 6: Bhadrā Veto
    if state["is_bhadra"]:
        return None

    # Rule 7: Aṣṭama Śuddhi (8th house from Lagna must be vacant)
    if len(state["houses"][8]) > 0:
        return None

    # Rule 8: Tri-Bala (Guru-Bala, Sūrya-Bala, Candra-Bala)
    jup_house_from_moon = ((state["planets"]["Jupiter"]["sign"] - child_moon_sign) % 12) + 1
    if jup_house_from_moon in {4, 8, 12}:
        return None

    moon_house_from_moon = ((state["planets"]["Moon"]["sign"] - child_moon_sign) % 12) + 1
    if moon_house_from_moon in {4, 8, 12}:
        return None

    sun_house_from_moon = ((state["planets"]["Sun"]["sign"] - child_moon_sign) % 12) + 1
    if sun_house_from_moon in {4, 8, 12}:
        return None

    # Rule 9: Pāpa-Kartarī Check
    malefics = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}
    h12_malefics = set(state["houses"][12]).intersection(malefics)
    h2_malefics = set(state["houses"][2]).intersection(malefics)
    if h12_malefics and h2_malefics:
        return None

    # Compute Muhūrta Quality Score (0-100%)
    score = 65.0  # Base passing score for passing all 9 mandatory rules

    # Guru Bala Bonus
    if jup_house_from_moon in {2, 5, 7, 9, 11}:
        score += 15.0  # Pūrṇa Śubha
    elif jup_house_from_moon in {1, 3, 6, 10}:
        score += 8.0   # Madhyama

    # Surya Bala Bonus
    if sun_house_from_moon in {3, 6, 10, 11}:
        score += 10.0  # Full strength
    elif sun_house_from_moon in {1, 2, 5, 7, 9}:
        score += 5.0

    # Chandra Bala Bonus
    if moon_house_from_moon in {1, 3, 6, 7, 10, 11}:
        score += 10.0

    # Supreme Asterism Bonus
    if state["nakshatra"] in SUPREME_NAKSHATRAS:
        score += 5.0

    # Supreme Tithi Bonus
    if state["tithi"] in SUPREME_TITHIS:
        score += 5.0

    score = min(100.0, round(score, 1))

    # Determine Rank Grade
    if score >= 95.0:
        rank_grade = "Grade A+ (सर्वथा निर्दोष - Flawless VIP)"
    elif score >= 85.0:
        rank_grade = "Grade A (उत्तम - High Quality)"
    else:
        rank_grade = "Grade B (मध्यम - Moderate)"

    nak_name = NAKSHATRA_NAMES[state["nakshatra"]] if state["nakshatra"] < len(NAKSHATRA_NAMES) else str(state["nakshatra"])
    tithi_name = TITHI_NAMES[state["tithi"]] if state["tithi"] < len(TITHI_NAMES) else f"Tithi #{state['tithi']}"
    lagna_name = RASHI_NAMES[state["ascendant"]["sign"]] if state["ascendant"]["sign"] < len(RASHI_NAMES) else str(state["ascendant"]["sign"])

    return {
        "datetime": dt_local.strftime("%Y-%m-%d %I:%M %p"),
        "tithi": state["tithi"],
        "tithi_name": tithi_name,
        "nakshatra": state["nakshatra"],
        "nakshatra_name": nak_name,
        "lagna_sign": state["ascendant"]["sign"],
        "lagna_name": lagna_name,
        "guru_bala_house": jup_house_from_moon,
        "sun_bala_house": sun_house_from_moon,
        "moon_bala_house": moon_house_from_moon,
        "score": score,
        "rank_grade": rank_grade,
        "status": "Śuddha Yajñopavīta Muhūrta"
    }

def scan_yajnopavita_window(
    start_date: datetime,
    days: int,
    lat: float,
    lon: float,
    child_moon_sign: int
) -> List[Dict[str, Any]]:
    valid_slots = []
    current = start_date
    end = start_date + timedelta(days=days)
    
    step = timedelta(minutes=20)
    while current < end:
        if 6 <= current.hour < 17 or (current.hour == 17 and current.minute <= 30):
            match = evaluate_yajnopavita_slot(current, lat, lon, child_moon_sign)
            if match:
                valid_slots.append(match)
                current += timedelta(minutes=90)
                continue
        current += step

    # Sort slots by Muhūrta Score (Highest Rank First)
    valid_slots.sort(key=lambda x: x["score"], reverse=True)

    # Assign Rank Numbers
    for index, slot in enumerate(valid_slots, start=1):
        slot["rank"] = index

    return valid_slots
