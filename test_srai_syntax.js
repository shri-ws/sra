const fs = require('fs');
const html = fs.readFileSync('srai.html', 'utf8');

// Extract all <script> contents (excluding external src)
const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;

while ((match = scriptRegex.exec(html)) !== null) {
    count++;
    const code = match[1];
    try {
        new Function(code);
        console.log(`Script block #${count}: Syntax Valid!`);
    } catch(err) {
        console.error(`Script block #${count} Syntax Error:`, err.message);
        process.exit(1);
    }
}

console.log("All script blocks in srai.html are 100% valid!");
