import os
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BLOG_METAS = [
    # Theme 1: Gochara & Major Planetary Transits (1-10)
    (1, "शनि की साढ़े साती के तीन चरण एवं पराशरीय परिहार", "अष्टकवर्ग गणित, 3 ढैया चक्र एवं दशरथ कृत शांति विधान", "gochar", "🔮 ग्रह गोचर", "शनैश्चरस्य गोचरे अष्टकवर्ग बलम्"),
    (2, "गुरु गोचर एवं गजकेसरी योग का सक्रियण", "बृहस्पति का राशि संक्रमण एवं चंद्र-केंद्र राजयोग फलित", "gochar", "🔮 ग्रह गोचर", "केन्द्रे देवगुरौ चन्द्राद् गजकेसरी भवेत्"),
    (3, "राहु-केतु गोचर: शास्त्रीय विश्लेषण एवं भ्रम निवारण", "मीन व कन्या राशि में छाया ग्रहों का सूक्ष्म कर्म प्रभाव", "gochar", "🔮 ग्रह गोचर", "छायाग्रहौ महावीर्यौ गोचरे विपुले शुभे"),
    (4, "अष्टकवर्ग कक्षा गोचर: प्रतिदिन के सटीक फलादेश का गणित", "प्रत्येक ग्रह का 8 कक्षा भ्रमण एवं रेखा-बिंदु फलित", "ephemeris", "🪐 खगोल गणित", "कक्षाक्रमेण संप्राप्ते गोचरे शुभदायकम्"),
    (5, "मंगल-अंगारक गोचर: अग्नि तत्व एवं रक्त विकार के उपचार", "भौम का गोचर वेध, कुज दोष एवं पराशरीय शांति", "gochar", "🔮 ग्रह गोचर", "मङ्गलो धरणीपुत्रो रक्तवर्णो महाबलः"),
    (6, "सूर्य संक्रांति, मलमास व खरमास का खगोलीय सत्य", "सौर वर्ष गति, अयनांश वेध एवं निषिद्ध मुहूर्त विचार", "muhurta", "📅 मुहूर्त विज्ञान", "सूर्ये मकरराशिस्थे उत्तरायणमुच्यते"),
    (7, "शुक्र अस्त (Combustion) गोचर एवं विवाह पर प्रतिबंध", "तारा डूबना, क्रांति वेध एवं 8 अंश दहन सीमा", "muhurta", "📅 मुहूर्त विज्ञान", "शुक्रास्ते तु न कुर्वीत विवाहोपनयादिकम्"),
    (8, "वक्री शनि (Retrograde Saturn): भय या चेष्टा बल?", "प्रतिगामी गति का भौतिक व आध्यात्मिक प्रभाव", "gochar", "🔮 ग्रह गोचर", "वक्री तु महावीर्यवान् चेष्टाबलसमन्वितः"),
    (9, "बुध वक्री (Mercury Retrograde) का व्यापार पर प्रभाव", "कम्युनिकेशन, वित्तीय अनुबंध एवं तार्किक विश्लेषण", "gochar", "🔮 ग्रह गोचर", "बुधो बुद्धिप्रदाता च वक्रे धीमतां वरः"),
    (10, "चंद्रमा का अष्टम गोचर एवं दैवज्ञ परामर्श का नियम", "चंद्र बल लॉक, मानसिक वेध एवं एकांत साधना", "gochar", "🔮 ग्रह गोचर", "अष्टमे तु गते चन्द्रे न कुर्यान्मन्त्रचिन्तनम्"),

    # Theme 2: Classical Raj Yogas & Wealth Formulations (11-20)
    (11, "पंच महापुरुष योग: रुचक, भद्र, हंस, मालव्य, शश", "केंद्र भावों में स्वक्षेत्री-उच्च ग्रहों का सम्राट् योग", "rajyoga", "👑 शास्त्रीय राजयोग", "पञ्चैते योगराजाः स्युः सर्वलोकेषु विश्रुताः"),
    (12, "नीचभंग राजयोग: 4 शास्त्रीय नियम और भ्रांतियां", "नीच ग्रह का परम राजयोग में रूपांतरण", "rajyoga", "👑 शास्त्रीय राजयोग", "नीचस्थितो जन्मनि यो ग्रहः स्यात् तद्राशिनाथः"),
    (13, "विपरीत राजयोग: हर्ष, सरल, विमल की गुप्त शक्ति", "त्रिक भावों (6, 8, 12) के स्वामियों का पराक्रम", "rajyoga", "👑 शास्त्रीय राजयोग", "रन्ध्रेशो रिपुभावस्थो विमलः सरलस्तथा"),
    (14, "इन्दु लग्न एवं कुबेर धन योग: असीमित समृद्धि का सूत्र", "ग्रह किरणों (Kalas) का गणित एवं कुबेर संपदा", "rajyoga", "👑 शास्त्रीय राजयोग", "इन्दुसंज्ञे धनेशस्य संबन्धे धनवान् भवेत्"),
    (15, "श्री लग्न एवं महालक्ष्मी योग: स्थाई धन प्राप्ति", "लग्नेश, नवमेश व एकादशेश का युगांतरकारी संबंध", "rajyoga", "👑 शास्त्रीय राजयोग", "श्रीयुतो धर्मकर्माद्यो महालक्ष्मीपतिर्भवेत्"),
    (16, "महाभाग्य योग: दिन-रात, विषम-सम लग्न का दिव्य संयोग", "स्त्री-पुरुष जन्म भेद एवं अखंड सौभाग्य", "rajyoga", "👑 शास्त्रीय राजयोग", "सूर्येन्दुलग्नसंयोगे महाभाग्यो भवेन्नरः"),
    (17, "पुष्कर नवांश एवं पुष्कर भाग: दुर्बल ग्रहों का उद्धार", "24 पुष्कर नवांश एवं विशिष्ट अंशों की अमृत्व शक्ति", "ephemeris", "🪐 खगोल गणित", "पुष्कराख्ये नवांशानां सर्वे दोषाः प्रशाम्यन्ति"),
    (18, "गजकेसरी योग का असली सच: निष्प्रभावी होने के 5 कारण", "पक्ष बल, अस्त दोष, शत्रु दृष्टि एवं नीच राशि वेध", "rajyoga", "👑 शास्त्रीय राजयोग", "शुभदृष्टियुतो जीवः शशी पूर्णो महामतिः"),
    (19, "अमृत, काहला और पारिजात योग: पराशरीय दुर्लभ योग", "डिस्पोजिटर शृंखला द्वारा नेतृत्व एवं सार्वभौम कीर्ति", "rajyoga", "👑 शास्त्रीय राजयोग", "पारिजाते समूत्पन्नो राजा भवति धार्मिकः"),
    (20, "दरिद्र योग एवं उसके अकाट्य पराशरीय परिहार", "एकादशेश की त्रिक स्थिति व शास्त्रीय दान-मंत्र", "shanti", "🪔 वैदिक शांति", "दारिद्र्यशमनं कुर्यात् विष्णुसहस्रनामभिः"),

    # Theme 3: Vivah, Relationship & Matchmaking (21-28)
    (21, "36 गुण मिलान बनाम 10 महादोष: संबंध टूटने का सच", "लत्ता, पात, जामित्र, वेध, बाण दोषों की उपेक्षा का परिणाम", "vivah", "💍 विवाह व संबंध", "गुणेषु विद्यमानेषु दोषैर्भङ्गो भवेद् ध्रुवम्"),
    (22, "मांगलिक दोष (Mangal Dosha): 21 शास्त्रीय परिहार", "बृहत्पाराशर होराशास्त्र सम्मत कुज दोष मुक्ति सूत्र", "vivah", "💍 विवाह व संबंध", "अजे भौमो न दोषाय मेषे चापे धनुर्धरे"),
    (23, "सप्तमेश 12 भावों में: वैवाहिक सुख व जीवनसाथी", "कलत्र भाव, दांपत्य आयु एवं स्वभाव का सूक्ष्म विश्लेषण", "vivah", "💍 विवाह व संबंध", "जायाभावगतो मन्त्री भार्या सौभाग्यसंयुता"),
    (24, "उपपद लग्न (Upapada Lagna): विवाह का सटीक समय", "द्वादश भाव के आरूढ़ से जीवनसाथी के कुल का रहस्य", "vivah", "💍 विवाह व संबंध", "उपपदं तु विज्ञेयं दम्पत्योः सुखसाधनम्"),
    (25, "नाड़ी दोष का संपूर्ण सच एवं शास्त्र सम्मत अपवाद", "एक नाड़ी विवाह में कब और किन परिस्थितियों में छूट?", "vivah", "💍 विवाह व संबंध", "एकनक्षत्रजातानां नाड़ीदोषो न विद्यते"),
    (26, "नवांश (D9 Chart) से विवाह का सूक्ष्म परीक्षण", "डी-1 शरीर है तो डी-9 आत्मा: कलत्र कारक की शक्ति", "vivah", "💍 विवाह व संबंध", "नवांशे बलसम्पन्ने दांपत्यं सुखमेधते"),
    (27, "शुक्र-मंगल युति: आकर्षण, कामुकता या दांपत्य कलह?", "जल व अग्नि तत्व का मिश्रण एवं शास्त्रीय सामंजस्य", "vivah", "💍 विवाह व संबंध", "शुक्रारयोः समायोगे कामवेगः प्रवर्धते"),
    (28, "संतान सुख एवं पुत्र दोष: पंचम भाव व गुरु का विचार", "क्षेत्र स्फुट, बीज स्फुट एवं संतान गोपाल साधना", "vivah", "💍 विवाह व संबंध", "सुतभावगते जीवे पुत्रपौत्रसमृद्धिमान्"),

    # Theme 4: Misunderstood Doshas & Pop-Astrology Debunking (29-36)
    (29, "कालसर्प दोष का असली सच: सर्प योग बनाम आधुनिक भय", "नाभस सर्प योग का पराशरीय स्वरूप और व्यावसायिक भ्रम", "shanti", "🪔 शास्त्रीय रहस्य", "सर्वे केन्द्रे स्थिताः पापाः सर्पयोगाभिधो भवेत्"),
    (30, "पितृ दोष (Pitra Dosh): पूर्वजों का ऋण व तर्पण विधान", "सूर्य-राहु युति, पितृ शाप एवं नारायण बलि का सच", "shanti", "🪔 वैदिक शांति", "पितृशापोद्भवे रोगे गयाश्राद्धं विधीयते"),
    (31, "केमद्रुम योग: दरिद्रता का शाप या एकाकी तपस्वी का वरदान?", "चंद्रमा के दोनों ओर ग्रह शून्यता एवं 5 भंग नियम", "rajyoga", "👑 शास्त्रीय राजयोग", "केमद्रुमे विनष्टे तु केन्द्रे सौम्यग्रहैर्युते"),
    (32, "गुरु चांडाल योग: नास्तिकता या उच्च दार्शनिक प्रज्ञा?", "गुरु-राहु युति का वैज्ञानिक व आध्यात्मिक फलादेश", "shanti", "🪔 शास्त्रीय रहस्य", "राहुसंस्थे गुरौ वापि ज्ञानान्वेषणमुत्तमम्"),
    (33, "ग्रहण दोष (Grahan Dosha): सूर्य-चंद्र वेध एवं मुक्ति", "आत्मा व मन पर छायाग्रहों का आक्रमण और आदित्य साधना", "shanti", "🪔 वैदिक शांति", "सूर्यचन्द्रमसोर्ग्रस्ते जपहोमादिना शमः"),
    (34, "गंडात जन्म (Gandanta): नक्षत्र व लग्न संधि की शांति", "रेवती-अश्विनी, आश्लेषा-मघा एवं 27 दिन का परिहार", "shanti", "🪔 वैदिक शांति", "गण्डान्ते जायते यस्तु तस्य शान्तिं विधारयेत्"),
    (35, "मांगलिक अंगारक योग: मंगल-राहु की शक्ति का रूपांतरण", "आक्रामकता को शल्य चिकित्सा, सैन्य व तकनीकी प्रतिभा में बदलना", "shanti", "🪔 शास्त्रीय रहस्य", "भौमराहुसमायोगे महावीर्यो रणप्रियः"),
    (36, "विष योग (Visha Yoga): शनि-चंद्र युति एवं अवसाद मुक्ति", "शीतलता व शुष्कता का द्वंद्व: शिव पंचाक्षरी उपासना", "shanti", "🪔 वैदिक शांति", "शशिमन्दसमायोगे विषयोगः प्रशाम्यति"),

    # Theme 5: Shodashvarga & Computational Ephemeris (37-43)
    (37, "षष्ट्यंश (D60 Chart): पूर्व जन्म कर्मों का अंतिम न्यायालय", "प्रत्येक 2 मिनट में बदलने वाला सूक्ष्मतम वर्ग चक्र", "ephemeris", "🪐 खगोल गणित", "षष्ट्यंशे सर्वभावानां सूक्ष्मं फलमुदीरितम्"),
    (38, "दशमांश (D10 Chart): करियर, सत्ता व कर्म की पराकाष्ठा", "दशम भाव का विस्तार, अर्थ त्रिकोण व प्रतिष्ठा निर्धारण", "ephemeris", "🪐 खगोल गणित", "दशमांशेन विज्ञेयं महत्कर्म यशस्तथा"),
    (39, "सप्तमांश (D7 Chart): संतान विचार एवं वंश वृद्धि काल", "विषम-सम राशि गणना, संतान लिंग एवं गर्भधारण मुहूर्त", "ephemeris", "🪐 खगोल गणित", "सप्तमांशे सुतानां तु चिन्तनं क्रियते बुधैः"),
    (40, "सत्य चित्रा पक्ष अयनांश: NASA JPL Swiss Ephemeris", "स्पाइका (चित्रा तारा) को 180° पर स्थिर करने का विज्ञान", "ephemeris", "🪐 खगोल गणित", "चित्रातारावकाशेन शुद्धायनांशसाधनम्"),
    (41, "60-टर्म Jean Meeus चंद्र गणित: सूक्ष्म वर्ग चार्ट की शुद्धता", "4-टर्म सरलीकरण से होने वाले 30 कला विचलन का अंत", "ephemeris", "🪐 खगोल गणित", "चन्द्रगतिविभागेन वर्गाणां शुद्धनिश्चयः"),
    (42, "षड्बल (Shadbala): 6-गुना ग्रहीय शक्ति का वैज्ञानिक मापन", "स्थान, दिक्, काल, चेष्टा, नैसर्गिक व दृक् बल की गणना", "ephemeris", "🪐 खगोल गणित", "षड्बलैः संयुतो खेटाः फलदाने समर्थकाः"),
    (43, "भाव चलित बनाम जन्म लग्न: ग्रहों का भाव परिवर्तन", "श्रीपति भाव संधि बनाम संपूर्ण राशि (Whole Sign) पद्धति", "ephemeris", "🪐 खगोल गणित", "भावसंधौ गतः खेटः पूर्वोत्तरफलं दिशेत्"),

    # Theme 6: Dasha Systems, Longevity & Remedial Shanti (44-50)
    (44, "विंशोत्तरी दशा रहस्य: 120 वर्षीय महादशा चक्र का गणित", "चंद्र नक्षत्र शेष, भुक्त-भोग्य काल एवं 365.2425 सौर वर्ष", "ephemeris", "🪐 खगोल गणित", "विंशोत्तरी दशा प्रोक्ता कलौ प्राणिहिताय वै"),
    (45, "जैमिनी चर दशा: राशि दशा द्वारा जीवन परिवर्तनों का समय", "आत्मकारक, अमात्यकारक एवं चर कारक गोचर प्रभाव", "rajyoga", "👑 शास्त्रीय राजयोग", "चरदशाविभागेन राशिफलमनुत्तमम्"),
    (46, "दशरथ कृत शनि स्तोत्र: साढ़े साती का अकाट्य निवारण", "रोहिणी शकट भेदन प्रसंग, शनिमंत्र एवं राजभय मुक्ति", "shanti", "🪔 वैदिक शांति", "नमः कृष्णाय नीलाय शितिकण्ठनिभाय च"),
    (47, "आदित्य हृदय स्तोत्र: सरकारी प्रतिष्ठा एवं सूर्य बल", "अगस्त्य मुनि उपदेश, सूर्य नमस्कार एवं नेत्र-हृदय रक्षण", "shanti", "🪔 वैदिक शांति", "आदित्यहृदयं पुण्यं सर्वशत्रुविनाशनम्"),
    (48, "महामृत्युंजय मंत्र: मारक दशा एवं अकाल मृत्यु निवारण", "द्वितीय-सप्तम मारकेश का शमन एवं प्राण ऊर्जा संवर्धन", "shanti", "🪔 वैदिक शांति", "त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्"),
    (49, "शास्त्र सम्मत ग्रह शांति एवं दान के कठोर नियम", "योगकारक ग्रह का दान क्यों वर्जित है? अनिष्ट से बचाव", "shanti", "🪔 वैदिक शांति", "अनुकूलस्य न त्यागो प्रतिकूलस्य दानकम्"),
    (50, "स्वर विज्ञान एवं ज्योतिष: चंद्र व सूर्य नाड़ी से कार्य सिद्धि", "इड़ा व पिंगला स्वर का मुहूर्त निर्णय एवं दैवज्ञ अनुशासन", "muhurta", "📅 मुहूर्त विज्ञान", "इडायां चन्द्रमा ज्ञेयः पिङ्गलायां दिवाकरः"),
]

