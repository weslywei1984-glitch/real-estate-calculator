# Integrated Result Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將房貸月付、購屋摘要、房地合一稅額與適用稅率重組成完整且不留半欄空白的結果儀表板。

**Architecture:** 沿用 `index.html` 內的原生 JavaScript 字串模板與 Consultant B 最終 CSS 覆寫層，新增只服務結果頁的結構 class，不修改計算流程、輸入資料或格式函式。先以靜態契約測試鎖定整合主卡、四張摘要卡與無寬限期分支，再以真實瀏覽器驗證桌機及三種手機寬度。

**Tech Stack:** HTML5、CSS、原生 JavaScript、Node.js `node:test`、Codex 內建瀏覽器。

## Global Constraints

- 房貸月付、期數、房價、自備款、貸款本金、貸款成數與超額貸款計算不變。
- 房地合一稅額、適用稅率、情境說明、計算明細、資格狀態與申報提醒不變。
- 購屋預算跑道、還款表格、總成本收合明細、複製結果與存成圖片功能不變。
- 有寬限期時顯示兩個月付；無寬限期時只顯示一個全寬月付。
- 桌機房貸摘要四欄；手機摘要 2×2。
- 360px、375px、390px 手機寬度不得產生頁面橫向捲動。
- 既有分頁字級維持桌機 16px、手機 14px，點擊高度至少 48px。
- 不新增套件、遠端字型、動畫、localStorage 欄位或稅務建議。

---

### Task 1: 房地合一稅額與稅率整合主卡

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `index.html:6780-6845`
- Modify: `index.html` 的 `/* Consultant B wizard theme */` CSS 區段

**Interfaces:**
- Consumes: `calculateTax()` 既有的 `tax`、`rate.rate`、`rate.label`、`wanAmount()` 與計算明細模板。
- Produces: `.tax-result-hero`、`.tax-result-amount`、`.tax-result-rate` 與 `.tax-breakdown-card`。

- [ ] **Step 1: 寫入房地合一稅整合主卡失敗測試**

在 `tests/unified-calculator-polish.test.cjs` 新增：

```js
test("房地合一稅把稅額與適用稅率整合在同一張主卡", () => {
  const start = indexHtml.indexOf("function calculateTax()");
  const end = indexHtml.indexOf("function calculateBuyer()", start);
  const block = indexHtml.slice(start, end);

  assert.match(block, /class="metric main tax-result-hero"/);
  assert.match(block, /class="metric tax-result-amount"/);
  assert.match(block, /class="metric tax-result-rate"/);
  assert.match(block, /class="metric tax-breakdown-card"/);
  assert.doesNotMatch(block, /class="metric tax-rate-card"/);
  assert.match(indexHtml, /\.tax-result-hero,\s*\.tax-breakdown-card\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});
```

同時將既有「房地合一稅結果全部以萬元顯示」測試的主結果斷言由 `wanMetric()` 改為新主卡實際使用的格式：

```js
assert.match(indexHtml, /<strong>\$\{wanAmount\(tax\)\}<\/strong>/);
```

並將既有「房地合一稅以緊湊稅率卡與全寬資格卡整理結果」改名為「房地合一稅以整合主卡與全寬資格卡整理結果」，把 `.tax-rate-card` 斷言換成：

```js
assert.match(block, /class="metric main tax-result-hero"/);
assert.doesNotMatch(block, /class="metric tax-rate-card"/);
```

此測試防止稅率再次被拆回會遭同列明細撐高的半欄卡片。

- [ ] **Step 2: 執行聚焦測試並確認正確失敗**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: FAIL，指出找不到 `.tax-result-hero` 或仍存在 `.tax-rate-card`。

- [ ] **Step 3: 實作最小整合主卡模板**

將 `calculateTax()` 結果模板最前方兩張卡改成：

