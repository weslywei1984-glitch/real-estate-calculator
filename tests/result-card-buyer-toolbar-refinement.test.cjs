const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const landHtml = fs.readFileSync(path.join(root, "land-increment-total.html"), "utf8");

test("買方第二步先顯示房屋評定現值，再顯示貸款選項", () => {
  const building = indexHtml.indexOf('<label for="buildingValue">房屋評定現值／契價</label>');
  const mortgage = indexHtml.indexOf('<label>抵押權設定金額倍率</label>');
  const land = indexHtml.indexOf('<label for="landDeclaredValue">土地申報地價總額</label>');
  assert.ok(building > -1 && mortgage > building && land > mortgage);
});

test("買方第二步使用核准的貸款與查詢文案", () => {
  assert.match(indexHtml, /data-value="1\.2">銀行貸款<\/button>/);
  assert.match(indexHtml, /data-value="0">不用貸款<\/button>/);
  assert.match(indexHtml, /<input id="mortgageSettingRatio" type="hidden" value="1\.2">/);
  assert.match(indexHtml, /填房屋稅單的「課稅現值」<\/div>/);
  assert.match(indexHtml, /填公告地價 × 持有面積（m²）<\/div>/);
  assert.match(indexHtml, /查完資料後回填－土地申報地價總額/);
  assert.doesNotMatch(indexHtml, /下面自動算(?:契稅|買賣登記規費)/);
});

test("房地合一稅結果加上約字並縮減主卡留白", () => {
  assert.match(indexHtml, /<strong>約 \$\{wanAmount\(tax\)\}<\/strong>/);
  assert.match(indexHtml, /\.metric\.main\.tax-result-hero\s*\{[^}]*padding:\s*12px 16px/is);
  assert.match(indexHtml, /@media \(max-width:\s*620px\)[\s\S]*?\.tax-result-rate\s*\{[^}]*border-top:\s*1px solid/is);
});

test("土地漲價操作列桌機四顆同排、手機兩欄", () => {
  assert.match(landHtml, /\.actions\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*\.7fr \.9fr 1\.35fr 1\.35fr;/s);
  assert.match(landHtml, /@media \(max-width:\s*620px\)[\s\S]*?\.actions\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(landHtml, /class="btn secondary action-reset" id="resetBtn"/);
  assert.match(landHtml, /class="btn primary action-sample" id="sampleBtn"/);
  assert.match(landHtml, /class="btn secondary action-home" href="index\.html"/);
  assert.match(landHtml, /class="btn ghost action-land" href="tainan-land-value-helper\.html"/);
});

test("土地漲價操作列使用湖水綠、琥珀與米白配色", () => {
  assert.match(landHtml, /\.action-sample\s*\{[^}]*background:\s*#e0a63b;[^}]*color:\s*#102738;/s);
  assert.match(landHtml, /\.action-land\s*\{[^}]*background:\s*#164d5c;[^}]*color:\s*#fffaf0;/s);
  assert.match(landHtml, /\.action-home\s*\{[^}]*border-color:\s*#164d5c;[^}]*color:\s*#164d5c;/s);
});
