const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "tainan-land-value-helper.html"), "utf8");

function loadMetricsFunction() {
  const match = html.match(/function calculateLandValueMetrics\(area, current, previous\) \{[\s\S]*?\n    \}/);
  assert.ok(match, "missing pure land value conversion helper");
  const context = {};
  vm.runInNewContext(`${match[0]}; this.calculateLandValueMetrics = calculateLandValueMetrics;`, context);
  return context.calculateLandValueMetrics;
}

test("per-square-meter land values convert to per-ping values by division", () => {
  const metrics = loadMetricsFunction()(43, 29600, 6800);

  assert.ok(Math.abs(metrics.currentPing - 97851.23966942148) < 0.000001);
  assert.ok(Math.abs(metrics.previousPing - 22479.338842975205) < 0.000001);
  assert.equal(metrics.currentTotal, 1272800);
  assert.equal(metrics.previousTotal, 292400);
  assert.equal(metrics.gainTotal, 980400);
});

test("land helper explains the corrected units and no longer multiplies by 0.3025", () => {
  assert.match(html, /每平方公尺金額 ÷ 0\.3025/);
  assert.doesNotMatch(html, /(?:current|previous) \* 0\.3025/);
  assert.match(html, />公告土地現值總額</);
  assert.match(html, />前次移轉現值總額</);
});

test("missing previous transfer value is shown as pending instead of a fake gain", () => {
  assert.match(html, /const hasPrevious = String\(els\.previousValue\.value \|\| ""\)\.trim\(\) !== ""/);
  assert.match(html, /els\.previousTotalOut\.textContent = hasPrevious \? formatMoney\(previousTotal\) : "尚未填寫"/);
  assert.match(html, /els\.gainTotalOut\.textContent = hasPrevious \? formatSignedMoney\(gainTotal\) : "尚未計算"/);
  assert.match(html, /hasPrevious \? `土地價格差額：約 \$\{formatSignedMoney\(gainTotal\)\}` : "土地價格差額：尚未計算"/);
});
