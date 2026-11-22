/* A ready prompt for astrologers to paste in ChatGPT / Gemini / any AI app (22 Nov 2026).
   A plain question ("how can I earn 2-3x with shriramjiastro.in?") gets generic or wrong answers —
   AI apps do not know the astrologer membership yet. This prompt carries the facts, so any AI works
   out the astrologer's own numbers. Used by saas-demo.html, sutradhar.html (scripts tab) and admin.html.
   Keep the facts in step with SERVICE_CATALOG in sutradhar_engine.py.
   API: SRAAIPrompt.text(lang) -> prompt, SRAAIPrompt.chatgptUrl(lang), SRAAIPrompt.whatsapp(lang) -> message. */
(function () {
  if (window.SRAAIPrompt) return;
  var DEMO = 'https://shriramjiastro.in/saas-demo.html';

  var HI = [
    'मैं एक ज्योतिषी हूँ। नीचे Shri Ramji Astro (shriramjiastro.in) की "ज्योतिषी सदस्यता" की जानकारी है। इसे पढ़कर मेरे लिए हिसाब लगाइए कि इससे जुड़कर मेरी महीने की कमाई 2 से 3 गुना कैसे हो सकती है। ईमानदारी से बताइए, बढ़ा-चढ़ाकर नहीं।',
    '',
    'मेरे आँकड़े (मैं भर दूँगा, न भरूँ तो आप मान लीजिए: रोज़ 5 जातक, एक परामर्श ₹501, महीने में 25 दिन):',
    '- रोज़ लगभग ___ जातक आते हैं',
    '- एक परामर्श की दक्षिणा ₹___',
    '- महीने में ___ दिन काम',
    '',
    'सदस्यता की जानकारी:',
    '1. दाम: ₹5,100 प्रति वर्ष (GST सहित), लगभग ₹14 प्रतिदिन। 2 फ़ोन पर लॉगिन।',
    '2. 13 शास्त्र-प्रमाणित रिपोर्ट और मुहूर्त, साल भर असीमित। वेबसाइट पर इनके दाम: मंगल दोष, कालसर्प, रत्न व उपाय, धन योग, राजयोग, वाहन योग (हर एक ₹501); गुण मिलान + मांगलिक (₹1,101); मेगा पाराशर रिपोर्ट (₹1,111); वास्तु, यज्ञोपवीत और मुंडन मुहूर्त (₹1,551); विवाह मुहूर्त और BPHS संपूर्ण पाराशर रिपोर्ट (₹2,100)।',
    '3. सदस्य ज्योतिषी रिपोर्ट के कोड-बॉक्स में अपना मोबाइल नंबर डालता है तो रिपोर्ट उसके लिए ₹0 में खुलती है। जातक से वह वेबसाइट पर लिखा शुल्क लेता है, और वह पूरा शुल्क ज्योतिषी का रहता है।',
    '4. हर रिपोर्ट में मूल संस्कृत श्लोक और ग्रंथ का संदर्भ होता है (बृहत् पाराशर होरा शास्त्र, मुहूर्त चिन्तामणि आदि), A4 पर छपने लायक PDF। जातक को श्लोक और ग्रंथ का नाम दिखता है, इसलिए भरोसा बढ़ता है।',
    '5. दैवज्ञ डेस्क (डिजिटल दफ़्तर): हर जातक का खाता उसके मोबाइल नंबर से, कुंडली, गोपनीय नोट, डिजिटल उपाय-पर्ची (प्रिंट या WhatsApp)।',
    '6. जातक के फ़ोन पर रोज़ का संकल्प और उपाय-ट्रैकर, बिना कोई ऐप डाउनलोड किए; 7 दिन की प्रगति ज्योतिषी की डेस्क पर। डेस्क बताती है कि कौन जातक उपाय छोड़ रहा है और आज किसे फ़ोन करना है, जिससे अगला परामर्श, परिवार की कुंडली-रिपोर्ट और मुहूर्त का काम मिलता है।',
    '7. साल में 11 मंगल दोष रिपोर्ट (11 × ₹501 = ₹5,511) से पूरी सदस्यता वसूल हो जाती है।',
    '8. 3 मिनट का डेमो, बिना लॉगिन: ' + DEMO,
    '',
    'कृपया बताइए:',
    'क) मेरे आँकड़ों से अभी की महीने की कमाई, और सदस्यता के बाद की संभावित कमाई की तालिका: तीन अनुमानों पर, जब 10%, 25% और 40% जातक एक रिपोर्ट लें (ज़्यादातर ₹501 वाली, कुछ ₹1,101 से ₹2,100 वाली)। सदस्यता का ₹5,100 घटाकर।',
    'ख) 2 से 3 गुना कमाई तक पहुँचने के लिए 90 दिन की सीधी कार्य-योजना।',
    'ग) जोखिम और सावधानियाँ।',
    'जवाब हिंदी में, छोटे बिंदुओं में दें।'
  ].join('\n');

  var EN = [
    'I am an astrologer. Below are the facts about the "Astrologer Membership" of Shri Ramji Astro (shriramjiastro.in). Please work out how joining it could take my monthly income to 2-3 times. Be honest, do not exaggerate.',
    '',
    'My numbers (I will fill them in; if I do not, assume 5 clients a day, Rs 501 per consultation, 25 working days a month):',
    '- About ___ clients a day',
    '- My fee per consultation Rs ___',
    '- ___ working days a month',
    '',
    'About the membership:',
    '1. Price: Rs 5,100 a year (GST included), about Rs 14 a day. Login on 2 phones.',
    '2. 13 scripture-referenced reports and muhurtas, unlimited for the year. Their prices on the website: Mangal Dosha, Kaal Sarp, Gemstone & Remedies, Dhana Yoga, Raj Yoga, Vahan Yoga (Rs 501 each); Gun Milan + Manglik (Rs 1,101); Mega Parashara report (Rs 1,111); Vastu, Yajnopavita and Mundan muhurta (Rs 1,551); Vivah muhurta and the complete BPHS Parashara report (Rs 2,100).',
    '3. A member types their own mobile number in the report\'s code box and the report opens for Rs 0. The client pays the price written on the website, and the whole fee stays with the astrologer.',
    '4. Every report shows the original Sanskrit shlokas with the scripture reference (Brihat Parashara Hora Shastra, Muhurta Chintamani and others), as a printable A4 PDF, so the client trusts it.',
    '5. Daivagya Desk (digital office): one record per client by mobile number, chart, private notes, digital remedy slip (print or WhatsApp).',
    '6. A daily remedy tracker on the client\'s phone, no app download; 7-day progress on the astrologer\'s desk. The desk shows who is skipping remedies and whom to call today, which brings the next consultation, family reports and muhurta work.',
    '7. 11 Mangal Dosha reports in a year (11 x Rs 501 = Rs 5,511) pay for the whole membership.',
    '8. 3-minute demo, no login: ' + DEMO,
    '',
    'Please give me:',
    'a) A table of my current monthly income and the likely income with the membership, at three guesses: 10%, 25% and 40% of clients take one report (mostly Rs 501, some Rs 1,101 to Rs 2,100), after the Rs 5,100 membership.',
    'b) A simple 90-day plan to reach 2-3 times the income.',
    'c) Risks and precautions.',
    'Answer in short points.'
  ].join('\n');

  function text(lang) { return lang === 'en' ? EN : HI; }
  window.SRAAIPrompt = {
    text: text,
    // ChatGPT opens with the prompt already typed (chatgpt.com/?q=…)
    chatgptUrl: function (lang) { return 'https://chatgpt.com/?q=' + encodeURIComponent(text(lang)); },
    whatsapp: function (lang) {
      return lang === 'en'
        ? 'Namaste. Copy the message below and paste it in ChatGPT, Gemini or any AI app on your phone. It will work out, with your own numbers, how much more you can earn with Shri Ramji Astro.\n\n' + EN
        : 'नमस्ते। नीचे का पूरा संदेश कॉपी करके अपने फ़ोन के ChatGPT, Gemini या किसी भी AI ऐप में डालिए। वह आपके अपने आँकड़ों से हिसाब लगाकर बताएगा कि Shri Ramji Astro से जुड़कर आपकी कमाई कितनी बढ़ सकती है।\n\n' + HI;
    }
  };
})();
