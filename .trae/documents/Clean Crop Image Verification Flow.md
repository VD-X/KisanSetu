## Goals
- Verify uploaded images match the selected crop and block mismatches.
- Avoid duplicate Gemini calls by caching verification results.
- Make verification React-safe (no re-render re-requests) and backend-controlled.

## Backend Changes
- Add a Prisma model `ImageVerification` in [schema.prisma](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/backend/prisma/schema.prisma) with fields:
  - `farmerId`, `expectedCropName`, `imageHash`, `status` (VERIFIED/REJECTED/PENDING/FAILED), `detectedCrop`, `confidence`, `userMessage`, timestamps.
  - Unique key on `(imageHash, expectedCropName)`.
- Update `/api/ai/verify-crop` in [aiController.js](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/backend/src/controllers/aiController.js) to:
  - Compute `imageHash` from the image bytes/base64.
  - Check DB first; return cached result without calling Gemini.
  - Call Gemini only when not cached; store the result.
  - On 429, store/return `PENDING` with retry-after.

## Frontend Changes
- Implement an image verification state machine in [FarmerDashboard.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/FarmerDashboard.tsx):
  - IDLE → UPLOADED → VERIFYING → VERIFIED/REJECTED/PENDING/FAILED.
- Change upload behavior:
  - Selecting files only stores `pendingImages` (not added to listing).
  - Add a manual “Verify Photos” button that calls backend once.
  - If VERIFIED → move pending images into `newListing.images`.
  - If REJECTED → show “Provide the crop related pictures only.” and don’t attach images.
  - If PENDING → show “AI is busy, retry in N seconds.”
- Keep all Gemini access server-side; frontend only calls backend via [api.ts](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/services/api.ts).

## Submission Gate
- Block “Publish” unless images are VERIFIED (no pending/unverified images).
- Optionally re-check verification status at publish time (DB cache makes this cheap).

## Verification
- Test carrot-selected + carrot image passes.
- Test carrot-selected + other crop image rejects.
- Confirm browser Network shows only `/api/ai/*` and no `generativelanguage.googleapis.com` calls.
- Ensure `npm run build` passes.

Confirm and I’ll implement these changes.