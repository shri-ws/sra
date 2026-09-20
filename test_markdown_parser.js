function parseMarkdownToHTML(text) {
    if (!text) return "";
    let html = text;
    // Bold: **text** or __text__
    html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    html = html.replace(/__(.*?)__/g, '<b>$1</b>');
    // Headers: ### Header
    html = html.replace(/^### (.*$)/gim, '<h4 style="color:var(--gold); margin-top:10px; margin-bottom:4px;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="color:var(--gold); margin-top:12px; margin-bottom:6px;">$1</h3>');
    // Bullet lists: * item or - item -> • item
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '• $1');
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    return html;
}

const sampleGeminiReply = `
## 🪐 आपकी जन्मपत्रिका का सूक्ष्म विश्लेषण
**लग्न:** मेष लग्न (12°5')
* सूर्य देव दशम भाव में स्थिति हैं
* शनि देव साढ़े साती का प्रभाव दे रहे हैं

### 📜 अनुशंसित वैदिक उपाय:
1. **5-मुखी रुद्राक्ष** धारण करें।
2. सूर्य नारायण को अर्घ्य दें।
`;

console.log("Parsed HTML Output:\n", parseMarkdownToHTML(sampleGeminiReply));
