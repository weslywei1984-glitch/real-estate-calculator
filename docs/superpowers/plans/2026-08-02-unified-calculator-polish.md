# Unified Calculator Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the two land tools visually match the approved 4-in-1 calculator and implement the sixteen annotated result, unit, and layout corrections without changing formulas or public routes.

**Architecture:** Keep each public tool as a standalone HTML document, following the repository convention of inline CSS and JavaScript. Add a final Consultant B visual layer to both land pages, and make focused rendering, unit-conversion, migration, and responsive-layout changes in `index.html`. Lock every behavior with Node tests before implementation, then verify the real pages at specified viewports and deploy the exact tested SHA.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, `vm` for pure formatter tests, GitHub Pages, browser-client responsive QA.

## Global Constraints

- Preserve all tax rates, exemptions, buyer fee formulas, loan formulas, Qing'an 3.0 policy values, official sources, disclaimers, public URLs, and LINE contact destinations.
- Do not load external frameworks, CDNs, LINE LIFF SDK, or `assets/liff-gate.js` on any public page.
- Keep `index.html` inline CSS and JavaScript in the existing file; keep each land tool standalone.
- Reuse `assets/mobile-hero-exact.jpg` byte-for-byte at 1787×880 on all three pages.
- Consultant B colors are cream `#f3ead7`, navy `#102738`, and terracotta `#b9502d`.
- All controls must remain keyboard accessible, at least 44px high, and compatible with `prefers-reduced-motion`.
- No page-level horizontal overflow at 360px; table-local horizontal scrolling is allowed.
- Write and run a failing regression test before each production change.
- Preserve the existing untracked `.superpowers/` directory and unrelated user changes.

---

### Task 1: Apply the approved 4-in-1 visual system to both land tools

**Files:**
- Create: `tests/unified-calculator-polish.test.cjs`
- Modify: `tainan-land-value-helper.html`
- Modify: `land-increment-total.html`

**Interfaces:**
- Consumes: `assets/mobile-hero-exact.jpg`, existing land-value lookup events, existing land-increment calculation events.
- Produces: `.brand-hero`, `.brand-hero__mobile-art`, `.tool-intro`, and a final `/* Consultant B shared tool theme */` CSS contract in both pages.

- [ ] **Step 1: Write the failing visual-contract tests**

Create `tests/unified-calculator-polish.test.cjs` with shared file readers and these assertions:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const indexHtml = read("index.html");
const landValueHtml = read("tainan-land-value-helper.html");
const landIncrementHtml = read("land-increment-total.html");

