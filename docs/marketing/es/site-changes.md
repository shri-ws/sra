# Cambios en el Sitio para Visitantes Hispanohablantes (rama `claude/mkt-spanish-340bfc`)

Estado: implementado en rama de worktree, no enviado a remoto.

## Páginas Creadas en `es/`

Dirigidas a España, México, Latinoamérica y el público hispano de EE. UU.:

| Página | Servicio / Enfoque | Precio | Enlace destino |
|---|---|---|---|
| `/es/` | Página principal de presentación con los 3 informes en español | — | Enlaces a páginas inferiores |
| `/es/carta-natal-vedica.html` | Carta natal védica completa (97 capítulos Parashara, D1–D60, Ashtakavarga, Yogas) | USD 21 | `/parashara-report.html?cur=usd` |
| `/es/compatibilidad-matrimonio.html` | Compatibilidad de pareja Gun Milan (36 gunas, excepciones Nadi/Bhakoot y Mangal Dosha) | USD 21 | `/gun-milan.html?cur=usd` |
| `/es/yogas-de-prosperidad.html` | Análisis de Yogas de prosperidad y finanzas (Dhana Yogas, casas 2 y 11) | USD 11 | `/dhan-yoga-calculator.html?cur=usd` |

## Recursos y Scripts

- `es/es.css`: Estilo visual limpio y tipográfico compatible con modo oscuro.
- `es/es.js`: Script de redirección que mantiene `?cur=usd`, traslada `?ref=` de afiliados y activa la traducción al español (`googtrans=/en/es`).
- Marcado Schema.org `Product` JSON-LD con precios en USD en todas las páginas.
- Metadatos Open Graph, enlaces canónicos y etiquetas `hreflang` (`es`, `en`, `hi`, `x-default`).