```html
<div class="metric main tax-result-hero">
  <div class="metric tax-result-amount">
    <span>預估應納房地合一稅</span>
    <strong>${wanAmount(tax)}</strong>
  </div>
  <div class="metric tax-result-rate">
    <span>適用稅率</span>
    <strong>${number.format(rate.rate * 100)}%</strong>
    <em>${rate.label}</em>
  </div>
</div>
<div class="metric tax-breakdown-card">
  <span>計算明細</span>
  <div class="breakdown">
    ${wanLine("出售成交價額", salePrice)}
    ${wanLine("減：取得成本", -buyCost)}
    ${wanLine("減：取得、改良與移轉費用", -sellExpense)}
    ${wanLine("減：土地漲價總數額", -landGain)}
    ${wanLine("課稅所得稅基", grossIncome)}
    ${selfUse ? wanLine("自住房地免稅額", -exemption) : ""}
    ${wanLine("出售稅後淨利", afterTaxProfit)}
  </div>
</div>
```

移除 `.tax-rate-card` 與 `.tax-rate-context` 的舊模板；自住檢核、資格內容及 `.tax-filing-note` 不動。

- [ ] **Step 4: 實作整合主卡桌機與手機樣式**

在 `/* Consultant B wizard theme */` CSS 區段，以以下規則取代 `.tax-rate-card` 與 `.tax-rate-context`：

```css
.tax-result-hero,
.tax-breakdown-card {
  grid-column: 1 / -1;
}

.tax-result-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(220px, .75fr);
  gap: 18px;
  align-items: stretch;
}

.tax-result-amount,
.tax-result-rate {
  display: grid;
  align-content: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
}

.tax-result-rate {
  padding-left: 18px;
  border-left: 1px solid rgba(255, 250, 240, .24);
}

.tax-result-rate strong {
  font-size: clamp(1.55rem, 3vw, 2.25rem);
}

.tax-result-rate em {
  color: rgba(255, 250, 240, .78);
  font-size: .78rem;
  font-style: normal;
  font-weight: 750;
  line-height: 1.45;
}
```

在既有 `@media (max-width: 620px)` 內加入：

```css
.tax-result-hero {
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.tax-result-rate {
  padding-top: 12px;
  padding-left: 0;
  border-top: 1px solid rgba(255, 250, 240, .24);
  border-left: 0;
}
```

- [ ] **Step 5: 執行聚焦測試並確認通過**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: PASS。

- [ ] **Step 6: 提交房地合一稅整合主卡**

```bash
git add index.html tests/unified-calculator-polish.test.cjs
git commit -m "feat: integrate tax result hero"
```

---

### Task 2: 房貸雙階段月付主卡與四張摘要卡

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `tests/brand-ui-refresh.test.cjs`
- Modify: `index.html:7026-7175`
- Modify: `index.html` 的 `/* Consultant B wizard theme */` CSS 區段

**Interfaces:**
- Consumes: `calculateLoan()` 既有的 `hasGrace`、`firstGracePayment`、`firstNormalPayment`、`paidMonths`、`graceMonths`、`purchasePrice`、`downPayment`、`principal`、`actualLoanRatio` 與 `overLoanAmount`。
- Produces: `.loan-payment-hero`、`.loan-payment-grid`、`.loan-payment-stage`、`.loan-term-badge`、`.loan-facts-grid`、`.loan-fact-card` 與可選的 `.loan-overage-note`。

- [ ] **Step 1: 寫入房貸儀表板失敗測試**

```js
test("房貸結果使用月付主卡與四張購屋摘要卡", () => {
  const start = indexHtml.indexOf("function calculateLoan()");
  const end = indexHtml.indexOf("function calculateYoung()", start);
  const block = indexHtml.slice(start, end);

  assert.match(block, /class="metric main loan-payment-hero/);
  assert.match(block, /class="loan-payment-grid \$\{hasGrace \? "has-grace" : "single"\}"/);
  assert.match(block, /class="loan-term-badge">\$\{paidMonths\} 期/);
  assert.equal((block.match(/class="metric loan-fact-card"/g) || []).length, 4);
  assert.match(block, /class="loan-overage-note"/);
  assert.doesNotMatch(block, /<span>攤還期數<\/span>/);
  assert.match(indexHtml, /\.loan-payment-hero,\s*\.loan-facts-grid\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});
```

此測試防止期數再次變回獨立半欄卡，並確保四項購屋摘要不被合併回單一大卡。

同步更新兩個既有月付契約：

