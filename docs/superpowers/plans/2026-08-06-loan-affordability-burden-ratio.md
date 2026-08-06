# Loan Affordability Burden Ratio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在一般房貸結果頁加入「舒適／5 成／6 成／7 成」離散滑桿，並同步顯示購屋預算上限、月付試算、舒適參考及風險提醒。

**Architecture:** 延續專案的單檔 `index.html` 架構，以 `affordabilitySnapshot(options)` 作為純計算邊界，新增頁面工作階段狀態 `loanAffordBurdenMode` 保存目前選擇。比例滑桿與薪水滑桿只重畫 `loanAffordRunwayVisual`，不呼叫貸款重算或改寫本金、利率、年限與主要月付；完成本機驗證後，沿用 Nginx 靜態版本目錄發布至 VPS。

**Tech Stack:** 靜態 HTML／CSS／原生 JavaScript、Node.js 20+、`node:test`、Codex 內建瀏覽器、Nginx、PowerShell、OpenSSH。

## Global Constraints

- `5 成／6 成／7 成` 指月付試算上限占每月薪水的 `50%／60%／70%`，不是房屋貸款成數。
- 舒適設定固定沿用月收入 `1/3～40%`，不得把 5／6／7 成描述為舒適預算。
- 不修改貸款本金、實際貸款成數、利率、年限、寬限期、攤還表、總利息或主要月付公式。
- 高比例試算不得回填貸款本金、房屋成交總價或其他輸入欄位。
- 四個離散位置固定為 `舒適`、`5 成`、`6 成`、`7 成`；預設為舒適。
- 選定比例只保留於目前頁面工作階段，不寫入 `localStorage`；按一般房貸「重新試算」後回到舒適。
- 只修改一般房貸結果頁，不改青安貸款 3.0 的收入回推卡。
- 不新增第三方前端套件、CDN 或新儲存版本；CSS 與 JavaScript 保留在 `index.html`。
- 公開頁面不得載入 LINE LIFF SDK 或 `assets/liff-gate.js`。
- 360px 寬不得水平溢位；動態結果、滑桿值與風險等級必須有文字，不可只靠顏色。
- VPS 維持 Nginx 靜態服務；`tainanwei.service` 保持停用，8787 port 保持未監聽。

## File Structure

- Modify: `index.html` — 負擔比例設定、純計算結果、雙數字摘要、跑道刻度、風險文案、事件綁定、重設狀態與響應式樣式。
- Create: `tests/loan-affordability-burden-ratio.test.cjs` — 比例計算、DOM、事件邊界、重設與 CSS 合約測試。
- Modify: `DEPLOY.md` — 將已過時的 Node 部署說明改為目前的 Nginx 靜態版本化發布流程。
- Modify: `tests/public-browser-access.test.cjs` — 鎖定靜態部署文件與 Node 停用邊界。
- Reference: `docs/superpowers/specs/2026-08-06-loan-affordability-burden-ratio-design.md` — 已核准的功能、文案、無障礙與驗收規格。

---

### Task 1: 擴充購屋負擔純計算模型

**Files:**
- Modify: `index.html:7107-7140`
- Create: `tests/loan-affordability-burden-ratio.test.cjs`
- Modify: `tests/unified-calculator-polish.test.cjs:172-197`

**Interfaces:**
- Consumes: `AFFORD_RATIO_LOW`, `AFFORD_RATIO_HIGH`, `loanFromPayment(payment, monthlyRate, months)`, `clamp(value, min, max)`。
- Produces: `AFFORD_BURDEN_OPTIONS`、`AFFORD_BURDEN_STEPS`、`loanAffordBurdenMode`、`normalizeAffordBurdenMode(mode)`、擴充後的 `affordabilitySnapshot(options)`。
- `affordabilitySnapshot(options)` 新增輸入 `mode: "comfort" | "50" | "60" | "70"`，新增回傳 `mode`、`modeLabel`、`selectedRatio`、`selectedPay`、`selectedPrice`、`selectedPercent`、`withinSelected`；既有回傳欄位保持可用。

- [ ] **Step 1: 建立失敗中的純函式測試**

建立 `tests/loan-affordability-burden-ratio.test.cjs`：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function loadAffordabilityModel() {
  const start = html.indexOf("function affordabilitySnapshot");
  const end = html.indexOf("function renderAffordRunway", start);
  assert.ok(start > -1 && end > start, "負擔比例純函式區塊必須存在");
  const sandbox = {
    AFFORD_RATIO_LOW: 1 / 3,
    AFFORD_RATIO_HIGH: 2 / 5,
    AFFORD_BURDEN_OPTIONS: Object.freeze({
      comfort: Object.freeze({ label: "舒適", ratio: null }),
      "50": Object.freeze({ label: "5 成", ratio: 0.5 }),
      "60": Object.freeze({ label: "6 成", ratio: 0.6 }),
      "70": Object.freeze({ label: "7 成", ratio: 0.7 })
    }),
    loanFromPayment: payment => payment * 300,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value))
  };
  vm.runInNewContext(html.slice(start, end), sandbox);
  return sandbox;
}

