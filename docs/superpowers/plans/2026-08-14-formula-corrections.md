# Formula Corrections Implementation Plan

> **For Codex:** Execute each task with test-driven development and verify every public calculator before release.

**Goal:** Correct every confirmed calculator formula issue while permanently preserving the buyer brokerage fee at 2%.

**Architecture:** Keep the static single-file application. Add small pure calculation helpers inside `index.html`, call them from the existing DOM renderers, and execute those real helpers in Node regression tests through `vm`. Reuse the existing Young 3.0 policy module for policy rates and limits.

**Tech Stack:** Static HTML/CSS/JavaScript, Node `node:test`, PHP analytics smoke tests, local browser verification, GitHub Pages and VPS/Nginx release checks.

---

### Task 1: Add failing formula regression tests

**Files:**
- Create: `tests/calculator-formula-corrections.test.cjs`
- Modify: `tests/unified-calculator-polish.test.cjs`

Cover exact anniversary tax boundaries, old-regime stop, prior-loss deduction, economic after-tax result, public-deed stamp tax, fixed 2% brokerage behavior, fixed-principal extra repayment, affordability modes, early-payoff labels, Young split-loan combined costs and final zero balance.

Run the new test file and confirm failures identify the current production behavior.

### Task 2: Correct tax and buyer models

**File:** `index.html`

Add date parsing/anniversary helpers and pure tax/buyer cost models. Add acquisition date, sale date, prior-loss and public-deed inputs, defaults, explanatory copy, result breakdowns and non-2.0 warning state. Keep the broker rate fixed at 2%.

Run the targeted formula tests until the tax and buyer cases pass.

### Task 3: Correct general-loan schedule and affordability

**File:** `index.html`

Add a pure amortization schedule helper and a repayment-mode-aware inverse capacity helper. Render the actual payoff period, mode-specific first-payment wording and stable rounded values. Pass grace period, repayment mode and extra payment into the affordability runway.

Run targeted formula and existing affordability tests.

### Task 4: Correct Young 3.0 split-loan totals and affordability

**File:** `index.html`

Add a pure Young staged-rate schedule helper, force the final payment to clear balance, combine supplemental-loan interest/payment in totals, and use a piecewise capacity inverse for income affordability.

Run targeted formula and existing Young policy/markup tests.

### Task 5: Complete verification

Run `npm.cmd test` and `git diff --check`. Preview locally and exercise tax, buyer, loan, Young 3.0 and standalone break-even at desktop and 375px widths. Confirm no console errors and hand-check the agreed fixtures.

### Task 6: Publish and verify live

Commit the branch, integrate into `main`, push the exact commit, wait for GitHub Pages, follow `DEPLOY.md` for the immutable VPS release, and verify both live surfaces with cache-busted URLs and release provenance.
