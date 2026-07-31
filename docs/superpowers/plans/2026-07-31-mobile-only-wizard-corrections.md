# Mobile-Only Wizard Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Consultant B wizard redesign on phones only, restore the existing desktop presentation, migrate the general-loan default rate to 2.5% once, and format mobile source references as a readable list.

**Architecture:** Keep the existing single-file HTML application and calculator logic. The wizard markup and controller remain shared, while visual Consultant B rules are enclosed by the existing `max-width: 620px` breakpoint; desktop only receives global rules that hide mobile-only controls. Storage migration uses a new version flag so existing users receive 2.5% once and later custom edits remain persistent.

**Tech Stack:** Single-file HTML/CSS/vanilla JavaScript, Node.js built-in test runner, localStorage version migration, Codex in-app browser, GitHub Pages.

## Global Constraints

- Consultant B colors, header, cards, tabs, and wizard visuals apply only at `max-width: 620px`.
- Desktop widths above 620px retain the pre-Consultant presentation and the original two-column form/result layout.
- General-loan `annualRate` defaults to `2.5`, migrates old saved state once, and remains user-editable afterward.
- Mobile source references become a vertical semantic list; desktop keeps the current inline paragraph appearance.
- Do not change purchase-price result presentation in this plan.
- Do not change tax rates, loan formulas, Young Housing Loan 3.0 policy values, source URLs, disclaimers, or the LIFF gate.
- Keep public text in Traditional Chinese and do not add dependencies or a second mobile page.

---

### Task 1: Lock the mobile-only contract with failing tests

**Files:**
- Modify: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: `index.html` as UTF-8 text.
- Produces: Regression tests defining mobile-only Consultant CSS, desktop-hidden mobile controls, the annual-rate migration, and source-list structure.

- [ ] **Step 1: Add helpers that isolate the final Consultant block**

```js
function consultantCss() {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  return html.slice(marker, html.indexOf("</style>", marker));
}

function mobileConsultantCss() {
  const css = consultantCss();
  const marker = "/* Mobile-only Consultant B visuals */";
  const start = css.indexOf(marker);
  assert.ok(start > -1, "missing mobile-only Consultant B wrapper");
  return css.slice(start);
}
```

- [ ] **Step 2: Write failing tests for desktop isolation**

```js
test("Consultant B visual theme is enclosed by the phone breakpoint", () => {
  const css = consultantCss();
  assert.match(css, /\.wizard-mobile-head,[\s\S]*display:\s*none/);
  assert.match(css, /@media \(max-width:\s*620px\)\s*\{\s*\/\* Mobile-only Consultant B visuals \*\//);

  const beforeMobile = css.slice(0, css.indexOf("/* Mobile-only Consultant B visuals */"));
  assert.doesNotMatch(beforeMobile, /--consultant-cream|\.brand-hero\s*\{|\.workspace\s*\{/);
});

test("desktop does not hide calculator forms from wizard state", () => {
  const beforeMobile = consultantCss().slice(
    0,
    consultantCss().indexOf("/* Mobile-only Consultant B visuals */")
  );
  assert.doesNotMatch(beforeMobile, /\[data-wizard\]\[data-wizard-current="3"\]\s*>\s*form/);
});
```

- [ ] **Step 3: Write failing tests for rate migration and source list**

```js
test("legacy saved loan rate migrates to the 2.5 percent default once", () => {
  assert.match(html, /__annualRateDefaultVersion:\s*2/);
  assert.match(html, /const annualRateDefaultVersion = Number\(data\.__annualRateDefaultVersion\) \|\| 1/);
  assert.match(html, /id === "annualRate" && annualRateDefaultVersion < 2\s*\?\s*2\.5/);
});

test("source references are inline on desktop and listed on phones", () => {
  assert.match(html, /<ul class="sources-list">/);
  assert.equal((html.match(/<li class="source-item">/g) || []).length, 5);

  const css = consultantCss();
  const mobile = mobileConsultantCss();
  assert.match(css, /\.sources-list\s*\{[^}]*display:\s*inline/s);
  assert.match(css, /\.source-item\s*\{[^}]*display:\s*inline/s);
  assert.match(mobile, /\.sources-list\s*\{[^}]*display:\s*grid/s);
  assert.match(mobile, /\.source-item\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/s);
});
```

