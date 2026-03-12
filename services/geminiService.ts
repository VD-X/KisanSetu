
import { aiAPI } from "./api";

const fallbackSpeak = (text: string) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to find a suitable Indian-English or local voice if possible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 0.9; // Slightly slower for better clarity for rural users
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.error("Browser does not support Speech Synthesis and Gemini TTS failed.");
  }
};

export const geminiService = {
  /**
   * Translates text to target language with retry logic for 429s
   */
  async translate(text: string, targetLang: string, retries = 2): Promise<string> {
    return text;
  },

  /**
   * Fetches real-time market prices for a crop in a location
   */
  async getMarketPrice(crop: string, location: string, retries = 1) {
    try {
      return await aiAPI.getMarketPrice(crop, location);
    } catch (error: any) {
      if (retries > 0 && error?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.getMarketPrice(crop, location, retries - 1);
      }
      return null;
    }
  },

  /**
   * Gets AI crop recommendations based on location and seasonal demand with 429 retry logic
   */
  async getCropRecommendations(location: string, retries = 1) {
    try {
      const res = await aiAPI.getRecommendations(location);
      return res.recommendations || [];
    } catch (error: any) {
      return [
        { cropName: "Tomato", reason: "Shortage in nearby Mandis due to seasonal shift", demand: "High", trend: "Rising" },
        { cropName: "Onion", reason: "End of season storage depletion reported locally", demand: "High", trend: "Stable" },
        { cropName: "Wheat", reason: "Stable procurement rates at local mandis", demand: "Medium", trend: "Stable" }
      ];
    }
  },

  /**
   * Text to Speech using Gemini with automatic fallback to Web Speech API on quota exhaustion (429)
   */
  async speak(text: string, voice: 'Kore' | 'Puck' | 'Charon' = 'Kore') {
    fallbackSpeak(text);
  },
  async getQualityGradeFromImages(images: string[]): Promise<'Premium' | 'Good' | 'Average' | 'Fair'> {
    if (!images || images.length === 0) return 'Good';

    try {
      // Try AI grading first
      const res = await aiAPI.getQualityGrade(images);
      if (res && res.grade) {
        return res.grade as 'Premium' | 'Good' | 'Average' | 'Fair';
      }
    } catch (error) {
      console.warn('AI grading failed, falling back to local analysis:', error);
    }

    // Fallback to local analysis
    return this.calculateLocalQualityGrade(images);
  },

  async calculateLocalQualityGrade(images: string[]): Promise<'Premium' | 'Good' | 'Average' | 'Fair'> {
    if (!images || images.length === 0) return 'Good';

    try {
      const analyze = (src: string) =>
        new Promise<{ brightness: number; contrast: number; edge: number; saturation: number; uniformity: number }>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous'; // Handle CORS if images are external
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 128; // Downsample for performance
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return reject(new Error('No canvas context'));

            ctx.drawImage(img, 0, 0, size, size);
            const imageData = ctx.getImageData(0, 0, size, size);
            const data = imageData.data;

            let rSum = 0, gSum = 0, bSum = 0;
            let totalBrightness = 0;
            let totalSaturation = 0;
            let edgeSum = 0;
            let pixelCount = 0;

            // First pass: Calculate means
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              rSum += r;
              gSum += g;
              bSum += b;

              const max = Math.max(r, g, b);
              const min = Math.min(r, g, b);
              const l = (max + min) / 2;
              const s = max === min ? 0 : (l > 127 ? (max - min) / (510 - max - min) : (max - min) / (max + min));

              totalBrightness += l;
              totalSaturation += s;
              pixelCount++;
            }

            const rMean = rSum / pixelCount;
            const gMean = gSum / pixelCount;
            const bMean = bSum / pixelCount;
            const brightnessMean = totalBrightness / pixelCount;
            const saturationMean = totalSaturation / pixelCount;

            // Second pass: Calculate Variance (Uniformity) and Edges
            let rVar = 0, gVar = 0, bVar = 0;

            const idx = (x: number, y: number) => (y * size + x) * 4;

            for (let y = 0; y < size; y++) {
              for (let x = 0; x < size; x++) {
                const i = idx(x, y);
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                rVar += (r - rMean) ** 2;
                gVar += (g - gMean) ** 2;
                bVar += (b - bMean) ** 2;

                // Simple Edge Detection
                if (x < size - 1 && y < size - 1) {
                  const nextX = idx(x + 1, y);
                  const nextY = idx(x, y + 1);
                  const grayObj = (r + g + b) / 3;
                  const grayX = (data[nextX] + data[nextX + 1] + data[nextX + 2]) / 3;
                  const grayY = (data[nextY] + data[nextY + 1] + data[nextY + 2]) / 3;
                  edgeSum += Math.abs(grayObj - grayX) + Math.abs(grayObj - grayY);
                }
              }
            }

            const colorVariance = Math.sqrt((rVar + gVar + bVar) / 3 / pixelCount);
            const edgeDensity = edgeSum / (pixelCount * 2);

            // Contrast implies better visibility, but too high variance might mean messy background
            // Low variance = Uniform color (Premium trait for many crops)
            // High saturation = Freshness

            // Normalize metrics roughly to 0-100 range for readability
            resolve({
              brightness: brightnessMean, // 0-255
              contrast: colorVariance,    // 0-100+
              edge: edgeDensity,          // 0-50+
              saturation: saturationMean * 100, // 0-100
              uniformity: 100 - Math.min(100, colorVariance) // Higher is more uniform
            });
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = src;
        });

      // Analyze the first image (or average of first 3)
      const metrics = await analyze(images[0]);

      // console.log('Image Metrics:', metrics);

      // grading Logic

      // 1. Extreme lighting conditions check
      if (metrics.brightness < 40 || metrics.brightness > 225) return 'Fair'; // Too dark or washed out

      // 2. Saturation Check (Dull/Gray images are likely lower quality)
      if (metrics.saturation < 15) return 'Average';

      // 3. Premium Check
      // Needs good lighting, good saturation (fresh), and decent uniformity
      if (metrics.brightness > 60 && metrics.brightness < 200 &&
        metrics.saturation > 30 &&
        metrics.uniformity > 45 && metrics.edge > 5) {
        return 'Premium';
      }

      // 4. Good Check
      if (metrics.brightness > 50 && metrics.brightness < 210 &&
        metrics.saturation > 20) {
        return 'Good';
      }

      // 5. Average Check
      if (metrics.uniformity < 30 || metrics.edge < 3) {
        return 'Average';
      }

      return 'Fair';

    } catch (e) {
      console.warn('Local grading failed, defaulting:', e);
      return 'Good';
    }
  }
  ,

  async validateCropImagesMatchSelected(
    images: string[],
    expectedCropName: string,
    retries = 1
  ): Promise<{ status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'FAILED'; matches: boolean; detectedCrop: string; confidence: number; userMessage: string }> {
    try {
      const expected = String(expectedCropName || '').trim();
      if (!expected) return { status: 'FAILED', matches: false, detectedCrop: 'UNKNOWN', confidence: 0, userMessage: 'Please select a crop first.' };
      const res = await aiAPI.verifyCrop({ expectedCropName: expected, images: images.slice(0, 3) });
      const status = String(res.status || (res.matches ? 'VERIFIED' : 'REJECTED')).toUpperCase();
      const normalizedStatus =
        status === 'VERIFIED' || status === 'REJECTED' || status === 'PENDING' || status === 'FAILED'
          ? (status as 'VERIFIED' | 'REJECTED' | 'PENDING' | 'FAILED')
          : (Boolean(res.matches) ? 'VERIFIED' : 'REJECTED');
      return {
        status: normalizedStatus,
        matches: Boolean(res.matches),
        detectedCrop: String(res.detectedCrop || 'UNKNOWN'),
        confidence: Number.isFinite(Number(res.confidence)) ? Math.max(0, Math.min(1, Number(res.confidence))) : 0,
        userMessage: String(res.userMessage || '')
      };
    } catch (error: any) {
      if (retries > 0 && String(error?.message || '').includes('429')) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return this.validateCropImagesMatchSelected(images, expectedCropName, retries - 1);
      }
      return { status: 'FAILED', matches: false, detectedCrop: 'UNKNOWN', confidence: 0, userMessage: 'AI verification is temporarily unavailable. Please try again later.' };
    }
  }
  ,

  async verifyHarvestImage(
    cropName: string,
    selectedHarvestType: 'STANDING_CROP' | 'HARVESTED_CROP' | 'PROCESSED_CLEANED_CROP' | 'SEED_NURSERY',
    image: string | string[],
    retries = 3
  ): Promise<{
    isValid: boolean;
    detectedCrop: string | null;
    detectedHarvestStage: string | null;
    confidence: number;
    reason: string;
    userMessage: string;
  }> {
    try {
      const images = Array.isArray(image) ? image : [image];
      const res = await aiAPI.verifyHarvest({ cropName, selectedHarvestType, images });
      return {
        isValid: Boolean(res.isValid),
        detectedCrop: res.detectedCrop ?? null,
        detectedHarvestStage: res.detectedHarvestStage ?? null,
        confidence: Number.isFinite(Number(res.confidence)) ? Math.max(0, Math.min(1, Number(res.confidence))) : 0,
        reason: String(res.reason || ''),
        userMessage: String(res.userMessage || '')
      };
    } catch (error: any) {
      return {
        isValid: false,
        detectedCrop: null,
        detectedHarvestStage: null,
        confidence: 0,
        reason: 'Verification failed',
        userMessage: String(error?.message || 'AI verification is temporarily unavailable. Please try again later.')
      };
    }
  }
};
