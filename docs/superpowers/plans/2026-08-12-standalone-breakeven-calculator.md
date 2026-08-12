# Standalone Break-Even Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the house break-even calculator from the public four-calculator home page to the unlisted standalone URL `/breakeven.html` without losing calculations or saved inputs.

**Architecture:** Keep both pages as dependency-free, self-contained HTML applications. `breakeven.html` owns the existing break-even model, four-step UI, local persistence, copy, and image export; `index.html` owns only the four public calculators and contains no reachable or dead break-even integration. The standalone page uses its own storage key and performs a one-time, non-destructive import from the legacy combined key.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Node.js 20 built-in test runner, `node:vm`, local HTTP browser verification, Git, VPS Nginx immutable releases.

## Global Constraints

- Standalone production URL is exactly `https://calc.tainanwei.com/breakeven.html`.
- No login, password, backend, database, external package, framework, CDN, or new API.
- Public `index.html` shows exactly tax, buyer, loan, and young calculators, with no break-even tab, link, form, hash route, or dead integration.
- `breakeven.html` includes `noindex`, `nofollow`, and `noarchive`, but remains accessible to anyone who knows the URL.
- `breakeven.html` does not load or send the public anonymous analytics client.
- Preserve every current break-even formula, tax rule, four wizard steps, quick/advanced exclusivity, warning, copy/JPG action, and official-source disclaimer.
- Use `realEstateBreakevenInputs.v1`; import only break-even fields from `realEstateCalcInputs.v1` when the new key is absent, without deleting or modifying the old key.
- Preserve public-calculator formulas, copy, localStorage compatibility, accessibility, and 375px layout.
- Continue serving production statically from `/var/www/real-estate-calculator/current`; keep `tainanwei.service` inactive and port 8787 closed.

---

## File Map

- Create `breakeven.html`: standalone shell, four-step form, result renderer, pure model, storage migration, copy, and JPG export.
- Modify `index.html`: remove break-even CSS, markup, defaults, model/render functions, calculator registration, event hooks, and hash behavior.
- Modify `tests/breakeven-calculator.test.cjs`: load `breakeven.html`, retain every model regression, and add standalone/privacy/storage contracts.
- Modify `tests/brand-consultant-wizard.test.cjs`: public loop covers four calculators; standalone wizard is checked separately.
- Modify `tests/brand-ui-refresh.test.cjs`: assert the exact four-tab public set.
- Modify `tests/private-analytics-client.test.cjs`: assert the standalone page has no analytics client or event endpoint.
- Modify `AGENTS.md`: document the new public/private-page ownership boundary.

---

### Task 1: Establish the standalone page and preserve the calculation model

**Files:**
- Create: `breakeven.html`
- Modify: `tests/breakeven-calculator.test.cjs`

**Interfaces:**
- Consumes: the current break-even markup/functions in `index.html` as the approved behavior reference.
- Produces: `parseBreakEvenDate(value)`, `breakEvenCostTotals(input)`, `validateBreakEvenModel(input)`, `breakEvenTaxProfile(input)`, `estimateBreakEvenTax(salePrice, input)`, `breakEvenNetAtPrice(salePrice, input, includeHoldingCosts)`, `solveBreakEvenPrice(input, includeHoldingCosts)`, `roundUpToTenThousand(amount)`, and `buildBreakEvenSummary(input)` inside `breakeven.html`.

- [ ] **Step 1: Point the existing regression tests at the missing standalone page**

Replace the fixture and workspace helper at the top of `tests/breakeven-calculator.test.cjs`:

```js
const publicHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "breakeven.html"), "utf8");

function breakEvenWorkspace() {
  const start = html.indexOf('data-wizard="breakeven"');
  const end = html.indexOf('<section class="sources"', start + 1);
  assert.ok(start > -1 && end > start, "獨立頁應提供平轉成本工作區");
  return html.slice(start, end);
}
```

Replace the old fifth-tab test with:

```js
test("獨立頁提供 noindex 與四步驟平轉工作區", () => {
  const section = breakEvenWorkspace();
  assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex,\s*nofollow,\s*noarchive"/i);
  assert.doesNotMatch(html, /class="tabs"|data-tab="(?:tax|buyer|loan|young|breakeven)"/);
  assert.match(section, /id="breakevenForm"/);
  assert.match(section, /id="breakevenResult"/);
  for (const step of [1, 2, 3, 4]) {
    assert.match(section, new RegExp(`data-wizard-step="${step}"`));
  }
  assert.match(section, /data-copy="breakeven"/);
  assert.match(section, /data-jpg="breakeven"/);
  assert.match(section, /data-clear="breakeven"/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

```powershell
node --test tests/breakeven-calculator.test.cjs
```

Expected: FAIL with `ENOENT` for `breakeven.html`.

- [ ] **Step 3: Create the self-contained standalone page**

Create the exact document shell:

```html
<!doctype html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>房屋平轉成本試算｜台南小魏</title>
</head>
<body>
  <main>
    <section class="workspace breakeven-workspace" data-wizard="breakeven"
      data-wizard-current="0"
      data-wizard-titles='["房屋資料","實際成本","出售與稅務","不賠結果"]'>
    </section>
    <section class="sources" aria-label="計算依據"></section>
  </main>
</body>
</html>
```

Populate the outer workspace with the exact approved contents currently at `index.html:7030-7307` (the complete form, result aside, and wizard controls). Preserve the contact block at `index.html:7310-7321`. Populate the source section with only the four break-even references currently at `index.html:7326-7349`. Move the exact pure functions named in **Produces** from the current inline script, plus only the common helpers they call: number/money formatting, numeric inputs, wizard navigation/validation, result state, and rendering. Do not copy tabs, public forms, `sendPrivateAnalyticsEvent`, `/api/analytics/event`, the public `calculators` map, or `assets/young-housing-loan-3.js`.

- [ ] **Step 4: Run focused model and structure tests**

```powershell
node --test tests/breakeven-calculator.test.cjs
```

Expected: all quick/advanced, date boundary, old-system manual tax, 3% cap, self-use exemption, prior-loss, fixed-case, mortgage, manual override, validation, field, tax, and standalone structure tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- breakeven.html tests/breakeven-calculator.test.cjs
git commit -m "feat: add standalone break-even calculator"
```

---

### Task 2: Add independent persistence, legacy import, and standalone actions

**Files:**
- Modify: `breakeven.html`
- Modify: `tests/breakeven-calculator.test.cjs`

**Interfaces:**
- Consumes: standalone field IDs and model from Task 1.
- Produces: `BREAKEVEN_STORAGE_KEY`, `LEGACY_STORAGE_KEY`, `BREAKEVEN_FIELD_IDS`, `readStoredObject(storage, key)`, `loadBreakEvenSavedData(storage)`, `saveBreakEvenInputs(storage)`, `restoreBreakEvenInputs(storage)`, `copyBreakEvenSummary()`, and `downloadBreakEvenResultJpg()`.

- [ ] **Step 1: Add failing migration and action tests**

Add a `loadBreakEvenStorage()` helper that extracts the storage block between exact marker comments, then append:

```js
test("獨立暫存優先，新 key 缺少時只匯入舊平轉欄位", () => {
  const { loadBreakEvenSavedData, BREAKEVEN_STORAGE_KEY } = loadBreakEvenStorage();
  const values = new Map([["realEstateCalcInputs.v1", JSON.stringify({
    breakevenPurchasePrice: "1234",
    breakevenSellerBrokerRate: "4",
    purchasePrice: "9999"
  })]]);
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };

  const imported = loadBreakEvenSavedData(storage);
  assert.equal(imported.breakevenPurchasePrice, "1234");
  assert.equal(imported.breakevenSellerBrokerRate, "4");
  assert.equal(imported.purchasePrice, undefined);
  assert.ok(values.has(BREAKEVEN_STORAGE_KEY));
  assert.ok(values.has("realEstateCalcInputs.v1"));
});

test("獨立頁提供獨立暫存、清空、複製與圖片輸出", () => {
  assert.match(html, /const BREAKEVEN_STORAGE_KEY = "realEstateBreakevenInputs\.v1"/);
  assert.match(html, /const LEGACY_STORAGE_KEY = "realEstateCalcInputs\.v1"/);
  assert.match(html, /function saveBreakEvenInputs\(/);
  assert.match(html, /function restoreBreakEvenInputs\(/);
  assert.match(html, /function copyBreakEvenSummary\(/);
  assert.match(html, /async function downloadBreakEvenResultJpg\(/);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

```powershell
node --test tests/breakeven-calculator.test.cjs
```

Expected: FAIL because the storage block/functions and standalone action functions do not exist.

- [ ] **Step 3: Implement non-destructive exact-field migration**

Add the exact keys and field allowlist:

```js
// Standalone break-even storage: start
const BREAKEVEN_STORAGE_KEY = "realEstateBreakevenInputs.v1";
const LEGACY_STORAGE_KEY = "realEstateCalcInputs.v1";
const BREAKEVEN_FIELD_IDS = Object.freeze([
  "breakevenPurchasePrice", "breakevenAcquisitionDate", "breakevenSaleDate",
  "breakevenBuyerBrokerRate", "breakevenSellerBrokerRate", "breakevenExpectedSalePrice",
  "breakevenAreaPing", "breakevenOutstandingLoan", "breakevenNegotiationRate",
  "breakevenCostMode", "breakevenQuickPurchaseCosts", "breakevenQuickImprovements",
  "breakevenQuickHoldingCosts", "breakevenQuickSellingCosts",
  "breakevenDeedTax", "breakevenStampTax", "breakevenRegistrationFees",
  "breakevenScrivenerBankFees", "breakevenOtherPurchaseCosts", "breakevenAdvancedImprovements",
  "breakevenMortgageInterest", "breakevenManagementFees", "breakevenHouseTax",
  "breakevenLandTax", "breakevenInsuranceCosts", "breakevenRepairCosts",
  "breakevenOtherHoldingCosts", "breakevenSellingScrivenerFee",
  "breakevenMortgageCancellationFee", "breakevenEscrowFee",
  "breakevenMarketingMovingFee", "breakevenOtherSellingCosts",
  "breakevenLandValueTax", "breakevenLandGain", "breakevenPriorTransactionLoss",
  "breakevenDeductibleLandValueTax", "breakevenLandDataConfirmed",
  "breakevenAcquisitionReceipts", "breakevenTransferExpenseMode",
  "breakevenResidentType", "breakevenTaxMode", "breakevenManualTaxAmount",
  "breakevenManualTaxConfirmed", "breakevenSelfUseRegistered",
  "breakevenSelfUseSixYears", "breakevenSelfUseNoRentalBusiness",
  "breakevenSelfUseNoPriorClaim", "breakevenSpecialRate"
]);