- [ ] **Step 4: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/brand-consultant-wizard.test.cjs
```

Expected: FAIL because the mobile-only wrapper, annual-rate storage version, and source list do not exist.

- [ ] **Step 5: Commit the failing contract**

```powershell
git add -- tests/brand-consultant-wizard.test.cjs
git commit -m "test: define mobile-only calculator corrections"
```

---

### Task 2: Restrict Consultant B visuals to phones

**Files:**
- Modify: `index.html` final style block after `/* Consultant B wizard theme */`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: Existing wizard markup, `data-wizard-current`, and the `620px` phone breakpoint.
- Produces: A final CSS layer where desktop only hides mobile-only controls and all Consultant B visuals live inside one phone media query.

- [ ] **Step 1: Keep only mobile-control hiding rules global**

Immediately after `/* Consultant B wizard theme */`, retain:

```css
.wizard-mobile-head,
.wizard-mobile-actions,
.wizard-result-actions {
  display: none;
}
```

- [ ] **Step 2: Enclose the visual theme in the phone breakpoint**

Move the Consultant variables and all subsequent theme selectors into:

```css
@media (max-width: 620px) {
  /* Mobile-only Consultant B visuals */
  :root {
    --consultant-cream: #f3ead7;
    --consultant-paper: #fffaf0;
    --consultant-navy: #102738;
    --consultant-terracotta: #b9502d;
    --consultant-olive: #596a36;
    --consultant-ink: #24231f;
    --consultant-muted: #766f62;
    --consultant-line: #d9ccb7;
  }

  /* existing Consultant B declarations follow unchanged */
}
```

The existing `@media (min-width: 901px)` desktop layout override must be removed from the Consultant layer. Existing `max-width: 900px`, `max-width: 620px`, and reduced-motion rules may remain nested because the outer condition already limits them to phones.

- [ ] **Step 3: Run the focused test and verify GREEN for desktop isolation**

Run:

```powershell
node --test tests/brand-consultant-wizard.test.cjs
```

Expected: Desktop-isolation tests pass; rate migration and source-list tests still fail.

- [ ] **Step 4: Commit the mobile-only theme**

```powershell
git add -- index.html tests/brand-consultant-wizard.test.cjs
git commit -m "style: limit consultant wizard theme to phones"
```

---

### Task 3: Migrate the general-loan default rate once

**Files:**
- Modify: `index.html` `saveInputs()` and `restoreInputs()`
- Test: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: localStorage key `realEstateCalcInputs.v1`, `annualRate` input, and the current `defaults.loan.annualRate`.
- Produces: `__annualRateDefaultVersion: 2` and one-time restoration to numeric value `2.5`.

- [ ] **Step 1: Add the storage version to saved input data**

Change the saved metadata to:

```js
const data = {
  __moneyUnitVersion: 2,
  __loanRatioUnitVersion: 2,
  __annualRateDefaultVersion: 2
};
```

- [ ] **Step 2: Read the version during restore**

Add:

```js
const annualRateDefaultVersion = Number(data.__annualRateDefaultVersion) || 1;
```

- [ ] **Step 3: Apply the one-time migration before other scalar restoration**

Use:

```js
const savedValue = id === "annualRate" && annualRateDefaultVersion < 2
  ? 2.5
  : moneyUnitVersion < 2 && el.dataset.moneyUnit === "wan"
    ? parseNumericValue(saved) / 10000
    : loanRatioUnitVersion < 2 &&
        ["loanRatio", "loanLtvRatio"].includes(id) &&
        parseNumericValue(saved) > 10
      ? parseNumericValue(saved) / 10
      : saved;
