const { getTodaysPrices } = require('./src/services/marketPriceService');

async function testMarketPrices() {
    console.log('Testing Llama 90B Market Prices Service directly...');
    try {
        const prices = await getTodaysPrices('Andhra Pradesh');
        console.log('\n✅ Success! Fetched Prices:');
        console.log(JSON.stringify(prices, null, 2));

        if (prices && prices.length > 0 && prices[0].source && prices[0].source.includes('Llama')) {
            console.log('\n✅ Verified source is Llama 90B');
        } else {
            console.log('\n❌ Warning: Source might not be Llama 90B or data is empty.');
        }
    } catch (error) {
        console.error('\n❌ Error testing service:', error.message);
    } finally {
        process.exit(0);
    }
}

testMarketPrices();
