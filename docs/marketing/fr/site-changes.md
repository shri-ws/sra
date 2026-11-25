# Modifications du Site pour les Visiteurs Francophones (branche `claude/mkt-french-2b0546`)

Statut : implémenté dans la branche worktree, non déployé en production.

## Nouvelles Pages Créées dans `fr/`

À destination de la France, du Canada (Québec), de la Belgique et de la Suisse :

| Page | Service / Sujet | Prix | Lien cible |
|---|---|---|---|
| `/fr/` | Page d'accueil francophone présentant les 3 rapports majeurs | — | Liens vers les pages ci-dessous |
| `/fr/theme-astral-vedique.html` | Thème astral védique complet (97 chapitres Parashara, D1–D60, Ashtakavarga, Yogas) | USD 21 | `/parashara-report.html?cur=usd` |
| `/fr/compatibilite-amoureuse.html` | Compatibilité amoureuse Gun Milan (36 gunas, annulations Nadi/Bhakoot et Mangal Dosha) | USD 21 | `/gun-milan.html?cur=usd` |
| `/fr/yogas-prosperite.html` | Analyse des Yogas de richesse et finances (Dhana Yogas, maisons 2 et 11) | USD 11 | `/dhan-yoga-calculator.html?cur=usd` |

## Ressources et Scripts

- `fr/fr.css` : Feuille de style dédiée avec typographie claire, mode sombre et design adaptatif.
- `fr/fr.js` : Script de transmission préservant `?cur=usd`, relayant `?ref=` pour l'affiliation et activant la traduction française (`googtrans=/en/fr`).
- Balises Schema.org `Product` JSON-LD avec prix en USD.
- Balises Open Graph, liens canoniques et étiquettes `hreflang` (`fr`, `en`, `hi`, `x-default`).
