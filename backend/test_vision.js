const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

async function testRottenOnion() {
    const fetch = (await import('node-fetch')).default;
    // We will use the exact base64 image the user uploaded. 
    // Wait, let's just use the direct URL from the user's snippet earlier, or any known rotten onion image.
    // Actually, I can just grab a rotten onion image from the web, convert to base64, and send it.

    const imageUrl = "https://www.shutterstock.com/image-photo/rotten-onion-isolated-on-white-600nw-1937968315.jpg";

    console.log("Fetching image...");
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();
    const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    console.log("Sending to NVIDIA API...");

    const supportedCrops = ['Tomato', 'Wheat', 'Onion', 'Rice', 'Cotton', 'Mango', 'Potato', 'Sugarcane', 'Banana', 'Chili', 'Groundnut', 'Corn', 'Carrot', 'Cabbage', 'Cauliflower', 'Brinjal', 'Peas', 'Soybean'];
    const expectedCropName = "Onion";

    const cropHint = expectedCropName
        ? `You MUST identify this crop as "${expectedCropName}". Do not guess any other crop name.`
        : `Choose from this list: ${supportedCrops.join(', ')}. CRITICAL: Do NOT confuse smooth, layered root vegetables (like Red Onions) with cruciferous vegetables (like Cabbage or Cauliflower). Look closely at the texture and layers.`;

    const query = [
        'You are a strict, objective, and deterministic agricultural quality inspector. You only state facts based on the image.',
        cropHint,
        'Describe its quality, freshness, color and any defects.',
        'Grading Rules (You MUST calculate a precise quality_percentage from 0 to 100 based on the image):',
        'STEP 1 (FATAL FLAW CHECK): Look specifically for ANY rot (black/brown mushy spots) or mold (white/green fuzz). If ANY rot or mold exists, the crop is instantly "Bad". Skip to Step 3 and assign a quality_percentage between 0% and 19%.',
        'STEP 2 (STANDARD DEDUCTION): If there is NO rot or mold, start at 100%. Deduct points for flaws (e.g., -5% for minor scratches, -15% for dull color, -30% for bruising/soft spots).',
        'STEP 3 (FINAL GRADING): Map your final quality_percentage strictly using this scale:',
        '- Premium: 85% to 100% (High quality, very minor natural variations allowed)',
        '- Very Good: 70% to 84% (Good quality, noticeable but minor superficial flaws)',
        '- Good: 40% to 69% (Acceptable quality, clear signs of handling or age, no rot)',
        '- Fair: 20% to 39% (Poor quality, heavy bruising or spots, salvageable)',
        '- Bad: 0% to 19% (ANY rot, mold, or severely diseased. Unfit for sale)',
        'CRITICAL: You are an expert agronomist. DO NOT hallucinate a perfect crop if there is obvious black/brown rot. Rot = <20% score instantly.',
        'SUMMARY RULE: The "summary" field must be EXACTLY 4 to 5 sentences long. Provide a factual description of the crop\'s physical state and explicitly state if rot / mold was found.',
        'JSON RULE: You MUST output ONLY valid JSON. Absolutely no other text, no intro, no "Here is the analysis". ONLY the JSON object.',
        'Respond with this exact JSON schema:',
        '{"detectedCrop": "<CropName>", "quality_percentage": <Number 0-100>, "grade": "<Grade from scale above>", "summary": "<Exactly 4 to 5 sentences explaining deductions>"}'
    ].join('\\n');

    const invokeUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
    const payload = {
        model: "meta/llama-3.2-90b-vision-instruct",
        messages: [{ role: "user", content: ` <img src="${base64Image}" />\n\n${query}` }],
        max_tokens: 512,
        temperature: 0.05,
        top_p: 0.70,
        frequency_penalty: 0.00,
        presence_penalty: 0.00
    };

    const res = await fetch(invokeUrl, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${NVIDIA_API_KEY}`,
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.choices && data.choices[0]) {
        console.log("----- AI RESPONSE -----");
        console.log(data.choices[0].message.content);
        console.log("-----------------------");
    } else {
        console.error("No choices in response:", JSON.stringify(data, null, 2));
    }
}

testRottenOnion().catch(console.error);