test("舒適模式保留三分之一到四成區間", () => {
  const { affordabilitySnapshot } = loadAffordabilityModel();
  const result = affordabilitySnapshot({
    salary: 60000,
    annualRate: 2.5,
    years: 30,
    downPayment: 3000000,
    purchasePrice: 15000000,
    mode: "comfort"
  });

  assert.equal(result.mode, "comfort");
  assert.ok(Math.abs(result.payLow - 20000) < 1e-9);
  assert.equal(result.payHigh, 24000);
  assert.equal(result.selectedPay, 24000);
  assert.equal(result.selectedPrice, result.priceHigh);
  assert.equal(result.zone, "挑戰");
});

test("5 成 6 成 7 成以收入比例回推月付與購屋預算上限", () => {
  const { affordabilitySnapshot } = loadAffordabilityModel();
  const cases = [
    ["50", 0.5, 30000],
    ["60", 0.6, 36000],
    ["70", 0.7, 42000]
  ];

  for (const [mode, ratio, payment] of cases) {
    const result = affordabilitySnapshot({
      salary: 60000,
      annualRate: 2.5,
      years: 30,
      downPayment: 3000000,
      purchasePrice: 12000000,
      mode
    });
    assert.equal(result.mode, mode);
    assert.equal(result.selectedRatio, ratio);
    assert.equal(result.selectedPay, payment);
    assert.equal(result.selectedPrice, payment * 300 + 3000000);
    assert.ok(result.selectedPercent >= 0 && result.selectedPercent <= 100);
    assert.equal(result.withinSelected, 12000000 <= result.selectedPrice);
  }
});

test("無效模式回到舒適且無效收入不產生數值", () => {
  const { affordabilitySnapshot, normalizeAffordBurdenMode } = loadAffordabilityModel();
  assert.equal(normalizeAffordBurdenMode("90"), "comfort");
  for (const salary of [0, -1, "不是數字"]) {
    const empty = affordabilitySnapshot({
      salary,
      annualRate: 2.5,
      years: 30,
      downPayment: 3000000,
      purchasePrice: 15000000,
      mode: "70"
    });
    assert.deepEqual(
      { empty: empty.empty, mode: empty.mode, selectedPay: empty.selectedPay },
      { empty: true, mode: "70", selectedPay: undefined }
    );
  }
  assert.match(html, /if \(monthlyRate === 0\) return payment \* months;/);
});
```

在 `tests/unified-calculator-polish.test.cjs` 的購屋預算跑道 sandbox 補上新常數，並把擷取起點維持在 `function affordabilitySnapshot`，使原有舒適區回歸測試繼續執行實際函式：

```js
AFFORD_BURDEN_OPTIONS: Object.freeze({
  comfort: Object.freeze({ label: "舒適", ratio: null }),
  "50": Object.freeze({ label: "5 成", ratio: 0.5 }),
  "60": Object.freeze({ label: "6 成", ratio: 0.6 }),
  "70": Object.freeze({ label: "7 成", ratio: 0.7 })
}),
```

- [ ] **Step 2: 執行測試並確認缺少新模型而失敗**

Run:

```powershell
node --test tests/loan-affordability-burden-ratio.test.cjs
```

Expected: FAIL，訊息包含「負擔比例純函式區塊必須存在」。

- [ ] **Step 3: 新增固定選項與頁面工作階段狀態**

在 `AFFORD_RATIO_HIGH` 後加入：

```js
const AFFORD_BURDEN_OPTIONS = Object.freeze({
  comfort: Object.freeze({ label: "舒適", ratio: null }),
  "50": Object.freeze({ label: "5 成", ratio: 0.5 }),
  "60": Object.freeze({ label: "6 成", ratio: 0.6 }),
  "70": Object.freeze({ label: "7 成", ratio: 0.7 })
});
const AFFORD_BURDEN_STEPS = Object.freeze(["comfort", "50", "60", "70"]);
let loanAffordBurdenMode = "comfort";
```

- [ ] **Step 4: 擴充純計算函式**

以以下實作取代既有 `affordabilitySnapshot(options)`，並把 `normalizeAffordBurdenMode()` 緊接在它之後，讓既有測試擷取區塊包含兩個函式：

```js
function affordabilitySnapshot(options) {
  const salary = Math.max(0, Number(options.salary) || 0);
  const annualRate = Math.max(0, Number(options.annualRate) || 0);
  const years = Math.max(1, Number(options.years) || 1);
  const downPayment = Math.max(0, Number(options.downPayment) || 0);
  const purchasePrice = Math.max(0, Number(options.purchasePrice) || 0);
  const mode = normalizeAffordBurdenMode(options.mode);
  const modeOption = AFFORD_BURDEN_OPTIONS[mode];
  if (salary <= 0) return { empty: true, mode, modeLabel: modeOption.label };

  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 100 / 12;
  const payLow = salary * AFFORD_RATIO_LOW;
  const payHigh = salary * AFFORD_RATIO_HIGH;
  const priceLow = loanFromPayment(payLow, monthlyRate, months) + downPayment;
  const priceHigh = loanFromPayment(payHigh, monthlyRate, months) + downPayment;
  const selectedRatio = modeOption.ratio;
  const selectedPay = selectedRatio === null ? payHigh : salary * selectedRatio;
  const selectedPrice = loanFromPayment(selectedPay, monthlyRate, months) + downPayment;
  const zone = purchasePrice < priceLow ? "安心" : purchasePrice <= priceHigh ? "剛好" : "挑戰";
  const scaleMax = Math.max(1, priceHigh * 1.2, selectedPrice * 1.12, purchasePrice * 1.08);

  return {
    empty: false,
    mode,
    modeLabel: modeOption.label,
    selectedRatio,
    selectedPay,
    selectedPrice,
    withinSelected: purchasePrice <= selectedPrice,
    payLow,
    payHigh,
    priceLow,
    priceHigh,
    zone,
    markerPercent: clamp(purchasePrice / scaleMax * 100, 0, 100),
    lowPercent: clamp(priceLow / scaleMax * 100, 0, 100),
    highPercent: clamp(priceHigh / scaleMax * 100, 0, 100),
    selectedPercent: clamp(selectedPrice / scaleMax * 100, 0, 100)
  };
}

