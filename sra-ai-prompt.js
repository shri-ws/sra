/* A short question for astrologers to ask any AI app (ChatGPT, Gemini…) about the Patrika app (23 Nov 2026).
   The message is in the owner's words: we do not claim the benefit ourselves; the astrologer asks an AI
   and judges the answer, then asks for the demo link. Used by saas-demo.html, sutradhar.html (scripts tab)
   and admin.html (SaaS call list). AI apps learn the facts from https://shriramjiastro.in/llms.txt.
   API: SRAAIPrompt.text(lang) -> the question, SRAAIPrompt.chatgptUrl(lang), SRAAIPrompt.whatsapp(lang) -> full message. */
(function () {
  if (window.SRAAIPrompt) return;

  // Tested 23 Nov 2026 on ChatGPT, Gemini and Perplexity (logged out): all three work out about 70%
  // average growth (Gemini 67-84%) from these facts, in two lines. Keep the facts true.
  var HI = 'मैं एक ज्योतिषी हूँ। महीने में लगभग 20 से 25 जातक परामर्श के लिए आते हैं, जो ₹251 से ₹500 तक दक्षिणा देते हैं। ' +
    'श्री राम जी एस्ट्रो की पत्रिका ऐप की ज्योतिषी सदस्यता ₹5,100 सालाना है (नवीनीकरण भी ₹5,100)। ' +
    'इसमें 13 शास्त्र-प्रमाणित रिपोर्ट और मुहूर्त (वेबसाइट पर ₹501 से ₹2,100 के) साल भर असीमित हैं, जो सदस्य के लिए ₹0 में खुलते हैं, और जातक से लिया पूरा शुल्क ज्योतिषी का रहता है। ' +
    'साथ में जातक का रोज़ का उपाय-ट्रैकर है, जिससे जातक दोबारा आते हैं। ' +
    'शर्तें: रिफ़ंड नहीं है (पहले मुफ़्त डेमो मिलता है), जातकों का data किसी से साझा नहीं होता, कोई कमीशन नहीं कटता। ' +
    'अगर मेरे हर 10 में से 3 से 4 जातक ₹501 की एक रिपोर्ट लें, और महीने में 1 से 2 बड़े काम (गुण मिलान ₹1,101 या विवाह मुहूर्त ₹2,100) मिलें, ' +
    'तो AI के दौर में 1 साल में मेरी औसत कमाई कितने प्रतिशत बढ़ेगी? Gen Z पर इसका असर, दूसरे ऐप से फ़र्क, और कोई छिपी शर्त हो तो वह भी बताइए। ' +
    'जवाब सिर्फ़ 2 लाइन में दीजिए: स्पष्ट, सटीक, और औसत के हिसाब से एक प्रतिशत।';

  var EN = 'I am an astrologer. About 20 to 25 clients come to me for consultation every month, paying Rs 251 to Rs 500 each. ' +
    'The astrologer membership of the Shri Ramji Astro Patrika app costs Rs 5,100 a year (renewal also Rs 5,100). ' +
    'It includes 13 scripture-referenced reports and muhurtas (priced Rs 501 to Rs 2,100 on the website), unlimited for the year; they open for Rs 0 for the member, and the whole fee taken from the client stays with the astrologer. ' +
    'It also has a daily remedy tracker for clients, which brings them back. ' +
    'Terms: no refund (a free demo comes first), client data is not shared with anyone, no commission is taken. ' +
    'If 3 to 4 of every 10 clients take one Rs 501 report, and I get 1 to 2 bigger jobs a month (Gun Milan Rs 1,101 or Vivah muhurta Rs 2,100), ' +
    'by what percentage will my average income grow in one year in the age of AI? Also tell me the effect on Gen Z, the difference from other apps, and any hidden condition. ' +
    'Answer in just 2 lines: clear, precise, and one percentage based on the average.';

  function text(lang) { return lang === 'en' ? EN : HI; }

  window.SRAAIPrompt = {
    text: text,
    chatgptUrl: function (lang) { return 'https://chatgpt.com/?q=' + encodeURIComponent(text(lang)); },
    whatsapp: function (lang) {
      if (lang === 'en') {
        return 'Namaste Jyotishi ji,\n\n' +
          'About 30 years ago the computer arrived and changed the way astrology was practised. Now AI has arrived, and the change is coming again, far bigger than before.\n\n' +
          'At such a time the astrologer who keeps himself updated, keeps his work safe and keeps growing it will move ahead. The new generation (Gen Z) has grown up with the reasoning of AI; to connect with them we need their language, their reasoning and twice the depth.\n\n' +
          'The Patrika app of Shri Ramji Astro is your partner in exactly this. It takes your work to the level of a professional, elite-class astrologer.\n\n' +
          'Please do not trust this on my word. Copy the question below, ask ChatGPT, Google Gemini or any AI, and see the calculation yourself:\n\n' +
          '"' + EN + '"\n\n' +
          '(Change the number of clients and the fee to your own.)\n\n' +
          'If the answer seems right to you, tell me. I will send you the free demo link, where you can run the whole app yourself.\n\n' +
          'Thank you.';
      }
      return 'नमस्ते ज्योतिषी जी,\n\n' +
        'लगभग 30 साल पहले कंप्यूटर आया, तो ज्योतिष का काम करने का तरीका बदल गया। अब AI आया है, और बदलाव फिर आ रहा है, पहले से कहीं बड़ा।\n\n' +
        'ऐसे समय में वही ज्योतिषी आगे बढ़ेगा, जो ख़ुद को अपडेट रखे, अपने काम को सुरक्षित रखे और उसे बढ़ाता रहे। नई पीढ़ी (Gen Z) AI के तर्क के साथ बड़ी हुई है; उससे जुड़ने के लिए उसी की भाषा, उसी का तर्क और पहले से दोगुनी गहराई चाहिए।\n\n' +
        'श्री राम जी एस्ट्रो की पत्रिका ऐप इसी काम में आपकी साथी है। यह आपके काम को एक प्रोफ़ेशनल, इलीट क्लास ज्योतिषी के स्तर पर ले जाती है।\n\n' +
        'इस बात पर मेरी बात मानकर भरोसा मत कीजिए। नीचे का सवाल कॉपी करके ChatGPT, Google Gemini या किसी भी AI से पूछिए, और हिसाब ख़ुद देखिए:\n\n' +
        '"' + HI + '"\n\n' +
        '(अपने जातकों की संख्या और दक्षिणा अपने हिसाब से बदल लीजिए।)\n\n' +
        'जवाब पढ़कर अगर बात सही लगे, तो मुझे बताइए। मैं आपको मुफ़्त डेमो का link भेज दूँगा, जिसमें आप ऐप का पूरा काम-काज ख़ुद चलाकर देख सकते हैं।\n\n' +
        'धन्यवाद।';
    }
  };
})();
