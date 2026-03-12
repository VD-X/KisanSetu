## Goal
- Remove the green floating search button (FAB) on **mobile** when the **Buyer** is on the **Profile** screen.

## Findings
- The green FAB is rendered globally in [Layout.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/Layout.tsx#L280-L296).
- For Buyer, it shows the `fa-search` icon and is currently hidden only for Transporter.

## Changes
### 1) Hide FAB only for Buyer → Profile
- Update the FAB render condition in [Layout.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/Layout.tsx#L280-L296) to:
  - Keep it for Farmers as-is.
  - Keep it for Buyers on other tabs.
  - **Do not render it when** `userRole === BUYER && activeTab === 'profile'`.

## Verification
- Open mobile Buyer screens:
  - Buyer Profile: FAB is gone.
  - Buyer Home: FAB still appears (search).
  - Farmer screens: FAB still appears (plus).
  - Transporter screens: FAB remains hidden.

## Files
- [Layout.tsx](file:///c:/Users/manik/Dropbox/projects_copy/KisanSetu/components/Layout.tsx)