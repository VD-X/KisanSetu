const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const KEY = process.env.AGMARKNET_API_KEY;
const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'; // New candidate

async function test() {
    try {
        const crop = 'Onion';
        const state = 'Gujarat';
        console.log(`Testing Agmarknet API for ${crop} in ${state}...`);
        const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?api-key=${KEY}&format=json&filters[state]=${encodeURIComponent(state)}&filters[commodity]=${encodeURIComponent(crop)}&limit=5`;
        const res = await axios.get(url);
        console.log('Status:', res.status);
        if (res.data.records && res.data.records.length > 0) {
            console.log('Success! Found records.');
            console.log('Sample record:', JSON.stringify(res.data.records[0], null, 2));
        } else {
            console.log('No records found for this resource.');
            console.log('Response:', JSON.stringify(res.data, null, 2));
        }
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response:', err.response.data);
        }
    }
}

test();
