# Functional Duotone Results and Land Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved B functional two-color treatment to the tax and loan result heroes, then redesign the land-value helper below its unchanged header into a clear three-step query flow plus a compact result dashboard.

**Architecture:** Keep the application static and dependency-free. Add narrowly scoped CSS selectors to the existing final Consultant B theme layer, add semantic layout classes around the land helper's existing ID-bound controls, and leave all formulas, storage keys, lookup APIs, copy behavior, download behavior, and displayed wording intact. Protect the work with source-contract tests plus real-browser desktop/mobile verification.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 20 built-in `node:test`, local HTTP server, Codex in-app browser.

## Global Constraints

- Preserve the exact `<header class="brand-hero">` image markup and the complete `.tool-intro` block in `tainan-land-value-helper.html`.
- Preserve all existing form/output IDs and JavaScript behaviors, including `tainanLandValueHelperForm`, lookup data loading, area conversion, summary copy, and JPG download.
- Do not change formulas, calculated values, labels, explanatory wording, or links.
- Scope result colors only to `.tax-result-hero` and `.loan-payment-hero`; buyer and young-loan `.metric.main` cards must stay navy.
- Keep desktop at a 56/44 two-column workbench and mobile at one column. Desktop result dashboard may be sticky; mobile must be normal document flow.
- Preserve the unrelated untracked `.superpowers/` directory and never stage it.
- Follow red-green-refactor: add one focused failing contract, observe RED, make the smallest production change, observe GREEN, then commit.

---

### Task 1: Lock and implement the two result-hero color contracts

**Files:**
- Create: `tests/functional-duotone-refresh.test.cjs`
- Modify: `index.html:4892-5925`

- [ ] **Step 1: Create the focused source-contract test file.**

Add this exact foundation and the first two tests:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const helperHtml = fs.readFileSync(path.join(root, "tainan-land-value-helper.html"), "utf8");

