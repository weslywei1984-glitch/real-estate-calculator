# 青安貸款 3.0 更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將現有新青安 2.0 研議情境完整替換為行政院正式公布的青安貸款 3.0 試算，並保留既有頁面操作與品牌版型。

**Architecture:** 把青安 3.0 的政策常數、資格判斷與利率階段抽成可同時被瀏覽器及 Node.js 測試載入的純 JavaScript 模組，`index.html` 只負責欄位連動、格式化與結果渲染。先用 Node 內建測試鎖定政策邊界，再更新現有青安分頁，最後用 Codex 內建瀏覽器做桌面、手機與 console 回歸。

**Tech Stack:** 靜態 HTML/CSS/JavaScript、Node.js 20+、`node:test`、Codex 內建瀏覽器、GitHub Pages。

## Global Constraints

- 以行政院 2026 年 7 月 16 日公告與同頁官方懶人包為唯一青安 3.0 規則來源。
- 申辦期間固定顯示 2026 年 8 月 1 日至 2029 年 7 月 31 日。
- 不保留青安 2.0 模式，不新增銀行比較、即時牌價、代辦或其他頁面模組。
- 保留現有品牌版型、即時計算、清空、套用範例、複製結果、存成圖片與手機版流程。
- 不修改房地合一稅、買方費用、一般貸款、土地公告現值與土地漲價總數額的行為。
- 正式核貸結果仍以公股銀行徵審為準。

---

### Task 1: 建立可測試的青安 3.0 政策核心

**Files:**
- Create: `assets/young-housing-loan-3.js`
- Create: `tests/young-housing-loan-3-policy.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: 青安 3.0 官方額度、房價上限、年齡、所得與補貼規則。
- Produces: `YoungHousingLoan3.POLICY`、`getLoanLimit(type)`、`getPriceCap(region)`、`subsidyAtMonth(month)`、`rateAtMonth(baseRate, month)`、`evaluateEligibility(input)`。

- [ ] **Step 1: 寫入會先失敗的政策測試**

在 `package.json` 的 `scripts` 加入：

```json
"test": "node --test tests/*.test.cjs"
```

建立 `tests/young-housing-loan-3-policy.test.cjs`：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../assets/young-housing-loan-3.js");

test("三種申請身分使用正確額度", () => {
  assert.equal(policy.getLoanLimit("general"), 10_000_000);
  assert.equal(policy.getLoanLimit("newlywed"), 12_000_000);
  assert.equal(policy.getLoanLimit("children"), 15_000_000);
});

test("三組區域使用正確房價上限", () => {
  assert.equal(policy.getPriceCap("taipei"), 35_000_000);
  assert.equal(policy.getPriceCap("newTaipeiHsinchu"), 25_000_000);
  assert.equal(policy.getPriceCap("other"), 20_000_000);
});

test("六年補貼在正確月份切換", () => {
  assert.equal(policy.subsidyAtMonth(36), 0.5);
  assert.equal(policy.subsidyAtMonth(37), 0.375);
  assert.equal(policy.subsidyAtMonth(48), 0.375);
  assert.equal(policy.subsidyAtMonth(49), 0.25);
  assert.equal(policy.subsidyAtMonth(60), 0.25);
  assert.equal(policy.subsidyAtMonth(61), 0.125);
  assert.equal(policy.subsidyAtMonth(72), 0.125);
  assert.equal(policy.subsidyAtMonth(73), 0);
});

test("基準利率 2.275 產生五階正式試算利率", () => {
  assert.equal(policy.rateAtMonth(2.275, 1), 1.775);
  assert.equal(policy.rateAtMonth(2.275, 37), 1.9);
  assert.equal(policy.rateAtMonth(2.275, 49), 2.025);
  assert.equal(policy.rateAtMonth(2.275, 61), 2.15);
  assert.equal(policy.rateAtMonth(2.275, 73), 2.275);
});

test("補貼後利率不會低於零", () => {
  assert.equal(policy.rateAtMonth(0.3, 1), 0);
});

const validInput = {
  age: 40,
  loanYears: 40,
  annualIncome: 2_000_000,
  purchasePrice: 20_000_000,
  region: "other",
  noHome: true,
  selfUse: true,
  firstUse: true
};

test("資格上限等於門檻時仍符合", () => {
  assert.equal(policy.evaluateEligibility(validInput).eligible, true);
});

test("50 歲、所得超過一元或房價超過一元時不符合", () => {
  assert.equal(policy.evaluateEligibility({...validInput, age: 50}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, annualIncome: 2_000_001}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, purchasePrice: 20_000_001}).eligible, false);
});

test("任一自住資格未勾選時不符合", () => {
  assert.equal(policy.evaluateEligibility({...validInput, noHome: false}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, selfUse: false}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, firstUse: false}).eligible, false);
});
```

