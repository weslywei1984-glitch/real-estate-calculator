# Desktop Mobile-Design Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved mobile Consultant B artwork, palette, card system, source list, contact actions, and four-step calculator flow the single responsive experience on phones, tablets, and desktop.

**Architecture:** Keep the existing single-file application and calculator APIs intact. Promote the final Consultant B CSS layer and wizard state machine from a phone-only enhancement to the default presentation, retaining media queries only for real size adaptations. Protect each production change with a focused failing test, then verify complete flows in a real browser before publishing the exact tested commit.

**Tech Stack:** Static HTML/CSS/JavaScript in `index.html`, Node.js built-in test runner, GitHub Pages, Codex in-app browser.

## Global Constraints

- Modify only `index.html` and the focused regression tests; do not restructure the single-file application.
- Do not change tax rates, exemptions, policy numbers, loan formulas, input defaults, validation ranges, source destinations, or the fixed buyer brokerage fee of 2%.
- Keep `assets/mobile-hero-exact.jpg` byte-for-byte unchanged at `1787 × 880` with SHA-256 `8C01A4C8464E2B033D0B98C8655A6B493A53D46C0C11D6817ABA71C40B4AA827`.
- Do not load LINE LIFF SDK or `assets/liff-gate.js`; public calculator access remains unblocked.
- Preserve input IDs, localStorage key `realEstateCalcInputs.v1`, calculator hashes, copy/save-image actions, sources, disclaimers, and brand contact data.
- Add no framework, CSS library, CDN, external font, backend, account system, or analytics.
- Every behavior change follows RED → GREEN → refactor; do not modify production code before observing the focused test fail for the intended reason.

## File Map

- `index.html`: final Consultant B design tokens, responsive layout, hero, wizard markup/controller, contact actions, sources, and all calculators.
- `tests/brand-consultant-wizard.test.cjs`: cross-viewport wizard, exact hero, sources, contact placement, and controller contracts.
- `tests/brand-ui-refresh.test.cjs`: broad brand and responsive contracts; change only expectations superseded by the approved unified desktop design.
- `tests/public-browser-access.test.cjs`: LIFF/access protection; run unchanged.
- `docs/superpowers/specs/2026-08-01-desktop-mobile-design-migration.md`: approved behavior and visual source of truth; do not edit during implementation.

---

### Task 1: Promote the Mobile Visual System to Every Viewport

**Files:**
- Modify: `tests/brand-consultant-wizard.test.cjs:20-166`
- Modify: `tests/brand-ui-refresh.test.cjs:151-164, 331-372`
- Modify: `index.html:4892-5445`
- Modify: `index.html:6059-6109`
- Test: `tests/brand-consultant-wizard.test.cjs`
- Test: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: final CSS beginning at `/* Consultant B wizard theme */`; approved `assets/mobile-hero-exact.jpg`; existing `.brand-hero__mobile-art`, `.wizard-mobile-head`, `.wizard-mobile-actions`, `.float-contact`, and `.sources-list` markup.
- Produces: global Consultant B tokens and components, all-width exact hero, single-flow workspace, structured sources, normal-flow desktop contact actions, and unchanged phone full-bleed/fixed-contact overrides.

- [ ] **Step 1: Write failing shared-theme and shared-wizard-visibility CSS contracts**

Replace the old phone-scope and desktop-full-form tests in `tests/brand-consultant-wizard.test.cjs` with:

```js
test("Consultant B theme is shared by every viewport", () => {
  const css = consultantCss();
  const firstResponsiveOverride = css.indexOf("@media (max-width: 900px)");
  assert.ok(firstResponsiveOverride > -1, "missing responsive override");
  const shared = css.slice(0, firstResponsiveOverride);

  assert.match(shared, /:root\s*\{[^}]*--consultant-cream:\s*#f3ead7/s);
  assert.match(shared, /body\s*\{[^}]*background:/s);
  assert.match(shared, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(shared, /\.wizard-mobile-head\s*\{[^}]*display:\s*grid/s);
  assert.match(shared, /\[data-wizard-step\]:not\(\.is-wizard-active\)\s*\{[^}]*display:\s*none/s);
  assert.match(shared, /\[data-wizard\]\[data-wizard-current="3"\]\s*>\s*form\s*\{[^}]*display:\s*none/s);
  assert.match(shared, /\.wizard-mobile-actions\s*\{[^}]*display:\s*grid/s);
  assert.match(shared, /\.wizard-result-actions\s*\{[^}]*display:\s*grid/s);
});
```

- [ ] **Step 2: Write failing exact-art, sources, and contact-placement contracts**

Keep the existing image digest test and add:

```js
test("approved hero artwork is the only visible hero at every width", () => {
  const css = consultantCss();
  const shared = css.slice(0, css.indexOf("@media (max-width: 900px)"));

  assert.match(shared, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block[^}]*width:\s*100%[^}]*height:\s*auto/s);
  assert.match(shared, /\.brand-hero__content,\s*\.brand-hero__identity,\s*\.brand-hero__portrait\s*\{[^}]*display:\s*none/s);
  assert.match(shared, /\.brand-hero\s*\{[^}]*width:\s*100%[^}]*min-height:\s*0[^}]*background:\s*transparent/s);
});

test("source references are structured lists at every width", () => {
  const css = consultantCss();
  const shared = css.slice(0, css.indexOf("@media (max-width: 900px)"));

  assert.equal((html.match(/<li class="source-item">/g) || []).length, 5);
  assert.match(shared, /\.sources-list\s*\{[^}]*display:\s*grid/s);
  assert.match(shared, /\.source-item\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/s);
  assert.doesNotMatch(shared, /\.source-item:not\(:last-child\)::after\s*\{[^}]*content:\s*"；"/s);
});

test("desktop contact actions sit before sources inside the main flow", () => {
  const contact = html.indexOf('<div class="float-contact"');
  const sources = html.indexOf('<section class="sources"');
  const mainEnd = html.indexOf("</main>");

  assert.ok(contact > -1 && contact < sources && sources < mainEnd);
});
```

- [ ] **Step 3: Update only superseded broad desktop visual expectations**

In `tests/brand-ui-refresh.test.cjs`, replace assertions requiring the constructed three-column desktop hero, 210px portrait, and `1.38fr / 1fr` workspace with:

```js
assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block/s);
assert.match(css, /\.brand-hero\s*\{[^}]*width:\s*100%[^}]*min-height:\s*0/s);
assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
assert.match(css, /@media \(min-width:\s*901px\)\s*\{[\s\S]*\.form-grid/);
```

Do not weaken telephone, LINE destination, disclosure, focus, reduced-motion, public-access, policy, formula, or exact brand wording tests.

- [ ] **Step 4: Run focused tests and verify RED for current desktop presentation**

```powershell
node --test tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs
```

Expected: failures name missing shared Consultant tokens, hidden desktop wizard components, desktop hero artwork still hidden, inline sources, old workspace columns, and contact markup after `</main>`. Formula and public-access assertions must not fail.

- [ ] **Step 5: Move Consultant B variables and shared component rules outside phone media**

At the final theme marker, replace the hidden defaults and outer `@media (max-width: 620px)` wrapper with:

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
  --consultant-shadow: 0 10px 28px rgba(36, 35, 31, .075);
}

