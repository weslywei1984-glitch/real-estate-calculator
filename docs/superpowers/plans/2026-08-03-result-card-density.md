# Result Card Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將房地合一稅與買方費用結果改成緊湊、整齊的資訊卡，並放大四個計算器分頁文字，同時保留所有計算與狀態邏輯。

**Architecture:** 沿用單檔 `index.html` 的既有字串模板與最終 CSS 覆寫層，只新增結果區專用 class，不改動計算函式輸入、公式或資料儲存。靜態契約測試鎖定新 DOM 結構、動態狀態文字與桌機／手機字級，再以真實瀏覽器量測響應式幾何。

**Tech Stack:** HTML5、CSS、原生 JavaScript、Node.js `node:test`、Codex 內建瀏覽器。

## Global Constraints

- 計算公式、欄位輸入、狀態判斷、既有品牌色與主結果卡不變。
- 房地合一稅的計算明細項目、金額與順序不變。
- 買方費用的費用項目、金額、順序與兩組動態狀態文字不變。
- 桌機分頁字級為 16px，手機分頁字級為 14px；點擊高度至少 48px。
- 360px、375px、390px 手機寬度不得產生頁面橫向捲動。
- 不新增第三方套件、遠端字型、稅務判斷或動畫。

---

### Task 1: 房地合一稅結果卡重組

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `index.html:6709-6755`
- Modify: `index.html` 的 `/* Consultant B wizard theme */` CSS 區段

**Interfaces:**
- Consumes: `calculateTax()` 現有的 `rate`、`selfUse`、`selfUseDetails`、`wanMetric()` 與 `wanLine()`。
- Produces: `.tax-rate-card`、`.tax-self-use-card`、`.tax-self-use-grid`、`.tax-filing-note` 結果結構。

- [ ] **Step 1: 寫入房地合一稅失敗測試**

在 `tests/unified-calculator-polish.test.cjs` 新增：

```js
test("房地合一稅以緊湊稅率卡與全寬資格卡整理結果", () => {
  const start = indexHtml.indexOf("function calculateTax()");
  const end = indexHtml.indexOf("function calculateBuyer()", start);
  const block = indexHtml.slice(start, end);

  assert.match(block, /class="metric tax-rate-card"/);
  assert.match(block, /class="metric tax-self-use-card[^\"]*"/);
  assert.match(block, /class="breakdown tax-self-use-grid"/);
  assert.match(block, /class="tax-filing-note"/);
  assert.doesNotMatch(block, /<span>提醒<\/span>/);
  assert.match(indexHtml, /\.tax-self-use-card\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});
```

- [ ] **Step 2: 執行測試並確認因新結構尚未存在而失敗**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: FAIL，訊息指出找不到 `.tax-rate-card` 或 `.tax-self-use-card`。

- [ ] **Step 3: 實作最小房地合一稅模板與樣式**

在 `calculateTax()` 模板中：

```html
<div class="metric tax-rate-card">
  <span>適用稅率</span>
  <strong>${number.format(rate.rate * 100)}%</strong>
  <div class="tax-rate-context">${rate.label}</div>
</div>
```

將自住資格卡改成：

```html
<div class="metric tax-self-use-card ${selfUse ? "" : "warn"}">
  <div class="tax-self-use-head">
    <span>自住優惠檢核</span>
    <strong>${selfUse ? "符合資格" : "未符合"}</strong>
  </div>
  <div class="breakdown tax-self-use-grid">${selfUseDetails}</div>
  <div class="note">須為境內居住者、持有滿 6 年且四項條件全符合，才會套用自住房地優惠（400 萬免稅＋10%）；非境內居住者一律 45% 或 35%，也不適用 20% 特別情形。</div>
  <div class="tax-filing-note">若無合法支出憑證，相關費用可能按成交價額 3% 推計且以 30 萬元為限；正式申報仍以稅務機關認定為準。</div>
</div>
```

刪除原本獨立的「提醒」卡，並在 `/* Consultant B wizard theme */` 區段加入：

