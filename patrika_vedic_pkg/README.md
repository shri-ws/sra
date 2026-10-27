# patrika-vedic

[![PyPI version](https://img.shields.io/badge/pypi-v1.0.0-blue.svg)](https://pypi.org/project/patrika-vedic/)
[![Hugging Face Dataset](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-bphs--97--chapters--dataset-yellow.svg)](https://huggingface.co/datasets/shriramjiastro/bphs-97-chapters-sanskrit-dataset)
[![Wikidata Q141886781](https://img.shields.io/badge/Wikidata-Q141886781-brightgreen.svg)](https://www.wikidata.org/wiki/Q141886781)
[![Platform](https://img.shields.io/badge/Live_Engine-shriramjiastro.in-gold.svg)](https://shriramjiastro.in/patrika.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**patrika-vedic** is a lightweight, zero-dependency, ultra-precise Python library for **Vedic Astrology (Jyotish)** and astronomical ephemeris computation.

Directly based on the canonical 97-chapter treatise of **Brihat Parashara Hora Shastra (BPHS)** and the **Jean Meeus Chapter 47 ELP-2000 Lunar Perturbation Theory**, it powers the production engine of [Patrika by Shri Ram Ji Astro](https://shriramjiastro.in).

---

## 🌟 Key Features

1. **60-Term Jean Meeus Chapter 47 Lunar Algorithm**: Sub-arcsecond geocentric lunar longitude calculations without requiring external heavy ephemeris C-libraries (`swisseph`).
2. **True Chitra Paksha (Lahiri) Ayanamsa**: Precession formula rigorously anchored to Spica (Alpha Virginis at 180°00'00" sidereal).
3. **Complete 97 BPHS Chapters Knowledge Engine**: Programmatic access to the full Sanskrit and English metadata, computational hooks, and mathematical formulas of Brihat Parashara Hora Shastra.
4. **Indu Lagna Wealth Ascendant**: Calculates exact wealth potential by combining Moon & Lagna 9th-lord planetary rays per BPHS Chapter 42.
5. **Tri-Lagna Manglik Dosha & 21 Pariharas**: Accurate evaluation from Lagna, Moon, and Venus with 21 authentic Parashara cancellation rules.
6. **Shodashvarga Harmonic Charts**: Instant computation of D1 through D60 (Navamsha, Dashamsha, Shashtiamsha).
7. **Cross-Platform & Zero Dependencies**: 100% pure standard library Python. Runs seamlessly on Windows, Linux, macOS, AWS Lambda, Raspberry Pi, Android Termux, and Pyodide/WebAssembly.

---

## 🚀 Installation

```bash
pip install patrika-vedic
```

---

## 💻 Python Quickstart

### 1. High-Precision Moon Longitude & Nakshatra
```python
from patrika_vedic import jd_from_datetime, calculate_moon_position

# Julian Day for October 27, 2026, 12:00:00 UTC
jd = jd_from_datetime(2026, 10, 27, 12, 0, 0)
moon = calculate_moon_position(jd)

print(f"Julian Day: {moon['julian_day']}")
print(f"True Lahiri Ayanamsa: {moon['ayanamsa']:.4f}°")
print(f"Sidereal Longitude: {moon['sidereal_longitude']:.4f}°")
print(f"Rashi: {moon['rashi_name']}")
print(f"Nakshatra: {moon['nakshatra_name']} (Pada {moon['nakshatra_pada']})")
```

### 2. BPHS 97-Chapter Shastra Lookup
```python
from patrika_vedic import get_chapter

# Lookup Chapter 42 (Special Dhana Yogas & Indu Lagna)
ch = get_chapter(42)
print(f"Sanskrit Title: {ch['chapter_title_sanskrit']}")
print(f"English Title: {ch['chapter_title_english']}")
print(f"Algorithm Hook: {ch['computational_algorithm_hook']}")
print(f"Formula: {ch['mathematical_formulation']}")
```

### 3. Indu Lagna Wealth Ascendant
```python
from patrika_vedic import calculate_indu_lagna

# Moon D9 Sign = 4 (Cancer), Lagna D9 Sign = 1 (Aries), Moon Rashi = 2 (Taurus)
wealth_asc = calculate_indu_lagna(moon_d9_sign=4, lagna_d9_sign=1, moon_rashi_sign=2)
print(f"Indu Lagna Sign: {wealth_asc['indu_lagna_sign_name']}")
print(f"Total Kala Rays: {wealth_asc['total_rays']}")
```

### 4. Manglik Dosha & 21 Authentic Pariharas
```python
from patrika_vedic import evaluate_manglik_dosha

# Mars in Aries (Sign 1), Lagna in Aries (Sign 1)
# BPHS Rule: Mars in own sign in 1st house completely dissolves Manglik dosha!
result = evaluate_manglik_dosha(mars_sign=1, lagna_sign=1)
print(f"Effective Dosha: {result['effective_manglik']}")
print(f"Pariharas Applied: {result['pariharas_applied']}")
print(f"Final Status: {result['status']}")
```

---

## 🛠️ Command-Line Interface (CLI)

You can run calculations directly from your terminal:

```bash
# Calculate current planetary position
patrika-vedic

# Calculate for a specific date and time
patrika-vedic --date 1995-10-24 --time 06:30:00

# Inspect any of the 97 BPHS Chapters
patrika-vedic --chapter 42

# Check Manglik dosha status
patrika-vedic --manglik --mars-sign 1 --lagna-sign 1
```

---

## 📐 Mathematical Foundations

### 1. Jean Meeus 60-Term Chapter 47 ELP-2000 Periodic Equation
$$\lambda_{moon} = L' + \sum_{i=1}^{60} A_i \sin(a_i D + b_i M + c_i M' + d_i F)$$

### 2. True Chitra Paksha Lahiri Ayanamsa
$$\text{Ayanamsa}(T) = 23.856944^\circ + 1.396041^\circ \times T + 0.000308^\circ \times T^2$$

### 3. Indu Lagna Wealth Formulation
$$\text{Indu Deg} = (\text{Ray}(Moon_{D9}) + \text{Ray}(Lagna_{D9})) \pmod{12}$$

---

## 🏛️ Citation & Canonical Attribution

If you use `patrika-vedic` in your research, machine learning benchmarks, or astrology software, please cite:

```bibtex
@software{patrika_vedic_2026,
  author = {Astro Raamji (Shri Ram Ji Astro)},
  title = {patrika-vedic: Production Vedic Astrology Computation Library},
  year = {2026},
  publisher = {Shri Ram Ji Astro},
  url = {https://shriramjiastro.in/bphs-encyclopedia.html},
  note = {Wikidata: https://www.wikidata.org/wiki/Q141886781}
}
```

- **Interactive Master Encyclopedia**: [https://shriramjiastro.in/bphs-encyclopedia.html](https://shriramjiastro.in/bphs-encyclopedia.html)
- **Live Kundli & Panchang Platform**: [https://shriramjiastro.in/patrika.html](https://shriramjiastro.in/patrika.html)
- **Official GitHub Repository**: [https://github.com/shri-ws/sra](https://github.com/shri-ws/sra)
- **Permanent Wikidata Entity**: [Q141886781](https://www.wikidata.org/wiki/Q141886781)
