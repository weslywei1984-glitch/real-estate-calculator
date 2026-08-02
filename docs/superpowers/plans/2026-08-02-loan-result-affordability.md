# Loan Result Affordability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 降低貸款結果頁的大額利息壓力、保留可展開的成本透明度，並在一般貸款最後一頁加入可互動的購屋預算跑道與一致的精靈導覽按鈕。

**Architecture:** 延續單檔 `index.html` 的既有模式，將計算資料先整理為可重用摘要物件，再分別輸出主要結果表與收合成本明細。購屋預算跑道以純函式 `affordabilitySnapshot(options)` 計算狀態，再由 `renderAffordRunway(cardId, options)` 負責 DOM；結果頁收入滑桿只同步收入欄位與跑道，不改貸款計算參數。

**Tech Stack:** 靜態 HTML／CSS／原生 JavaScript、Node.js 20+、`node:test`、Codex 內建瀏覽器。

## Global Constraints

- 不改變貸款本金、利率、年限、月付、青安五階段利率或資格判斷公式。
- 保留既有可負擔房價比率：月收入三分之一～40%。
- 利息資訊保留但預設收合；主結果表不得直接顯示利息欄。
- 沒有寬限期時只顯示一個主要「每月月付」；有寬限期時保留寬限期前後兩個必要數值。
- 結果頁收入模擬不得改變貸款本金、利率、期數或主月付。
- 「重新試算」維持清除資料功能；所有精靈最後一步的導覽按鈕改為「上一頁」。
- 手機 360×800 與桌機 1436×1320 不得有頁面橫向溢位或瀏覽器錯誤。
- 不新增第三方依賴，不變更儲存資料版本。

## File Structure

- Modify: `index.html` — 結果模板、成本明細、購屋預算跑道、收入同步、精靈按鈕 CSS 與控制器。
- Modify: `tests/unified-calculator-polish.test.cjs` — 新資訊層級、純計算函式、導覽按鈕與 CSS 合約測試。
- Reference: `docs/superpowers/specs/2026-08-02-loan-result-affordability-design.md` — 核准的結果順序、互動與驗收標準。

---

### Task 1: 將貸款與青安利息移入收合成本明細

**Files:**
- Modify: `index.html:6673-6816`
- Modify: `index.html:6916-7015`
- Modify: `index.html:4500-4574`
- Test: `tests/unified-calculator-polish.test.cjs:93-124`

**Interfaces:**
- Consumes: `approxWanAmount(amount)`, `approxWanLine(label, amount)`, `money.format(amount)`。
- Produces: `costDetails(linesHtml, note) -> string`、一般貸款 `periodSummaries`、青安 `youngStageSummaries`，供 Task 2 保持結果順序。

- [ ] **Step 1: 將舊利息斷言改成預設收合合約**

在 `tests/unified-calculator-polish.test.cjs` 以以下測試取代「房貸摘要與攤還表使用約幾萬格式」及「青安總利息顯示動態年限約數並移除本息合計」中與舊版可見利息相衝突的斷言：

```js
test("貸款與青安把利息移入預設收合的總成本明細", () => {
  assert.doesNotMatch(indexHtml, /<span>總利息與月付範圍<\/span>/);
  assert.doesNotMatch(indexHtml, /<th>支付利息<\/th>/);
  assert.doesNotMatch(indexHtml, /<th>利息<\/th>/);
  assert.match(indexHtml, /function costDetails\(linesHtml, note\)/);
  assert.match(indexHtml, /<details class="cost-details">\s*<summary>查看總成本明細<\/summary>/);
  assert.ok(indexHtml.includes('approxWanLine("預估總利息", totalInterest)'));
  assert.ok(indexHtml.includes('approxWanLine("預估還款總額", principal + totalInterest)'));
  assert.ok(indexHtml.includes('approxWanLine(`${loanYears} 年預估總利息`, totalInterest)'));
  assert.match(indexHtml, /periodInterestLines/);
  assert.match(indexHtml, /youngStageInterestLines/);
});

test("貸款月付摘要不再重複最高與最低月付", () => {
  assert.doesNotMatch(indexHtml, /approxWanLine\("最高月付"/);
  assert.doesNotMatch(indexHtml, /approxWanLine\("最低月付"/);
  assert.doesNotMatch(indexHtml, /let maxPayment\s*=/);
  assert.doesNotMatch(indexHtml, /let minPayment\s*=/);
  assert.match(indexHtml, /metric\("每月月付", firstNormalPayment, "main"\)/);
});
```

