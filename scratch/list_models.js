const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const keyMatch = env.match(/GEMINI_API_KEY=(.+)/);
const key = keyMatch ? keyMatch[1].trim() : '';

async function run() {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log(data.models.map(m => m.name).join(', '));
}
run();