function normalizeAffordBurdenMode(mode) {
  return Object.prototype.hasOwnProperty.call(AFFORD_BURDEN_OPTIONS, mode)
    ? mode
    : "comfort";
}
```

- [ ] **Step 5: 執行局部與既有購屋跑道測試**

```powershell
node --test tests/loan-affordability-burden-ratio.test.cjs tests/unified-calculator-polish.test.cjs
```

Expected: 新增三個測試與原有舒適區間測試全部 PASS。

- [ ] **Step 6: 提交純計算模型**

```powershell
git add -- index.html tests/loan-affordability-burden-ratio.test.cjs tests/unified-calculator-polish.test.cjs
git commit -m "feat: add loan burden ratio calculations"
```

---

### Task 2: 建立滑桿、雙數字摘要與風險互動

**Files:**
- Modify: `index.html:5537-5643`
- Modify: `index.html:5867-5881`
- Modify: `index.html:7142-7173`
- Modify: `index.html:7340-7347`
- Modify: `index.html:7637-7647`
- Modify: `index.html:8500-8520`
- Modify: `tests/loan-affordability-burden-ratio.test.cjs`

**Interfaces:**
- Consumes: Task 1 的 `AFFORD_BURDEN_OPTIONS`、`AFFORD_BURDEN_STEPS`、`loanAffordBurdenMode`、`affordabilitySnapshot(options)`。
- Produces: `renderCurrentLoanAffordRunway(salary)`、`bindResultAffordBurdenSlider()`；既有 `renderAffordRunway()` 與 `bindResultSalarySlider()` 擴充為使用目前負擔模式。
- DOM IDs: `loanAffordBurdenSlider`、`loanAffordBurdenValue`、`loanAffordRunwayVisual`、`loanResultSalarySlider`、`loanResultSalaryValue`。

- [ ] **Step 1: 加入失敗中的 DOM、文案與事件邊界測試**

在 `tests/loan-affordability-burden-ratio.test.cjs` 追加：

```js
test("一般房貸結果提供四段月付負擔滑桿與雙數字摘要", () => {
  assert.match(html, /id="loanAffordBurdenSlider"[^>]*type="range"[^>]*min="0"[^>]*max="3"[^>]*step="1"/);
  assert.match(html, /aria-label="設定每月房貸占月薪比例"/);
  assert.match(html, /id="loanAffordBurdenValue"/);
  assert.match(html, /<span>舒適<\/span>\s*<span>5 成<\/span>\s*<span>6 成<\/span>\s*<span>7 成<\/span>/);
  assert.match(html, /class="afford-summary-grid"[^>]*aria-live="polite"/);
  assert.match(html, /購屋預算上限/);
  assert.match(html, /月付試算/);
  assert.match(html, /舒適參考：/);
});

test("高負擔模式顯示三個明確風險等級", () => {
  assert.match(html, /5 成｜負擔偏高/);
  assert.match(html, /6 成｜壓力高/);
  assert.match(html, /7 成｜風險很高/);
  assert.match(html, /僅供壓力測試，不建議視為舒適預算/);
});