- [ ] **Step 2: 執行測試並確認舊版必定失敗**

Run:

```powershell
node --test tests/unified-calculator-polish.test.cjs
```

Expected: FAIL，原因包含仍存在「總利息與月付範圍」、兩個可見利息表頭、最高／最低月付，且 `costDetails` 尚未定義。

- [ ] **Step 3: 新增共用收合成本元件與樣式**

在 `index.html` 的格式 helper 區新增：

```js
function costDetails(linesHtml, note) {
  return `
    <details class="cost-details">
      <summary>查看總成本明細</summary>
      <div class="cost-details__body">
        <div class="breakdown">${linesHtml}</div>
        <p>${note}</p>
      </div>
    </details>
  `;
}
```

在 Consultant B 主題 CSS 區加入：

```css
.cost-details {
  grid-column: 1 / -1;
  border: 1px solid var(--consultant-line);
  border-radius: 10px;
  background: #fffdf7;
}

.cost-details summary {
  min-height: 44px;
  padding: 12px 14px;
  color: var(--consultant-navy);
  font-weight: 800;
  cursor: pointer;
}

.cost-details summary:focus-visible {
  outline: 3px solid rgba(185, 80, 45, .32);
  outline-offset: 2px;
}

.cost-details__body {
  padding: 0 14px 14px;
}

.cost-details__body p {
  margin: 10px 0 0;
  color: var(--brand-muted);
  font-size: .74rem;
  line-height: 1.55;
}
```

- [ ] **Step 4: 將一般貸款摘要先整理成資料再輸出兩種視圖**

將 `summarizePeriod` 改為回傳資料物件，並由同一批資料建立主表與收合利息列：

```js
const summarizePeriod = (start, end, label) => {
  const periodRows = rows.filter(row => row.month >= start && row.month <= end);
  if (!periodRows.length) return null;
  const periodMin = Math.min(...periodRows.map(row => row.payment));
  const periodMax = Math.max(...periodRows.map(row => row.payment));
  return {
    label,
    paymentText: approxWanRange(periodMin, periodMax),
    principalPaid: periodRows.reduce((sum, row) => sum + row.principalPaid, 0),
    interestPaid: periodRows.reduce((sum, row) => sum + row.interest, 0),
    endingBalance: periodRows[periodRows.length - 1].balance
  };
};

const periodSummaries = [
  summarizePeriod(1, periodBreak, `${hasGrace ? "寬限期：" : ""}第 1～${periodBreak} 期`),
  totalMonths > periodBreak
    ? summarizePeriod(periodBreak + 1, totalMonths, `第 ${periodBreak + 1}～${totalMonths} 期`)
    : null
].filter(Boolean);

const tableRows = periodSummaries.map(summary => `
  <tr>
    <td>${summary.label}</td>
    <td>${summary.paymentText}</td>
    <td>${approxWanAmount(summary.principalPaid)}</td>
    <td>${approxWanAmount(summary.endingBalance)}</td>
  </tr>
`).join("");

const periodInterestLines = periodSummaries
  .map(summary => approxWanLine(summary.label, summary.interestPaid))
  .join("");
```

移除全域 `maxPayment`／`minPayment` 狀態與更新。刪除舊「總利息與月付範圍」主卡，將主表表頭改為四欄，並在主表之後加入：

```js
${costDetails(
  `${approxWanLine("預估總利息", totalInterest)}
   ${approxWanLine("預估還款總額", principal + totalInterest)}
   ${periodInterestLines}`,
  "此為完整貸款期間累計估算，實際金額仍以銀行核定與後續利率調整為準。"
)}
```

- [ ] **Step 5: 將青安五階段資料拆成主表與收合利息列**

把 `youngStages.map()` 改為建立 `youngStageSummaries`：

```js
const youngStageSummaries = youngStages.map(stage => {
  const stageRows = rows.filter(row => row.month >= stage.start && row.month <= Math.min(stage.end, totalMonths));
  if (!stageRows.length) return null;
  const stageMinPayment = Math.min(...stageRows.map(row => row.payment));
  const stageMaxPayment = Math.max(...stageRows.map(row => row.payment));
  const annualRates = [...new Set(stageRows.map(row => rateNumber.format(row.annualRate)))];
  return {
    label: stage.label,
    annualRateText: `${annualRates.join(" / ")}%`,
    paymentText: Math.round(stageMinPayment) === Math.round(stageMaxPayment)
      ? money.format(Math.round(stageMaxPayment))
      : `${money.format(Math.round(stageMinPayment))}～${money.format(Math.round(stageMaxPayment))}`,
    interestPaid: stageRows.reduce((sum, row) => sum + row.interest, 0),
    endingBalance: stageRows[stageRows.length - 1].balance
  };
}).filter(Boolean);

const tableRows = youngStageSummaries.map(stage => `
  <tr>
    <td>${stage.label}</td>
    <td>${stage.annualRateText}</td>
    <td>${stage.paymentText}</td>
    <td>${money.format(Math.round(stage.endingBalance))}</td>
  </tr>
