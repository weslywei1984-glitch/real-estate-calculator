# Result Card, Buyer Fields, and Toolbar Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved C lake-green palette, compact the tax result hero, refine buyer step-two wording/order, and align the four land-increment actions without changing calculations.

**Architecture:** Keep the existing single-file static application structure. Add narrowly scoped late-layer CSS and markup changes in `index.html` and `land-increment-total.html`; update source-contract tests so existing formulas, IDs, persisted values, and event listeners remain untouched.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, local HTTP preview, Codex in-app browser.

## Global Constraints

- Use Traditional Chinese Taiwan wording.
- Keep all tax, buyer-fee, land-increment formulas and policy values unchanged.
- Preserve `buildingValue`, `mortgageSettingRatio`, `landDeclaredValue`, `resetBtn`, and `sampleBtn` IDs and their values/listeners.
- Preserve `mortgageSettingRatio` values `1.2` and `0`; only visible labels change.
- Do not load LINE LIFF SDK or `assets/liff-gate.js` on public pages.
- Keep `.superpowers/` untracked and unstaged.
- Desktop target: `1054 × 1014`; mobile targets: `390 × 844`, `375 × 812`, `360 × 800`.
- No horizontal overflow, console errors, or controls below 44px touch height.
- Do not publish in this plan; publishing requires a later explicit user request.

---

### Task 1: Refine Buyer Step-Two Order and Copy

**Files:**
- Create: `tests/result-card-buyer-toolbar-refinement.test.cjs`
- Modify: `tests/brand-ui-refresh.test.cjs:226-231`
- Modify: `index.html:6225-6252`

**Interfaces:**
- Consumes: existing `data-wizard-step="2"`, `data-chip-input="mortgageSettingRatio"`, `buildingValue`, `mortgageSettingRatio`, and `landDeclaredValue` bindings.
- Produces: building-value-first markup order, unchanged hidden values, and approved visible copy.

- [ ] **Step 1: Write the failing buyer-field tests**

Create `tests/result-card-buyer-toolbar-refinement.test.cjs`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const landHtml = fs.readFileSync(path.join(root, "land-increment-total.html"), "utf8");

test("買方第二步先顯示房屋評定現值，再顯示貸款選項", () => {
  const building = indexHtml.indexOf('<label for="buildingValue">房屋評定現值／契價</label>');
  const mortgage = indexHtml.indexOf('<label>抵押權設定金額倍率</label>');
  const land = indexHtml.indexOf('<label for="landDeclaredValue">土地申報地價總額</label>');
  assert.ok(building > -1 && mortgage > building && land > mortgage);
});

test("買方第二步使用核准的貸款與查詢文案", () => {
  assert.match(indexHtml, /data-value="1\.2">銀行貸款<\/button>/);
  assert.match(indexHtml, /data-value="0">不用貸款<\/button>/);
  assert.match(indexHtml, /<input id="mortgageSettingRatio" type="hidden" value="1\.2">/);
  assert.match(indexHtml, /填房屋稅單的「課稅現值」<\/div>/);
  assert.match(indexHtml, /填公告地價 × 持有面積（m²）<\/div>/);
  assert.match(indexHtml, /查完資料後回填－土地申報地價總額/);
  assert.doesNotMatch(indexHtml, /下面自動算(?:契稅|買賣登記規費)/);
});
```

Update the existing test in `tests/brand-ui-refresh.test.cjs` so it expects the visible labels `銀行貸款` and `不用貸款` while still asserting values `1.2`, `0`, and hidden default `1.2`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test tests/result-card-buyer-toolbar-refinement.test.cjs tests/brand-ui-refresh.test.cjs
```

Expected: FAIL because the markup still places mortgage first and still contains `1.2 倍`, `不設定`, and the old automatic-calculation sentences.

- [ ] **Step 3: Apply the minimal buyer markup changes**

In `index.html`, move the complete `buildingValue` field before the mortgage field, keep all IDs and data attributes unchanged, and use:

```html
<div class="field" data-wizard-step="2">
  <label for="buildingValue">房屋評定現值／契價</label>
  <div class="control">
    <input id="buildingValue" data-money-unit="wan" type="number" min="0" step="0.1" value="100">
    <span class="unit">萬元</span>
  </div>
  <div class="field-note">填房屋稅單的「課稅現值」</div>
</div>
<div class="field" data-wizard-step="2">
  <label>抵押權設定金額倍率</label>
  <div class="chip-group chip-quick-row" data-chip-input="mortgageSettingRatio" role="group" aria-label="抵押權設定金額倍率">
    <button type="button" class="chip" data-value="1.2">銀行貸款</button>
    <button type="button" class="chip" data-value="0">不用貸款</button>
  </div>
  <input id="mortgageSettingRatio" type="hidden" value="1.2">
</div>
```

