const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const indexHtml = read("index.html");
const landValueHtml = read("tainan-land-value-helper.html");
const landIncrementHtml = read("land-increment-total.html");

for (const [name, html] of [
  ["公告土地現值", landValueHtml],
  ["土地漲多少", landIncrementHtml]
]) {
  test(`${name}使用4合1核定主視覺與品牌色`, () => {
    assert.match(
      html,
      /class="brand-hero__mobile-art"[^>]*src="assets\/mobile-hero-exact\.jpg"[^>]*width="1787"[^>]*height="880"/
    );
    const marker = html.lastIndexOf("/* Consultant B shared tool theme */");
    assert.ok(marker > -1);
    const css = html.slice(marker, html.indexOf("</style>", marker));
    assert.match(css, /--consultant-cream:\s*#f3ead7/);
    assert.match(css, /--consultant-navy:\s*#102738/);
    assert.match(css, /--consultant-terracotta:\s*#b9502d/);
    assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*width:\s*100%[^}]*height:\s*auto/s);
    assert.match(css, /@media \(max-width:\s*620px\)/);
    assert.match(css, /:focus-visible/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
  });
}

test("新增的房地合一稅與買方費用欄位改用萬元輸入", () => {
  for (const [id, value] of [
    ["sellExpense", "0"],
    ["landGain", "0"],
    ["buildingValue", "100"],
    ["landDeclaredValue", "180"]
  ]) {
    assert.match(
      indexHtml,
      new RegExp(`<input id="${id}"[^>]*data-money-unit="wan"[^>]*step="0\\.1"[^>]*value="${value}"[^>]*>`)
    );
    assert.match(indexHtml, new RegExp(`<input id="${id}"[\\s\\S]{0,180}<span class="unit">萬元<\\/span>`));
  }
});

test("萬元欄位第三版會遷移舊的元資料", () => {
  assert.match(indexHtml, /const NEW_WAN_FIELD_IDS = new Set\(\["sellExpense", "landGain", "buildingValue", "landDeclaredValue"\]\);/);
  assert.match(indexHtml, /moneyUnitVersion < 3 && NEW_WAN_FIELD_IDS\.has\(id\)/);
  assert.match(indexHtml, /parseNumericValue\(saved\) \/ 10000/);
  assert.match(indexHtml, /__moneyUnitVersion:\s*3/);
});

test("房地合一稅結果全部以萬元顯示", () => {
  assert.match(indexHtml, /wanMetric\("預估應納房地合一稅", tax, "main"\)/);
  for (const label of [
    "出售成交價額",
    "減：取得成本",
    "減：取得、改良與移轉費用",
    "減：土地漲價總數額",
    "課稅所得稅基",
    "自住房地免稅額",
    "出售稅後淨利"
  ]) {
    assert.match(indexHtml, new RegExp(`wanLine\\("${label}"`));
  }
});

test("房貸概算先無條件進位到千元再顯示約幾萬", () => {
  const start = indexHtml.indexOf("function ceilToThousand");
  const end = indexHtml.indexOf("function taxRate", start);
  assert.ok(start > -1 && end > start, "應提供房貸概算格式函式");

  const sandbox = {
    number: new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 2 })
  };
  vm.runInNewContext(indexHtml.slice(start, end), sandbox);

  assert.equal(sandbox.ceilToThousand(5069223), 5070000);
  assert.equal(sandbox.ceilToThousand(47415), 48000);
  assert.equal(sandbox.ceilToThousand(-50001), -51000);
  assert.equal(sandbox.ceilToThousand(Number.POSITIVE_INFINITY), 0);
  assert.equal(sandbox.ceilToThousand(8.606511983089149e-7), 0);
  assert.equal(sandbox.approxWanAmount(5069223), "約 507 萬");
  assert.equal(sandbox.approxWanAmount(47415), "約 4.8 萬");
  assert.equal(sandbox.approxWanAmount(12000000), "約 1,200 萬");
  assert.equal(sandbox.approxWanAmount(0), "約 0 萬");
  assert.equal(sandbox.approxWanRange(47415, 48301), "約 4.8～4.9 萬");
});

test("房貸摘要與攤還表使用約幾萬格式", () => {
  assert.match(indexHtml, /<span>總利息與月付範圍<\/span>\s*<strong>\$\{approxWanAmount\(totalInterest\)\}<\/strong>/);
  for (const expression of [
    'approxWanLine("貸款本金", principal)',
    'approxWanLine("還款總額", principal + totalInterest)',
    'approxWanLine("最高月付", maxPayment)',
    'approxWanLine("最低月付", Number.isFinite(minPayment) ? minPayment : 0)'
  ]) {
    assert.ok(indexHtml.includes(expression), `缺少 ${expression}`);
  }
  assert.match(indexHtml, /const paymentText = approxWanRange\(periodMin, periodMax\)/);
  assert.match(indexHtml, /<td>\$\{approxWanAmount\(principalPaid\)\}<\/td>/);
  assert.match(indexHtml, /<td>\$\{approxWanAmount\(interestPaid\)\}<\/td>/);
  assert.match(indexHtml, /<td>\$\{approxWanAmount\(endingBalance\)\}<\/td>/);
});

test("青安摘要依序顯示購屋總價、總貸款與自備款，說明在三卡下方", () => {
  assert.match(
    indexHtml,
    /<div class="young-summary-row">\s*\$\{wanMetric\("購屋總價", purchasePrice, "main young-purchase-price"\)\}\s*\$\{wanMetric\("預估總貸款", totalLoan, "young-total-loan"\)\}\s*\$\{wanMetric\("預估自備款", downPayment, "young-down-payment"\)\}/
  );
  assert.match(indexHtml, /class="metric warn young-summary-note"/);
  assert.match(indexHtml, /\.young-summary-row\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(indexHtml, /\.young-summary-row \.young-summary-note\s*\{[^}]*grid-column:\s*1 \/ -1/s);
  assert.match(indexHtml, /\.young-summary-row \.metric strong\s*\{[^}]*font-size:\s*clamp\([^}]*white-space:\s*nowrap/s);
});

test("青安總利息顯示動態年限約數並移除本息合計", () => {
  assert.ok(indexHtml.includes('approxWanLine(`${loanYears} 年預估總利息`, totalInterest)'));
  assert.doesNotMatch(indexHtml, /wanLine\("青安本息合計"/);
  assert.match(indexHtml, /<th>利息<\/th>/);
});

test("青安月付算式維持單行且五階段標題放進表格", () => {
  assert.match(indexHtml, /<strong class="young-payment-equation">\$\{graceStageDisplay\}<\/strong>/);
  assert.match(indexHtml, /<strong class="young-payment-equation">\$\{normalStageDisplay\}<\/strong>/);
  assert.match(indexHtml, /\.metric strong\.young-payment-equation\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(indexHtml, /<caption class="amortization-caption">青安-五階段利率與月付<\/caption>/);
  assert.doesNotMatch(indexHtml, /<h3 class="table-title">青安-五階段利率與月付<\/h3>/);
});

test("青安結果頁返回按鈕顯示上一頁", () => {
  assert.match(
    indexHtml,
    /back\.textContent = index === steps\.length - 1\s*\? \(workspace\.dataset\.wizard === "young" \? "上一頁" : "重新調整"\)\s*:\s*"上一步";/
  );
});