`).join("");

const youngStageInterestLines = youngStageSummaries
  .map(stage => approxWanLine(stage.label, stage.interestPaid))
  .join("");
```

移除可見的 `${approxWanLine(`${loanYears} 年預估總利息`, totalInterest)}` 與青安表格「利息」欄。先建立收合區塊，再把它明確串在資格檢核後：

```js
const youngCostDetails = costDetails(
  `${approxWanLine(`${loanYears} 年預估總利息`, totalInterest)}${youngStageInterestLines}`,
  "此為完整貸款期間累計估算，實際利率、補貼與核貸條件仍以承貸銀行為準。"
);

document.getElementById("youngResult").innerHTML = eligible
  ? `${calculationSections}${eligibilityBlock}${youngCostDetails}`
  : eligibilityBlock;
```

- [ ] **Step 6: 執行局部與完整測試**

Run:

```powershell
node --test tests/unified-calculator-polish.test.cjs
npm.cmd test
```

Expected: 局部檔與完整套件皆 PASS，且沒有既有青安金額、資格或貸款公式測試退步。

- [ ] **Step 7: 提交利息資訊層級變更**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs
git commit -m "feat: collapse loan cost details"
```

---

### Task 2: 在一般貸款最後一頁加入購屋預算跑道

**Files:**
- Modify: `index.html:4507-4574`
- Modify: `index.html:5976-6007`
- Modify: `index.html:6632-6671`
- Modify: `index.html:6764-6816`
- Modify: `index.html:7880-7903`
- Test: `tests/unified-calculator-polish.test.cjs`

**Interfaces:**
- Consumes: `AFFORD_RATIO_LOW`, `AFFORD_RATIO_HIGH`, `loanFromPayment()`, `clamp()`, `wanLabel()`, `value()`。
- Produces: `affordabilitySnapshot(options) -> {empty, payLow, payHigh, priceLow, priceHigh, zone, markerPercent, lowPercent, highPercent}`、`renderAffordRunway(cardId, options)`、`bindResultSalarySlider()`。

- [ ] **Step 1: 新增跑道計算與 DOM 合約測試**

在 `tests/unified-calculator-polish.test.cjs` 新增：

```js
test("一般貸款把收入回推結果移到最後一頁的購屋預算跑道", () => {
  assert.doesNotMatch(indexHtml, /<div class="afford-card" id="loanAffordCard"><\/div>/);
  assert.match(indexHtml, /id="loanAffordRunway"/);
  assert.match(indexHtml, /id="loanResultSalarySlider"[^>]*aria-label="調整家庭月收入並更新購屋預算跑道"/);
  assert.match(indexHtml, /function affordabilitySnapshot\(options\)/);
  assert.match(indexHtml, /function renderAffordRunway\(cardId, options\)/);
  assert.match(indexHtml, /function bindResultSalarySlider\(\)/);
  assert.match(indexHtml, /class="afford-runway__zone-text"/);
});