function readStoredObject(storage, key) {
  try {
    const parsed = JSON.parse(storage.getItem(key));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function loadBreakEvenSavedData(storage) {
  const current = readStoredObject(storage, BREAKEVEN_STORAGE_KEY);
  if (current) return current;
  const legacy = readStoredObject(storage, LEGACY_STORAGE_KEY);
  if (!legacy) return null;
  const imported = Object.fromEntries(
    BREAKEVEN_FIELD_IDS
      .filter(id => Object.hasOwn(legacy, id))
      .map(id => [id, legacy[id]])
  );
  if (!Object.keys(imported).length) return null;
  try { storage.setItem(BREAKEVEN_STORAGE_KEY, JSON.stringify(imported)); } catch {}
  return imported;
}
// Standalone break-even storage: end
```

`restoreBreakEvenInputs()` applies checkbox booleans and input/select values after numeric setup. `saveBreakEvenInputs()` serializes only the allowlist and catches storage errors. Clear resets only this form/defaults and overwrites only the standalone key.

- [ ] **Step 4: Wire calculation, wizard, copy, and JPG actions without analytics**

Wire `input`, `change`, and `submit` to interface sync, a 150ms save queue, and a 220ms calculation queue. On the step-3-to-step-4 transition call `calculateBreakEven()` and `setWizardStep(...)` only. Bind copy/JPG buttons to dedicated functions while retaining mobile Web Share → desktop download → long-press fallback.

- [ ] **Step 5: Run and commit**

```powershell
node --test tests/breakeven-calculator.test.cjs
git add -- breakeven.html tests/breakeven-calculator.test.cjs
git commit -m "feat: isolate break-even calculator data"
```

Expected: focused tests PASS.

---

### Task 3: Remove every break-even integration from the public application

**Files:**
- Modify: `index.html`
- Modify: `tests/breakeven-calculator.test.cjs`
- Modify: `tests/brand-consultant-wizard.test.cjs`
- Modify: `tests/brand-ui-refresh.test.cjs`
- Modify: `tests/private-analytics-client.test.cjs`

**Interfaces:**
- Consumes: complete standalone page from Tasks 1–2.
- Produces: public `calculators` with exactly `tax`, `buyer`, `loan`, and `young`; the four existing hashes remain unchanged.

- [ ] **Step 1: Add failing public-isolation tests**

Append to the break-even test:

```js
test("公開首頁完全不含平轉工具或獨立頁入口", () => {
  assert.doesNotMatch(publicHtml, /data-tab="breakeven"|data-panel="breakeven"/);
  assert.doesNotMatch(publicHtml, /breakevenForm|breakevenResult|#breakeven/);
  assert.doesNotMatch(publicHtml, /href=["']breakeven\.html["']/);
  assert.doesNotMatch(publicHtml, /function (?:parseBreakEvenDate|calculateBreakEven|syncBreakEvenInterface)\(/);
  assert.doesNotMatch(publicHtml, /\bbreakeven\s*:\s*\{/);
});
```

Change the public wizard loop to:

```js
for (const name of ["tax", "buyer", "loan", "young"]) {
  test(`${name} exposes one four-step wizard`, () => {
    const section = workspace(name);
    assert.match(section, new RegExp(`data-wizard="${name}"`));
    for (const step of [1, 2, 3, 4]) {
      assert.match(section, new RegExp(`data-wizard-step="${step}"`));
    }
  });
}
```

Add to the analytics client test:

```js
test("unlisted break-even page does not send public analytics", () => {
  const standalone = readPage("breakeven.html");
  assert.doesNotMatch(standalone, /Private anonymous analytics client/);
  assert.doesNotMatch(standalone, /\/api\/analytics\/event|sendPrivateAnalyticsEvent/);
});
```

- [ ] **Step 2: Run affected tests and confirm RED**

```powershell
node --test tests/breakeven-calculator.test.cjs tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs tests/private-analytics-client.test.cjs
```

Expected: FAIL because `index.html` still contains the fifth tab/workspace/model.

- [ ] **Step 3: Remove public break-even code**

Delete from `index.html`:

- `.tab-breakeven`, `.breakeven-*`, and `.breakeven-workspace`-only CSS.
- The `data-tab="breakeven"` button and complete `data-panel="breakeven"` workspace.
- Break-even date defaults and `defaults.breakeven`.
- `syncBreakEvenInterface()`, `setupBreakEvenInterface()`, `collectBreakEvenInput()`, all functions from `parseBreakEvenDate()` through `calculateBreakEven()`.
- `breakeven` entries from calculator/title/summary maps, copy/JPG branches, reset/clear special cases, startup hooks, and tests of the public hash.

Keep generic helpers referenced by a public calculator. Let `calculators[initialTab]` safely ignore old `#breakeven` bookmarks; do not redirect or add a link.

- [ ] **Step 4: Assert the exact public tab set**

In `tests/brand-ui-refresh.test.cjs`, rename the test to `四個計算器分頁...` and add:

```js
const publicTabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(publicTabs, ["tax", "buyer", "loan", "young"]);
```

- [ ] **Step 5: Run and commit**

```powershell
node --test tests/breakeven-calculator.test.cjs tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs tests/private-analytics-client.test.cjs
rg -n "breakeven" index.html
git add -- index.html tests/breakeven-calculator.test.cjs tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs tests/private-analytics-client.test.cjs
git commit -m "refactor: remove break-even tool from public tabs"
```

Expected: tests PASS and `rg` returns no matches.

---

### Task 4: Update guidance and complete local verification

**Files:**
- Modify: `AGENTS.md`
- Verify: `index.html`, `breakeven.html`, and all tests

**Interfaces:**
- Consumes: final page split.
- Produces: accurate repository instructions and release-ready evidence.

- [ ] **Step 1: Update repository guidance**

Change `AGENTS.md` to four public calculators and four hashes. Add:

```markdown
- `breakeven.html`: 不公開導覽的房屋平轉成本獨立工具，正式網址為 `/breakeven.html`；使用獨立 localStorage key `realEstateBreakevenInputs.v1`，不得接入公開分析事件。
```

Require browser checks for “four public calculators plus standalone break-even” on desktop and 375px.

- [ ] **Step 2: Run the complete suite**

```powershell
npm.cmd test
```

Expected: every JavaScript test and all 19 PHP analytics tests PASS.

- [ ] **Step 3: Compile all inline scripts and check whitespace**

```powershell
@'
const fs = require("node:fs");
const vm = require("node:vm");
for (const file of ["index.html", "breakeven.html", "land-increment-total.html", "tainan-land-value-helper.html"]) {
  const html = fs.readFileSync(file, "utf8");
  for (const [index, match] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].entries()) {
    new vm.Script(match[1], { filename: `${file}:script-${index + 1}` });
  }
}
'@ | node
git diff --check
git status --short
```

Expected: no syntax error or diff-check output; only intended files listed.

- [ ] **Step 4: Verify both pages through local HTTP**

Run `npm.cmd start`. With the built-in browser at desktop and 375px verify:

- `index.html`: exactly four tabs; each calculator completes; `#breakeven` reveals no panel; no standalone link.
- `breakeven.html`: four steps; quick/advanced exclusivity; fixed case shows at least 1,084萬 / 1,197萬 / 1,260萬; reload retains data; clear does not change public inputs; copy and JPG complete.
- Both pages: no console errors and no 375px horizontal overflow.

- [ ] **Step 5: Commit instructions**

```powershell
git add -- AGENTS.md
git commit -m "docs: document standalone break-even tool"
```

---

### Task 5: Review, push, deploy, and verify production

**Files:**
- Verify: committed tree
- Deploy with: `DEPLOY.md`

**Interfaces:**
- Consumes: clean tested commits from Tasks 1–4.
- Produces: `origin/main` and an immutable VPS release matching the first 12 characters of `HEAD`.

- [ ] **Step 1: Run final release gates**

```powershell
git status --short
git log -6 --oneline
npm.cmd test
git diff --check
```

Expected: clean worktree and passing tests.

- [ ] **Step 2: Push main**

```powershell
git push origin main
```

Expected: `origin/main` advances to local `HEAD`.

- [ ] **Step 3: Activate an immutable VPS release**

Follow `DEPLOY.md`: compute `git rev-parse --short=12 HEAD`, upload `git archive` into the matching release directory, verify files, record the previous `current`, atomically switch `current`, update `X-Calculator-Release`, run `nginx -t`, then reload Nginx. Do not start `tainanwei.service` or open port 8787.

- [ ] **Step 4: Verify production with cache-busting URLs**

Use:

```text
https://calc.tainanwei.com/?v=<release>
https://calc.tainanwei.com/breakeven.html?v=<release>
```

Verify the release header matches; home has exactly four tabs and no break-even link/string; standalone has robots meta and no analytics endpoint; fixed results match acceptance; desktop/375px are usable; both consoles are clean. Confirm `tainanwei.service` inactive, port 8787 closed, PHP-FPM active, anonymous `/analytics/` still 401, and the four public calculators still work.

- [ ] **Step 5: Roll back on any failed live gate**

If any header, DOM, calculation, console, Nginx, service, or route gate fails, atomically restore the recorded prior `current` and prior release header, run `nginx -t`, reload, and repeat public smoke checks before reporting failure.

---

## Plan Self-Review

- Coverage: standalone URL, unlisted/noindex behavior, four public calculators, formula preservation, storage migration, no analytics, copy/JPG, automated tests, browser verification, push, VPS release, and rollback all map to tasks.
- Scope: one page extraction plus public cleanup; no unrelated calculator or infrastructure refactor.
- Interface consistency: pure calculation names stay unchanged; storage names/keys are defined once in Task 2.
- Placeholder check: `<release>` is the runtime value from `git rev-parse --short=12 HEAD`, not an unresolved requirement. Every implementation decision is specified.