test("負擔比例互動只更新預算跑道且重新試算回到舒適", () => {
  const start = html.indexOf("function bindResultAffordBurdenSlider");
  const end = html.indexOf("function bindResultSalarySlider", start);
  assert.ok(start > -1 && end > start);
  const handlerSource = html.slice(start, end);
  assert.match(handlerSource, /loanAffordBurdenMode = AFFORD_BURDEN_STEPS\[/);
  assert.match(handlerSource, /renderCurrentLoanAffordRunway\(\)/);
  assert.doesNotMatch(handlerSource, /scheduleGroup|calculateLoan|setNumericInputValue|queueSave/);
  assert.match(html, /if \(group === "loan"\) loanAffordBurdenMode = "comfort";/);
});

test("月付負擔元件具備手機堆疊與選定上限刻度", () => {
  assert.match(html, /\.afford-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(html, /\.afford-runway__selected-tick\s*\{/);
  assert.match(html, /@media \(max-width: 620px\)[\s\S]*?\.afford-summary-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
});
```

- [ ] **Step 2: 執行測試並確認新控制與文案尚不存在**

```powershell
node --test tests/loan-affordability-burden-ratio.test.cjs
```

Expected: 純計算測試 PASS；DOM、文案、事件及 CSS 四組測試 FAIL。

- [ ] **Step 3: 在結果卡加入離散比例控制**

將 `loanAffordRunway` 內部改為：

```html
<div class="metric afford-runway" id="loanAffordRunway">
  <div class="afford-burden-control">
    <label for="loanAffordBurdenSlider">
      <span>月付負擔上限</span>
      <output id="loanAffordBurdenValue" for="loanAffordBurdenSlider">${AFFORD_BURDEN_OPTIONS[loanAffordBurdenMode].label}</output>
    </label>
    <input class="afford-burden-slider" id="loanAffordBurdenSlider" type="range" min="0" max="3" step="1" value="${AFFORD_BURDEN_STEPS.indexOf(loanAffordBurdenMode)}" aria-label="設定每月房貸占月薪比例" aria-valuetext="${AFFORD_BURDEN_OPTIONS[loanAffordBurdenMode].label}">
    <div class="afford-burden-labels" aria-hidden="true"><span>舒適</span><span>5 成</span><span>6 成</span><span>7 成</span></div>
  </div>
  <div id="loanAffordRunwayVisual"></div>
  <label class="afford-runway__salary" for="loanResultSalarySlider">
    <span>用我的月薪試跑</span>
    <b id="loanResultSalaryValue">${number.format(value("loanSalary") / 10000)} 萬</b>
  </label>
  <input class="salary-slider" id="loanResultSalarySlider" type="range" min="2" max="30" step="0.5" value="${value("loanSalary") / 10000}" aria-label="調整每月薪水並即時更新購屋預算跑道">
</div>
```

- [ ] **Step 4: 將跑道渲染改為雙數字摘要**

在 `renderAffordRunway()` 內，保留空收入分支，將有效收入模板改為以下結構；`messages` 保留既有安心／剛好／挑戰文字：

```js
const riskMessages = {
  "50": {
    title: "5 成｜負擔偏高",
    note: "請預留生活費、利率上升與緊急支出。"
  },
  "60": {
    title: "6 成｜壓力高",
    note: "請確認其他固定支出及緊急預備金是否足夠。"
  },
  "70": {
    title: "7 成｜風險很高",
    note: "僅供壓力測試，不建議視為舒適預算。"
  }
};
const burdenSlider = document.getElementById("loanAffordBurdenSlider");
if (burdenSlider) burdenSlider.disabled = false;
const isComfort = snapshot.mode === "comfort";
const budgetLabel = isComfort ? "舒適購屋預算" : "購屋預算上限";
const budgetValue = isComfort
  ? `${wanLabel(snapshot.priceLow)}～${wanLabel(snapshot.priceHigh)}`
  : wanLabel(snapshot.selectedPrice);
const paymentLabel = isComfort ? "舒適月付試算" : "月付試算";
const paymentValue = isComfort
  ? `${number.format(Math.round(snapshot.payLow))}～${number.format(Math.round(snapshot.payHigh))}`
  : number.format(Math.round(snapshot.selectedPay));
const selectedStatus = isComfort
  ? ""
  : `<p class="afford-selected-status">目前房價${snapshot.withinSelected ? "在" : "仍高於"} ${snapshot.modeLabel}試算上限${snapshot.withinSelected ? "內" : ""}。</p>`;
const selectedTick = isComfort
  ? ""
  : `<i class="afford-runway__selected-tick" aria-hidden="true"></i><em class="afford-runway__selected-label">${snapshot.modeLabel}上限</em>`;
const baseline = isComfort
  ? ""
  : `<p class="afford-baseline">舒適參考：${wanLabel(snapshot.priceLow)}～${wanLabel(snapshot.priceHigh)}｜月付 ${number.format(Math.round(snapshot.payLow))}～${number.format(Math.round(snapshot.payHigh))} 元</p>`;
const risk = isComfort
  ? ""
  : `<div class="afford-risk"><strong>${riskMessages[snapshot.mode].title}</strong><span>${riskMessages[snapshot.mode].note}</span></div>`;

card.innerHTML = `
  <div class="afford-summary-grid" aria-live="polite" aria-atomic="true">
    <div class="afford-summary-card"><span>${budgetLabel}</span><strong>${budgetValue}</strong></div>
    <div class="afford-summary-card"><span>${paymentLabel}</span><strong>${paymentValue}<small> 元／月</small></strong></div>
  </div>
  <div class="afford-runway__head"><b class="afford-runway__zone-text">${snapshot.zone}</b></div>
  <div class="afford-runway__track" role="img" aria-label="目前房價位於${snapshot.zone}區" style="--low:${snapshot.lowPercent}%;--high:${snapshot.highPercent}%;--marker:${snapshot.markerPercent}%;--selected:${snapshot.selectedPercent}%">
    <i class="afford-runway__marker" aria-hidden="true"></i>
    <em class="afford-runway__marker-label">目前房價 ${wanLabel(options.purchasePrice)}</em>
    ${selectedTick}
  </div>
  <div class="afford-runway__labels"><span>安心</span><span>剛好</span><span>挑戰</span></div>
  ${selectedStatus}
  <p class="afford-note">${messages[snapshot.zone]}</p>
  ${baseline}
  ${risk}
`;
```

空收入分支同步停用比例控制：

```js
if (snapshot.empty) {
  card.innerHTML = `<p class="afford-empty">填入每月薪水，就能看看目前房價落在你的哪一段預算跑道。</p>`;
  const burdenSlider = document.getElementById("loanAffordBurdenSlider");
  if (burdenSlider) burdenSlider.disabled = true;
  return;
}
```

- [ ] **Step 5: 新增共用重畫 helper 與比例滑桿事件**

在 `bindResultSalarySlider()` 前加入：

```js
function renderCurrentLoanAffordRunway(salary = value("loanSalary")) {
  renderAffordRunway("loanAffordRunwayVisual", {
    salary,
    annualRate: value("annualRate"),
    years: value("loanYears"),
    downPayment: Math.max(0, value("loanPurchasePrice") - value("loanAmount")),
    purchasePrice: value("loanPurchasePrice"),
    mode: loanAffordBurdenMode
  });
}

function bindResultAffordBurdenSlider() {
  const slider = document.getElementById("loanAffordBurdenSlider");
  const output = document.getElementById("loanAffordBurdenValue");
  if (!slider || !output) return;
  slider.addEventListener("input", () => {
    const index = clamp(Math.round(Number(slider.value) || 0), 0, AFFORD_BURDEN_STEPS.length - 1);
    loanAffordBurdenMode = AFFORD_BURDEN_STEPS[index];
    const label = AFFORD_BURDEN_OPTIONS[loanAffordBurdenMode].label;
    output.value = label;
    slider.setAttribute("aria-valuetext", label);
    renderCurrentLoanAffordRunway();
  });
}
```

將 `calculateLoan()` 完成結果模板後的跑道呼叫改為：

```js
renderCurrentLoanAffordRunway();
bindResultAffordBurdenSlider();
bindResultSalarySlider();
```

將 `bindResultSalarySlider()` 事件末端的 `renderAffordRunway(...)` 改成：

```js
renderCurrentLoanAffordRunway(salaryWan * 10000);
```

- [ ] **Step 6: 讓「重新試算」恢復舒適模式**

在 `restartGroup(group)` 的 `applyGroupDefaults(group)` 前加入：

```js
if (group === "loan") loanAffordBurdenMode = "comfort";
```

此狀態不得加入 `defaults.loan`、`saveValues()` 或 `localStorage` 資料。

- [ ] **Step 7: 加入雙摘要、比例滑桿、上限刻度與手機樣式**

在既有 `.afford-runway` CSS 區加入：

```css
.afford-burden-control {
  display: grid;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--consultant-line);
}

.afford-burden-control label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--consultant-navy);
  font-weight: 800;
}

.afford-burden-control output {
  color: var(--consultant-terracotta-dark);
  white-space: nowrap;
}

.afford-burden-slider {
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 0;
  accent-color: var(--consultant-terracotta-dark);
}

.afford-burden-slider:focus-visible {
  outline: 3px solid rgba(185, 80, 45, .3);
  outline-offset: 2px;
}

.afford-burden-labels {
  display: flex;
  justify-content: space-between;
  color: var(--consultant-muted);
  font-size: .68rem;
  font-weight: 800;
}

.afford-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.afford-summary-card {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--consultant-line);
  border-radius: 10px;
  background: rgba(255, 253, 247, .88);
}