test("tax result hero uses the approved terracotta and sand palette", () => {
  assert.match(indexHtml, /--feature-tax:\s*#8e402b/i);
  assert.match(indexHtml, /--feature-highlight:\s*#ffe0a8/i);
  assert.match(indexHtml, /\.metric\.main\.tax-result-hero\s*\{[^}]*border-color:\s*var\(--feature-tax\)[^}]*background:\s*var\(--feature-tax\)/is);
  assert.match(indexHtml, /\.tax-result-hero[\s\S]*?strong\s*\{[^}]*color:\s*var\(--feature-highlight\)/i);
});

test("loan result hero uses the approved lake blue and sand palette", () => {
  assert.match(indexHtml, /--feature-loan:\s*#164d5c/i);
  assert.match(indexHtml, /\.metric\.main\.loan-payment-hero\s*\{[^}]*border-color:\s*var\(--feature-loan\)[^}]*background:\s*var\(--feature-loan\)/is);
  assert.match(indexHtml, /\.loan-payment-stage\s+strong\s*\{[^}]*color:\s*var\(--feature-highlight\)/i);
});
```

- [ ] **Step 2: Run the focused test and confirm RED.**

Run:

```powershell
node --test tests/functional-duotone-refresh.test.cjs
```

Expected: both tests fail because the approved exact colors are absent.

- [ ] **Step 3: Add feature-scoped palette tokens and overrides in the final Consultant B theme layer.**

Inside the final `:root` block near `/* Consultant B wizard theme */`, add:

```css
--feature-tax: #8e402b;
--feature-loan: #164d5c;
--feature-highlight: #ffe0a8;
--feature-cream: #fffaf0;
```

After the structural `.tax-result-hero` and `.loan-payment-hero` rules, add narrowly scoped overrides:

```css
.metric.main.tax-result-hero {
  border-color: var(--feature-tax);
  background: var(--feature-tax);
  color: var(--feature-cream);
}

.tax-result-hero .tax-result-amount strong,
.tax-result-hero .tax-result-rate strong {
  color: var(--feature-highlight);
}

.metric.main.loan-payment-hero {
  border-color: var(--feature-loan);
  background: var(--feature-loan);
  color: var(--feature-cream);
}

.loan-payment-stage strong {
  color: var(--feature-highlight);
}
```

Retain the generic `.metric.main` navy rule. Update the internal separator colors only if needed for contrast, keeping them scoped to `.tax-result-hero` and `.loan-payment-hero`.

- [ ] **Step 4: Run focused and nearby regression tests.**

Run:

```powershell
node --test tests/functional-duotone-refresh.test.cjs tests/unified-calculator-polish.test.cjs
```

Expected: PASS with no markup or calculation regressions.

- [ ] **Step 5: Commit the result-card color change.**

```powershell
git add index.html tests/functional-duotone-refresh.test.cjs
git commit -m "feat: apply functional duotone result colors"
```

---

### Task 2: Add a semantic three-step structure without breaking helper behavior

**Files:**
- Modify: `tests/functional-duotone-refresh.test.cjs`
- Modify: `tainan-land-value-helper.html:1452-1695`

- [ ] **Step 1: Add failing markup and preservation contracts.**

Append these tests:

```js
test("land helper keeps its approved header and intro unchanged", () => {
  assert.match(helperHtml, /<header class="brand-hero">\s*<img class="brand-hero__mobile-art" src="assets\/mobile-hero-exact\.jpg" width="1787" height="880" alt="台南小魏 買厝作伙。房地稅費與貸款試算。正式申報仍以稅務機關、地政士、銀行核定為準。">\s*<\/header>/);
  assert.match(helperHtml, /<section class="tool-intro" aria-labelledby="toolTitle">[\s\S]*?<h1 id="toolTitle">用地號查詢公告現值<\/h1>[\s\S]*?只有門牌先查地號[\s\S]*?<\/section>/);
});

test("land helper exposes a three-step query flow and result dashboard", () => {
  assert.match(helperHtml, /class="workspace land-value-workspace"/);
  assert.match(helperHtml, /class="panel land-query-flow"/);
  assert.equal((helperHtml.match(/class="land-query-step"/g) || []).length, 3);
  assert.match(helperHtml, /class="panel result-panel land-result-dashboard"/);
  assert.match(helperHtml, /class="metric main land-metric land-metric--primary"/);
});

test("land helper preserves every behavior-bound ID", () => {
  for (const id of [
    "district", "sectionName", "mainNo", "subNo", "areaSqm", "areaPing",
    "currentValue", "previousValue", "queryLandValues", "lookupStatus",
    "currentTotalOut", "previousTotalOut", "gainTotalOut", "currentPingOut",
    "summaryText", "copySummary"
  ]) {
    assert.match(helperHtml, new RegExp(`id="${id}"`));
  }
  assert.match(helperHtml, /const STORAGE_KEY = "tainanLandValueHelperForm"/);
});
```

- [ ] **Step 2: Run the focused test and confirm only the new layout contract is RED.**

Run:

```powershell
node --test tests/functional-duotone-refresh.test.cjs
```

Expected: the header/ID preservation checks pass; the new semantic layout check fails.

- [ ] **Step 3: Add semantic workbench classes and three query steps.**

Make these class-only outer replacements:

```html
<div class="workspace">
<section class="panel" aria-label="查詢步驟與地號整理">
<aside class="panel result-panel" aria-label="換算結果">
```

becomes:

```html
<div class="workspace land-value-workspace">
<section class="panel land-query-flow" aria-label="查詢步驟與地號整理">
<aside class="panel result-panel land-result-dashboard" aria-label="換算結果">
```

Inside the left `.section`, group the existing controls into exactly three semantic sections. Do not rename or recreate any ID:

```html
<section class="land-query-step" aria-labelledby="landStep1Title">
  <div class="land-query-step__head">
    <span aria-hidden="true">01</span>
    <div><h2 id="landStep1Title">整理地號</h2><p>選行政區、小段名，再輸入母號與子號。</p></div>
  </div>
</section>

<section class="land-query-step" aria-labelledby="landStep2Title">
  <div class="land-query-step__head">
    <span aria-hidden="true">02</span>
    <div><h2 id="landStep2Title">補齊換算資料</h2><p>確認土地面積、公告現值與前次移轉現值。</p></div>
  </div>
</section>

<section class="land-query-step land-query-step--action" aria-labelledby="landStep3Title">
  <div class="land-query-step__head">
    <span aria-hidden="true">03</span>
    <div><h2 id="landStep3Title">取得結果</h2><p>查詢後，右側會同步更新換算與摘要。</p></div>
  </div>
</section>
```

Place the existing `district`, `sectionName`, `mainNo`, and `subNo` field nodes after the Step 01 head. Place the existing `areaSqm`, `areaPing`, `currentValue`, and `previousValue` field nodes after the Step 02 head. Place the existing `queryActionButtons`, `queryActionToast`, and `lookupStatus` nodes after the Step 03 head. Move those nodes unchanged rather than duplicating them.

Keep the hidden/source controls that existing JavaScript removes at startup (`ownerId`, `queryYear`, `queryResult`, and `.formatted-box`) intact unless a separate behavior-preserving cleanup test is added. Move only their containing markup; do not change the cleanup selectors in this task.

- [ ] **Step 4: Add result-card semantic classes without changing IDs or text.**

Apply these class replacements to the four existing metric opening tags, in their current order:

```html
<div class="metric main land-metric land-metric--primary">
<div class="metric land-metric land-metric--previous">
<div class="metric land-metric land-metric--delta">
<div class="metric land-metric land-metric--per-ping">
```

Add `land-summary-panel` to the existing summary field wrapper and `land-dashboard-actions` to its button row. Remove the inline `style="margin-top: 10px;"` from that row; the new class owns its spacing.

- [ ] **Step 5: Run the focused suite and confirm GREEN.**

Run:

```powershell
node --test tests/functional-duotone-refresh.test.cjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit the semantic helper structure.**

```powershell
git add tainan-land-value-helper.html tests/functional-duotone-refresh.test.cjs
git commit -m "refactor: structure land value query workbench"
```

---

### Task 3: Style the helper as a 56/44 functional dashboard

**Files:**
- Modify: `tests/functional-duotone-refresh.test.cjs`
- Modify: `tainan-land-value-helper.html:1219-1435`

- [ ] **Step 1: Add failing layout and responsive CSS contracts.**

Append:

```js
test("land helper uses the approved desktop workbench proportions", () => {
  assert.match(helperHtml, /\.land-value-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.12fr\)\s+minmax\(340px,\s*\.88fr\)/s);
  assert.match(helperHtml, /\.land-result-dashboard\s*\{[^}]*position:\s*sticky[^}]*top:\s*12px/s);
});

test("land helper collapses cleanly and disables sticky positioning on mobile", () => {
  assert.match(helperHtml, /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.land-value-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*\}[\s\S]*?\.land-result-dashboard\s*\{[^}]*position:\s*static/s);
  assert.match(helperHtml, /@media \(max-width:\s*620px\)\s*\{[\s\S]*?\.land-query-step\s*\{[^}]*padding:/s);
});
```

- [ ] **Step 2: Run the focused test and confirm RED.**

```powershell
node --test tests/functional-duotone-refresh.test.cjs
```

Expected: the two new layout tests fail.

- [ ] **Step 3: Add the approved functional two-color workbench styles after the shared Consultant B helper theme.**

Use the existing cream, navy, terracotta, paper, line, and shadow variables. Add the following structural rules, then tune only spacing/typography necessary to match the approved compact direction:

```css
.land-value-workspace {
  grid-template-columns: minmax(0, 1.12fr) minmax(340px, .88fr);
  align-items: start;
}

.land-query-flow > .section {
  display: grid;
  gap: 12px;
  padding: 12px;
}

.land-query-step {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--consultant-line);
  border-radius: 10px;
  background: #fffdf7;
}

.land-query-step__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.land-query-step__head > span {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 50%;
  background: var(--consultant-terracotta);
  color: #fffaf0;
  font-size: .72rem;
  font-weight: 850;
}

.land-query-step__head h2,
.land-query-step__head p {
  margin: 0;
}

.land-query-step__head h2 {
  color: var(--consultant-navy);
  font-size: 1rem;
}

.land-query-step__head p {
  margin-top: 3px;
  color: var(--consultant-muted);
  font-size: .78rem;
  line-height: 1.5;
}

.land-result-dashboard {
  position: sticky;
  top: 12px;
  align-self: start;
}

.land-result-dashboard > .section {
  padding: 12px;
}

.land-result-dashboard .metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.land-metric--primary {
  grid-column: 1 / -1;
}

.land-metric--delta {
  border-color: rgba(185, 80, 45, .28);
  background: #f8eee6;
}

.land-summary-panel {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--consultant-line);
}

.land-dashboard-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}
```

Add responsive behavior inside the existing media layers:

```css
@media (max-width: 900px) {
  .land-value-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .land-result-dashboard {
    position: static;
  }
}

@media (max-width: 620px) {
  .land-query-flow > .section,
  .land-result-dashboard > .section {
    padding: 10px;
  }

  .land-query-step {
    padding: 13px;
  }

  .land-result-dashboard .metric-grid,
  .land-dashboard-actions {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Do not add gradients, decorative illustrations, or a new third accent color. Maintain the B direction: navy/lake-blue information hierarchy, terracotta actions, cream paper background.

- [ ] **Step 4: Run focused and helper regression tests.**

```powershell
node --test tests/functional-duotone-refresh.test.cjs tests/brand-ui-refresh.test.cjs tests/public-browser-access.test.cjs
```

Expected: PASS.

- [ ] **Step 5: Commit the helper styling.**

```powershell
git add tainan-land-value-helper.html tests/functional-duotone-refresh.test.cjs
git commit -m "feat: redesign land value helper dashboard"
```

---

### Task 4: Verify all calculators and responsive browser behavior

**Files:**
- Verify only: `index.html`
- Verify only: `tainan-land-value-helper.html`
- Verify only: `tests/*.test.cjs`

- [ ] **Step 1: Run the complete automated suite.**

```powershell
npm test
```

Expected: all tests pass with exit code 0. Record the final test count.

- [ ] **Step 2: Run whitespace/error checks and verify staged scope.**

```powershell
git diff --check
git status --short
git diff --stat HEAD~3..HEAD
```

Expected: no whitespace errors; only `index.html`, `tainan-land-value-helper.html`, and `tests/functional-duotone-refresh.test.cjs` are production/test changes. `.superpowers/` remains untracked and unstaged.

- [ ] **Step 3: Serve the repository over local HTTP.**

```powershell
python -m http.server 8795 --bind 127.0.0.1
```

Use the Codex in-app browser for all following checks. Do not use `file://` as final evidence.

- [ ] **Step 4: Verify tax and loan result heroes at desktop 1436 × 1320.**

Open:

```text
http://127.0.0.1:8795/index.html#tax
http://127.0.0.1:8795/index.html#loan
```

Complete each wizard to the result page and verify:

- tax hero background resolves to `rgb(142, 64, 43)` and key figures to `rgb(255, 224, 168)`;
- loan hero background resolves to `rgb(22, 77, 92)` and payment figures to `rgb(255, 224, 168)`;
- buyer and young result primary cards still use the existing navy;
- no clipped text, accidental empty region, or horizontal document overflow;
- browser console has no errors.

- [ ] **Step 5: Verify the land helper at desktop 1436 × 1320.**

Open:

```text
http://127.0.0.1:8795/tainan-land-value-helper.html
```

Verify:

- header image and intro content are visually unchanged;
- below-header layout is a compact 56/44 workbench;
- left column visibly reads as steps 01, 02, 03;
- right dashboard is sticky while scrolling on desktop;
- selecting an administrative district populates the section selector;
- entering area in square meters updates ping, and entering ping updates square meters;
- existing lookup status, output cards, summary, copy control, JPG download control, and cross-tool links remain present;
- no console errors or horizontal overflow.

- [ ] **Step 6: Verify mobile layouts at 390 × 844, 375 × 812, and 360 × 800.**

At each viewport verify:

- workbench collapses to one column;
- result dashboard is not sticky and follows the form;
- each field, button, metric, and summary fits within the viewport;
- the 01/02/03 markers and headings remain readable;
- tax and loan heroes collapse cleanly with their internal separators intact;
- tabs remain 48px high with 14px text;
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`;
- console remains error-free.

- [ ] **Step 7: If browser verification exposes a defect, fix it with a new narrow RED test before changing production code.**

Add the defect-specific assertion to `tests/functional-duotone-refresh.test.cjs`, run the focused test to see RED, apply the minimum CSS/markup fix, then rerun the focused suite and `npm test` to GREEN. Commit only if a fix was required:

```powershell
git add index.html tainan-land-value-helper.html tests/functional-duotone-refresh.test.cjs
git commit -m "fix: polish functional duotone responsive layout"
```

- [ ] **Step 8: Stop the local server and report evidence.**

Report the final test count, desktop/mobile viewports checked, console status, overflow status, and the exact commits created. Do not claim deployment or live GitHub Pages verification unless the user separately authorizes publishing and that deployment is actually verified.
