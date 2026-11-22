/* A short question for astrologers to ask any AI app (ChatGPT, Gemini…) about the Patrika app (23 Nov 2026).
   The message is in the owner's words: we do not claim the benefit ourselves; the astrologer asks an AI
   and judges the answer, then asks for the demo link. Used by saas-demo.html, sutradhar.html (scripts tab)
   and admin.html (SaaS call list). AI apps learn the facts from https://shriramjiastro.in/llms.txt.
   API: SRAAIPrompt.text(lang) -> the question, SRAAIPrompt.chatgptUrl(lang), SRAAIPrompt.whatsapp(lang) -> full message. */
(function () {
  if (window.SRAAIPrompt) return;

  var HI = 'मैं एक ज्योतिषी हूँ। अभी मेरे पास महीने में लगभग 20 से 25 जातक परामर्श के लिए आते हैं, जो ₹251 से ₹501 तक दक्षिणा देते हैं। ' +
    'AI के आने वाले भविष्य में, अगर मैं श्री राम जी एस्ट्रो की पत्रिका ऐप (shriramjiastro.in/jyotishi.html) का इस्तेमाल करूँ, तो मेरी 1 साल की कमाई में कितने प्रतिशत का फ़ायदा हो सकता है? ' +
    'और बाज़ार में उपलब्ध दूसरे ऐप से यह ऐप क्यों बेहतर है, और इसे लेने से मेरा क्या लाभ होगा?';

  var EN = 'I am an astrologer. About 20 to 25 clients come to me for consultation every month, paying Rs 251 to Rs 501 each. ' +
    'In the coming age of AI, if I use the Patrika app of Shri Ramji Astro (shriramjiastro.in/jyotishi.html), by what percentage could my income grow in one year? ' +
    'Why is this app better than the other apps available, and what will I gain by taking it?';

  function text(lang) { return lang === 'en' ? EN : HI; }

  window.SRAAIPrompt = {
    text: text,
    chatgptUrl: function (lang) { return 'https://chatgpt.com/?q=' + encodeURIComponent(text(lang)); },
    whatsapp: function (lang) {
      if (lang === 'en') {
        return 'Namaste Jyotishi ji,\n\n' +
          'About 30 years ago the computer arrived and brought new changes to the world of astrology. Now AI has arrived and is bringing many changes again, and this time the challenge is even bigger.\n\n' +
          'Keeping ourselves updated, protecting our work and taking it forward is the only way to stay in this profession. To connect the new generation (Gen Z) with Jyotish, we have to speak in their language, with their kind of reasoning, and with twice the depth as before, because this generation is shaped by the reasoning of AI.\n\n' +
          'The Patrika app of Shri Ramji Astro (shriramjiastro.in) helps you cross this challenge: it supports you like a professional astrologer and lets you work like an elite-class astrologer.\n\n' +
          'If you do not believe this big claim, do not take my word for it. Ask Google Gemini, ChatGPT or any AI the question below:\n\n' +
          '"' + EN + '"\n\n' +
          '(Change the number of clients and the fee to your own.)\n\n' +
          'Read and understand the answer. If it seems right to you, tell me and I will share a demo link so you can see how the app works.\n\n' +
          'Thank you.';
      }
      return 'नमस्ते ज्योतिषी जी,\n\n' +
        'आज से लगभग 30 साल पहले कंप्यूटर आया, तो उसने ज्योतिष की दुनिया में नए बदलाव लाए। अब AI आया है, और वह फिर से बहुत सारे बदलाव ला रहा है। इस बार चुनौती पिछली बार से भी बड़ी है।\n\n' +
        'ऐसे में ख़ुद को अपडेट रखना, अपने कार्य को बचाकर रखना और उसे आगे बढ़ाते रहना ही इस कार्य में बने रहने का एकमात्र रास्ता है। आने वाली नई पीढ़ी (Gen Z) को ज्योतिष से जोड़ने के लिए उसी की भाषा में, उसी की तरह के तर्क से, और पहले से दोगुनी गहराई के साथ बात करनी होगी, क्योंकि यह AI के तर्क से गढ़ी गई पीढ़ी है।\n\n' +
        'इसी चुनौती को पार करने में श्री राम जी एस्ट्रो (shriramjiastro.in) का पत्रिका ऐप आपकी मदद करता है: यह एक प्रोफ़ेशनल ज्योतिषी की तरह आपका साथ देता है, और आपको एक इलीट क्लास के ज्योतिषी की तरह काम करने देता है।\n\n' +
        'अगर इस बड़ी बात पर यक़ीन न हो, तो मेरी बात मत मानिए। नीचे दिया सवाल Google Gemini, ChatGPT या किसी भी AI से पूछ लीजिए:\n\n' +
        '"' + HI + '"\n\n' +
        '(जातकों की संख्या और दक्षिणा अपने हिसाब से बदल लीजिए।)\n\n' +
        'जो जवाब आए, उसे पढ़कर समझिए। अगर जवाब आपको उचित लगे, तो मुझे बताइए, मैं आपको डेमो का link भेज दूँगा, जिससे आप ऐप का पूरा काम-काज समझ सकें।\n\n' +
        'धन्यवाद।';
    }
  };
})();
