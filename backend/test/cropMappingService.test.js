const test = require('node:test');
const assert = require('node:assert/strict');

const { normalize, cropsRoughlyMatch, mapDetectedCropToId } = require('../src/services/cropMappingService');

test('normalize lowercases and strips punctuation', async () => {
    assert.equal(normalize('Tomato!!  Fresh'), 'tomato fresh');
});

test('cropsRoughlyMatch matches substrings', async () => {
    assert.equal(cropsRoughlyMatch('Green Chilli', 'chilli'), true);
    assert.equal(cropsRoughlyMatch('Wheat', 'rice'), false);
});

test('mapDetectedCropToId returns matching crop id', async () => {
    const crops = [
        { id: '1', name: 'Tomato', translations: { hindi: 'टमाटर' } },
        { id: '2', name: 'Wheat' }
    ];
    assert.equal(mapDetectedCropToId('tomatoes', crops), '1');
    assert.equal(mapDetectedCropToId('टमाटर', crops), '1');
    assert.equal(mapDetectedCropToId('unknown', crops), null);
});
