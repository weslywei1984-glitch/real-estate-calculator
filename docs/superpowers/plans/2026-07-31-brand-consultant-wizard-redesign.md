# Brand Consultant Wizard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the main calculator as the approved B “brand consultant” visual system and add a four-step mobile wizard to all four calculators without changing formulas, policy values, persistence, LIFF, or deployment behavior.

**Architecture:** Keep `index.html` as the single-file application. Add explicit wizard metadata to the four existing workspaces, a small controller that only changes presentation state, and a final CSS override layer named `Consultant B wizard theme`; existing calculator functions remain the source of truth. Static Node tests protect markup, controller contracts, policy text, and visual tokens before browser verification.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Node.js 20+, `node:test`, existing Node server, GitHub Pages.

## Global Constraints

- Modify the main `index.html` only; do not redesign `tainan-land-value-helper.html` or `land-increment-total.html`.
- Keep all tax rates, exemptions, policy numbers, formulas, government sources, the buyer service fee fixed at 2%, LIFF behavior, URL hashes, and `realEstateCalcInputs.v1`.
- Keep all CSS and JavaScript in `index.html`; do not add frameworks, CSS libraries, CDNs, or a backend.
- Keep `assets/xiaowei-profile.png` unchanged and visible as a smaller brand identifier.
- Use the approved palette: `#f3ead7`, `#fffaf0`, `#102738`, `#0b1f2c`, `#b9502d`, `#943e26`, `#657244`, `#24231f`, `#6d695f`, `#d7cdbb`.
- Mobile wizard activates only at `max-width: 620px`; tablet and desktop continue to show the complete form.
- Validate at `375×812`, `390×844`, and `1280×800`; all interactive controls need a minimum 44px touch target.
- Preserve Traditional Chinese brand text and contact data: 魏泉承, 台南小魏 買厝作伙, 永慶不動產-小東南紡店, 0927-617-207.

---

### Task 1: Lock the B Theme and Wizard Contract With Failing Tests

**Files:**
- Create: `tests/brand-consultant-wizard.test.cjs`
- Read: `index.html:2481-3700`
- Read: `index.html:4897-5450`

**Interfaces:**
- Consumes: Existing `index.html` markup and the `node:test` test runner.
- Produces: Regression contracts for the `Consultant B wizard theme` marker, four `data-wizard` roots, four steps per calculator, mobile navigation, and controller function names.

- [ ] **Step 1: Write the failing static-contract tests**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function workspace(name) {
  const start = html.indexOf(`data-panel="${name}"`);
  const next = html.indexOf('<section class="workspace', start + 1);
  const sources = html.indexOf('<section class="sources"', start + 1);
  const end = next > -1 ? next : sources;
  assert.ok(start > -1 && end > start, `missing ${name} workspace`);
  return html.slice(start, end);
}