- [ ] **Step 2: 執行測試並確認 RED**

Run: `npm.cmd test`

Expected: FAIL，訊息包含 `Cannot find module '../assets/young-housing-loan-3.js'`。

- [ ] **Step 3: 實作最小政策模組**

建立 `assets/young-housing-loan-3.js`：

```js
(function attachYoungHousingLoan3(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.YoungHousingLoan3 = api;
})(typeof globalThis === "object" ? globalThis : this, function createPolicy() {
  const POLICY = Object.freeze({
    applicationPeriod: "2026/8/1～2029/7/31",
    maxLtv: 80,
    maxLoanYears: 40,
    maxGraceYears: 5,
    minAge: 18,
    maxAgeExclusive: 50,
    maxAgePlusTerm: 80,
    maxAnnualIncome: 2_000_000,
    defaultBaseRate: 2.275,
    loanLimits: Object.freeze({general: 10_000_000, newlywed: 12_000_000, children: 15_000_000}),
    priceCaps: Object.freeze({taipei: 35_000_000, newTaipeiHsinchu: 25_000_000, other: 20_000_000})
  });

  function getLoanLimit(type) {
    return POLICY.loanLimits[type] || POLICY.loanLimits.general;
  }

  function getPriceCap(region) {
    return POLICY.priceCaps[region] || POLICY.priceCaps.other;
  }

  function subsidyAtMonth(month) {
    if (month <= 36) return 0.5;
    if (month <= 48) return 0.375;
    if (month <= 60) return 0.25;
    if (month <= 72) return 0.125;
    return 0;
  }

  function rateAtMonth(baseRate, month) {
    return Math.max(0, Number((baseRate - subsidyAtMonth(month)).toFixed(3)));
  }

  function evaluateEligibility(input) {
    const priceCap = getPriceCap(input.region);
    const checks = {
      adult: input.age >= POLICY.minAge,
      ageLimit: input.age < POLICY.maxAgeExclusive,
      agePlusTerm: input.age + input.loanYears <= POLICY.maxAgePlusTerm,
      income: input.annualIncome <= POLICY.maxAnnualIncome,
      price: input.purchasePrice <= priceCap,
      noHome: Boolean(input.noHome),
      selfUse: Boolean(input.selfUse),
      firstUse: Boolean(input.firstUse)
    };
    return {eligible: Object.values(checks).every(Boolean), checks, priceCap};
  }

  return {POLICY, getLoanLimit, getPriceCap, subsidyAtMonth, rateAtMonth, evaluateEligibility};
});
```

- [ ] **Step 4: 執行測試並確認 GREEN**

Run: `npm.cmd test`

Expected: 全部 tests PASS，0 FAIL。

- [ ] **Step 5: 提交政策核心**

```powershell
git add -- package.json assets/young-housing-loan-3.js tests/young-housing-loan-3-policy.test.cjs
git commit -m "feat: add young housing loan 3 policy core"
```

---

### Task 2: 用測試鎖定青安 3.0 介面文案與欄位

