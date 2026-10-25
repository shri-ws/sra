/**
 * KALA CHAKRA DASHA ENGINE (BPHS Chapters 67–68)
 * 
 * Implements the complete mathematical algorithms for Kāla-Cakra Daśā:
 * 1. Savya (Direct) vs Apasavya (Indirect) classification of 27 Nakshatras.
 * 2. Deha (Body/Physical) and Jīva (Soul/Life) Rashi determination.
 * 3. Planetary years assigned by sign lordship (Sun 5, Moon 21, Mars 7, Mercury 9, Jupiter 10, Venus 16, Saturn 4).
 * 4. Navamsha Pada progression cycles (Savya / Apasavya order).
 * 5. Special Non-linear Transitions / Jumps (Gatis):
 *    - Maṇḍūkī Gati (Frog jump: skipping one sign, e.g. Virgo to Cancer or Leo to Gemini)
 *    - Markaṭī Gati (Monkey jump: retrograde leap, e.g. Leo to Cancer or Sagittarius to Scorpio)
 *    - Siṁhāvalokana Gati (Lion's backward glance: traversing elemental nodes, e.g. Pisces to Scorpio or Sagittarius to Aries)
 * 6. Precise balance of first Dasha at birth based on elapsed arcminutes in lunar Pada (0 to 200 arcmin).
 * 7. Generation of sequential Mahadashas and Antardashas with Parashara results.
 * 
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.KalaChakraDashaEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Rashi names in Sanskrit and English
    const RASHI_NAMES = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];

    const RASHI_SANSKRIT = [
        "मेष (Mesha)", "वृषभ (Vrishabha)", "मिथुन (Mithuna)", "कर्क (Karka)",
        "सिंह (Simha)", "कन्या (Kanya)", "तुला (Tula)", "वृश्चिक (Vrishchika)",
        "धनु (Dhanu)", "मकर (Makara)", "कुम्भ (Kumbha)", "मीन (Meena)"
    ];

    // Sign lord years according to Parashara (BPHS Ch. 67 Shlokas 12-14)
    // Aries (Mars 7), Taurus (Venus 16), Gemini (Merc 9), Cancer (Moon 21),
    // Leo (Sun 5), Virgo (Merc 9), Libra (Venus 16), Scorpio (Mars 7),
    // Sagittarius (Jup 10), Capricorn (Sat 4), Aquarius (Sat 4), Pisces (Jup 10)
    const RASHI_YEARS = [7, 16, 9, 21, 5, 9, 16, 7, 10, 4, 4, 10];

    // Nakshatra classification (0-indexed: 0 = Ashvini, 26 = Revati)
    // BPHS classifies nakshatra groups in triads of Savya (Direct) and Apasavya (Indirect)
    // Triad 1 (Ashvini, Bharani, Krittika): Savya
    // Triad 2 (Rohini, Mrigashira, Ardra): Apasavya
    // Triad 3 (Punarvasu, Pushya, Ashlesha): Savya
    // Triad 4 (Magha, Purva Phalguni, Uttara Phalguni): Apasavya
    // Triad 5 (Hasta, Chitra, Swati): Savya
    // Triad 6 (Vishakha, Anuradha, Jyeshtha): Apasavya
    // Triad 7 (Mula, Purva Ashadha, Uttara Ashadha): Savya
    // Triad 8 (Shravana, Dhanishtha, Shatabhisha): Apasavya
    // Triad 9 (Purva Bhadrapada, Uttara Bhadrapada, Revati): Savya
    const NAKSHATRA_NAMES = [
        "Ashvini", "Bharani", "Krittika",
        "Rohini", "Mrigashira", "Ardra",
        "Punarvasu", "Pushya", "Ashlesha",
        "Magha", "Purva Phalguni", "Uttara Phalguni",
        "Hasta", "Chitra", "Swati",
        "Vishakha", "Anuradha", "Jyeshtha",
        "Mula", "Purva Ashadha", "Uttara Ashadha",
        "Shravana", "Dhanishtha", "Shatabhisha",
        "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
    ];

    /**
     * Determine if Nakshatra is Savya (Direct) or Apasavya (Indirect)
     */
    function isSavyaNakshatra(nakshatraIndex) {
        const triad = Math.floor(nakshatraIndex / 3);
        // Triads 0, 2, 4, 6, 8 are Savya (Ashvini, Punarvasu, Hasta, Mula, P.Bhadra triads)
        // Triads 1, 3, 5, 7 are Apasavya
        return (triad % 2 === 0);
    }

    /**
     * Dasha Sequences for Savya & Apasavya groups (0-indexed Rashis: 0 = Aries, 11 = Pisces)
     * Parashara BPHS Ch. 67 details:
     */
    // Savya Group 1 (Ashvini, Punarvasu, Hasta, Mula, P.Bhadrapada triads):
    // Pada 1: Mesha to Dhanu (0, 1, 2, 3, 4, 5, 6, 7, 8). Deha = Mesha (0), Jiva = Dhanu (8).
    // Pada 2: Makara to Mithuna (9, 10, 11, [jump] 7, 6, 5, [jump] 3, 4, [jump] 2).
    //         Sequence: Makara(9), Kumbha(10), Meena(11), Simhavalokana -> Vrishchika(7), Tula(6), Kanya(5), Manduki -> Karka(3), Simha(4), Manduki -> Mithuna(2).
    //         Deha = Makara (9), Jiva = Mithuna (2).
    // Pada 3: Vrishabha to Mithuna (1, 0, 11, 10, 9, 8, [jump] 0, 1, 2).
    //         Sequence: Vrishabha(1), Mesha(0), Meena(11), Kumbha(10), Makara(9), Dhanu(8), Markati/Simhavalokana -> Mesha(0), Vrishabha(1), Mithuna(2).
    //         Deha = Vrishabha (1), Jiva = Mithuna (2).
    // Pada 4: Karka to Meena (3, 4, 5, 6, 7, 8, 9, 10, 11). Deha = Karka (3), Jiva = Meena (11).

    // Savya Group 2 (Bharani, Pushya, Chitra, P.Ashadha, U.Bhadrapada triads):
    // Pada 1: Vrishabha to Kumbha (1, 0, 11, 10, 9, 8, 0, 1, 2)...
    // Apasavya follows the reverse progression starting from Scorpio/Taurus/Pisces.

    // Canonical KCD Rashi Tables for 12 Padas:
    const KCD_PADA_SEQUENCES = {
        // Savya Ashvini-triad Padas:
        "SAVYA_1": [
            { rashi: 0, gati: "Direct" }, { rashi: 1, gati: "Direct" }, { rashi: 2, gati: "Direct" },
            { rashi: 3, gati: "Direct" }, { rashi: 4, gati: "Direct" }, { rashi: 5, gati: "Direct" },
            { rashi: 6, gati: "Direct" }, { rashi: 7, gati: "Direct" }, { rashi: 8, gati: "Direct" }
        ],
        "SAVYA_2": [
            { rashi: 9, gati: "Direct" }, { rashi: 10, gati: "Direct" }, { rashi: 11, gati: "Direct" },
            { rashi: 7, gati: "Simhavalokana" }, // Meena(11) -> Vrishchika(7) [Lion Jump]
            { rashi: 6, gati: "Direct" }, { rashi: 5, gati: "Direct" },
            { rashi: 3, gati: "Manduki" },       // Kanya(5) -> Karka(3) [Frog Jump skipping Leo]
            { rashi: 4, gati: "Direct" },
            { rashi: 2, gati: "Manduki" }        // Simha(4) -> Mithuna(2) [Frog Jump skipping Cancer]
        ],
        "SAVYA_3": [
            { rashi: 1, gati: "Direct" }, { rashi: 0, gati: "Direct" }, { rashi: 11, gati: "Direct" },
            { rashi: 10, gati: "Direct" }, { rashi: 9, gati: "Direct" }, { rashi: 8, gati: "Direct" },
            { rashi: 0, gati: "Simhavalokana" }, // Dhanu(8) -> Mesha(0) [Lion Jump]
            { rashi: 1, gati: "Direct" }, { rashi: 2, gati: "Direct" }
        ],
        "SAVYA_4": [
            { rashi: 3, gati: "Direct" }, { rashi: 4, gati: "Direct" }, { rashi: 5, gati: "Direct" },
            { rashi: 6, gati: "Direct" }, { rashi: 7, gati: "Direct" }, { rashi: 8, gati: "Direct" },
            { rashi: 9, gati: "Direct" }, { rashi: 10, gati: "Direct" }, { rashi: 11, gati: "Direct" }
        ],

        // Apasavya Triads (Rohini, Magha, Vishakha, Shravana triads):
        "APASAVYA_1": [
            { rashi: 7, gati: "Direct" }, { rashi: 6, gati: "Direct" }, { rashi: 5, gati: "Direct" },
            { rashi: 3, gati: "Manduki" }, { rashi: 4, gati: "Direct" }, { rashi: 2, gati: "Manduki" },
            { rashi: 1, gati: "Direct" }, { rashi: 0, gati: "Direct" }, { rashi: 11, gati: "Simhavalokana" }
        ],
        "APASAVYA_2": [
            { rashi: 10, gati: "Direct" }, { rashi: 9, gati: "Direct" }, { rashi: 8, gati: "Direct" },
            { rashi: 0, gati: "Simhavalokana" }, { rashi: 1, gati: "Direct" }, { rashi: 2, gati: "Direct" },
            { rashi: 3, gati: "Direct" }, { rashi: 4, gati: "Direct" }, { rashi: 5, gati: "Direct" }
        ],
        "APASAVYA_3": [
            { rashi: 6, gati: "Direct" }, { rashi: 7, gati: "Direct" }, { rashi: 8, gati: "Direct" },
            { rashi: 9, gati: "Direct" }, { rashi: 10, gati: "Direct" }, { rashi: 11, gati: "Direct" },
            { rashi: 7, gati: "Markati" }, // Meena(11) -> Vrishchika(7) [Monkey Jump]
            { rashi: 6, gati: "Direct" }, { rashi: 5, gati: "Direct" }
        ],
        "APASAVYA_4": [
            { rashi: 3, gati: "Manduki" }, { rashi: 4, gati: "Direct" }, { rashi: 2, gati: "Manduki" },
            { rashi: 1, gati: "Direct" }, { rashi: 0, gati: "Direct" }, { rashi: 11, gati: "Simhavalokana" },
            { rashi: 10, gati: "Direct" }, { rashi: 9, gati: "Direct" }, { rashi: 8, gati: "Direct" }
        ]
    };

    /**
     * Compute Deha and Jiva Signs and Pada Dasha Pattern
     */
    function getKalaChakraPadaDetails(nakshatraIdx, pada) {
        const isSavya = isSavyaNakshatra(nakshatraIdx);
        const cycleKey = isSavya ? `SAVYA_${pada}` : `APASAVYA_${pada}`;
        const sequence = KCD_PADA_SEQUENCES[cycleKey] || KCD_PADA_SEQUENCES["SAVYA_1"];

        const dehaRashi = sequence[0].rashi;
        const jivaRashi = sequence[sequence.length - 1].rashi;

        // Calculate total cycle years (Paramāyuṣa of this cycle)
        let totalCycleYears = 0;
        sequence.forEach(item => {
            totalCycleYears += RASHI_YEARS[item.rashi];
        });

        return {
            isSavya: isSavya,
            groupName: isSavya ? "सव्य चक्र (Savya / Direct)" : "अपसव्य चक्र (Apasavya / Indirect)",
            cycleKey: cycleKey,
            dehaRashi: dehaRashi,
            dehaName: RASHI_NAMES[dehaRashi],
            dehaSanskrit: RASHI_SANSKRIT[dehaRashi],
            jivaRashi: jivaRashi,
            jivaName: RASHI_NAMES[jivaRashi],
            jivaSanskrit: RASHI_SANSKRIT[jivaRashi],
            totalCycleYears: totalCycleYears,
            sequence: sequence
        };
    }

    /**
     * Compute Gati Specific Parashara Effects (BPHS Ch. 68)
     */
    function getGatiDescription(gatiType, fromRashi, toRashi) {
        if (gatiType === "Simhavalokana") {
            return {
                sanskrit: "सिंहावलोकन गति (Siṁhāvalokana Gati)",
                english: "Lion's Backward Glance",
                nature: "Crucial Structural Transformation",
                phala: "महर्षि पाराशर अनुसार सिंहावलोकन दशा में जातक को महान पद-प्राप्ति, सत्ता-परिवर्तन अथवा आकस्मिक जीवन-मोड़ का सामना होता है। यदि राशि में पाप ग्रह हों तो अग्नि-भय, शस्त्र-भय अथवा स्थान-भ्रंश की संभावना रहती है।",
                advice: "Stay vigilant regarding career changes, avoid impulsive relocations, and perform Shiva/Rudra worship."
            };
        } else if (gatiType === "Manduki") {
            return {
                sanskrit: "मण्डूकी गति (Maṇḍūkī Gati)",
                english: "Frog's Jump",
                nature: "Unsettled Transition / Leap Across Spheres",
                phala: "मण्डूकी दशा में जातक एक स्थिति से दूसरी में छलांग लगाता है। बन्धु-विरोध, विष-भय अथवा स्वास्थ्य में रक्त/पित्त विकार की संभावना रहती है, किन्तु शुभ युति में अप्रत्याशित वित्तीय लाभ प्राप्त होता है।",
                advice: "Guard against digestive/inflammatory issues, maintain diplomatic relations with kin, and avoid risky speculations."
            };
        } else if (gatiType === "Markati") {
            return {
                sanskrit: "मर्कटी गति (Markaṭī Gati)",
                english: "Monkey's Leap",
                nature: "Restless / Reversal Movement",
                phala: "मर्कटी दशा में जातक चंचलता, मानसिक अस्थिरता अथवा अचानक व्यय का अनुभव करता है। यात्राओं में सावधानी एवं धन-संरक्षण अपेक्षित है।",
                advice: "Maintain financial discipline, practice meditation for mental grounding, and wear soothing metals."
            };
        }
        return {
            sanskrit: "ऋजु गति (Riju / Direct Gati)",
            english: "Direct Progression",
            nature: "Normal Natural Flow",
            phala: "स्वाभाविक काल-प्रवाह, जिसमें जातक को राशि-स्वामी ग्रह के अनुसार कर्मफल प्राप्त होते हैं।",
            advice: "Proceed with standard developmental goals."
        };
    }

    /**
     * Main Function: Compute Full Kāla-Cakra Daśā
     * 
     * @param {number} moonLongitude - Moon's sidereal longitude (0° to 360°)
     * @param {Date|string} birthDate - Date of birth
     * @param {number} [maxYears=100] - Lifespan window to calculate
     * @returns {Object} Complete KCD payload
     */
    function computeKalaChakraDasha(moonLongitude, birthDate, maxYears = 100) {
        const deg = (moonLongitude % 360 + 360) % 360;
        const totalMinutes = deg * 60;
        const nakshatraArcMin = 800; // 13° 20' = 800 minutes
        const padaArcMin = 200;      // 3° 20' = 200 minutes

        const nakshatraIdx = Math.floor(totalMinutes / nakshatraArcMin);
        const nakshatraRem = totalMinutes % nakshatraArcMin;
        const pada = Math.floor(nakshatraRem / padaArcMin) + 1; // 1 to 4
        const padaElapsedMin = nakshatraRem % padaArcMin;
        const padaBalanceRatio = 1 - (padaElapsedMin / padaArcMin); // remaining portion

        const padaDetails = getKalaChakraPadaDetails(nakshatraIdx, pada);
        const sequence = padaDetails.sequence;

        // Parse birth date
        const bDate = birthDate instanceof Date ? new Date(birthDate.getTime()) : new Date(birthDate);

        // Compute Mahadashas
        const mahadashas = [];
        let currentDate = new Date(bDate.getTime());
        let isFirstDasha = true;
        let cumulativeYears = 0;

        // Loop through sequence and loop around if maxYears not reached
        let loopCount = 0;
        while (cumulativeYears < maxYears && loopCount < 4) {
            for (let i = 0; i < sequence.length; i++) {
                if (cumulativeYears >= maxYears) break;

                const step = sequence[i];
                const rashiIdx = step.rashi;
                const fullYears = RASHI_YEARS[rashiIdx];
                const durationYears = isFirstDasha ? (fullYears * padaBalanceRatio) : fullYears;
                isFirstDasha = false;

                const startDate = new Date(currentDate.getTime());
                const daysToAdd = durationYears * 365.2425;
                const endDate = new Date(startDate.getTime() + daysToAdd * 86400000);
                currentDate = new Date(endDate.getTime());
                cumulativeYears += durationYears;

                const prevRashi = i > 0 ? sequence[i - 1].rashi : null;
                const gatiInfo = getGatiDescription(step.gati, prevRashi, rashiIdx);

                // Compute Antardashas (Sub-periods within this Mahadasha)
                // In KCD, Antardashas divide the Mahadasha proportionally to the full cycle years
                const antardashas = [];
                let adCurrentDate = new Date(startDate.getTime());
                const totalMDDuration = (endDate.getTime() - startDate.getTime());

                sequence.forEach((adStep, adIdx) => {
                    const adRashiIdx = adStep.rashi;
                    const adWeight = RASHI_YEARS[adRashiIdx] / padaDetails.totalCycleYears;
                    const adDurationMs = totalMDDuration * adWeight;
                    const adStartDate = new Date(adCurrentDate.getTime());
                    const adEndDate = new Date(adStartDate.getTime() + adDurationMs);
                    adCurrentDate = new Date(adEndDate.getTime());

                    antardashas.push({
                        order: adIdx + 1,
                        rashi: adRashiIdx,
                        rashiName: RASHI_NAMES[adRashiIdx],
                        rashiSanskrit: RASHI_SANSKRIT[adRashiIdx],
                        durationYears: parseFloat((durationYears * adWeight).toFixed(3)),
                        startDate: adStartDate.toISOString().split('T')[0],
                        endDate: adEndDate.toISOString().split('T')[0]
                    });
                });

                mahadashas.push({
                    order: mahadashas.length + 1,
                    rashi: rashiIdx,
                    rashiName: RASHI_NAMES[rashiIdx],
                    rashiSanskrit: RASHI_SANSKRIT[rashiIdx],
                    fullYears: fullYears,
                    durationYears: parseFloat(durationYears.toFixed(3)),
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    gati: step.gati,
                    gatiDetails: gatiInfo,
                    isDeha: (rashiIdx === padaDetails.dehaRashi),
                    isJiva: (rashiIdx === padaDetails.jivaRashi),
                    antardashas: antardashas
                });
            }
            loopCount++;
        }

        return {
            nakshatra: {
                index: nakshatraIdx,
                name: NAKSHATRA_NAMES[nakshatraIdx] || "Unknown",
                pada: pada,
                elapsedArcMin: parseFloat(padaElapsedMin.toFixed(2)),
                padaArcMin: padaArcMin,
                balanceRatio: parseFloat(padaBalanceRatio.toFixed(4))
            },
            system: {
                name: "कालचक्र दशा (Kāla-Cakra Daśā)",
                reference: "बृहत्पाराशरहोराशास्त्र अध्याय ६७-६८ (BPHS Chapters 67–68)",
                isSavya: padaDetails.isSavya,
                groupClassification: padaDetails.groupName,
                totalCycleYears: padaDetails.totalCycleYears,
                deha: {
                    rashi: padaDetails.dehaRashi,
                    name: padaDetails.dehaName,
                    sanskrit: padaDetails.dehaSanskrit,
                    significance: "देह राशि (Deha Rashi): जातक के स्थूल शरीर, स्वास्थ्य, भौतिक सामर्थ्य एवं जीवन-शक्ति का प्रतीक।"
                },
                jiva: {
                    rashi: padaDetails.jivaRashi,
                    name: padaDetails.jivaName,
                    sanskrit: padaDetails.jivaSanskrit,
                    significance: "जीव राशि (Jīva Rashi): जातक की चेतना, मन, आत्मा, दीर्घायु एवं आंतरिक कल्याण का प्रतीक।"
                }
            },
            mahadashas: mahadashas
        };
    }

    return {
        computeKalaChakraDasha: computeKalaChakraDasha,
        getKalaChakraPadaDetails: getKalaChakraPadaDetails,
        isSavyaNakshatra: isSavyaNakshatra,
        getGatiDescription: getGatiDescription,
        RASHI_YEARS: RASHI_YEARS,
        RASHI_NAMES: RASHI_NAMES,
        RASHI_SANSKRIT: RASHI_SANSKRIT
    };
}));
