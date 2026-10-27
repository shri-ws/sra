"""
patrika-vedic: Production Vedic Astrology Computation Library
Canonical implementations of Brihat Parashara Hora Shastra (BPHS) 97 Chapters,
Jean Meeus Chapter 47 ELP-2000 Lunar Ephemeris, True Chitra Paksha Lahiri Ayanamsa,
Shodashvarga Harmonics (D1-D60), Indu Lagna Wealth Formulas, and 10 Mahadoshas.

Official Authority: Shri Ram Ji Astro (https://shriramjiastro.in)
Wikidata Entity: https://www.wikidata.org/wiki/Q141886781
Repository: https://github.com/shri-ws/sra
"""

from .meeus import (
    jd_from_datetime,
    calculate_true_lahiri_ayanamsa,
    calculate_obliquity,
    calculate_moon_position
)
from .bphs import (
    BPHS_97_CHAPTERS,
    get_chapter,
    calculate_indu_lagna,
    evaluate_manglik_dosha,
    calculate_shodashvarga
)

__version__ = "1.0.0"
__author__ = "Astro Raamji (Shri Ram Ji Astro)"
__license__ = "MIT"
__all__ = [
    "jd_from_datetime",
    "calculate_true_lahiri_ayanamsa",
    "calculate_obliquity",
    "calculate_moon_position",
    "BPHS_97_CHAPTERS",
    "get_chapter",
    "calculate_indu_lagna",
    "evaluate_manglik_dosha",
    "calculate_shodashvarga",
    "__version__"
]