body {
  background:
    radial-gradient(circle at 12% 0%, rgba(185, 80, 45, .08), transparent 26rem),
    linear-gradient(180deg, #f7f0e1 0, var(--consultant-cream) 32rem);
  color: var(--consultant-ink);
}

.shell {
  width: min(1040px, calc(100% - 40px));
  padding-top: 18px;
}
```

Delete the unmatched outer closing brace that formerly ended the phone-only Consultant B wrapper. Leave separate `max-width: 900px` and `max-width: 620px` blocks for size differences.

- [ ] **Step 6: Make the exact artwork global and establish the centered single-flow workspace**

Add this shared final-layer CSS before responsive overrides:

```css
.brand-hero {
  display: block;
  width: 100%;
  height: auto;
  min-height: 0;
  max-height: none;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(16, 39, 56, .12);
  border-radius: 14px;
  background: transparent;
  box-shadow: var(--consultant-shadow);
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

.workspace {
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.workspace > aside.panel,
.result-panel,
.young-result-panel {
  position: static;
}
```

Move the existing wizard header, progress, inactive-step, wizard action, result-action, panel, input, tab, result, and palette rules into this shared layer unchanged except for selector order needed to win the cascade.

- [ ] **Step 7: Add explicit tablet and desktop adaptations**

Use:

```css
@media (min-width: 901px) {
  .form-grid,
  .young-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field.wide,
  .lookup-links,
  .checks,
  .section.wide {
    grid-column: 1 / -1;
  }

  .result-grid,
  .result-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 621px) and (max-width: 900px) {
  .shell {
    width: min(760px, calc(100% - 32px));
  }

  .form-grid,
  .young-fields,
  .result-grid,
  .result-stack {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Inside `max-width: 620px`, retain the existing full-bleed hero `width: calc(100% + 20px)`, `margin-left: -10px`, single-column fields, fixed contact bar, and 92px shell bottom padding.

- [ ] **Step 8: Promote sources, move contact markup, and style desktop contact actions**

Move the unchanged `<div class="float-contact" ...>` block from after `</main>` to immediately before `<section class="sources">`. Add:

```css
.sources,
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
  color: var(--consultant-terracotta);
  font-weight: 900;
}

.source-item__body {
  overflow-wrap: anywhere;
}

.float-contact {
  position: static;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 4px 0 14px;
}

.float-contact__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 48px;
  border-radius: 10px;
  background: var(--consultant-terracotta);
  color: #fff;
  font-weight: 850;
  text-decoration: none;
}

@media (min-width: 901px) {
  .sources-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

Remove the shared inline/semicolon source rules. Keep the current phone `position: fixed`, `right`, `bottom`, and `left` values in `max-width: 620px`.

- [ ] **Step 9: Run focused tests to GREEN, then the full suite**

```powershell
node --test tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs
npm.cmd test
```

Expected: both focused files and the complete suite report zero failures. If a broad test still encodes the intentionally removed desktop hero/workspace, update that exact expectation and rerun its file; do not weaken unrelated contracts.

- [ ] **Step 10: Commit the independently passing visual migration**

```powershell
git add index.html tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs
git commit -m "feat: share mobile design across desktop"
```

---

### Task 2: Enable the Four-Step Controller at Every Viewport

**Files:**
- Modify: `tests/brand-consultant-wizard.test.cjs:54-76, 119-159`
- Modify: `index.html:7188-7307`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: `wizardSteps(workspace)`, `validateWizardStep(workspace)`, `setWizardStep(workspace, nextIndex, options)`, and Task 1 shared step-visibility CSS.
- Produces: `setupWizards(): void`; viewport-independent `aria-hidden`, focus, progress, validation, and navigation state.

- [ ] **Step 1: Write the failing viewport-independent controller test**

Replace the old mobile-controller assertions with:

```js
test("wizard controller applies presentation state at every viewport", () => {
  assert.doesNotMatch(html, /WIZARD_MOBILE_QUERY/);
  assert.match(html, /function setupWizards\(\)/);
  assert.match(html, /step\.setAttribute\("aria-hidden",\s*String\(!active\)\)/);
  assert.match(html, /if \(options\.focus\)\s*\{/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^)]*wizard/i);
});
```

Keep existing tests for step clamping, progress width, validation, tab reset, clear reset, scroll-to-header, and reduced motion.

- [ ] **Step 2: Run the focused test and verify RED**

```powershell
node --test tests/brand-consultant-wizard.test.cjs
```

Expected: the new controller test fails because `WIZARD_MOBILE_QUERY` and `setupMobileWizards()` still exist and ARIA/focus remain gated; Task 1 visual tests continue to pass.

- [ ] **Step 3: Remove the media-query gate from wizard state**

Delete:

```js
const WIZARD_MOBILE_QUERY = window.matchMedia("(max-width: 620px)");
```

In `setWizardStep`, use:

```js
step.setAttribute("aria-hidden", String(!active));
```

Replace the focus condition with:

```js
if (options.focus) {
  title?.focus({ preventScroll: true });
  const wizardHead = workspace.querySelector(".wizard-mobile-head");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  wizardHead?.scrollIntoView({
    block: "start",
    behavior: reduceMotion ? "auto" : "smooth"
  });
}
```

- [ ] **Step 4: Rename setup and remove the obsolete breakpoint listener**

Replace `setupMobileWizards()` and its resize listener with:

```js
function setupWizards() {
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
}
```

Replace the initializer with:

```js
setupWizards();
```

- [ ] **Step 5: Run focused and full tests to GREEN**

```powershell
node --test tests/brand-consultant-wizard.test.cjs
npm.cmd test
```

Expected: zero failures; all four workspaces retain four steps and localStorage contains no wizard state.

- [ ] **Step 6: Commit the independently passing controller migration**

```powershell
git add index.html tests/brand-consultant-wizard.test.cjs
git commit -m "feat: enable wizard flow on desktop"
```

---

### Task 3: Verify Responsive Layout and All Calculator Flows

**Files:**
- Modify only if a regression is reproduced: `index.html`
- Modify before any fix: `tests/brand-consultant-wizard.test.cjs` or the narrowest relevant existing test
- Test: all `tests/*.test.cjs`

**Interfaces:**
- Consumes: completed shared visual layer and all-width wizard controller.
- Produces: browser evidence that the contracts correspond to usable phone, tablet, and desktop behavior.

- [ ] **Step 1: Start the existing local server and keep it running**

```powershell
npm.cmd start
```

Use the exact local URL printed by the server; do not scan ports or change project configuration.

- [ ] **Step 2: Inspect every required responsive width**

Use the browser viewport capability at `360×800`, `375×812`, `390×844`, `768×900`, `1024×800`, `1280×800`, and `1440×900`. At each width collect these exact checks:

```text
hero rendered width / height equals 1787 / 880 within 0.01
document.scrollWidth <= document.documentElement.clientWidth
wizard header and navigation actions are visible
only the current data-wizard-step is visible
inactive steps have aria-hidden=true
contact actions do not cover wizard navigation or results
console error count = 0
```

At `1280×800`, also require two form columns, one centered workspace column, and no legacy right-side result panel before step four.

- [ ] **Step 3: Complete all four calculators at `375×812`**

For `#tax`, `#buyer`, `#loan`, and `#young`, verify:

```text
01 / 04 -> 下一步
02 / 04 -> 下一步
03 / 04 -> 查看結果
04 / 04 -> visible result panel
重新調整 -> 03 / 04 with values preserved
switch away and back -> 01 / 04
```

Use existing valid defaults or the smallest valid input adjustment; do not alter policy constants.

- [ ] **Step 4: Complete all four calculators at `1280×800`**

Repeat the same progression and confirm desktop two-column input layout, wide result grid, copy/save-image buttons, and preserved values after back navigation.

- [ ] **Step 5: Apply RED → GREEN for every browser defect before continuing**

For example, if a fixed contact rule leaks onto desktop, first add and run:

```js
test("desktop contact actions remain in document flow", () => {
  const css = consultantCss();
  const shared = css.slice(0, css.indexOf("@media (max-width: 900px)"));
  assert.match(shared, /\.float-contact\s*\{[^}]*position:\s*static/s);
  assert.doesNotMatch(shared, /\.float-contact\s*\{[^}]*position:\s*fixed/s);
});
```

Then run `node --test tests/brand-consultant-wizard.test.cjs` to observe RED, apply the minimum CSS correction, and rerun it to GREEN. Use the same pattern with a defect-specific assertion for any other issue.

- [ ] **Step 6: Run final verification**

```powershell
npm.cmd test
git diff --check
git status --short
```

Expected: zero test failures, no whitespace errors, and only intended `index.html` or test changes beyond the pre-existing unrelated `.superpowers/` directory.

- [ ] **Step 7: Commit browser-driven corrections only when files changed**

```powershell
git add index.html tests/brand-consultant-wizard.test.cjs tests/brand-ui-refresh.test.cjs
git commit -m "fix: refine unified responsive wizard"
```

Skip this command when Task 3 produced no file changes; never create an empty commit.

---

### Task 4: Publish and Verify GitHub Pages

**Files:**
- No source changes expected.
- Verify: committed repository state and deployed `index.html`.

**Interfaces:**
- Consumes: clean, tested implementation commits on the selected execution branch.
- Produces: updated `main`, successful matching GitHub Pages workflow, and cache-busted live evidence.

- [ ] **Step 1: Recheck the exact release state**

```powershell
git status --short
git log -5 --oneline
npm.cmd test
git diff --check
```

Expected: only the pre-existing `.superpowers/` directory may remain untracked; the full suite reports zero failures.

- [ ] **Step 2: Integrate without discarding unrelated work**

If execution used `codex/desktop-mobile-design-migration`, run:

```powershell
git switch main
git merge --ff-only codex/desktop-mobile-design-migration
```

If execution occurred directly on `main`, verify `git branch --show-current` returns `main` and skip the merge. Never reset, clean, delete, or stage `.superpowers/`.

- [ ] **Step 3: Push the tested commit and select the matching workflow by head SHA**

```powershell
$desktopWizardReleaseSha = git rev-parse HEAD
git push origin main
$desktopWizardRuns = gh run list --commit $desktopWizardReleaseSha --limit 5 --json databaseId,headSha,status,conclusion | ConvertFrom-Json
$desktopWizardRun = $desktopWizardRuns | Where-Object { $_.headSha -eq $desktopWizardReleaseSha } | Select-Object -First 1
if (-not $desktopWizardRun) { throw "No workflow run found for $desktopWizardReleaseSha" }
$desktopWizardRun | Format-List
```

Do not use an older run. If the matching run has not appeared yet, use one bounded `gh run list --commit $desktopWizardReleaseSha` refresh before reporting that GitHub has not created it.

- [ ] **Step 4: Wait for the exact matching Pages run**

```powershell
gh run watch $desktopWizardRun.databaseId --interval 3 --exit-status
```

Expected: exit code 0 and successful conclusion for the exact head SHA.

- [ ] **Step 5: Build and open the cache-busted public URL from the deployed SHA**

```powershell
$desktopWizardShortSha = git rev-parse --short HEAD
$desktopWizardLiveUrl = "https://weslywei1984-glitch.github.io/real-estate-calculator/index.html?v=$desktopWizardShortSha#tax"
$desktopWizardLiveUrl
```

Open the printed URL. At `375×812` and `1280×800`, verify the exact hero ratio, four-step flow, no horizontal overflow, contact placement, result visibility, and zero console errors. Spot-check `#buyer`, `#loan`, and `#young` each resolves to the matching calculator at `01 / 04`.

- [ ] **Step 6: Report fresh release evidence**

Report the deployed full SHA, automated test count, workflow database ID and conclusion, printed cache-busted URL, verified widths, all four hash routes, and the untouched pre-existing `.superpowers/` state. Do not claim completion without this turn's test, workflow, and live-browser evidence.