test("購屋預算跑道保留三分之一到四成公式並處理空收入", () => {
  const start = indexHtml.indexOf("function affordabilitySnapshot");
  const end = indexHtml.indexOf("function renderAffordRunway", start);
  assert.ok(start > -1 && end > start);
  const sandbox = {
    AFFORD_RATIO_LOW: 1 / 3,
    AFFORD_RATIO_HIGH: 2 / 5,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    loanFromPayment: payment => payment * 300
  };
  vm.runInNewContext(indexHtml.slice(start, end), sandbox);

  const empty = sandbox.affordabilitySnapshot({
    salary: 0, annualRate: 2.5, years: 30, downPayment: 3000000, purchasePrice: 15000000
  });
  assert.equal(empty.empty, true);

  const result = sandbox.affordabilitySnapshot({
    salary: 100000, annualRate: 2.5, years: 30, downPayment: 3000000, purchasePrice: 16000000
  });
  assert.equal(result.payLow, 100000 / 3);
  assert.equal(result.payHigh, 40000);
  assert.equal(result.zone, "挑戰");
  assert.ok(result.markerPercent >= 0 && result.markerPercent <= 100);
});
```

- [ ] **Step 2: 執行測試並確認新元件尚不存在**

Run:

```powershell
node --test tests/unified-calculator-polish.test.cjs
```

Expected: FAIL，缺少 `loanAffordRunway`、結果頁滑桿與兩個新函式。

- [ ] **Step 3: 新增純跑道計算函式**

在 `renderAffordCard` 前新增：

```js
function affordabilitySnapshot(options) {
  const salary = Math.max(0, Number(options.salary) || 0);
  const annualRate = Math.max(0, Number(options.annualRate) || 0);
  const years = Math.max(1, Number(options.years) || 1);
  const downPayment = Math.max(0, Number(options.downPayment) || 0);
  const purchasePrice = Math.max(0, Number(options.purchasePrice) || 0);
  if (salary <= 0) return { empty: true };

  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;
  const payLow = salary * AFFORD_RATIO_LOW;
  const payHigh = salary * AFFORD_RATIO_HIGH;
  const priceLow = loanFromPayment(payLow, monthlyRate, months) + downPayment;
  const priceHigh = loanFromPayment(payHigh, monthlyRate, months) + downPayment;
  const zone = purchasePrice < priceLow ? "安心" : purchasePrice <= priceHigh ? "剛好" : "挑戰";
  const scaleMax = Math.max(1, priceHigh * 1.2, purchasePrice * 1.08);
  return {
    empty: false,
    payLow,
    payHigh,
    priceLow,
    priceHigh,
    zone,
    markerPercent: clamp(purchasePrice / scaleMax * 100, 0, 100),
    lowPercent: clamp(priceLow / scaleMax * 100, 0, 100),
    highPercent: clamp(priceHigh / scaleMax * 100, 0, 100)
  };
}
```

- [ ] **Step 4: 新增結果頁跑道渲染與友善文案**

新增 `renderAffordRunway(cardId, options)`，空收入與有效收入分支必須完整：

```js
function renderAffordRunway(cardId, options) {
  const card = document.getElementById(cardId);
  if (!card) return;
  const snapshot = affordabilitySnapshot(options);
  if (snapshot.empty) {
    card.innerHTML = `<p class="afford-empty">填入家庭月收入，就能看看這間房落在哪個負擔區間。</p>`;
    return;
  }

  const messages = {
    安心: "目前房價低於舒適購屋帶，可以多保留一些生活彈性。",
    剛好: "目前房價落在舒適購屋帶，接著可一起確認自備款與其他費用。",
    挑戰: "目前房價高於舒適購屋帶，可以試著調整房價或多準備一些自備款。"
  };
  card.innerHTML = `
    <div class="afford-runway__head">
      <div><span>你的舒適購屋帶</span><strong>${wanLabel(snapshot.priceLow)}～${wanLabel(snapshot.priceHigh)}</strong></div>
      <b class="afford-runway__zone-text">${snapshot.zone}</b>
    </div>
    <div class="afford-runway__track" style="--low:${snapshot.lowPercent}%;--high:${snapshot.highPercent}%;--marker:${snapshot.markerPercent}%">
      <i class="afford-runway__marker"><span>本次房價 ${wanLabel(options.purchasePrice)}</span></i>
    </div>
    <div class="afford-runway__labels"><span>安心</span><span>剛好</span><span>挑戰</span></div>
    <p class="afford-note">${messages[snapshot.zone]}</p>
    <div class="afford-stat"><span>建議每月房貸</span><strong>${number.format(Math.round(snapshot.payLow))}～${number.format(Math.round(snapshot.payHigh))}</strong><small>元</small></div>
  `;
}
```

- [ ] **Step 5: 移除第 3 步結果卡並把跑道插入貸款結果**

刪除：

```html
<div class="afford-card" id="loanAffordCard"></div>
```

在 `calculateLoan()` 的自備款摘要後、攤還期數前加入。把跑道視覺與收入控制拆開，拖動時只重畫 `loanAffordRunwayVisual`，不可替換正在操作的 `<input type="range">`：

```html
<div class="metric afford-runway" id="loanAffordRunway">
  <div id="loanAffordRunwayVisual"></div>
  <label class="afford-runway__salary" for="loanResultSalarySlider">
    模擬家庭月收入：<b id="loanResultSalaryValue">${number.format(value("loanSalary") / 10000)} 萬</b>
  </label>
  <input class="salary-slider" id="loanResultSalarySlider" type="range" min="2" max="30" step="0.5" value="${value("loanSalary") / 10000}" aria-label="調整家庭月收入並更新購屋預算跑道">
