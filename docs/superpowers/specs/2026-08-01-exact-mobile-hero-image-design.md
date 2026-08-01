# Exact Mobile Hero Image Design

## Goal

Make every phone display the exact composition supplied in `C:\Users\w\Desktop\S__17244177.jpg`. The phone hero must be the source image itself, scaled proportionally as one unit, with no separately rendered text, portrait, background, borders, or decorative overlays.

## Locked source asset

- Source path: `C:\Users\w\Desktop\S__17244177.jpg`
- Verified dimensions: `1787 × 880`
- Aspect ratio: `1787 / 880` (`2.030682`)
- SHA-256: `8C01A4C8464E2B033D0B98C8655A6B493A53D46C0C11D6817ABA71C40B4AA827`
- Repository destination: `assets/mobile-hero-exact.jpg`
- The source must be copied byte-for-byte. It must not be regenerated, recompressed, recolored, retouched, cropped, or sharpened.

## Phone presentation

- At `max-width: 620px`, the supplied image is the only visible hero artwork.
- Display the complete image with `width: 100%` and `height: auto` so all phones preserve the exact `1787:880` composition.
- Do not use `object-fit: cover`, clipping, transforms, separate breakpoint geometry, or device-specific crops.
- Remove the phone hero's existing CSS padding, grid, background, border, fixed height, live title, badge, legal note, and separate portrait from visual presentation.
- Let the image include its own cream surround, navy card, grid, rounded frame, typography, divider, legal copy, and portrait exactly as authored.
- The hero may span the phone viewport width so no second outer frame or duplicated cream gutter changes the supplied composition.
- Use the image's visible wording as accessible alternative text. Do not display duplicate accessible text next to it.

## Other surfaces

- Desktop hero remains unchanged.
- Calculator tabs, wizard steps, results, sources, contact bar, links, and calculation logic remain unchanged.
- No new animation or decorative content is added.

## Consistency guarantee

- Phones may have different physical sizes, but the hero's composition and relative sizing stay identical because every visible element is baked into one proportional image.
- The whole hero becomes slightly larger or smaller with viewport width; no individual element changes independently.
- The source resolution is sufficient for current phone widths, including a 430px CSS viewport at high pixel density.

## Test and release contract

- Add a regression test requiring `assets/mobile-hero-exact.jpg`, its exact dimensions, and its exact SHA-256 value.
- Add markup and CSS regression tests proving the image is shown only on phones, scales with `width: 100%` and `height: auto`, and the old live hero pieces are hidden on phones.
- Verify local rendering at 320px, 360px, 375px, 390px, and 430px widths. At every width, require the rendered hero ratio to remain `1787 / 880`, with no crop and no horizontal overflow.
- Verify 1280px desktop remains unchanged.
- Run the full test suite, deploy the exact commit to GitHub Pages, and verify the live `/index.html` with a cache-busting URL before reporting completion.
