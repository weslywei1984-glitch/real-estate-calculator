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

test("不殘留舊版方案日期", () => {
  assert.doesNotMatch(html, /2026-06-17/);
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

test("青安計算使用政策核心與正式五階分段", () => {
  assert.match(html, /const youngPolicy = window\.YoungHousingLoan3/);
  assert.match(html, /start:\s*61,\s*end:\s*72/);
  assert.match(html, /start:\s*73,\s*end:\s*totalMonths/);
  assert.doesNotMatch(html, /start:\s*61,\s*end:\s*84/);
  assert.match(html, /youngGraceYears[^\n]+0,\s*5/);
  assert.match(html, /rateNumber\.format\(row\.annualRate\)/);
});

test("年限與基準利率改由正式政策自動套用", () => {
  assert.doesNotMatch(html, /id="youngLoanYears"/);
  assert.doesNotMatch(html, /id="youngBaseRate"/);
  assert.match(html, /youngPolicy\.loanYearsForAge\(age\)/);
  assert.match(html, /youngPolicy\.POLICY\.defaultBaseRate/);
});

test("方案摘要移除貸款額度條列與欄位說明", () => {
  assert.doesNotMatch(html, /<ol class="base-terms">/);
  assert.doesNotMatch(html, /id="youngDownPaymentFormula"/);
  assert.doesNotMatch(html, /貸款年限依年齡自動套用：/);
  assert.match(html, /youngPolicy\.calculateFinancing/);
});

test("申貸額度選單使用專屬字級並精簡資格結果", () => {
  assert.match(html, /#youngApplicantType\s*\{[^}]*font-size:/s);
  assert.doesNotMatch(html, /須為成年人/);
  assert.match(html, /eligibility\.checks\.ageLimit/);
  assert.match(html, /eligibility\.checks\.agePlusTerm/);
});

test("青安結果拆分總貸款、青安貸款與一般房貸", () => {
  assert.match(html, /const \{totalLoan, youngLoan, supplementalLoan, downPayment, loanLimit\}/);
  assert.match(html, /預估總貸款/);
  assert.match(html, /wanLine\("總貸款金額", totalLoan\)/);
  assert.match(html, /青安貸款本金/);
  assert.match(html, /一般房貸本金（利率 2\.5% 試算）/);
  assert.match(html, /GENERAL_LOAN_RATE = 2\.5/);
  assert.match(html, /calculateLoanSchedule\(\{[\s\S]{0,180}principal: supplementalLoan,[\s\S]{0,180}annualRate: GENERAL_LOAN_RATE/);
  assert.match(html, /combineLoanSummary\(youngSchedule, supplementalSchedule, monthlyIncome\)/);
});

test("拆分貸款時直接給出兩筆相加的合計", () => {
  // 相加的是「已四捨五入的兩個數」，否則畫面上的算式會差 1 元對不起來
  assert.match(html, /const sumDisplay = \(a, b\) => \{[\s\S]*?const x = Math\.round\(a\);[\s\S]*?const y = Math\.round\(b\);[\s\S]*?money\.format\(x \+ y\)/);
  assert.match(html, /graceStageDisplay = supplementalLoan > 0\s*\?\s*sumDisplay\(graceStagePayment, generalLoanPayment\)/);
  assert.match(html, /normalStageDisplay = supplementalLoan > 0\s*\?\s*sumDisplay\(firstNormalPayment, generalLoanPayment\)/);
});

test("明細不再重複列一般房貸月付", () => {
  assert.doesNotMatch(html, /<span>一般房貸月付<\/span>/);
});

test("五階段表格使用表格內標題，不再放大段說明", () => {
  assert.match(html, /<table class="amortization">\s*<caption class="amortization-caption">青安-五階段利率與月付<\/caption>/);
  assert.doesNotMatch(html, /<h3 class="table-title">青安-五階段利率與月付<\/h3>/);
  assert.doesNotMatch(html, /firstloan\.firstbank\.com\.tw/);
});

test("青安金額上色、寬限期後的「後」標紅", () => {
  assert.match(html, /<span class="amount-young">\$\{money\.format\(x\)\}<\/span> \+ /);
  assert.match(html, /youngOnly = amount => `<span class="amount-young">/);
  assert.match(html, /青安寬限期<b class="mark-after">後<\/b>月付/);

  // 要蓋過標籤用的 .metric span，且字級字重要跟 strong 一致
  assert.match(html, /\.metric strong \.amount-young\s*\{[^}]*color:\s*var\(--brand-terracotta\)/s);
  assert.match(html, /\.metric strong \.amount-young\s*\{[^}]*font-size:\s*inherit/s);
});

test("數字動畫不可清掉含標記的金額", () => {
  // animateResultNumbers 用 textContent 覆寫，會把上色 span 整個砍掉
  assert.match(html, /if \(el\.children\.length\) return;\s*const finalText = el\.textContent;/);
});

test("寬限期前後月付合併在同一區塊，資格檢核排在表格之後", () => {
  assert.match(html, /<span class="metric-split">青安寬限期/);
  assert.match(html, /innerHTML = eligible\s*\?\s*`\$\{calculationSections\}\$\{eligibilityBlock\}\$\{youngCostDetails\}`\s*:\s*eligibilityBlock/);
});

test("指定的大額金額欄位以萬元輸入並移除重複換算提示", () => {
  const wanFields = [
    "salePrice",
    "buyCost",
    "sellExpense",
    "landGain",
    "purchasePrice",
    "buyerDownPayment",
    "buildingValue",
    "landDeclaredValue",
    "loanPurchasePrice",
    "loanAmount",
    "loanDownPayment",
    "youngPurchasePrice",
    "youngDownPayment",
    "youngAnnualIncome",
    "youngMonthlyIncome"
  ];

  wanFields.forEach(id => {
    assert.match(html, new RegExp(`<input id="${id}"[^>]*data-money-unit="wan"[^>]*>`));
    assert.match(html, new RegExp(`<input id="${id}"[\\s\\S]{0,180}<span class="unit">萬元<\\/span>`));
  });

  assert.match(html, /el\.dataset\.moneyUnit === "wan"\s*\? numericValue \* 10000/);
  assert.match(html, /input\.dataset\.moneyUnit === "wan"\s*\? numericValue \/ 10000/);
  assert.match(html, /__moneyUnitVersion:\s*3/);
});

test("手機版青安方案摘要使用緊湊的兩欄排版", () => {
  const marker = html.indexOf("/* Compact mobile young-loan summary */");
  assert.ok(marker > -1, "應提供手機版青安摘要壓縮樣式");
  const compactCss = html.slice(marker, marker + 2400);

  assert.match(compactCss, /@media \(max-width: 620px\)/);
  assert.match(compactCss, /\.young-hero\s*\{[^}]*padding:\s*18px 16px 15px/s);
  assert.match(compactCss, /\.policy-stats\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(compactCss, /\.base-terms\s*\{[^}]*margin-top:\s*9px/s);
});