</div>
```

完成 `loanResult.innerHTML` 後改呼叫：

```js
renderAffordRunway("loanAffordRunwayVisual", {
  salary: value("loanSalary"),
  annualRate: value("annualRate"),
  years: value("loanYears"),
  downPayment,
  purchasePrice
});
bindResultSalarySlider();
```

保留 `renderAffordCard("youngAffordCard", ...)`，青安負擔評估不在本次需求範圍內。

- [ ] **Step 6: 同步結果頁與第 3 步收入控制**

新增：

```js
function bindResultSalarySlider() {
  const slider = document.getElementById("loanResultSalarySlider");
  if (!slider) return;
  slider.addEventListener("input", () => {
    const salaryWan = Number(slider.value);
    setNumericInputValue("loanSalary", salaryWan * 10000);
    const sourceSlider = document.getElementById("loanSalarySlider");
    if (sourceSlider) sourceSlider.value = String(salaryWan);
    const resultValue = document.getElementById("loanResultSalaryValue");
    if (resultValue) resultValue.textContent = `${number.format(salaryWan)} 萬`;
    updateAllWanHints();
    queueSave();
    renderAffordRunway("loanAffordRunwayVisual", {
      salary: salaryWan * 10000,
      annualRate: value("annualRate"),
      years: value("loanYears"),
      downPayment: Math.max(0, value("loanPurchasePrice") - value("loanAmount")),
      purchasePrice: value("loanPurchasePrice")
    });
  });
}
```

此 handler 不呼叫 `scheduleGroup("loan")`，也不替換結果頁滑桿，因此拖動期間只更新跑道視覺與收入欄位，不重算貸款結果或中斷指標操作。

- [ ] **Step 7: 加入跑道品牌樣式與 360px 防溢位規則**

在既有 `.afford-*` CSS 附近加入 `.afford-runway`、`__head`、`__track`、`__marker`、`__labels`、`__salary`。跑道色帶使用 CSS 變數：

```css
.afford-runway {
  grid-column: 1 / -1;
  overflow: hidden;
}