for (const [name, html] of [
  ["公告土地現值", landValueHtml],
  ["土地漲多少", landIncrementHtml]
]) {
  test(`${name}使用4合1核定主視覺與品牌色`, () => {
    assert.match(html, /class="brand-hero__mobile-art"[^>]*src="assets\/mobile-hero-exact\.jpg"[^>]*width="1787"[^>]*height="880"/);
    const marker = html.lastIndexOf("/* Consultant B shared tool theme */");
    assert.ok(marker > -1);
    const css = html.slice(marker, html.indexOf("</style>", marker));
    assert.match(css, /--consultant-cream:\s*#f3ead7/);
    assert.match(css, /--consultant-navy:\s*#102738/);
    assert.match(css, /--consultant-terracotta:\s*#b9502d/);
    assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/s);
    assert.match(css, /@media \(max-width:\s*620px\)/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  });
}
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: both tests fail because the two pages do not yet contain `.brand-hero__mobile-art` or the final Consultant B theme marker.

- [ ] **Step 3: Replace each old page header with the approved hero and a tool-specific intro**

Use this structure at the start of each `.shell`, changing only the tool title and lead:

```html
<header class="brand-hero">
  <img class="brand-hero__mobile-art"
       src="assets/mobile-hero-exact.jpg"
       width="1787"
       height="880"
       alt="台南小魏 買厝作伙。房地稅費與貸款試算。正式申報仍以稅務機關、地政士、銀行核定為準。">
</header>
<section class="tool-intro" aria-labelledby="toolTitle">
  <span class="tool-intro__eyebrow">台南小魏｜房地產實用工具</span>
  <h1 id="toolTitle">用地號查詢公告現值</h1>
  <p>先整理地號格式，系統會帶入 115 年公告現值；前次移轉現值可由客戶提供後換算。</p>
</section>
```

For `land-increment-total.html`, use title `土地漲多少計算器` and preserve its existing lead verbatim.

- [ ] **Step 4: Add the final Consultant B theme to both pages**

Immediately before each `</style>`, add `/* Consultant B shared tool theme */` and override:

```css
:root {
  --consultant-cream: #f3ead7;
  --consultant-navy: #102738;
  --consultant-terracotta: #b9502d;
  --consultant-paper: #fffaf1;
  --consultant-ink: #24231f;
  --consultant-muted: #665f55;
  --consultant-line: rgba(16, 39, 56, .16);
}

body { color: var(--consultant-ink); background: var(--consultant-cream); }
.shell { width: min(1040px, calc(100% - 32px)); padding: 24px 0 40px; }
.brand-hero { overflow: hidden; margin: 0 0 14px; border: 1px solid var(--consultant-line); border-radius: 14px; background: transparent; }
.brand-hero__mobile-art { display: block; width: 100%; height: auto; }
.tool-intro, .panel, .tool-panel, .answer-panel, .notes, .sources { border-color: var(--consultant-line); border-radius: 12px; background: var(--consultant-paper); box-shadow: 0 8px 24px rgba(16, 39, 56, .07); }
.tool-intro { display: grid; gap: 8px; margin-bottom: 12px; padding: 18px 20px; }
.tool-intro__eyebrow { color: var(--consultant-terracotta); font-size: .75rem; font-weight: 850; letter-spacing: .1em; }
.tool-intro h1 { color: var(--consultant-navy); }
.btn.primary, .float-contact__btn { background: var(--consultant-terracotta); color: #fff; }
:focus-visible { outline: 3px solid rgba(185, 80, 45, .55); outline-offset: 3px; }
@media (max-width: 620px) {
  .shell { width: min(100% - 20px, 620px); padding: 10px 0 92px; }
  .brand-hero { width: calc(100% + 20px); margin-left: -10px; border: 0; border-radius: 0; }
  .workspace, main { grid-template-columns: minmax(0, 1fr); }
  .float-contact { position: fixed; right: 12px; bottom: 12px; left: 12px; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
```

Adapt selectors to each existing page without deleting working lookup, calculation, result-state, or link markup. On desktop, override `.float-contact` to `position: static` inside the page flow; keep it fixed only inside the 620px media query.

- [ ] **Step 5: Run the focused test and full suite**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: 2 tests pass.

Run: `npm.cmd test`

Expected: the existing suite plus the two new tests pass with zero failures.

- [ ] **Step 6: Commit Task 1**

```powershell
git add -- tests/unified-calculator-polish.test.cjs tainan-land-value-helper.html land-increment-total.html
git commit -m "feat: unify land tool visual design"
```

---

### Task 2: Convert the four annotated tax and buyer inputs to ten-thousand-dollar units

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `tests/young-housing-loan-3-markup.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: `value(id)`, `setNumericInputValue(id, value)`, `defaults`, and localStorage key `realEstateCalcInputs.v1`.
- Produces: `NEW_WAN_FIELD_IDS`, `__moneyUnitVersion: 3`, version 1/2-to-3 migration, tax result output through `wanMetric()` and `wanLine()`.

- [ ] **Step 1: Write failing unit and migration tests**

Append tests that require:

```js
test("四個新欄位以萬元輸入", () => {
  for (const [id, value] of [
    ["sellExpense", "0"],
    ["landGain", "0"],
    ["buildingValue", "100"],
    ["landDeclaredValue", "180"]
  ]) {
    assert.match(indexHtml, new RegExp(`<input id="${id}"[^>]*data-money-unit="wan"[^>]*value="${value}"`));
    assert.match(indexHtml, new RegExp(`<input id="${id}"[\\s\\S]{0,180}<span class="unit">萬元<\\/span>`));
  }
});

test("版本2的四個元欄位只轉換一次", () => {
  assert.match(indexHtml, /const NEW_WAN_FIELD_IDS = new Set\(\["sellExpense", "landGain", "buildingValue", "landDeclaredValue"\]\)/);
  assert.match(indexHtml, /__moneyUnitVersion:\s*3/);
  assert.match(indexHtml, /moneyUnitVersion < 3 && NEW_WAN_FIELD_IDS\.has\(id\)/);
});

test("房地合一稅結果全面顯示萬元", () => {
  assert.match(indexHtml, /wanMetric\("預估應納房地合一稅", tax, "main"\)/);
  assert.match(indexHtml, /wanLine\("出售成交價額", salePrice\)/);
  assert.match(indexHtml, /wanLine\("減：土地漲價總數額", -landGain\)/);
});
```

Update the old test named `指定的大額金額欄位以萬元輸入並移除重複換算提示` so the four new IDs are part of its `wanFields` array and it expects version 3.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/unified-calculator-polish.test.cjs tests/young-housing-loan-3-markup.test.cjs`

Expected: failures mention missing `data-money-unit="wan"`, version 3, migration set, and tax `wanMetric`/`wanLine` rendering.

- [ ] **Step 3: Update markup and defaults-compatible display values**

In `index.html`:

```html
<input id="sellExpense" data-money-unit="wan" type="number" min="0" step="0.1" value="0">
<span class="unit">萬元</span>
<input id="landGain" data-money-unit="wan" type="number" min="0" step="0.1" value="0">
<span class="unit">萬元</span>
<input id="buildingValue" data-money-unit="wan" type="number" min="0" step="0.1" value="100">
<span class="unit">萬元</span>
<input id="landDeclaredValue" data-money-unit="wan" type="number" min="0" step="0.1" value="180">
<span class="unit">萬元</span>
```

Keep `defaults.buyer.buildingValue` as `1000000` and `defaults.buyer.landDeclaredValue` as `1800000` because defaults are stored internally in yuan.

- [ ] **Step 4: Implement version 3 storage migration**

Add beside the storage constants:

```js
const NEW_WAN_FIELD_IDS = new Set(["sellExpense", "landGain", "buildingValue", "landDeclaredValue"]);
```

Save `__moneyUnitVersion: 3`. In `restoreInputs()`, convert when either an old pre-v2 yuan-backed wan field or one of the four newly converted fields is loaded:

```js
const savedValue = id === "annualRate" && annualRateDefaultVersion < 2
  ? 2.5
  : ((moneyUnitVersion < 2 && el.dataset.moneyUnit === "wan") ||
      (moneyUnitVersion < 3 && NEW_WAN_FIELD_IDS.has(id)))
    ? parseNumericValue(saved) / 10000
    : loanRatioUnitVersion < 2 && ["loanRatio", "loanLtvRatio"].includes(id) && parseNumericValue(saved) > 10
      ? parseNumericValue(saved) / 10
      : saved;
```

- [ ] **Step 5: Render every tax amount in wan**

Inside `calculateTax()`, replace only the tax amount rendering:

```js
${wanMetric("預估應納房地合一稅", tax, "main")}
${wanLine("出售成交價額", salePrice)}
${wanLine("減：取得成本", -buyCost)}
${wanLine("減：取得、改良與移轉費用", -sellExpense)}
${wanLine("減：土地漲價總數額", -landGain)}
${wanLine("課稅所得稅基", grossIncome)}
${selfUse ? wanLine("自住房地免稅額", -exemption) : ""}
${wanLine("出售稅後淨利", afterTaxProfit)}
```

Do not change `taxRate()`, `grossIncome`, `exemption`, `taxableIncome`, or `tax` calculations.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/unified-calculator-polish.test.cjs tests/young-housing-loan-3-markup.test.cjs`

Expected: all focused tests pass.

Run: `npm.cmd test`

Expected: full suite passes with zero failures.

- [ ] **Step 7: Commit Task 2**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs tests/young-housing-loan-3-markup.test.cjs
git commit -m "feat: use wan units for annotated fields"
```

---

### Task 3: Format the annotated loan summary and table as conservative wan estimates

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `tests/brand-ui-refresh.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `ceilToThousand(amount): number`, `approxWanAmount(amount): string`, `approxWanRange(min, max): string`, and `approxWanLine(label, amount): string`.
- Consumes: existing `number` formatter and loan amortization row totals.

- [ ] **Step 1: Write failing pure formatter tests**

Add a helper that extracts the complete formatter block from `index.html` and evaluates it with `vm`. Test the required examples:

```js
function extractWanFormatters() {
  const match = indexHtml.match(/function ceilToThousand\(amount\)[\s\S]*?function approxWanRange\(minAmount, maxAmount\)[\s\S]*?\n    \}/);
  assert.ok(match, "missing wan estimate formatters");
  const context = {
    number: new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 }),
    exported: {}
  };
  vm.runInNewContext(`${match[0]}; exported.ceilToThousand = ceilToThousand; exported.approxWanAmount = approxWanAmount; exported.approxWanRange = approxWanRange;`, context);
  return context.exported;
}

