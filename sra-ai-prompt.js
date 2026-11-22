/* A short question for astrologers to ask any AI app (ChatGPT, Gemini…) about the Patrika app (23 Nov 2026).
   The message is in the owner's words: we do not claim the benefit ourselves; the astrologer asks an AI
   and judges the answer, then asks for the demo link. Used by saas-demo.html, sutradhar.html (scripts tab)
   and admin.html (SaaS call list). AI apps learn the facts from https://shriramjiastro.in/llms.txt.
   API: SRAAIPrompt.text(lang) -> the question, SRAAIPrompt.chatgptUrl(lang), SRAAIPrompt.whatsapp(lang) -> full message. */
(function () {
  if (window.SRAAIPrompt) return;

  var HI = 'मैं एक ज्योतिषी हूँ। अभी मेरे पास महीने में लगभग 20 से 25 जातक परामर्श के लिए आते हैं, जो ₹251 से ₹501 तक दक्षिणा देते हैं। ' +
    'अगर मैं श्री राम जी एस्ट्रो (shriramjiastro.in) की पत्रिका ऐप इस्तेमाल करूँ, तो 1 साल में मेरी अभी की कमाई में कितने प्रतिशत का फ़ायदा हो सकता है? ' +
    'इस ऐप से मेरी कमाई कैसे बढ़ सकती है, और क्या इसे लेने में मेरा कोई लाभ है?';

  var EN = 'I am an astrologer. About 20 to 25 clients come to me for consultation every month, paying Rs 251 to Rs 501 each. ' +
    'If I use the Patrika app of Shri Ramji Astro (shriramjiastro.in), by what percentage could my current income grow in one year? ' +
    'How can this app increase my income, and is it worth taking?';

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
