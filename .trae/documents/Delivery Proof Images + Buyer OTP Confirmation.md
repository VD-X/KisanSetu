## Updated scope (based on your note)
- Proof image visibility is required **only for the farmer** (not for the buyer UI).
- The existing signature step must be **removed** and replaced by **buyer OTP verification**.

## Current repo reality
- Transporter currently opens [ProofOfDeliveryModal.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/ProofOfDeliveryModal.tsx) (photo + signature), but the photo is not persisted; the flow just calls `updateStatus('DELIVERED')`.
- Backend already supports delivery OTP verification via `POST /api/delivery-deals/:id/verify-otp` when status is `IN_TRANSIT` (or `PICKED_UP`).
- Delivery model already has `proofPhotos: String[]` (unused today).

## Plan

### 1) Persist proof photo on delivery (backend)
- Add a new endpoint:
  - `POST /api/delivery-deals/:id/proof-photo` (transporter only)
- This endpoint will:
  - Accept the image (initially as a compressed base64/data URL to avoid adding multipart dependencies).
  - Validate type/size.
  - Store it in `Delivery.proofPhotos` (e.g., as a safe string reference).

### 2) Restrict who can see proof photos (farmer only)
- Update order fetch shaping in backend so:
  - Buyer role **does not receive** `delivery.proofPhotos`.
  - Farmer role **does receive** `delivery.proofPhotos`.
- This affects:
  - `GET /api/orders` and `GET /api/orders/:id` in [orderController.js](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/backend/src/controllers/orderController.js)

### 3) Replace signature with OTP verification (frontend)
- Update [ProofOfDeliveryModal.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/ProofOfDeliveryModal.tsx):
  - Remove the signature canvas step completely.
  - Keep a clean proof photo upload UI (tap to upload + preview).
  - After selecting/uploading the photo, show a 6-digit OTP entry (reuse [OTPModal.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/OTPModal.tsx) or embed the same input UI).

### 4) Transporter completion flow: Upload proof → Verify buyer OTP
- Update [TransporterDealsView.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/TransporterDealsView.tsx):
  - On “Complete Delivery”, open the updated PoD modal.
  - On submit:
    1) Upload/store the proof photo via `POST /delivery-deals/:id/proof-photo`.
    2) Verify delivery OTP via existing `POST /delivery-deals/:id/verify-otp`.
    3) On success the backend sets `Delivery.status = COMPLETED`.
  - Remove the old `updateStatus('DELIVERED')` path from this flow.

### 5) Show proof photo to farmer in order details
- Update [FarmerOrdersView.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/FarmerOrdersView.tsx) to display a “Delivery Proof” section when `order.delivery.proofPhotos.length > 0`.
  - Show thumbnail + click to view larger.
  - Add a small “Proof Uploaded” badge for trust.

### 6) Verification
- Verify transporter can:
  - Upload proof photo
  - Enter buyer OTP
  - Complete delivery (status becomes `COMPLETED`)
- Verify farmer can see proof images in the order.
- Verify buyer cannot see proof images.

## Files to change
- Backend:
  - [deliveryDealRoutes.js](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/backend/src/routes/deliveryDealRoutes.js)
  - [deliveryDealController.js](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/backend/src/controllers/deliveryDealController.js)
  - [orderController.js](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/backend/src/controllers/orderController.js)
- Frontend:
  - [ProofOfDeliveryModal.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/ProofOfDeliveryModal.tsx)
  - [TransporterDealsView.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/TransporterDealsView.tsx)
  - [FarmerOrdersView.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/FarmerOrdersView.tsx)
  - [services/api.ts](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/services/api.ts)

If you approve this plan, I’ll implement it end-to-end.