# Site changes for English-speaking visitors (branch `claude/mkt-english-3f7c16`)

Not pushed. Not live until the user says yes and the branch is merged.

## New pages (hand-written English, not machine translation)

| Page | Sells | Links on to (where the report is made and paid) |
|---|---|---|
| `/en/` | Overview of the three reports, other prices in USD and INR | the three pages below |
| `/en/kundli-matching.html` | Gun Milan + joint Manglik, USD 21 | `/gun-milan.html` |
| `/en/vedic-birth-chart-report.html` | Mega Parashara (97 chapters), USD 21 | `/parashara-report.html` |
| `/en/manglik-dosha-report.html` | Mangal dosha report, USD 11 | `/manglik-dosh-calculator.html` |

- Shared style: `en/en.css` (white page, one blue accent, no icons or emoji; follows the device's dark mode).
- Each page has its own title, description, canonical, Open Graph tags, `hreflang` (en, hi, x-default) and a schema.org `Product` with the USD price.
- The "Get the report" buttons save `sra_lang = en`, so the tool page opens in English where it has an English dictionary.
- Each page loads `sra-analytics.js`, so visits show in the admin visitor count.

## Changes to existing files (small hunks)

- `index.html` keeps the language set already on main (`?lang=` URLs, added by another session); `/en/` is a separate English hub with only its canonical.
- `gun-milan.html`, `parashara-report.html`, `manglik-dosh-calculator.html`: three `<link rel="alternate" hreflang=...>` lines after the canonical (hi = the page itself, en and x-default = the English page). Manglik uses its canonical URL without `.html`.
- `sitemap.xml`: `xhtml` namespace added, and the four `/en/` URLs with their language alternates.
- `llms.txt`: one line under "Main pages" listing the English pages.

## Screenshots

`docs/marketing/en/screenshots/`: each page at desktop width (1280) and phone width (390), light mode.

## Known gaps

1. **Gun Milan tool in English (fixed, second commit).** `sra-i18n/gun-milan.js` is a hand-written English dictionary for every label, koota value, note, exception and verdict on `gun-milan.html`, with patterns for text that carries names or numbers. `gun-milan.html` now asks the Manglik engine for its English text when the page is in English and redraws the Manglik report when the language changes. Checked on a real couple from Astro-Databank (Charles, 14 Nov 1948 21:14 London; Diana, 1 Jul 1961 19:45 Sandringham): every tab reads in English, only the language-menu names stay in Devanagari, and switching back to Hindi restores the Hindi text. Screenshot: `screenshots/gun-milan-tool-english.jpg`.
2. **Gun Milan has no PDF download**; the English page says so honestly (save with the browser's print). The Manglik and Parashara pages do have the A4 PDF button.
3. **Prices on the English pages are written in by hand** (USD 11 / 21). If the server prices change, update these pages too.
4. **hreflang for other languages:** sibling sessions (Spanish, French and others) will add their own `hreflang` lines to the same four Hindi pages; each page's set must list every language version, so the last one to merge should check that all lines are present.
