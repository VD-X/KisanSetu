require('dotenv').config({ path: './.env' });
const { fetchFromNvidiaQwen } = require('./src/services/marketPriceService');

async function testSingleQwenCall() {
    console.log('Testing single Qwen 3.5 397B call...');
    try {
        const data = await fetchFromNvidiaQwen('Tomato', 'Guntur');
        console.log('\n--- Output ---');
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testSingleQwenCall();
