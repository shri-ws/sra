/**
 * Patrika Engine Bridge (patrikaEngineBridge.js)
 * ─────────────────────────────────────────────────────────────
 * Canonical Bridge to SRA Parashara Canonical Engine Microservice
 * Standard: Swiss Ephemeris (Astrodienst), JPL DE431 आधारित
 * Ayanamsha: True Chitra Paksha (Lahiri, Spica @ 180°00'00.000")
 * Nodes: Mean Rahu & Antipodal Mean Ketu (180° exact)
 * Houses: Sripati Bhava-Chalit (Porphyry Cusps with Sandhis as Midpoints)
 * Sunrise: Center of Solar Disc with Atmospheric Refraction (BIT_DISC_CENTER)
 * Vimshottari Solar Year: 365.25 days
 * 
 * Strict Zero-Meeus policy: Offline fallback to low-precision client Meeus is eliminated.
 * Microservice failure raises an explicit, transparent error banner.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    const exp = factory();
    module.exports = exp;
    if (typeof root !== 'undefined') root.PatrikaEngineBridge = exp;
    if (typeof global !== 'undefined') global.PatrikaEngineBridge = exp;
  } else {
    root.PatrikaEngineBridge = factory();
  }
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this), function() {
  'use strict';

  /**
   * Node.js Synchronous execution bridge for test runners (mocha, jest, node scripts)
   */
  function calculateCanonicalSyncNode(input) {
    const cp = require('child_process');
    const path = require('path');
    const pythonBin = path.join(__dirname, '.venv', 'bin', 'python');

    const pyCode = `import json, sys
from parashara_canonical_engine import calculate_canonical_chart, parse_date_time
inp = json.loads(sys.argv[1])
d = inp.get("date") or inp.get("dob")
t = inp.get("time") or inp.get("tob")
y, m, day, hh, mm, ss = parse_date_time(inp.get("year"), inp.get("month"), inp.get("day"), inp.get("hour"), inp.get("minute"), inp.get("second"), d, t)
c_name = inp.get("candidateName") or inp.get("name") or "जातक"
c_place = inp.get("placeName") or inp.get("city") or inp.get("place") or "जन्म स्थान"
tz_val = float(inp["tz"]) if "tz" in inp and inp["tz"] is not None else None
res = calculate_canonical_chart(y, m, day, hh, mm, ss, lat=float(inp.get("lat", 28.6139)), lon=float(inp.get("lon", 77.2090)), tz=tz_val, name=c_name, place=c_place)
print(json.dumps(res))`;

    const spawnProc = cp.spawnSync(pythonBin, ['-c', pyCode, JSON.stringify(input)], {
      encoding: 'utf8',
      maxBuffer: 15 * 1024 * 1024
    });

    if (spawnProc.error) throw spawnProc.error;
    if (spawnProc.status !== 0) {
      throw new Error("Python Canonical Engine Error: " + spawnProc.stderr);
    }
    return JSON.parse(spawnProc.stdout);
  }

  function calculateBatchSyncNode(batchInput) {
    const cp = require('child_process');
    const path = require('path');
    const pythonBin = path.join(__dirname, '.venv', 'bin', 'python');

    const pyCode = `import json, sys
from parashara_canonical_engine import calculate_canonical_chart, parse_date_time
raw = json.loads(sys.argv[1])
items = raw if isinstance(raw, list) else raw.get("items", [])
if not items and isinstance(raw, dict) and "dates" in raw:
    time_str = raw.get("time") or "12:00:00"
    lat = float(raw.get("lat", 28.6139))
    lon = float(raw.get("lon", 77.2090))
    tz = float(raw["tz"]) if "tz" in raw and raw["tz"] is not None else None
    items = [{"date": d, "time": time_str, "lat": lat, "lon": lon, "tz": tz} for d in raw["dates"]]

results = []
for itm in items:
    y, m, day, hh, mm, ss = parse_date_time(date_str=itm.get("date"), time_str=itm.get("time", "12:00:00"))
    lat = float(itm.get("lat", 28.6139))
    lon = float(itm.get("lon", 77.2090))
    tz = float(itm["tz"]) if "tz" in itm and itm["tz"] is not None else None
    res = calculate_canonical_chart(y, m, day, hh, mm, ss, lat=lat, lon=lon, tz=tz)
    results.append(res)
print(json.dumps({"status": "ok", "count": len(results), "charts": results}))`;

    const spawnProc = cp.spawnSync(pythonBin, ['-c', pyCode, JSON.stringify(batchInput)], {
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024
    });

    if (spawnProc.error) throw spawnProc.error;
    if (spawnProc.status !== 0) {
      throw new Error("Python Canonical Engine Batch Error: " + spawnProc.stderr);
    }
    return JSON.parse(spawnProc.stdout);
  }

  /**
   * Main calculation function:
   * - In Node.js: returns calculated chart synchronously (or via Promise)
   * - In Browser: async wrapper making HTTP POST to /calculate
   * Strict error policy: Throws clear user-facing error on server failure. No silent Meeus fallback.
   */
  function calculatePatrikaPlanets(input, endpoint) {
    // 1. Node.js environment
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
      return calculateCanonicalSyncNode(input);
    }

    // 2. Browser environment: returns Promise
    return (async () => {
      const targetEndpoint = endpoint || (typeof window !== 'undefined' && window.SRA_CANONICAL_ENDPOINT) || '/calculate';
      try {
        const res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });

        if (!res.ok) {
          let errDetail = '';
          try {
            const errObj = await res.json();
            errDetail = errObj.detail || errObj.error || JSON.stringify(errObj);
          } catch(e) {
            errDetail = await res.text();
          }
          throw new Error(`गणना सर्वर त्रुटि (HTTP ${res.status}): ${errDetail || 'अमान्य प्रतिक्रिया'}`);
        }

        const data = await res.json();
        if (!data || !data.planets || !Array.isArray(data.planets)) {
          throw new Error("गणना सर्वर से अमान्य ग्रह स्थिति प्राप्त हुई।");
        }
        return data;
      } catch (err) {
        console.error("SRA Parashara Canonical Microservice failure:", err);
        throw new Error(
          "गणना सर्वर (Swiss Ephemeris Microservice) अनुपलब्ध है।\n" +
          "कृपया सुनिश्चित करें कि बैकएंड सर्वर सक्रिय है।\n" +
          (err.message || err)
        );
      }
    })();
  }

  /**
   * Batch calculation function for scanning ranges (e.g. 30-90 dates in Muhurta pages)
   */
  function calculateBatchPlanets(batchInput, endpoint) {
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions && process.versions.node) {
      return calculateBatchSyncNode(batchInput);
    }

    return (async () => {
      const targetEndpoint = endpoint || (typeof window !== 'undefined' && window.SRA_CANONICAL_BATCH_ENDPOINT) || '/calculate/batch';
      try {
        const payload = Array.isArray(batchInput) ? { items: batchInput } : (batchInput && batchInput.items ? batchInput : { items: [] });
        const res = await fetch(targetEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          throw new Error(`गणना सर्वर बैच त्रुटि (HTTP ${res.status})`);
        }
        return await res.json();
      } catch (err) {
        console.error("SRA Parashara Batch Microservice failure:", err);
        throw new Error(
          "गणना सर्वर (बैच) अनुपलब्ध है। कृपया सुनिश्चित करें कि बैकएंड सर्वर सक्रिय है।"
        );
      }
    })();
  }

  const calculatePatrikaPlanetsAsync = calculatePatrikaPlanets;

  /**
   * Pure mathematical divisional sign calculator (BPHS Shodashavarga mapping)
   */
  function getVargaSign(sign, deg, varga) {
    const v = parseInt(varga, 10);
    const s = parseInt(sign, 10);
    const d = Math.max(0, Math.min(29.999999, parseFloat(deg) || 0));

    switch(v) {
      case 1: return s;
      case 2:
        if (s % 2 === 0) return d < 15 ? 4 : 3;
        return d < 15 ? 3 : 4;
      case 3: {
        const dPart = Math.floor(d / 10);
        const shift = dPart === 0 ? 0 : (dPart === 1 ? 4 : 8);
        return (s + shift) % 12;
      }
      case 4:
        return (s + Math.floor(d / 7.5) * 3) % 12;
      case 7: {
        const sStart = (s % 2 === 0) ? s : (s + 6) % 12;
        return (sStart + Math.floor(d / (30/7))) % 12;
      }
      case 9: {
        let nStart = (s % 3 === 0) ? s : (s % 3 === 1 ? (s + 8) % 12 : (s + 4) % 12);
        return (nStart + Math.floor(d / (10/3))) % 12;
      }
      case 10: {
        let dsStart = (s % 2 === 0) ? s : (s + 8) % 12;
        return (dsStart + Math.floor(d / 3.0)) % 12;
      }
      case 12:
        return (s + Math.floor(d / 2.5)) % 12;
      case 16: {
        let shStart = (s % 3 === 0) ? 0 : (s % 3 === 1 ? 4 : 8);
        return (shStart + Math.floor(d / 1.875)) % 12;
      }
      case 20: {
        let vStart = (s % 3 === 0) ? 0 : (s % 3 === 1 ? 8 : 4);
        return (vStart + Math.floor(d / 1.5)) % 12;
      }
      case 24: {
        let sidStart = (s % 2 === 0) ? 4 : 3;
        return (sidStart + Math.floor(d / 1.25)) % 12;
      }
      case 27:
        return ((s % 4) * 3 + Math.floor(d / (30/27))) % 12;
      case 30:
        if (s % 2 === 0) {
          if (d < 5) return 0; if (d < 10) return 10; if (d < 18) return 8; if (d < 25) return 2; return 6;
        } else {
          if (d < 5) return 1; if (d < 12) return 5; if (d < 20) return 11; if (d < 25) return 9; return 7;
        }
      case 40:
        return (((s % 2 === 0) ? 0 : 6) + Math.floor(d / 0.75)) % 12;
      case 45: {
        let akStart = (s % 3 === 0) ? 0 : (s % 3 === 1 ? 4 : 8);
        return (akStart + Math.floor(d / (30/45))) % 12;
      }
      case 60:
        return (s + Math.floor(d * 2)) % 12;
      default: return s;
    }
  }

  /**
   * Render North Indian Diamond Chart SVG with Mars (मं) Highlight
   */
  function renderNorthIndianChartSVG(calc, highlightPlanetId = 'Mars') {
    if (!calc || !calc.planets) return '';

    const lagnaObj = calc.planets.find(p => p.id === 'Lagna');
    const lagnaSign = lagnaObj ? (lagnaObj.sign !== undefined ? lagnaObj.sign : Math.floor(lagnaObj.abs / 30)) : (calc.lagnaSign !== undefined ? calc.lagnaSign : 0);
    const lagnaRashiNum = lagnaSign + 1;

    const housePlanets = {};
    for (let h = 1; h <= 12; h++) housePlanets[h] = [];

    const shortMap = {
      Sun: "सू", Moon: "चं", Mars: "मं", Mercury: "बु",
      Jupiter: "गु", Venus: "शु", Saturn: "श", Rahu: "रा", Ketu: "के"
    };

    housePlanets[1].push({ text: "लग्न", isMars: false, id: "Lagna" });

    calc.planets.forEach(p => {
      if (p.id === 'Lagna') return;
      const h = p.rasiHouse || ((p.sign - lagnaSign + 12) % 12 + 1);
      const tag = shortMap[p.id] || p.name;
      const isMars = (p.id === 'Mars');
      const text = `${tag}${p.retro ? '*' : ''}`;
      if (housePlanets[h]) {
        housePlanets[h].push({ text, isMars, id: p.id, deg: p.deg });
      }
    });

    const getHouseRashiNum = (h) => ((lagnaRashiNum + h - 2) % 12) + 1;

    const houseCoords = {
      1:  { rX: 170, rY: 95,  pX: 170, pY: 135 },
      2:  { rX: 85,  rY: 52,  pX: 85,  pY: 76  },
      3:  { rX: 52,  rY: 85,  pX: 52,  pY: 110 },
      4:  { rX: 95,  rY: 170, pX: 130, pY: 170 },
      5:  { rX: 52,  rY: 255, pX: 52,  pY: 280 },
      6:  { rX: 85,  rY: 288, pX: 85,  pY: 312 },
      7:  { rX: 170, rY: 245, pX: 170, pY: 270 },
      8:  { rX: 255, rY: 288, pX: 255, pY: 312 },
      9:  { rX: 288, rY: 255, pX: 288, pY: 280 },
      10: { rX: 245, rY: 170, pX: 210, pY: 170 },
      11: { rX: 288, rY: 85,  pX: 288, pY: 110 },
      12: { rX: 255, rY: 52,  pX: 255, pY: 76  }
    };

    const housePolys = {
      1:  "170,6 88,88 170,170 252,88",
      2:  "6,6 170,6 88,88",
      3:  "6,6 6,170 88,88",
      4:  "6,170 88,88 170,170 88,252",
      5:  "6,334 6,170 88,252",
      6:  "6,334 170,334 88,252",
      7:  "170,334 88,252 170,170 252,252",
      8:  "334,334 170,334 252,252",
      9:  "334,334 334,170 252,252",
      10: "334,170 252,88 170,170 252,252",
      11: "334,6 334,170 252,88",
      12: "334,6 170,6 252,88"
    };

    let marsHighlightsSVG = "";
    for (let h = 1; h <= 12; h++) {
      const pItems = housePlanets[h] || [];
      if (pItems.some(x => x.isMars)) {
        marsHighlightsSVG += `<polygon points="${housePolys[h]}" fill="rgba(239, 68, 68, 0.16)" stroke="#dc2626" stroke-width="2.2" />`;
      }
    }

    if (typeof document !== 'undefined' && document.createElement) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 680;
        canvas.height = 680;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2);

          ctx.fillStyle = '#fffcf6';
          ctx.fillRect(0, 0, 340, 340);

          for (let h = 1; h <= 12; h++) {
            const pItems = housePlanets[h] || [];
            if (pItems.some(x => x.isMars)) {
              const polyStr = housePolys[h];
              const pts = polyStr.split(' ').map(pair => pair.split(',').map(Number));
              ctx.beginPath();
              ctx.moveTo(pts[0][0], pts[0][1]);
              for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
              ctx.closePath();
              ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
              ctx.fill();
              ctx.strokeStyle = '#dc2626';
              ctx.lineWidth = 2.2;
              ctx.stroke();
            }
          }

          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(6, 6, 328, 328);

          ctx.beginPath();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.8;
          ctx.moveTo(6, 6); ctx.lineTo(334, 334);
          ctx.moveTo(334, 6); ctx.lineTo(6, 334);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2.2;
          ctx.moveTo(170, 6);
          ctx.lineTo(6, 170);
          ctx.lineTo(170, 334);
          ctx.lineTo(334, 170);
          ctx.closePath();
          ctx.stroke();

          for (let h = 1; h <= 12; h++) {
            const c = houseCoords[h];
            const rashiNum = getHouseRashiNum(h);
            const pItems = housePlanets[h] || [];

            ctx.font = '900 12px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.fillStyle = '#b45309';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(rashiNum), c.rX, c.rY);

            if (pItems.length > 0) {
              const pStr = pItems.map(x => (x.isMars ? '♂' : '') + x.text).join(' ');
              ctx.font = 'bold 11px "Noto Sans Devanagari", "Kohinoor Devanagari", "Devanagari Sangam MN", system-ui, sans-serif';
              ctx.fillStyle = pItems.some(x => x.isMars) ? '#b91c1c' : '#334155';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(pStr, c.pX, c.pY);
            }
          }

          const pngData = canvas.toDataURL('image/png');
          return `<img src="${pngData}" style="width:100%; max-width:280px; display:block; margin:6px auto; border-radius:12px; box-shadow:0 4px 16px rgba(180,83,9,0.12);" alt="D1 जन्म लग्न चक्र" />`;
        }
      } catch (canvasErr) {
        console.warn("Canvas chart render fallback to SVG:", canvasErr);
      }
    }

    let housesSVG = "";
    for (let h = 1; h <= 12; h++) {
      const c = houseCoords[h];
      const rashiNum = getHouseRashiNum(h);
      const pItems = housePlanets[h] || [];

      let pSvg = "";
      if (pItems.length > 0) {
        pSvg = pItems.map(item => {
          if (item.isMars) {
            return `<tspan fill="#b91c1c" font-weight="900" font-size="12">♂${item.text}</tspan>`;
          }
          return `<tspan fill="#334155" font-weight="700">${item.text}</tspan>`;
        }).join(" ");
      }

      housesSVG += `
        <text x="${c.rX}" y="${c.rY}" font-size="13" font-weight="900" fill="#b45309" text-anchor="middle" dy="0.35em" font-family="'Plus Jakarta Sans', system-ui, sans-serif">${rashiNum}</text>
        <text x="${c.pX}" y="${c.pY}" font-size="11.5" font-weight="bold" text-anchor="middle" dy="0.35em" font-family="'Noto Sans Devanagari', 'Kohinoor Devanagari', 'Devanagari Sangam MN', system-ui, sans-serif">${pSvg}</text>
      `;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="340" height="340" viewBox="0 0 340 340" style="width:100%; max-width:320px; background:#fffcf6; border:2.5px solid #b45309; border-radius:14px; margin:8px auto; display:block; box-shadow:0 4px 16px rgba(180,83,9,0.12);">
        <rect x="6" y="6" width="328" height="328" fill="#fffcf6" stroke="#b45309" stroke-width="2.5" />
        ${marsHighlightsSVG}
        <path d="M 6 6 L 334 334 M 334 6 L 6 334" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" />
        <path d="M 170 6 L 6 170 L 170 334 L 334 170 Z" fill="none" stroke="#b45309" stroke-width="2.2" stroke-linejoin="round" />
        ${housesSVG}
      </svg>
    `;
  }

  function getAllSavedKundalis() {
    const list = [];
    if (typeof localStorage === 'undefined') return list;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sra_saved_kundalis_') || key === 'sra_saved_kundalis')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              arr.forEach(item => {
                if (item && item.name && item.date && !list.some(x => x.name === item.name && x.date === item.date && x.time === item.time)) {
                  list.push(item);
                }
              });
            }
          }
        }
      }
    } catch(e) {
      console.warn("getAllSavedKundalis note:", e);
    }
    // Newest first: the report pages open the first entry, which must be the
    // kundali the visitor just generated on patrika.html (savedTimestamp is set on every save).
    list.sort((a, b) => (b.savedTimestamp || 0) - (a.savedTimestamp || 0));
    return list;
  }

  return {
    calculatePatrikaPlanets,
    calculatePatrikaPlanetsAsync,
    calculateBatchPlanets,
    getVargaSign,
    renderNorthIndianChartSVG,
    getAllSavedKundalis
  };
});