在 `tests/unified-calculator-polish.test.cjs` 的「房貸結果沒有重複最高與最低月付」保留最高／最低月付不存在的斷言，將舊 `metric("每月月付", ...)` 斷言改為：

```js
assert.match(indexHtml, /class="loan-payment-grid \$\{hasGrace \? "has-grace" : "single"\}"/);
assert.match(indexHtml, /<span>每月月付<\/span>\s*<strong>\$\{money\.format\(Math\.round\(firstNormalPayment\)\)\}<\/strong>/);
```

在 `tests/brand-ui-refresh.test.cjs` 的「沒有寬限期時不顯示寬限期月付，也不硬切在第 36 期」將舊 `metric("每月月付", ...)` 斷言改為相同的 `.loan-payment-grid` 條件分支與「每月月付」模板斷言。既有 `periodBreak` 與 `hasGrace` 斷言保留。

- [ ] **Step 2: 執行聚焦測試並確認正確失敗**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: FAIL，指出找不到 `.loan-payment-hero` 或 `.loan-facts-grid`。

- [ ] **Step 3: 實作月付主卡模板**

在 `loanResult` 模板最前方加入：

```html
<div class="metric main loan-payment-hero">
  <div class="line loan-payment-head">
    <span>每月還款節奏</span>
    <b class="loan-term-badge">${paidMonths} 期</b>
  </div>
  <div class="loan-payment-grid ${hasGrace ? "has-grace" : "single"}">
    ${hasGrace ? `
      <div class="metric loan-payment-stage">
        <span>寬限期月付</span>
        <strong>${money.format(Math.round(firstGracePayment))}</strong>
      </div>
      <div class="metric loan-payment-stage loan-payment-stage--after">
        <span>寬限期後月付</span>
        <strong>${money.format(Math.round(firstNormalPayment))}</strong>
      </div>
    ` : `
      <div class="metric loan-payment-stage">
        <span>每月月付</span>
        <strong>${money.format(Math.round(firstNormalPayment))}</strong>
      </div>
    `}
  </div>
  <div class="loan-payment-note">${hasGrace ? `前 ${graceMonths} 期為寬限期，只付利息；寬限期後開始攤還本金。` : "沒有寬限期，從第 1 期就開始還本金，每期月付都一樣。"}</div>
</div>
```

刪除原本兩張月付卡與獨立攤還期數卡。

- [ ] **Step 4: 實作四張摘要卡與超額貸款提醒**

在月付主卡後加入：

```html
<div class="loan-facts-grid">
  <div class="metric loan-fact-card"><span>房屋成交總價</span><strong>${wanAmount(purchasePrice)}</strong></div>
  <div class="metric loan-fact-card"><span>自備款</span><strong>${wanAmount(downPayment)}</strong></div>
  <div class="metric loan-fact-card"><span>貸款本金</span><strong>${wanAmount(principal)}</strong></div>
  <div class="metric loan-fact-card"><span>實際貸款成數</span><strong>${number.format(actualLoanRatio)} 成</strong></div>
  ${overLoanAmount > 0 ? `<div class="loan-overage-note">貸款超過房價金額：${wanAmount(overLoanAmount)}</div>` : ""}
</div>
```

購屋預算跑道、還款表格與總成本收合明細模板保持原順序及內容。

- [ ] **Step 5: 實作房貸儀表板桌機與手機樣式**

在 `/* Consultant B wizard theme */` CSS 區段加入：

