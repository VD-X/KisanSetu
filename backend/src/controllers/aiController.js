const { GoogleGenerativeAI } = require('@google/generative-ai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');
const { analyzeCropImages, callNvidiaChat } = require('../services/nvidiaVisionService');
const marketPriceService = require('../services/marketPriceService');

// Rate Limiting (In-Memory)
const rateLimit = new Map();

const checkRateLimit = (userId) => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5;

  if (!rateLimit.has(userId)) {
    rateLimit.set(userId, { count: 1, startTime: now });
    return { allowed: true };
  }

  const userLimit = rateLimit.get(userId);
  const timePassed = now - userLimit.startTime;

  if (timePassed > windowMs) {
    rateLimit.set(userId, { count: 1, startTime: now });
    return { allowed: true };
  }

  if (userLimit.count >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((windowMs - timePassed) / 1000) };
  }

  userLimit.count++;
  return { allowed: true };
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// Get market price for specific crop
exports.getMarketPrice = async (req, res) => {
  try {
    const { crop, location } = req.query;
    if (!crop || !location) {
      return res.status(400).json({ error: 'Crop and location are required' });
    }

    // Try to find crop by name to get ID
    const cropRecord = await prisma.crop.findFirst({
      where: { name: { equals: crop, mode: 'insensitive' } }
    });

    if (cropRecord) {
      const price = await marketPriceService.getPriceForCrop(cropRecord.id, location);
      return res.json(price);
    }

    // Fallback: Use AI directly if crop not in DB
    const aiPrice = await marketPriceService.fetchFromGeminiAI(crop, location);
    if (aiPrice) {
      return res.json(aiPrice);
    }

    // Mock fallback
    return res.json(marketPriceService.generateMockPrice(crop, location));

  } catch (error) {
    console.error('Get market price error:', error);
    res.status(500).json({ error: 'Failed to fetch market price' });
  }
};

// Generate market price recommendations
// Generate market price recommendations
exports.getMarketPriceRecommendations = async (req, res) => {
  try {
    const { location, cropType } = req.query;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    // Check rate limit
    const userId = req.dbUser?.id || 'anonymous';
    const rateCheck = checkRateLimit(userId);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: rateCheck.retryAfter
      });
    }

    // Generate AI recommendation with structured JSON output
    const prompt = `As an agricultural expert, provide current market price recommendations for ${cropType || 'crops'} in ${location}, India.
    
    Return ONLY a valid JSON array of objects. Do not include markdown formatting or explanations outside the JSON.
    Each object must have these exact fields:
    - cropName (string): Name of the crop
    - trend (string): "Rising", "Falling", or "Stable"
    - demand (string): "High", "Medium", or "Low"
    - reason (string): Brief reason for the trend (max 20 words)

    Provide at least 3 recommendations.
    Example format:
    [
      { "cropName": "Tomato", "trend": "Rising", "demand": "High", "reason": "Heavy rains affecting supply" }
    ]`;

    let recommendationsData = [];
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error('No API Key');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up markdown code blocks if present
      const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
      recommendationsData = JSON.parse(jsonStr);

      if (!Array.isArray(recommendationsData)) {
        throw new Error('AI did not return an array');
      }
    } catch (aiError) {
      console.warn('AI Recommendation failed, using mock data:', aiError.message);
      // Mock data matching the frontend interface
      recommendationsData = [
        {
          cropName: "Tomato",
          trend: "Rising",
          demand: "High",
          reason: "Seasonal shortage in local markets due to recent rains."
        },
        {
          cropName: "Onion",
          trend: "Stable",
          demand: "Medium",
          reason: "Steady supply from storage facilities."
        },
        {
          cropName: "Chilli",
          trend: "Rising",
          demand: "High",
          reason: "High export demand and lower local production."
        }
      ];
    }

    // Return the array directly or in a wrapper property depending on frontend expectation
    // Based on "aiRecommendations.map", if the frontend uses data.recommendations, we verify structure below.
    // Assuming frontend uses `const { recommendations } = await api...` or similar.
    // If frontend expects plain array: res.json(recommendationsData);
    // If frontend expects { recommendations: [...] }: res.json({ recommendations: recommendationsData });

    // Looking at previous valid implementation in api.ts/FarmerDashboard, likely { recommendations: [...] }

    res.json({
      location,
      recommendations: recommendationsData,
      timestamp: new Date().toISOString(),
      source: process.env.GEMINI_API_KEY ? 'AI_Gemini' : 'Mock_Data'
    });
  } catch (error) {
    console.error('Market price recommendation error:', error);
    res.status(500).json({
      error: 'Failed to generate market price recommendations',
      details: error.message
    });
  }
};