.afford-summary-card span,
.afford-summary-card small {
  color: var(--consultant-muted);
  font-size: .7rem;
  font-weight: 750;
}

.afford-summary-card strong {
  display: block;
  margin-top: 4px;
  color: var(--consultant-navy);
  font-size: clamp(1.08rem, 2.4vw, 1.42rem);
  line-height: 1.18;
}

.afford-runway__selected-tick {
  position: absolute;
  left: var(--selected);
  top: -5px;
  width: 2px;
  height: 24px;
  background: var(--consultant-terracotta-dark);
  transform: translateX(-50%);
}

.afford-runway__selected-label {
  position: absolute;
  left: clamp(16%, var(--selected), 84%);
  top: 22px;
  color: var(--consultant-terracotta-dark);
  font-size: .66rem;
  font-style: normal;
  font-weight: 850;
  white-space: nowrap;
  transform: translateX(-50%);
}

.afford-baseline,
.afford-selected-status {
  margin: 0;
  color: var(--consultant-muted);
  font-size: .72rem;
  line-height: 1.5;
}

.afford-risk {
  display: grid;
  gap: 3px;
  padding: 10px 11px;
  border-left: 4px solid var(--consultant-terracotta-dark);
  border-radius: 8px;
  background: #fff3e8;
  color: #7c2d12;
  font-size: .72rem;
  line-height: 1.45;
}
```

在既有 `@media (max-width: 620px)` 內加入：

```css
.afford-summary-grid {
  grid-template-columns: 1fr;
}

