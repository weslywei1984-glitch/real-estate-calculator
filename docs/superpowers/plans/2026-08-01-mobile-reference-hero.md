# Mobile Reference Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the phone-only top hero to match the supplied navy editorial banner reference.

**Architecture:** Keep the existing semantic hero markup and transparent portrait asset. Make the final Consultant B `max-width: 620px` CSS layer authoritative for phone dimensions, typography, divider, and portrait cropping so desktop styles and calculator behavior remain untouched.

**Tech Stack:** Static HTML/CSS, Node.js built-in test runner, local browser verification, GitHub Pages.

## Global Constraints

- The reference image `C:\Users\w\Desktop\S__17244177.jpg` is the composition source of truth.
- Mobile changes are confined to the final Consultant B `@media (max-width: 620px)` block.
- Preserve all existing copy, portrait asset, links, desktop layout, and calculator logic.
- Verify at 360px, 375px, 390px, and desktop width before release.

---

### Task 1: Lock the reference composition with regression tests

**Files:**
- Modify: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: `mobileConsultantCss()` and the final Consultant B CSS source.
- Produces: assertions for `216px` hero height, `170px × 212px` portrait, `206px` narrow height, and the legal-note divider.

- [ ] **Step 1: Update the existing mobile hero test to expect `height`, `min-height`, and `max-height` of `216px`.**

- [ ] **Step 2: Add assertions for a `border-top` divider on `.brand-hero__notice` and portrait dimensions `170px × 212px`.**

- [ ] **Step 3: Add narrow-phone assertions for a `206px` hero and `156px × 202px` portrait.**

- [ ] **Step 4: Run `node --test tests/brand-consultant-wizard.test.cjs` and confirm it fails against the current `190px` implementation.**

### Task 2: Implement the approved phone hero

**Files:**
- Modify: `index.html:5217`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: existing `.brand-hero`, `.brand-hero__content`, title, notice, portrait, and profile elements.
- Produces: the approved phone-only responsive composition without DOM or JavaScript changes.

- [ ] **Step 1: Set the default phone hero to `216px`, reserve `170px` for the portrait, and adjust padding.**

- [ ] **Step 2: Increase badge and title hierarchy while keeping both title spans on one line each.**

- [ ] **Step 3: Add the terracotta divider as the legal note's top border and keep the note within the left text column.**

- [ ] **Step 4: Increase the portrait to `170px × 212px`, bottom-right aligned with `object-fit: contain`.**

- [ ] **Step 5: Add the 360px overrides for `206px` hero height, smaller type, and `156px × 202px` portrait.**

- [ ] **Step 6: Run `node --test tests/brand-consultant-wizard.test.cjs` and confirm the focused suite passes.**

### Task 3: Verify and release the visible result

**Files:**
- Verify: `index.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: the completed phone hero CSS.
- Produces: local screenshots, passing tests, a pushed commit, and a confirmed GitHub Pages deployment.

- [ ] **Step 1: Run `npm test` and require a zero exit code.**

- [ ] **Step 2: Serve the app locally and inspect 360px, 375px, and 390px widths for title, divider, legal-note, and portrait overlap.**

- [ ] **Step 3: Inspect a desktop viewport and confirm the desktop hero is unchanged.**

- [ ] **Step 4: Commit only the plan, spec, test, and implementation files; preserve unrelated `.superpowers/` content.**

- [ ] **Step 5: Push `main`, wait for the matching GitHub Pages build to report success, and load a fresh `/index.html` URL to verify the deployed CSS.**
