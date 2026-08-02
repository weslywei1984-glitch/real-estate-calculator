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