.afford-runway__track {
  position: relative;
  height: 14px;
  margin: 34px 0 8px;
  border-radius: 999px;
  background: linear-gradient(90deg,
    #7eaa88 0 var(--low),
    #d9bd68 var(--low) var(--high),
    #d68067 var(--high) 100%);
}

.afford-runway__marker {
  position: absolute;
  left: var(--marker);
  top: -9px;
  width: 3px;
  height: 32px;
  background: var(--consultant-navy);
  transform: translateX(-50%);
}

@media (max-width: 620px) {
  .afford-runway__head { align-items: flex-start; }
  .afford-runway__marker span { max-width: 112px; white-space: normal; text-align: center; }
  .afford-runway__salary { display: flex; justify-content: space-between; gap: 8px; }
}
```

- [ ] **Step 8: 執行局部與完整測試**

```powershell
node --test tests/unified-calculator-polish.test.cjs
npm.cmd test
```

Expected: 純函式測試、DOM 合約與完整回歸全部 PASS。

- [ ] **Step 9: 提交購屋預算跑道**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs
git commit -m "feat: add affordability runway"
```

---

### Task 3: 統一精靈上一頁與等寬導覽按鈕

**Files:**
- Modify: `index.html:5289-5308`
- Modify: `index.html:7362-7378`
- Test: `tests/unified-calculator-polish.test.cjs:134-139`

**Interfaces:**
- Consumes: `setWizardStep(workspace, nextIndex, options)` 的 `index`、`steps`、`back`、`next`。
- Produces: `workspace.dataset.wizardResult === "true"` 狀態供 CSS 判斷單一上一頁滿版。

- [ ] **Step 1: 將舊青安專用測試改成四個精靈共用合約**

```js
test("所有結果頁返回按鈕顯示上一頁且單鍵滿版", () => {
  assert.match(
    indexHtml,
    /back\.textContent = index === steps\.length - 1\s*\? "上一頁"\s*:\s*"上一步";/
  );
  assert.doesNotMatch(indexHtml, /重新調整/);
  assert.match(indexHtml, /workspace\.dataset\.wizardResult = String\(index === steps\.length - 1\)/);
  assert.match(indexHtml, /\.wizard-mobile-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(indexHtml, /\[data-wizard-result="true"\] \.wizard-mobile-actions \[data-wizard-back\]\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});
```

- [ ] **Step 2: 執行測試並確認舊文案與 1:1.35 欄寬造成失敗**

```powershell
node --test tests/unified-calculator-polish.test.cjs
```

Expected: FAIL，仍有 `重新調整`，CSS 仍為 `minmax(0, 1fr) minmax(0, 1.35fr)`。

- [ ] **Step 3: 統一控制器文案與結果狀態**

在 `setWizardStep()` 更新：

```js
workspace.dataset.wizardResult = String(index === steps.length - 1);

if (back) {
  back.disabled = index === 0;
  back.textContent = index === steps.length - 1 ? "上一頁" : "上一步";
}
```

下一頁隱藏邏輯維持原樣，上一頁仍由既有 click handler 呼叫 `setWizardStep(workspace, current - 1)`。

- [ ] **Step 4: 將兩鍵改成等寬等高，單鍵結果頁滿版**

```css
.wizard-mobile-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-column: 1 / -1;
  gap: 9px;
}

.wizard-mobile-actions button {
  width: 100%;
  min-height: 44px;
}

[data-wizard-result="true"] .wizard-mobile-actions [data-wizard-back] {
  grid-column: 1 / -1;
}
```

- [ ] **Step 5: 執行局部與完整測試**

```powershell
node --test tests/unified-calculator-polish.test.cjs
npm.cmd test
```

Expected: 四個精靈的標記測試與完整套件全部 PASS。

- [ ] **Step 6: 提交導覽按鈕變更**

```powershell
git add -- index.html tests/unified-calculator-polish.test.cjs
git commit -m "fix: align wizard navigation"
```

---

### Task 4: 完整回歸與桌機／手機瀏覽器驗收

**Files:**
- Verify: `index.html`
- Verify: `tests/*.test.cjs`
- Verify: `docs/superpowers/specs/2026-08-02-loan-result-affordability-design.md`

**Interfaces:**
- Consumes: Tasks 1–3 的已提交結果。
- Produces: 可供合併決策的測試、DOM、視覺與主控台證據。

- [ ] **Step 1: 執行完整自動測試與差異檢查**

```powershell
npm.cmd test
git diff --check
git status -sb
```

Expected: 全部測試 PASS、`git diff --check` 無輸出；只有預期的未追蹤 `.superpowers/`，功能檔無未提交變更。

- [ ] **Step 2: 啟動本機預覽並用快取破壞參數開啟貸款結果**

```powershell
npm.cmd start
```

使用 Codex 內建瀏覽器開啟 `http://localhost:8787/index.html?v=loan-affordability#loan`，依精靈流程填入：房價 1,500 萬、貸款 1,200 萬、利率 2.5%、30 年、無寬限期、家庭月收入 10 萬並查看結果。

- [ ] **Step 3: 驗證 360×800 手機版**

確認：

- 頁面 `scrollWidth === clientWidth`。
- 只有一個主要「每月月付」。
- 看不到「總利息與月付範圍」、「最高月付」、「最低月付」與主表利息欄。
- 「查看總成本明細」預設收合；展開後可看到總利息、還款總額與分段利息。
- 購屋預算跑道顯示舒適購屋帶、本次房價標記、區域文字與建議月付。
- 拖動結果收入滑桿後，跑道即時更新；回上一頁後原收入欄位同步。
- 上一步／下一步等寬等高，結果頁上一頁滿版。
- 瀏覽器錯誤紀錄為空。

- [ ] **Step 4: 驗證 1436×1320 桌機版與青安結果**

確認一般貸款結果維持雙欄節奏、跑道橫跨結果寬度；再切到青安結果確認五階段表格只顯示階段、年利率、月付、本金餘額，總成本明細預設收合且可展開查看五階段利息。兩個分頁皆無頁面溢位與瀏覽器錯誤。

- [ ] **Step 5: 重新執行完成前驗證**

```powershell
npm.cmd test
git diff --check
git status -sb
git log -5 --oneline
```

Expected: 完整測試仍 PASS、差異乾淨，提交順序包含成本明細、購屋預算跑道與精靈導覽三個實作提交。

- [ ] **Step 6: 依 finishing-a-development-branch 流程交付整合選項**

測試與瀏覽器證據均通過後，提供：本機合併至 `main`、推送並建立 PR、保留分支三個選項。未取得使用者選擇前不合併或發布。
