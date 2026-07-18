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

test("方案摘要使用三點條列並顯示自備款公式", () => {
  assert.match(html, /<ol class="base-terms">/);
  assert.equal((html.match(/<li>/g) || []).length, 3);
  assert.match(html, /id="youngDownPaymentFormula"/);
  assert.match(html, /youngPolicy\.calculateFinancing/);
});