```

- [ ] **Step 4: Run focused rate tests**

Run:

```powershell
node --test tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs
```

Expected: Annual-rate tests pass; source-list test still fails.

- [ ] **Step 5: Commit the migration**

```powershell
git add -- index.html tests/brand-consultant-wizard.test.cjs
git commit -m "fix: migrate saved loan rate to 2.5 percent"
```

---

### Task 4: Format source references as a mobile list

**Files:**
- Modify: `index.html` `.sources` markup and final CSS
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: The five existing government-reference groups and their unchanged URLs.
- Produces: `.sources-list` containing five `.source-item` list items, inline on desktop and vertically listed on phones.

- [ ] **Step 1: Replace anonymous source text with semantic list markup**

Use this structure while preserving every link:

```html
<section class="sources">
  <b>計算依據：</b>
  <ul class="sources-list">
    <li class="source-item">
      房地合一稅基與自住房地優惠參考
      <a href="https://www.mof.gov.tw/houseandland/multiplehtml/de144e74630c4ac59f2d84a068c889c9" target="_blank" rel="noreferrer">財政部房地合一稅制設計</a>
    </li>
    <li class="source-item">
      買方常見費用參考
      <a href="https://land.yunlin.gov.tw/cp.aspx?n=540" target="_blank" rel="noreferrer">雲林縣政府地政處／內政部不動產交易服務網資料</a>
    </li>
    <li class="source-item">
      契稅按契價計算與買賣稅率 6% 參考
      <a href="https://www.tycg.gov.tw/NewsPage_Content.aspx?n=7&s=1598159&sms=7882" target="_blank" rel="noreferrer">桃園市政府地方稅務局</a>
    </li>
    <li class="source-item">
      抵押權設定登記規費參考
      <a href="https://land.kinmen.gov.tw/Service/faq_more?id=e747821184c841a9ab225bed07212a98" target="_blank" rel="noreferrer">金門縣地政局登記規費說明</a>
    </li>
    <li class="source-item">
      青安貸款 3.0 額度、房價、年齡、所得與 3＋3 年利息補貼參考
      <a href="https://www.ey.gov.tw/Page/448DE008087A1971/1cb37b62-d127-4876-9cce-95016f49bcbe" target="_blank" rel="noreferrer">行政院青安貸款 3.0 正式方案</a>及
      <a href="https://www.ey.gov.tw/File/22AD2750D5B3A97?A=C" target="_blank" rel="noreferrer">行政院方案說明 PDF</a>
    </li>
  </ul>
</section>
```

The final implementation must contain these five complete list items and all six existing links.

- [ ] **Step 2: Preserve the desktop inline appearance**

Outside the phone media query, add:

```css
.sources-list {
  display: inline;
  margin: 0;
  padding: 0;
  list-style: none;
}

.source-item {
  display: inline;
}

.source-item:not(:last-child)::after {
  content: "；";
}
```

- [ ] **Step 3: Add the phone-only list layout**

Inside the `max-width: 620px` Consultant wrapper, add:

```css
.sources {
  display: grid;
  gap: 10px;
}

.sources-list {
  display: grid;
  gap: 10px;
}

.source-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 8px;
  align-items: start;
  line-height: 1.65;
}

.source-item::before {
  content: "•";
  grid-row: 1 / span 2;
  color: var(--consultant-terracotta);
  font-weight: 900;
}

.source-item:not(:last-child)::after {
  content: none;
}

.source-item a {
  grid-column: 2;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test tests/brand-consultant-wizard.test.cjs
```

Expected: All focused tests pass.

- [ ] **Step 5: Commit the source list**

```powershell
git add -- index.html tests/brand-consultant-wizard.test.cjs
git commit -m "style: format mobile reference sources as a list"
```

---

### Task 5: Verify responsive behavior and deploy

**Files:**
- Verify: `index.html`
- Verify: `tests/*.test.cjs`
- Verify: `.github/workflows/*`
- No source changes unless verification finds a reproducible defect.

**Interfaces:**
- Consumes: The completed mobile-only changes on a clean branch.
- Produces: A tested `main` branch and a verified GitHub Pages deployment.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm.cmd test
git diff --check
```

Expected: All tests pass and `git diff --check` exits 0.

- [ ] **Step 2: Verify phones in the in-app browser**

At 375×812 and 390×844, verify:

- `matchMedia("(max-width: 620px)").matches === true`
- the active calculator starts at `01 / 04`
- general-loan step 2 shows `annualRate === "2.5"` after old-storage migration
- the five source items are vertically separated
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
- all four calculator flows can reach step 4
- console error log is empty

- [ ] **Step 3: Verify desktop has the original layout**

At 1280×800, compare against commit `531fdf2` and verify:

- `.wizard-mobile-head` and `.wizard-mobile-actions` are hidden
- the active calculator form and result aside are both visible
- `.workspace` has two columns
- Consultant color variables do not affect computed desktop colors
- header, tabs, panels, and source block match the pre-Consultant desktop presentation
- no horizontal overflow or console errors

- [ ] **Step 4: Merge and push**

After the finishing-branch workflow and a fresh merged-result test:

```powershell
git push origin main
```

- [ ] **Step 5: Wait for GitHub Pages and verify production**

Use the resulting commit SHA as the cache buster:

```powershell
$deploySha = git rev-parse --short HEAD
$deployUrl = "https://weslywei1984-glitch.github.io/real-estate-calculator/?v=$deploySha#loan"
```

Verify HTTP 200, the phone-only marker, five source items, annual-rate migration metadata, mobile screenshots, desktop layout, and zero console errors.
