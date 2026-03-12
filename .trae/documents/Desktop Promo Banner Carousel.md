## What you want
- Make the “sticker” (promo banner) look more attractive/modern on **desktop only**.
- Add **3 different images**.
- Auto-swipe/auto-rotate every **5 seconds**, looping forever.
- **Do not change mobile UI**.

## Where it lives
- The banner is [PromoBanner.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/PromoBanner.tsx) and is used in Buyer Home.

## Implementation plan
### 1) Keep the current mobile banner unchanged
- Wrap the existing JSX in a `md:hidden` container so the current mobile design stays exactly the same.

### 2) Create a new desktop-only carousel version
- Add a `hidden md:block` desktop banner layout with a modern look:
  - Gradient background + subtle noise/blur blobs
  - Better typography hierarchy
  - Image area with glassmorphism card / rounded corners
  - Small dot indicators (optional) matching the slide index

### 3) Add 3 slides and auto-rotate every 5 seconds
- Define a `slides` array (3 items) with:
  - `title`, `subtitle`, `cta`, `imageUrl`, and an accent color
- Use `useState(activeIndex)` + `useEffect(setInterval(..., 5000))` with cleanup.
- Implement the transition as a cross-fade (`opacity` + `transition-opacity`) so it feels smooth.
- Ensure it loops (`(i + 1) % slides.length`).

### 4) Desktop-only styling safeguards
- Keep all new styles scoped to the desktop markup (`md:` classes), so mobile is unaffected.
- No external libraries (no Swiper dependency); pure React + Tailwind.

### 5) Verify
- Confirm mobile banner visually matches current design.
- Confirm desktop cycles through all 3 images every 5 seconds and repeats.
- Check TypeScript diagnostics.

## Files to change
- [PromoBanner.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/PromoBanner.tsx)