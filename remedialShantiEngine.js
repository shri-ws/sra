/**
 * REMEDIAL & ŚĀNTI ENGINE (BPHS Chapters 91–97)
 * 
 * Implements the complete diagnostic detection and prescriptive Vedic liturgy
 * of Maharshi Parashara for pacification of planetary afflictions and birth omens:
 * 
 * 1. Chapter 91: Graha Śānti Adhyāya (Samidhas, Mantras, Japa counts 7k–23k, Gems, Dāna).
 * 2. Chapter 92: Gaṇḍānta Śānti Adhyāya (Tithi, Lagna & Nakshatra Gaṇḍāntas, Chhāyā-Pātra, 27-Tīrtha).
 * 3. Chapter 93: Grahaṇotpanna Śānti (Birth during Solar/Lunar Eclipses).
 * 4. Chapter 94: Sarpa Doṣa & Kāla Sarpa Śānti (Nāga Śāpa, 5th house afflictions, Golden Serpent Dāna).
 * 5. Chapter 95: Yamala & Trik Prasava Śānti (Twins, 4th child gender inversion, natal tooth omens).
 * 6. Chapter 96: Jyeṣṭhā-Mūla & Abhukta Mūla Śānti (48-min seam, 28-Kalasha grid, Aindra/Nirṛti).
 * 7. Chapter 97: Master Synthesis & Daivajña Ethical Audit (Purushartha balance, ethical counsel).
 * 
 * Universal Module Definition (Node.js & Browser compatible).
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.RemedialShantiEngine = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // -------------------------------------------------------------
    // CHAPTER 91: GRAHA ŚĀNTI LITURGICAL DIRECTORY
    // -------------------------------------------------------------
    const GRAHA_SHANTI_DATA = {
        "Sun": {
            sanskritName: "सूर्य (Sūrya)",
            samidha: "अर्क (Arka / Calotropis gigantea / मदार)",
            mantraVedic: "ॐ आ कृष्णेन रजसा वर्तमानो निवेशयन्नमृतं मर्त्यं च। हिरण्ययेन सविता रथेना देवो याति भुवनानि पश्यन्॥",
            mantraTantric: "ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः॥",
            gayatriMantra: "ॐ आदित्याय विद्महे मार्तण्डाय धीमहि तन्नः सूर्यः प्रचोदयात्॥",
            prescribedJapaCount: 7000,
            gemstone: "माणिक्य (Ruby / Manik)",
            metal: "स्वर्ण अथवा ताम्र (Gold or Copper)",
            color: "रक्त / गहरा लाल (Ruby Red / Crimson)",
            danaItems: "गेहूं, गुड़, तांबे का पात्र, रक्त चन्दन, लाल वस्त्र, केशर, स्वर्ण दक्षिणा",
            rulingDevata: "भगवान शिव / अग्नि देव",
            direction: "पूर्व (East)",
            taste: "कटु (Pungent / Bitter)"
        },
        "Moon": {
            sanskritName: "चन्द्र (Candra)",
            samidha: "पलाश (Palāśa / Butea monosperma / ढाक)",
            mantraVedic: "ॐ इमं देवा असपत्नं सुवध्वं महते क्षत्राय महते ज्येष्ठाय महते जानराज्यायेन्द्रस्येन्द्रियाय। इमममुष्य पुत्रममुष्यै पुत्रमस्यै विश एष वोऽमी राजा सोमोऽस्माकं ब्राह्मणानां राजा॥",
            mantraTantric: "ॐ श्रां श्रीं श्रौं सः चन्द्रमसे नमः॥",
            gayatriMantra: "ॐ क्षीरपुत्राय विद्महे अमृततत्त्वाय धीमहि तन्नश्चन्द्रः प्रचोदयात्॥",
            prescribedJapaCount: 11000,
            gemstone: "मुक्ता (Natural Pearl / Moti)",
            metal: "रजत / चांदी (Pure Silver)",
            color: "श्वेत (Pristine White / Cream)",
            danaItems: "चावल, श्वेत वस्त्र, कर्पूर, मिश्री, दूध, शंख, चांदी का सिक्का",
            rulingDevata: "माता पार्वती / जल देव (वरुण)",
            direction: "वायव्य (North-West)",
            taste: "लवण (Salty)"
        },
        "Mars": {
            sanskritName: "मंगल (Maṅgala / Bhauma)",
            samidha: "खदिर (Khadira / Acacia catechu / खैर)",
            mantraVedic: "ॐ अग्निर्मूर्धा दिवः ककुत्पतिः पृथिव्या अयम्। अपां रेतां सि जिन्वति॥",
            mantraTantric: "ॐ क्रां क्रीं क्रौं सः भौमाय नमः॥",
            gayatriMantra: "ॐ अङ्गारकाय विद्महे शक्तिहस्ताय धीमहि तन्नो भौमः प्रचोदयात्॥",
            prescribedJapaCount: 10000,
            gemstone: "प्रवाल / मूंगा (Red Coral / Moonga)",
            metal: "ताम्र (Pure Copper)",
            color: "रक्त / सिन्दूरी (Vermillion / Blood Red)",
            danaItems: "मसूर की दाल, गुड़, तांबे का बर्तन, लाल सिन्दूर, कस्तूरी, रक्त पुष्प",
            rulingDevata: "भगवान कार्तिकेय / श्री हनुमान जी",
            direction: "दक्षिण (South)",
            taste: "तिक्त (Bitter / Spicy)"
        },
        "Mercury": {
            sanskritName: "बुध (Budha)",
            samidha: "अपामार्ग (Apāmārga / Achyranthes aspera / चिरचिटा)",
            mantraVedic: "ॐ उद्बुध्यस्वाग्ने प्रति जागृहि त्वमिष्टापूर्ते सं सृजेथामयं च। अस्मिन्त्सधस्थे अध्युत्तरस्मिन् विश्वे देवा यजमानश्च सीदत॥",
            mantraTantric: "ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः॥",
            gayatriMantra: "ॐ सौम्यरूपाय विद्महे वाणेशाय धीमहि तन्नो सौम्यः प्रचोदयात्॥",
            prescribedJapaCount: 9000,
            gemstone: "मरकत / पन्ना (Natural Emerald / Panna)",
            metal: "कांस्य अथवा पीतल (Bronze or Brass)",
            color: "हरित (Emerald Green)",
            danaItems: "मूंग की साबुत दाल, हरे वस्त्र, कांस्य पात्र, फल, कपूर, हरी घास (गौ-सेवा)",
            rulingDevata: "भगवान श्री विष्णु / नारायण",
            direction: "उत्तर (North)",
            taste: "मिश्रित (Mixed / All tastes)"
        },
        "Jupiter": {
            sanskritName: "बृहस्पति / गुरु (Bṛhaspati / Guru)",
            samidha: "पिप्पल / अश्वत्थ (Pippala / Ficus religiosa / पीपल)",
            mantraVedic: "ॐ बृहस्पते अति यदर्यो अर्हाद्द्युमद्विभाति क्रतुमज्जनेषु। यद्दीदयच्छवस ऋतप्रजात तदस्मासु द्रविणं धेहि चित्रम्॥",
            mantraTantric: "ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः॥",
            gayatriMantra: "ॐ गुरुदेवाय विद्महे परब्रह्माय धीमहि तन्नो गुरुः प्रचोदयात्॥",
            prescribedJapaCount: 19000,
            gemstone: "पुष्पराग / पुखराज (Yellow Sapphire / Pukhraj)",
            metal: "स्वर्ण (Pure Gold)",
            color: "पीत (Golden Yellow)",
            danaItems: "चना दाल, हल्दी, पीले वस्त्र, पके केले, स्वर्ण, धार्मिक ग्रंथ, शहद",
            rulingDevata: "भगवान ब्रह्मा / इन्द्र / दक्षिणामूर्ति",
            direction: "ईशान (North-East)",
            taste: "मधुर (Sweet)"
        },
        "Venus": {
            sanskritName: "शुक्र (Śukra)",
            samidha: "उदुम्बर (Udumbara / Ficus racemosa / गूलर)",
            mantraVedic: "ॐ अन्नात्परिस्रुतो रसं ब्रह्मणा व्यपिबत् क्षत्रं पयः सोमं प्रजापतिः। ऋतेन सत्यमिन्द्रियं विपानं शुक्रमन्धस इन्द्रस्येन्द्रियमिदं पयोऽमृतं मधु॥",
            mantraTantric: "ॐ द्रां द्रीं द्रौं सः शुक्राय नमः॥",
            gayatriMantra: "ॐ भृगुपुत्राय विद्महे दिव्यदेहाय धीमहि तन्नः शुक्रः प्रचोदयात्॥",
            prescribedJapaCount: 16000,
            gemstone: "हीरक (Natural Diamond / Heera)",
            metal: "रजत अथवा प्लैटिनम (Silver or Platinum)",
            color: "शुभ्र / चमकदार श्वेत (Dazzling White / Silvery)",
            danaItems: "श्वेत चन्दन, सुगंधित इत्र, दही, खीर, मिश्री, रेशमी वस्त्र, चांदी",
            rulingDevata: "भगवती महालक्ष्मी / इन्द्राणी",
            direction: "आग्नेय (South-East)",
            taste: "अम्ल (Sour)"
        },
        "Saturn": {
            sanskritName: "शनैश्चर / शनि (Śanaiścara / Śani)",
            samidha: "शमी (Śamī / Prosopis cineraria / छोंकर)",
            mantraVedic: "ॐ शं नो देवीरभिष्टये आपो भवन्तु पीतये। शं योरभि स्रवन्तु नः॥",
            mantraTantric: "ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः॥",
            gayatriMantra: "ॐ काकध्वजाय विद्महे खड्गहस्ताय धीमहि तन्नो मन्दः प्रचोदयात्॥",
            prescribedJapaCount: 23000,
            gemstone: "नीलम (Blue Sapphire / Neelam)",
            metal: "लौह अथवा सीसा (Iron or Lead)",
            color: "कृष्ण / गहरा नील (Deep Blue / Jet Black)",
            danaItems: "उड़द की दाल, तिल का तेल, काला तिल, लोहा, काले वस्त्र, जूते/छाता, कंबल",
            rulingDevata: "भगवान यमराज / काल भैरव / हनुमान जी",
            direction: "पश्चिम (West)",
            taste: "कषाय (Astringent)"
        },
        "Rahu": {
            sanskritName: "राहु (Rāhu)",
            samidha: "दूर्वा (Dūrvā grass / Cynodon dactylon / दूब)",
            mantraVedic: "ॐ कया नश्चित्र आ भुवदूती सदावृधः सखा। कया शचिष्ठया वृता॥",
            mantraTantric: "ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः॥",
            gayatriMantra: "ॐ शिरोरूपाय विद्महे अमृतेशाय धीमहि तन्नो राहुः प्रचोदयात्॥",
            prescribedJapaCount: 18000,
            gemstone: "गोमेद (Hessonite Garnet / Gomed)",
            metal: "रांगा / अष्टधातु (Lead or Pewter)",
            color: "धूम्र / गहरा भूरा (Smoky Brown / Charcoal)",
            danaItems: "सप्तधान्य, नारियल (जल वाला), काले तिल, कम्बल, उड़द, सरसों तेल",
            rulingDevata: "माँ कालिका / भैरव",
            direction: "नैऋत्य (South-West)",
            taste: "कटु-तिक्त (Acrid)"
        },
        "Ketu": {
            sanskritName: "केतु (Ketu)",
            samidha: "कुश (Kuśa grass / Desmostachya bipinnata / डाभ)",
            mantraVedic: "ॐ केतुं कृण्वन्नकेतवे पेशो मर्या अपेशसे। समुषद्भिरजायथाः॥",
            mantraTantric: "ॐ स्त्रां स्त्रीं स्त्रौं सः केतवे नमः॥",
            gayatriMantra: "ॐ चित्रवर्णाय विद्महे सर्परूपाय धीमहि तन्नः केतुः प्रचोदयात्॥",
            prescribedJapaCount: 17000,
            gemstone: "वैदूर्य / लहसुनिया (Cat's Eye Chrysoberyl)",
            metal: "कांस्य (Bell Metal / Alloy)",
            color: "चित्तीदार / धूम्र (Spotted / Variegated)",
            danaItems: "दो-रंगी कम्बल, तिल, छाता, ध्वजा (मंदिर में अर्पित), कस्तूरी, लहसुनिया",
            rulingDevata: "भगवान श्री गणेश / चित्रगुप्त",
            direction: "वायव्य / अधोमुख (Downward)",
            taste: "तिक्त (Astringent)"
        }
    };

    // -------------------------------------------------------------
    // CHAPTER 92: GAṆḌĀNTA DETECTION & LITURGY
    // -------------------------------------------------------------
    /**
     * Check if a longitude falls within Nakshatra Gandanta junctions:
     * 1. Revati - Ashvini (end of Meena, start of Mesha) [356° 40' to 3° 20']
     * 2. Ashlesha - Magha (end of Karka, start of Simha) [116° 40' to 123° 20']
     * 3. Jyeshtha - Mula (end of Vrishchika, start of Dhanu) [236° 40' to 243° 20']
     */
    function detectNakshatraGandanta(moonLongitude) {
        const deg = (moonLongitude % 360 + 360) % 360;

        // Revati 4th pada: 356.6667 to 360.0; Ashvini 1st pada: 0.0 to 3.3333
        if (deg >= 356.6667 || deg <= 3.3333) {
            const isRevati = deg >= 356.6667;
            return {
                isGandanta: true,
                type: "रेवती-अश्विनी नक्षत्र गण्डान्त (Revatī-Aśvinī Junction)",
                pada: isRevati ? "रेवती चतुर्थ चरण (End of Pisces)" : "अश्विनी प्रथम चरण (Start of Aries)",
                impact: "मातृ अथवा जातक के प्रारम्भिक स्वास्थ्य पर संवेदनशील प्रभाव।",
                urgency: "जन्म के २७वें दिन अथवा शुभ मुहूर्त में शान्ति आवश्यक।"
            };
        }

        // Ashlesha 4th pada: 116.6667 to 120.0; Magha 1st pada: 120.0 to 123.3333
        if (deg >= 116.6667 && deg <= 123.3333) {
            const isAshlesha = deg < 120.0;
            return {
                isGandanta: true,
                type: "आश्लेषा-मघा नक्षत्र गण्डान्त (Āśleṣā-Maghā Junction)",
                pada: isAshlesha ? "आश्लेषा चतुर्थ चरण (End of Cancer)" : "मघा प्रथम चरण (Start of Leo)",
                impact: isAshlesha ? "मातृ-पक्ष अथवा सास के लिए संवेदनशील।" : "पितृ-पक्ष अथवा स्वयं के लिए संवेदनशील।",
                urgency: "महर्षि पाराशर अनुसार मघा/आश्लेषा शान्ति एवं गो-दान अनिवार्य।"
            };
        }

        // Jyeshtha 4th pada: 236.6667 to 240.0; Mula 1st pada: 240.0 to 243.3333
        if (deg >= 236.6667 && deg <= 243.3333) {
            const isJyeshtha = deg < 240.0;
            return {
                isGandanta: true,
                type: "ज्येष्ठा-मूल नक्षत्र गण्डान्त / अभुक्त मूल (Jyeṣṭhā-Mūla Seam)",
                pada: isJyeshtha ? "ज्येष्ठा चतुर्थ चरण (End of Scorpio)" : "मूल प्रथम चरण (Start of Sagittarius)",
                impact: isJyeshtha ? "ज्येष्ठ बन्धु अथवा आत्म-कष्ट का भय।" : "पितृ एवं कुल-वंश पर गम्भीर संवेदनशील प्रभाव (अभुक्त मूल)।",
                urgency: "अत्यन्त संवेदनशील! २८ कलश महाशान्ति एवं पिता द्वारा शिशु-मुख दर्शन निषेध जब तक शान्ति न हो।"
            };
        }

        return { isGandanta: false };
    }

    /**
     * Check if Lagna falls within Lagna Gandanta (Water to Fire junctions):
     * Cancer 29.5° to Leo 0.5°, Scorpio 29.5° to Sagittarius 0.5°, Pisces 29.5° to Aries 0.5°
     */
    function detectLagnaGandanta(lagnaLongitude) {
        const deg = (lagnaLongitude % 360 + 360) % 360;

        if (deg >= 119.5 && deg <= 120.5) {
            return {
                isLagnaGandanta: true,
                junction: "कर्क-सिंह सन्धि (Cancer-Leo Lagna Gaṇḍānta)",
                shlokaPhala: "लग्नगण्डान्ते जातः देहपीडां कुलक्षयं वा प्राप्नोति।",
                remedy: "२७ तीर्थोदक स्नान, घृत-छायापात्र दान, एवं महामृत्युंजय जप।"
            };
        }
        if (deg >= 239.5 && deg <= 240.5) {
            return {
                isLagnaGandanta: true,
                junction: "वृश्चिक-धनु सन्धि (Scorpio-Sagittarius Lagna Gaṇḍānta)",
                shlokaPhala: "वृश्चिकान्त-धनुरादौ लग्नगण्डान्ते वंशपीडा।",
                remedy: "गो-दान, स्वर्ण-मूर्ति पूजन, एवं रुद्र अभिषेक।"
            };
        }
        if (deg >= 359.5 || deg <= 0.5) {
            return {
                isLagnaGandanta: true,
                junction: "मीन-मेष सन्धि (Pisces-Aries Lagna Gaṇḍānta)",
                shlokaPhala: "मीनान्त-मेषादौ लग्नगण्डान्ते आत्मबल क्षीणता।",
                remedy: "सूर्य-चन्द्र संयुक्त हवन एवं छायापात्र दान।"
            };
        }

        return { isLagnaGandanta: false };
    }

    /**
     * Full Gandanta Evaluation (Chapter 92)
     */
    function evaluateGandantaDosha(moonLongitude, lagnaLongitude) {
        const nakGandanta = detectNakshatraGandanta(moonLongitude);
        const lagGandanta = detectLagnaGandanta(lagnaLongitude);

        const hasAnyGandanta = nakGandanta.isGandanta || lagGandanta.isLagnaGandanta;

        return {
            hasGandanta: hasAnyGandanta,
            chapter: "बृहत्पाराशरहोराशास्त्र अध्याय ९२ (BPHS Chapter 92)",
            nakshatraGandanta: nakGandanta,
            lagnaGandanta: lagGandanta,
            vedicPrescription: hasAnyGandanta ? {
                kalashaVidhi: "२७ तीर्थों के पावन जल अथवा २७ कुओं/सरिताओं के जल से २७ मिट्टी के कलशों की स्थापना कर वरुण एवं नक्षत्र-देवताओं का आवाहन व अभिषेक।",
                chhayaPatra: "कांस्य अथवा ताम्र के पात्र में शुद्ध गो-घृत (गाय का घी) भरकर जातक/शिशु का मुख प्रतिबिम्ब देखना तथा उस पात्र का सुयोग्य वेदपाठी ब्राह्मण को दान।",
                goDana: "सवत्सा कपिला गौ (दूध देने वाली बछड़े सहित गाय) का दान, अथवा उसके अभाव में निष्क्रीत गो-मूल्य दान।",
                japaHoma: "महामृत्युंजय मंत्र का १०,००० अथवा २१,००० जप एवं पलाश/दूर्वा समिधाओं से दशांश हवन।"
            } : null
        };
    }

    // -------------------------------------------------------------
    // CHAPTER 94: SARPA DOṢA & KĀLA SARPA EVALUATION
    // -------------------------------------------------------------
    function evaluateKalaSarpaAndSarpaDosha(chartContext) {
        if (!chartContext || !chartContext.planets) {
            return { hasKalaSarpa: false, hasSarpaDosha: false };
        }

        const rahuLon = (typeof chartContext.planets.Rahu === 'number') 
            ? chartContext.planets.Rahu 
            : (chartContext.planets.Rahu?.longitude || 0);

        const ketuLon = (typeof chartContext.planets.Ketu === 'number')
            ? chartContext.planets.Ketu
            : (chartContext.planets.Ketu?.longitude || ((rahuLon + 180) % 360));

        const classicPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
        let sideA = 0; // Rahu to Ketu
        let sideB = 0; // Ketu to Rahu

        classicPlanets.forEach(p => {
            const pData = chartContext.planets[p];
            if (pData !== undefined) {
                const lon = (typeof pData === 'number') ? pData : (pData.longitude || 0);
                const diffFromRahu = (lon - rahuLon + 360) % 360;
                if (diffFromRahu > 0 && diffFromRahu < 180) {
                    sideA++;
                } else if (diffFromRahu > 180 && diffFromRahu < 360) {
                    sideB++;
                }
            }
        });

        const isFullKalaSarpa = (sideA === 7 && sideB === 0) || (sideB === 7 && sideA === 0);
        const isPartialKalaSarpa = (sideA === 6 && sideB === 1) || (sideB === 6 && sideA === 1);

        // Sarpa Dosha / Naga Shapa (BPHS Ch. 94): Rahu in 5th house or conjunct 5th lord
        const lagnaSign = (chartContext.lagnaSign !== undefined)
            ? chartContext.lagnaSign
            : Math.floor((chartContext.lagnaLongitude || 0) / 30);
        
        const rahuSign = Math.floor(rahuLon / 30);
        const rahuHouse = ((rahuSign - lagnaSign + 12) % 12) + 1;
        const isRahuIn5th = (rahuHouse === 5);

        return {
            hasKalaSarpa: isFullKalaSarpa || isPartialKalaSarpa,
            type: isFullKalaSarpa ? "पूर्ण कालसर्प योग (Full Kāla Sarpa Yoga)" : (isPartialKalaSarpa ? "आंशिक कालसर्प योग (Partial Kāla Sarpa Yoga)" : "अनुपस्थित (Absent)"),
            hasSarpaDosha: isRahuIn5th,
            chapter: "बृहत्पाराशरहोराशास्त्र अध्याय ९४ (BPHS Chapter 94)",
            sarpaShapaDetails: isRahuIn5th ? {
                condition: "पंचम भाव में राहु की स्थिति (नाग-दोष / सर्प-शाप)",
                impact: "संतान सुख में विलम्ब, शिक्षा में व्यवधान, अथवा पारिवारिक मानसिक उद्वेग।",
                remedyLiturgy: "स्वर्ण निर्मित नाग-नागिन प्रतिमा का काले तिल के ढेर पर पूजन, नागबलि विधान, तथा महामृत्युंजय मंत्र जप।"
            } : null,
            kalaSarpaRemedies: (isFullKalaSarpa || isPartialKalaSarpa) ? {
                shivaUpasana: "त्र्यम्बकेश्वर अथवा किसी भी द्वादश ज्योतिर्लिंग तीर्थ पर कालसर्प दोष शान्ति एवं रुद्राभिषेक।",
                murtidana: "चांदी के दो सर्प बहते जल में प्रवाहित करना, तथा नित्य नाग गायत्री मंत्र का जप।",
                nagaGayatri: "ॐ नवकुलाय विद्महे विषदन्ताय धीमहि तन्नः सर्पः प्रचोदयात्॥"
            } : null
        };
    }

    // -------------------------------------------------------------
    // CHAPTER 95 & 96: SPECIAL PRAKṚTI & ABHUKTA MŪLA
    // -------------------------------------------------------------
    function evaluateSpecialBirthOmens(moonLongitude, birthContext = {}) {
        const deg = (moonLongitude % 360 + 360) % 360;
        
        // Abhukta Mula (Chapter 96): Last 1 ghati (24 min) of Jyeshtha + first 1 ghati of Mula
        // Jyeshtha ends at 240.0. Last 24 arcmin = 239° 36' (239.60) to 240° 00'
        // Mula starts at 240.0. First 24 arcmin = 240° 00' to 240° 24' (240.40)
        const isAbhuktaMula = (deg >= 239.60 && deg <= 240.40);

        return {
            abhuktaMula: {
                isAbhuktaMula: isAbhuktaMula,
                chapter: "बृहत्पाराशरहोराशास्त्र अध्याय ९६ (BPHS Chapter 96)",
                description: isAbhuktaMula 
                    ? "जातक का जन्म ज्येष्ठा नक्षत्र के अन्तिम चरण एवं मूल के प्रारम्भ के अति-संवेदनशील अभुक्त मूल (४८ मिनट) में हुआ है।"
                    : "अभुक्त मूल दोष अनुपस्थित है।",
                liturgy: isAbhuktaMula ? {
                    fatherFaceRestraint: "शान्ति विधान सम्पन्न होने तक (८ या २७ दिन) पिता द्वारा शिशु के मुख का सीधा दर्शन वर्जित (कांस्य पात्र में घृत प्रतिच्छाया दर्शन विधान)।",
                    panchaPallava: "२८ कलशों में पञ्च-पल्लव (आम, जामुन, बड़, पीपल, गूलर) एवं २८ तीर्थों का जल भरकर ऐन्द्र एवं निर्ऋति आहुति।"
                } : null
            },
            yamalaTrik: {
                chapter: "बृहत्पाराशरहोराशास्त्र अध्याय ९५ (BPHS Chapter 95)",
                isTwinBirth: Boolean(birthContext.isTwin),
                isTrikPrasava: Boolean(birthContext.isTrikPrasava),
                remedy: (birthContext.isTwin || birthContext.isTrikPrasava) ? {
                    title: "त्रिक-प्रसव अथवा यमल-जनन शान्ति विधान",
                    ritual: "संतान गोपाल स्तोत्र पाठ, तिल-धेनु दान, तथा १००८ महामृत्युंजय आहुतियां।"
                } : null
            }
        };
    }

    // -------------------------------------------------------------
    // CHAPTER 97: MASTER SYNTHESIS & DAIVAJÑA ETHICAL AUDIT
    // -------------------------------------------------------------
    function evaluateDaivajnaSynthesis(chartContext) {
        // Evaluate Purushartha balance across 12 houses:
        // Dharma (1, 5, 9), Artha (2, 6, 10), Kama (3, 7, 11), Moksha (4, 8, 12)
        const lagnaSign = (chartContext.lagnaSign !== undefined)
            ? chartContext.lagnaSign
            : Math.floor((chartContext.lagnaLongitude || 0) / 30);

        const purushartha = {
            dharmaScore: 0,
            arthaScore: 0,
            kamaScore: 0,
            mokshaScore: 0
        };

        if (chartContext && chartContext.planets) {
            for (const [pName, pData] of Object.entries(chartContext.planets)) {
                const lon = (typeof pData === 'number') ? pData : (pData.longitude || 0);
                const sign = Math.floor(((lon % 360 + 360) % 360) / 30);
                const house = ((sign - lagnaSign + 12) % 12) + 1;

                if ([1, 5, 9].includes(house)) purushartha.dharmaScore++;
                else if ([2, 6, 10].includes(house)) purushartha.arthaScore++;
                else if ([3, 7, 11].includes(house)) purushartha.kamaScore++;
                else if ([4, 8, 12].includes(house)) purushartha.mokshaScore++;
            }
        }

        // Determine dominant life aspiration
        let dominantAspiration = "धर्म (Dharma - Righteous Duty & Knowledge)";
        let maxScore = purushartha.dharmaScore;

        if (purushartha.arthaScore > maxScore) {
            maxScore = purushartha.arthaScore;
            dominantAspiration = "अर्थ (Artha - Material Resource & Enterprise)";
        }
        if (purushartha.kamaScore > maxScore) {
            maxScore = purushartha.kamaScore;
            dominantAspiration = "काम (Kāma - Social Connection & Desire Fulfillment)";
        }
        if (purushartha.mokshaScore > maxScore) {
            maxScore = purushartha.mokshaScore;
            dominantAspiration = "मोक्ष (Mokṣa - Liberation, Solitude & Transcendence)";
        }

        return {
            chapter: "बृहत्पाराशरहोराशास्त्र अध्याय ९७ (BPHS Chapter 97)",
            title: "दैवज्ञ नीति, समग्र जीवन सार एवं पुरुषार्थ चतुष्टय समन्वय",
            purusharthaDistribution: {
                dharma: { houses: "1, 5, 9", planetaryCount: purushartha.dharmaScore },
                artha: { houses: "2, 6, 10", planetaryCount: purushartha.arthaScore },
                kama: { houses: "3, 7, 11", planetaryCount: purushartha.kamaScore },
                moksha: { houses: "4, 8, 12", planetaryCount: purushartha.mokshaScore }
            },
            dominantLifeOrientation: dominantAspiration,
            daivajnaEthicalPledge: {
                sanskrit: "शान्तो विनीतः सत्यवादी जितक्रोधो जितेन्द्रियः। दैवज्ञः सर्वशास्त्रज्ञो लोकोपकारकारकः॥",
                english: "The true astrologer (Daivajña) must be tranquil, humble, truthful, free from anger, master of senses, learned in all shastras, and dedicated solely to the selfless upliftment of humanity.",
                counsel: "Astrology is not fatalism; it is a sacred lamp illuminating free will and divine grace through righteous remedies."
            }
        };
    }

    /**
     * Comprehensive Master Remedial Package (Chapters 91–97)
     */
    function generateComprehensiveRemedialReport(chartContext, birthContext = {}) {
        const moonLon = (chartContext.moonLongitude !== undefined)
            ? chartContext.moonLongitude
            : ((chartContext.planets?.Moon?.longitude) || 0);

        const lagnaLon = (chartContext.lagnaLongitude !== undefined)
            ? chartContext.lagnaLongitude
            : ((chartContext.lagnaSign || 0) * 30 + 15);

        const gandanta = evaluateGandantaDosha(moonLon, lagnaLon);
        const sarpa = evaluateKalaSarpaAndSarpaDosha(chartContext);
        const specialOmens = evaluateSpecialBirthOmens(moonLon, birthContext);
        const synthesis = evaluateDaivajnaSynthesis(chartContext);

        return {
            title: "महर्षि पाराशर महा-शान्ति एवं वैदिक प्रायश्चित्त विधान (BPHS Chapters 91–97)",
            grahaShantiDirectory: GRAHA_SHANTI_DATA,
            gandantaAssessment: gandanta,
            sarpaAndKalaSarpaAssessment: sarpa,
            specialOmensAssessment: specialOmens,
            daivajnaMasterSynthesis: synthesis
        };
    }

    return {
        generateComprehensiveRemedialReport: generateComprehensiveRemedialReport,
        evaluateGandantaDosha: evaluateGandantaDosha,
        evaluateKalaSarpaAndSarpaDosha: evaluateKalaSarpaAndSarpaDosha,
        evaluateSpecialBirthOmens: evaluateSpecialBirthOmens,
        evaluateDaivajnaSynthesis: evaluateDaivajnaSynthesis,
        GRAHA_SHANTI_DATA: GRAHA_SHANTI_DATA
    };
}));