test("貸款估算先無條件進位到千元再顯示萬元", () => {
  const { ceilToThousand, approxWanAmount, approxWanRange } = extractWanFormatters();
  assert.equal(ceilToThousand(5069223), 5070000);
  assert.equal(ceilToThousand(47415), 48000);
  assert.equal(ceilToThousand(12000000), 12000000);
  assert.equal(ceilToThousand(0), 0);
  assert.equal(ceilToThousand(Number.POSITIVE_INFINITY), 0);
  assert.equal(ceilToThousand(-50001), -51000);
  assert.equal(approxWanAmount(5069223), "約 507 萬");
  assert.equal(approxWanAmount(47415), "約 4.8 萬");
  assert.equal(approxWanAmount(12000000), "約 1,200 萬");
  assert.equal(approxWanAmount(0), "約 0 萬");
  assert.equal(approxWanRange(47415, 48301), "約 4.8～4.9 萬");
  assert.match(indexHtml, /approxWanRange\(periodMin, periodMax\)/);
});
```

Update `brand-ui-refresh.test.cjs` so its former assertion that the total-interest block stays in yuan now requires `approxWanAmount(totalInterest)` and `approxWanAmount(principal + totalInterest)`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/unified-calculator-polish.test.cjs tests/brand-ui-refresh.test.cjs`