.afford-summary-card strong {
  font-size: 1.18rem;
}

.afford-runway__selected-label {
  max-width: 84px;
  text-align: center;
  white-space: normal;
}
```

- [ ] **Step 8: 執行局部與完整自動測試**

```powershell
node --test tests/loan-affordability-burden-ratio.test.cjs tests/unified-calculator-polish.test.cjs tests/restart-and-wizard-validation.test.cjs
npm.cmd test
git diff --check
```

Expected: 局部與完整套件全部 PASS，`git diff --check` 無輸出；比例事件來源不包含貸款重算或貸款輸入寫入。

- [ ] **Step 9: 提交滑桿與結果介面**

```powershell
git add -- index.html tests/loan-affordability-burden-ratio.test.cjs
git commit -m "feat: add loan burden ratio slider"
```

---

### Task 3: 修正靜態 VPS 部署文件

**Files:**
- Modify: `DEPLOY.md`
- Modify: `tests/public-browser-access.test.cjs`

**Interfaces:**
- Consumes: 現行 VPS 站台 `calc.tainanwei.com`、Nginx root `/var/www/real-estate-calculator/current`、版本目錄 `/var/www/real-estate-calculator/releases/<release>`。
- Produces: 與實際架構一致的靜態發布、回復及驗證指令；明確保留 `tainanwei.service` inactive 與 8787 未監聽。

- [ ] **Step 1: 新增失敗中的部署文件合約測試**

在 `tests/public-browser-access.test.cjs` 讀取 `DEPLOY.md`，並加入：

```js
test("部署文件描述 Nginx 靜態版本發布且不要求 Node", () => {
  assert.match(deployMd, /calc\.tainanwei\.com/);
  assert.match(deployMd, /\/var\/www\/real-estate-calculator\/current/);
  assert.match(deployMd, /\/var\/www\/real-estate-calculator\/releases\/<release>/);
  assert.match(deployMd, /tainanwei\.service.*inactive/s);
  assert.match(deployMd, /8787.*未監聽/s);
  assert.doesNotMatch(deployMd, /這個工具需要 Node\.js 主機/);
  assert.doesNotMatch(deployMd, /Start command：`npm start`/);
});
```

若檔案目前只宣告 `indexHtml`、`landHtml`、`helperHtml`，在頂部加入：

```js
const deployMd = fs.readFileSync(path.join(__dirname, "..", "DEPLOY.md"), "utf8");
```

- [ ] **Step 2: 執行測試並確認舊 Node 文件造成失敗**

```powershell
node --test tests/public-browser-access.test.cjs
```

Expected: FAIL，原因包含找不到 Nginx 版本目錄、服務 inactive 與 8787 未監聽文字，且仍存在「需要 Node.js 主機」。

- [ ] **Step 3: 以目前靜態架構重寫 DEPLOY.md**

將文件改為以下內容：

```markdown
# calc.tainanwei.com 靜態部署說明

主計算器由 VPS 上的 Nginx 直接提供靜態檔案，不需要 Node.js 常駐服務。

## 正式環境

