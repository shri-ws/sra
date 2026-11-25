# Site changes for German-Speaking Visitors (branch `claude/mkt-german-909d73`)

Status: implemented on worktree branch, not pushed.

## Landing Pages in `de/`

Targeted at Germany, Austria, and Switzerland:

| Page | Service / Focus | Price | Target link |
|---|---|---|---|
| `/de/` | German hub page with overview of all 3 reports and payment note | — | links to pages below |
| `/de/geburtshoroskop.html` | Mega Parashara Vedic birth chart report (97 chapters, D1–D60, Ashtakavarga, Yogas) | USD 21 | `/parashara-report.html?cur=usd` |
| `/de/kundli-matching.html` | Gun Milan 36-point compatibility with Nadi/Bhakoot cancellations & joint Manglik | USD 21 | `/gun-milan.html?cur=usd` |
| `/de/dhana-yoga.html` | Dhana Yoga wealth potential & financial timing report | USD 11 | `/dhan-yoga-calculator.html?cur=usd` |

## Assets and Scripts

- `de/de.css`: German stylesheet styling.
- `de/de.js`: Forwarding script preserving `?cur=usd`, passing `?ref=`, and setting the language translation cookie (`googtrans=/en/de`).
- Schema.org `Product` JSON-LD with USD prices on all report pages.
- Hreflangs (`de`, `en`, `hi`, `x-default`) and canonical links.