```css
.tax-rate-card {
  align-content: center;
  gap: 12px;
}

.tax-rate-context {
  width: fit-content;
  padding: 7px 10px;
  border: 1px solid rgba(185, 80, 45, .24);
  border-radius: 999px;
  background: #f8eee6;
  color: var(--consultant-terracotta-dark);
  font-weight: 800;
}

.tax-self-use-card {
  grid-column: 1 / -1;
}

.tax-self-use-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.tax-self-use-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
}

.tax-filing-note {
  margin-top: 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--consultant-terracotta);
  background: #f8eee6;
  color: var(--consultant-muted);
  line-height: 1.6;
}
```

在既有 `@media (max-width: 620px)` 內加入：

```css
.tax-self-use-grid {
  grid-template-columns: minmax(0, 1fr);
}

.tax-self-use-head {
  align-items: flex-start;
  flex-direction: column;
  gap: 6px;
}
```

- [ ] **Step 4: 執行聚焦測試確認通過**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交房地合一稅結果卡**

```bash
git add index.html tests/unified-calculator-polish.test.cjs
git commit -m "feat: compact tax result cards"
```

---

### Task 2: 買方稅務提醒改為全寬小卡

**Files:**
- Modify: `tests/unified-calculator-polish.test.cjs`
- Modify: `index.html:6768-6792`
- Modify: `index.html` 的 `/* Consultant B wizard theme */` CSS 區段

**Interfaces:**
- Consumes: `calculateBuyer()` 現有的 `replacementReminder`、`oldPropertyTax` 與所有費用計算結果。
- Produces: `.buyer-fee-card`、`.buyer-reminder-panel`、`.buyer-reminder-grid`、`.buyer-reminder-card` 結果結構。

- [ ] **Step 1: 寫入買方提醒失敗測試**

```js
test("買方費用以全寬明細與兩張提醒小卡呈現", () => {
  const start = indexHtml.indexOf("function calculateBuyer()");
  const end = indexHtml.indexOf("function monthlyPayment", start);
  const block = indexHtml.slice(start, end);

  assert.match(block, /class="metric buyer-fee-card"/);
  assert.match(block, /class="metric buyer-reminder-panel"/);
  assert.match(block, /class="buyer-reminder-grid"/);
  assert.equal((block.match(/class="buyer-reminder-card"/g) || []).length, 2);
  assert.match(block, /replacementReminder \? "已提醒" : "未勾選"/);
  assert.match(block, /oldPropertyTax \? "後續個綜需檢查" : "目前未標記"/);
  assert.match(indexHtml, /\.buyer-fee-card,\s*\.buyer-reminder-panel\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});
```

- [ ] **Step 2: 執行測試並確認因新結構尚未存在而失敗**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: FAIL，訊息指出找不到 `.buyer-fee-card` 或 `.buyer-reminder-grid`。

- [ ] **Step 3: 實作最小買方提醒模板與樣式**

為費用卡加入 `buyer-fee-card`，並將原提醒卡改成：

```html
<div class="metric buyer-reminder-panel">
  <span>稅務提醒</span>
  <div class="buyer-reminder-grid">
    <div class="buyer-reminder-card">
      <span>重購退稅提醒</span>
      <b>${replacementReminder ? "已提醒" : "未勾選"}</b>
    </div>
    <div class="buyer-reminder-card">
      <span>舊制財產交易所得</span>
      <b>${oldPropertyTax ? "後續個綜需檢查" : "目前未標記"}</b>
    </div>
  </div>
</div>
```

在 `/* Consultant B wizard theme */` 區段加入：

```css
.buyer-fee-card,
.buyer-reminder-panel {
  grid-column: 1 / -1;
}

.buyer-reminder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.buyer-reminder-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 13px 14px;
  border: 1px solid rgba(185, 80, 45, .22);
  border-radius: 10px;
  background: #fffaf2;
}

.buyer-reminder-card b {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1e5d6;
  color: var(--consultant-navy);
}
```

在既有 `@media (max-width: 620px)` 內加入：

```css
.buyer-reminder-grid {
  grid-template-columns: minmax(0, 1fr);
}

.buyer-reminder-card {
  align-items: flex-start;
  flex-direction: column;
  gap: 7px;
}
```

- [ ] **Step 4: 執行聚焦測試確認通過**