Expected: failures state that the formatter functions and wan output calls are missing.

- [ ] **Step 3: Implement the pure formatters**

Add after `wanLine()`:

```js
function ceilToThousand(amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) return 0;
  const sign = Math.sign(numericAmount);
  return sign * Math.ceil(Math.abs(numericAmount) / 1000) * 1000;
}

function approxWanAmount(amount) {
  return `約 ${number.format(ceilToThousand(amount) / 10000)} 萬`;
}

function approxWanRange(minAmount, maxAmount) {
  const minWan = ceilToThousand(minAmount) / 10000;
  const maxWan = ceilToThousand(maxAmount) / 10000;
  return minWan === maxWan
    ? `約 ${number.format(maxWan)} 萬`
    : `約 ${number.format(minWan)}～${number.format(maxWan)} 萬`;
}
```

- [ ] **Step 4: Apply the formatter only to the annotated loan areas**

In `summarizePeriod()`, set:

```js
const paymentText = approxWanRange(periodMin, periodMax);
```

Render the remaining table cells with `approxWanAmount(principalPaid)`, `approxWanAmount(interestPaid)`, and `approxWanAmount(endingBalance)`.

In the `總利息與月付範圍` metric, use:

```js
<strong>${approxWanAmount(totalInterest)}</strong>
${approxWanLine("貸款本金", principal)}
${approxWanLine("還款總額", principal + totalInterest)}
${approxWanLine("最高月付", maxPayment)}
${approxWanLine("最低月付", Number.isFinite(minPayment) ? minPayment : 0)}
```

Add the small helper:

```js
function approxWanLine(label, amount) {
  return `<div class="line"><span>${label}</span><b>${approxWanAmount(amount)}</b></div>`;
}
```

- [ ] **Step 5: Run focused and full tests**

Run: `node --test tests/unified-calculator-polish.test.cjs tests/brand-ui-refresh.test.cjs`

Expected: focused tests pass.

Run: `npm.cmd test`

Expected: full suite passes with zero failures.

