/* A short question for astrologers to ask any AI app (ChatGPT, Gemini…) about the Patrika app (23 Nov 2026).
   The message is in the owner's words: we do not claim the benefit ourselves; the astrologer asks an AI
   and judges the answer, then asks for the demo link. Used by saas-demo.html, sutradhar.html (scripts tab)
   and admin.html (SaaS call list). AI apps learn the facts from https://shriramjiastro.in/llms.txt.
   API: SRAAIPrompt.text(lang) -> the question, SRAAIPrompt.chatgptUrl(lang), SRAAIPrompt.whatsapp(lang) -> full message. */
(function () {
  if (window.SRAAIPrompt) return;

  // Plain, first-person question (23 Nov 2026). It keeps the facts an AI needs to calculate
  // (membership price, 14 reports free for the member, full fee kept, take rate) in everyday words.
  var HI = 'मैं एक ज्योतिषी हूँ। महीने में मेरे पास करीब 20–25 जातक आते हैं, और हर एक से ₹251 से ₹500 तक दक्षिणा मिलती है। ' +
    'मैं सोच रहा हूँ कि श्री राम जी एस्ट्रो की पत्रिका ऐप ले लूँ। इसका साल का ₹5,100 लगता है। ' +
    'इसमें मंगल दोष, कालसर्प, गुण मिलान, विवाह मुहूर्त जैसी 14 शास्त्र-प्रमाणित रिपोर्ट मुझे साल भर मुफ़्त मिलेंगी (वेबसाइट पर ये ₹501 से ₹2,100 की हैं), और जातक से जो शुल्क लूँ, वह पूरा मेरा। ' +
    'जातक के फ़ोन पर रोज़ का उपाय-ट्रैकर भी चलता है, जिससे वह मुझसे जुड़ा रहता है। ' +
    'अगर मेरे 10 में से 3–4 जातक एक रिपोर्ट ले लें, और महीने में 1–2 गुण मिलान या मुहूर्त का काम मिल जाए, तो एक साल में मेरी कमाई करीब कितने प्रतिशत बढ़ सकती है? ' +
    'क्या इससे मैं ज्योतिष को एक गंभीर पेशे की तरह चला पाऊँगा, और AI के आने वाले दौर में अपना काम बचाकर रख पाऊँगा? ' +
    'सीधा, हिसाब के साथ, 2–3 लाइन में बताइए।';

  var EN = 'I am an astrologer. About 20–25 clients come to me every month, and each pays Rs 251 to Rs 500. ' +
    'I am thinking of taking the Patrika app of Shri Ramji Astro. It costs Rs 5,100 a year. ' +
    'With it I get 14 scripture-referenced reports free all year, like Mangal Dosha, Kaal Sarp, Gun Milan and Vivah muhurta (Rs 501 to Rs 2,100 each on the website), and whatever I charge the client is fully mine. ' +
    'A daily remedy tracker also runs on the client\'s phone, which keeps them connected to me. ' +
    'If 3–4 of my 10 clients take one report, and I get 1–2 Gun Milan or muhurta jobs a month, by roughly what percentage could my income grow in a year? ' +
    'Will this let me run astrology as a serious profession and keep my work safe in the coming age of AI? ' +
    'Tell me directly, with the calculation, in 2–3 lines.';

  function text(lang) { return lang === 'en' ? EN : HI; }

  window.SRAAIPrompt = {
    text: text,
    chatgptUrl: function (lang) { return 'https://chatgpt.com/?q=' + encodeURIComponent(text(lang)); },
    whatsapp: function (lang) {
      if (lang === 'en') {
        return 'Namaste Jyotishi ji,\n\n' +
          'Think about it for a moment. About 30 years ago the computer arrived and the whole work of astrology changed. Now AI has arrived, and this time the change is even bigger. Today\'s client, especially the young one, first asks AI, then comes to an astrologer, and wants reasoning and proof for everything.\n\n' +
          'In such a time the astrologer who runs his work as a serious profession, with written reports and proof from the scriptures, is the one who will stay, and earn well too.\n\n' +
          'The Patrika app of Shri Ramji Astro is made for exactly this. But I will not praise it. Ask any AI yourself, ChatGPT or Google Gemini. Just copy this question and paste it:\n\n' +
          '"' + EN + '"\n\n' +
          '(Change the number of clients and the fee to your own.)\n\n' +
          'Read the answer and check your own numbers. If it makes sense, write me one line. I will send you the free demo, where you can run the whole app yourself and see a sample of every report.\n\n' +
          'Thank you.';
      }
      return 'नमस्ते ज्योतिषी जी,\n\n' +
        'एक बात सोचिए। लगभग 30 साल पहले कंप्यूटर आया था, तो ज्योतिष का पूरा काम बदल गया था। अब AI आ गया है, और इस बार बदलाव उससे भी बड़ा है। आज का जातक, ख़ासकर नई पीढ़ी, पहले AI से पूछता है, फिर ज्योतिषी के पास आता है, और हर बात का तर्क और प्रमाण माँगता है।\n\n' +
        'ऐसे में जो ज्योतिषी अपने काम को एक गंभीर पेशे की तरह, लिखित रिपोर्ट और शास्त्र के प्रमाण के साथ करेगा, वही आगे टिकेगा, और अच्छा कमाएगा भी।\n\n' +
        'श्री राम जी एस्ट्रो की पत्रिका ऐप इसी के लिए बनी है। पर मैं इसकी तारीफ़ नहीं करूँगा। आप ख़ुद किसी भी AI से पूछ लीजिए, ChatGPT हो या Google Gemini। बस यह सवाल कॉपी करके डाल दीजिए:\n\n' +
        '"' + HI + '"\n\n' +
        '(जातकों की गिनती और दक्षिणा अपने हिसाब से बदल लीजिए।)\n\n' +
        'जवाब पढ़िए, अपना हिसाब देखिए। बात जँचे, तो मुझे एक लाइन लिख दीजिए। मैं आपको मुफ़्त डेमो भेज दूँगा, जिसमें आप पूरी ऐप ख़ुद चलाकर देख सकते हैं, और हर रिपोर्ट का नमूना भी।\n\n' +
        'धन्यवाद।';
    }
  };
})();
