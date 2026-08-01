# Exact Mobile Hero Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the phone-only constructed hero with the approved `S__17244177.jpg` artwork, shown byte-for-byte and scaled as one proportional image on every phone.

**Architecture:** Copy the approved JPEG unchanged into `assets/`, add one semantic responsive image to the existing hero, and make the final Consultant B phone layer show only that image. Preserve the current desktop hero and all calculator behavior by keeping the new artwork hidden above the 620px breakpoint.

**Tech Stack:** Static HTML/CSS, Node.js built-in test runner, SHA-256 asset verification, Codex in-app browser, GitHub Pages.

## Global Constraints

- Source file: `C:\Users\w\Desktop\S__17244177.jpg`.
- Repository asset: `assets/mobile-hero-exact.jpg`.
- Required dimensions: `1787 × 880`.
- Required SHA-256: `8C01A4C8464E2B033D0B98C8655A6B493A53D46C0C11D6817ABA71C40B4AA827`.
- Never crop, recompress, regenerate, recolor, retouch, sharpen, or overlay the artwork.
- At `max-width: 620px`, the artwork is the only visible hero content and uses `width: 100%` with `height: auto`.
- Desktop hero, calculator tabs, forms, results, sources, links, contact bar, and calculation logic remain unchanged.
- Verify 320px, 360px, 375px, 390px, 430px, and 1280px before release.

---

### Task 1: Lock the approved binary and responsive contract

**Files:**
- Create: `assets/mobile-hero-exact.jpg`
- Modify: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: the approved Desktop JPEG and existing `mobileConsultantCss()` test helper.
- Produces: a byte-for-byte repository asset plus regression assertions for its hash, markup, phone-only visibility, and proportional sizing.

- [ ] **Step 1: Add Node's crypto module and a constant for the approved asset.**

```js
const crypto = require("node:crypto");
const exactMobileHeroPath = path.join(__dirname, "..", "assets", "mobile-hero-exact.jpg");
```

- [ ] **Step 2: Replace fixed phone-geometry assertions with the exact artwork contract.**

```js
test("phone hero uses the approved artwork byte for byte", () => {
  assert.ok(fs.existsSync(exactMobileHeroPath));
  const digest = crypto.createHash("sha256").update(fs.readFileSync(exactMobileHeroPath)).digest("hex").toUpperCase();
  assert.equal(digest, "8C01A4C8464E2B033D0B98C8655A6B493A53D46C0C11D6817ABA71C40B4AA827");
  assert.match(html, /class="brand-hero__mobile-art"[^>]*src="assets\/mobile-hero-exact\.jpg"[^>]*width="1787"[^>]*height="880"/);
});

test("phone hero shows only the complete proportional artwork", () => {
  const mobile = mobileConsultantCss();
  assert.match(mobile, /\.brand-hero\s*\{[^}]*width:\s*calc\(100% \+ 20px\)[^}]*height:\s*auto[^}]*margin-left:\s*-10px[^}]*padding:\s*0[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(mobile, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block[^}]*width:\s*100%[^}]*height:\s*auto/s);
  assert.match(mobile, /\.brand-hero__content,[\s\S]*\.brand-hero__portrait\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(mobile, /\.brand-hero\s*\{[^}]*height:\s*(?:206|216)px/s);
});
```

- [ ] **Step 3: Run `node --test tests/brand-consultant-wizard.test.cjs` and confirm the new tests fail because the asset, markup, and proportional CSS do not exist yet.**

- [ ] **Step 4: Copy the approved binary byte-for-byte.**

```powershell
Copy-Item -LiteralPath 'C:\Users\w\Desktop\S__17244177.jpg' -Destination 'assets\mobile-hero-exact.jpg'
```

- [ ] **Step 5: Recompute the repository file hash and require the approved value.**

```powershell
(Get-FileHash -LiteralPath 'assets\mobile-hero-exact.jpg' -Algorithm SHA256).Hash
```

Expected: `8C01A4C8464E2B033D0B98C8655A6B493A53D46C0C11D6817ABA71C40B4AA827`.

### Task 2: Show only the approved artwork on phones

**Files:**
- Modify: `index.html`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: `assets/mobile-hero-exact.jpg` and the existing `.brand-hero` element.
- Produces: `.brand-hero__mobile-art`, hidden on desktop and shown without crop or overlays on phones.

- [ ] **Step 1: Add the responsive artwork as the first child of the existing hero.**

```html
<img class="brand-hero__mobile-art"
     src="assets/mobile-hero-exact.jpg"
     alt="台南小魏 買厝作伙。房地稅費與貸款試算。正式申報仍以稅務機關、地政士、銀行核定為準。"
     width="1787"
     height="880"
     decoding="async"
     fetchpriority="high">
```

- [ ] **Step 2: Hide the new art by default in the final Consultant B layer.**

```css
.brand-hero__mobile-art {
  display: none;
}
```

- [ ] **Step 3: Replace the final phone hero construction with a full-viewport proportional image.**

```css
.brand-hero {
  display: block;
  width: calc(100% + 20px);
  height: auto;
  min-height: 0;
  max-height: none;
  margin-left: -10px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.brand-hero::before,
.brand-hero::after {
  display: none;
}

.brand-hero__mobile-art {
  display: block;
  width: 100%;
  height: auto;
  max-width: none;
}

.brand-hero__content,
.brand-hero__identity,
.brand-hero__portrait {
  display: none;
}
```

- [ ] **Step 4: Remove the obsolete 360px hero geometry so no phone changes an individual artwork element.**

- [ ] **Step 5: Run `node --test tests/brand-consultant-wizard.test.cjs` and confirm the focused suite passes.**

- [ ] **Step 6: Run `npm.cmd test` and confirm all tests pass.**

### Task 3: Verify every viewport and release the exact asset

**Files:**
- Verify: `assets/mobile-hero-exact.jpg`
- Verify: `index.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: the completed exact-artwork phone hero.
- Produces: measured local evidence, a committed and pushed release, and a verified GitHub Pages deployment.

- [ ] **Step 1: At 320px, 360px, 375px, 390px, and 430px, measure the image and require `renderedWidth / renderedHeight` to stay within `0.01` of `1787 / 880`, with no page overflow.**

- [ ] **Step 2: Capture the 430px phone view and visually confirm the entire supplied image is visible with no extra title, portrait, border, or crop.**

- [ ] **Step 3: At 1280px, confirm `.brand-hero__mobile-art` is hidden and the existing desktop hero remains visible.**

- [ ] **Step 4: Confirm zero browser console errors, run `git diff --check`, and run `npm.cmd test` again immediately before committing.**

- [ ] **Step 5: Commit only the approved asset, `index.html`, regression tests, plan, and spec; leave `.superpowers/` untouched.**

- [ ] **Step 6: Push `main`, wait until GitHub Pages reports the matching commit as built, then verify the live `/index.html` with a unique revision query at 430px.**
