require('dotenv').config({ path: './.env' });
const { getTodaysPrices } = require('./src/services/marketPriceService');

async function testStatePrices() {
    console.log('Testing Location-Based Market Prices API directly via Service...');
    try {
        console.log('\nFetching for Andhra Pradesh...');
        const pricesAP = await getTodaysPrices('Andhra Pradesh');
        console.log(`Received ${pricesAP.length} prices for Andhra Pradesh. First item:`);
        console.log(JSON.stringify(pricesAP[0], null, 2));

        console.log('\nFetching for Telangana...');
        const pricesTS = await getTodaysPrices('Telangana');
        console.log(`Received ${pricesTS.length} prices for Telangana. First item:`);
        console.log(JSON.stringify(pricesTS[0], null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

testStatePrices();