Use these exact remaining strings:

```html
<div class="field-note">填公告地價 × 持有面積（m²）</div>
<span>查完資料後回填－土地申報地價總額</span>
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/result-card-buyer-toolbar-refinement.test.cjs tests/brand-ui-refresh.test.cjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- index.html tests/brand-ui-refresh.test.cjs tests/result-card-buyer-toolbar-refinement.test.cjs
git commit -m "feat: refine buyer tax inputs"
```

---

### Task 2: Apply the Compact Lake-Green Tax Hero

**Files:**
- Modify: `tests/functional-duotone-refresh.test.cjs:10-15`
- Modify: `tests/result-card-buyer-toolbar-refinement.test.cjs`
- Modify: `index.html:5743-5791`
- Modify: `index.html:5923-5932`
- Modify: `index.html:6993-7004`

**Interfaces:**
- Consumes: existing `wanAmount(tax)`, `rate.rate`, `rate.label`, and `.tax-result-hero` render structure.
- Produces: `約 ${wanAmount(tax)}` display and C palette CSS without changing numeric values.

- [ ] **Step 1: Write the failing tax-card tests**

Update the tax palette test in `tests/functional-duotone-refresh.test.cjs` to assert:

```js
test("tax result hero uses the approved lake green, amber, and warm cream palette", () => {
  assert.match(indexHtml, /--feature-tax:\s*#164d5c/i);
  assert.match(indexHtml, /--feature-tax-accent:\s*#e0a63b/i);
  assert.match(indexHtml, /--feature-highlight:\s*#fff0c8/i);
  assert.match(indexHtml, /\.metric\.main\.tax-result-hero\s*\{[^}]*background:\s*var\(--feature-tax\)[^}]*box-shadow:\s*inset 0 4px 0 var\(--feature-tax-accent\)/is);
});
```

Append to `tests/result-card-buyer-toolbar-refinement.test.cjs`:

```js
test("房地合一稅結果加上約字並縮減主卡留白", () => {
  assert.match(indexHtml, /<strong>約 \$\{wanAmount\(tax\)\}<\/strong>/);
  assert.match(indexHtml, /\.metric\.main\.tax-result-hero\s*\{[^}]*padding:\s*12px 16px/is);
  assert.match(indexHtml, /@media \(max-width:\s*760px\)[\s\S]*?\.tax-result-rate\s*\{[^}]*border-top:\s*1px solid/is);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test tests/functional-duotone-refresh.test.cjs tests/result-card-buyer-toolbar-refinement.test.cjs
```

Expected: FAIL because the tax hero still uses `#8e402b`, lacks the amber accent, uses `#ffe0a8`, and renders the amount without `約`.

- [ ] **Step 3: Apply the minimal C palette and density changes**

In the final Consultant B variable block in `index.html`, set:

```css
--feature-tax: #164d5c;
--feature-tax-accent: #e0a63b;
--feature-highlight: #fff0c8;
```

Update the targeted hero rules:

```css
.tax-result-hero {
  grid-template-columns: minmax(0, 1.35fr) minmax(200px, .65fr);
  gap: 10px;
  align-items: center;
}

.tax-result-amount,
.tax-result-rate {
  gap: 4px;
}

.metric.main.tax-result-hero {
  padding: 12px 16px;
  border-color: var(--feature-tax);
  background: var(--feature-tax);
  color: var(--feature-cream);
  box-shadow: inset 0 4px 0 var(--feature-tax-accent);
}
```

Keep the existing mobile one-column rule and ensure `.tax-result-rate` uses `padding-top: 12px`, `padding-left: 0`, `border-top: 1px solid rgba(255, 250, 240, .24)`, and `border-left: 0` under `max-width: 760px`.

Change only the rendered text node:

```html
<strong>約 ${wanAmount(tax)}</strong>
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/functional-duotone-refresh.test.cjs tests/result-card-buyer-toolbar-refinement.test.cjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- index.html tests/functional-duotone-refresh.test.cjs tests/result-card-buyer-toolbar-refinement.test.cjs
git commit -m "feat: compact tax result hero"
```

---

### Task 3: Align and Recolor the Land-Increment Actions

**Files:**
- Modify: `tests/result-card-buyer-toolbar-refinement.test.cjs`
- Modify: `land-increment-total.html:556-567`
- Modify: `land-increment-total.html:923-939`
- Modify: `land-increment-total.html:1293-1310`

**Interfaces:**
- Consumes: existing `resetBtn`, `sampleBtn`, `index.html`, and `tainan-land-value-helper.html` actions.
- Produces: four-column desktop action grid, two-column phone grid, and action-specific classes without changing destinations or listeners.

- [ ] **Step 1: Write the failing toolbar tests**

Append to `tests/result-card-buyer-toolbar-refinement.test.cjs`:

```js
test("土地漲價操作列桌機四顆同排、手機兩欄", () => {
  assert.match(landHtml, /\.actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*\.7fr \.9fr 1\.35fr 1\.35fr;/s);
  assert.match(landHtml, /@media \(max-width:\s*620px\)[\s\S]*?\.actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(landHtml, /class="btn secondary action-reset" id="resetBtn"/);
  assert.match(landHtml, /class="btn primary action-sample" id="sampleBtn"/);
  assert.match(landHtml, /class="btn secondary action-home" href="index\.html"/);
  assert.match(landHtml, /class="btn ghost action-land" href="tainan-land-value-helper\.html"/);
});

test("土地漲價操作列使用湖水綠、琥珀與米白配色", () => {
  assert.match(landHtml, /\.action-sample\s*\{[^}]*background:\s*#e0a63b;[^}]*color:\s*#102738;/s);
  assert.match(landHtml, /\.action-land\s*\{[^}]*background:\s*#164d5c;[^}]*color:\s*#fffaf0;/s);
  assert.match(landHtml, /\.action-home\s*\{[^}]*border-color:\s*#164d5c;[^}]*color:\s*#164d5c;/s);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```powershell
node --test tests/result-card-buyer-toolbar-refinement.test.cjs tests/land-increment-cleanup.test.cjs
```

Expected: FAIL because `.actions` still uses wrapping flex layout and the action-specific classes/colors do not exist.

- [ ] **Step 3: Apply the minimal toolbar grid and palette changes**

Replace the desktop `.actions` layout with:

```css
.actions {
  display: grid;
  grid-template-columns: .7fr .9fr 1.35fr 1.35fr;
  gap: 8px;
  margin-top: 14px;
}

.actions .btn {
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding-inline: 10px;
  font-size: .88rem;
}

.action-reset {
  border-color: #102738;
  background: #fffaf0;
  color: #102738;
}

.action-sample {
  border-color: #e0a63b;
  background: #e0a63b;
  color: #102738;
}

.action-home {
  border-color: #164d5c;
  background: #fffaf0;
  color: #164d5c;
}

.action-land {
  border-color: #164d5c;
  background: #164d5c;
  color: #fffaf0;
}
```

Inside `@media (max-width: 620px)`, add:

```css
.actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

Add the exact action classes to the four existing controls while preserving IDs, labels, SVGs, and hrefs.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/result-card-buyer-toolbar-refinement.test.cjs tests/land-increment-cleanup.test.cjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- land-increment-total.html tests/result-card-buyer-toolbar-refinement.test.cjs
git commit -m "feat: align land calculator actions"
```

---

### Task 4: Full Regression and Browser Verification

**Files:**
- Verify: `index.html`
- Verify: `land-increment-total.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: the completed markup and CSS from Tasks 1-3.
- Produces: fresh automated and browser evidence that all four calculators and both responsive pages remain usable.

- [ ] **Step 1: Run the full automated suite**

Run:

```powershell
npm.cmd test
git diff --check
git status --short
```

Expected: all tests PASS; `git diff --check` returns exit code 0; `.superpowers/` remains the only unrelated untracked path.

- [ ] **Step 2: Start a local HTTP preview**

Run a temporary Python HTTP server from the repository on an unused localhost port. Record its PID and verify that the listening process is the started Python process before cleanup.

- [ ] **Step 3: Verify desktop layout at 1054 × 1014**

Using the in-app browser:

- Open `index.html#tax`, complete the wizard, and confirm the visible amount starts with `約`.
- Confirm `.tax-result-hero` uses `rgb(22, 77, 92)`, compact padding, amber top inset, and no horizontal overflow.
- Open `index.html#buyer` step two; confirm `buildingValue` is left of the mortgage choices, visible chips read `銀行貸款` and `不用貸款`, and the three approved help strings are exact.
- Open `land-increment-total.html`; confirm all four `.actions` children occupy one visual row and use the approved C palette.
- Read browser warning/error logs; expected result is an empty list.

- [ ] **Step 4: Verify phone layouts**

Repeat layout measurements at `390 × 844`, `375 × 812`, and `360 × 800`:

- Tax result hero is one column; the rate block uses a top separator and both values remain readable.
- Buyer step-two fields appear in building, mortgage, land order.
- Land actions use two equal columns, minimum 44px heights, and no clipped labels.
- `document.documentElement.scrollWidth - document.documentElement.clientWidth` equals `0` on both pages.
- Browser warning/error logs remain empty.

- [ ] **Step 5: Stop the preview server and inspect final history**

Stop only the recorded Python PID after confirming it still owns the preview port. Then run:

```powershell
git status --short
git log -5 --oneline
```

Expected: no modified tracked files, `.superpowers/` remains untracked, and the three implementation commits are present above the plan/spec commits.
