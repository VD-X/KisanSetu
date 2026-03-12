## Key security correction (before anything)
- Do not use or store NVIDIA API keys in frontend env (`VITE_NVIDIA_API_KEY`) or in source code.
- Your repo currently exposes keys in [.env.example](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/.env.example). This is unsafe because it encourages shipping secrets to the browser and to git.
- Keep NVIDIA calls in the backend only, reading `NVIDIA_API_KEY` from backend environment (`.env.local` at the repo root is already loaded by backend).

## 1) Use NVIDIA code pattern safely (backend-only)
- Align backend request format to NVIDIA’s reference (messages with `[{type:"text"},{type:"image_url"...}]`).
- Keep non-stream mode for app usage (simpler + more reliable).
- Add a dedicated endpoint response shape for the UI:
  - `detectedCrop`, `detectedCropId`, `confidence`
  - `paragraphSummary` (single paragraph written for farmers)
  - `detailedDescription` (full detailed scene description)
  - `qualityGrade` (Premium / Very Good / Good / Average / Fair)
  - `qualityNotes` (short reasoning)
  - `primaryBoxes` (normalized focal box per image)

## 2) Manual crop selection + auto-crop default
- Auto-crop:
  - Prefer NVIDIA-provided `primaryBoxes` (focal region bbox).
  - Fallback to current local “smart crop” saliency logic.
- Manual crop:
  - Add a cropper UI after upload (overlay rectangle on the image).
  - Default rectangle = auto-crop result.
  - Allow user to drag/resize; enforce aspect ratio (1:1 for thumbnails).
  - Save the cropped image (canvas) as the final image used for verification + listing.

## 3) Manual crop-type selection (when AI guess is wrong)
- After NVIDIA verification returns `detectedCrop` + `confidence`, show:
  - “Detected crop: … (confidence …%)”
  - A dropdown to override crop selection manually.
  - If user overrides, keep it but display a warning if it conflicts with detection.

## 4) Quality grading + paragraph summary
- Update NVIDIA prompt so it returns:
  - A single farmer-friendly paragraph summary describing what the image looks like.
  - A quality grade using: Premium / Very Good / Good / Average / Fair.
  - Include quality cues (sharpness, exposure, noise, lighting) in the paragraph.
- Keep local quality metrics as a fallback (already implemented) and map to the new 5-grade scale.

## 5) Tests
- Backend unit tests:
  - Key validation
  - Retry logic
  - Response parsing for new fields (`paragraphSummary`, `qualityGrade`, `primaryBoxes`)
- Frontend unit tests:
  - Crop-rect math (aspect locking)
  - Cropped canvas output size
  - Grade mapping logic

## Repo hygiene fixes
- Remove secrets from `.env.example` (replace with placeholders) and ensure no `VITE_*_API_KEY` secrets are used.

## Deliverable outcome
- On upload: image auto-crops to focal area, user can adjust crop.
- Crop is auto-detected; user can override.
- A one-paragraph summary appears describing the crop photo + image quality.
- A 5-level grade (Premium/Very Good/Good/Average/Fair) is shown and saved.