**Files:**
- Create: `tests/young-housing-loan-3-markup.test.cjs`
- Modify: `index.html:2139,2467-2605,2618-2624,2682-2697`

**Interfaces:**
- Consumes: Task 1 的 `assets/young-housing-loan-3.js` 與設計規格。
- Produces: 青安 3.0 分頁、三種身分類型、三組區域、自住資格欄位及官方來源連結。

- [ ] **Step 1: 寫入會先失敗的靜態介面測試**

建立 `tests/young-housing-loan-3-markup.test.cjs`：

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const html = fs.readFileSync("index.html", "utf8");

test("頁面載入青安 3.0 政策模組", () => {
  assert.match(html, /assets\/young-housing-loan-3\.js/);
});

test("青安分頁使用正式 3.0 文案", () => {
  assert.match(html, />青安貸款 3\.0</);
  assert.match(html, /2026\/8\/1～2029\/7\/31/);
  assert.doesNotMatch(html, /新青安 2\.0|研議規則情境試算|尚待行政院核定/);
});

test("介面提供三種額度與三組區域", () => {
  assert.match(html, /value="general"/);
  assert.match(html, /value="newlywed"/);
  assert.match(html, /value="children"/);
  assert.match(html, /value="taipei"/);
  assert.match(html, /value="newTaipeiHsinchu"/);
  assert.match(html, /value="other"/);
});

test("資格欄位拆分無房、自住與限貸一次", () => {
  assert.match(html, /id="youngNoHome"/);
  assert.match(html, /id="youngSelfUse"/);
  assert.match(html, /id="youngFirstUse"/);
  assert.doesNotMatch(html, /id="youngNationality"/);
});

test("移除自訂房價上限並更新官方來源", () => {
  assert.doesNotMatch(html, /id="youngPriceCap"/);
  assert.match(html, /1cb37b62-d127-4876-9cce-95016f49bcbe/);
});
```

- [ ] **Step 2: 執行測試並確認 RED**

Run: `npm.cmd test`

Expected: 政策測試通過，markup tests 因仍有 2.0 文案與舊欄位而 FAIL。

- [ ] **Step 3: 更新青安分頁 HTML 與預設值**

在主 inline script 前加入：

```html
<script src="assets/young-housing-loan-3.js"></script>
```

將青安分頁與標題改為「青安貸款 3.0」，政策摘要改為「六年 3+3 補貼」、「未滿 50 歲與 80 條款」、「年所得不超過 200 萬」、「區域房價上限」，並顯示 `2026/8/1～2029/7/31`。

資格區改為：

```html
<label class="eligibility-item">
  <input id="youngNoHome" type="checkbox" checked>
  <span><b>無自有住宅</b><small>本人、配偶及未成年子女均無自有住宅。</small></span>
</label>
<label class="eligibility-item">
  <input id="youngSelfUse" type="checkbox" checked>
  <span><b>自住使用</b><small>購屋供自住，並願意提供自住切結書。</small></span>
</label>
<label class="eligibility-item">
  <input id="youngFirstUse" type="checkbox" checked>
  <span><b>限貸一次</b><small>借款人僅能申請一次青安優惠貸款。</small></span>
