## Goal
- Make the Buyer mobile cart button size consistent and “fixed” (no unexpected padding/height changes), aligned with the search bar.

## Root cause
- On mobile, [index.css](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/index.css) applies global `button { padding: ...; min-height: ... }` with `!important`, which can override the cart button’s intended `w-*/h-*` sizing.

## Changes
### 1) Make the cart button a true square matching the search bar height
- In [BuyerDashboard.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/BuyerDashboard.tsx#L475-L522), change the cart button from `w-12 h-11` to `w-11 h-11` (same height as the search bar `h-11`) for perfect alignment.
- Add a scoped class name like `buyer-cart-btn` to target mobile overrides safely.

### 2) Prevent global mobile button rules from distorting it
- In [index.css](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/index.css) inside the mobile media query, add:
  - `.buyer-cart-btn { padding: 0 !important; min-height: 0 !important; min-width: 0 !important; }`
- This keeps the cart button fixed-size while leaving other buttons alone.

## Verification
- Check Buyer on mobile:
  - Cart button is perfectly square and aligned with the search bar.
  - Badge still positions correctly.
  - No TypeScript/CSS diagnostics.

## Files
- [BuyerDashboard.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/BuyerDashboard.tsx)
- [index.css](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/index.css)