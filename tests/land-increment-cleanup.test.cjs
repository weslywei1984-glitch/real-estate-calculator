const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(
  path.join(__dirname, "..", "land-increment-total.html"),
  "utf8"
);

test("頁首不顯示品牌膠囊", () => {
  assert.doesNotMatch(html, /class="brand-line"/);
  assert.doesNotMatch(html, /\.brand-line(?:\s|\.)/);
});

test("輸入欄位不顯示步驟數字且內容填滿整列", () => {
  assert.doesNotMatch(html, /class="step-mark"/);
  assert.doesNotMatch(html, /\.step-mark(?:\s|\{)/);
  assert.match(
    html,
    /\.field-row\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/s
  );
  assert.doesNotMatch(html, /grid-template-columns:\s*(?:42|52)px\s+minmax\(0, 1fr\)/);
});

test("正數答案改為這塊土地估算漲了幾萬", () => {
  const match = html.match(/function formatWanAmount\(value\)\s*\{[\s\S]*?\n    \}/);
  assert.ok(match, "應提供萬元結果格式函式");
  const formatWanAmount = vm.runInNewContext(`(${match[0]})`);

  assert.equal(formatWanAmount(5920000), "592");
  assert.equal(formatWanAmount(12345), "1.2");
  assert.match(
    html,
    /els\.plainAnswer\.textContent = `這塊土地估算漲了 \$\{formatWanAmount\(increase\)\} 萬。`;/
  );
  assert.doesNotMatch(html, /答案是 .*這就是這塊土地估算漲了多少/);
});
