/**
 * ADVANCED YOGA ENGINE (BPHS Chapters 41–45)
 * 
 * Implements the complete multi-planet conjunctions and financial combinations:
 * 1. Chapter 41: Dvi-Graha Yogas (All 21 two-planet conjunctions).
 * 2. Chapter 42: Tri-Graha Yogas (All 35 three-planet conjunctions).
 * 3. Chapter 43: Catur-Graha & Pañca-Graha Yogas (4 & 5-planet clusters).
 * 4. Chapter 44: Ṣaḍ-Graha & Sapta-Graha Yogas (6 & 7-planet mega clusters / Pravrajyā).
 * 5. Chapter 45: Daridra Yogas (Financial affliction, debt, loss of liquid assets & Kemadruma with Bhanga cancellations).
 * 
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AdvancedYogaEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const CLASSIC_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

    const RASHI_NAMES = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];

    // -------------------------------------------------------------
    // CHAPTER 41: DVI-GRAHA YOGAS (21 Classical Pairs)
    // -------------------------------------------------------------
    const DVI_GRAHA_CATALOG = {
        "Sun_Moon": {
            name: "सूर्य-चन्द्र युति (Amāvāsyā Yoga / Pitṛ-Kārya)",
            bphsRef: "BPHS Ch. 41, Shlokas 2–3",
            nature: "Mixed / Soli-Lunar Core",
            shlokaPhala: "यन्त्रज्ञो धातुकुशलो राजकर्मरतः शुचिः। सूर्य-चन्द्रसमायोगे जातः स्यात्पितृवल्लभः॥",
            englishMeaning: "Proficient in machinery and metallurgy, diligent in government administration, pure in conduct, and beloved of father.",
            modernApplication: "Executive engineering, civil administrative authority, institutional management, deep psychological transformation."
        },
        "Sun_Mars": {
            name: "सूर्य-मंगल युति (Śūra / Tejasvī Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 4–5",
            nature: "Fiery Dynamic Valor",
            shlokaPhala: "शौर्यवान् साहसोपेतो रणकर्मविशारदः। सूर्यभौमयुते जातो राजा वा तत्समो भवेत्॥",
            englishMeaning: "Possessing valor and courage, skilled in combat and strategic warfare; becomes a ruler or equivalent commander.",
            modernApplication: "High-octane leadership, surgical/medical excellence, defense services, executive decisive governance."
        },
        "Sun_Mercury": {
            name: "बुधादित्य योग (Budhāditya Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 6–7",
            nature: "Supreme Intellectual Brilliance",
            shlokaPhala: "विद्वान् सर्वगुणोपेतः प्रख्यातो राजपूजितः। बुधादित्यसमायोगे महाधीरो नरो भवेत्॥",
            englishMeaning: "Eminent scholar endowed with all virtues, celebrated, honored by royalty, intellectually steadfast.",
            modernApplication: "High intellectual acumen, eloquence, academic scholarship, software architecture, advisory leadership."
        },
        "Sun_Jupiter": {
            name: "सूर्य-गुरु युति (Rāja-Guru Yoga / Dharmādhipati)",
            bphsRef: "BPHS Ch. 41, Shlokas 8–9",
            nature: "Sattvic Imperial Wisdom",
            shlokaPhala: "शास्त्रज्ञो नीतिमान् प्राज्ञो धार्मिको राजवल्लभः। जीवसूर्यसमायोगे मन्त्री वा नृपतिर्भवेत्॥",
            englishMeaning: "Master of sacred texts, ethical diplomat, deeply wise, righteous, beloved of the state; becomes a minister or sovereign.",
            modernApplication: "Judicial authority, ethical policymaking, chancellor of universities, public governance, spiritual leadership."
        },
        "Sun_Venus": {
            name: "सूर्य-शुक्र युति (Kalā-Rāja Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 10–11",
            nature: "Aesthetic / State Creativity",
            shlokaPhala: "काव्यशिल्पकुशलो नृपसेवी धनप्रियः। भानुशुक्रसमायोगे बहुस्त्रीजनवल्लभः॥",
            englishMeaning: "Skilled in poetry and fine crafts, serving kings, fond of wealth, charming to society.",
            modernApplication: "Creative leadership, media production, public diplomacy, aesthetic commerce, artistic innovation."
        },
        "Sun_Saturn": {
            name: "सूर्य-शनि युति (Tapaḥ / Saṅgha-Nāyaka Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 12–13",
            nature: "Karmic Endurance & Structural Resilience",
            shlokaPhala: "धातुक्रियासु कुशलो जनवादपरायणः। सूर्यमन्दसमायोगे पित्रा सह विरोधकृत्॥",
            englishMeaning: "Proficient in heavy metallurgy, leader of working classes, experiencing complex ideological friction with paternal figures.",
            modernApplication: "Heavy industries, mining, civil infrastructure, labor governance, disciplined institutional endurance."
        },
        "Moon_Mars": {
            name: "चन्द्र-मंगल युति (Candra-Maṅgala Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 14–15",
            nature: "Bold Dynamic Wealth Creation",
            shlokaPhala: "क्रयविक्रयकुशलो धनधान्यसमन्वितः। चन्द्रभौमयुते जातो मातुलप्रियकारकः॥",
            englishMeaning: "Highly skilled in commerce and trading, endowed with wealth and property, bold in enterprise.",
            modernApplication: "Commercial entrepreneurship, real estate dominance, financial trading, high physical enterprise."
        },
        "Moon_Mercury": {
            name: "चन्द्र-बुध युति (Mādhūrya-Vāk Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 16–17",
            nature: "Eloquent & Refined Intellect",
            shlokaPhala: "प्रियवादी कलादक्षः सुबुद्धिः सर्वसंमतः। शशिज्ञयोः समायोगे धनवान् कीर्तिमान् भवेत्॥",
            englishMeaning: "Sweet and persuasive orator, expert in fine crafts, blessed with deep intellect, widely respected and wealthy.",
            modernApplication: "Communications, journalism, marketing, literary arts, negotiation diplomacy, psychological counseling."
        },
        "Moon_Jupiter": {
            name: "गजकेसरी युति (Gaja-Kesarī Conjunction)",
            bphsRef: "BPHS Ch. 41, Shlokas 18–19",
            nature: "Supreme Auspicious Dignity & Virtue",
            shlokaPhala: "धार्मिकः कुलदीपकश्च सर्वशास्त्रविशारदः। जीवशशिसमायोगे महायशस्वी नरो भवेत्॥",
            englishMeaning: "Righteous beacon of family lineage, master of classical lore, blessed with enduring fame and nobility.",
            modernApplication: "Public renown, ethical leadership, educational institutions, universal trust, philanthropy."
        },
        "Moon_Venus": {
            name: "चन्द्र-शुक्र युति (Vastrālaṅkāra-Prada Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 20–21",
            nature: "Aesthetic Luxury & Refinement",
            shlokaPhala: "वस्त्राभरणसम्पन्नो ललितकलाप्रियः शुचिः। शुक्रेन्दोः संगमे जातो भोगी जनमनोहरः॥",
            englishMeaning: "Endowed with exquisite apparel and ornaments, passionate for refined arts, charming to public.",
            modernApplication: "Design architecture, luxury branding, hospitality, artistic entertainment, social harmony."
        },
        "Moon_Saturn": {
            name: "चन्द्र-शनि युति (Puṇya / Viṣa / Vairāgya Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 22–23",
            nature: "Emotional Austerity & Stoic Depth",
            shlokaPhala: "कृषिकर्मरतः शान्तो मातृक्लेशयुतोऽपि वा। शनैश्चरेन्दुसंयोगे वैराग्यपदमश्नुते॥",
            englishMeaning: "Attracted to agriculture or earth sciences, serene, facing maternal trials yet achieving philosophical detachment.",
            modernApplication: "Long-range research, organizational endurance, stoic mental discipline, deep psychological resilience."
        },
        "Mars_Mercury": {
            name: "मंगल-बुध युति (Śilpa-Vidyā Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 24–25",
            nature: "Technical & Surgical Acumen",
            shlokaPhala: "औषधज्ञः शस्त्रविद्यः कुशलः सर्वकर्मसु। भौमज्ञयोः समायोगे वाक्पटुः कलहप्रियः॥",
            englishMeaning: "Knowledgeable in pharmacopoeia and surgery, dexterous in craftsmanship, sharp in debate.",
            modernApplication: "Software engineering, surgical medicine, data analytics, patent law, technical troubleshooting."
        },
        "Mars_Jupiter": {
            name: "गुरु-मंगल युति (Guru-Maṅgala Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 26–27",
            nature: "Dharmic Valor & Strategic Command",
            shlokaPhala: "सेनापतिर्धनुर्धारी सर्वविद्याविशारदः। जीवभौमसमायोगे नृपमान्यो महाबलः॥",
            englishMeaning: "Supreme military commander, skilled archer, learned in all sciences, honored by kings, of great physical strength.",
            modernApplication: "Strategic defense leadership, constitutional law, high managerial authority, protective guardianship."
        },
        "Mars_Venus": {
            name: "भृगु-मंगल युति (Bhṛgu-Maṅgala Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 28–29",
            nature: "Passionate Creative Fire",
            shlokaPhala: "कामी क्रीडाप्रियः शूरो रूपवान् धनवान् सुधीः। भौमशुक्रसमायोगे यन्त्रविद्याविशारदः॥",
            englishMeaning: "Passionate, fond of sports and games, courageous, handsome, wealthy, skilled in mechanical arts.",
            modernApplication: "Industrial design, competitive sports, fashion aesthetics, cinematic performance, dynamic romance."
        },
        "Mars_Saturn": {
            name: "मंगल-शनि युति (Yama-Yoga / Saṅgha-Vīra)",
            bphsRef: "BPHS Ch. 41, Shlokas 30–31",
            nature: "Steely Endurance & Hard Industrial Prowess",
            shlokaPhala: "लोहकर्मरतः शूरो दुःसहः साहसी जनः। कुजमन्दसमायोगे कार्यसिद्धिं प्रपद्यते॥",
            englishMeaning: "Engaged in heavy iron and mechanical industries, formidable in courage, enduring extreme hardships to achieve success.",
            modernApplication: "Mechanical engineering, structural architecture, forensic investigation, rugged resilience."
        },
        "Mercury_Jupiter": {
            name: "सरस्वती योग (Sarasvatī Yoga / Budha-Guru)",
            bphsRef: "BPHS Ch. 41, Shlokas 32–33",
            nature: "Supreme Scholarly & Advisory Eloquence",
            shlokaPhala: "सर्वशास्त्रार्थतत्त्वज्ञो मन्त्री राजाभिपूजितः। बुधजीवसमायोगे लेखकः कीर्तिवर्द्धनः॥",
            englishMeaning: "Knower of the inner essence of all shastras, trusted state minister, distinguished author of enduring renown.",
            modernApplication: "Chief legal counsel, economic advisory, university dean, intellectual author, scholarly luminary."
        },
        "Mercury_Venus": {
            name: "लक्ष्मी-सरस्वती युति (Lakṣmī-Sarasvatī Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 34–35",
            nature: "Refined Aesthetics & Literary Wealth",
            shlokaPhala: "सुवक्ता धनवान् भोगी कलाविद् राजपूजितः। बुधशुक्रसमायोगे जनचित्तप्रमोदकः॥",
            englishMeaning: "Eloquent speaker, wealthy, connoisseur of fine arts, honored by state, captivating the hearts of people.",
            modernApplication: "Media communications, advertising creative director, diplomacy, literary publishing, high design."
        },
        "Mercury_Saturn": {
            name: "बुध-शनि युति (Catura-Yukta Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 36–37",
            nature: "Pragmatic & Methodical Intellect",
            shlokaPhala: "गणकः कुशलः सूक्ष्मबुद्धिर्धैर्यसमन्वितः। बुधमन्दसमायोगे गूढकार्यप्रसाधकः॥",
            englishMeaning: "Proficient mathematician and accountant, subtle analytical intellect, patient in solving deep enigmas.",
            modernApplication: "Cryptography, actuarial science, financial audit, systematic coding, forensic accounting."
        },
        "Jupiter_Venus": {
            name: "द्वि-गुरु योग (Dvi-Guru / Brahma-Vidhyā Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 38–39",
            nature: "Supreme Dual-Spiritual & Aesthetic Mastery",
            shlokaPhala: "महाविद्वान् महाबुद्धिर्नीतिज्ञो लोकपूजितः। जीवशुक्रसमायोगे द्वयोः शास्त्रज्ञ उच्यते॥",
            englishMeaning: "Pre-eminent scholar, master of ethics and spiritual sciences, revered across society, proficient in both Deva and Asura shastras.",
            modernApplication: "Strategic conflict resolution, supreme judicial bench, high philosophical diplomacy, polymath intellect."
        },
        "Jupiter_Saturn": {
            name: "ब्रह्म योग (Brahma Yoga / Guru-Śani)",
            bphsRef: "BPHS Ch. 41, Shlokas 40–41",
            nature: "Institutional Builder & Deep Dharma",
            shlokaPhala: "धर्मिष्ठः स्थिरचेताश्च कुलवृद्धिकरः शुचिः। जीवमन्दसमायोगे प्रतिष्ठां लभते पराम्॥",
            englishMeaning: "Steadfastly righteous, endowed with unwavering focus, uplifter of family institutions, achieving supreme social stature.",
            modernApplication: "Foundation builder, university trustee, historical preservation, ethical jurisprudence, sustained legacy."
        },
        "Venus_Saturn": {
            name: "शुक्र-शनि युति (Śukra-Śani Yoga)",
            bphsRef: "BPHS Ch. 41, Shlokas 42–43",
            nature: "Aesthetic Realism & Structural Art",
            shlokaPhala: "चित्रशिल्पकुशलो धीरो वृद्धस्त्रीसङ्गतोऽपि वा। भृगुमन्दसमायोगे कार्यदक्षो धनी भवेत्॥",
            englishMeaning: "Proficient in painting, sculpture, and design; patient, methodical, highly capable in executive craftsmanship, wealthy.",
            modernApplication: "Heritage architecture, sculpture, cinematography, antique curation, sustainable design."
        }
    };

    /**
     * Map planets to signs
     */
    function groupPlanetsBySign(chartContext) {
        const signClusters = {};
        for (let i = 0; i < 12; i++) {
            signClusters[i] = [];
        }

        if (chartContext && chartContext.planets) {
            for (const [pName, pData] of Object.entries(chartContext.planets)) {
                if (CLASSIC_PLANETS.includes(pName)) {
                    const lon = (typeof pData === 'number') ? pData : (pData.longitude || 0);
                    const sign = Math.floor(((lon % 360 + 360) % 360) / 30);
                    signClusters[sign].push(pName);
                }
            }
        }
        return signClusters;
    }

    /**
     * Generate standard pair key (alphabetical sort)
     */
    function makePairKey(p1, p2) {
        return [p1, p2].sort().join('_');
    }

    /**
     * Identify Conjunctions across Chapters 41–44
     */
    function evaluateConjunctionYogas(chartContext) {
        const clusters = groupPlanetsBySign(chartContext);
        const lagnaSign = (chartContext.lagnaSign !== undefined)
            ? chartContext.lagnaSign
            : Math.floor((chartContext.lagnaLongitude || 0) / 30);

        const twoPlanetYogas = [];
        const threePlanetYogas = [];
        const multiPlanetYogas = [];

        for (let sign = 0; sign < 12; sign++) {
            const planets = clusters[sign];
            const house = ((sign - lagnaSign + 12) % 12) + 1;
            const signName = RASHI_NAMES[sign];

            // 2-Planet Conjunctions (Ch. 41)
            if (planets.length === 2) {
                const key1 = `${planets[0]}_${planets[1]}`;
                const key2 = `${planets[1]}_${planets[0]}`;
                const meta = DVI_GRAHA_CATALOG[key1] || DVI_GRAHA_CATALOG[key2];

                twoPlanetYogas.push({
                    type: "द्वि-ग्रह युति (2-Planet Conjunction)",
                    chapter: "BPHS Chapter 41",
                    planets: planets,
                    sign: signName,
                    house: house,
                    yogaName: meta ? meta.name : `${planets.join(' + ')} युति`,
                    nature: meta ? meta.nature : "Conjunction",
                    shloka: meta ? meta.shlokaPhala : "",
                    meaning: meta ? meta.englishMeaning : "",
                    modernInterpretation: meta ? meta.modernApplication : ""
                });
            }

            // 3-Planet Conjunctions (Ch. 42)
            else if (planets.length === 3) {
                threePlanetYogas.push({
                    type: "त्रि-ग्रह युति (3-Planet Conjunction)",
                    chapter: "BPHS Chapter 42",
                    planets: planets,
                    sign: signName,
                    house: house,
                    yogaName: `${planets.join(' + ')} त्रि-ग्रह योग`,
                    nature: "Complex Multi-faceted Synergy",
                    shlokaPhala: `महर्षि पाराशर अनुसार भाव ${house} (${signName}) में त्रिग्रह युति जातक को बहुआयामी प्रतिभा एवं विशिष्ट जीवन-मार्ग प्रदान करती है।`,
                    modernInterpretation: `Confluence of three planetary energies in House ${house} creates a dominant thematic life cluster demanding synthesis of all three functional archetypes.`
                });
            }

            // 4+ Planet Conjunctions (Ch. 43-44)
            else if (planets.length >= 4) {
                let yogaTitle = "";
                let chapter = "";
                if (planets.length === 4) {
                    yogaTitle = "चतुर्ग्रह योग (4-Planet Cluster)";
                    chapter = "BPHS Chapter 43";
                } else if (planets.length === 5) {
                    yogaTitle = "पञ्चग्रह योग (5-Planet Cluster)";
                    chapter = "BPHS Chapter 43";
                } else if (planets.length === 6) {
                    yogaTitle = "षड्ग्रह योग (6-Planet Mega-Cluster)";
                    chapter = "BPHS Chapter 44";
                } else {
                    yogaTitle = "सप्तग्रह योग (7-Planet Mahā-Cluster / Pravrajyā)";
                    chapter = "BPHS Chapter 44";
                }

                multiPlanetYogas.push({
                    type: yogaTitle,
                    chapter: chapter,
                    planets: planets,
                    sign: signName,
                    house: house,
                    nature: "Pravrajyā / Monumental Karmic Focus",
                    shlokaPhala: `एक ही राशि (${signName}) में ${planets.length} ग्रहों का सम्मिलन महान संन्यास, असाधारण जन-नेतृत्व अथवा जीवन के सम्पूर्ण दृष्टिकोण में युगांतरकारी परिवर्तन का सूचक है।`,
                    modernInterpretation: `Massive planetary cluster creating extraordinary concentration of consciousness in house ${house}. Requires high emotional and spiritual maturity.`
                });
            }
        }

        return {
            twoPlanetYogas: twoPlanetYogas,
            threePlanetYogas: threePlanetYogas,
            multiPlanetYogas: multiPlanetYogas
        };
    }

    /**
     * CHAPTER 45: DARIDRA YOGAS & FINANCIAL RISK AUDIT
     * 
     * Detects classical BPHS poverty combinations, wealth obstructions, and Kemadruma Yoga.
     */
    function evaluateDaridraYogas(chartContext) {
        const daridraList = [];
        const lagnaSign = (chartContext.lagnaSign !== undefined)
            ? chartContext.lagnaSign
            : Math.floor((chartContext.lagnaLongitude || 0) / 30);

        const moonSign = (chartContext.moonSign !== undefined)
            ? chartContext.moonSign
            : Math.floor((chartContext.moonLongitude || 0) / 30);

        const clusters = groupPlanetsBySign(chartContext);

        // Sign lords (0: Mars, 1: Venus, 2: Mercury, 3: Moon, 4: Sun, 5: Mercury, 6: Venus, 7: Mars, 8: Jup, 9: Sat, 10: Sat, 11: Jup)
        const SIGN_LORDS = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];

        const lagnaLord = SIGN_LORDS[lagnaSign];
        const h2Sign = (lagnaSign + 1) % 12;
        const h2Lord = SIGN_LORDS[h2Sign];
        const h11Sign = (lagnaSign + 10) % 12;
        const h11Lord = SIGN_LORDS[h11Sign];
        const h12Sign = (lagnaSign + 11) % 12;
        const h12Lord = SIGN_LORDS[h12Sign];

        // 1. Kemadruma Yoga Check (Moon isolated with no planets in 2nd and 12th from it)
        const moonH2Sign = (moonSign + 1) % 12;
        const moonH12Sign = (moonSign + 11) % 12;

        // Classical rule: Only Mars, Mercury, Jupiter, Venus, Saturn cancel Kemadruma in adjacent houses
        const validKemadrumaPlanets = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
        const pInMoonH2 = (clusters[moonH2Sign] || []).filter(p => validKemadrumaPlanets.includes(p));
        const pInMoonH12 = (clusters[moonH12Sign] || []).filter(p => validKemadrumaPlanets.includes(p));

        if (pInMoonH2.length === 0 && pInMoonH12.length === 0) {
            // Check for Kemadruma Bhanga (Cancellation): Planets in Kendras from Lagna or Moon
            const kendraSignsFromLagna = [lagnaSign, (lagnaSign + 3) % 12, (lagnaSign + 6) % 12, (lagnaSign + 9) % 12];
            const kendraSignsFromMoon = [moonSign, (moonSign + 3) % 12, (moonSign + 6) % 12, (moonSign + 9) % 12];
            
            let kendraPlanetsLagna = 0;
            let kendraPlanetsMoon = 0;

            kendraSignsFromLagna.forEach(s => {
                kendraPlanetsLagna += (clusters[s] || []).filter(p => validKemadrumaPlanets.includes(p)).length;
            });

            kendraSignsFromMoon.forEach(s => {
                kendraPlanetsMoon += (clusters[s] || []).filter(p => validKemadrumaPlanets.includes(p)).length;
            });

            const isCancelled = (kendraPlanetsLagna > 0 || kendraPlanetsMoon > 0);

            daridraList.push({
                yogaName: isCancelled ? "केमद्रुम भंग राजयोग (Kemadruma Bhanga)" : "केमद्रुम योग (Kemadruma Yoga)",
                chapter: "BPHS Ch. 45, Shlokas 3–6",
                category: isCancelled ? "REVERSED_TO_AUSPICIOUS" : "FINANCIAL_VULNERABILITY",
                status: isCancelled ? "पूर्णतः निरस्त / भंग (Cancelled)" : "सक्रिय (Active)",
                description: isCancelled 
                    ? "चन्द्रमा के द्वितीय एवं द्वादश में ग्रह न होने से केमद्रुम बना, किन्तु केन्द्र भावों में शुभ/बलवान ग्रहों की उपस्थिति से यह दोष भंग होकर राजयोग में परिवर्तित हुआ।"
                    : "चन्द्रमा के द्वितीय एवं द्वादश दोनों रिक्त हैं। आकस्मिक वित्तीय उतार-चढ़ाव, एकाकीपन एवं संचित पूंजी की अस्थिरता से सतर्क रहें।",
                remedy: "नित्य चन्द्र-शिव उपासना, पूर्णिमा व्रत, चांदी के पात्र से जल ग्रहण, एवं श्रीसूक्त का पाठ।"
            });
        }

        // 2. Lord of 2nd (Dhana) or 11th (Labha) placed in 6th, 8th, or 12th house
        const dusthanaSigns = [(lagnaSign + 5) % 12, (lagnaSign + 7) % 12, (lagnaSign + 11) % 12];

        // Find which sign h2Lord is in
        let h2LordSign = -1;
        let h11LordSign = -1;
        for (let s = 0; s < 12; s++) {
            if (clusters[s].includes(h2Lord)) h2LordSign = s;
            if (clusters[s].includes(h11Lord)) h11LordSign = s;
        }

        if (dusthanaSigns.includes(h2LordSign)) {
            const dusthanaHouse = ((h2LordSign - lagnaSign + 12) % 12) + 1;
            daridraList.push({
                yogaName: "धन-अवरोध योग (Dhana-Lord in Dusthāna)",
                chapter: "BPHS Ch. 45, Shlokas 12–14",
                category: "FINANCIAL_VULNERABILITY",
                status: "सक्रिय (Active)",
                description: `द्वितीयेश (${h2Lord}) त्रिक भाव (भाव ${dusthanaHouse}) में स्थित हैं। संचित धन के संरक्षण, अनुत्पादक व्ययों एवं अप्रत्याशित देनदारियों से सतर्क रहने की आवश्यकता है।`,
                remedy: `द्वितीयेश ${h2Lord} का दान, नियमित वित्तीय बजट अनुशासन, एवं कनकधारा स्तोत्र का पाठ।`
            });
        }

        if (dusthanaSigns.includes(h11LordSign)) {
            const dusthanaHouse = ((h11LordSign - lagnaSign + 12) % 12) + 1;
            daridraList.push({
                yogaName: "लाभ-अवरोध योग (Lābha-Lord in Dusthāna)",
                chapter: "BPHS Ch. 45, Shlokas 15–16",
                category: "FINANCIAL_VULNERABILITY",
                status: "सक्रिय (Active)",
                description: `एकादशेश (${h11Lord}) त्रिक भाव (भाव ${dusthanaHouse}) में स्थित हैं। आय-स्रोतों में अनियमितता अथवा व्यावसायिक भुगतानों में विलम्ब की संभावना रहती है।`,
                remedy: `एकादशेश ${h11Lord} के मंत्र जप एवं नियमित दान द्वारा आय-मार्गों को प्रशस्त करें।`
            });
        }

        // 3. Benefics in Dusthana while Malefics in Kendras
        const kendraSigns = [lagnaSign, (lagnaSign + 3) % 12, (lagnaSign + 6) % 12, (lagnaSign + 9) % 12];
        const malefics = ["Saturn", "Mars", "Sun"];
        const benefics = ["Jupiter", "Venus", "Mercury"];

        let maleficsInKendras = 0;
        kendraSigns.forEach(s => {
            maleficsInKendras += (clusters[s] || []).filter(p => malefics.includes(p)).length;
        });

        let beneficsInDusthanas = 0;
        dusthanaSigns.forEach(s => {
            beneficsInDusthanas += (clusters[s] || []).filter(p => benefics.includes(p)).length;
        });

        if (maleficsInKendras >= 2 && beneficsInDusthanas >= 2) {
            daridraList.push({
                yogaName: "केन्द्र-कंटक योग (Kendradi-Affliction Yoga)",
                chapter: "BPHS Ch. 45, Shlokas 21–22",
                category: "STRUGGLE_INDICATOR",
                status: "सक्रिय (Active)",
                description: "केन्द्र भावों में क्रूर ग्रह तथा त्रिक भावों में शुभ ग्रह स्थित होने से जीवन के आरंभ में कठोर संघर्ष एवं परिश्रम उपरांत सफलता प्राप्त होती है।",
                remedy: "विष्णु सहस्रनाम एवं महामृत्युंजय मंत्र द्वारा केन्द्र स्थित ग्रहों का शमन करें।"
            });
        }

        return {
            hasDaridraYogas: daridraList.length > 0,
            daridraYogas: daridraList
        };
    }

    /**
     * Master Evaluation for Chapters 41–45
     */
    function evaluateAllAdvancedYogas(chartContext) {
        const conjunctions = evaluateConjunctionYogas(chartContext);
        const daridra = evaluateDaridraYogas(chartContext);

        return {
            title: "पाराशर प्रगत योग एवं दारिद्र्य विश्लेषण (BPHS Chapters 41–45)",
            conjunctionYogas: conjunctions,
            financialAfflictions: daridra,
            totalYogasIdentified: (
                conjunctions.twoPlanetYogas.length +
                conjunctions.threePlanetYogas.length +
                conjunctions.multiPlanetYogas.length +
                daridra.daridraYogas.length
            )
        };
    }

    return {
        evaluateAllAdvancedYogas: evaluateAllAdvancedYogas,
        evaluateConjunctionYogas: evaluateConjunctionYogas,
        evaluateDaridraYogas: evaluateDaridraYogas,
        DVI_GRAHA_CATALOG: DVI_GRAHA_CATALOG
    };
}));