Run: `node --test tests/unified-calculator-polish.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交買方結果卡**

```bash
git add index.html tests/unified-calculator-polish.test.cjs
git commit -m "feat: compact buyer tax reminders"
```

---

### Task 3: 分頁字級與手機排列契約

**Files:**
- Modify: `tests/brand-ui-refresh.test.cjs`
- Modify: `index.html` 的 `/* Consultant B wizard theme */` CSS 區段與其中的 `@media (max-width: 620px)`

**Interfaces:**
- Consumes: 既有 `.tabs`、`.tab`、`aria-selected` 與橫向捲動樣式。
- Produces: 桌機 16px、手機 14px、至少 48px 點擊高度的最終分頁規則。

- [ ] **Step 1: 寫入分頁字級失敗測試**

在 `tests/brand-ui-refresh.test.cjs` 新增：

```js
test("四個計算器分頁在桌機與手機使用核定字級", () => {
  const marker = html.indexOf("/* Consultant B wizard theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.tabs \.tab\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /\.tabs \.tab\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /@media \(max-width:\s*620px\)[\s\S]*\.tabs \.tab\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css, /\.tabs \.tab\s*\{[^}]*white-space:\s*nowrap/s);
});
```

- [ ] **Step 2: 執行測試並確認因核定字級尚未存在而失敗**

Run: `node --test tests/brand-ui-refresh.test.cjs`

Expected: FAIL，訊息指出找不到桌機 16px 或手機 14px 規則。

- [ ] **Step 3: 實作最小分頁字級規則**

在最終 CSS 覆寫層加入：

```css
.tabs .tab {
  min-height: 48px;
  font-size: 16px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

@media (max-width: 620px) {
  .tabs .tab {
    min-height: 48px;
    font-size: 14px;
  }
}
```

不要移除既有 `overflow-x: auto`、作用中顏色、焦點或 `scrollIntoView()` 行為。

- [ ] **Step 4: 執行聚焦測試確認通過**

Run: `node --test tests/brand-ui-refresh.test.cjs`

Expected: PASS。

- [ ] **Step 5: 提交分頁字級調整**

```bash
git add index.html tests/brand-ui-refresh.test.cjs
git commit -m "fix: improve calculator tab readability"
```

---

### Task 4: 完整回歸與真實瀏覽器驗證

**Files:**
- Verify: `index.html`
- Verify: `tests/*.test.cjs`

**Interfaces:**
- Consumes: Tasks 1–3 的最終 HTML、CSS 與測試契約。
- Produces: 完整測試、響應式幾何與瀏覽器錯誤證據。

- [ ] **Step 1: 執行完整自動化測試**

Run: `npm.cmd test`

Expected: 所有測試 PASS、0 fail。

- [ ] **Step 2: 檢查差異格式與工作樹範圍**

Run: `git diff --check && git status --short`

Expected: `git diff --check` 無輸出；僅出現本次規格、計畫、`index.html` 與兩個測試檔，不納入既有 `.superpowers/`。

- [ ] **Step 3: 啟動本機 HTTP 伺服器並驗證桌機**

在專案根目錄啟動只供驗證使用的本機伺服器，使用內建瀏覽器開啟 `index.html#tax` 與 `index.html#buyer`，將 viewport 設為 1436×1320，確認：

- 稅率卡與計算明細排列整齊；自住檢核全寬；沒有獨立提醒空卡。
- 買方費用明細與提醒面板全寬；兩張提醒小卡並排。
- 四個分頁文字為 16px，名稱完整且單行。
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`。

- [ ] **Step 4: 驗證三種手機寬度**

依序設定 390×844、375×812、360×800，確認：

- 稅務資格條件與買方提醒均轉為單欄。
- 四個分頁文字為 14px、按鈕高度至少 48px，名稱單行。
- 每個 viewport 均無頁面橫向溢位。
- 稅額、費用、資格狀態及提醒文字仍完整可見。

- [ ] **Step 5: 檢查瀏覽器錯誤並結束驗證**

確認瀏覽器主控台 error 為空；重設 viewport、關閉測試分頁並停止本機伺服器。

- [ ] **Step 6: 提交必要的驗證修正**

若瀏覽器驗證沒有產生額外修正，不建立空提交；若有排版修正，先新增對應失敗測試，再以獨立提交保存：

```bash
git add index.html tests/unified-calculator-polish.test.cjs tests/brand-ui-refresh.test.cjs
git commit -m "fix: polish compact result layout"
```
