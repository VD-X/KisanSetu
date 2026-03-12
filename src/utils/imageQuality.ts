export type QualityMetrics = {
  sharpness: number;
  exposure: number;
  contrast: number;
  noise: number;
  colorBalance: number;
  highlightsClipped: number;
  shadowsClipped: number;
};

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export const computeQualityMetricsFromRGBA = (rgba: Uint8ClampedArray, width: number, height: number): QualityMetrics => {
  const n = width * height;
  let sum = 0;
  let sumSq = 0;
  let highlights = 0;
  let shadows = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  const lumas = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const r = rgba[j];
    const g = rgba[j + 1];
    const b = rgba[j + 2];
    const y = luma(r, g, b);
    lumas[i] = y;
    sum += y;
    sumSq += y * y;
    if (y >= 245) highlights++;
    if (y <= 10) shadows++;
    rSum += r;
    gSum += g;
    bSum += b;
  }

  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const contrast = Math.sqrt(variance) / 128;
  const exposure = mean / 255;
  const highlightsClipped = highlights / n;
  const shadowsClipped = shadows / n;

  const rMean = rSum / n;
  const gMean = gSum / n;
  const bMean = bSum / n;
  const channelMean = (rMean + gMean + bMean) / 3;
  const colorBalance = (Math.abs(rMean - channelMean) + Math.abs(gMean - channelMean) + Math.abs(bMean - channelMean)) / (3 * 255);

  let lapSum = 0;
  let lapSumSq = 0;
  let lapCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = lumas[y * width + x];
      const v = -lumas[(y - 1) * width + x - 1] - lumas[(y - 1) * width + x] - lumas[(y - 1) * width + x + 1]
        - lumas[y * width + x - 1] + 8 * c - lumas[y * width + x + 1]
        - lumas[(y + 1) * width + x - 1] - lumas[(y + 1) * width + x] - lumas[(y + 1) * width + x + 1];
      lapSum += v;
      lapSumSq += v * v;
      lapCount++;
    }
  }
  const lapMean = lapSum / Math.max(1, lapCount);
  const lapVar = Math.max(0, lapSumSq / Math.max(1, lapCount) - lapMean * lapMean);
  const sharpness = Math.min(1, Math.sqrt(lapVar) / 60);

  let noiseSum = 0;
  let noiseSq = 0;
  let noiseCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const blur = (lumas[idx] + lumas[idx - 1] + lumas[idx + 1] + lumas[idx - width] + lumas[idx + width]) / 5;
      const hp = lumas[idx] - blur;
      noiseSum += hp;
      noiseSq += hp * hp;
      noiseCount++;
    }
  }
  const noiseMean = noiseSum / Math.max(1, noiseCount);
  const noiseVar = Math.max(0, noiseSq / Math.max(1, noiseCount) - noiseMean * noiseMean);
  const noise = Math.min(1, Math.sqrt(noiseVar) / 25);

  return { sharpness, exposure, contrast, noise, colorBalance, highlightsClipped, shadowsClipped };
};

export const qualityGradeFromMetrics = (m: QualityMetrics): 'Premium' | 'Very Good' | 'Good' | 'Average' | 'Fair' => {
  if (m.sharpness < 0.12) return 'Fair';
  const badExposure = m.exposure < 0.18 || m.exposure > 0.9 || m.highlightsClipped > 0.08 || m.shadowsClipped > 0.1;
  const lowSharpness = m.sharpness < 0.25;
  const highNoise = m.noise > 0.65;
  const lowContrast = m.contrast < 0.18;
  const badColor = m.colorBalance > 0.22;

  const penalties = [badExposure, lowSharpness, highNoise, lowContrast, badColor].filter(Boolean).length;
  if (penalties >= 3) return 'Fair';
  if (penalties === 2) return 'Average';
  if (penalties === 1) return 'Good';
  if (m.sharpness > 0.65 && m.noise < 0.35 && m.colorBalance < 0.12 && m.contrast > 0.25) return 'Premium';
  if (m.sharpness > 0.45 && m.noise < 0.45) return 'Very Good';
  return 'Good';
};
