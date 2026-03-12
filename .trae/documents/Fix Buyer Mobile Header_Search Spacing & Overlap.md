## Root Cause
- The remaining gap and the search icon/text overlap are being caused by the **global mobile overrides** in [index.css](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/index.css) that apply `padding`/`min-height` with `!important` to **all** `button` and `input` on mobile. This fights the custom search-bar sizing and makes the content feel misaligned.

## What I’ll Change
### 1) Apply “top padding = 1” only for Buyer mobile Home
- Add a **scoped utility** so your idea works safely:
  - Use a wrapper class like `.buyer-home` and inside mobile media query apply:
    - `.buyer-home .pt-6 { padding-top: calc(var(--spacing) * 1); }`
- This ensures **only Buyer mobile home** gets the reduced top padding and doesn’t break other screens/components.

### 2) Remove the remaining header → search gap (mobile)
- Ensure the Buyer Home content container has only a small top padding (spacing * 1), and no extra margins.
- In [Layout.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/Layout.tsx), apply the `.buyer-home` wrapper conditionally when `userRole === BUYER && activeTab === 'home'`.

### 3) Fix overlap inside the searchbar (mobile)
- Add a class on the Buyer search bar wrapper, e.g. `.buyer-searchbar`.
- In [index.css](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/index.css), inside mobile media query, add overrides:
  - `.buyer-searchbar input { padding: 0 !important; min-height: 0 !important; }`
  - `.buyer-searchbar button { padding: 0 !important; min-height: 0 !important; min-width: 0 !important; }`
- This prevents the global mobile rules from forcing extra padding/min-height that causes the text/icon overlap.

## Files to Update
- [index.css](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/index.css)
- [Layout.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/Layout.tsx)
- [BuyerDashboard.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/BuyerDashboard.tsx)

## Verification
- Re-check Buyer role on mobile:
  - Search bar touches the header (only spacing * 1 if requested).
  - Search icon and placeholder/text are aligned with no overlap.
  - Other pages (Farmer/Transporter, Buyer other tabs) are unaffected.