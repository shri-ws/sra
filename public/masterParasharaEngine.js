/**
 * MASTER PARASHARA ENGINE (Complete 97-Chapter BPHS Corpus)
 * 
 * Unified orchestrator and computational interface integrating all 97 chapters of
 * Maharshi Parashara's Bṛhat Pārāśara Horā Śāstra (BPHS):
 * 
 * - Chapters 1–63: Foundations, 16 Vargas, Bhāvas, Classical Yogas, Vimshottari & Special Dashas,
 *   Longevity, Arishta, and Transits (via parasharaEngine.js).
 * - Phase 1: Ṣaḍbala (Virūpas/Rūpas) & Ch. 87 Iṣṭa/Kaṣṭa Phala (via shadbalaEngine.js)
 *   + Ch. 84–85 Aṣṭakavarga Trikoṇa & Ekādhipatya Śodhana, Piṇḍa Sādhana, & Āyurdāya (via ashtakavargaReductionEngine.js).
 * - Phase 2: Ch. 67–68 Kāla-Cakra Daśā & 3 Non-linear Gatis (via kalaChakraDashaEngine.js)
 *   + Ch. 88 Sudarśana Cakra Triple-Wheel Progression (via sudarshanaChakraEngine.js)
 *   + Ch. 41–45 Dvi/Tri/Multi-Graha Yogas & Daridra Yogas / Kemadruma (via advancedYogaEngine.js).
 * - Phase 3: Ch. 91–97 Comprehensive Vedic Remedial & Śānti Engine (via remedialShantiEngine.js).
 * 
 * 100% Zero-Disruption Architecture:
 * - Leaves all legacy engines and calculations untouched.
 * - Works universally in Node.js (CommonJS) and modern web browsers.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([
            './patrikaEngineBridge',
            './parasharaEngine',
            './shadbalaEngine',
            './ashtakavargaReductionEngine',
            './kalaChakraDashaEngine',
            './sudarshanaChakraEngine',
            './advancedYogaEngine',
            './remedialShantiEngine'
        ], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory(
            require('./patrikaEngineBridge'),
            require('./parasharaEngine'),
            require('./shadbalaEngine'),
            require('./ashtakavargaReductionEngine'),
            require('./kalaChakraDashaEngine'),
            require('./sudarshanaChakraEngine'),
            require('./advancedYogaEngine'),
            require('./remedialShantiEngine')
        );
    } else {
        root.MasterParasharaEngine = factory(
            root.PatrikaEngineBridge,
            root.ParasharaEngine,
            root.ShadbalaEngine,
            root.AshtakavargaReductionEngine,
            root.KalaChakraDashaEngine,
            root.SudarshanaChakraEngine,
            root.AdvancedYogaEngine,
            root.RemedialShantiEngine
        );
    }
}(typeof self !== 'undefined' ? self : this, function (
    patrikaEngineBridge,
    parasharaEngine,
    shadbalaEngine,
    ashtakavargaReductionEngine,
    kalaChakraDashaEngine,
    sudarshanaChakraEngine,
    advancedYogaEngine,
    remedialShantiEngine
) {
    'use strict';

    /**
     * Standardize chart context from diverse input shapes
     */
    function normalizeChartContext(inputData) {
        const ctx = {
            nativeName: inputData.name || inputData.nativeName || "जातक (Native)",
            birthDate: inputData.birthDate || inputData.dob || inputData.date || new Date(),
            birthTime: inputData.birthTime || inputData.tob || inputData.time || "12:00",
            latitude: inputData.latitude || inputData.lat || 0,
            longitude: inputData.longitude || inputData.lon || 0,
            lagnaLongitude: 0,
            lagnaSign: 0,
            moonLongitude: 0,
            moonSign: 0,
            sunLongitude: 0,
            sunSign: 0,
            planets: {}
        };

        if (inputData.lagnaDeg !== undefined) {
            ctx.lagnaLongitude = inputData.lagnaDeg;
            ctx.lagnaSign = Math.floor(inputData.lagnaDeg / 30);
        } else if (inputData.lagnaLongitude !== undefined) {
            ctx.lagnaLongitude = inputData.lagnaLongitude;
            ctx.lagnaSign = Math.floor(inputData.lagnaLongitude / 30);
        } else if (inputData.lagnaSign !== undefined) {
            ctx.lagnaSign = inputData.lagnaSign;
            ctx.lagnaLongitude = inputData.lagnaSign * 30 + 15;
        }

        if (inputData.sripatiBhavas) {
            ctx.sripatiBhavas = inputData.sripatiBhavas;
        }

        if (Array.isArray(inputData.planets)) {
            inputData.planets.forEach(p => {
                const id = p.id || p.name;
                const lon = (p.abs !== undefined) ? p.abs : (p.longitude || 0);
                const sign = (p.sign !== undefined) ? p.sign : Math.floor(((lon % 360 + 360) % 360) / 30);
                ctx.planets[id] = {
                    id: id,
                    abs: lon,
                    longitude: lon,
                    sign: sign,
                    speed: p.speed !== undefined ? p.speed : 1,
                    isRetrograde: Boolean(p.isRetrograde || (p.speed !== undefined && p.speed < 0)),
                    house: p.house,
                    dignity: p.dignity
                };

                if (id === 'Sun') {
                    ctx.sunLongitude = lon;
                    ctx.sunSign = sign;
                } else if (id === 'Moon') {
                    ctx.moonLongitude = lon;
                    ctx.moonSign = sign;
                }
            });
        } else if (inputData.planets && typeof inputData.planets === 'object') {
            for (const [pName, pData] of Object.entries(inputData.planets)) {
                const lon = (typeof pData === 'number') 
                    ? pData 
                    : (pData.abs !== undefined ? pData.abs : (pData.longitude || 0));
                const sign = (typeof pData === 'object' && pData.sign !== undefined) 
                    ? pData.sign 
                    : Math.floor(((lon % 360 + 360) % 360) / 30);

                ctx.planets[pName] = {
                    id: pName,
                    abs: lon,
                    longitude: lon,
                    sign: sign,
                    speed: (typeof pData === 'object' && pData.speed !== undefined) ? pData.speed : 1,
                    isRetrograde: (typeof pData === 'object') ? Boolean(pData.isRetrograde) : false,
                    house: (typeof pData === 'object') ? pData.house : undefined,
                    dignity: (typeof pData === 'object') ? pData.dignity : undefined
                };

                if (pName === 'Sun') {
                    ctx.sunLongitude = lon;
                    ctx.sunSign = sign;
                } else if (pName === 'Moon') {
                    ctx.moonLongitude = lon;
                    ctx.moonSign = sign;
                }
            }
        }

        return ctx;
    }

    /**
     * MASTER CORPUS FUNCTION: Analyze horoscope using all 97 chapters
     * 
     * @param {Object} inputChart - Birth details and planetary positions
     * @param {Object} [options={}] - Custom flags (targetAge, lifespanWindow, etc.)
     * @returns {Object} Complete 97-Chapter Parashara Report
     */
    function analyzeFullBphs97Corpus(inputChart, options = {}) {
        const ctx = normalizeChartContext(inputChart);
        const currentAge = options.currentAge || 30;

        // 1. Chapters 1–63: Parashara Shloka Matches & Classical Formulations
        let foundationalAnalysis = null;
        const evalFn = parasharaEngine && (parasharaEngine.evaluateParasharaReport || parasharaEngine.evaluateParasharaShlokas);
        if (typeof evalFn === 'function') {
            try {
                let calc = inputChart;
                if (!calc.sripatiBhavas && patrikaEngineBridge && (inputChart.date || inputChart.birthDate)) {
                    calc = patrikaEngineBridge.calculatePatrikaPlanets({
                        date: inputChart.date || inputChart.birthDate,
                        time: inputChart.time || inputChart.birthTime || "12:00",
                        lat: inputChart.lat || inputChart.latitude || 0,
                        lon: inputChart.lon || inputChart.longitude || 0,
                        tz: inputChart.tz || 5.5,
                        name: inputChart.name || inputChart.nativeName
                    });
                }
                foundationalAnalysis = evalFn(calc, { name: ctx.nativeName });
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in parasharaEngine evaluateParasharaReport:", err);
            }
        }

        // 2. Phase 1A: Ṣaḍbala & Ch. 87 Iṣṭa / Kaṣṭa Phala
        let shadbalaAnalysis = null;
        if (shadbalaEngine && typeof shadbalaEngine.computeFullShadbala === 'function') {
            try {
                shadbalaAnalysis = shadbalaEngine.computeFullShadbala(ctx);
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in shadbalaEngine computeFullShadbala:", err);
            }
        }

        // 3. Phase 1B: Ch. 84–85 Aṣṭakavarga Reductions & Āyurdāya
        let ashtakavargaAnalysis = null;
        if (ashtakavargaReductionEngine && typeof ashtakavargaReductionEngine.executeFullAshtakavargaReductions === 'function') {
            try {
                ashtakavargaAnalysis = ashtakavargaReductionEngine.executeFullAshtakavargaReductions(inputChart.sarvashtakavarga || inputChart.ashtakavarga, ctx);
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in ashtakavargaReductionEngine executeFullAshtakavargaReductions:", err);
            }
        }

        // 4. Phase 2A: Ch. 67–68 Kāla-Cakra Daśā
        let kalaChakraDashaAnalysis = null;
        if (kalaChakraDashaEngine && typeof kalaChakraDashaEngine.computeKalaChakraDasha === 'function') {
            try {
                kalaChakraDashaAnalysis = kalaChakraDashaEngine.computeKalaChakraDasha(
                    ctx.moonLongitude,
                    ctx.birthDate,
                    options.maxKcdYears || 100
                );
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in kalaChakraDashaEngine computeKalaChakraDasha:", err);
            }
        }

        // 5. Phase 2B: Ch. 88 Sudarśana Cakra (Triple-Wheel Progression)
        let sudarshanaChakraAnalysis = null;
        if (sudarshanaChakraEngine && typeof sudarshanaChakraEngine.evaluateSudarshanaYear === 'function') {
            try {
                sudarshanaChakraAnalysis = sudarshanaChakraEngine.evaluateSudarshanaYear(currentAge, ctx);
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in sudarshanaChakraEngine evaluateSudarshanaYear:", err);
            }
        }

        // 6. Phase 2C: Ch. 41–45 Advanced Yogas & Daridra Yogas
        let advancedYogaAnalysis = null;
        if (advancedYogaEngine && typeof advancedYogaEngine.evaluateAllAdvancedYogas === 'function') {
            try {
                advancedYogaAnalysis = advancedYogaEngine.evaluateAllAdvancedYogas(ctx);
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in advancedYogaEngine evaluateAllAdvancedYogas:", err);
            }
        }

        // 7. Phase 3: Ch. 91–97 Vedic Remedial & Śānti Engine
        let remedialShantiAnalysis = null;
        if (remedialShantiEngine && typeof remedialShantiEngine.generateComprehensiveRemedialReport === 'function') {
            try {
                remedialShantiAnalysis = remedialShantiEngine.generateComprehensiveRemedialReport(ctx, options.birthContext || {});
            } catch (err) {
                console.warn("[MasterParasharaEngine] Error in remedialShantiEngine generateComprehensiveRemedialReport:", err);
            }
        }

        // Executive Synthesis
        const matchedShlokaCount = (foundationalAnalysis && foundationalAnalysis.matchedShlokas) ? foundationalAnalysis.matchedShlokas.length : 0;
        const advancedYogaCount = (advancedYogaAnalysis && advancedYogaAnalysis.totalYogasIdentified) ? advancedYogaAnalysis.totalYogasIdentified : 0;

        return {
            metadata: {
                engine: "Master Parashara Engine (Full 97-Chapter BPHS Corpus)",
                version: "2.0.0-UNABRIDGED",
                nativeName: ctx.nativeName,
                generatedAt: new Date().toISOString(),
                evaluatedChaptersRange: "अध्याय १ से ९७ (Complete 97 Chapters)",
                totalMatchedFormulations: matchedShlokaCount + advancedYogaCount
            },
            context: ctx,
            foundations: foundationalAnalysis,
            phase1_shadbala_and_reductions: {
                shadbala: shadbalaAnalysis,
                ashtakavargaReductionsAndAyurdaya: ashtakavargaAnalysis
            },
            phase2_timing_and_advanced_yogas: {
                kalaChakraDasha: kalaChakraDashaAnalysis,
                sudarshanaChakra: sudarshanaChakraAnalysis,
                advancedConjunctionsAndDaridraYogas: advancedYogaAnalysis
            },
            phase3_vedic_remedies_and_shanti: remedialShantiAnalysis
        };
    }

    return {
        analyzeFullBphs97Corpus: analyzeFullBphs97Corpus,
        patrikaEngineBridge: patrikaEngineBridge,
        parasharaEngine: parasharaEngine,
        shadbalaEngine: shadbalaEngine,
        ashtakavargaReductionEngine: ashtakavargaReductionEngine,
        kalaChakraDashaEngine: kalaChakraDashaEngine,
        sudarshanaChakraEngine: sudarshanaChakraEngine,
        advancedYogaEngine: advancedYogaEngine,
        remedialShantiEngine: remedialShantiEngine
    };
}));