- [ ] **Step 6: Commit Task 3**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs tests/brand-ui-refresh.test.cjs
git commit -m "feat: format loan estimates in wan"
```

---

### Task 4: Recompose the Qing'an result summary and navigation

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `tests/young-housing-loan-3-markup.test.cjs`
- Modify: `index.html`

**Interfaces:**
- Produces: `.young-summary-row`, `.young-summary-note`, `.young-payment-equation`, `<caption class="amortization-caption">`, and Qing'an-only result back label `上一頁`.
- Consumes: `wanMetric()`, `splitLoanNote`, `graceStageDisplay`, `normalStageDisplay`, and `setWizardStep()`.

- [ ] **Step 1: Write failing layout-contract tests**

Add assertions:

```js
test("青安總貸款與自備款同列且註釋緊接其下", () => {
  assert.match(indexHtml, /<div class="young-summary-row">[\s\S]*?預估總貸款[\s\S]*?預估自備款[\s\S]*?young-summary-note/);
  assert.match(indexHtml, /\.young-summary-row\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(indexHtml, /\.young-summary-row \.young-main\s*\{[^}]*grid-column:\s*auto/s);
});

test("青安月付算式保持單行", () => {
  assert.match(indexHtml, /class="young-payment-equation"/);
  assert.match(indexHtml, /\.young-payment-equation\s*\{[^}]*white-space:\s*nowrap/s);
});

test("青安五階段名稱放在表格caption", () => {
  assert.doesNotMatch(indexHtml, /<h3 class="table-title">青安-五階段利率與月付<\/h3>/);
  assert.match(indexHtml, /<caption class="amortization-caption">青安－五階段利率與月付<\/caption>/);
});

test("青安結果返回按鈕顯示上一頁", () => {
  assert.match(indexHtml, /workspace\.dataset\.wizard === "young"\s*\?\s*"上一頁"\s*:\s*"重新調整"/);
});
```

Update the old Qing'an test `五階段表格改用標題，不再放大段說明` to expect the caption instead of the removed heading.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/unified-calculator-polish.test.cjs tests/young-housing-loan-3-markup.test.cjs`

Expected: failures identify the missing summary wrapper, caption, nowrap equation class, and Qing'an-only back label.

- [ ] **Step 3: Recompose the result markup**

Replace the first result fragments with:

```js
<div class="young-summary-row">
  ${wanMetric("預估總貸款", totalLoan, "main young-main")}
  ${wanMetric("預估自備款", downPayment, "young-down-payment")}
  ${supplementalLoan > 0
    ? `<div class="metric warn young-summary-note"><div class="policy-note">${splitLoanNote}</div></div>`
    : ""}
</div>
```

Wrap each equation strong element:

```html
<strong class="young-payment-equation">${graceStageDisplay}</strong>
<strong class="young-payment-equation">${normalStageDisplay}</strong>
```

Replace the standalone title with:

```html
<div class="table-wrap">
  <table class="amortization">
    <caption class="amortization-caption">青安－五階段利率與月付</caption>
```

- [ ] **Step 4: Add responsive Qing'an styles to the final Consultant B layer**

```css
.young-summary-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: 10px;
}
.young-summary-row .metric { min-width: 0; }
.young-summary-row .young-main { grid-column: auto; }
.young-summary-row .metric > strong { font-size: clamp(1.35rem, 4vw, 2.2rem); }
.young-summary-note { grid-column: 1 / -1; }
.young-payment-equation { display: block; max-width: 100%; white-space: nowrap; font-size: clamp(1.12rem, 3.5vw, 2rem); letter-spacing: -.025em; }
.amortization-caption { padding: 12px 14px; color: var(--consultant-navy); background: var(--consultant-paper); font-weight: 850; text-align: left; caption-side: top; }
@media (max-width: 620px) {
  .young-summary-row { gap: 8px; }
  .young-summary-row .metric { padding: 12px 10px; }
  .young-payment-equation { font-size: clamp(1rem, 4.8vw, 1.3rem); }
}
```

- [ ] **Step 5: Make only the Qing'an result back label say 上一頁**

In `setWizardStep()`:

```js
back.textContent = index === steps.length - 1
  ? (workspace.dataset.wizard === "young" ? "上一頁" : "重新調整")
  : "上一步";
```

Do not change the existing back-button event: subtracting one from the current wizard index already returns from result step 4 to input step 3 and preserves values.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/unified-calculator-polish.test.cjs tests/young-housing-loan-3-markup.test.cjs`

Expected: focused tests pass.

Run: `npm.cmd test`

Expected: full suite passes with zero failures.

- [ ] **Step 7: Commit Task 4**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs tests/young-housing-loan-3-markup.test.cjs
git commit -m "feat: refine qingan result layout"
```

---

### Task 5: Verify all workflows, integrate, and publish the exact tested SHA

**Files:**
- Verify: `index.html`
- Verify: `tainan-land-value-helper.html`
- Verify: `land-increment-total.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: all Task 1–4 commits.
- Produces: a tested branch, a pushed `main`, a successful GitHub Pages workflow for the exact release SHA, and cache-busted live URLs.

- [ ] **Step 1: Run the final automated verification**

Run:

```powershell
npm.cmd test
git diff --check
git status --short
```

Expected: all tests pass, `git diff --check` emits no output, and only the user-owned `.superpowers/` remains untracked.

- [ ] **Step 2: Start an isolated local server**

Use a free port that is not serving another checkout:

```powershell
$env:PORT='8795'
npm.cmd start
```

Confirm the server output identifies port 8795 before browser testing. Do not stop or reuse unrelated processes on other ports.

- [ ] **Step 3: Verify the 4-in-1 page in a real browser**

Test `http://127.0.0.1:8795/index.html#tax` at 360×800, 375×812, 768×900, 1280×800, and 1436×1320.

For each size, assert:

- hero natural size is 1787×880 and rendered ratio is unchanged;
- `document.documentElement.scrollWidth <= innerWidth`;
- contact actions do not overlap wizard navigation;
- browser error log is empty.

At 375×812 and 1436×1320, run tax, buyer, loan, and young from 01/04 through 04/04. Verify:

- tax inputs and results use wan;
- buyer's two annotated inputs use wan but formulas still produce the same fee results;
- loan summary and amortization table show `約 X 萬` using thousand-ceiling output;
- Qing'an summary cards stay in one row, note sits below, equations stay on one line, caption appears inside the table, and the result back button says `上一頁`.

- [ ] **Step 4: Verify both land tools in a real browser**

At 375×812 and 1436×1320:

- open `/tainan-land-value-helper.html`, complete a static district/section/land-number lookup, enter area/current/previous values, and confirm the result updates;
- open `/land-increment-total.html`, run both calculation modes with the existing example values;
- confirm both pages use the exact hero, Consultant B colors, responsive layout, correct contact behavior, no page-level horizontal overflow, and zero browser errors.

- [ ] **Step 5: Perform final branch review and integrate**

Review the full branch diff against `docs/superpowers/specs/2026-08-02-unified-calculator-polish-design.md`. Resolve every Critical and Important finding, rerun Steps 1–4, then fast-forward the reviewed branch into `main` while preserving `.superpowers/`.

- [ ] **Step 6: Push and watch only the exact release workflow**

```powershell
git push origin main
$releaseSha = git rev-parse HEAD
$runs = gh run list --commit $releaseSha --limit 10 --json databaseId,headSha,status,conclusion,name,url | ConvertFrom-Json
$pagesRun = $runs | Where-Object { $_.name -eq 'pages build and deployment' -and $_.headSha -eq $releaseSha } | Select-Object -First 1
if (-not $pagesRun) { throw "Pages workflow for $releaseSha was not found" }
gh run watch $pagesRun.databaseId --interval 3 --exit-status
```

Expected: `pages build and deployment` for `$releaseSha` reaches `completed/success`. Do not use an older run.

- [ ] **Step 7: Verify the deployed pages with a cache-busting version**

Create `$releaseVersion = $releaseSha.Substring(0, 7)` and open these URLs:

```text
https://weslywei1984-glitch.github.io/real-estate-calculator/index.html?v=$releaseVersion#young
https://weslywei1984-glitch.github.io/real-estate-calculator/tainan-land-value-helper.html?v=$releaseVersion
https://weslywei1984-glitch.github.io/real-estate-calculator/land-increment-total.html?v=$releaseVersion
```

Repeat the desktop/mobile hero, overflow, annotated output, primary interaction, and console checks against the live deployment before reporting completion.
