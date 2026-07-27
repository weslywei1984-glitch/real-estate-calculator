# Compact Tool Layout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-layout the four calculators as a compact, cohesive tool interface aligned with `tainanwei.com` while preserving all existing formulas, fields, states, LIFF behavior, and user flows.

**Architecture:** Keep the single-file application and existing semantic header markup. Add one final CSS layer named `Compact tool layout redesign` before `</style>` so it deterministically overrides the previous theme without touching calculator JavaScript; extend the existing markup contract test to protect the approved desktop and mobile proportions.

**Tech Stack:** Single-file HTML/CSS/vanilla JavaScript, Node.js built-in test runner, Codex in-app browser, GitHub Pages.

## Global Constraints

- Do not modify tax rates, exemptions, loan formulas, policy numbers, the fixed 2% buyer brokerage fee, the young-loan split, or the 80-rule logic.
- Do not remove government sources, disclaimers, localStorage, URL hash state, result states, or LIFF gate behavior.
- Do not add features, modules, external frameworks, CDNs, or split `index.html`.
- Keep all public-facing copy in Traditional Chinese.
- Desktop header height must not exceed 188px.
- Mobile 375px must have no horizontal overflow and the main title must remain on one line.
- Buttons must remain at least 44px high on mobile.

---

### Task 1: Lock the Approved Layout Contract

**Files:**
- Modify: `tests/brand-ui-refresh.test.cjs`
- Test: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: the final CSS block inside `index.html`
- Produces: a regression contract for the compact header, workspace ratio, unified young-loan surface, mobile dimensions, and unchanged tab behavior

- [ ] **Step 1: Write the failing compact-layout tests**

Add tests that extract the CSS after `/* Compact tool layout redesign */` and assert:

```js
assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*184px;[^}]*max-height:\s*184px/s);
assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.38fr\)\s*minmax\(360px,\s*1fr\);[^}]*gap:\s*16px/s);
assert.match(css, /\.young-hero\s*\{[^}]*background:\s*var\(--brand-paper\);[^}]*color:\s*var\(--brand-ink\)/s);
assert.match(css, /\.tabs\s*\{[^}]*min-height:\s*48px/s);
```

Add a mobile contract asserting:

```js
assert.match(css, /@media \(max-width:\s*620px\)/);
assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*150px;[^}]*max-height:\s*150px/s);
assert.match(css, /\.brand-hero h1\s*\{[^}]*white-space:\s*nowrap/s);
assert.match(css, /\.actions button\s*\{[^}]*min-height:\s*44px/s);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test tests/brand-ui-refresh.test.cjs
```

Expected: FAIL because the `Compact tool layout redesign` marker and approved compact dimensions do not exist.

- [ ] **Step 3: Commit the failing test**

```powershell
git add tests/brand-ui-refresh.test.cjs
git commit -m "test: define compact calculator layout contract"
```

### Task 2: Implement the Compact Desktop Layout

**Files:**
- Modify: `index.html`
- Test: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: existing `.brand-hero`, `.tabs`, `.workspace`, `.panel`, `.young-hero`, `.chip`, `.metric`, and result-state classes
- Produces: final CSS overrides under `/* Compact tool layout redesign */`

- [ ] **Step 1: Add the final layout token block**

Insert before `</style>`:

```css
/* Compact tool layout redesign */
:root {
  --tool-radius: 10px;
  --tool-gap: 16px;
  --tool-shadow: 0 10px 28px rgba(16, 39, 56, .07);
}
```

- [ ] **Step 2: Re-layout the desktop header**

Use an explicit 184px grid:

```css
.brand-hero {
  min-height: 184px;
  max-height: 184px;
  grid-template-columns: minmax(0, 1fr) 240px;
  padding: 22px 28px;
}
```

Reduce heading scale, collapse identity information into one compact row, keep the baseline as a small top-right badge, and align the portrait bottom with the header.

- [ ] **Step 3: Rebuild tabs and workspace proportions**

Use:

```css
.tabs {
  min-height: 48px;
  padding: 4px;
  background: var(--brand-paper);
}

.workspace {
  grid-template-columns: minmax(0, 1.38fr) minmax(360px, 1fr);
  gap: 16px;
}
```