</label>
```

身分類型改為：

```html
<option value="general" selected>一般申請（最高 1,000 萬）</option>
<option value="newlywed">新婚 2 年內（最高 1,200 萬）</option>
<option value="children">育有未成年子女（最高 1,500 萬）</option>
```

區域改為：

```html
<option value="taipei">臺北市（上限 3,500 萬）</option>
<option value="newTaipeiHsinchu">新北市及新竹縣市（上限 2,500 萬）</option>
<option value="other" selected>其他縣市（上限 2,000 萬）</option>
```

刪除 `youngPriceCap` 欄位，將 `youngGraceYears` 的 `max` 與預設值改為 `5`，將 `youngBaseRate` 預設值改為 `2.275`。`defaults.young` 同步加入 `youngSelfUse: true`、刪除 `youngNationality` 與 `youngPriceCap`，更新寬限期及利率預設值。

頁尾來源改成行政院正式公告與懶人包，不再顯示舊新聞及「尚待核定」。

- [ ] **Step 4: 執行測試並確認 GREEN**

Run: `npm.cmd test`

Expected: policy 與 markup tests 全部 PASS。

- [ ] **Step 5: 提交青安 3.0 介面**

```powershell
git add -- index.html tests/young-housing-loan-3-markup.test.cjs
git commit -m "feat: replace young housing loan 2 interface"
```

---

### Task 3: 將試算公式與欄位連動接到正式政策核心

**Files:**
- Modify: `index.html:3035-3205,3501-3542`
- Modify: `tests/young-housing-loan-3-markup.test.cjs`

**Interfaces:**
- Consumes: `YoungHousingLoan3.getLoanLimit`、`getPriceCap`、`rateAtMonth`、`evaluateEligibility`。
- Produces: 青安 3.0 正確貸款本金、自備款、資格結果、五階月付、利息與本金餘額。

- [ ] **Step 1: 增加計算整合的失敗測試**

在 `tests/young-housing-loan-3-markup.test.cjs` 加入：

```js
test("青安計算使用政策核心與正式五階分段", () => {
  assert.match(html, /const youngPolicy = window\.YoungHousingLoan3/);
  assert.match(html, /start:\s*61,\s*end:\s*72/);
  assert.match(html, /start:\s*73,\s*end:\s*totalMonths/);
  assert.doesNotMatch(html, /start:\s*61,\s*end:\s*84/);
  assert.match(html, /youngGraceYears[^\n]+0,\s*5/);
});
```

- [ ] **Step 2: 執行測試並確認 RED**

Run: `npm.cmd test`

Expected: `青安計算使用政策核心與正式五階分段` FAIL，因 `index.html` 仍使用舊的 61～84 期分段且尚未載入 `youngPolicy`。

- [ ] **Step 3: 更新 `calculateYoung()` 與欄位連動**

在 `index.html` 使用 Task 1 已通過測試的政策核心：

```js
const youngPolicy = window.YoungHousingLoan3;

function youngSubsidyAtMonth(month) {
  return youngPolicy.subsidyAtMonth(month);
}

function youngRateAtMonth(baseRate, month) {
  return youngPolicy.rateAtMonth(baseRate, month);
}

