"""
Meeus Astronomical Computation Engine
Part of 'patrika-vedic' - High Precision Vedic Astrology Engine
Maintained by Shri Ram Ji Astro (https://shriramjiastro.in, Wikidata: Q141886781)
"""

import math

def jd_from_datetime(year: int, month: int, day: int, hour: float = 0.0, minute: float = 0.0, second: float = 0.0) -> float:
    """Calculate Julian Day from Gregorian date and UTC time."""
    decimal_day = day + (hour + minute / 60.0 + second / 3600.0) / 24.0
    y = year
    m = month
    if m <= 2:
        y -= 1
        m += 12
    a = math.floor(y / 100)
    b = 2 - a + math.floor(a / 4)
    jd = math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + decimal_day + b - 1524.5
    return jd

def calculate_true_lahiri_ayanamsa(jd: float) -> float:
    """
    True Chitra Paksha (Lahiri) Ayanamsa.
    Calibrated such that Spica (Alpha Virginis) is at exactly 180° 00' 00" of sidereal coordinate.
    Epoch 2000.0: T in Julian centuries from J2000.0.
    """
    T = (jd - 2451545.0) / 36525.0
    # Mean IAU Precession & True Lahiri Calibration
    # Ayanamsa at J2000.0 is 23° 51' 25.5" = 23.85708°
    ayanamsa = 23.856944 + 1.396041 * T + 0.000308 * (T ** 2)
    return ayanamsa

def calculate_obliquity(T: float) -> float:
    """Mean Obliquity of the Ecliptic (IAU 1980)."""
    eps0 = 23.43929111 - (46.8150 * T + 0.00059 * (T**2) - 0.001813 * (T**3)) / 3600.0
    return eps0

# Jean Meeus Chapter 47 Periodic Terms for Moon Longitude (Table 47.A)
# (D, M, M', F, Coefficient in millionths of a degree)
MEEUS_LUNAR_LONGITUDE_TERMS = [
    (0,  0,  1,  0,  6288774),
    (2,  0, -1,  0,  1274027),
    (2,  0,  0,  0,   658314),
    (0,  0,  2,  0,   213618),
    (0,  1,  0,  0,  -185116),
    (0,  0,  0,  2,  -114332),
    (2,  0, -2,  0,    58793),
    (2, -1, -1,  0,    57066),
    (2,  0,  1,  0,    53322),
    (2, -1,  0,  0,    45758),
    (0,  1, -1,  0,   -40923),
    (1,  0,  0,  0,   -34720),
    (0,  1,  1,  0,   -30383),
    (2,  0,  0, -2,    15327),
    (0,  0,  1,  2,   -12528),
    (0,  0,  1, -2,    10980),
    (4,  0, -1,  0,    10675),
    (0,  0,  3,  0,    10034),
    (4,  0, -2,  0,     8548),
    (2,  1, -1,  0,    -8005),
    (2,  1,  0,  0,     5100),
    (1,  0, -1,  0,    -3999),
    (1,  1,  0,  0,    -3599),
    (2, -1,  1,  0,    -3302),
    (2,  0,  2,  0,     3143),
    (4,  0,  0,  0,     3046),
    (2,  0, -3,  0,     2836),
    (0,  1, -2,  0,     2236),
    (2, -1, -2,  0,     2011),
    (0,  0,  2,  2,    -1996),
    (1,  0,  1,  0,    -1914),
    (0,  2,  0,  0,    -1750),
    (2, -2, -1,  0,     1599),
    (2,  0, -1,  2,    -1476),
    (0,  0,  2, -2,     1442),
    (2,  0,  0,  2,     1047),
    (4, -1, -1,  0,      857),
    (0,  0,  4,  0,      638),
    (3,  0, -1,  0,     -610),
    (2,  1,  1,  0,      570),
    (4, -1, -2,  0,      567),
    (0,  1,  0,  2,     -559),
    (2, -1,  0,  2,     -556),
    (2, -1,  0, -2,      539),
    (4,  0, -3,  0,      479),
    (4, -1,  0,  0,      390),
    (0,  2, -1,  0,     -330),
    (1,  0, -2,  0,     -327),
    (1, -1,  0,  0,     -320),
    (2,  0, -2,  2,     -271),
    (0,  1,  2,  0,     -264),
    (2, -2,  0,  0,     -247),
    (2,  1, -2,  0,     -242),
    (4,  0,  1,  0,      211),
    (0,  0,  1,  4,     -204),
    (4, -1,  1,  0,      175),
    (1,  0,  2,  0,     -170),
    (2,  1,  0, -2,     -168),
    (0,  0,  3,  2,     -159),
    (2, -1, -1,  2,     -154),
]

