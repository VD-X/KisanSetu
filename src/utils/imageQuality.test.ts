import { describe, it, expect } from 'vitest';
import { computeQualityMetricsFromRGBA, qualityGradeFromMetrics } from './imageQuality';

describe('imageQuality', () => {
  it('computes low contrast for flat image', () => {
    const width = 32;
    const height = 32;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const j = i * 4;
      rgba[j] = 128;
      rgba[j + 1] = 128;
      rgba[j + 2] = 128;
      rgba[j + 3] = 255;
    }
    const m = computeQualityMetricsFromRGBA(rgba, width, height);
    expect(m.contrast).toBeLessThan(0.05);
    expect(m.exposure).toBeGreaterThan(0.45);
    expect(m.exposure).toBeLessThan(0.55);
  });

  it('grades Fair when sharpness is very low', () => {
    const m = {
      sharpness: 0.05,
      exposure: 0.5,
      contrast: 0.2,
      noise: 0.2,
      colorBalance: 0.05,
      highlightsClipped: 0,
      shadowsClipped: 0
    };
    expect(qualityGradeFromMetrics(m as any)).toBe('Fair');
  });

  it('can grade Very Good for decent metrics', () => {
    const m = {
      sharpness: 0.55,
      exposure: 0.55,
      contrast: 0.28,
      noise: 0.25,
      colorBalance: 0.08,
      highlightsClipped: 0.01,
      shadowsClipped: 0.01
    };
    expect(qualityGradeFromMetrics(m as any)).toBe('Very Good');
  });
});
