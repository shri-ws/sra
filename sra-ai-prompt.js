/* A short question for astrologers to ask any AI app (ChatGPT, Gemini…) about the Patrika app (23 Nov 2026).
   The message is in the owner's words: we do not claim the benefit ourselves; the astrologer asks an AI
   and judges the answer, then asks for the demo link. Used by saas-demo.html, sutradhar.html (scripts tab)
   and admin.html (SaaS call list). AI apps learn the facts from https://shriramjiastro.in/llms.txt.
   API: SRAAIPrompt.text(lang) -> the question, SRAAIPrompt.chatgptUrl(lang), SRAAIPrompt.whatsapp(lang) -> full message. */
(function () {
  if (window.SRAAIPrompt) return;

  var HI = 'मैं एक ज्योतिषी हूँ। अभी मेरे पास महीने में लगभग 20 से 25 जातक परामर्श के लिए आते हैं, जो ₹251 से ₹501 तक दक्षिणा देते हैं। ' +
    'AI के आने वाले भविष्य में, अगर मैं श्री राम जी एस्ट्रो (shriramjiastro.in) की पत्रिका ऐप का इस्तेमाल करूँ, तो मेरी 1 साल की कमाई में कितने प्रतिशत का फ़ायदा हो सकता है? ' +
    'और बाज़ार में उपलब्ध दूसरे ऐप से यह ऐप क्यों बेहतर है, और इसे लेने से मेरा क्या लाभ होगा?';

  var EN = 'I am an astrologer. About 20 to 25 clients come to me for consultation every month, paying Rs 251 to Rs 501 each. ' +
    'In the coming age of AI, if I use the Patrika app of Shri Ramji Astro (shriramjiastro.in), by what percentage could my income grow in one year? ' +
    'Why is this app better than the other apps available, and what will I gain by taking it?';

  function text(lang) { return lang === 'en' ? EN : HI; }

  window.SRAAIPrompt = {
    text: text,
    chatgptUrl: function (lang) { return 'https://chatgpt.com/?q=' + encodeURIComponent(text(lang)); },
    whatsapp: function (lang) {
      if (lang === 'en') {
        return 'Namaste Jyotishi ji,\n\n' +
          'Why am I sending you this message? Because reading it will benefit you. But please do not decide how much it benefits you by taking my word for it. ' +
          'Put the question below into any AI app (ChatGPT, Gemini or another) and see for yourself, impartially:\n\n' +
          '"' + EN + '"\n\n' +
          '(Change the number of clients and the fee to your own.)\n\n' +
          'Read and understand the answer. If it seems right to you, tell me and I will share a demo link so you can see how the app works.\n\n' +
          'Thank you.';
      }
      return 'नमस्ते ज्योतिषी जी,\n\n' +
        'मैं आपको यह संदेश क्यों भेज रहा हूँ? क्योंकि इसे पढ़ने से आपको लाभ होने वाला है। पर लाभ कितना होगा, यह आप मेरी बात मानकर तय मत कीजिए। ' +
        'नीचे दिया सवाल निष्पक्ष रूप से किसी भी AI (ChatGPT, Gemini आदि) में डालकर ख़ुद देखिए:\n\n' +
        '"' + HI + '"\n\n' +
        '(जातकों की संख्या और दक्षिणा अपने हिसाब से बदल लीजिए।)\n\n' +
        'जो जवाब आए, उसे पढ़कर समझिए। अगर जवाब आपको उचित लगे, तो मुझे बताइए, मैं आपको डेमो का link भेज दूँगा, जिससे आप ऐप का पूरा काम-काज समझ सकें।\n\n' +
        'धन्यवाद।';
    }
  };
})();