Keep terracotta only for the selected tab and primary actions.

- [ ] **Step 4: Unify all panels and inputs**

Make `.panel`, `.section`, `.panel-head`, `.control`, `.metric`, `.eligibility-result`, and `.table-wrap` use the same warm-white surface, border, restrained shadow, radius, and density. Keep input height at 46px and section spacing at 18px.

- [ ] **Step 5: Convert the young-loan hero to the shared light system**

Override:

```css
.young-hero {
  background: var(--brand-paper);
  color: var(--brand-ink);
}
```

Remove decorative dark pseudo-elements, style policy information as a pale navy information strip, and keep terracotta limited to the kicker and step badges.

- [ ] **Step 6: Run focused and full tests**

Run:

```powershell
node --test tests/brand-ui-refresh.test.cjs
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 7: Commit the desktop implementation**

```powershell
git add index.html
git commit -m "style: rebuild calculator as compact tool layout"
```

### Task 3: Implement the Compact Mobile Layout

**Files:**
- Modify: `index.html`
- Test: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: compact desktop CSS from Task 2
- Produces: 900px single-column behavior and 620px compact header, tabs, cards, chips, and actions

- [ ] **Step 1: Add the 900px single-column breakpoint**

At `max-width: 900px`, use one workspace column, place the result after the form, retain horizontally scrollable tabs, and reduce outer page spacing.

- [ ] **Step 2: Add the 620px compact breakpoint**

Set the header to 150px, keep the title on one line, reduce portrait emphasis, use 12px to 14px panel padding, and preserve 44px touch targets:

```css
@media (max-width: 620px) {
  .brand-hero {
    min-height: 150px;
    max-height: 150px;
  }

  .brand-hero h1 {
    white-space: nowrap;
  }

  .actions button {
    min-height: 44px;
  }
}
```

- [ ] **Step 3: Run focused and full tests**

Run:

```powershell
node --test tests/brand-ui-refresh.test.cjs
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 4: Commit the responsive implementation**

```powershell
git add index.html
git commit -m "style: tighten calculator mobile layout"
```

### Task 4: Browser Verification and Deployment

**Files:**
- Verify: `index.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: the complete compact layout
- Produces: verified local and deployed UI with a cache-busted URL

- [ ] **Step 1: Verify all four calculators locally**

Open each hash (`#tax`, `#buyer`, `#loan`, `#young`) in the Codex in-app browser. For tax, buyer, and loan, click `套用範例` and confirm `data-state="success"`. For young, verify the three-step flow, clear state, and successful calculation after valid values are entered.

- [ ] **Step 2: Verify desktop layout**

At 1280px confirm:

- header height is at most 188px;
- portrait head is not cropped and bottom aligns with the header;
- active tab is visible;
- workspace columns align at the top;
- all form and result panels share the warm-white card language;
- no page-level horizontal overflow.

- [ ] **Step 3: Verify 375px mobile layout**

Confirm:

- header is 150px;
- title is one line and fits;
- no horizontal overflow;
- active young-loan tab is visible;
- workspace is one column;
- buttons are at least 44px high.

- [ ] **Step 4: Verify browser console**

Read error-level console logs after desktop and mobile flows. Expected: zero errors.

- [ ] **Step 5: Run final automated verification**

Run:

```powershell
npm.cmd test
git diff --check
git status --short
```

Expected: all tests pass; no whitespace errors; only the pre-existing untracked `tools/` directory remains.

- [ ] **Step 6: Integrate and deploy**

Merge the feature branch into `main`, push `main`, wait for the GitHub Pages workflow to complete successfully, and verify the deployed HTML contains `/* Compact tool layout redesign */`.

- [ ] **Step 7: Verify the deployed site**

Generate the cache-busted URL and open the resulting value:

```powershell
$shortSha = git rev-parse --short HEAD
$liveUrl = "https://weslywei1984-glitch.github.io/real-estate-calculator/?v=$shortSha#tax"
```

Repeat desktop, mobile, console, and active-tab checks. Keep the deployed tab open as the deliverable.
