## Important security note (will be done as part of implementation)
- The API key pasted in the message must be treated as **compromised**. I will **not** hardcode it anywhere.
- The integration will use `NVIDIA_API_KEY` from backend environment variables and remove any committed Gemini/NVIDIA keys from the repo.

## Current state (what’s happening now)
- Listing publish flow does **not** enforce any verification; it only checks “at least 1 image”.
- Quality grading currently uses Gemini via `POST /ai/quality-grade` (with a local heuristic fallback).
- Gemini-based verify endpoints exist but are not wired into publish.

## Target behavior (your requirements)
- When a farmer uploads listing images:
  - Automatically call NVIDIA VL model for **image-based crop detection**.
  - Produce:
    - `detectedCrop` (auto-detected)
    - `confidence`
    - `summary` (what’s in the image)
    - `grade` + `reason` (quality grade)
  - Auto-set listing crop selection to the detected crop (when it matches a known crop in DB).
  - Show a new **Summary** section in the UI (detected crop + confidence + grade + summary).
- Remove Gemini-based image verification from the listing flow (and replace endpoints so the app is NVIDIA-driven).

## Backend changes
1) **Add NVIDIA vision service**
- Create a backend service module (e.g. `nvidiaVisionService`) that calls:
  - `https://integrate.api.nvidia.com/v1/chat/completions`
  - model: `nvidia/nemotron-nano-12b-v2-vl`
- Input: up to N images (use first 1–4 for cost/speed), base64 data URLs.
- Output: strict JSON schema (server-validated):
  - `detectedCropName`, `confidence`, `summary`, `grade`, `gradeReason`

2) **Replace Gemini endpoints used by the app**
- Update existing backend endpoints to use NVIDIA:
  - `POST /ai/verify-crop` → NVIDIA detection + mismatch logic
  - `POST /ai/quality-grade` → NVIDIA grading
- Return structure will include both grade and summary so the UI can show the “Summary” section.

3) **Crop-name to DB crop mapping**
- Reuse the existing “cached crop names” matching strategy (normalize + rough match) to map `detectedCropName` → `cropId`.
- Return `detectedCropId` when match found.

4) **Server-side validation**
- Reject unsupported file types.
- Enforce max images count and max payload size to protect the server.
- Ensure no `0,0`/empty content requests.

## Frontend changes (Farmer listing flow)
1) **Remove Gemini grading call from listing images**
- Replace `geminiService.getQualityGradeFromImages()` usage with a call to the backend NVIDIA endpoint.

2) **Auto crop detection + grading on image upload**
- After images are chosen/uploaded, call `aiAPI.verifyCrop` (now NVIDIA-powered).
- If `detectedCropId` is present:
  - set `newListing.cropId = detectedCropId` automatically.
- Set:
  - `newListing.grade` from returned `grade`.
  - store `imageSummary` (new local state) to render in UI.

3) **Add “Summary” section to Add Listing screen**
- Show:
  - Detected crop name + confidence
  - Grade + reason
  - Image summary text
- Include loading/error states (e.g. “Verifying images…”, “Could not detect crop”).

4) **Enforce verification before publish**
- On publish:
  - If verification hasn’t run or failed, trigger it automatically.
  - Block publish if the model returns low-confidence/unknown and no crop match is found.

## Cleanup (Gemini removal)
- Remove Gemini-only code paths from the listing flow.
- Keep (or optionally delete) Gemini controller helpers only if other parts still rely on them; otherwise remove to avoid confusion.
- Ensure no hardcoded API keys remain in the repository.

## Testing / verification
- Backend tests:
  - Unit tests for NVIDIA response parsing + crop mapping + low-confidence handling.
- Frontend verification:
  - Add listing with 1–4 images → auto crop id set → grade set → summary rendered.
  - Publish blocked when detection fails.
  - Responsive layout for the new Summary section.

Files expected to change
- Backend: `backend/src/controllers/aiController.js`, `backend/src/services/*` (new NVIDIA service), tests under `backend/test/*`.
- Frontend: `components/FarmerDashboard.tsx`, `services/api.ts` (if response types expand), and removal/adjustment of `services/geminiService.ts` usage.

If you confirm, I’ll implement end-to-end: swap Gemini to NVIDIA, auto-detect crop, add Summary UI, enforce verification on publish, and add tests.