function youngLoanLimit() {
  return youngPolicy.getLoanLimit(selectValue("youngApplicantType"));
}
```

在 `calculateYoung()` 中使用：

```js
const loanLimit = youngPolicy.getLoanLimit(applicantType);
const applicantLabels = {
  general: "一般申請",
  newlywed: "新婚 2 年內家庭",
  children: "育有未成年子女家庭"
};
const applicantTypeLabel = applicantLabels[applicantType];
const graceMonths = Math.min(totalMonths - 1, Math.round(clamp(value("youngGraceYears"), 0, 5) * 12));
const eligibility = youngPolicy.evaluateEligibility({
  age,
  loanYears: totalMonths / 12,
  annualIncome,
  purchasePrice,
  region: priceTier,
  noHome: value("youngNoHome"),
  selfUse: value("youngSelfUse"),
  firstUse: value("youngFirstUse")
});
```

資格明細依 `eligibility.checks` 顯示成年、未滿 50 歲、80 條款、所得上限、區域房價上限、無房、自住及限貸一次。整體結果使用 `eligibility.eligible`，不符合時仍輸出月付與利息。

五階段改為：

```js
const youngStages = [
  {start: 1, end: 36, label: "第 1～36 期"},
  {start: 37, end: 48, label: "第 37～48 期"},
  {start: 49, end: 60, label: "第 49～60 期"},
  {start: 61, end: 72, label: "第 61～72 期"},
  {start: 73, end: totalMonths, label: `第 73～${totalMonths} 期`}
];
```

刪除 `youngPriceTier` 變更時寫入 `youngPriceCap` 的事件；區域變更只呼叫 `scheduleGroup("young")`。身分類型變更繼續重算貸款上限與自備款。

- [ ] **Step 4: 執行所有 Node 測試與語法檢查**

Run: `npm.cmd test`

Expected: 全部 PASS。

Run:

```powershell
@'
const fs = require("fs");
const html = fs.readFileSync("index.html", "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
for (const [, source] of scripts) if (source.trim()) new Function(source);
console.log(`inline scripts=${scripts.length} syntax=ok`);
'@ | node -
```

Expected: `syntax=ok`，exit code 0。

- [ ] **Step 5: 提交正式計算整合**

```powershell
git add -- index.html tests/young-housing-loan-3-markup.test.cjs
git commit -m "feat: calculate young housing loan 3 scenarios"
```

---

### Task 4: 瀏覽器回歸、手機驗證與發布

**Files:**
- Modify only if verification finds an in-scope defect: `index.html`, `assets/young-housing-loan-3.js`, `tests/*.test.cjs`

**Interfaces:**
- Consumes: 完整青安 3.0 靜態頁面與 Node 測試。
- Produces: 桌面與手機均可操作、console 無錯誤、GitHub Pages 已更新的公開版本。

- [ ] **Step 1: 啟動本機伺服器並確認 HTTP 200**

Run:

```powershell
Start-Process -FilePath node -ArgumentList 'tainan-land-value-server.js' -WorkingDirectory (Get-Location) -WindowStyle Hidden
Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8787/index.html'
```

Expected: HTTP status 200。

- [ ] **Step 2: 使用 Codex 內建瀏覽器驗證桌面版**

在 `http://127.0.0.1:8787/index.html` 開啟「青安貸款 3.0」分頁並驗證：

- 三種申請身分各自套用 1,000／1,200／1,500 萬上限。
- 三組區域分別套用 3,500／2,500／2,000 萬總價門檻。
- 所得 2,000,000 元符合，2,000,001 元不符合。
- 年齡 49 歲符合年齡限制，50 歲不符合。
- 寬限期可輸入 5，輸入 6 顯示欄位驗證錯誤。
- 基準利率 2.275% 的五階段為 1.775%、1.900%、2.025%、2.150%、2.275%。
- 清空、套用範例、複製結果、存成圖片可操作。
- console errors 與 warnings 均為 0。

- [ ] **Step 3: 驗證手機版與其他分頁回歸**

將瀏覽器 viewport 設為 390×844，確認青安欄位、結果卡與五階表格可讀且沒有水平破版；再切換房地合一稅、買方費用及貸款計算，確認現有結果仍正常。完成後重設 viewport。

- [ ] **Step 4: 執行最終驗證**

Run:

```powershell
npm.cmd test
git diff --check
git status --short
```

Expected: 測試全數通過、`git diff --check` 無錯誤；`tools/` 仍保持未追蹤且未納入提交。

- [ ] **Step 5: 提交驗證修正並推送**

若瀏覽器驗證產生修正：

```powershell
git add -- index.html assets/young-housing-loan-3.js tests package.json
git commit -m "fix: polish young housing loan 3 interactions"
```

推送：

```powershell
git push origin main
```

- [ ] **Step 6: 確認 GitHub Pages 部署與線上結果**

Run:

```powershell
$latestRun = gh run list --branch main --limit 1 --json databaseId,status,conclusion,headSha | ConvertFrom-Json
if ($latestRun.status -ne 'completed') { gh run watch $latestRun.databaseId --exit-status }
gh run view $latestRun.databaseId --json status,conclusion,url,headSha
```

Expected: `status` 為 `completed`、`conclusion` 為 `success`，`headSha` 等於本次推送提交。最後以 Codex 內建瀏覽器重新開啟公開頁面，確認標題、三類額度、五階利率及 console 狀態與本機一致。
