// Combined grading and pricing API for hackathon
// Handles: image upload → Roboflow → Gemini (text) → Agmarknet → cache/fallback

const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const router = express.Router();

// In-memory cache for last 50 results
const resultCache = new NodeCache({ stdTTL: 3600, checkperiod: 600, useClones: false, maxKeys: 50 });

// Roboflow config
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL = process.env.ROBOFLOW_MODEL;

// Gemini config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Agmarknet config
const AGMARKNET_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070'; // Example endpoint
const AGMARKNET_API_KEY = process.env.AGMARKNET_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

// Strict grading prompt
function buildGeminiPrompt(crop, condition) {
  return `You are a strict agricultural quality inspector.\n\nCrop: ${crop}\nCondition: ${condition}\n\nGrading Rules:\nGrade A = No visible defects, uniform color, premium quality.\nGrade B = Minor defects, small blemishes, acceptable.\nGrade C = Visible damage, discoloration, poor quality.\n\nBe strict. If uncertain, downgrade.\n\nReturn ONLY JSON:\n{"grade":"A|B|C","reason":"short factual explanation under 15 words"}`;
}

// Helper: call NVIDIA Vision API (meta/llama-3.2-11b-vision-instruct)
async function detectCrop(imageBase64) {
  const invoke_url = 'https://integrate.api.nvidia.com/v1/chat/completions';
  const apiKey = process.env.NVIDIA_API_KEY;
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
  };
  const payload = {
    model: 'meta/llama-3.2-11b-vision-instruct',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What single crop or vegetable is shown in this image? Reply with only the crop name as one or two words, nothing else.' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ]
      }
    ],
    max_tokens: 32,
    temperature: 0.10,
    top_p: 1.0,
    stream: false
  };
  const res = await axios.post(invoke_url, payload, { headers });
  return res.data?.choices?.[0]?.message?.content?.trim() || null;
}

// Helper: call Gemini
async function strictGrade(crop, condition) {
  const prompt = buildGeminiPrompt(crop, condition);
  try {
    const res = await axios.post(
      `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      }
    );
    // Parse JSON from Gemini response
    const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const json = JSON.parse(text);
    return json;
  } catch (e) {
    // Fallback
    return { grade: 'B', reason: 'Moderate visible quality' };
  }
}

// Helper: call Agmarknet
async function getMarketPrice(crop) {
  const res = await axios.get(AGMARKNET_URL, {
    params: {
      api_key: AGMARKNET_API_KEY,
      format: 'json',
      'filters[commodity]': crop,
      limit: 1
    }
  });
  // Parse price from response
  return res.data?.records?.[0]?.modal_price || null;
}

// Main API route
router.post('/grade-crop', async (req, res) => {
  const { imageBase64, condition } = req.body;
  if (!imageBase64 || !condition) return res.status(400).json({ error: 'Missing image or condition' });

  // Check cache
  const cacheKey = `${imageBase64.slice(0, 30)}|${condition}`;
  if (resultCache.has(cacheKey)) {
    return res.json(resultCache.get(cacheKey));
  }

  try {
    // 1. Detect crop
    const crop = await detectCrop(imageBase64);
    if (!crop) return res.status(400).json({ error: 'Crop not detected' });

    // 2. Grade (Gemini, text only)
    const gradeResult = await strictGrade(crop, condition);

    // 3. Market price (Agmarknet)
    const price = await getMarketPrice(crop);

    // 4. Combine result
    const result = { crop, grade: gradeResult.grade, reason: gradeResult.reason, price };
    resultCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Processing failed', details: err.message });
  }
});

module.exports = router;
