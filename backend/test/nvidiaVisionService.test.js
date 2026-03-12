const test = require('node:test');
const assert = require('node:assert/strict');

const { safeJsonParse, validateNvidiaApiKey, callNvidiaChat } = require('../src/services/nvidiaVisionService');

test('safeJsonParse parses fenced json', async () => {
    const v = safeJsonParse('```json\n{ \"a\": 1 }\n```');
    assert.deepEqual(v, { a: 1 });
});

test('safeJsonParse extracts first object from extra text', async () => {
    const v = safeJsonParse('Result:\\n{ \"grade\": \"Good\", \"confidence\": 0.7 }\\nThanks');
    assert.deepEqual(v, { grade: 'Good', confidence: 0.7 });
});

test('validateNvidiaApiKey rejects invalid keys', async () => {
    assert.equal(validateNvidiaApiKey('').ok, false);
    assert.equal(validateNvidiaApiKey('abc').ok, false);
    assert.equal(validateNvidiaApiKey('nvapi-').ok, false);
    assert.equal(validateNvidiaApiKey('nvapi-valid-key-1234567890').ok, true);
});

test('callNvidiaChat retries on 429 and succeeds', async () => {
    const oldKey = process.env.NVIDIA_API_KEY;
    process.env.NVIDIA_API_KEY = 'nvapi-valid-key-1234567890';
    let calls = 0;
    const fetchImpl = async () => {
        calls++;
        if (calls === 1) {
            return {
                ok: false,
                status: 429,
                headers: { get: () => '0' },
                json: async () => ({ error: { message: 'rate limited' } })
            };
        }
        return {
            ok: true,
            status: 200,
            headers: { get: () => null },
            json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] })
        };
    };
    const out = await callNvidiaChat({
        model: 'nvidia/nemotron-nano-12b-v2-vl',
        messages: [{ role: 'user', content: 'hi' }],
        retries: 2,
        fetchImpl
    });
    assert.equal(calls >= 2, true);
    assert.equal(out.choices[0].message.content, '{"ok":true}');
    process.env.NVIDIA_API_KEY = oldKey;
});

test('safeJsonParse supports paragraphSummary and Very Good grade', async () => {
    const v = safeJsonParse('```json\n{ \"paragraphSummary\": \"Nice crop photo.\", \"grade\": \"Very Good\" }\n```');
    assert.deepEqual(v, { paragraphSummary: 'Nice crop photo.', grade: 'Very Good' });
});
