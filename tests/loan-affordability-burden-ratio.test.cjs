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
    loanCapacityFromPayment: payment => payment * 300,
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

test("renders discrete burden choices and the two-value runway summary", () => {
  assert.match(html, /id="loanAffordBurdenSlider"[^>]*type="range"[^>]*min="0"[^>]*max="3"[^>]*step="1"/);
  assert.match(html, /aria-label="設定每月房貸占月薪比例"/);
  assert.match(html, /<span>月付負擔上限<\/span>/);
  assert.match(html, /id="loanAffordBurdenValue"/);
  assert.match(html, /<span>舒適<\/span>\s*<span>5 成<\/span>\s*<span>6 成<\/span>\s*<span>7 成<\/span>/);
  assert.match(html, /class="afford-summary-grid"/);
  assert.match(html, /購屋預算上限/);
  assert.match(html, /const paymentLabel = isComfort \? "舒適月付試算" : "月付試算";/);
  assert.match(html, /舒適參考：/);
});

test("includes risk copy for each non-comfort burden mode", () => {
  assert.match(html, /5 成｜負擔偏高/);
  assert.match(html, /請預留生活費、利率上升與緊急支出。/);
  assert.match(html, /6 成｜壓力高/);
  assert.match(html, /請確認其他固定支出及緊急預備金是否足夠。/);
  assert.match(html, /7 成｜風險很高/);
  assert.match(html, /僅供壓力測試，不建議視為舒適預算/);
  assert.match(html, /<span>\$\{riskMessages\[snapshot\.mode\]\.note\}<\/span>/);
});

test("burden slider only redraws the runway and restart resets comfort mode", () => {
  const start = html.indexOf("function bindResultAffordBurdenSlider");
  const end = html.indexOf("function bindResultSalarySlider", start);
  assert.ok(start > -1 && end > start);
  const handlerSource = html.slice(start, end);
  assert.match(handlerSource, /loanAffordBurdenMode = AFFORD_BURDEN_STEPS\[/);
  assert.match(handlerSource, /renderCurrentLoanAffordRunway\(\)/);
  assert.doesNotMatch(handlerSource, /scheduleGroup|calculateLoan|setNumericInputValue|queueSave/);
  assert.match(html, /if \(group === "loan"\) loanAffordBurdenMode = "comfort";/);
});

test("lays out summary cards responsively and marks the selected burden", () => {
  assert.match(html, /\.afford-summary-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(html, /\.afford-runway__selected-tick\s*\{/);
  assert.match(html, /@media \(max-width: 620px\)[\s\S]*?\.afford-summary-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
});

test("selected burden label uses a reserved row below the runway", () => {
  assert.match(html, /afford-runway__track\$\{isComfort \? "" : " afford-runway__track--selected"\}/);
  const selectedTrackRule = html.match(/\.afford-runway__track--selected\s*\{([^}]*)\}/)?.[1];
  assert.ok(selectedTrackRule, "selected runway modifier exists");
  const marginBottom = Number(selectedTrackRule.match(/margin-bottom:\s*(\d+)px/)?.[1]);
  assert.ok(marginBottom >= 24, "selected label has enough vertical clearance from zone labels");
});

test("burden updates announce a concise summary through a stable live region", () => {
  assert.match(
    html,
    /<p class="visually-hidden" id="loanAffordAnnouncement" aria-live="polite" aria-atomic="true"><\/p>/
  );
  assert.doesNotMatch(html, /class="afford-summary-grid"[^>]*aria-live/);
  assert.match(html, /announcement\.textContent = announcementText/);
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
