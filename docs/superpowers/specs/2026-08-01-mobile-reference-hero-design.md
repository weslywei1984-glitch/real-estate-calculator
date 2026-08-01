# Mobile Reference Hero Design

## Goal

Make the phone-only top hero visibly match the user-provided reference: a wide navy editorial banner with a large left-aligned two-line title, an orange brand pill and divider, a subdued legal note, and a near-full-height portrait on the right.

## Approved reference

The user supplied `C:\Users\w\Desktop\S__17244177.jpg` and explicitly requested `改成這樣`. That image is the visual source of truth for composition, hierarchy, colors, and portrait scale.

## Scope

- Apply only at `max-width: 620px` in the final Consultant B CSS layer.
- Preserve the existing desktop hero, calculator markup, calculator behavior, CTA links, and copy.
- Reuse the existing transparent `assets/xiaowei-profile.png` portrait and live HTML text so the banner remains crisp and accessible.

## Phone composition

- Hero height: `216px` at 361-620px; `206px` at 360px and below.
- Card: navy background, subtle grid, rounded corners, and existing cream page surround.
- Content: left aligned and vertically centered, with a 158-172px readable text column that remains clear of the portrait.
- Badge: orange pill at top left with the existing brand wording.
- Title: exactly two lines, white `房地稅費與` followed by terracotta `貸款試算`; bold, tightly tracked, and larger than the current phone version.
- Divider: a thin terracotta rule between the title and the legal note.
- Legal note: subdued warm gray, allowed to wrap naturally.
- Portrait: anchored to the bottom-right at near full card height; `170px × 212px` normally and `156px × 202px` at 360px and below.

## Verification

- Add source-level regression assertions for the new hero height, portrait sizing, divider, two-line title, and phone-only scoping.
- Render locally at 360px, 375px, and 390px widths and confirm no overlap or clipping.
- Check a desktop viewport to ensure the phone-only layer does not alter desktop presentation.
- Run the full Node test suite, push the commit, wait for GitHub Pages to succeed, then verify the live page rather than relying on a cached root response.
