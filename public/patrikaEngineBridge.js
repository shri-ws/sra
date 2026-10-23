/**
 * Patrika Engine Bridge (patrikaEngineBridge.js)
 * ─────────────────────────────────────────────────────────────
 * Provides standalone high-precision astronomical Kundli calculation (Meeus + True Lahiri Ayanamsha)
 * and North Indian Chart SVG rendering for standalone calculators (e.g. Manglik Dosha Calculator).
 * 
 * Complies 100% with Parashara Patrika Engine calculations.
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

  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  function norm360(d) {
    return ((d % 360) + 360) % 360;
  }

  function getJD(year, month, day, hourUTC) {
    if (month <= 2) { year -= 1; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5 + hourUTC / 24.0;
  }

  function solveKepler(M, e) {
    let E = M;
    for (let iter = 0; iter < 100; iter++) {
      const dE = (E - e * Math.sin(E) - M) / (1.0 - e * Math.cos(E));
      E -= dE;
      if (Math.abs(dE) < 1e-7) break;
    }
    return E;
  }

  const ORBITAL_DATA = {
    Earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], node: [0.0, 0.0] },
    Mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], w: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081] },
    Venus: { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], w: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418] },
    Mars: { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], w: [-20.69234015, 0.44441088], node: [49.55953891, -0.29257343] },
    Jupiter: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], w: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
    Saturn: { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], w: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] }
  };

  function getPlanetHeliocentric(elements, T) {
    const a = elements.a[0] + elements.a[1] * T;
    const e = elements.e[0] + elements.e[1] * T;
    const I = (elements.I[0] + elements.I[1] * T) * DEG;
    const L = norm360(elements.L[0] + elements.L[1] * T) * DEG;
    const longPeri = norm360(elements.w[0] + elements.w[1] * T) * DEG;
    const node = norm360(elements.node[0] + elements.node[1] * T) * DEG;

    const M = norm360((L - longPeri) * RAD) * DEG;
    const E = solveKepler(M, e);

    const x_orb = a * (Math.cos(E) - e);
    const y_orb = a * Math.sqrt(1.0 - e * e) * Math.sin(E);

    const periNode = longPeri - node;
    const cosNode = Math.cos(node), sinNode = Math.sin(node);
    const cosPeri = Math.cos(periNode), sinPeri = Math.sin(periNode);
    const cosI = Math.cos(I);

    const Px = cosNode * cosPeri - sinNode * sinPeri * cosI;
    const Py = sinNode * cosPeri + cosNode * sinPeri * cosI;
    const Qx = -cosNode * sinPeri - sinNode * cosPeri * cosI;
    const Qy = -sinNode * sinPeri + cosNode * cosPeri * cosI;

    const x = x_orb * Px + y_orb * Qx;
    const y = x_orb * Py + y_orb * Qy;
    const z = (x_orb * sinPeri + y_orb * cosPeri) * Math.sin(I);

    return { x, y, z };
  }

  function getTrueLahiriAyanamsa(T) {
    const meanAyanamsa = 23.85307 + 1.396822 * T + 0.000308 * T * T;
    const Omega  = (125.04452 - 1934.136261 * T + 0.0020708 * T * T) * DEG;
    const L_sun  = (280.4665 + 36000.7698 * T) * DEG;
    const L_moon = (218.3165 + 481267.8813 * T) * DEG;

    const dPsi = -17.20 * Math.sin(Omega)
               -  1.32 * Math.sin(2 * L_sun)
               -  0.23 * Math.sin(2 * Omega)
               +  0.21 * Math.sin(2 * L_moon);

    const eps = (23.439291 - 0.0130042 * T) * DEG;
    const nutationCorrectionDeg = (dPsi / 3600.0) * Math.cos(eps);
    return meanAyanamsa + nutationCorrectionDeg;
  }

  function computeMeeusMoonLongitude(T) {
    const L_prime = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841.0;
    const D       = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + (T * T * T) / 545868.0;
    const M       = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + (T * T * T) / 24490000.0;
    const M_prime = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699.0;
    const F       = 93.2720950 + 483202.0175273 * T - 0.0036539 * T * T - (T * T * T) / 3526000.0;
    const E       = 1.0 - 0.002516 * T - 0.0000074 * T * T;

    const moonTerms = [
      [ 0,  0,  1,  0, 6288774, 0], [ 2,  0, -1,  0, 1274027, 0], [ 2,  0,  0,  0,  658314, 0],
      [ 0,  0,  2,  0,  213618, 0], [ 0,  1,  0,  0, -185116, 1], [ 0,  0,  0,  2, -114332, 0],
      [ 2,  0,  1,  0,   58793, 0], [ 2, -1, -1,  0,   57066, 1], [ 2,  0, -2,  0,   53322, 0],
      [ 2,  1, -1,  0,   45758, 1], [ 2, -1,  0,  0,  -40923, 1], [ 0,  1,  1,  0,  -34720, 1],
      [ 1,  0,  0,  0,  -30383, 0], [ 0,  1, -1,  0,   15327, 1], [ 2,  0,  0, -2,  -12528, 0],
      [ 0,  0,  1,  2,   10980, 0], [ 0,  0,  3,  0,   10675, 0], [ 4,  0, -1,  0,   10075, 0],
      [ 0,  0,  1, -2,    8548, 0], [ 2,  1,  0,  0,   -7888, 1], [ 2,  1,  1,  0,   -6766, 1],
      [ 4,  0, -2,  0,   -5163, 0], [ 2,  0, -3,  0,    4987, 0], [ 2, -1,  1,  0,    4036, 1],
      [ 2,  0,  2,  0,    3994, 0], [ 4,  0,  0,  0,    3861, 0], [ 2,  0, -1, -2,    3665, 0],
      [ 0,  0,  0,  4,   -2689, 0], [ 2, -1, -2,  0,   -2602, 1], [ 1,  0,  1,  0,    2390, 0],
      [ 3,  0, -1,  0,   -2348, 0], [ 2,  1, -2,  0,    2236, 1], [ 4,  0, -3,  0,   -2120, 0],
      [ 2,  0, -1,  2,   -2069, 0], [ 0,  2,  0,  0,    2048, 2], [ 2, -2, -1,  0,   -1773, 2],
      [ 2,  0,  1, -2,   -1595, 0], [ 4, -1, -1,  0,    1215, 1], [ 0,  0,  2, -2,   -1110, 0],
      [ 3,  0,  1,  0,    -892, 0], [ 2,  0,  0,  2,    -810, 0], [ 4, -1, -2,  0,     761, 1]
    ];

    let sumSigmaL = 0;
    for (let i = 0; i < moonTerms.length; i++) {
      const t = moonTerms[i];
      const arg = (t[0] * D + t[1] * M + t[2] * M_prime + t[3] * F) * DEG;
      let factor = t[4];
      if (t[5] === 1) factor *= E;
      else if (t[5] === 2) factor *= (E * E);
      sumSigmaL += factor * Math.sin(arg);
    }

    const A1 = (119.75 + 131.849 * T) * DEG;
    const A2 = (53.09 + 479264.290 * T) * DEG;
    const planetaryAdditions = 3958 * Math.sin(A1) + 1962 * Math.sin((L_prime - F) * DEG) + 318 * Math.sin(A2);
    const totalPerturbationDeg = (sumSigmaL + planetaryAdditions) / 1000000.0;
    return norm360(L_prime + totalPerturbationDeg);
  }

  function computeSiderealGeocentricLongitude(T, ayanamsa) {
    const earth = getPlanetHeliocentric(ORBITAL_DATA.Earth, T);
    const sunX = -earth.x;
    const sunY = -earth.y;
    const sunTrop = norm360(Math.atan2(sunY, sunX) * RAD);
    const sunSid = norm360(sunTrop - ayanamsa);

    const result = { Sun: sunSid };

    ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].forEach(pName => {
      const pHelio = getPlanetHeliocentric(ORBITAL_DATA[pName], T);
      let geoX = pHelio.x - earth.x;
      let geoY = pHelio.y - earth.y;

      if (pName === 'Jupiter' || pName === 'Saturn') {
        const M_jup = norm360(19.895 + 3034.9057 * T) * DEG;
        const M_sat = norm360(316.967 + 1222.1138 * T) * DEG;
        const deltaSat = (-0.812 * Math.sin(2 * M_sat - 5 * M_jup - 67.6 * DEG)
                          - 0.046 * Math.sin(2 * M_sat - 2 * M_jup)
                          + 0.171 * Math.sin(M_jup - M_sat - 4.4 * DEG)) * DEG;
        const deltaJup = (0.332 * Math.sin(2 * M_sat - 5 * M_jup - 67.6 * DEG)) * DEG;

        const r = Math.sqrt(geoX * geoX + geoY * geoY);
        if (pName === 'Saturn') {
          const curL = Math.atan2(geoY, geoX) + deltaSat;
          geoX = r * Math.cos(curL);
          geoY = r * Math.sin(curL);
        } else {
          const curL = Math.atan2(geoY, geoX) + deltaJup;
          geoX = r * Math.cos(curL);
          geoY = r * Math.sin(curL);
        }
      }

      const pTrop = norm360(Math.atan2(geoY, geoX) * RAD);
      result[pName] = norm360(pTrop - ayanamsa);
    });

    const moonTrop = computeMeeusMoonLongitude(T);
    result.Moon = norm360(moonTrop - ayanamsa);

    const nodeTrop = 125.04452 - 1934.136261 * T + 0.0020708 * T * T;
    result.Rahu = norm360(nodeTrop - ayanamsa);
    result.Ketu = norm360(result.Rahu + 180);

    return result;
  }

  function computeLagnaFromRAMC(RAMC, lat, eps, ayanamsa) {
    const phi = lat * DEG;
    const epsRad = eps * DEG;
    const ramcRad = RAMC * DEG;

    const ascRad = Math.atan2(
      Math.cos(ramcRad),
      -Math.sin(ramcRad) * Math.cos(epsRad) - Math.tan(phi) * Math.sin(epsRad)
    );
    const ascTrop = norm360(ascRad * RAD);
    return norm360(ascTrop - ayanamsa);
  }

  function calculateTrueSripatiCusps(RAMC, lat, eps, ayanamsa) {
    const epsRad = eps * DEG;
    const ramcRad = RAMC * DEG;

    const mcRad = Math.atan2(Math.sin(ramcRad), Math.cos(ramcRad) * Math.cos(epsRad));
    const mcSid = norm360(norm360(mcRad * RAD) - ayanamsa);
    const ascSid = computeLagnaFromRAMC(RAMC, lat, eps, ayanamsa);

    const icSid = norm360(mcSid + 180);
    const dscSid = norm360(ascSid + 180);

    const arc10_1 = norm360(ascSid - mcSid);
    const b11_mid = norm360(mcSid + arc10_1 / 3.0);
    const b12_mid = norm360(mcSid + (2.0 * arc10_1) / 3.0);

    const arc1_4 = norm360(icSid - ascSid);
    const b2_mid = norm360(ascSid + arc1_4 / 3.0);
    const b3_mid = norm360(ascSid + (2.0 * arc1_4) / 3.0);

    const arc4_7 = norm360(dscSid - icSid);
    const b5_mid = norm360(icSid + arc4_7 / 3.0);
    const b6_mid = norm360(icSid + (2.0 * arc4_7) / 3.0);

    const arc7_10 = norm360(mcSid - dscSid);
    const b8_mid = norm360(dscSid + arc7_10 / 3.0);
    const b9_mid = norm360(dscSid + (2.0 * arc7_10) / 3.0);

    const bhavaMadhyas = [
      ascSid, b2_mid, b3_mid, icSid, b5_mid, b6_mid,
      dscSid, b8_mid, b9_mid, mcSid, b11_mid, b12_mid
    ];

    const cusps = [];
    for (let i = 0; i < 12; i++) {
      const prevIdx = (i + 11) % 12;
      const nextIdx = (i + 1) % 12;
      const curMid = bhavaMadhyas[i];
      const prevMid = bhavaMadhyas[prevIdx];
      const nextMid = bhavaMadhyas[nextIdx];
      const arcPrev = norm360(curMid - prevMid);
      const sandhiStart = norm360(prevMid + arcPrev / 2.0);
      const arcNext = norm360(nextMid - curMid);
      const sandhiEnd = norm360(curMid + arcNext / 2.0);

      cusps.push({
        house: i + 1,
        sandhi1: sandhiStart,
        mid: curMid,
        sandhi2: sandhiEnd,
        midSign: Math.floor(curMid / 30),
        midDeg: curMid % 30
      });
    }
    return cusps;
  }

  function getVargaSign(sign, deg, varga) {
    const eps = 0.00001;
    switch(varga) {
      case 1: return sign;
      case 9: {
        let nStart = (sign % 3 === 0) ? sign : (sign % 3 === 1 ? (sign + 8) % 12 : (sign + 4) % 12);
        return (nStart + Math.floor((deg - eps) / (3 + 20/60))) % 12;
      }
      default: return sign;
    }
  }

  /**
   * Calculate precise Kundli object using Patrika astronomical algorithms
   */
  function calculatePatrikaPlanets(input) {
    const dateStr = input.date || input.dob || "";
    const timeStr = input.time || input.tob || "12:00";
    const lat = parseFloat(input.lat) || 28.6139;
    const lon = parseFloat(input.lon) || 77.2090;
    const tz = parseFloat(input.tz !== undefined ? input.tz : 5.5);
    const candidateName = input.name || "जातक";
    const placeName = input.city || input.place || "जन्म स्थान";

    const [y, m, d] = dateStr.split('-').map(Number);
    const [hh, mm, ss] = (timeStr + ":00").split(':').slice(0, 3).map(Number);

    const birthLocalHrs = hh + mm / 60 + (ss || 0) / 3600;
    const utcHrs = birthLocalHrs - tz;

    const JD = getJD(y, m, d, utcHrs);
    const T = (JD - 2451545.0) / 36525.0;

    const ayanamsa = getTrueLahiriAyanamsa(T);
    const eps = 23.439291 - 0.0130042 * T;

    const stepDays = 0.05;
    const pos_center = computeSiderealGeocentricLongitude(T, ayanamsa);
    const pos_plus   = computeSiderealGeocentricLongitude(T + (stepDays / 36525.0), ayanamsa);
    const pos_minus  = computeSiderealGeocentricLongitude(T - (stepDays / 36525.0), ayanamsa);

    const PLANET_NAMES = {
      Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध",
      Jupiter: "गुरु", Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु"
    };

    const planets = [];
    for (let key in PLANET_NAMES) {
      const lonCenter = pos_center[key];
      let dDiff = pos_plus[key] - pos_minus[key];
      while (dDiff < -180) dDiff += 360;
      while (dDiff > 180) dDiff -= 360;
      const speed = dDiff / (2.0 * stepDays);

      let isRetro = false;
      if (key === 'Sun' || key === 'Moon') isRetro = false;
      else if (key === 'Rahu' || key === 'Ketu') isRetro = true;
      else isRetro = (speed < 0);

      planets.push({
        id: key,
        name: PLANET_NAMES[key],
        abs: lonCenter,
        speed: (key === 'Rahu' || key === 'Ketu') ? -Math.abs(speed) : speed,
        retro: isRetro
      });
    }

    let GMST = norm360(280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T);
    const RAMC = norm360(GMST + lon);
    const sripatiBhavas = calculateTrueSripatiCusps(RAMC, lat, eps, ayanamsa);
    const lagnaAbs = sripatiBhavas[0].mid;
    const lagnaSign = Math.floor(lagnaAbs / 30);

    planets.unshift({
      id: "Lagna",
      name: "लग्न",
      abs: lagnaAbs,
      speed: 360.0,
      retro: false
    });

    planets.forEach(p => {
      p.sign = Math.floor(p.abs / 30);
      p.deg = p.abs % 30;
      p.rasiHouse = (p.sign - lagnaSign + 12) % 12 + 1;
      p.chalitHouse = p.rasiHouse;
    });

    const weekday = (Math.floor(JD + 0.5 + tz / 24.0) + 1) % 7;

    return {
      planets,
      sripatiBhavas,
      lagnaSign,
      birthDetails: {
        year: y, month: m, day: d, hour: hh, minute: mm, second: ss,
        lat, lon, tz, birthLocalHrs,
        weekday, JD, ayanamsa,
        candidateName,
        placeName
      }
    };
  }

  /**
   * Render North Indian Diamond Chart SVG with Mars (मं) Highlight
   */
  function renderNorthIndianChartSVG(calc, highlightPlanetId = 'Mars') {
    if (!calc || !calc.planets) return '';

    const lagnaObj = calc.planets.find(p => p.id === 'Lagna');
    const lagnaSign = lagnaObj ? (lagnaObj.sign !== undefined ? lagnaObj.sign : Math.floor(lagnaObj.abs / 30)) : 0;
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

    // Center coordinates for labels and planet lists per house in 340x340 viewBox
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

    // House polygon coordinates in North Indian Chart (340x340 viewBox)
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

    // In browser, render to a crisp high-res Canvas PNG to guarantee 100% fidelity in html2canvas/PDF
    if (typeof document !== 'undefined' && document.createElement) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 680;
        canvas.height = 680;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(2, 2); // 2x retina sharpness

          // Background
          ctx.fillStyle = '#fffcf6';
          ctx.fillRect(0, 0, 340, 340);

          // Mars highlight polygon fill
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

          // Outer border
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(6, 6, 328, 328);

          // Diagonals
          ctx.beginPath();
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 1.8;
          ctx.moveTo(6, 6); ctx.lineTo(334, 334);
          ctx.moveTo(334, 6); ctx.lineTo(6, 334);
          ctx.stroke();

          // Diamond
          ctx.beginPath();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2.2;
          ctx.moveTo(170, 6);
          ctx.lineTo(6, 170);
          ctx.lineTo(170, 334);
          ctx.lineTo(334, 170);
          ctx.closePath();
          ctx.stroke();

          // Rashi numbers & planets
          for (let h = 1; h <= 12; h++) {
            const c = houseCoords[h];
            const rashiNum = getHouseRashiNum(h);
            const pItems = housePlanets[h] || [];

            // Draw Rashi Number
            ctx.font = '900 12px "Plus Jakarta Sans", system-ui, sans-serif';
            ctx.fillStyle = '#b45309';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(rashiNum), c.rX, c.rY);

            // Draw Planets
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
        <!-- Outer Square Box -->
        <rect x="6" y="6" width="328" height="328" fill="#fffcf6" stroke="#b45309" stroke-width="2.5" />
        <!-- Mars House Shading Highlight -->
        ${marsHighlightsSVG}
        <!-- Diagonals -->
        <path d="M 6 6 L 334 334 M 334 6 L 6 334" stroke="#d97706" stroke-width="1.8" stroke-linecap="round" />
        <!-- Inner Diamond Lines -->
        <path d="M 170 6 L 6 170 L 170 334 L 334 170 Z" fill="none" stroke="#b45309" stroke-width="2.2" stroke-linejoin="round" />
        
        <!-- House Numbers & Planet Tags -->
        ${housesSVG}
      </svg>
    `;
  }

  /**
   * Helper to retrieve all saved Kundalis from localStorage across all keys
   */
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
    return list;
  }

  return {
    DEG,
    RAD,
    norm360,
    getJD,
    getTrueLahiriAyanamsa,
    computeSiderealGeocentricLongitude,
    computeLagnaFromRAMC,
    calculateTrueSripatiCusps,
    calculatePatrikaPlanets,
    renderNorthIndianChartSVG,
    getAllSavedKundalis
  };
});
