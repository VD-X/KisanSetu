const fs = require('fs');
require('dotenv').config();

async function testNvidia() {
    const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Rotten_tomatoes.jpg/800px-Rotten_tomatoes.jpg";
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Test WITH prefix
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    // Test WITHOUT prefix
    const pureBase64Url = `data:image/jpeg;base64,${base64}`;
    // Wait, OpenAI format standard is `data:image/jpeg;base64,{base64_image_data}`.
    // Let me try another image that I'm sure is a valid JPEG, just to be sure it wasn't a webp masquerading as jpeg.

    const testBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; // 1x1 png red pixel
    const dummyPrompt = "What is this?";

    for (const fmt of [`data:image/png;base64,${testBase64}`, testBase64]) {
        console.log(`\nTesting format: ${fmt.substring(0, 30)}...`);
        const payload = {
            model: "meta/llama-3.2-11b-vision-instruct",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: 'text', text: dummyPrompt },
                        { type: 'image_url', image_url: { url: fmt } }
                    ]
                }
            ],
            max_tokens: 32
        };

        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
            },
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.error) console.log("ERROR:", json.error.message);
        else console.log("SUCCESS:", json.choices[0].message.content);
    }
}

testNvidia().catch(console.error);
