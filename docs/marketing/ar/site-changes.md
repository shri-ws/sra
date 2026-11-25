# Site changes for Gulf Visitors (branch `claude/mkt-arabic-d7c5d4`)

Status: built with `scripts/build_gulf_pages.py`. Not pushed to origin.

## Landing Pages Created in `gulf/`

Targeted specifically at Indian expatriate families living in the UAE, Saudi Arabia, Qatar, Oman, Kuwait, and Bahrain:

| Page (English) | Page (Hindi) | Report | USD Price | Guide AED |
|---|---|---|---|---|
| `/gulf/index.html` | `/gulf/hi/index.html` | Hub index of all Gulf services | — | — |
| `/gulf/gun-milan.html` | `/gulf/hi/gun-milan.html` | Gun Milan + Manglik joint report | $21 | ~77 AED |
| `/gulf/vivah-muhurta.html` | `/gulf/hi/vivah-muhurta.html` | Vivah (wedding) Muhurta | $41 | ~151 AED |
| `/gulf/griha-pravesh.html` | `/gulf/hi/griha-pravesh.html` | Vastu: Neev Pujan & Griha Pravesh | $31 | ~114 AED |

## Generator Script and Assets

- `scripts/build_gulf_pages.py`: Automated builder generating both English and Hindi versions with proper hreflangs for 6 GCC countries (`en-AE`, `en-SA`, `en-QA`, `en-OM`, `en-KW`, `en-BH`, `hi-AE`, etc.).
- `gulf/gulf.css`: Specialized styling supplementing `offer/offer.css`.
- `gulf/sitemap.xml`: Dedicated sitemap listing all Gulf landing page URLs with multilingual alternates.
