/* कालसर्प / सर्प-योग / राहु-केतु रिपोर्ट के नियम — Shri Ramji Astro
 *
 * GENERATED — do not edit. Built from kaalsarpRules.src.js by scripts/build_kaalsarp_rules.py,
 * which copies the shloka text, book, chapter, verse and page of every rule from
 * data/sarpa_rahu_ketu/collection.json. Edit this file or the collection, never kaalsarpRules.js.
 *
 * Input: the patrika engine's calculation { planets: [{ id, sign (0-11), abs (0-360), deg }] }.
 * Output: { rules: [...], remedies: [...] } — each rule says whether it applies, why (in words a
 * reader can check on the chart), and the source it rests on (status: book_verified /
 * etext_unverified / ocr_reconstructed / tradition). Kalasarpa itself is "tradition": no shloka.
 *
 * Strength (बल) is judged by a stated, simple standard because BPHS ch.83 speaks only of
 * "बलवान / निर्बल": weak = debilitated, combust, or in 6/8/12; strong = exalted, own sign or
 * moolatrikona and not combust. The report prints this standard.
 */
(function (root, factory) {
  const exp = factory();
  if (typeof module === 'object' && module.exports) module.exports = exp;
  else root.SRAKaalsarp = exp;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SOURCES = {
 "bj-12.02": {
  "id": "bj-12.02",
  "category": "सर्प (भुजङ्ग) नाभस-योग — परिभाषा",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 12,
  "chapter_title": null,
  "verse": "2",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "रज्जुर् मुशलं नलश् चर आद्यैः सत्यश् च आश्रयज आञ्ज गाद योगान्",
   "केन्द्रैः सद् असद् युतैर् दल आख्यौ स्रक् सर्पौ कथितौ पराशरेण"
  ],
  "arth_hi": "केन्द्रों में शुभ ग्रह हों तो स्रक् (माला) और पाप ग्रह हों तो सर्प — ये दो \"दल\" योग पराशर ने कहे हैं।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bj-12.03": {
  "id": "bj-12.03",
  "category": "सर्प-योग पर मतभेद",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 12,
  "chapter_title": null,
  "verse": "3",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "योगा व्रजन्त्य् आश्रयजाः समत्वं यव अब्ज वज्र अण्डज गोलक आद्यैः",
   "केन्द्र उपगैः प्रोक्त फलौ दल आख्याव् इत्य् आहुर् अन्ये न पृथक् फलौ तौ"
  ],
  "arth_hi": "कुछ आचार्य कहते हैं कि केन्द्रों से बनने वाले दल-योग (माला, सर्प) यव-कमल आदि योगों में समा जाते हैं, उनका अलग फल नहीं होता।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bj-12.11": {
  "id": "bj-12.11",
  "category": "सर्प (भुजङ्ग) योग का फल",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 12,
  "chapter_title": null,
  "verse": "11",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "ईर्ष्युर् विदेश निरतो अध्व रुचिश् च रज्ज्वां मानी धनी च मुशले बहु कृत्य सक्तः",
   "व्यङ्गः स्थिर आढ्य निपुणो नलजः स्रग् उत्थो भोगा अन्वितो भुजगजो बहु दुःख भाक् स्यात्"
  ],
  "arth_hi": "… भुजग (सर्प) योग में जन्मा बहुत दुःख भोगने वाला होता है।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी। \"भुज गजो\" को \"भुजगजो\" पढ़ा।"
 },
 "bj-25.04": {
  "id": "bj-25.04",
  "category": "सर्प-द्रेष्काण से बन्धन में मृत्यु",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 25,
  "chapter_title": null,
  "verse": "4",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "बन्धाद् धी नवमस् तयोर् अशुभयोः सौम्य ग्रहाद् दृष्टयोर् द्रेष्काणैश् च स पाश सर्प निगडैश् छिद्र स्थितैर् बन्धतः",
   "कन्यायाम् अशुभ अन्विते अस्तमयगे चन्द्रे सिते मेषगे सूर्ये लग्न गते च विद्धि मरणं स्त्री हेतुकं मन्दिरे"
  ],
  "arth_hi": "अष्टम में पाश, सर्प या निगड द्रेष्काण हो (और 5वें-9वें में पाप ग्रह, शुभ दृष्टि रहित) तो बन्धन में मृत्यु।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bj-27.12": {
  "id": "bj-27.12",
  "category": "सर्प-द्रेष्काण: कर्क का दूसरा",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 27,
  "chapter_title": null,
  "verse": "12",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "भार्या आभरण अर्थम् अर्णवं नौस्थो गच्छति सर्प वेष्टितः",
   "हैमैश् च युतो विभूषणैश् चिपिट आस्य अङ्त्य गतश् च कर्कटे"
  ],
  "arth_hi": "कर्क के दूसरे द्रेष्काण का रूप \"सर्प से लिपटा\" — यह सर्प-द्रेष्काण है।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bj-27.22": {
  "id": "bj-27.22",
  "category": "सर्प-द्रेष्काण: वृश्चिक का पहला",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 27,
  "chapter_title": null,
  "verse": "22",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "वस्त्रैर् विहीन आभरणैश् च नारी महा समुद्रात् समुपैति कूलम्",
   "स्थान च्युता सर्प निबद्ध पादा मनोरमा वृश्चिक राशि पूर्वः"
  ],
  "arth_hi": "वृश्चिक के पहले द्रेष्काण में स्त्री के पैर सर्प से बँधे — सर्प-द्रेष्काण।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bj-27.23": {
  "id": "bj-27.23",
  "category": "सर्प-द्रेष्काण: वृश्चिक का दूसरा",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 27,
  "chapter_title": null,
  "verse": "23",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "स्थान सुखान्य् अभिवाञ्छति नारी भ ऋतु कृते भुजग आवृत देहा",
   "कच्छप कुम्भ स मान शरीरा वृश्चिक मध्यम रूपम् उशन्ति"
  ],
  "arth_hi": "वृश्चिक के दूसरे द्रेष्काण में देह सर्पों से घिरी — सर्प-द्रेष्काण।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bj-27.36": {
  "id": "bj-27.36",
  "category": "सर्प-द्रेष्काण: मीन का तीसरा",
  "granth": "बृहज्जातक (वराहमिहिर)",
  "edition": "GRETIL e-text (Oriental Books Reprint Corp., 2nd ed. 1979 पर आधारित; पद-विच्छेद रूप में) — https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_varAhamihira-bRhajjAtaka.xml",
  "chapter": 27,
  "chapter_title": null,
  "verse": "36",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "श्वभ्र अन्तिके सर्प निवेष्टित अङ्गा वस्त्रैर् विहीनः पुरुषस् त्व् अटव्याम्",
   "चौर अनल व्याकुलित अन्तर आत्मा विक्रोशते अन्त्य उपगतो झषस्य"
  ],
  "arth_hi": "मीन के तीसरे द्रेष्काण में अंग सर्पों से लिपटे — सर्प-द्रेष्काण।",
  "status": "etext_unverified",
  "check": "पाठ GRETIL से, शब्द अलग-अलग (पद-विच्छेद) — छपी पुस्तक के संहिता-पाठ से मिलाना बाक़ी।"
 },
 "bphs-19-37": {
  "id": "bphs-19-37",
  "category": "BPHS में राहु/केतु/सर्प का उल्लेख (स्वतः खोजा)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 19,
  "chapter_title": "जायाभावफलाध्याय",
  "verse": 37,
  "printed_page": 105,
  "pdf_page": null,
  "text": [
   "कुटुम्बस्थानगो राहुः कलत्रे भौम-संयुते । पाणिग्रहात्तृतीयेऽह्नि सर्पदंशाद् वधूमृतिः ॥"
  ],
  "arth_hi": null,
  "status": "book_verified",
  "check": "अर्थ व नियम अभी लिखा जाना है"
 },
 "bphs-36-23": {
  "id": "bphs-36-23",
  "category": "BPHS में राहु/केतु/सर्प का उल्लेख (स्वतः खोजा)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 36,
  "chapter_title": "नाभसयोगफलाध्याय",
  "verse": 23,
  "printed_page": 206,
  "pdf_page": null,
  "text": [
   "विषमाः क्रूरा निःस्वा नित्यं दुःखार्दिताः सुदीनाश्च । परभक्षपाननिरताः सर्पभवा भवन्ति नराः ॥"
  ],
  "arth_hi": null,
  "status": "book_verified",
  "check": "अर्थ व नियम अभी लिखा जाना है"
 },
 "bphs-36-3": {
  "id": "bphs-36-3",
  "category": "BPHS में राहु/केतु/सर्प का उल्लेख (स्वतः खोजा)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 36,
  "chapter_title": "नाभसयोगफलाध्याय",
  "verse": 3,
  "printed_page": 204,
  "pdf_page": null,
  "text": [
   "रज्जुनामाऽथ मुसलो नलश्चेत्याश्रयत्रयम् । मालाभुजङ्गमौ चेति योगौ ज्ञेयौ दलाभिधौ ॥"
  ],
  "arth_hi": null,
  "status": "book_verified",
  "check": "अर्थ व नियम अभी लिखा जाना है"
 },
 "bphs-36-8": {
  "id": "bphs-36-8",
  "category": "BPHS में राहु/केतु/सर्प का उल्लेख (स्वतः खोजा)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 36,
  "chapter_title": "नाभसयोगफलाध्याय",
  "verse": 8,
  "printed_page": 204,
  "pdf_page": null,
  "text": [
   "शुभैः केन्द्रत्रितयगैः क्रूरैर्वा दलनामकौ । मालाभुजङ्गौ सदसत्फलदौ क्रमशो मतौ ॥"
  ],
  "arth_hi": null,
  "status": "book_verified",
  "check": "अर्थ व नियम अभी लिखा जाना है"
 },
 "bphs-53-30": {
  "id": "bphs-53-30",
  "category": "BPHS में राहु/केतु/सर्प का उल्लेख (स्वतः खोजा)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 53,
  "chapter_title": "रविदशान्तर्दशाध्याय",
  "verse": 30,
  "printed_page": 361,
  "pdf_page": null,
  "text": [
   "द्वि-सप्तस्थे तथा राहौ तत्स्थानाधिपसंयुते । अपमृत्युभयं चैव सर्पभीतिश्च सम्भवेत् ॥"
  ],
  "arth_hi": null,
  "status": "book_verified",
  "check": "अर्थ व नियम अभी लिखा जाना है"
 },
 "bphs-83-10": {
  "id": "bphs-83-10",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "10",
  "printed_page": 625,
  "pdf_page": 659,
  "text": [
   "पुत्रस्थानगते राहौ कुजेन च निरीक्षिते ।",
   "कुजक्षेत्रगते वाऽपि सर्पशापात् सुतक्षयः ॥ १० ॥"
  ],
  "arth_hi": "राहु पंचम में हो और मंगल उसे देखे, या राहु मंगल की राशि (मेष/वृश्चिक) में पंचम में हो — सर्प-शाप से संतान-हानि।",
  "status": "book_verified",
  "check": null
 },
 "bphs-83-11": {
  "id": "bphs-83-11",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "11",
  "printed_page": 625,
  "pdf_page": 659,
  "text": [
   "पुत्रेशे राहुसंयुक्ते पुत्रस्थे भानुनन्दने ।",
   "चन्द्रेक्षितयुते वापि सर्पशापात् सुतक्षयः ॥ ११ ॥"
  ],
  "arth_hi": "पंचमेश राहु के साथ हो, पंचम में शनि हो और उस पर चन्द्रमा की युति या दृष्टि हो।",
  "status": "book_verified",
  "check": null
 },
 "bphs-83-12": {
  "id": "bphs-83-12",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "12",
  "printed_page": 625,
  "pdf_page": 659,
  "text": [
   "कारके राहुसंयुक्ते पुत्रेशे बलवर्जिते ।",
   "लग्नाधिपे सभौमेऽपि सर्पशापात् सुतक्षयः ॥ १२ ॥"
  ],
  "arth_hi": "पुत्रकारक (गुरु) राहु के साथ, पंचमेश निर्बल, और लग्नेश मंगल के साथ हो।",
  "status": "book_verified",
  "check": null
 },
 "bphs-83-13": {
  "id": "bphs-83-13",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "13",
  "printed_page": 625,
  "pdf_page": 659,
  "text": [
   "कारके भौमसंयुक्ते लग्ने चाप्यहिसंयुते ।",
   "पुत्रस्थानेश्वरे दुःस्थे सर्पशापात् सुतक्षयः ॥ १३ ॥"
  ],
  "arth_hi": "पुत्रकारक मंगल के साथ, लग्न में राहु (अहि), और पंचमेश दुःस्थान (6/8/12) में।",
  "status": "book_verified",
  "check": "दूसरी पंक्ति पर स्कैन का watermark है; 2600px पर ज़ूम करके पढ़ी गई।"
 },
 "bphs-83-14": {
  "id": "bphs-83-14",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "14",
  "printed_page": 626,
  "pdf_page": 660,
  "text": [
   "भौमांशे भौमसंयुक्ते पुत्रेशे सोमनन्दने ।",
   "राहुमान्दियुते लग्ने सर्पशापात् सुतक्षयः ॥ १४ ॥"
  ],
  "arth_hi": "पंचमेश बुध हो, मंगल के नवांश में और मंगल के साथ; लग्न में राहु और मान्दि (गुलिक) हों।",
  "status": "book_verified",
  "check": null
 },
 "bphs-83-15": {
  "id": "bphs-83-15",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "15",
  "printed_page": 626,
  "pdf_page": 660,
  "text": [
   "पुत्रस्थाने कुजक्षेत्रे पुत्रेशे राहुणान्विते ।",
   "सौम्यदृष्टे युते वाऽपि सर्पशापात् सुतक्षयः ॥ १५ ॥"
  ],
  "arth_hi": "पंचम भाव मंगल की राशि (मेष/वृश्चिक) हो, पंचमेश राहु के साथ हो और उस पर बुध (सौम्य) की दृष्टि या युति हो।",
  "status": "book_verified",
  "check": "यहाँ \"सौम्य\" = बुध (टीका भी बुध कहती है)।"
 },
 "bphs-83-16": {
  "id": "bphs-83-16",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "16",
  "printed_page": 626,
  "pdf_page": 660,
  "text": [
   "पुत्रस्था भानुमन्दाराः स्वर्भानुः शशिजोऽङ्गिराः ।",
   "निर्बलौ पुत्रलग्नेशौ सर्पशापात् सुतक्षयः ॥ १६ ॥"
  ],
  "arth_hi": "पंचम में सूर्य, शनि, मंगल, राहु, बुध, गुरु हों और पंचमेश तथा लग्नेश निर्बल हों।",
  "status": "book_verified",
  "check": null
 },
 "bphs-83-17": {
  "id": "bphs-83-17",
  "category": "सर्प-शाप से सुतक्षय",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "17",
  "printed_page": 626,
  "pdf_page": 660,
  "text": [
   "लग्नेशे राहुसंयुक्ते पुत्रेशे भौमसंयुते ।",
   "कारके राहुसहिते सर्पशापात् सुतक्षयः ॥ १७ ॥"
  ],
  "arth_hi": "लग्नेश राहु के साथ, पंचमेश मंगल के साथ, और पुत्रकारक भी राहु के साथ।",
  "status": "book_verified",
  "check": null
 },
 "bphs-83-18-20": {
  "id": "bphs-83-18-20",
  "category": "सर्प-शाप की शान्ति (नागपूजा)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "18–20",
  "printed_page": 626,
  "pdf_page": 660,
  "text": [
   "नभोगयोगतः पुंसां ज्ञात्वैवमनपत्यताम् ।",
   "तद्दोषपरिहारार्थं नागपूजां समाचरेत् ॥ १८ ॥",
   "स्वगृह्योक्तविधानेन प्रतिष्ठां कारयेत् सुधीः ।",
   "नागमूर्त्तिं सुवर्णेन कृत्वा पूजां समाचरेत् ॥ १९ ॥",
   "गोभूतिलहिरण्यादि दद्याद् वित्तानुसारतः ।",
   "एवं कृते तु नागेन्द्र-प्रसादाद् वर्धते कुलम् ॥ २० ॥"
  ],
  "arth_hi": "ऐसे ग्रह-योग से संतान-बाधा जानकर दोष-निवारण के लिए नागपूजा करें: अपने गृह्यसूत्र की विधि से सोने की नाग-मूर्ति बनाकर प्रतिष्ठा व पूजा करें, और सामर्थ्य के अनुसार गौ, भूमि, तिल, स्वर्ण आदि का दान करें। इससे नागराज की कृपा से वंश बढ़ता है।",
  "status": "book_verified",
  "check": "पुस्तक में अध्याय-शीर्षक पर \"॥ ७४ ॥\" छपा है, जबकि अनुक्रम में यह 83वाँ अध्याय है (82 के बाद, 84 से पहले) — छपाई की भूल लगती है।"
 },
 "bphs-83-8-9": {
  "id": "bphs-83-8-9",
  "category": "अनपत्य योग (राहु सहित)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 83,
  "chapter_title": "पूर्वजन्मशापवर्णनाध्याय",
  "verse": "8–9",
  "printed_page": 625,
  "pdf_page": 659,
  "text": [
   "गुरुलग्नेशदारेश-पुत्रस्थानाधिपेषु च ।",
   "सर्वेषु बलहीनेषु वक्तव्या त्वनपत्यता ॥ ८ ॥",
   "रव्याररराहुशनयो बलिनः पञ्चमे स्थिताः ।",
   "जातस्तदाऽनपत्यः स्यान्निर्बला यदि कारकाः ॥ ९ ॥"
  ],
  "arth_hi": "गुरु, लग्नेश, सप्तमेश और पंचमेश सब निर्बल हों तो संतान-हीनता कहें। पंचम में सूर्य, मंगल, राहु, शनि बलवान हों और पुत्रकारक निर्बल हों, तब भी।",
  "status": "book_verified",
  "check": null
 },
 "bphs-85-12": {
  "id": "bphs-85-12",
  "category": "राहु का ध्यान-स्वरूप",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "12",
  "printed_page": 645,
  "pdf_page": 679,
  "text": [
   "भयावहमुखो वर्म-त्रिशूलासिधरोऽशुभः ।",
   "सिंहारूढः सुनीलाभः स्वर्भानुर्वरदो मतः ॥ १२ ॥"
  ],
  "arth_hi": "राहु: भयानक मुख, कवच, त्रिशूल और खड्ग धारी, सिंह पर सवार, गहरे नीले वर्ण के, वर देने वाले।",
  "status": "book_verified",
  "check": null
 },
 "bphs-85-13": {
  "id": "bphs-85-13",
  "category": "केतु का ध्यान-स्वरूप",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "13",
  "printed_page": 645,
  "pdf_page": 679,
  "text": [
   "सगदा विवृतास्याश्च द्विभुजा धूम्रवर्णिनः ।",
   "केतवो वरदा गृध्र-वाहनाः स्युर्विदां मताः ॥ १३ ॥"
  ],
  "arth_hi": "केतु: गदाधारी, खुले मुख वाले, दो भुजा, धुएँ जैसे वर्ण के, गिद्ध पर सवार, वर देने वाले।",
  "status": "book_verified",
  "check": null
 },
 "bphs-85-17-20": {
  "id": "bphs-85-17-20",
  "category": "राहु-केतु जप संख्या",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "17–20",
  "printed_page": 646,
  "pdf_page": 680,
  "text": [
   "सूर्यादीनां नभोगानां मन्त्रै-र्विप्रेन्द्र ! वैदिकैः ।",
   "पौराणिकैर्वा विधिवद् मौनं तु जपमाचरेत् ॥ १७ ॥",
   "रवेर्नगास्तद्वदिन्दो रुद्रा, दश कुजस्य वै ।",
   "बुधस्य नन्दा वचसां-पतेरेकोनविंशतिः ॥ १८ ॥",
   "भृगोस्तु षोडश तथा अधिका विंशतिः शनेः ।",
   "राहोरष्टेन्दवः केतो-र्नगेन्दव इमाः पुनः ॥ १९ ॥",
   "सहस्रगुणिता लब्धसंख्यकं जपमाचरेत् ।",
   "जपानुष्ठानतः खेटाः प्रीताः शुभफलप्रदाः ॥ २० ॥"
  ],
  "arth_hi": "ग्रहों के वैदिक या पौराणिक मंत्र का मौन होकर जप करें। राहु के लिए 18 और केतु के लिए 17 — इन्हें हज़ार से गुणा करें: राहु 18,000, केतु 17,000 जप।",
  "status": "book_verified",
  "check": "श्लोक में बुध की संख्या \"नन्दा\" (9) है और टीका की सूची में भी 9; पर टीका के उदाहरण में \"बुध 7000\" छपा है — छपाई की भूल। राहु-केतु की संख्या में कोई भेद नहीं।"
 },
 "bphs-85-21-23": {
  "id": "bphs-85-21-23",
  "category": "राहु-केतु की समिधा",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "21–23",
  "printed_page": 647,
  "pdf_page": 681,
  "text": [
   "सूर्यस्यार्कः पलाशश्च विधोर्भूनन्दस्य तु ।",
   "खदिरोऽथ बुधस्यैव-मपामार्ग उदीरितः ॥ २१ ॥",
   "पिप्पलो हि गुरोर्जन्तु-फलः शुक्रस्य सम्मतः ।",
   "शनेः शमी त्वहेर्दूर्वा, कुशाः केतोः समित् स्मृता ॥ २२ ॥",
   "ससर्पिर्मधुना दध्ना जुहुयात् पयसाऽपि वा ।",
   "अष्टोत्तरशतं वापि मनुयुक्प्रमितं बुधः ॥ २३ ॥"
  ],
  "arth_hi": "हवन की समिधा: राहु (अहि) की दूर्वा, केतु की कुशा। घी, मधु, दही या दूध के साथ 108 या 28 आहुति।",
  "status": "book_verified",
  "check": null
 },
 "bphs-85-26": {
  "id": "bphs-85-26",
  "category": "राहु-केतु की दक्षिणा",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "26",
  "printed_page": 647,
  "pdf_page": 681,
  "text": [
   "धेनुकम्बुवृषस्वर्ण-वस्त्राश्वाऽसितधेनवः ।",
   "लौहच्छागौ च गदिता ग्रहाणां दक्षिणाः क्रमात् ॥ २६ ॥"
  ],
  "arth_hi": "नवग्रहों की दक्षिणा क्रम से — राहु के लिए लोहा, केतु के लिए छाग (बकरा)।",
  "status": "book_verified",
  "check": null
 },
 "bphs-85-27-28": {
  "id": "bphs-85-27-28",
  "category": "दुःस्थ ग्रह की शान्ति",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "27–28",
  "printed_page": 647,
  "pdf_page": 681,
  "text": [
   "दुष्टस्थानस्थितं खेटं जपहोमादिपूजनैः ।",
   "विप्राणां भोजनैर्दानै-र्यत्नतः शान्तयेद् बुधः ॥ २७ ॥",
   "ग्रहेऽनुकूले मनुजाः सुखिनोऽभ्युन्नताः सदा ।",
   "प्रतिकूले दुःखभाज-स्तस्मात्तान् परिपूजयेत् ॥ २८ ॥"
  ],
  "arth_hi": "बुरे स्थान में बैठे ग्रह को जप, होम, पूजन, ब्राह्मण-भोजन और दान से यत्नपूर्वक शान्त करें; ग्रह अनुकूल हों तो मनुष्य सुखी, प्रतिकूल हों तो दुःखी — इसलिए उनकी पूजा करें।",
  "status": "book_verified",
  "check": "श्लोक 28 की दूसरी पंक्ति पर watermark है।"
 },
 "bphs-85-4-5": {
  "id": "bphs-85-4-5",
  "category": "राहु-केतु की प्रतिमा (धातु)",
  "granth": "बृहत्पाराशरहोराशास्त्र",
  "edition": "बृहत्पाराशरहोराशास्त्रम् (सुधा टीका, पं. देवचन्द्र झा, काशी संस्कृत ग्रन्थमाला 220, चौखम्बा)",
  "chapter": 85,
  "chapter_title": "ग्रहशान्त्यध्याय",
  "verse": "4–5",
  "printed_page": 644,
  "pdf_page": 678,
  "text": [
   "नवग्रहाकृतीस्ताम्र-स्फटिकारुणचन्दनैः ।",
   "स्वर्णस्वर्णराजतायः-शीशकांस्यैः क्रमाद् बुधः ॥ ४ ॥",
   "रचयेद् ग्रहवर्णैर्वा पट्टवस्त्रेऽथ विन्यसेत् ।",
   "तत्तद्ग्रहोक्तासु दिक्षु मन्त्रोच्चारणपूर्वकम् ॥ ५ ॥"
  ],
  "arth_hi": "नवग्रहों की मूर्ति क्रम से ताँबा, स्फटिक, लाल चन्दन, सोना, सोना, चाँदी, लोहा, सीसा, काँसा से बनाएँ — अर्थात् राहु की सीसे (शीश) की और केतु की काँसे की; या ग्रह के रंग से रेशमी वस्त्र पर बनाकर उसकी दिशा में स्थापित करें।",
  "status": "book_verified",
  "check": "श्लोक 5 की दूसरी पंक्ति पर watermark है।"
 },
 "modern-rath-kalasarpa": {
  "id": "modern-rath-kalasarpa",
  "category": "कालसर्प (आधुनिक लेखक)",
  "granth": "Crux of Vedic Astrology — Timing of Events (संजय रथ)",
  "edition": "आपकी PDF, पृष्ठ 115",
  "chapter": null,
  "chapter_title": null,
  "verse": null,
  "printed_page": null,
  "pdf_page": null,
  "text": [],
  "arth_hi": "उदाहरण-कुंडली में लेखक लिखते हैं कि केन्द्र का गुरु कालसर्प योग को तोड़कर \"महापद्म\" योग बनाता है। (आधुनिक मत, श्लोक-प्रमाण नहीं)",
  "status": "modern",
  "check": null
 },
 "ms-sarpadansha": {
  "id": "ms-sarpadansha",
  "category": "सर्पदंश योग",
  "granth": "मानसागरी",
  "edition": "मानसागरी — पं. सीताराम झा की हिन्दी व्याख्या सहित (archive.org OCR)",
  "chapter": null,
  "chapter_title": "योगायोगफल-निरूपण",
  "verse": "10",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "लग्नाच्च सप्तमस्थाने शन्यर्कौ राहुसंयुतौ ।",
   "सर्पेण बाधा तस्योक्ता शय्यायां स्वपितोऽपि च ॥ १० ॥"
  ],
  "arth_hi": "लग्न से सप्तम भाव में शनि, सूर्य और राहु तीनों हों तो पलंग पर सोते हुए भी सर्प से बाधा (सर्पदंश का भय)।",
  "status": "ocr_reconstructed",
  "check": "OCR \"शन्यको राहसंय॒तौ\" को \"शन्यर्कौ राहुसंयुतौ\" पढ़ा; अध्याय-संख्या देखनी है।"
 },
 "pd-12-22": {
  "id": "pd-12-22",
  "category": "सर्प-शाप (संतान-बाधा)",
  "granth": "फलदीपिका (मन्त्रेश्वर)",
  "edition": "फलदीपिका (मन्त्रेश्वर) — archive.org के दो OCR पाठों (पं. गोपेश कुमार ओझा, हिन्दी; वी. सुब्रह्मण्य शास्त्री) से मिलाकर पढ़ा",
  "chapter": 12,
  "chapter_title": "पुत्रभावफल",
  "verse": "22",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "स्वर्भानौ सुतगे सुतेशसहिते सर्पस्य शापात्तथा",
   "केतौ ब्राह्मणशापतश्च गुलिके प्रेतोत्थशापं वदेत् ।"
  ],
  "arth_hi": "राहु पंचम में हो या पंचमेश के साथ हो (और संतान-बाधा दिखे) तो सर्प के शाप से; केतु से हो तो ब्राह्मण-शाप से; गुलिक से हो तो प्रेत-शाप से।",
  "status": "ocr_reconstructed",
  "check": "OCR से पुनर्निर्मित; श्लोक का दूसरा आधा (शुक्र-चन्द्र-गुलिक, गुरु/केतु-मान्दि) अभी छोड़ा है। पुस्तक से मिलाना बाक़ी।"
 },
 "pd-12-24": {
  "id": "pd-12-24",
  "category": "सर्प-शाप की शान्ति",
  "granth": "फलदीपिका (मन्त्रेश्वर)",
  "edition": "फलदीपिका (मन्त्रेश्वर) — archive.org के दो OCR पाठों (पं. गोपेश कुमार ओझा, हिन्दी; वी. सुब्रह्मण्य शास्त्री) से मिलाकर पढ़ा",
  "chapter": 12,
  "chapter_title": "पुत्रभावफल",
  "verse": "24",
  "printed_page": null,
  "pdf_page": null,
  "text": [],
  "arth_hi": "संतान-बाधा के दोष की शान्ति के लिए सेतु-स्नान, सत्कथा, शिव-पूजा, विष्णु-व्रत, दान, श्राद्ध और नाग-प्रतिमा की प्रतिष्ठा आदि।",
  "status": "ocr_reconstructed",
  "check": "श्लोक का पाठ OCR में बहुत टूटा है — केवल अर्थ लिया; पुस्तक से श्लोक उतारना बाक़ी।"
 },
 "pd-20-36": {
  "id": "pd-20-36",
  "category": "राहु जिस ग्रह के साथ हो",
  "granth": "फलदीपिका (मन्त्रेश्वर)",
  "edition": "फलदीपिका (मन्त्रेश्वर) — archive.org के दो OCR पाठों (पं. गोपेश कुमार ओझा, हिन्दी; वी. सुब्रह्मण्य शास्त्री) से मिलाकर पढ़ा",
  "chapter": 20,
  "chapter_title": "अन्तर्दशाफल",
  "verse": "36 (शास्त्री संस्करण में 29)",
  "printed_page": null,
  "pdf_page": null,
  "text": [
   "येन ग्रहेण सहितो भुजगाधिनाथस्तत्खेटजातगुणदोषफलानि कुर्यात् ।",
   "सर्पान्वितः स तु खगः शुभदोऽपि कष्टं दुःखं दशान्त्यसमये कुरुते विशेषात् ॥"
  ],
  "arth_hi": "राहु जिस ग्रह के साथ बैठता है उसी के गुण-दोष का फल देता है; और राहु से युक्त ग्रह शुभ होकर भी अपनी दशा के अन्त में विशेष कष्ट देता है।",
  "status": "ocr_reconstructed",
  "check": "दो OCR पाठ मिलाकर पढ़ा; श्लोक-संख्या दोनों संस्करणों में अलग।"
 },
 "tradition-kalasarpa": {
  "id": "tradition-kalasarpa",
  "category": "कालसर्प योग (परंपरा)",
  "granth": "लोक-परंपरा / आधुनिक ज्योतिष-पुस्तकें",
  "edition": null,
  "chapter": null,
  "chapter_title": null,
  "verse": null,
  "printed_page": null,
  "pdf_page": null,
  "text": [],
  "arth_hi": "सभी सात ग्रह राहु और केतु के बीच एक ओर हों तो कालसर्प; एक ग्रह बाहर हो तो आंशिक। राहु जिस भाव में हो उसके अनुसार 12 नाम: 1 अनन्त, 2 कुलिक, 3 वासुकि, 4 शंखपाल, 5 पद्म, 6 महापद्म, 7 तक्षक, 8 कर्कोटक, 9 शंखचूड़, 10 घातक, 11 विषधर, 12 शेषनाग।",
  "status": "tradition",
  "check": "बृहत्पाराशर (98 अध्याय), बृहज्जातक, फलदीपिका, जातक पारिजात, मानसागरी के उपलब्ध पाठों में \"कालसर्प\" शब्द नहीं मिला (OCR की सीमा के साथ)। इसके लिए कोई श्लोक नहीं लिखा जाएगा।"
 }
};

  const SIGN_HI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुम्भ', 'मीन'];
  const P_HI = { Sun: 'सूर्य', Moon: 'चन्द्र', Mars: 'मंगल', Mercury: 'बुध', Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु', Mandi: 'मान्दि' };
  const LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
  const EXALT = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 };
  const DEBIL = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0 };
  const MOOLA = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10 };
  const OWN = { Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10] };
  const COMBUST = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 15 };
  // Parashari special aspects (houses counted from the planet, inclusive); everyone aspects the 7th
  const ASPECTS = { Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10] };
  const NAMES = ['अनन्त', 'कुलिक', 'वासुकि', 'शंखपाल', 'पद्म', 'महापद्म', 'तक्षक', 'कर्कोटक', 'शंखचूड़', 'घातक', 'विषधर', 'शेषनाग'];
  // Sarpa (vyala) drekkanas — Brihajjataka 27: Cancer 2nd, Scorpio 1st & 2nd, Pisces 3rd
  const SARPA_DREKKANA = [[3, 1], [7, 0], [7, 1], [11, 2]];
  const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

  function chart(calc) {
    if (!calc || !Array.isArray(calc.planets)) throw new Error('kundali data missing');
    const P = {};
    calc.planets.forEach(p => {
      const abs = (typeof p.abs === 'number') ? ((p.abs % 360) + 360) % 360
        : ((p.sign || 0) * 30 + (p.deg || 0));
      P[p.id] = { id: p.id, abs, sign: Math.floor(abs / 30), deg: abs % 30 };
    });
    if (!P.Lagna) throw new Error('lagna missing');
    if (P.Rahu && !P.Ketu) { const a = (P.Rahu.abs + 180) % 360; P.Ketu = { id: 'Ketu', abs: a, sign: Math.floor(a / 30), deg: a % 30 }; }
    const L = P.Lagna.sign;
    const house = id => P[id] ? ((P[id].sign - L + 12) % 12) + 1 : null;
    const signOfHouse = h => (L + h - 1) % 12;
    const lordOf = h => LORD[signOfHouse(h)];
    const resolve = id => /^L\d+$/.test(id) ? lordOf(+id.slice(1)) : id;
    const conj = (a, b) => { a = resolve(a); b = resolve(b); return a !== b && P[a] && P[b] && P[a].sign === P[b].sign; };
    const aspects = (by, target) => {
      by = resolve(by); target = resolve(target);
      if (!P[by] || !P[target] || by === target) return false;
      const d = ((P[target].sign - P[by].sign + 12) % 12) + 1;
      return (ASPECTS[by] || [7]).includes(d);
    };
    const combust = id => {
      if (!COMBUST[id] || !P.Sun || !P[id]) return false;
      const d = Math.abs(((P[id].abs - P.Sun.abs + 540) % 360) - 180);
      return d < COMBUST[id];
    };
    const dignity = id => {
      const s = P[id] && P[id].sign;
      if (s === undefined || EXALT[id] === undefined) return '';
      if (s === EXALT[id]) return 'उच्च';
      if (s === DEBIL[id]) return 'नीच';
      if (s === MOOLA[id]) return 'मूलत्रिकोण';
      if ((OWN[id] || []).includes(s)) return 'स्वराशि';
      return '';
    };
    const weak = id => { id = resolve(id); return dignity(id) === 'नीच' || combust(id) || [6, 8, 12].includes(house(id)); };
    const strong = id => { id = resolve(id); return ['उच्च', 'स्वराशि', 'मूलत्रिकोण'].includes(dignity(id)) && !combust(id); };
    const name = id => { const r = resolve(id); return P_HI[r] || r; };
    const where = id => { const r = resolve(id); return P[r] ? `${P_HI[r]} ${house(r)}वें भाव (${SIGN_HI[P[r].sign]}) में` : `${P_HI[r] || r} (स्थिति उपलब्ध नहीं)`; };
    const weakWhy = id => {
      const r = resolve(id), why = [];
      if (dignity(r) === 'नीच') why.push('नीच राशि'); if (combust(r)) why.push('अस्त'); if ([6, 8, 12].includes(house(r))) why.push(`${house(r)}वें भाव में`);
      return why.join(', ');
    };
    return { P, L, house, signOfHouse, lordOf, resolve, conj, aspects, combust, dignity, weak, strong, name, where, weakWhy };
  }

  // ---------- Kalasarpa (tradition) ----------
  function kalasarpa(c) {
    const { P } = c;
    if (!P.Rahu) return { applies: false, why: 'राहु की स्थिति उपलब्ध नहीं' };
    let a = 0, b = 0, onAxis = [];
    SEVEN.forEach(id => {
      if (!P[id]) return;
      const d = (P[id].abs - P.Rahu.abs + 360) % 360;
      if (d === 0 || d === 180) onAxis.push(id); else if (d < 180) a++; else b++;
    });
    const full = (a === 7 || b === 7);
    const partial = !full && (a === 6 || b === 6);
    const rh = c.house('Rahu');
    const side = a >= b ? 'राहु से केतु की ओर (राशि-चक्र के क्रम में)' : 'केतु से राहु की ओर (राशि-चक्र के क्रम में)';
    const outside = SEVEN.filter(id => {
      const d = (P[id].abs - P.Rahu.abs + 360) % 360; return a >= b ? d > 180 : d < 180;
    });
    return {
      applies: full || partial, full, partial, name: NAMES[rh - 1], rahuHouse: rh, side,
      why: full ? `सातों ग्रह राहु-केतु अक्ष के एक ही ओर (${side}) हैं; राहु ${rh}वें भाव में — "${NAMES[rh - 1]}" कालसर्प।`
        : partial ? `छह ग्रह एक ओर हैं, ${outside.map(x => P_HI[x]).join(', ')} दूसरी ओर — आंशिक कालसर्प (राहु ${rh}वें भाव में, "${NAMES[rh - 1]}")।`
          : `ग्रह राहु-केतु के दोनों ओर बँटे हैं (${a} और ${b}) — कालसर्प नहीं बनता।`
    };
  }

  // ---------- rules ----------
  // each: id, title, source ids, test(c) -> { applies, why }
  const RULES = [
    { id: 'kalasarpa', title: 'कालसर्प योग (परंपरा)', src: ['tradition-kalasarpa', 'modern-rath-kalasarpa'], group: 'परंपरा',
      test: c => kalasarpa(c) },
    { id: 'sarpa-nabhasa', title: 'सर्प (भुजङ्ग) नाभस-योग', src: ['bphs-36-3', 'bphs-36-8', 'bphs-36-23', 'bj-12.02', 'bj-12.11', 'bj-12.03'], group: 'शास्त्रीय योग',
      test: c => {
        const kendra = [1, 4, 7, 10];
        const mal = ['Sun', 'Mars', 'Saturn'].filter(id => kendra.includes(c.house(id)));
        const malHouses = [...new Set(mal.map(c.house))];
        const ben = ['Moon', 'Mercury', 'Jupiter', 'Venus'].filter(id => kendra.includes(c.house(id)));
        const applies = malHouses.length >= 3 && ben.length === 0;
        return { applies, why: applies
          ? `तीन केन्द्रों में पाप ग्रह — ${mal.map(c.where).join('; ')} — और किसी केन्द्र में शुभ ग्रह नहीं।`
          : `केन्द्रों में पाप ग्रह ${malHouses.length ? mal.map(c.where).join('; ') : 'नहीं'}${ben.length ? `; शुभ ग्रह भी केन्द्र में: ${ben.map(id => P_HI[id]).join(', ')}` : ''} — तीन केन्द्र केवल पाप ग्रहों से नहीं भरे।` };
      },
      note: 'पाप ग्रह = सूर्य, मंगल, शनि; शुभ = चन्द्र, बुध, गुरु, शुक्र। बृहज्जातक 12.3 के अनुसार कुछ आचार्य इस योग का अलग फल नहीं मानते।' },
    { id: 'sarpa-shapa-10', title: 'सर्प-शाप: पंचम में राहु पर मंगल', src: ['bphs-83-10'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const in5 = c.house('Rahu') === 5, asp = c.aspects('Mars', 'Rahu'), marsSign = [0, 7].includes(c.P.Rahu.sign);
        return { applies: in5 && (asp || marsSign), why: in5 ? `राहु पंचम में (${SIGN_HI[c.P.Rahu.sign]}); मंगल की दृष्टि ${asp ? 'है' : 'नहीं'}; राशि मंगल की ${marsSign ? 'है' : 'नहीं'}।` : `राहु पंचम में नहीं (${c.house('Rahu')}वें भाव में)।` };
      } },
    { id: 'sarpa-shapa-11', title: 'सर्प-शाप: पंचमेश-राहु, पंचम में शनि पर चन्द्र', src: ['bphs-83-11'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('L5', 'Rahu'), s5 = c.house('Saturn') === 5, m = c.conj('Moon', 'Saturn') || c.aspects('Moon', 'Saturn');
        return { applies: a && s5 && m, why: `पंचमेश (${c.name('L5')}) राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; शनि पंचम में: ${s5 ? 'हाँ' : 'नहीं'}; शनि पर चन्द्र की युति/दृष्टि: ${m ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-12', title: 'सर्प-शाप: गुरु-राहु, पंचमेश निर्बल, लग्नेश-मंगल', src: ['bphs-83-12'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('Jupiter', 'Rahu'), w = c.weak('L5'), m = c.resolve('L1') === 'Mars' || c.conj('L1', 'Mars');
        return { applies: a && w && m, why: `गुरु राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; पंचमेश निर्बल: ${w ? 'हाँ (' + c.weakWhy('L5') + ')' : 'नहीं'}; लग्नेश मंगल के साथ: ${m ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-13', title: 'सर्प-शाप: गुरु-मंगल, लग्न में राहु, पंचमेश दुःस्थान में', src: ['bphs-83-13'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('Jupiter', 'Mars'), r = c.house('Rahu') === 1, d = [6, 8, 12].includes(c.house(c.resolve('L5')));
        return { applies: a && r && d, why: `गुरु मंगल के साथ: ${a ? 'हाँ' : 'नहीं'}; राहु लग्न में: ${r ? 'हाँ' : 'नहीं'}; पंचमेश ${c.house(c.resolve('L5'))}वें भाव में।` };
      } },
    { id: 'sarpa-shapa-14', title: 'सर्प-शाप: पंचमेश बुध मंगल के साथ, लग्न में राहु-मान्दि', src: ['bphs-83-14'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const merc = c.resolve('L5') === 'Mercury', mm = c.conj('Mercury', 'Mars'), r = c.house('Rahu') === 1;
        const mandi = c.P.Mandi ? c.house('Mandi') === 1 : null;
        const nav = c.P.Mercury ? [0, 7].includes(navamsa(c.P.Mercury.abs)) : false;
        return { applies: merc && mm && nav && r && mandi === true, why: `पंचमेश बुध: ${merc ? 'हाँ' : 'नहीं'}; बुध मंगल के साथ: ${mm ? 'हाँ' : 'नहीं'}; बुध मंगल के नवांश में: ${nav ? 'हाँ' : 'नहीं'}; लग्न में राहु: ${r ? 'हाँ' : 'नहीं'}; लग्न में मान्दि: ${mandi === null ? 'मान्दि की गणना उपलब्ध नहीं' : mandi ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-15', title: 'सर्प-शाप: पंचम मंगल-राशि, पंचमेश-राहु पर बुध', src: ['bphs-83-15'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const s = [0, 7].includes(c.signOfHouse(5)), a = c.conj('L5', 'Rahu'), m = c.conj('L5', 'Mercury') || c.aspects('Mercury', 'L5') || c.resolve('L5') === 'Mercury';
        return { applies: s && a && m, why: `पंचम भाव ${SIGN_HI[c.signOfHouse(5)]}; पंचमेश राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; उस पर बुध की युति/दृष्टि: ${m ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-16', title: 'सर्प-शाप: पंचम में छह ग्रह, पंचमेश-लग्नेश निर्बल', src: ['bphs-83-16'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const six = ['Sun', 'Saturn', 'Mars', 'Rahu', 'Mercury', 'Jupiter'], inn = six.filter(id => c.house(id) === 5);
        const w = c.weak('L5') && c.weak('L1');
        return { applies: inn.length === 6 && w, why: `पंचम में इनमें से ${inn.length ? inn.map(id => P_HI[id]).join(', ') : 'कोई नहीं'}; पंचमेश व लग्नेश दोनों निर्बल: ${w ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-17', title: 'सर्प-शाप: लग्नेश-राहु, पंचमेश-मंगल, गुरु-राहु', src: ['bphs-83-17'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.conj('L1', 'Rahu'), b = c.resolve('L5') === 'Mars' ? false : c.conj('L5', 'Mars'), g = c.conj('Jupiter', 'Rahu');
        return { applies: a && b && g, why: `लग्नेश राहु के साथ: ${a ? 'हाँ' : 'नहीं'}; पंचमेश मंगल के साथ: ${b ? 'हाँ' : 'नहीं'}; गुरु राहु के साथ: ${g ? 'हाँ' : 'नहीं'}।` };
      } },
    { id: 'sarpa-shapa-pd', title: 'सर्प-शाप (फलदीपिका): पंचम में राहु या पंचमेश-राहु', src: ['pd-12-22'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const a = c.house('Rahu') === 5, b = c.conj('L5', 'Rahu');
        return { applies: a || b, why: a ? `राहु पंचम भाव (${SIGN_HI[c.P.Rahu.sign]}) में है।` : b ? `पंचमेश (${c.name('L5')}) राहु के साथ है।` : 'राहु न पंचम में है, न पंचमेश के साथ।' };
      },
      note: 'मन्त्रेश्वर यह शाप तभी कहते हैं जब कुंडली में संतान-बाधा के दूसरे लक्षण भी हों — अकेले इस योग से संतान-हानि न कहें।' },
    { id: 'sarpa-dansha-ms', title: 'सर्पदंश योग (मानसागरी)', src: ['ms-sarpadansha'], group: 'सर्प-भय',
      test: c => {
        const x = ['Saturn', 'Sun', 'Rahu'].filter(id => c.house(id) === 7);
        return { applies: x.length === 3, why: `सप्तम भाव में ${x.length ? x.map(id => P_HI[id]).join(', ') : 'इनमें से कोई नहीं'} (योग के लिए शनि, सूर्य, राहु तीनों चाहिए)।` };
      } },
    { id: 'sarpa-dansha-bphs-19', title: 'सर्पदंश-भय (BPHS 19.37): द्वितीय में राहु, सप्तम में मंगल', src: ['bphs-19-37'], group: 'सर्प-भय',
      test: c => {
        const a = c.house('Rahu') === 2, b = c.house('Mars') === 7;
        return { applies: a && b, why: `राहु दूसरे भाव में: ${a ? 'हाँ' : 'नहीं'}; मंगल सप्तम में: ${b ? 'हाँ' : 'नहीं'}।` };
      },
      note: 'यह शास्त्र-वचन है, निश्चित भविष्यवाणी नहीं; विवाह-मिलान में पूरी कुंडली देखकर ही विचार करें।' },
    { id: 'sarpa-bhaya-dasha', title: 'सूर्य-दशा में राहु-अन्तर: सर्प-भय (BPHS 53.30)', src: ['bphs-53-30'], group: 'सर्प-भय',
      test: c => {
        const h = c.house('Rahu'), a = [2, 7].includes(h), b = c.conj('Rahu', 'L2') || c.conj('Rahu', 'L7');
        return { applies: a || b, why: a ? `राहु ${h}वें भाव में — सूर्य महादशा में राहु की अन्तर्दशा के समय सावधानी।` : b ? 'राहु द्वितीय/सप्तम के स्वामी के साथ — सूर्य महादशा में राहु की अन्तर्दशा के समय सावधानी।' : `राहु ${h}वें भाव में, द्वितीय-सप्तम से सम्बन्ध नहीं।` };
      } },
    { id: 'sarpa-drekkana', title: 'लग्न या अष्टम में सर्प-द्रेष्काण', src: ['bj-27.12', 'bj-27.22', 'bj-27.23', 'bj-27.36', 'bj-25.04'], group: 'सर्प-द्रेष्काण',
      test: c => {
        const dk = abs => [Math.floor(abs / 30), Math.floor((abs % 30) / 10)];
        const isS = ([s, d]) => SARPA_DREKKANA.some(([a, b]) => a === s && b === d);
        const lag = isS(dk(c.P.Lagna.abs));
        // the 22nd drekkana from the lagna drekkana = the same drekkana-part of the 8th sign
        const l = dk(c.P.Lagna.abs), eighth = [(l[0] + 7) % 12, l[1]], e = isS(eighth);
        const nm = ([s, d]) => `${SIGN_HI[s]} का ${['पहला', 'दूसरा', 'तीसरा'][d]} द्रेष्काण`;
        return { applies: lag || e, why: `लग्न: ${nm(l)}${lag ? ' (सर्प-द्रेष्काण)' : ''}; 22वाँ द्रेष्काण: ${nm(eighth)}${e ? ' (सर्प-द्रेष्काण)' : ''}।` };
      },
      note: 'बृहज्जातक 25.4 के अनुसार अष्टम का सर्प-द्रेष्काण (और 5वें-9वें में अशुभ ग्रह) बन्धन-भय दिखाता है; यहाँ केवल द्रेष्काण की स्थिति बताई है।' },
    { id: 'rahu-conjunct', title: 'राहु जिन ग्रहों के साथ है (फलदीपिका 20)', src: ['pd-20-36'], group: 'राहु-केतु का प्रभाव',
      test: c => {
        const w = SEVEN.filter(id => c.conj(id, 'Rahu'));
        return { applies: w.length > 0, why: w.length ? `राहु ${w.map(id => P_HI[id]).join(', ')} के साथ है — इन ग्रहों की दशा के अन्त में विशेष सावधानी।` : 'राहु किसी ग्रह के साथ नहीं बैठा।' };
      } },
    { id: 'anapatya', title: 'अनपत्य योग (राहु सहित, BPHS 83.8–9)', src: ['bphs-83-8-9'], group: 'सर्प-शाप (संतान)',
      test: c => {
        const allWeak = ['Jupiter', 'L1', 'L7', 'L5'].every(c.weak);
        const four = ['Sun', 'Mars', 'Rahu', 'Saturn'].filter(id => c.house(id) === 5 && (id === 'Rahu' || c.strong(id)));
        const b = four.length === 4 && c.weak('Jupiter') && c.weak('L5');
        return { applies: allWeak || b, why: allWeak ? 'गुरु, लग्नेश, सप्तमेश और पंचमेश चारों निर्बल हैं।' : b ? 'पंचम में बलवान सूर्य, मंगल, राहु, शनि और पुत्रकारक निर्बल।' : 'चारों कारक एक साथ निर्बल नहीं; पंचम में यह चतुष्टय भी नहीं।' };
      } }
  ];

  function navamsa(abs) {
    const sign = Math.floor(abs / 30), part = Math.floor((abs % 30) / (30 / 9));
    const start = [0, 9, 6, 3][sign % 4];
    return (start + part) % 12;
  }

  const REMEDIES = [
    { id: 'nagapuja', title: 'सर्प-शाप की शान्ति: नागपूजा', src: ['bphs-83-18-20', 'pd-12-24'], when: r => r.some(x => x.applies && x.group === 'सर्प-शाप (संतान)') },
    { id: 'rahu-ketu-shanti', title: 'राहु-केतु की शान्ति: स्वरूप, धातु, जप, समिधा, दक्षिणा', src: ['bphs-85-12', 'bphs-85-13', 'bphs-85-4-5', 'bphs-85-17-20', 'bphs-85-21-23', 'bphs-85-26', 'bphs-85-27-28'], when: () => true }
  ];

  function src(id) { return SOURCES[id] || null; }

  function evaluate(calc) {
    const c = chart(calc);
    const rules = RULES.map(r => {
      let res;
      try { res = r.test(c); } catch (e) { res = { applies: false, why: 'गणना नहीं हो सकी: ' + e.message }; }
      return Object.assign({ id: r.id, title: r.title, group: r.group, note: r.note || null, sources: r.src.map(src).filter(Boolean) }, res);
    });
    const remedies = REMEDIES.filter(m => m.when(rules)).map(m => ({ id: m.id, title: m.title, sources: m.src.map(src).filter(Boolean) }));
    return {
      lagna: SIGN_HI[c.L], rahu: c.where('Rahu'), ketu: c.where('Ketu'),
      kalasarpa: rules[0], rules, remedies,
      strength_standard: 'बल का मानक: नीच, अस्त या 6/8/12वें भाव में बैठा ग्रह "निर्बल"; उच्च, स्वराशि या मूलत्रिकोण में (अस्त न हो) "बलवान"।'
    };
  }

  return { evaluate, RULES, SOURCES, navamsa };
});
