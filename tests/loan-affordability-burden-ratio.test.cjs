const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function loadAffordabilityModel() {
  const start = html.indexOf("function affordabilitySnapshot");
  const end = html.indexOf("function renderAffordRunway", start);
  assert.ok(start > -1 && end > start, "房貸負擔率模型區塊存在");
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

test("舒適模式維持原本三分之一到四成的試算範圍", () => {
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

test("5 成、6 成、7 成模式依負擔率計算選取月付與房價", () => {
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

test("無效模式回到舒適模式，無薪資維持空狀態", () => {
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
