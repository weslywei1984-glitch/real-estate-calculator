# Young Result Information Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorder the Qing'an result summary around purchase price, total loan, down payment, and monthly payment while keeping long-term interest transparent but visually secondary.

**Architecture:** Keep the existing single-file calculator and its calculation functions intact. Change only the Qing'an result template and its scoped responsive CSS, protected by static source-contract tests and real-browser result-flow checks.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, Codex in-app browser.

## Global Constraints

- Do not change Qing'an eligibility, loan limits, split-loan rules, interest rates, payment formulas, total-interest formulas, or amortization formulas.
- Use the existing `purchasePrice`, `totalLoan`, `downPayment`, `totalInterest`, and `loanYears` values.
- Display the summary cards in this order: `購屋總價`, `預估總貸款`, `預估自備款`.
- Keep the supplemental-loan explanation directly below the three cards and spanning the full summary width.
- Display total interest as `${loanYears} 年預估總利息` using `approxWanLine()`; remove `青安本息合計`.
- Keep the amortization table's `利息` column.
- Preserve the approved cream, navy, and terracotta Consultant B visual system and `assets/mobile-hero-exact.jpg`.
- Preserve `.superpowers/` as untracked user-owned content.

---

### Task 1: Qing'an Summary and Interest Hierarchy

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs:108-127`
- Modify: `index.html:5435-5545`
- Modify: `index.html:6956-6984`

**Interfaces:**
- Consumes: `wanMetric(label, amount, tone)`, `approxWanLine(label, amount)`, `purchasePrice`, `totalLoan`, `downPayment`, `loanYears`, and `totalInterest`.
- Produces: `.young-summary-row` with three summary metrics, `.young-summary-note` spanning all columns, and a dynamic approximate-interest line.

- [ ] **Step 1: Replace the existing two-card regression with failing three-card and interest-hierarchy assertions**

Update `tests/unified-calculator-polish.test.cjs` with these focused contracts:

```js
test("青安摘要依序顯示購屋總價、總貸款與自備款，說明在三卡下方", () => {
  assert.match(
    indexHtml,
    /<div class="young-summary-row">\s*\$\{wanMetric\("購屋總價", purchasePrice, "main young-purchase-price"\)\}\s*\$\{wanMetric\("預估總貸款", totalLoan, "young-total-loan"\)\}\s*\$\{wanMetric\("預估自備款", downPayment, "young-down-payment"\)\}/
  );
  assert.match(indexHtml, /class="metric warn young-summary-note"/);
  assert.match(indexHtml, /\.young-summary-row\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(indexHtml, /\.young-summary-note\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});

test("青安總利息顯示動態年限約數並移除本息合計", () => {
  assert.ok(indexHtml.includes('approxWanLine(`${loanYears} 年預估總利息`, totalInterest)'));
  assert.doesNotMatch(indexHtml, /wanLine\("青安本息合計"/);
  assert.match(indexHtml, /<th>利息<\/th>/);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test tests/unified-calculator-polish.test.cjs
```

Expected: FAIL because the template still has two summary metrics, CSS still uses `repeat(2, ...)`, the interest line still uses `wanLine("預估總利息", ...)`, and `青安本息合計` still exists.

- [ ] **Step 3: Implement the minimal Qing'an template change**

Change the result template to:

```js
<div class="young-summary-row">
  ${wanMetric("購屋總價", purchasePrice, "main young-purchase-price")}
  ${wanMetric("預估總貸款", totalLoan, "young-total-loan")}
  ${wanMetric("預估自備款", downPayment, "young-down-payment")}
  ${supplementalLoan > 0 ? `<div class="metric warn young-summary-note"><div class="policy-note">${splitLoanNote}</div></div>` : ""}
</div>
```

Change the secondary loan details to:

```js
<div class="line"><span>依年齡自動套用貸款年限</span><b>${loanYears} 年</b></div>
${approxWanLine(`${loanYears} 年預估總利息`, totalInterest)}
${line("青安月付建議家庭收入（以月付 40%）", suggestedIncome)}
```

Keep the existing table markup and `<th>利息</th>` unchanged.

- [ ] **Step 4: Implement the three-column responsive CSS**

Use three equal columns at every viewport:

```css
.young-summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.young-summary-row .young-summary-note {
  grid-column: 1 / -1;
}

.young-summary-row .metric strong {
  font-size: clamp(1.35rem, 2.4vw, 2rem);
  white-space: nowrap;
}
```

Keep desktop metric sizing, then add mobile-only compact sizing without changing the three-column contract:

```css
@media (max-width: 620px) {
  .young-summary-row {
    gap: 6px;
  }

  .young-summary-row .metric {
    padding: 11px 8px;
  }

  .young-summary-row .metric > span {
    font-size: .7rem;
    line-height: 1.2;
  }

  .young-summary-row .metric strong {
    font-size: clamp(1.25rem, 6.2vw, 1.65rem);
  }

  .young-summary-row .young-summary-note {
    padding: 13px 12px;
  }
}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
node --test tests/unified-calculator-polish.test.cjs
```

Expected: all tests in the file pass.

- [ ] **Step 6: Run the complete regression suite and diff validation**

Run:

```powershell
npm.cmd test
git diff --check
```

Expected: every test passes, `fail 0`, and `git diff --check` prints no errors.

- [ ] **Step 7: Commit the tested implementation**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs docs/superpowers/specs/2026-08-02-young-result-information-hierarchy-design.md docs/superpowers/plans/2026-08-02-young-result-information-hierarchy.md
git commit -m "feat: refine qingan result hierarchy"
```

### Task 2: Responsive Result Verification

**Files:**
- Verify: `index.html`
- Test: `tests/unified-calculator-polish.test.cjs`

**Interfaces:**
- Consumes: the rendered Qing'an four-step wizard and the committed `.young-summary-row` contract.
- Produces: browser evidence for the 360px mobile and 1436px desktop deployed-equivalent result layouts.

- [ ] **Step 1: Start a local static server for the committed branch**

Run from the repository root:

```powershell
python -m http.server 8795 --bind 127.0.0.1
```

Open `http://127.0.0.1:8795/index.html?qa=young-hierarchy#young` in the in-app browser.

- [ ] **Step 2: Complete the Qing'an result flow at 360 × 800**

Keep the defaults and advance through `下一步`, `下一步`, and `查看結果`. Verify with bounded DOM measurements:

```js
({
  overflow: document.documentElement.scrollWidth > innerWidth,
  summaryColumns: getComputedStyle(document.querySelector('.young-summary-row')).gridTemplateColumns,
  purchasePrice: document.querySelector('.young-purchase-price strong')?.textContent.trim(),
  totalLoan: document.querySelector('.young-total-loan strong')?.textContent.trim(),
  downPayment: document.querySelector('.young-down-payment strong')?.textContent.trim(),
  noteSpansRow: getComputedStyle(document.querySelector('.young-summary-note')).gridColumn,
  interestLabel: Array.from(document.querySelectorAll('#youngResult .line span')).find(el => el.textContent.includes('年預估總利息'))?.textContent.trim(),
  oldTotalCount: Array.from(document.querySelectorAll('#youngResult .line span')).filter(el => el.textContent.includes('青安本息合計')).length
})
```

Expected: no overflow; three non-empty columns; values `2,000 萬`, `1,600 萬`, `400 萬`; note spans the row; interest label is `40 年預估總利息`; old total count is `0`.

- [ ] **Step 3: Repeat at 1436 × 1320 and check console errors**

Expected: the three metrics share the same top coordinate, the note starts below all three cards and spans their combined width, the two payment equations stay on one line, and `tab.dev.logs({ levels: ["error"] })` returns `[]`.

- [ ] **Step 4: Stop the exact preview server and record final repository evidence**

Stop only the process created for port 8795, then run:

```powershell
git status -sb
git log -2 --oneline
git diff main...HEAD --check
```

Expected: the feature commit is at `HEAD`; only the user-owned `.superpowers/` remains untracked; diff check is clean.