// Analyze crop images
exports.analyzeCropImages = async (req, res) => {
  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images array is required' });
    }

    // Check rate limit
    const userId = req.dbUser?.id || 'anonymous';
    const rateCheck = checkRateLimit(userId);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: rateCheck.retryAfter
      });
    }

    // Analyze images using NVIDIA service
    const analysisResults = await analyzeCropImages(images);

    res.json({
      analysis: analysisResults,
      timestamp: new Date().toISOString(),
      source: 'NVIDIA_Vision'
    });
  } catch (error) {
    console.error('Crop image analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze crop images',
      details: error.message
    });
  }
};

// Chat with AI assistant
exports.chatWithAI = async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check rate limit
    const userId = req.user?.id || 'anonymous';
    const rateCheck = checkRateLimit(userId);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: rateCheck.retryAfter
      });
    }

    // Use NVIDIA chat service if available, fallback to Gemini
    let response;
    try {
      response = await callNvidiaChat(message, context);
    } catch (nvidiaError) {
      console.log('NVIDIA service failed, falling back to Gemini:', nvidiaError.message);

      const prompt = `As an agricultural expert assistant, help with this query: ${message}
      
      Context: ${context || 'General farming inquiry'}
      
      Provide helpful, practical advice for Indian farmers.`;

      const result = await model.generateContent(prompt);
      const geminiResponse = await result.response;
      response = geminiResponse.text();
    }

    res.json({
      response,
      timestamp: new Date().toISOString(),
      source: response.includes('NVIDIA') ? 'NVIDIA_Chat' : 'Gemini_Chat'
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat request',
      details: error.message
    });
  }
};

// Vision Detect (Frontend Compatibility Wrapper)
exports.visionDetect = async (req, res) => {
  try {
    const { images, expectedCropName, availableCrops } = req.body;

    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: 'Images array is required' });
    }

    // Check rate limit
    const userId = req.user?.id || 'anonymous';
    const rateCheck = checkRateLimit(userId);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: rateCheck.retryAfter
      });
    }

    // Reuse existing analysis service
    const analysisResults = await analyzeCropImages({ images, expectedCropName, availableCrops });

    // Flatten response for frontend
    const parsed = analysisResults.parsed || {};

    let finalGrade = parsed.grade || null;
    if (finalGrade) {
      const g = String(finalGrade).toLowerCase();
      if (g.includes('premium') || g.includes('excellent')) finalGrade = 'Premium';
      else if (g.includes('very good')) finalGrade = 'Very Good';
      else if (g.includes('good')) finalGrade = 'Good';
      else if (g.includes('fair')) finalGrade = 'Fair';
      else if (g.includes('bad')) finalGrade = 'Bad';
      else finalGrade = parsed.grade;
    }

    res.json({
      detectedCrop: parsed.detectedCrop || 'UNKNOWN',
      confidence: parsed.confidence || 0,
      summary: parsed.summary || analysisResults.rawText || '',
      grade: finalGrade,
      rawText: analysisResults.rawText,
      timestamp: new Date().toISOString(),
      source: 'NVIDIA_Vision'
    });

  } catch (error) {
    console.error('Vision detect error:', error);
    res.status(500).json({
      error: 'Failed to analyze image',
      details: error.message
    });
  }
};
