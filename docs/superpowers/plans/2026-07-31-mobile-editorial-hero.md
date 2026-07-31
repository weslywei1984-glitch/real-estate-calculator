# Mobile Editorial Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the phone-width hero with the approved A editorial-cover layout while preserving desktop presentation and all calculator behavior.

**Architecture:** Keep the existing single-file application and make the smallest compatible change: split the existing `h1` copy into two semantic spans, then style those spans only inside the final Consultant B `max-width: 620px` layer. Extend the existing static regression suite and verify the actual layout at 360px, 375px, 390px, and 1280px before deployment.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, in-app browser, GitHub Pages.

## Global Constraints

- Apply the editorial hero only at `max-width: 620px`.
- Keep the hero height at exactly 190px on 360px, 375px, and 390px viewports.
- Use the existing `assets/xiaowei-profile.png`; do not add or replace portrait assets.
- Keep 621px-and-wider hero styles visually unchanged.
- Do not change calculator inputs, formulas, defaults, results, LIFF, LINE, phone links, or GitHub Pages configuration.
- Preserve the five-item vertical source list on phones and the inline source presentation on desktop.
- Do not modify purchase-price result content.

---

## File Structure

- `index.html`: owns the hero markup and the final mobile-only Consultant B CSS layer. Modify only the existing hero heading markup and phone breakpoint rules.
- `tests/brand-consultant-wizard.test.cjs`: owns static regression assertions for Consultant B scoping, phone hero dimensions, responsive portrait sizing, and source-list behavior.
- `docs/superpowers/specs/2026-07-31-mobile-editorial-hero-design.md`: approved source of truth; read-only during implementation.

### Task 1: Lock the Editorial Hero Contract with Failing Tests

**Files:**
- Modify: `tests/brand-consultant-wizard.test.cjs:84-95`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: `consultantCss()` and `mobileConsultantCss()` test helpers already defined in the file.
- Produces: regression requirements for `.brand-hero__title-line`, `.brand-hero__title-line--accent`, the 190px hero, the 145px × 186px default portrait, and the 136px × 180px narrow portrait.

- [ ] **Step 1: Replace the existing compact-title and portrait tests with the approved contract**

```js
test("mobile hero uses the approved two-line editorial title", () => {
  assert.match(
    html,
    /<h1><span class="brand-hero__title-line">房地稅費<\/span><span class="brand-hero__title-line brand-hero__title-line--accent">貸款試算<\/span><\/h1>/
  );

  const mobile = mobileConsultantCss();
  assert.match(mobile, /\.brand-hero\s*\{[^}]*height:\s*190px/s);
  assert.match(mobile, /\.brand-hero h1\s*\{[^}]*display:\s*grid[^}]*white-space:\s*normal/s);
  assert.match(mobile, /\.brand-hero__title-line--accent\s*\{[^}]*color:\s*var\(--consultant-terracotta\)/s);
});

test("mobile editorial portrait has explicit default and narrow sizes", () => {
  const mobile = mobileConsultantCss();
  assert.match(mobile, /\.brand-hero__portrait\s*\{[^}]*right:\s*4px[^}]*width:\s*145px[^}]*height:\s*186px/s);
  assert.match(mobile, /\.brand-hero__profile\s*\{[^}]*height:\s*186px[^}]*max-width:\s*145px/s);
  assert.match(mobile, /@media \(max-width:\s*360px\)[\s\S]*\.brand-hero__portrait\s*\{[^}]*right:\s*0[^}]*width:\s*136px[^}]*height:\s*180px/s);
});
```

- [ ] **Step 2: Strengthen the desktop-scope assertion**

Add this assertion to `Consultant B visual theme is enclosed by the phone breakpoint`:

```js
assert.doesNotMatch(beforeMobile, /\.brand-hero__title-line|height:\s*190px/);
```

- [ ] **Step 3: Run the focused test and confirm the intended RED state**

Run:

```powershell
node --test tests/brand-consultant-wizard.test.cjs
```

Expected: the new editorial title and dimension tests fail because the current markup is one line and the current phone hero is 150px tall with a 120px portrait. Existing unrelated tests remain green.

- [ ] **Step 4: Commit the failing contract**

```powershell
git add -- tests/brand-consultant-wizard.test.cjs
git commit -m "test: define mobile editorial hero contract"
```

### Task 2: Implement the A Editorial-Cover Hero

**Files:**
- Modify: `index.html:5217-5283`
- Modify: `index.html:5488`
- Test: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: existing `.brand-hero`, `.brand-hero__content`, `.brand-hero__notice`, `.brand-hero__portrait`, and `assets/xiaowei-profile.png`.
- Produces: two heading spans named `.brand-hero__title-line` and `.brand-hero__title-line--accent`, styled only in the Consultant B phone layer.

- [ ] **Step 1: Split the heading into two semantic visual lines**

Replace the current heading with:

```html
<h1><span class="brand-hero__title-line">房地稅費</span><span class="brand-hero__title-line brand-hero__title-line--accent">貸款試算</span></h1>
```

- [ ] **Step 2: Replace the final Consultant B phone hero rules**

Inside the final nested `@media (max-width: 620px)`, use:

```css
.brand-hero {
  height: 190px;
  min-height: 190px;
  max-height: 190px;
  grid-template-columns: minmax(0, 1fr) 145px;
  padding: 18px 16px;
  text-align: left;
}

.brand-hero__content {
  z-index: 2;
  display: grid;
  align-content: center;
  width: 66%;
  max-width: none;
  padding: 0;
  text-align: left;
}

.brand-hero__badge {
  display: inline-flex;
  justify-self: start;
  margin: 0 0 15px;
  padding: 5px 10px;
  font-size: .68rem;
}

.brand-hero h1 {
  display: grid;
  justify-self: start;
  gap: 4px;
  max-width: none;
  margin: 0;
  font-size: 1.7rem;
  line-height: 1.02;
  letter-spacing: -.04em;
  white-space: normal;
}

.brand-hero__title-line {
  display: block;
  color: #fffaf0;
}

.brand-hero__title-line--accent {
  color: var(--consultant-terracotta);
  font-size: 1.12em;
}

.brand-hero__notice {
  display: block;
  max-width: 155px;
  margin: 10px 0 0;
  font-size: .61rem;
  line-height: 1.45;
}

.brand-hero__portrait {
  position: absolute;
  right: 4px;
  bottom: 0;
  width: 145px;
  height: 186px;
}

.brand-hero__profile {
  width: auto;
  height: 186px;
  max-width: 145px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  object-fit: contain;
  object-position: center bottom;
}
```

- [ ] **Step 3: Add the 360px override inside the Consultant B mobile layer**

```css
@media (max-width: 360px) {
  .brand-hero h1 {
    font-size: 1.56rem;
  }

  .brand-hero__portrait {
    right: 0;
    width: 136px;
    height: 180px;
  }

  .brand-hero__profile {
    height: 180px;
    max-width: 136px;
  }
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```powershell
node --test tests/brand-consultant-wizard.test.cjs
```

Expected: all tests in `brand-consultant-wizard.test.cjs` pass, including the two-line title, mobile scoping, portrait sizes, and source-list assertions.

- [ ] **Step 5: Run the complete automated suite**

Run:

```powershell
npm.cmd test
git diff --check
```

Expected: zero failed tests and no whitespace errors.

- [ ] **Step 6: Commit the implementation**

```powershell
git add -- index.html
git commit -m "style: add mobile editorial hero"
```

### Task 3: Verify Responsive Layout and Calculator Regressions

**Files:**
- Verify: `index.html`
- Verify: `tests/brand-consultant-wizard.test.cjs`

**Interfaces:**
- Consumes: the completed static page served by `npm.cmd start` at `http://127.0.0.1:8787/index.html`.
- Produces: viewport, flow, and console evidence required before deployment; no source-file changes unless a verified defect is found.

