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
# Hasta(13), Chitra(14), Swati(15), Vishakha(16), Anuradha(17), Rohini(4), 
# U.Phal(12), U.Ashadha(21), U.Bhadra(26), Revati(27), Ashwini(1), 
# Mrigashira(5), Punarvasu(7), Pushya(8), Dhanishta(23)
UPANAYANA_NAKSHATRAS = {1, 4, 5, 7, 8, 12, 13, 14, 15, 16, 17, 21, 23, 26, 27}

# Prohibited Tithis: 4, 9, 14 (Rikta), 30 (Amavasya), 6, 8, 12, etc.
PROHIBITED_TITHIS = {4, 6, 8, 9, 12, 14, 19, 21, 23, 24, 27, 29, 30}

# Permissible Weekdays: 0 (Sunday), 1 (Monday), 3 (Wednesday), 4 (Thursday), 5 (Friday)
PERMISSIBLE_WEEKDAYS = {0, 1, 3, 4, 5}

NAKSHATRA_NAMES = [
    "", "Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśirā", "Ārdrā",
    "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "Pūrvāphālgunī", "Uttarāphālgunī",
    "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā",
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
    
    # Ketu
    ketu_lon = (planets["Rahu"]["lon"] + 180.0) % 360.0
    planets["Ketu"] = {
        "lon": ketu_lon,
        "sign": int(ketu_lon // 30) + 1,
        "nakshatra": int(ketu_lon // (360.0 / 27.0)) + 1
    }

    # Ascendant and 12 Bhavas (Equal House System / Porphyry)
    cusps, ascmc = swe.houses_ex(jd_ut, lat, lon, b'E', flags)
    ascendant_lon = ascmc[0]
    ascendant_sign = int(ascendant_lon // 30) + 1

    # Map planets to houses from Lagna
    house_occupants = {i: [] for i in range(1, 13)}
    for p_name, p_data in planets.items():
        h = ((p_data["sign"] - ascendant_sign) % 12) + 1
        house_occupants[h].append(p_name)

    # Panchāṅga Calculation
    sun_lon = planets["Sun"]["lon"]
    moon_lon = planets["Moon"]["lon"]
    elongation = (moon_lon - sun_lon) % 360.0
    
    tithi = int(elongation // 12.0) + 1
    nakshatra = int(moon_lon // (360.0 / 27.0)) + 1
    yoga = int(((sun_lon + moon_lon) % 360.0) // (360.0 / 27.0)) + 1
    karana = int(elongation // 6.0) + 1

    # Combustion (Maudhya)
    jup_combust = abs((planets["Jupiter"]["lon"] - sun_lon + 180) % 360 - 180) < 11.0
    ven_combust = abs((planets["Venus"]["lon"] - sun_lon + 180) % 360 - 180) < 9.0

    # Uttarāyaṇa: Sun in signs 10 (Capricorn), 11, 12, 1, 2, 3
    is_uttarayana = planets["Sun"]["sign"] in {10, 11, 12, 1, 2, 3}

    # Bhadrā (Viṣṭi Karaṇa)
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
    # Convert local time to UTC
    dt_utc = dt_local.astimezone(timezone.utc)
    jd = get_julian_day(dt_utc)
    state = calculate_astronomy_state(jd, lat, lon)

    weekday = dt_local.weekday()
    # Python weekday: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    # Normalize: Sunday=0, Monday=1, Tuesday=2, Wednesday=3, Thursday=4, Friday=5, Saturday=6
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

    # Rule 5: Combustion (Guru/Śukra Maudhya)
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
        return None  # Unfavorable Guru Bala

    moon_house_from_moon = ((state["planets"]["Moon"]["sign"] - child_moon_sign) % 12) + 1
    if moon_house_from_moon in {4, 8, 12}:
        return None  # Unfavorable Chandra Bala

    sun_house_from_moon = ((state["planets"]["Sun"]["sign"] - child_moon_sign) % 12) + 1
    if sun_house_from_moon in {4, 8, 12}:
        return None  # Unfavorable Surya Bala

    # Rule 9: Pāpa-Kartarī Check (12th and 2nd from Lagna must not both contain malefics)
    malefics = {"Sun", "Mars", "Saturn", "Rahu", "Ketu"}
    h12_malefics = set(state["houses"][12]).intersection(malefics)
    h2_malefics = set(state["houses"][2]).intersection(malefics)
    if h12_malefics and h2_malefics:
        return None

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
    
    # Scan in 20-minute steps
    step = timedelta(minutes=20)
    while current < end:
        # Daytime restriction: 06:30 AM to 05:30 PM local
        if 6 <= current.hour < 17 or (current.hour == 17 and current.minute <= 30):
            match = evaluate_yajnopavita_slot(current, lat, lon, child_moon_sign)
            if match:
                valid_slots.append(match)
                # Skip 90 minutes forward upon finding a valid window
                current += timedelta(minutes=90)
                continue
        current += step

    return valid_slots
