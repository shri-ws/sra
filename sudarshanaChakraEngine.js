/**
 * SUDARSHANA CHAKRA ENGINE (BPHS Chapter 88)
 * 
 * Implements the complete triple-concentric wheel progression and synthesis:
 * 1. Lagna Chakra (Physical/General vitality wheel)
 * 2. Candra Chakra (Emotional/Mental status wheel)
 * 3. Sūrya Chakra (Soul/Career/Public authority wheel)
 * 
 * Progressions:
 * - Varṣa (Annual Progression): 1 year per house (12-year cycle repeating).
 *   Active House = ((Age_in_years - 1) % 12) + 1
 * - Māsa (Monthly Progression): 1 month per house from the annual active house.
 * - Dina (Daily Progression): 2.5 days per house across the 30-day month.
 * 
 * Triple Concurrence Evaluation:
 * - 3-Wheel Benefic Confluence: Param Śubha (100% Supreme Auspicious)
 * - 2-Wheel Benefic Confluence: Śubha (66% High Auspiciousness)
 * - 1-Wheel Benefic / Mixed: Madhyama (33%-50% Moderate / Neutral)
 * - 2-Wheel Malefic Affliction: Aśubha (66% Challenging / Vigilance)
 * - 3-Wheel Malefic Affliction: Param Aśubha (100% Severe Crisis / Remedy Required)
 * 
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.SudarshanaChakraEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const RASHI_NAMES = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];

    const RASHI_SANSKRIT = [
        "मेष", "वृषभ", "मिथुन", "कर्क",
        "सिंह", "कन्या", "तुला", "वृश्चिक",
        "धनु", "मकर", "कुम्भ", "मीन"
    ];

    const HOUSE_PORTFOLIOS = [
        { house: 1, name: "तनु भाव (Tanu)", theme: "देह, स्वास्थ्य, प्रतिष्ठा, आत्मबल (Physical health, identity, vital force)" },
        { house: 2, name: "धन भाव (Dhana)", theme: "धन-संपत्ति, वाणी, कुटुम्ब, संचित पूंजी (Finances, liquid wealth, family support)" },
        { house: 3, name: "सहज भाव (Sahaja)", theme: "पराक्रम, भ्रातृ-सुख, साहस, लघु यात्राएं (Initiative, siblings, valor, short trips)" },
        { house: 4, name: "बन्धु भाव (Bandhu)", theme: "माता, गृह, भूमि, वाहन, मानसिक शांति (Mother, domestic peace, vehicles, land)" },
        { house: 5, name: "पुत्र भाव (Putra)", theme: "बुद्धि, विद्या, संतति, पूर्वपुण्य, मंत्र (Intellect, creativity, children, counsel)" },
        { house: 6, name: "अरि भाव (Ari)", theme: "रोग, ऋण, शत्रु, प्रतिस्पर्धा, सेवा (Health vigilance, debts, rivals, litigation)" },
        { house: 7, name: "युवति भाव (Yuvati)", theme: "विवाह, जीवनसाथी, साझेदारी, व्यापार (Spouse, marriage, trade partnerships)" },
        { house: 8, name: "रन्ध्र भाव (Randhra)", theme: "आयु, आकस्मिक परिवर्तन, गूढ़ विद्या, संकट (Longevity, occult, sudden upheavals)" },
        { house: 9, name: "धर्म भाव (Dharma)", theme: "भाग्य, गुरु, धर्म, तीर्थाटन, उच्च ज्ञान (Fortune, mentor, dharma, higher learning)" },
        { house: 10, name: "कर्म भाव (Karma)", theme: "राज्य, पद-प्रतिष्ठा, करियर, सामाजिक प्रभाव (Career, leadership, authority, reputation)" },
        { house: 11, name: "लाभ भाव (Labha)", theme: "आय, लाभ, मित्र-मण्डली, अभीष्ट सिद्धि (Gains, income, social networks, desires fulfilled)" },
        { house: 12, name: "व्यय भाव (Vyaya)", theme: "व्यय, मोक्ष, विदेश गमन, शयन सुख, त्याग (Expenditure, foreign travels, detachment, sleep)" }
    ];

    const BENEFIC_PLANETS = ["Jupiter", "Venus", "Mercury", "Moon"];
    const MALEFIC_PLANETS = ["Saturn", "Mars", "Rahu", "Ketu", "Sun"];

    /**
     * Map planets to signs (0-indexed)
     */
    function extractSignPositions(chartContext) {
        const positions = {};
        if (chartContext && chartContext.planets) {
            for (const [pName, pData] of Object.entries(chartContext.planets)) {
                const lon = (typeof pData === 'number') ? pData : (pData.longitude || 0);
                positions[pName] = Math.floor(((lon % 360 + 360) % 360) / 30);
            }
        }
        return positions;
    }

    /**
     * Get planets located in a given sign
     */
    function getPlanetsInSign(signIdx, planetPositions) {
        const occupants = [];
        for (const [pName, pSign] of Object.entries(planetPositions)) {
            if (pSign === signIdx) {
                occupants.push(pName);
            }
        }
        return occupants;
    }

    /**
     * Evaluate Auspiciousness / Score of a sign based on occupants
     */
    function scoreSign(signIdx, planetPositions) {
        const occupants = getPlanetsInSign(signIdx, planetPositions);
        let benefics = 0;
        let malefics = 0;

        occupants.forEach(p => {
            if (BENEFIC_PLANETS.includes(p)) benefics++;
            if (MALEFIC_PLANETS.includes(p)) malefics++;
        });

        let status = "Neutral";
        if (benefics > malefics) status = "Benefic";
        else if (malefics > benefics) status = "Malefic";

        return {
            signIdx: signIdx,
            signName: RASHI_NAMES[signIdx],
            signSanskrit: RASHI_SANSKRIT[signIdx],
            occupants: occupants,
            beneficsCount: benefics,
            maleficsCount: malefics,
            status: status
        };
    }

    /**
     * Main Function: Evaluate Sudarshana Chakra for a specific year of age
     * 
     * @param {number} age - Completed age + 1 (e.g. age 30 = 30th year of life)
     * @param {Object} chartContext - Must contain lagnaSign, moonSign, sunSign, and planets
     * @returns {Object} Triple wheel analysis for that year
     */
    function evaluateSudarshanaYear(age, chartContext) {
        const lagnaSign = (chartContext.lagnaSign !== undefined) 
            ? chartContext.lagnaSign 
            : Math.floor((chartContext.lagnaLongitude || 0) / 30);
        
        const moonSign = (chartContext.moonSign !== undefined)
            ? chartContext.moonSign
            : Math.floor((chartContext.moonLongitude || 0) / 30);

        const sunSign = (chartContext.sunSign !== undefined)
            ? chartContext.sunSign
            : Math.floor((chartContext.sunLongitude || 0) / 30);

        const planetPositions = extractSignPositions(chartContext);

        // Active House across all wheels (1 to 12)
        const activeHouseNum = ((age - 1) % 12) + 1;
        const houseOffset = activeHouseNum - 1;

        // Signs activated in the three wheels
        const lagnaWheelSign = (lagnaSign + houseOffset) % 12;
        const moonWheelSign = (moonSign + houseOffset) % 12;
        const sunWheelSign = (sunSign + houseOffset) % 12;

        const lagnaEval = scoreSign(lagnaWheelSign, planetPositions);
        const moonEval = scoreSign(moonWheelSign, planetPositions);
        const sunEval = scoreSign(sunWheelSign, planetPositions);

        const portfolio = HOUSE_PORTFOLIOS[activeHouseNum - 1];

        // Confluence Synthesis
        let beneficWheels = 0;
        let maleficWheels = 0;

        if (lagnaEval.status === "Benefic") beneficWheels++;
        if (lagnaEval.status === "Malefic") maleficWheels++;

        if (moonEval.status === "Benefic") beneficWheels++;
        if (moonEval.status === "Malefic") maleficWheels++;

        if (sunEval.status === "Benefic") beneficWheels++;
        if (sunEval.status === "Malefic") maleficWheels++;

        let verdict = "मध्यम फल (Madhyama / Mixed)";
        let intensityPct = 50;
        let category = "NEUTRAL";
        let detailedGuidance = "";

        if (beneficWheels === 3) {
            verdict = "परम शुभ फल (Param Śubha - 100% Supreme Auspicious)";
            intensityPct = 100;
            category = "SUPREME_BENEFIC";
            detailedGuidance = "तीनों चक्रों (लग्न, चन्द्र, सूर्य) में शुभ ग्रहों का पूर्ण सामंजस्य है। यह वर्ष जातक के लिए असाधारण उन्नति, स्वास्थ्य लाभ, वित्तीय समृद्धि एवं मान-सम्मान की वृद्धि का स्वर्णिम काल है।";
        } else if (beneficWheels === 2) {
            verdict = "शुभ फल (Śubha - 66% Highly Auspicious)";
            intensityPct = 66;
            category = "BENEFIC";
            detailedGuidance = "दो चक्रों में शुभ प्रभाव एवं एक में तटस्थता/सामान्य स्थिति। मुख्य उद्यमों में सफलता, पारिवारिक सहयोग और मानसिक शांति का समय है।";
        } else if (maleficWheels === 3) {
            verdict = "परम अशुभ फल (Param Aśubha - 100% Severe Challenge)";
            intensityPct = 100;
            category = "SUPREME_MALEFIC";
            detailedGuidance = "तीनों चक्रों में पाप ग्रहों का प्रभाव केन्द्रित है। यह वर्ष शारीरिक स्वास्थ्य, मानसिक तनाव, विवाद एवं वित्तीय जोखिमों से अत्यधिक सतर्कता की मांग करता है। पाराशर निर्देशित शान्ति आवश्यक है।";
        } else if (maleficWheels === 2) {
            verdict = "अशुभ फल (Aśubha - 66% Caution Advised)";
            intensityPct = 66;
            category = "MALEFIC";
            detailedGuidance = "दो चक्रों में पाप प्रभाव सक्रिय है। कार्यक्षेत्र में अनपेक्षित विलम्ब, भावनात्मक उद्वेग या स्वास्थ्य सम्बन्धी अवरोधों से सचेत रहें। जोखिम भरे निवेश टालें।";
        } else {
            detailedGuidance = "मिश्रित काल-प्रवाह। कुछ क्षेत्रों में स्वाभाविक प्रगति तथा कुछ में धैर्य एवं नियमित अनुशासन की आवश्यकता रहेगी।";
        }

        // Sub-progressions for the 12 months of this year
        const monthlyProgressions = [];
        for (let m = 1; m <= 12; m++) {
            const mHouseNum = ((activeHouseNum + m - 2) % 12) + 1;
            const mSignLagna = (lagnaSign + mHouseNum - 1) % 12;
            const mSignMoon = (moonSign + mHouseNum - 1) % 12;
            const mSignSun = (sunSign + mHouseNum - 1) % 12;

            monthlyProgressions.push({
                month: m,
                activatedHouse: mHouseNum,
                housePortfolio: HOUSE_PORTFOLIOS[mHouseNum - 1].name,
                lagnaSign: RASHI_NAMES[mSignLagna],
                moonSign: RASHI_NAMES[mSignMoon],
                sunSign: RASHI_NAMES[mSignSun]
            });
        }

        return {
            yearOfLife: age,
            activeHouse: activeHouseNum,
            housePortfolio: portfolio,
            tripleWheel: {
                lagnaChakra: {
                    level: "स्थूल देह एवं स्वास्थ्य (Physical / Lagna)",
                    activatedSign: lagnaEval.signName,
                    activatedSignSanskrit: lagnaEval.signSanskrit,
                    occupants: lagnaEval.occupants,
                    status: lagnaEval.status
                },
                chandraChakra: {
                    level: "मन, भावना एवं माता (Emotional / Chandra)",
                    activatedSign: moonEval.signName,
                    activatedSignSanskrit: moonEval.signSanskrit,
                    occupants: moonEval.occupants,
                    status: moonEval.status
                },
                suryaChakra: {
                    level: "आत्मा, सत्ता एवं करियर (Spiritual / Public / Surya)",
                    activatedSign: sunEval.signName,
                    activatedSignSanskrit: sunEval.signSanskrit,
                    occupants: sunEval.occupants,
                    status: sunEval.status
                }
            },
            concurrence: {
                verdict: verdict,
                intensityPct: intensityPct,
                category: category,
                beneficWheelsCount: beneficWheels,
                maleficWheelsCount: maleficWheels,
                guidanceHindi: detailedGuidance
            },
            monthlyProgressions: monthlyProgressions
        };
    }

    /**
     * Compute Sudarshana Progression across a full age span (e.g. age 1 to 100)
     */
    function computeSudarshanaTimeline(startAge, endAge, chartContext) {
        const timeline = [];
        for (let a = startAge; a <= endAge; a++) {
            timeline.push(evaluateSudarshanaYear(a, chartContext));
        }
        return {
            title: "सुदर्शन चक्र वर्षफल समय-सारिणी (Sudarshana Chakra Annual Progression)",
            reference: "बृहत्पाराशरहोराशास्त्र अध्याय ८८ (BPHS Chapter 88)",
            startAge: startAge,
            endAge: endAge,
            timeline: timeline
        };
    }

    return {
        evaluateSudarshanaYear: evaluateSudarshanaYear,
        computeSudarshanaTimeline: computeSudarshanaTimeline,
        HOUSE_PORTFOLIOS: HOUSE_PORTFOLIOS,
        RASHI_NAMES: RASHI_NAMES,
        RASHI_SANSKRIT: RASHI_SANSKRIT
    };
}));
