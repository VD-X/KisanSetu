export type NormalizedBox = { x: number; y: number; w: number; h: number };
export type PixelRect = { x: number; y: number; w: number; h: number };

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export const normalizeBox = (box: Partial<NormalizedBox> | null | undefined): NormalizedBox | null => {
  if (!box) return null;
  const x = clamp01(Number(box.x) || 0);
  const y = clamp01(Number(box.y) || 0);
  const w = clamp01(Number(box.w) || 0);
  const h = clamp01(Number(box.h) || 0);
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
};

export const rectFromNormalized = (box: NormalizedBox, width: number, height: number): PixelRect => {
  const x = Math.max(0, Math.min(width - 1, Math.floor(box.x * width)));
  const y = Math.max(0, Math.min(height - 1, Math.floor(box.y * height)));
  const w = Math.max(1, Math.min(width - x, Math.floor(box.w * width)));
  const h = Math.max(1, Math.min(height - y, Math.floor(box.h * height)));
  return { x, y, w, h };
};

export const centerCropRect = (width: number, height: number, aspectRatio: number): PixelRect => {
  const srcAspect = width / height;
  let w = width;
  let h = height;
  if (srcAspect > aspectRatio) {
    w = Math.round(height * aspectRatio);
    h = height;
  } else {
    w = width;
    h = Math.round(width / aspectRatio);
  }
  const x = Math.max(0, Math.floor((width - w) / 2));
  const y = Math.max(0, Math.floor((height - h) / 2));
  return { x, y, w, h };
};

export const adjustRectToAspect = (rect: PixelRect, width: number, height: number, aspectRatio: number): PixelRect => {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  let w = rect.w;
  let h = rect.h;
  const currentAspect = w / h;
  if (currentAspect > aspectRatio) {
    h = Math.max(1, Math.round(w / aspectRatio));
  } else {
    w = Math.max(1, Math.round(h * aspectRatio));
  }
  w = Math.min(width, w);
  h = Math.min(height, h);
  const x = Math.max(0, Math.min(width - w, Math.round(cx - w / 2)));
  const y = Math.max(0, Math.min(height - h, Math.round(cy - h / 2)));
  return { x, y, w, h };
};

export const computeGradientEnergy = (rgba: Uint8ClampedArray, width: number, height: number): Float32Array => {
  const energy = new Float32Array(width * height);
  const lumaAt = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx = -lumaAt(x - 1, y - 1) + lumaAt(x + 1, y - 1)
        - 2 * lumaAt(x - 1, y) + 2 * lumaAt(x + 1, y)
        - lumaAt(x - 1, y + 1) + lumaAt(x + 1, y + 1);
      const gy = -lumaAt(x - 1, y - 1) - 2 * lumaAt(x, y - 1) - lumaAt(x + 1, y - 1)
        + lumaAt(x - 1, y + 1) + 2 * lumaAt(x, y + 1) + lumaAt(x + 1, y + 1);
      const idx = y * width + x;
      energy[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return energy;
};

export const boundingBoxFromEnergy = (energy: Float32Array, width: number, height: number, percentile = 0.8): PixelRect | null => {
  const values: number[] = [];
  for (let i = 0; i < energy.length; i++) values.push(energy[i]);
  values.sort((a, b) => a - b);
  const t = values[Math.floor(values.length * percentile)] ?? 0;

  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = energy[y * width + x];
      if (v >= t && v > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  const w = Math.max(1, maxX - minX + 1);
  const h = Math.max(1, maxY - minY + 1);
  return { x: minX, y: minY, w, h };
};

export const smartCropRectFromRGBA = (rgba: Uint8ClampedArray, width: number, height: number, aspectRatio = 1): PixelRect => {
  const energy = computeGradientEnergy(rgba, width, height);
  const bbox = boundingBoxFromEnergy(energy, width, height, 0.82);
  if (!bbox) return centerCropRect(width, height, aspectRatio);
  const expanded = {
    x: Math.max(0, bbox.x - Math.round(bbox.w * 0.08)),
    y: Math.max(0, bbox.y - Math.round(bbox.h * 0.08)),
    w: Math.min(width - bbox.x, Math.round(bbox.w * 1.16)),
    h: Math.min(height - bbox.y, Math.round(bbox.h * 1.16))
  };
  return adjustRectToAspect(expanded, width, height, aspectRatio);
};

