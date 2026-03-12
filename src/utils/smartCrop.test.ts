import { describe, it, expect } from 'vitest';
import { smartCropRectFromRGBA } from './smartCrop';

describe('smartCropRectFromRGBA', () => {
  it('returns a rect focused on high-contrast region', () => {
    const width = 40;
    const height = 30;
    const rgba = new Uint8ClampedArray(width * height * 4);

    const setPixel = (x: number, y: number, v: number) => {
      const i = (y * width + x) * 4;
      rgba[i] = v;
      rgba[i + 1] = v;
      rgba[i + 2] = v;
      rgba[i + 3] = 255;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) setPixel(x, y, 0);
    }

    for (let y = 10; y < 20; y++) {
      for (let x = 24; x < 34; x++) setPixel(x, y, 255);
    }

    const rect = smartCropRectFromRGBA(rgba, width, height, 1);
    expect(rect.w).toBe(rect.h);
    expect(rect.x + rect.w / 2).toBeGreaterThan(width / 2);
  });
});

