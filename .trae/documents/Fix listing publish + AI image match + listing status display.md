## What’s going wrong now
- The “Something went wrong!” message is coming from the backend global error handler, not the listing controller.
- Farmer listing publish sends base64 image strings inside JSON (from FileReader.readAsDataURL). That payload often exceeds Express’s default JSON size limit, so the request fails *before* it reaches `createListing`.

## 1) Fix farmer publish error (harvest not publishing)
- Update backend JSON body parser to accept larger payloads (base64 images) and return a clear 413 error when too large.
- Files to update:
  - backend/src/app.js
    - Change `express.json()` to `express.json({ limit: '10mb' })` (and `urlencoded` similarly if used)
    - Improve error middleware to detect payload-too-large errors (`err.type === 'entity.too.large'` / `err.status === 413`) and return `{ error: 'Images are too large…' }` instead of generic.

## 2) AI should validate images match the selected crop
- Add a Gemini vision check that compares uploaded images vs selected crop name.
- Implementation approach:
  - Add a new method in services/geminiService.ts (e.g. `validateCropImages(images, expectedCropName)`), which prompts Gemini to return strict JSON like:
    - `{ "matches": true|false, "detected": "Tomato", "confidence": 0-1 }`
  - In FarmerDashboard.tsx, during `processFiles()` (image upload) run the validation on the newly added photos:
    - If mismatch → do not add those images to the listing, show a user-friendly alert/toast: “Image doesn’t match selected crop.”
    - If match → accept the images and proceed with the existing quality grading call.
  - Add a lightweight fallback behavior when Gemini is unavailable (no key/quota):
    - Either allow upload but show “AI verification unavailable” OR block with a clear message (we’ll choose the stricter option you prefer).

## 3) Listings should only show listing availability statuses (not order/delivery statuses)
- Right now `StatusBadge` can display order/delivery-like labels (and listing has extra internal statuses like LOCKED/PRICE_AGREED).
- Change UI mapping so listings show only:
  - AVAILABLE → “Available”
  - SOLD → “Sold Out”
  - Anything else → show “Available” (or “Reserved” if you want, but you asked only available/sold)
- Files to update:
  - components/StatusBadge.tsx (respect `type='listing'` and normalize status)
  - components/FarmerDashboard.tsx already passes `type="listing"`, so this will apply automatically.

## Verification
- Publish a listing with 1–3 images (should succeed, no generic error).
- Upload a clearly mismatched image (e.g. tomato selected, wheat photo) → should be rejected with the mismatch message.
- Confirm listings page badges show only “Available”/“Sold Out”, even if backend sets intermediate states.

If you confirm, I’ll implement these changes and validate them end-to-end in the running dev environment.