test("Consultant B theme is the final visual layer", () => {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  assert.ok(marker > html.lastIndexOf("/* Compact tool layout redesign */"));
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /--consultant-cream:\s*#f3ead7/);
  assert.match(css, /--consultant-navy:\s*#102738/);
  assert.match(css, /--consultant-terracotta:\s*#b9502d/);
});

for (const name of ["tax", "buyer", "loan", "young"]) {
  test(`${name} exposes one four-step wizard`, () => {
    const section = workspace(name);
    assert.match(section, new RegExp(`data-wizard="${name}"`));
    for (const step of [1, 2, 3, 4]) {
      assert.match(section, new RegExp(`data-wizard-step="${step}"`));
    }
    assert.match(section, /class="wizard-mobile-head"/);
    assert.match(section, /data-wizard-back/);
    assert.match(section, /data-wizard-next/);
  });
}

test("wizard controller keeps presentation state separate from calculator data", () => {
  assert.match(html, /const WIZARD_MOBILE_QUERY = window\.matchMedia\("\(max-width: 620px\)"\)/);
  assert.match(html, /function setWizardStep\(workspace, nextIndex/);
  assert.match(html, /function resetWizard\(workspace/);
  assert.match(html, /function setupMobileWizards\(\)/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^)]*wizard/i);
});

test("mobile mode hides inactive steps and keeps controls touch sized", () => {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(css, /\[data-wizard-step\]:not\(\.is-wizard-active\)\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.wizard-mobile-actions button\s*\{[^}]*min-height:\s*44px/s);
});
```

- [ ] **Step 2: Run the new test and verify it fails for the missing B layer**

Run: `node --test tests/brand-consultant-wizard.test.cjs`

Expected: FAIL with missing `Consultant B wizard theme` and `data-wizard` assertions.

- [ ] **Step 3: Commit the failing regression contract**

```powershell
git add -- tests/brand-consultant-wizard.test.cjs
git commit -m "test: define consultant wizard redesign contract"
```

---

### Task 2: Add Four-Step Markup Without Changing Field IDs

**Files:**
- Modify: `index.html:4932-5450`
- Test: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-ui-refresh.test.cjs`
- Test: `tests/young-housing-loan-3-markup.test.cjs`

**Interfaces:**
- Consumes: Existing forms, input IDs, result IDs, `data-clear`, `data-copy`, and `data-jpg` listeners.
- Produces: Workspace roots with `data-wizard="<group>"`, steps addressed by `[data-wizard-step="1"..."4"]`, and shared mobile controls.

- [ ] **Step 1: Add the reusable wizard header and navigation to each workspace**

Add this structure immediately inside each `.workspace`, changing the group-specific values:

```html
<section class="workspace" data-panel="tax" data-wizard="tax" data-wizard-current="0">
  <div class="wizard-mobile-head" aria-live="polite">
    <div>
      <span class="wizard-mobile-count">01 / 04</span>
      <h2 class="wizard-mobile-title" tabindex="-1">成交資料</h2>
    </div>
    <div class="wizard-mobile-progress" aria-hidden="true">
      <span></span>
    </div>
  </div>
  <!-- existing form and result -->
  <div class="wizard-mobile-actions">
    <button type="button" class="secondary" data-wizard-back>上一步</button>
    <button type="button" class="primary" data-wizard-next>下一步</button>
  </div>
</section>
```

Use these step title arrays as `data-wizard-titles` JSON on each root:

```html
data-wizard-titles='["成交資料","可扣除項目","適用條件","試算結果"]'
data-wizard-titles='["購屋條件","稅費基礎","其他費用","準備金結果"]'
data-wizard-titles='["貸款目標","貸款條件","還款設定","月付結果"]'
data-wizard-titles='["資格快篩","購屋與貸款","負擔評估","青安結果"]'
```

- [ ] **Step 2: Group the tax form into three input steps and one result step**

Keep every existing input ID. Wrap or split the current content so:

```html
<div class="section wizard-step" data-wizard-step="1">
  <!-- salePrice, buyCost, holdingYears -->
</div>
<div class="section wizard-step" data-wizard-step="2">
  <!-- sellExpense, landGain, lookup links -->
</div>
<div class="section wizard-step" data-wizard-step="3">
  <!-- residentType, all existing self-use checks, desktop actions -->
</div>
<aside class="panel wizard-step" data-wizard-step="4">
  <!-- existing taxResult plus mobile copy/save/clear actions -->
</aside>
```

The result card gets mobile-only duplicate controls that reuse existing delegated listeners:

```html
<div class="wizard-result-actions">
  <button class="secondary" type="button" data-copy="tax">複製結果</button>
  <button class="secondary" type="button" data-jpg="tax">存成圖片</button>
  <button class="primary" type="button" data-clear="tax">重新試算</button>
</div>
```

- [ ] **Step 3: Group the buyer form into four steps**

Use the exact grouping:

```text
Step 1: purchasePrice, loanRatio, buyerDownPayment
Step 2: mortgageSettingRatio, buildingValue, landDeclaredValue, lookup link
Step 3: scrivenerTransfer, scrivenerLoan, signingFee, bankFee,
        insuranceFee, settlementFee, transcriptCount, certificateCount,
        buyerReplacementReminder, buyerOldPropertyTax, desktop actions
Step 4: buyerResult and mobile copy/save/clear actions
```

- [ ] **Step 4: Group the loan form into four steps**

Use the exact grouping:

```text
Step 1: loanPurchasePrice, loanLtvRatio, loanAmount, loanDownPayment
Step 2: annualRate, loanYears, graceYears
Step 3: loanMode, extraPayment, loanSalary, loanSalarySlider,
        loanAffordCard, desktop actions
Step 4: loanResult and mobile copy/save/clear actions
```

- [ ] **Step 5: Reuse the existing young sections as steps one to three**

Add `wizard-step` to the existing `.young-step` elements and retain their current `data-step` attributes:

```html
<div class="section young-step wizard-step" data-step="1" data-wizard-step="1">
...
<div class="section young-step wizard-step" data-step="2" data-wizard-step="2">
...
<div class="section young-step wizard-step" data-step="3" data-wizard-step="3">
...
<aside class="panel young-result-panel wizard-step" data-wizard-step="4">
```

Do not change the policy module, field IDs, eligibility labels, dates, or government links.

- [ ] **Step 6: Run markup and policy tests**

Run: `npm test`

Expected: Existing tests PASS; the new test still FAILS only for missing controller and CSS assertions.

- [ ] **Step 7: Commit the markup**

```powershell
git add -- index.html
git commit -m "feat: structure calculators as mobile wizard steps"
```

---

### Task 3: Implement the Presentation-Only Wizard Controller

**Files:**
- Modify: `index.html:6532-6580`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: `[data-wizard]`, `[data-wizard-step]`, `.wizard-mobile-count`, `.wizard-mobile-title`, `.wizard-mobile-progress span`, `[data-wizard-back]`, and `[data-wizard-next]`.
- Produces:
  - `setWizardStep(workspace: HTMLElement, nextIndex: number, options?: {focus?: boolean}): void`
  - `resetWizard(workspace: HTMLElement, options?: {focus?: boolean}): void`
  - `setupMobileWizards(): void`

- [ ] **Step 1: Add controller-specific tests**

Append:

```js
test("wizard clamps steps, updates progress, and validates before next", () => {
  assert.match(html, /Math\.max\(0,\s*Math\.min\(steps\.length - 1,\s*nextIndex\)\)/);
  assert.match(html, /progress\.style\.width = `\$\{\(\(index \+ 1\) \/ steps\.length\) \* 100\}%`/);
  assert.match(html, /function validateWizardStep\(workspace\)/);
  assert.match(html, /field\.setCustomValidity\(/);
  assert.match(html, /field\.getAttribute\("min"\)/);
  assert.match(html, /field\.getAttribute\("max"\)/);
  assert.match(html, /field\.checkValidity\(\)/);
  assert.match(html, /field\.reportValidity\(\)/);
});

test("tab switch and clear return the mobile wizard to step one", () => {
  assert.match(html, /resetWizard\(panel,\s*\{\s*focus:\s*false\s*\}\)/);
  assert.match(html, /resetWizard\(button\.closest\("\[data-wizard\]"\)/);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test tests/brand-consultant-wizard.test.cjs`

Expected: FAIL for missing controller behavior.

- [ ] **Step 3: Implement the controller before `setupNumericInputs()` initialization**

```js
const WIZARD_MOBILE_QUERY = window.matchMedia("(max-width: 620px)");

function wizardSteps(workspace) {
  return [...workspace.querySelectorAll("[data-wizard-step]")];
}

function setWizardStep(workspace, nextIndex, options = {}) {
  if (!workspace) return;
  const steps = wizardSteps(workspace);
  if (!steps.length) return;
  const index = Math.max(0, Math.min(steps.length - 1, nextIndex));
  workspace.dataset.wizardCurrent = String(index);
  steps.forEach((step, stepIndex) => {
    const active = stepIndex === index;
    step.classList.toggle("is-wizard-active", active);
    step.setAttribute("aria-hidden", WIZARD_MOBILE_QUERY.matches ? String(!active) : "false");
  });
  const titles = JSON.parse(workspace.dataset.wizardTitles || "[]");
  const count = workspace.querySelector(".wizard-mobile-count");
  const title = workspace.querySelector(".wizard-mobile-title");
  const progress = workspace.querySelector(".wizard-mobile-progress span");
  const back = workspace.querySelector("[data-wizard-back]");
  const next = workspace.querySelector("[data-wizard-next]");
  if (count) count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
  if (title) title.textContent = titles[index] || `步驟 ${index + 1}`;
  if (progress) progress.style.width = `${((index + 1) / steps.length) * 100}%`;
  if (back) {
    back.disabled = index === 0;
    back.textContent = index === steps.length - 1 ? "重新調整" : "上一步";
  }
  if (next) {
    next.hidden = index === steps.length - 1;
    next.textContent = index === steps.length - 2 ? "查看結果" : "下一步";
  }
  if (options.focus && WIZARD_MOBILE_QUERY.matches) title?.focus({ preventScroll: true });
}

function resetWizard(workspace, options = {}) {
  setWizardStep(workspace, 0, options);
}

function validateWizardStep(workspace) {
  const index = Number(workspace.dataset.wizardCurrent || 0);
  const step = wizardSteps(workspace)[index];
  const fields = [...step.querySelectorAll("input:not([type=hidden]), select")];
  for (const field of fields) {
    field.setCustomValidity("");
    if (field.dataset.numericInput === "true") {
      const value = parseNumericValue(field.value);
      const minAttr = field.getAttribute("min");
      const maxAttr = field.getAttribute("max");
      const min = minAttr === null ? null : Number(minAttr);
      const max = maxAttr === null ? null : Number(maxAttr);
      if ((min !== null && value < min) || (max !== null && value > max)) {
        const range = min !== null && max !== null
          ? `${number.format(min)}～${number.format(max)}`
          : min !== null
            ? `至少 ${number.format(min)}`
            : `最多 ${number.format(max)}`;
        field.setCustomValidity(`請輸入${range}`);
      }
    }
    if (field.checkValidity()) continue;
    field.reportValidity();
    field.focus();
    return false;
  }
  return true;
}

function setupMobileWizards() {
  document.querySelectorAll("[data-wizard]").forEach(workspace => {
    workspace.querySelector("[data-wizard-back]")?.addEventListener("click", () => {
      const index = Number(workspace.dataset.wizardCurrent || 0);
      setWizardStep(workspace, Math.max(0, index - 1), { focus: true });
    });
    workspace.querySelector("[data-wizard-next]")?.addEventListener("click", () => {
      if (!validateWizardStep(workspace)) return;
      const index = Number(workspace.dataset.wizardCurrent || 0);
      setWizardStep(workspace, index + 1, { focus: true });
    });
    resetWizard(workspace, { focus: false });
  });
  WIZARD_MOBILE_QUERY.addEventListener("change", () => {
    document.querySelectorAll("[data-wizard]").forEach(workspace => {
      setWizardStep(workspace, Number(workspace.dataset.wizardCurrent || 0), { focus: false });
    });
  });
}
```

- [ ] **Step 4: Wire setup, tab switching, and clearing**

Call `setupMobileWizards()` after chip/numeric setup. In `activateTab`, after panels are toggled, add:

```js
const panel = document.querySelector(`[data-panel="${name}"]`);
resetWizard(panel, { focus: false });
```

Extend the clear handler without changing `clearGroup()`:

```js
document.querySelectorAll("[data-clear]").forEach(button => {
  button.addEventListener("click", () => {
    clearGroup(button.dataset.clear);
    resetWizard(button.closest("[data-wizard]"), { focus: false });
  });
});
```

Remove the previous one-line clear listener so a click runs `clearGroup()` exactly once.

- [ ] **Step 5: Run the focused and full test suites**

Run: `node --test tests/brand-consultant-wizard.test.cjs`

Expected: Controller assertions PASS; CSS assertions remain FAIL until Task 4.

Run: `npm test`

Expected: No existing calculator or policy test regresses.

- [ ] **Step 6: Commit the controller**

```powershell
git add -- index.html tests/brand-consultant-wizard.test.cjs
git commit -m "feat: add mobile wizard navigation"
```

---

### Task 4: Add the Final Consultant B Visual Layer

**Files:**
- Modify: `index.html:3700-4890` immediately before `</style>`
- Test: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: Existing brand classes and the wizard classes added in Tasks 2–3.
- Produces: Final CSS variables, compact hero, desktop two-column layout, mobile single-step presentation, accessible focus, and reduced motion behavior.

- [ ] **Step 1: Run the focused visual-contract tests and confirm failure**

Run: `node --test tests/brand-consultant-wizard.test.cjs`

Expected: FAIL for the absent `Consultant B wizard theme` marker and CSS rules.

- [ ] **Step 2: Add the B palette and shared component layer as the last CSS block**

```css
/* Consultant B wizard theme */
:root {
  --consultant-cream: #f3ead7;
  --consultant-paper: #fffaf0;
  --consultant-navy: #102738;
  --consultant-navy-strong: #0b1f2c;
  --consultant-terracotta: #b9502d;
  --consultant-terracotta-dark: #943e26;
  --consultant-olive: #657244;
  --consultant-ink: #24231f;
  --consultant-muted: #6d695f;
  --consultant-line: #d7cdbb;
}

body {
  background: var(--consultant-cream);
  color: var(--consultant-ink);
}

.shell { max-width: 1220px; }
.panel {
  background: var(--consultant-paper);
  border: 1px solid var(--consultant-line);
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(36, 35, 31, .07);
}
.control { border-radius: 9px; }
.primary,
.young-primary {
  background: var(--consultant-terracotta);
  color: #fff;
}
.secondary {
  background: var(--consultant-paper);
  border-color: var(--consultant-navy);
  color: var(--consultant-navy);
}
.wizard-mobile-head,
.wizard-mobile-actions,
.wizard-result-actions { display: none; }
```

- [ ] **Step 3: Make the hero compact while preserving the portrait**

Use final overrides with these measurable constraints:

```css
.brand-hero {
  min-height: 184px;
  max-height: none;
  background: var(--consultant-navy);
  border-radius: 14px;
}
.brand-hero__profile {
  object-fit: contain;
  object-position: center bottom;
}
.brand-hero__cta {
  background: var(--consultant-terracotta);
  min-height: 44px;
}
.brand-hero h1,
.panel-head h2,
.young-hero h2 {
  font-family: "Noto Serif TC", PMingLiU, serif;
}
```

- [ ] **Step 4: Add desktop and tablet layout rules**

```css
@media (min-width: 901px) {
  .workspace {
    grid-template-columns: minmax(0, 1.38fr) minmax(360px, 1fr);
    gap: 16px;
  }
  .workspace > aside.panel {
    position: sticky;
    top: 16px;
    align-self: start;
  }
}

@media (max-width: 900px) {
  .workspace { grid-template-columns: minmax(0, 1fr); }
  .workspace > aside.panel { position: static; }
}
```

- [ ] **Step 5: Add the mobile wizard presentation**

```css
@media (max-width: 620px) {
  .brand-hero {
    min-height: 150px;
    padding: 14px 16px;
  }
  .brand-hero__profile {
    max-height: 116px;
    width: auto;
  }
  .wizard-mobile-head {
    display: grid;
    gap: 10px;
    grid-column: 1 / -1;
    background: var(--consultant-paper);
    border: 1px solid var(--consultant-line);
    border-radius: 12px;
    padding: 14px;
  }
  .wizard-mobile-count {
    color: var(--consultant-terracotta);
    font-size: .72rem;
    font-weight: 800;
    letter-spacing: .12em;
  }
  .wizard-mobile-title {
    margin: 3px 0 0;
    color: var(--consultant-navy);
    font: 800 1.35rem/1.2 "Noto Serif TC", PMingLiU, serif;
  }
  .wizard-mobile-progress {
    height: 5px;
    overflow: hidden;
    background: #dfd5c3;
    border-radius: 999px;
  }
  .wizard-mobile-progress span {
    display: block;
    width: 25%;
    height: 100%;
    background: var(--consultant-terracotta);
    transition: width 180ms ease;
  }
  [data-wizard-step]:not(.is-wizard-active) { display: none !important; }
  [data-wizard-step].is-wizard-active { display: block; }
  .wizard-mobile-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
    gap: 10px;
    grid-column: 1 / -1;
  }
  .wizard-mobile-actions button { min-height: 44px; }
  .wizard-mobile-actions button[hidden] { display: none; }
  .wizard-mobile-actions button:disabled { opacity: .45; }
  .actions { display: none; }
  .wizard-result-actions {
    display: grid;
    gap: 8px;
    margin-top: 14px;
  }
  .wizard-result-actions button { min-height: 44px; }
}
```

- [ ] **Step 6: Add focus and reduced-motion safeguards**

```css
:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--consultant-terracotta) 70%, white);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .wizard-mobile-progress span,
  .tab,
  button { transition: none !important; }
}
```

- [ ] **Step 7: Run all tests**

Run: `npm test`

Expected: All tests PASS, including `brand-consultant-wizard.test.cjs`.

- [ ] **Step 8: Commit the B visual system**

```powershell
git add -- index.html
git commit -m "style: apply consultant B calculator theme"
```

---

### Task 5: Verify All Calculators and Responsive Browser States

**Files:**
- Modify if a defect is found: `index.html`
- Modify if a contract needs correction: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: Completed B theme, wizard controller, existing calculators, and local server.
- Produces: Evidence that all four hashes work at desktop and phone dimensions with no console errors or overflow.

- [ ] **Step 1: Run the complete automated suite from a clean worktree**

Run: `npm test`

Expected: All tests PASS with zero failures.

- [ ] **Step 2: Start the local site**

Run: `npm start`

Expected: Server reports the local HTTP URL and remains running.

- [ ] **Step 3: Verify desktop at `1280×800`**

Open:

```text
http://127.0.0.1:8787/?v=consultant-b#tax
http://127.0.0.1:8787/?v=consultant-b#buyer
http://127.0.0.1:8787/?v=consultant-b#loan
http://127.0.0.1:8787/?v=consultant-b#young
```

For each hash verify:

```text
- compact hero and complete portrait are visible
- wizard header and wizard navigation are hidden
- form and result are visible together
- calculator produces a non-empty result
- no horizontal overflow
- console has no errors
```

- [ ] **Step 4: Verify `375×812` and `390×844`**

For each hash:

```text
- only one data-wizard-step is visible
- progress starts at 01 / 04
- next/back move through exactly four steps
- invalid numeric values do not advance
- valid values reach the result step
- copy, image, and重新試算 controls are visible on step four
- switching tabs returns the selected calculator to step one
- floating phone/LINE bar does not overlap wizard actions
- documentElement.scrollWidth <= documentElement.clientWidth
```

- [ ] **Step 5: Verify persistence and output actions**

Use the loan and young calculators:

```text
1. Change at least two inputs.
2. Move to step four.
3. Reload the same URL.
4. Confirm inputs restore from realEstateCalcInputs.v1.
5. Confirm step restarts at 01 / 04.
6. Test copy result.
7. Test save/share image.
```

- [ ] **Step 6: Fix any defect with a failing regression first**

Add one narrowly scoped `node:test` assertion reproducing the defect, run it to see FAIL, patch `index.html`, then run the focused test and `npm test` to see PASS.

- [ ] **Step 7: Commit verified fixes**

```powershell
git add -- index.html tests/brand-consultant-wizard.test.cjs
git commit -m "fix: polish consultant wizard responsive behavior"
```

If no defect required a code change, skip this commit.

---

### Task 6: Publish and Verify GitHub Pages

**Files:**
- Read: `DEPLOY.md`
- Read: `.github/workflows/*` if present
- No source changes unless deployment verification finds a reproducible defect.

**Interfaces:**
- Consumes: A clean, fully tested `main` branch containing the redesign commits.
- Produces: A deployed GitHub Pages version verified at the real public URL with a cache-busting query.

- [ ] **Step 1: Confirm the exact release scope**

Run:

```powershell
git status --short
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```

Expected: Clean worktree; only the design document, plan, tests, and B redesign commits are ahead.

- [ ] **Step 2: Re-run release tests**

Run: `npm test`

Expected: All tests PASS.

- [ ] **Step 3: Push `main`**

Run: `git push origin main`

Expected: Push succeeds and GitHub Pages build starts.

- [ ] **Step 4: Wait for the Pages deployment to finish**

Use GitHub Actions/Pages status and wait until the deployment is `success`/`built`, not merely queued or in progress.

- [ ] **Step 5: Verify the public cache-busted URLs**

Generate the exact URLs from the deployed commit:

```powershell
$releaseSha = git rev-parse --short HEAD
$baseUrl = "https://weslywei1984-glitch.github.io/real-estate-calculator/?v=$releaseSha"
@("$baseUrl#tax", "$baseUrl#buyer", "$baseUrl#loan", "$baseUrl#young")
```

Open each URL printed by the command.

At `390×844` and desktop width verify:

```text
- B palette and compact hero are live
- all four hashes select the expected calculator
- phone wizard reaches step four
- calculations produce results
- portrait and contact bar render correctly
- console has no errors
```

- [ ] **Step 6: Report the deployed commit and URL**

Provide the exact deployed commit SHA and one canonical cache-busted URL. Do not claim completion until the real public page shows the new B design.
