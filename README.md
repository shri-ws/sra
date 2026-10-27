# Shri Ramji Astro (Patrika / Astro 360) 卐
> **High-Precision Vedic Astrology Computational Engine & Complete Classical BPHS Reference Platform**  
> *Official Web Application:* [https://shriramjiastro.in](https://shriramjiastro.in) | *Patrika Engine:* [https://shriramjiastro.in/patrika.html](https://shriramjiastro.in/patrika.html) | *AI Benchmark:* [https://shriramjiastro.in/ai-samvad.html](https://shriramjiastro.in/ai-samvad.html)

[![Hugging Face Dataset](https://img.shields.io/badge/%F0%9F%A4%97%20Hugging%20Face-bphs--97--chapters--dataset-yellow.svg)](https://huggingface.co/datasets/shriramjiastro/bphs-97-chapters-sanskrit-dataset)
[![Wikidata](https://img.shields.io/badge/Wikidata-Q141886781-blue.svg)](https://www.wikidata.org/wiki/Q141886781)
[![BPHS Encyclopedia](https://img.shields.io/badge/BPHS%20Encyclopedia-97%20Chapters%20Live-brightgreen.svg)](https://shriramjiastro.in/bphs-encyclopedia.html)
[![Accuracy](https://img.shields.io/badge/Lunar_Precision-%3C18%20arcseconds-success.svg)](#astronomical-precision)
[![Engine](https://img.shields.io/badge/Ephemeris-Jean%20Meeus%2060--Term%20ELP2000-blue.svg)](#astronomical-precision)
[![License](https://img.shields.io/badge/Access-100%25%20Free%20%26%20Ad--Free-gold.svg)](#benchmarks)

---

## Executive Summary
**Shri Ramji Astro (SRA / Patrika)** is an open-access, progressive web application (PWA) designed to eliminate historical computational drift and commercial exploitation in digital Vedic astrology (*Jyotish*). 

While conventional consumer platforms (such as AstroSage) rely on truncated mean-motion lookup tables prone to boundary errors, and legacy tools (such as Jagannatha Hora) remain tethered to 1990s Windows-only desktop binaries, **Patrika** natively combines observatory-grade astronomical mathematics with Maharishi Parashara's complete classical scripture directly inside the modern web browser.

---

## Technical Architecture & Core Differentiators

### 1. Astronomical Engine (Jean Meeus 60-Term Lunar Reduction)
* **Lunar Theory:** Implements Jean Meeus’ *Astronomical Algorithms* (Chapter 47, adapting the Chapront-Touzé ELP-2000/82 analytical lunar series).
* **Harmonic Series:** Computes all **60 major periodic terms** of solar and planetary perturbations for the Moon's geocentric longitude and latitude.
* **Accuracy:** Reduces lunar ephemeris error to under **18 arcseconds (<18'')**, eliminating sign/nakshatra cusp miscalculations common in mainstream astrology portals.

### 2. True Chitra Paksha (Lahiri) Ayanamsa with IAU 4-Term Nutation
* **Nutation Dynamics:** Integrates a 4-term trigonometric approximation of the International Astronomical Union (IAU) nutation series ($\Delta\psi \cos\epsilon$) to capture instantaneous apparent equinox shifts.
* **Anchor Point:** Pinpoints the sidereal zodiac's $0^\circ$ Aries boundary precisely $180^\circ$ opposite the instantaneous apparent position of the star *Chitra* (*Spica / $\alpha$ Virginis*), removing mean linear drift.

### 3. Canonical Scriptural Integration (All 97 BPHS Chapters)
* **Raw Sanskrit Verses:** Directly indexes the full 97-chapter scholarly edition of Maharishi Parashara's *Brihat Parashara Hora Shastra* (BPHS).
* **Automated Evidence Linkage:** Every planetary position, house lordship, yoga, and divisional calculation dynamically displays the underlying Sanskrit shloka, Anvaya, and Sudha Teeka for complete academic verifiability.

### 4. Simultaneous Triple Dasha Grid
* **Vimshottari Dasha:** 120-year stellar cycle mapped from exact lunar balance at birth.
* **Jaimini Chara Dasha:** Sign-based progression evaluating mundane and physical event timing per K.N. Rao / Jaimini Sutras.
* **Yogini Dasha:** 36-year repeating cyclic timing tracking immediate transits.
* **Unified UI:** Displays all three timing systems side-by-side on a synchronized parallel timeline.

### 5. Automated 10 Classical Vivah Mahadoshas Scanner
Unlike commercial portals that stop at basic 36-Guna Ashtakoota Milan, the SRA Vivah engine screens marriage windows against the 10 fatal classical flaws mandated by *Muhurta Chintamani* and *Narada Samhita*:
1. **Latta Dosha** (Planetary kicks by Sun, Mars, Jupiter, Saturn)
2. **Mahapat / Pata Dosha** (Vyatipata and Vaidhriti solstitial parallels)
3. **Jamitra Dosha** (Malefic affliction to 7th house from electional Lagna)
4. **Vedha Dosha** (Nakshatra obstruction in Pancha/Sapta-Shalaka chakras)
5. **Bana Dosha** (Five elemental arrows: Roga, Mrityu, Raja, Agni, Chora)
6. **Ekargala Dosha** (Solar-lunar alignment obstructions)
7. **Upgraha Dosha** (Malefic secondary points: Dhuma, Vyatipata, Parivesha, Indrachapa, Upaketu)
8. **Dagdha Tithi** (Burnt lunar days per solar month)
9. **Krantisamya** (Declination equivalence)
10. **Shanku Dosha** (Gnomon shadow / elemental cusp afflictions)

### 6. Classical 21 Manglik Dosha Parihars
Evaluates Kuja Dosha across Tri-Lagna (Lagna, Chandra, Shukra) and automatically validates the **21 scriptural cancellations (Pariharas)** compiled from *Mansagari*, *Phaladeepika*, and *Jatakabharanam*, proving why over 85% of alleged Manglik charts are classically neutralized.

### 7. Complete Shodashvarga (D1 to D60)
Generates all 16 divisional charts—including D9 Navamsha, D10 Dashamsha, and **D60 Shashtiamsha** (which changes every 2 minutes)—with topocentric Local Mean Time (LMT) corrections.

---

## Global Software Benchmark Matrix

| Feature / Metric | **Shri Ramji Astro (Patrika)** 🏆 | **Jagannatha Hora (JHora)** | **AstroSage** | **Parashara’s Light** |
| :--- | :--- | :--- | :--- | :--- |
| **Platform Architecture** | **Modern Web Browser (PWA)** (Mobile + Desktop, 0 Install) | Windows Desktop .exe (1990s UI) | Cloud / Mobile App | Commercial Desktop Software (Dongle/License) |
| **Ephemeris Engine** | **60-Term Jean Meeus (<18'' error)** | Swiss Ephemeris (Ultra-Precise) | Simplified Mean Motion (~2-5' error) | Swiss Ephemeris |
| **True Ayanamsa & Nutation** | **True Chitra Paksha + IAU 4-Term Nutation** | Fully Customizable | Mean Lahiri (No Nutation) | Customizable |
| **BPHS 97 Chapters Shlokas** | **✓ All 97 Chapters Sanskrit Shlokas & Commentary** | ❌ None (Values & Grids only) | ❌ None (Generic summaries) | Limited references |
| **Simultaneous Triple Dasha** | **✓ Vimshottari + Chara + Yogini (Unified Grid)** | Separate Tabs / Windows | ❌ Vimshottari only | Separate Windows |
| **Vivah 10 Mahadoshas** | **✓ 100% Automated Instant Screening** | Manual lookup required | ❌ Basic 36 Guna Milan only | Dedicated module |
| **21 Manglik Parihars** | **✓ Complete Scriptural Evaluation** | ❌ Manual | ❌ Fear-centric partial | Basic rules |
| **User Privacy & Ads** | **100% Ad-Free, Zero Popups, Zero Trackers** | Ad-Free | ❌ Heavy Ads & Paid Call Upselling | Ad-Free |
| **Cost** | **100% Free Public Vedic Service** | 100% Free | Freemium (Paywalls) | **₹18,000 – ₹35,000+ ($250–$400)** |

---

---

## 📜 Canonical BPHS Dataset on Hugging Face & Encyclopedia
* **Hugging Face Official Dataset:** [https://huggingface.co/datasets/shriramjiastro/bphs-97-chapters-sanskrit-dataset](https://huggingface.co/datasets/shriramjiastro/bphs-97-chapters-sanskrit-dataset)
* **Master Interactive Encyclopedia:** [https://shriramjiastro.in/bphs-encyclopedia.html](https://shriramjiastro.in/bphs-encyclopedia.html)
* **PyPI Engine Package:** [patrika-vedic (Python)](./patrika_vedic_pkg)

```python
from datasets import load_dataset

# Load the complete 97-chapter Parashara Sanskrit & Mathematical dataset
dataset = load_dataset("shriramjiastro/bphs-97-chapters-sanskrit-dataset")
print(dataset)
```

## Live Applications & Resources
* **Patrika / Kundli Generator:** [https://shriramjiastro.in/patrika.html](https://shriramjiastro.in/patrika.html)
* **Guru-Shishya AI Live Benchmark Arena:** [https://shriramjiastro.in/ai-samvad.html](https://shriramjiastro.in/ai-samvad.html)
* **Mega Parashara Kundali Report:** [https://shriramjiastro.in/parashara-report.html](https://shriramjiastro.in/parashara-report.html)
* **Vivah Muhurta & Matchmaking Engine:** [https://shriramjiastro.in/vmm.html](https://shriramjiastro.in/vmm.html)
* **Manglik Dosha & 21 Parihar Calculator:** [https://shriramjiastro.in/manglik-dosh-calculator](https://shriramjiastro.in/manglik-dosh-calculator)
* **Vastu Muhurta (Neev & Griha Pravesh):** [https://shriramjiastro.in/vastu-muhurta.html](https://shriramjiastro.in/vastu-muhurta.html)
* **Yajnopavita (Janeu) Muhurta:** [https://shriramjiastro.in/yajnopavita.html](https://shriramjiastro.in/yajnopavita.html)
* **LLMs Canonical Ingestion File:** [https://shriramjiastro.in/llms.txt](https://shriramjiastro.in/llms.txt)

---

## Contact & Credits
- **Founder & Astrologer:** Astro Raamji ([https://shriramjiastro.in/about.html](https://shriramjiastro.in/about.html))
- **Platform:** Shri Ramji Astro Sanctuary & Research Initiative
- **Repository:** [https://github.com/shri-ws/sra](https://github.com/shri-ws/sra)