- [ ] **Step 1: Start the local server without opening a visible console window**

Run from the feature worktree using PowerShell `Start-Process -WindowStyle Hidden` with stdout and stderr redirected to explicit log files under that worktree.

- [ ] **Step 2: Verify the hero at 390px, 375px, and 360px**

For each viewport, navigate to:

```text
http://127.0.0.1:8787/index.html?v=editorial-hero#loan
```

Confirm through browser DOM metrics and screenshots:

- `matchMedia('(max-width: 620px)').matches === true`
- hero height is 190px
- title has two visible lines
- 390px and 375px portrait is 145px × 186px
- 360px portrait is 136px × 180px
- title, badge, notice, and portrait rectangles do not overlap
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
- `.sources-list` displays as `grid` and contains exactly five items

- [ ] **Step 3: Verify all four calculators at 375px**

Switch through `房地合一稅`, `買方費用`, `貸款計算`, and `青安貸款 3.0`. For each calculator, advance from `01 / 04` to `04 / 04` using valid existing defaults and confirm a result panel is visible.

- [ ] **Step 4: Verify desktop remains unchanged at 1280px**

Navigate to `#young` and confirm:

- `matchMedia('(max-width: 620px)').matches === false`
- `.wizard-mobile-head` and `.wizard-mobile-actions` display as `none`
- `.sources-list` displays as `inline`
- the desktop portrait remains 210px wide
- the workspace remains the existing desktop two-column layout
- there is no horizontal overflow

- [ ] **Step 5: Check browser logs**

Expected: zero `error`-level entries caused by project code. A third-party LIFF warning is acceptable only when it comes from `https://static.line-scdn.net/` and does not block the calculator.

- [ ] **Step 6: Stop the local server and remove only the explicit temporary log files**

Verify the resolved log paths are inside the feature worktree before removing them. Confirm `git status --short` is clean.

### Task 4: Integrate and Deploy the Approved Hero

**Files:**
- Verify: repository state and GitHub Pages deployment

**Interfaces:**
- Consumes: a clean, tested feature branch based on `main`.
- Produces: deployed `main` commit and verified production URL.

- [ ] **Step 1: Run completion verification on the exact branch state**

```powershell
npm.cmd test
git diff --check
git status --short
```

Expected: zero test failures, zero whitespace errors, and a clean worktree.

- [ ] **Step 2: Use the finishing-development-branch flow**

Offer merge, pull request, or keep-branch choices. For an approved local merge, fast-forward `main`, rerun `npm.cmd test` on the merged result, then remove only the owned `.worktrees/mobile-editorial-hero` worktree and delete its merged feature branch.

- [ ] **Step 3: Push `main` and wait for GitHub Pages**

```powershell
git push origin main
$headSha = git rev-parse HEAD
$runs = gh run list --branch main --limit 5 --json databaseId,name,status,conclusion,headSha,url | ConvertFrom-Json
$pagesRun = $runs | Where-Object { $_.headSha -eq $headSha -and $_.name -eq 'pages build and deployment' } | Select-Object -First 1
if (-not $pagesRun) { throw 'Pages workflow for current HEAD was not found' }
gh run watch $pagesRun.databaseId --interval 3 --exit-status
```

Expected: the Pages workflow for the new `main` SHA completes with `conclusion: success`.

- [ ] **Step 4: Verify the production site with a commit cache-buster**

Build the cache-busted URL from the deployed commit:

```powershell
$shortSha = git rev-parse --short HEAD
$productionUrl = "https://weslywei1984-glitch.github.io/real-estate-calculator/?v=$shortSha#loan"
```

Repeat the 375px hero/source/rate checks and the 1280px desktop checks. Confirm the production page uses the new two-line title, preserves the five source items, keeps annual rate at `2.5`, has no horizontal overflow, and reports zero project-code console errors.
