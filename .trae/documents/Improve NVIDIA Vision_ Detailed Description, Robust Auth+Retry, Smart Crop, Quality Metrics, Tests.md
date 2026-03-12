## 1) Detailed image description (objects, colors, textures, layout, text)
- Add/extend a backend endpoint that asks the NVIDIA vision model for a structured response:
  - `detailedDescription`: long, comprehensive paragraph(s)
  - `objects`: array of {name, color, texture, position, sizeRelative}
  - `textSymbols`: array of detected text/symbols
  - `sceneSummary`: short summary (keep current `summary`)
- Update the NVIDIA prompt so it explicitly includes: objects, colors, textures, spatial relationships, and any readable text.
- Return these fields to the frontend and display them in the farmer “Summary” section.

## 2) Fix NVIDIA API key fetching/auth + logging + retries
- Centralize auth retrieval in the backend NVIDIA service:
  - Read `process.env.NVIDIA_API_KEY` only (no hardcoding).
  - Validate non-empty + basic format (`nvapi-` prefix) before requests.
- Improve error handling:
  - Log status code, error body (sanitized), and request correlation id.
  - Do not log the API key.
- Add robust retry:
  - Retry on 429 and 5xx with exponential backoff + jitter.
  - Respect `Retry-After` when present.
  - Cap retries (e.g., 3) and return a user-safe message on failure.
- Ensure env loading is consistent:
  - Confirm backend loads root `.env.local` (already referenced) and optionally enable dotenv override for local dev if needed.

## 3) Automatic crop selection (smart focal cropping)
- Implement “smart crop” that finds the most important region and crops while keeping aspect ratio:
  - Preferred: ask NVIDIA model for a primary bounding box of the crop/produce in normalized coords `{x,y,w,h}`.
  - Convert bbox to a crop rectangle adjusted to target aspect ratio (1:1 for listing thumbnails).
  - Apply cropping in the frontend using Canvas (so the user sees the cropped preview instantly).
  - Fallback: center-crop if bbox is missing/invalid.
- Store cropped image dataURL for listing (or keep original + cropped variant depending on storage constraints).

## 4) Automatic quality grading + detailed metrics
- Add deterministic local quality metrics (frontend) computed per image:
  - Sharpness (Laplacian/gradient variance)
  - Exposure (mean luminance + highlight/shadow clipping)
  - Contrast (luma std dev)
  - Noise estimate (high-frequency residual)
  - Color balance (RGB channel mean deviation)
- Produce:
  - `qualityMetrics` object + `qualityGrade` (Premium/Good/Average/Fair)
- Combine with NVIDIA grade:
  - Use NVIDIA grade as primary (human-like rubric) and show local metrics for transparency.
  - If NVIDIA fails, fallback to local grade.

## 5) Comprehensive tests + coverage
- Backend (node:test):
  - Unit tests for NVIDIA response parsing, retry logic behavior (mock fetch), and key validation.
  - Unit tests for crop-name → cropId mapping (including translations).
  - Integration-style tests for controller handlers using mocked NVIDIA responses.
- Frontend:
  - Add Vitest (since none exists) and write unit tests for:
    - Smart-crop rectangle calculation and aspect-ratio adjustment
    - Quality metrics calculations on synthetic image buffers
- Coverage:
  - Add `c8` for backend coverage reporting.
  - Add Vitest coverage (v8) for frontend tests.

## Files expected to change/add
- Backend:
  - `backend/src/services/nvidiaVisionService.js` (auth validation, retries, better logging, new describe/box prompt)
  - `backend/src/controllers/aiController.js` (return detailedDescription/boxes/metrics)
  - `backend/src/services/cropMappingService.js` (translations-aware mapping)
  - New tests under `backend/test/*`
  - Dev deps/scripts for coverage
- Frontend:
  - `components/FarmerDashboard.tsx` (show detailed description + crop preview)
  - New utilities for smart-crop + quality metrics (testable pure functions)
  - Add Vitest config and tests

## Deliverables
- Farmer upload shows:
  - Auto-selected crop
  - Auto grade
  - Summary section with short summary + detailed description + (optional) detected text
  - Optional “smart-cropped” preview
  - Visible quality metrics
- Reliable NVIDIA calls with validated key, retries, and actionable error messages
- Test suite + coverage outputs