- 網域：`https://calc.tainanwei.com/`
- Nginx root：`/var/www/real-estate-calculator/current`
- 版本目錄：`/var/www/real-estate-calculator/releases/<release>`
- 部署紀錄：`/var/www/real-estate-calculator/deployments/<release>/deployment.txt`
- 舊的 `tainanwei.service` 必須保持 `inactive`。
- 8787 port 必須保持未監聽。

## 發布流程

1. 完成本機測試、桌機與手機瀏覽器驗證。
2. 用 Git commit 前 12 碼建立不可變版本目錄。
3. 上傳 `git archive`，解壓到新的 release 目錄。
4. 驗證 release 內容後，原子切換 `current` symlink。
5. 更新 Nginx 的 `X-Calculator-Release`，執行 `nginx -t` 後 reload。
6. 驗證正式網域版本標頭、HTML、桌機與手機畫面及 console。

## 回復

先用 `readlink -f /var/www/real-estate-calculator/current` 確認目前版本，再把 `current` 原子切回已驗證的前一版 release。更新 `X-Calculator-Release`、通過 `nginx -t` 並 reload 後，重新檢查正式網域。

## 本機預覽

`npm start` 只用於本機 HTTP 預覽與瀏覽器驗證，不代表正式環境需要 Node.js。
```

- [ ] **Step 4: 執行文件合約與完整測試**

```powershell
node --test tests/public-browser-access.test.cjs
npm.cmd test
git diff --check
```

Expected: 部署文件合約與完整測試全部 PASS，差異檢查無輸出。

- [ ] **Step 5: 提交部署文件修正**

```powershell
git add -- DEPLOY.md tests/public-browser-access.test.cjs
git commit -m "docs: document static calculator deployment"
```

---

### Task 4: 本機回歸、VPS 發布與正式站驗收

**Files:**
- Verify: `index.html`
- Verify: `land-increment-total.html`
- Verify: `tainan-land-value-helper.html`
- Verify: `tests/*.test.cjs`
- Verify: `docs/superpowers/specs/2026-08-06-loan-affordability-burden-ratio-design.md`
- Verify: `/etc/nginx/sites-enabled/calc.tainanwei.com` on `187.127.208.190`
- Create remotely: `/var/www/real-estate-calculator/releases/<release>`
- Create remotely: `/var/www/real-estate-calculator/deployments/<release>/deployment.txt`

**Interfaces:**
- Consumes: Tasks 1–3 的已提交 HEAD、SSH key `C:\Users\w\.ssh\id_ed25519_hostinger_vps`、VPS `root@187.127.208.190`。
- Produces: 新的不可變 release、原子更新的 `current` symlink、相符的 `X-Calculator-Release`、桌機／手機正式站驗證證據。

- [ ] **Step 1: 執行完成前自動驗證**

```powershell
npm.cmd test
git diff --check
git status -sb
git log -6 --oneline
```

Expected: 完整套件全部 PASS，`git diff --check` 無輸出；功能與部署文件已提交，只有既有未追蹤 `.superpowers/`，不得加入提交。

- [ ] **Step 2: 啟動本機 HTTP 預覽**

```powershell
npm.cmd start
```

使用 Codex 內建瀏覽器開啟 `http://127.0.0.1:8787/?v=loan-burden-local#loan`。輸入房價 1,500 萬、貸款 1,200 萬、利率 2.5%、30 年、無寬限期、月薪 6 萬，完成一般貸款精靈。

- [ ] **Step 3: 驗證本機桌機與手機互動**

在 `1054 × 1014`、`390 × 844`、`375 × 812`、`360 × 800` 逐一確認：

- 預設滑桿為舒適，顯示購屋預算約 `806～907 萬`、月付約 `20,000～24,000 元／月`。
- 5 成顯示購屋預算上限約 `1,059 萬`、月付約 `30,000 元／月`及「負擔偏高」。
- 6 成顯示購屋預算上限約 `1,211 萬`、月付約 `36,000 元／月`及「壓力高」。
- 7 成顯示購屋預算上限約 `1,363 萬`、月付約 `42,000 元／月`及「風險很高」。
- 主結果的實際每月月付在四個比例間都維持約 `$47,415`，貸款本金維持 1,200 萬。
- 調整月薪後保留目前負擔比例並更新兩個摘要；按「重新試算」後回到舒適。
- 跑道保留安心／剛好／挑戰的舒適判斷，並顯示所選比例上限及目前房價是否在上限內。
- `document.documentElement.scrollWidth === document.documentElement.clientWidth`。
- 滑桿可用方向鍵逐格移動，焦點可見，動態內容沒有重複朗讀整張卡。
- 瀏覽器 console error 為空。

再快速完成房地合一稅、買方費用與青安試算，確認三個結果頁可正常產生；三個公開 HTML 均未載入 LIFF。

- [ ] **Step 4: 發布前核對 VPS 仍為靜態架構**

```powershell
ssh -i "C:\Users\w\.ssh\id_ed25519_hostinger_vps" -o BatchMode=yes root@187.127.208.190 "set -eu; readlink -f /var/www/real-estate-calculator/current; systemctl is-active tainanwei.service || true; ss -ltnp '( sport = :8787 )'; nginx -t"
```

Expected: `current` 指向既有 release，`tainanwei.service` 輸出 `inactive`，8787 沒有 listener，`nginx -t` 成功。若其中任一邊界不符，停止發布並先回報，不自行啟動 Node。

- [ ] **Step 5: 建立版本封存並上傳 VPS**

```powershell
$release = (git rev-parse --short=12 HEAD).Trim()
$archive = Join-Path $env:TEMP "real-estate-calculator-$release.tar.gz"
git archive --format=tar.gz --output="$archive" HEAD index.html land-increment-total.html tainan-land-value-helper.html assets
scp -i "C:\Users\w\.ssh\id_ed25519_hostinger_vps" "$archive" "root@187.127.208.190:/tmp/real-estate-calculator-$release.tar.gz"
```

Expected: `$release` 為目前已驗證 commit 前 12 碼，封存與上傳成功。

- [ ] **Step 6: 建立不可變 release 並原子切換 current**

```powershell
$remote = @"
set -eu
release='$release'
base='/var/www/real-estate-calculator'
archive="/tmp/real-estate-calculator-$release.tar.gz"
release_dir="`$base/releases/`$release"
deploy_dir="`$base/deployments/`$release"
test ! -e "`$release_dir"
mkdir -p "`$release_dir" "`$deploy_dir"
tar -xzf "`$archive" -C "`$release_dir"
test -s "`$release_dir/index.html"
test -s "`$release_dir/land-increment-total.html"
test -s "`$release_dir/tainan-land-value-helper.html"
previous=`$(readlink -f "`$base/current")
nginx_site=`$(readlink -f /etc/nginx/sites-enabled/calc.tainanwei.com)
cp "`$nginx_site" "`$deploy_dir/nginx.before.conf"
sed -i -E "s/X-Calculator-Release \"[^\"]*\"/X-Calculator-Release \"`$release\"/" "`$nginx_site"
if ! nginx -t; then
  cp "`$deploy_dir/nginx.before.conf" "`$nginx_site"
  nginx -t
  exit 1
fi
ln -sfn "`$release_dir" "`$base/current.next"
mv -Tf "`$base/current.next" "`$base/current"
if ! systemctl reload nginx; then
  ln -sfn "`$previous" "`$base/current.rollback"
  mv -Tf "`$base/current.rollback" "`$base/current"
  cp "`$deploy_dir/nginx.before.conf" "`$nginx_site"
  nginx -t
  systemctl reload nginx
  exit 1
fi
printf 'release=%s\nprevious=%s\ndeployed_at=%s\n' "`$release" "`$previous" "`$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "`$deploy_dir/deployment.txt"
rm -f "`$archive"
"@
ssh -i "C:\Users\w\.ssh\id_ed25519_hostinger_vps" root@187.127.208.190 $remote
```

Expected: 新 release 建立完成，`current` 指向新目錄，Nginx 設定測試及 reload 成功，部署紀錄含新舊版本與 UTC 時間。

- [ ] **Step 7: 驗證正式站版本、靜態服務與功能 DOM**

```powershell
$release = (git rev-parse --short=12 HEAD).Trim()
curl.exe -fsSI "https://calc.tainanwei.com/?v=$release"
ssh -i "C:\Users\w\.ssh\id_ed25519_hostinger_vps" root@187.127.208.190 "set -eu; readlink -f /var/www/real-estate-calculator/current; cat /var/www/real-estate-calculator/deployments/$release/deployment.txt; systemctl is-active tainanwei.service || true; ss -ltnp '( sport = :8787 )'"
```

Expected: HTTP 200，`X-Calculator-Release: $release`，`current` 指向 `/var/www/real-estate-calculator/releases/$release`，Node service 仍 inactive，8787 仍無 listener。

用 Codex 內建瀏覽器開啟 `https://calc.tainanwei.com/?v=$release#loan`，在 `1054 × 1014` 與 `390 × 844` 重做舒適、5 成、6 成、7 成檢查；確認實際 DOM 存在 `loanAffordBurdenSlider`，數值與本機一致、無水平溢位、console error 為空。再確認 `land-increment-total.html?v=$release` 與 `tainan-land-value-helper.html?v=$release` 可直接開啟且未載入 LIFF。

- [ ] **Step 8: 完成後留下可回復證據**

```powershell
git status -sb
git log -6 --oneline
```

Expected: 本機功能檔與測試沒有未提交變更；回報新 release、前一版 release、測試通過數、桌機／手機驗證、正式站標頭、Node inactive 與 8787 未監聽。保留舊 release，不刪除任何版本。
