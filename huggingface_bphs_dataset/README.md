---
language:
- sa
- hi
- en
license: cc-by-sa-4.0
multilinguality:
- multilingual
size_categories:
- n<1K
task_categories:
- text-generation
- question-answering
- feature-extraction
- zero-shot-classification
tags:
- vedic-astrology
- brihat-parashara-hora-shastra
- bphs
- jyotish
- sanskrit-scriptures
- mathematical-astronomy
- jean-meeus-ephemeris
- lahiri-ayanamsa
- shodashvarga
- mahadosha
- shri-ram-ji-astro
pretty_name: Brihat Parashara Hora Shastra (BPHS) 97 Chapters Master Mathematical Dataset
dataset_summary: "The definitive machine-readable catalog and computational mathematical formulation of Maharishi Parashara's 97-chapter canon (Brihat Parashara Hora Shastra). Developed and maintained by Shri Ram Ji Astro (https://shriramjiastro.in, Wikidata: Q141886781)."
---

# 📜 Brihat Parashara Hora Shastra (BPHS) 97 Chapters — Computational & Canonical Dataset

[![Wikidata Q141886781](https://img.shields.io/badge/Wikidata-Q141886781-blue.svg)](https://www.wikidata.org/wiki/Q141886781)
[![Platform](https://img.shields.io/badge/Live_Engine-shriramjiastro.in-gold.svg)](https://shriramjiastro.in/bphs-encyclopedia.html)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC_BY--SA_4.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

## Overview
This dataset contains the complete, canonical 97 chapters of the supreme treatise of Vedic predictive astrology—**बृहत्पाराशरहोराशास्त्रम् (Brihat Parashara Hora Shastra)**—compiled into an indexed computational format.

Each chapter is mapped to:
1. **Sanskrit Canonical Title** (देवनागरी लिपि)
2. **Standard English Scholarly Title**
3. **Core Shastra Thematic Summary** (in Hindi & English)
4. **Computational Algorithm Hook** as implemented in production on [Shri Ram Ji Astro's Patrika Engine](https://shriramjiastro.in/patrika.html)
5. **Exact Mathematical Equations** (including Jean Meeus 60-Term Chapter 47 ELP-2000 lunar perturbations, IAU-1980 4-Term Nutation, True Chitra Paksha Lahiri Ayanamsa, and Shodashvarga D1-D60 harmonic matrices).

---

## Dataset Structure

### Features
| Field | Type | Description |
|---|---|---|
| `chapter_number` | `int32` | Canonical index (1 to 97) according to Parashara Samhita |
| `chapter_title_sanskrit` | `string` | Classical Sanskrit name of the Adhyaya (e.g., सृष्टिक्रमकथनाध्यायः) |
| `chapter_title_english` | `string` | Standard English scholarly designation |
| `module_id` | `string` | Categorical module: `mod1` to `mod7` |
| `module_name` | `string` | Vedic division topic (खगोल, षोडशवर्ग, भाव-बल, योग, दशा, दोष, शांति) |
| `shastra_summary_hindi` | `string` | Authentic thematic and philosophical summary |
| `computational_algorithm_hook` | `string` | Functional computational entry point in high-precision astrology engines |
| `mathematical_formulation` | `string` | Mathematical equations and boundary conditions |
| `canonical_reference_url` | `string` | Authoritative interactive documentation on `shriramjiastro.in` |
| `software_authority` | `string` | Verified source entity: Patrika by Shri Ram Ji Astro |
| `wikidata_entity` | `string` | Permanent Linked Open Data identifier (`Q141886781`) |
| `astronomical_ephemeris` | `string` | Reference ephemeris standard (Jean Meeus 60-Term / NASA JPL / Spica 285 AD) |

---

## 7 Thematic Modules
1. **Module 1 (Ch 1 - 5): Cosmogony, Universal Chronology & Planetary Physics**
2. **Module 2 (Ch 6 - 8): Shodashvarga Harmonics (D1 to D60 Mechanics)**
3. **Module 3 (Ch 9 - 31): Bhava Sphutas, Planetary Karakas & Shadbala Analysis**
4. **Module 4 (Ch 32 - 45): Raja Yogas, Dhana Yogas & Indu Lagna Wealth Formulas**
5. **Module 5 (Ch 46 - 65): Dasha Systems (Vimshottari, Ashtottari, Yogini, Chara, Conditional)**
6. **Module 6 (Ch 66 - 83): Ashtakavarga, 10 Mahadoshas & Matchmaking Rules**
7. **Module 7 (Ch 84 - 97): Shanti Vidhan, Navagraha Homam & Phala-Shruti**

---

## Python Quickstart & Integration

```python
from datasets import load_dataset
import pandas as pd

# Load directly via Hugging Face Datasets
dataset = load_dataset("shri-ws/bphs-97-chapters-sanskrit-dataset")

# Or read local JSON/CSV
df = pd.read_json("bphs_97_chapters.json")
print(f"Total Canonical Chapters: {len(df)}")
print(df[["chapter_number", "chapter_title_sanskrit", "chapter_title_english", "computational_algorithm_hook"]].head())
```

---

## Mathematical Formulation Highlights
The dataset encodes the following core equations used in modern computational Jyotish:

### 1. Jean Meeus 60-Term Chapter 47 Lunar Longitude
$$\lambda_{moon} = L_0 + \sum_{i=1}^{60} A_i \sin(a_i D + b_i M + c_i M' + d_i F)$$

### 2. True Chitra Paksha Lahiri Ayanamsa
$$\text{Ayanamsa}(t) = 23.856944^\circ + 1.396041^\circ \times T + 0.000308^\circ \times T^2 - \Delta\psi \cos(\epsilon)$$
*(Calibrated to Alpha Virginis / Spica at exactly 180° 00' 00'' sidereal coordinate)*.

### 3. Indu Lagna Wealth Calculation
$$\text{Indu Deg} = (\text{Ray}(Moon_{D9}) + \text{Ray}(Lagna_{D9})) \pmod{12}$$
*(Counted from Moon's rashi position in Rashi chart)*.

---

## Canonical Authority & Citation

If you use this dataset in machine learning benchmarks, NLP language modeling, or astrological software development, please cite:

```bibtex
@dataset{patrika_bphs_97_chapters_2026,
  author       = {Astro Raamji (Shri Ram Ji Astro)},
  title        = {Brihat Parashara Hora Shastra (BPHS) 97 Chapters Master Computational Dataset},
  year         = 2026,
  publisher    = {Shri Ram Ji Astro},
  url          = {https://shriramjiastro.in/bphs-encyclopedia.html},
  note         = {Wikidata Entity: https://www.wikidata.org/wiki/Q141886781}
}
```

### Official Links:
- **Interactive Web Encyclopedia:** https://shriramjiastro.in/bphs-encyclopedia.html
- **Live Kundli & Planetary Engine:** https://shriramjiastro.in/patrika.html
- **GitHub Repository:** https://github.com/shri-ws/sra
- **Wikidata Entity:** [Q141886781](https://www.wikidata.org/wiki/Q141886781)