```css
.loan-payment-hero,
.loan-facts-grid {
  grid-column: 1 / -1;
}

.loan-payment-hero {
  display: grid;
  gap: 14px;
}

.loan-payment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0;
  border-bottom: 0;
}

.loan-term-badge {
  padding: 6px 10px;
  border: 1px solid rgba(255, 250, 240, .3);
  border-radius: 999px;
  color: #fffaf0;
  font-size: .78rem;
  white-space: nowrap;
}

.loan-payment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
}

.loan-payment-grid.single {
  grid-template-columns: minmax(0, 1fr);
}

.loan-payment-stage {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 8px 0;
  border: 0;
  background: transparent;
}

.loan-payment-stage--after {
  padding-left: 22px;
  border-left: 1px solid rgba(255, 250, 240, .24);
}

.loan-payment-stage strong {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
}

.loan-payment-note {
  color: rgba(255, 250, 240, .76);
  font-size: .78rem;
  line-height: 1.55;
}

.loan-facts-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.loan-fact-card {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--consultant-line);
  border-radius: 10px;
  background: #fffdf7;
}

.loan-fact-card span {
  color: var(--consultant-muted);
  font-size: .76rem;
  font-weight: 750;
}

.loan-fact-card strong {
  color: var(--consultant-navy);
  font-size: clamp(1.05rem, 2vw, 1.4rem);
}

.loan-overage-note {
  grid-column: 1 / -1;
  padding: 9px 11px;
  border-left: 3px solid var(--consultant-terracotta);
  background: #f8eee6;
  color: var(--consultant-terracotta-dark);
  font-size: .78rem;
  font-weight: 750;
}
```

在既有 `@media (max-width: 620px)` 內加入：

```css
.loan-payment-grid {
  grid-template-columns: minmax(0, 1fr);
}

.loan-payment-stage--after {
  padding-top: 14px;
  padding-left: 0;
  border-top: 1px solid rgba(255, 250, 240, .24);
  border-left: 0;
}

.loan-facts-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

- [ ] **Step 6: 執行聚焦測試並確認通過**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: PASS。

- [ ] **Step 7: 提交房貸整合儀表板**

```bash
git add index.html tests/unified-calculator-polish.test.cjs tests/brand-ui-refresh.test.cjs
git commit -m "feat: integrate loan result dashboard"
```

---

### Task 3: 完整回歸與真實瀏覽器驗證

**Files:**
- Verify: `index.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: Tasks 1–2 的整合主卡、響應式樣式與既有結果功能。
- Produces: 自動化回歸、桌機／手機幾何、分支乾淨度與瀏覽器錯誤證據。

- [ ] **Step 1: 執行完整測試與格式檢查**

Run: `npm.cmd test`

Expected: 所有測試 PASS、0 fail。

Run: `git diff --check`

Expected: 無輸出。

- [ ] **Step 2: 啟動本機 HTTP 伺服器並驗證 1436×1320 房地合一稅結果**

使用內建瀏覽器開啟本機 `index.html#tax` 並完成四步試算，確認：

- `.tax-result-hero` 與 `.tax-breakdown-card` 都與主內容內寬相同。
- 主卡內稅額與稅率左右排列，沒有 `.tax-rate-card`。
- 計算明細、自住資格與申報提醒均全寬。
- 四個分頁維持 16px、48px 高、單行。
- 頁面無橫向溢位。

- [ ] **Step 3: 驗證 1436×1320 房貸結果的兩個分支**

先以寬限期大於 0 的資料試算，確認：

- `.loan-payment-grid` 為兩欄，兩個月付都在同一主卡。
- 「360 期」等實際總期數只顯示為主卡標籤。
- `.loan-facts-grid` 為四欄，沒有獨立「攤還期數」卡。
- 購屋跑道、表格與成本明細全寬且功能存在。

再將寬限期設為 0 重新試算，確認：

- `.loan-payment-grid.single` 只有一張「每月月付」。
- 不存在「寬限期月付」或空白第二欄。

- [ ] **Step 4: 驗證 390×844、375×812、360×800**

在房地合一稅與房貸結果頁逐一量測：

- 稅額主卡上下排列。
- 有寬限期的兩個月付上下排列。
- 房貸四張摘要卡為 2×2。
- 主要數字未裁切，結果內容完整可見。
- 四個分頁維持 14px、48px 高、單行。
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`。

- [ ] **Step 5: 檢查錯誤並結束本機驗證**

確認瀏覽器主控台 error 為空；重設 viewport、關閉測試分頁並停止只供本次驗證使用的本機伺服器。

- [ ] **Step 6: 處理驗證中發現的排版問題**

若無問題，不建立空提交。若發現排版問題，先在 `tests/unified-calculator-polish.test.cjs` 加入會失敗的回歸測試，再修正 `index.html`，執行聚焦測試與完整測試後提交：

```bash
git add index.html tests/unified-calculator-polish.test.cjs
git commit -m "fix: polish integrated result dashboard"
```
