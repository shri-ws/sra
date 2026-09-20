// Test script to verify Gemini API Key & Endpoints
const https = require('https');

const apiKey = "AIzaSyA9rvkSmF08JQkL08aAywj5zq-Zn4lqNHY";
const modelsToTest = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

function testModel(model) {
    return new Promise((resolve) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const body = JSON.stringify({
            contents: [{
                parts: [{ text: "आप कौन हैं? संक्षेप में उत्तर दें।" }]
            }]
        });

        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Model [${model}] HTTP Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Model [${model}] Response:`, json.candidates[0].content.parts[0].text);
                        resolve(true);
                    } catch(e) {
                        console.log(`Model [${model}] Parse Error:`, e.message);
                        resolve(false);
                    }
                } else {
                    console.log(`Model [${model}] Error Body:`, data);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Model [${model}] Request Error:`, e.message);
            resolve(false);
        });

        req.write(body);
        req.end();
    });
}

async function runTests() {
    for (const m of modelsToTest) {
        console.log(`--- Testing Model: ${m} ---`);
        await testModel(m);
    }
}

runTests();
