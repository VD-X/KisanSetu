const fetch = require('node-fetch');

const safeJsonParse = (text) => {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const unfenced = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    try {
        return JSON.parse(unfenced);
    } catch { }
    const firstObj = unfenced.indexOf('{');
    const lastObj = unfenced.lastIndexOf('}');
    if (firstObj >= 0 && lastObj > firstObj) {
        const candidate = unfenced.slice(firstObj, lastObj + 1);
        try {
            return JSON.parse(candidate);
        } catch { }
    }
    return null;
};

const validateNvidiaApiKey = (apiKey) => {
    const k = String(apiKey || '').trim();
    if (!k) return { ok: false, reason: 'Missing NVIDIA_API_KEY' };
    if (!k.startsWith('nvapi-')) return { ok: false, reason: 'Invalid NVIDIA_API_KEY format' };
    if (k.length < 20) return { ok: false, reason: 'Invalid NVIDIA_API_KEY length' };
    return { ok: true, value: k };
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const callNvidiaChat = async ({ model, messages, max_tokens = 800, temperature = 0.2, top_p = 1, retries = 1, requestTag = 'nvidiaChat', fetchImpl = fetch, extraParams = {} }) => {
    const apiKey = process.env.NVIDIA_API_KEY || '';
    const validated = validateNvidiaApiKey(apiKey);
    if (!validated.ok) {
        const err = new Error(validated.reason);
        err.status = 500;
        throw err;
    }

    const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
    let attempt = 0;
    while (true) {
        attempt += 1;
        const start = Date.now();
        const res = await fetchImpl(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${validated.value}`,
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens,
                temperature,
                top_p,
                stream: false,
                ...extraParams
            })
        });
        const elapsed = Date.now() - start;
        console.log(`[NVIDIA] API call (${requestTag}) attempt ${attempt} took ${elapsed}ms`);

        const retryAfterHeader = res.headers?.get ? res.headers.get('retry-after') : null;
        const json = await res.json().catch(() => null);
        if (res.ok) return json;

        const status = res.status;
        const message = (json && (json.error?.message || json.error)) || `HTTP ${status}`;
        const canRetry = attempt <= retries && (status === 429 || status === 500 || status === 502 || status === 503 || status === 504);
        if (!canRetry) {
            console.error('[NVIDIA] request failed', { requestTag, status, attempt, message });
            const err = new Error(message);
            err.status = status;
            err.details = json;
            throw err;
        }

        let waitMs = Math.min(15_000, 500 * (2 ** (attempt - 1)));
        const jitter = Math.floor(Math.random() * 200);
        waitMs += jitter;
        const retryAfterSeconds = Number(retryAfterHeader);
        if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            waitMs = Math.max(waitMs, Math.min(60_000, retryAfterSeconds * 1000));
        }
        console.warn('[NVIDIA] retrying', { requestTag, status, attempt, waitMs });
        await wait(waitMs);
    }
};

const extractAssistantText = (payload) => {
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return '';
    // Strip any <think>...</think> tags if present
    const thinkEnd = content.lastIndexOf('</think>');
    if (thinkEnd >= 0) {
        return content.slice(thinkEnd + '</think>'.length).trim();
    }
    return content.trim();
};

const buildVisionContent = (images, query) => {
    const firstImg = images.find(img => typeof img === 'string' && img.startsWith('data:image/'));
    if (!firstImg) return query;

    // Llama 3.2 90B Vision Instruct recommended multi-modal format
    return [
        { "type": "image_url", "image_url": { "url": firstImg } },
        { "type": "text", "text": query }
    ];
};

const extractStructureViaRegex = (text) => {
    const result = {
        detectedCrop: 'UNKNOWN',
        confidence: 0,
        quality_percentage: 0,
        grade: null,
        defects_detected: [],
        summary: text
    };

    // Extract Detected Crop
    const cropMatch = text.match(/\*?\*?Detected Crop:\*?\*?\s*([^\n]+)/i) || 
                      text.match(/Verification:\s*([^\n\r.]+)/i) ||
                      text.match(/"detectedCrop":\s*"([^"]+)"/i);
    if (cropMatch) result.detectedCrop = cropMatch[1].trim();

    // Extract Confidence
    const confMatch = text.match(/Confidence:\s*(\d+)%/i) || text.match(/"confidence":\s*(\d+)/i);
    if (confMatch) result.confidence = parseInt(confMatch[1], 10);

    // Extract Quality Percentage
    const qualMatch = text.match(/Quality Percentage:\s*(\d+)%/i) || text.match(/"quality_percentage":\s*(\d+)/i);
    if (qualMatch) result.quality_percentage = parseInt(qualMatch[1], 10);

    // Extract Grade
    const gradeMatch = text.match(/\*?\*?Grade:\*?\*?\s*(\w+(?:\s\w+)?)/i) || text.match(/"grade":\s*"([^"]+)"/i);
    if (gradeMatch) {
        const g = gradeMatch[1].toLowerCase();
        if (g.includes('premium')) result.grade = 'Premium';
        else if (g.includes('excellent')) result.grade = 'Excellent';
        else if (g.includes('good')) result.grade = 'Good';
        else if (g.includes('fair')) result.grade = 'Fair';
        else if (g.includes('poor')) result.grade = 'Poor';
    }

    // Extract Defects
    const defectsMatch = text.match(/Defects Detected:\s*([^\n]+)/i) || text.match(/"defects_detected":\s*\[([^\]]+)\]/i);
    if (defectsMatch) {
        result.defects_detected = defectsMatch[1].split(',').map(s => s.replace(/"/g, '').trim());
    }

    // Extract Summary (clean up if it includes metadata)
    const summaryMatch = text.match(/Summary:\s*([\s\S]+)$/i) || text.match(/"summary":\s*"([^"]+)"/i);
    if (summaryMatch) result.summary = summaryMatch[1].trim();

    // Final verification against available list to ensure most specific match
    if (result.detectedCrop && Array.isArray(options.availableCrops) && options.availableCrops.length > 0) {
        const summaryLower = (result.summary || '').toLowerCase();
        // Sort by length descending to prioritize specific varieties (e.g., "Sweet Potato" over "Potato")
        const sortedAvailable = [...options.availableCrops].sort((a, b) => b.length - a.length);

        for (const cropName of sortedAvailable) {
            const cropLower = cropName.toLowerCase();
            // If the more specific name is in the summary, prefer it over a generic detection
            if (summaryLower.includes(cropLower)) {
                if (cropName.length > result.detectedCrop.length || result.detectedCrop.toUpperCase() === 'UNKNOWN') {
                    result.detectedCrop = cropName;
                    break;
                }
            }
        }
    }

    return result;
};

const analyzeCropImages = async ({ images, expectedCropName, availableCrops = [] }) => {
    const cropListStr = availableCrops.length > 0 
        ? availableCrops.join(', ')
        : "Tomato, Wheat, Onion, Corn, Chilli, Potato, Rice, Mango, Banana, Apple, Garlic, Ginger, Yam, Cotton, Turmeric";

    const systemPrompt = [
        "You are an expert agricultural inspector. Your goal is to analyze crop images and return structured data.",
        "",
        "STANDARD CROP NAMES (use ONLY these for 'detectedCrop'):",
        cropListStr,
        "",
        "CRITICAL CONSTRAINTS:",
        "1. NO CONVERSATION: Do not say 'Here is the analysis' or 'I hope this helps'.",
        "2. NO MARKDOWN HEADINGS: Do not use # or ##. Use ONLY simple bold text if needed in summary.",
        "3. JSON ONLY: Your entire response must be a single JSON object. If you must provide extra details, put them INSIDE the 'summary' field.",
        "4. DECISIVENESS: Identify produce carefully based on visual characteristics. Use the MOST SPECIFIC name from the list (e.g., if it is 'Sweet Potato', do NOT just say 'Potato').",
        "5. REPRESENTATIVE GRADING: Grade based on the OVERALL batch quality. If 90% of the produce is excellent, focus on that majority.",
        "6. CONSISTENCY: 'detectedCrop' MUST match the identity stated in 'summary'.",
        "",
        "PROFESSIONAL GRADING SCALE (Agricultural Standards):",
        "- PREMIUM: Near-perfect, uniform, free from any blemishes, bruises, or discoloration. Peak commercial quality.",
        "- EXCELLENT: High quality with only very minor/negligible skin defects (e.g., small scratches) that do not affect shelf life or interior quality.",
        "- GOOD: Standard commercial quality; may have some shape irregularities, minor surface blemishes, or size variations.",
        "- FAIR: Significant visible defects, bruising, or lack of uniformity; best suited for processing or local use rather than premium retail.",
        "- POOR: Presence of rot, mold, pest damage, or significant structural damage that makes the produce largely unmarketable.",
        "",
        "OUTPUT SCHEMA:",
        "{",
        "  \"detectedCrop\": \"Standard Name\",",
        "  \"confidence\": 0-100,",
        "  \"quality_percentage\": 0-100,",
        "  \"grade\": \"Premium | Excellent | Good | Fair | Poor\",",
        "  \"defects_detected\": [\"specific visual flaws\"],",
        "  \"summary\": \"Strictly 4-5 lines of professional inspection results. Start with 'Verification: [Crop] confirmed.'\" ",
        "}"
    ].join('\n');

    const userQuery = [
        "Analyze the provided image for crop identification and grading.",
        expectedCropName ? `Check if this is specifically "${expectedCropName}". Use this name if it matches accurately.` : "Identify the standard crop name from the image using the provided list.",
        "Requirements:",
        "- Populate all JSON fields accurately.",
        "- Deduct quality points for visible rot, bruises, or discoloration.",
        "- Summary MUST be 4-5 lines long.",
        "- Return ONLY the JSON object."
    ].join('\n');

    const model = 'meta/llama-3.2-90b-vision-instruct';

    const payload = await callNvidiaChat({
        model,
        requestTag: 'analyzeCropImages',
        max_tokens: 512,
        temperature: 0,
        top_p: 0.1,
        retries: 1,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: buildVisionContent(images, userQuery) }
        ]
    });

    if (!payload || !payload.choices) {
        console.error('[NVIDIA] Invalid response:', JSON.stringify(payload));
        return { rawText: '', parsed: null };
    }

    const text = extractAssistantText(payload);
    let parsed = safeJsonParse(text);
    
    // Fallback: If JSON parsing fails, use regex to extract the important bits
    if (!parsed) {
        console.warn('[NVIDIA] JSON parse failed, attempting regex extraction');
        parsed = extractStructureViaRegex(text);
    }

    return { rawText: text, parsed };
};


module.exports = {
    analyzeCropImages,
    safeJsonParse,
    validateNvidiaApiKey,
    callNvidiaChat
};

