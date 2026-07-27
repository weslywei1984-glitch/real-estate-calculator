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

test("主視覺資料基準同步正式方案發布日", () => {
  assert.match(html, /class="brand-hero__baseline"[\s\S]*class="hero-data-date"[^>]*>2026-07-16<\/time>/);
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

test("方案摘要只保留貸款額度並移除欄位說明", () => {
  assert.match(html, /<ol class="base-terms">/);
  assert.equal((html.match(/<li>/g) || []).length, 1);
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

test("青安結果拆分總貸款、青安貸款與其他貸款", () => {
  assert.match(html, /const \{totalLoan, youngLoan, supplementalLoan, downPayment, loanLimit\}/);
  assert.match(html, /預估總貸款/);
  assert.match(html, /line\("總貸款金額", totalLoan\)/);
  assert.match(html, /青安貸款本金/);
  assert.match(html, /其他貸款（月付另行核算）/);
  assert.match(html, /其他貸款.*未併入本表/);
});

test("指定的大額金額欄位以萬元輸入並移除重複換算提示", () => {
  const wanFields = [
    "salePrice",
    "buyCost",
    "purchasePrice",
    "buyerDownPayment",
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
  assert.match(html, /__moneyUnitVersion:\s*2/);
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