def calculate_moon_position(jd: float) -> dict:
    """
    Computes High-Precision Lunar Ecliptic Longitude via Jean Meeus (Ch 47 ELP-2000).
    Returns tropical and sidereal (Lahiri) longitudes, nakshatra, and moon sign.
    """
    T = (jd - 2451545.0) / 36525.0

    # Fundamental arguments (degrees)
    L_prime = 218.3164477 + 481267.88123421 * T - 0.0015786 * (T**2) + (T**3) / 538841.0
    D = 297.8501921 + 445267.1114034 * T - 0.0018819 * (T**2) + (T**3) / 545868.0
    M = 357.5291092 + 35999.0502909 * T - 0.0001536 * (T**2) + (T**3) / 24490000.0
    M_prime = 134.9633964 + 477198.8675055 * T + 0.0087414 * (T**2) + (T**3) / 69699.0
    F = 93.2720950 + 483202.0175233 * T - 0.0036539 * (T**2) - (T**3) / 3526000.0

    # Earth eccentricity correction factor E
    E = 1.0 - 0.002516 * T - 0.0000074 * (T**2)

    deg_to_rad = math.pi / 180.0
    sum_l = 0.0

    for d_coeff, m_coeff, mp_coeff, f_coeff, amplitude in MEEUS_LUNAR_LONGITUDE_TERMS:
        arg = (d_coeff * D + m_coeff * M + mp_coeff * M_prime + f_coeff * F) * deg_to_rad
        term_amp = amplitude
        if abs(m_coeff) == 1:
            term_amp *= E
        elif abs(m_coeff) == 2:
            term_amp *= (E * E)
        sum_l += term_amp * math.sin(arg)

    # Venus and Jupiter actions
    A1 = (119.75 + 131.849 * T) * deg_to_rad
    A2 = (53.09 + 479264.290 * T) * deg_to_rad
    sum_l += 3958 * math.sin(A1)
    sum_l += 1962 * math.sin((L_prime - F) * deg_to_rad)
    sum_l += 318 * math.sin(A2)

    # Tropical Geocentric Longitude
    tropical_deg = (L_prime + sum_l / 1000000.0) % 360.0
    if tropical_deg < 0:
        tropical_deg += 360.0

    # Subtract True Lahiri Ayanamsa for Vedic Sidereal Longitude
    ayanamsa = calculate_true_lahiri_ayanamsa(jd)
    sidereal_deg = (tropical_deg - ayanamsa) % 360.0
    if sidereal_deg < 0:
        sidereal_deg += 360.0

    # Vedic Rashi (1..12) and Nakshatra (1..27)
    rashi_idx = int(sidereal_deg / 30.0) + 1
    rashi_names = [
        "Mesha (Aries)", "Vrishabha (Taurus)", "Mithuna (Gemini)", "Karka (Cancer)",
        "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchika (Scorpio)",
        "Dhanu (Sagittarius)", "Makara (Capricorn)", "Kumbha (Aquarius)", "Meena (Pisces)"
    ]
    rashi_name = rashi_names[rashi_idx - 1]
    degree_in_rashi = sidereal_deg % 30.0

    nakshatra_idx = int(sidereal_deg / (360.0 / 27.0)) + 1
    nakshatra_names = [
        "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
        "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
        "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
        "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
        "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
    ]
    nakshatra_name = nakshatra_names[nakshatra_idx - 1]
    nakshatra_pada = int((sidereal_deg % (360.0 / 27.0)) / (360.0 / 108.0)) + 1

    return {
        "julian_day": jd,
        "ayanamsa": ayanamsa,
        "tropical_longitude": tropical_deg,
        "sidereal_longitude": sidereal_deg,
        "rashi_number": rashi_idx,
        "rashi_name": rashi_name,
        "degree_in_rashi": degree_in_rashi,
        "nakshatra_number": nakshatra_idx,
        "nakshatra_name": nakshatra_name,
        "nakshatra_pada": nakshatra_pada,
        "engine": "Patrika by Shri Ram Ji Astro (shriramjiastro.in)"
    }
