## What you want
- Make the “Fruits for the week” slide image visible.
- Show the same **3 promo images on mobile**.
- Auto-rotate every **5 seconds** and loop.
- Make mobile layout look clean and non-cluttered.

## Root cause (image not visible)
- The desktop promo uses external Unsplash URLs. If one URL fails to load (rate-limit / bad image id / blocked), the image area looks blank.

## Plan
### 1) Fix the “Fruits for the week” image
- Replace the current slide-2 `imageUrl` with a more reliable Unsplash image.
- Add an `onError` fallback on the promo `<img>` so if any slide image fails, it automatically falls back to a safe default image.

### 2) Convert mobile promo into a 3-slide carousel
- Replace the current `md:hidden` static banner with a **mobile carousel** that reads from the same `slides` array.
- Use the existing `activeIndex` + interval (5000ms) so mobile auto-rotates and repeats.
- Use a **cross-fade** transition on mobile (same approach as desktop) so it feels smooth.

### 3) Mobile-only UI polish
- Keep the mobile banner’s overall style (rounded card, blobs, CTA) but:
  - Ensure text scales correctly on small widths
  - Ensure the circular image doesn’t overflow or cover the CTA
  - Add small dot indicators (optional) for clarity

### 4) Verify
- Check the three images rotate on mobile every 5 seconds.
- Confirm the “Fruits for the week” image loads.
- Ensure TypeScript diagnostics are clean.

## File to change
- [PromoBanner.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/PromoBanner.tsx)