require('dotenv').config({ path: './.env' });
const { fetchFromNvidiaLlama } = require('./src/services/marketPriceService');

async function testSingleLlamaCall() {
    console.log('Testing single Llama 90B call...');
    try {
        const data = await fetchFromNvidiaLlama('Tomato', 'Guntur');
        console.log('\n--- Output ---');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testSingleLlamaCall();