def make_svg(blog_id, title, subtitle, cat_key, cat_label, shloka):
    # Palette
    cat_colors = {
        'gochar': ('#8B5CF6', '#A78BFA', '#4C1D95'),
        'ephemeris': ('#3B82F6', '#60A5FA', '#1E3A8A'),
        'rajyoga': ('#F59E0B', '#FCD34D', '#78350F'),
        'vivah': ('#EC4899', '#F472B6', '#831843'),
        'muhurta': ('#10B981', '#34D399', '#064E3B'),
        'shanti': ('#D97706', '#FBBF24', '#78350F'),
    }
    c_prim, c_light, c_dark = cat_colors.get(cat_key, ('#F59E0B', '#FCD34D', '#78350F'))

    # Wrap title if long
    words = title.split(' ')
    line1 = []
    line2 = []
    for w in words:
        if len(' '.join(line1 + [w])) <= 26:
            line1.append(w)
        else:
            line2.append(w)
    title_l1 = ' '.join(line1)
    title_l2 = ' '.join(line2)

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="spaceBg{blog_id}" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#141a29"/>
      <stop offset="60%" stop-color="#0a0d15"/>
      <stop offset="100%" stop-color="#05070a"/>
    </radialGradient>
    <linearGradient id="goldGrad{blog_id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="50%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="badgeGrad{blog_id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c_prim}"/>
      <stop offset="100%" stop-color="{c_dark}"/>
    </linearGradient>
    <filter id="glow{blog_id}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Deep Cosmic Background -->
  <rect width="1200" height="630" fill="url(#spaceBg{blog_id})"/>

  <!-- Cosmic Nebula Glow -->
  <circle cx="850" cy="180" r="320" fill="{c_prim}" opacity="0.12" filter="url(#glow{blog_id})"/>
  <circle cx="350" cy="450" r="280" fill="#f59e0b" opacity="0.08" filter="url(#glow{blog_id})"/>

  <!-- Outer Border Frame -->
  <rect x="25" y="25" width="1150" height="580" rx="16" fill="none" stroke="#d4af37" stroke-width="1.2" opacity="0.35"/>
  <rect x="35" y="35" width="1130" height="560" rx="12" fill="none" stroke="#d4af37" stroke-width="0.6" stroke-dasharray="8,6" opacity="0.2"/>

  <!-- Astrological Geometry Wheels -->
  <g transform="translate(950, 315)" opacity="0.28">
    <circle cx="0" cy="0" r="220" fill="none" stroke="#d4af37" stroke-width="1.5"/>
    <circle cx="0" cy="0" r="170" fill="none" stroke="{c_light}" stroke-width="1" stroke-dasharray="4,4"/>
    <circle cx="0" cy="0" r="120" fill="none" stroke="#d4af37" stroke-width="1.2"/>
    <circle cx="0" cy="0" r="70" fill="none" stroke="{c_light}" stroke-width="0.8"/>
    <!-- 12 Astrological Houses Rays -->
    <line x1="-220" y1="0" x2="220" y2="0" stroke="#d4af37" stroke-width="1" opacity="0.4"/>
    <line x1="0" y1="-220" x2="0" y2="220" stroke="#d4af37" stroke-width="1" opacity="0.4"/>
    <line x1="-155" y1="-155" x2="155" y2="155" stroke="#d4af37" stroke-width="0.8" opacity="0.3"/>
    <line x1="-155" y1="155" x2="155" y2="-155" stroke="#d4af37" stroke-width="0.8" opacity="0.3"/>
    <!-- Sacred Mandala Triangles -->
    <polygon points="0,-160 138,80 -138,80" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="0.5"/>
    <polygon points="0,160 138,-80 -138,-80" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="0.5"/>
  </g>

  <!-- Left Header Branding -->
  <g transform="translate(80, 85)">
    <!-- Brand Pillar -->
    <text x="0" y="0" fill="url(#goldGrad{blog_id})" font-family="'Cinzel', serif, sans-serif" font-size="16" font-weight="700" letter-spacing="3.5">
      SHRI RAMJI ASTRO • शोध पत्रिका • VOL. IV
    </text>
    
    <!-- Category Pill Badge -->
    <g transform="translate(0, 24)">
      <rect x="0" y="0" width="220" height="34" rx="17" fill="url(#badgeGrad{blog_id})"/>
      <text x="110" y="22" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif" font-size="13.5" font-weight="800" text-anchor="middle" letter-spacing="0.5">
        {cat_label}
      </text>
    </g>
  </g>

  <!-- Sanskrit Shloka Quote Pill (Top Right) -->
  <g transform="translate(680, 85)">
    <rect x="0" y="0" width="440" height="42" rx="8" fill="#1e2433" stroke="#d4af37" stroke-width="0.8" opacity="0.9"/>
    <text x="220" y="26" fill="#fde68a" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" font-style="italic" text-anchor="middle">
      “ {shloka} ”
    </text>
  </g>

  <!-- Main Headline -->
  <g transform="translate(80, 240)">
    <text x="0" y="0" fill="#ffffff" font-family="'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5">
      {title_l1}
    </text>
    {f'''<text x="0" y="58" fill="#ffffff" font-family="'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif" font-size="44" font-weight="900" letter-spacing="-0.5">{title_l2}</text>''' if title_l2 else ''}
    
    <!-- Subtitle -->
    <text x="0" y="{120 if title_l2 else 68}" fill="#cbd5e1" font-family="'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif" font-size="21" font-weight="500">
      {subtitle}
    </text>
  </g>

  <!-- Bottom Verification & Authority Bar -->
  <g transform="translate(80, 525)">
    <line x1="0" y1="0" x2="1040" y2="0" stroke="#d4af37" stroke-width="1" opacity="0.3"/>
    
    <!-- Trust Badges -->
    <g transform="translate(0, 28)">
      <circle cx="12" cy="-4" r="8" fill="#10b981"/>
      <path d="M8 -4 L11 -1 L16 -7" fill="none" stroke="#ffffff" stroke-width="2"/>
      <text x="28" y="0" fill="#94a3b8" font-family="'Plus Jakarta Sans', sans-serif" font-size="13.5" font-weight="700">
        बृहत्पाराशर होराशास्त्रम् प्रमाणित (BPHS Verified)
      </text>

      <text x="420" y="0" fill="#94a3b8" font-family="'Plus Jakarta Sans', sans-serif" font-size="13.5" font-weight="600">
        • NASA JPL Swiss Ephemeris (&lt;0.001" Precision)
      </text>

      <text x="820" y="0" fill="url(#goldGrad{blog_id})" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" font-weight="800">
        लेखक: एस्ट्रो रामजी (Founder)
      </text>
    </g>
  </g>
</svg>"""
    return svg

def main():
    print(f"Generating {len(BLOG_METAS)} high-resolution SVG banners...")
    os.makedirs('assets/blogs', exist_ok=True)
    os.makedirs('public/assets/blogs', exist_ok=True)

    for item in BLOG_METAS:
        b_id, title, subtitle, cat_key, cat_label, shloka = item
        svg_content = make_svg(b_id, title, subtitle, cat_key, cat_label, shloka)
        
        file1 = f"assets/blogs/blog-{b_id}.svg"
        file2 = f"public/assets/blogs/blog-{b_id}.svg"
        
        with open(file1, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        with open(file2, 'w', encoding='utf-8') as f:
            f.write(svg_content)
            
    print(f"Successfully generated all {len(BLOG_METAS)} SVG banners in assets/blogs/ and public/assets/blogs/!")

if __name__ == '__main__':
    main()
