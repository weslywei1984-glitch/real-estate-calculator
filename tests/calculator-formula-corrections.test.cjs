const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const youngPolicy = require("../assets/young-housing-loan-3.js");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function sourceBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start);
  assert.ok(start >= 0, `找不到公式起點：${startMarker}`);
  assert.ok(end > start, `找不到公式終點：${endMarker}`);
  return html.slice(start, end);
}

function loadFormulaSandbox() {
  const sandbox = { youngPolicy };
  vm.runInNewContext(
    [
      sourceBetween("function parseCalculatorDate", "function calculateTax()"),
      sourceBetween("function buyerCostModel", "function calculateBuyer()"),
      sourceBetween("function monthlyPayment", "const AFFORD_RATIO_LOW"),
      sourceBetween("function calculateYoungLoanSchedule", "function calculateYoung()")
    ].join("\n"),
    sandbox
  );
  return sandbox;
}

test("房地合一稅用周年日判定 2 年邊界，舊制案件不自動套 2.0", () => {
  const { calculateHouseLandTax } = loadFormulaSandbox();
  const base = {
    salePrice: 15_000_000,
    buyCost: 10_000_000,
    sellExpense: 500_000,
    landGain: 1_000_000,
    priorLoss: 500_000,
    resident: "resident",
    selfUseChecksPassed: false,
    special: false
  };

  const exactlyTwoYears = calculateHouseLandTax({
    ...base,
    acquisitionDate: "2020-01-01",
    saleDate: "2022-01-01"
  });
  assert.equal(exactlyTwoYears.profile.rate, 0.45);

  const overTwoYears = calculateHouseLandTax({
    ...base,
    acquisitionDate: "2020-01-01",
    saleDate: "2022-01-02"
  });
  assert.equal(overTwoYears.profile.rate, 0.35);

  const oldRegime = calculateHouseLandTax({
    ...base,
    acquisitionDate: "2015-12-31",
    saleDate: "2026-08-14"
  });
  assert.equal(oldRegime.profile.automaticEligible, false);
  assert.equal(oldRegime.tax, null);
});

test("房地合一稅扣前 3 年損失與土地漲價額，但當期稅後損益不重複扣除", () => {
  const { calculateHouseLandTax } = loadFormulaSandbox();
  const result = calculateHouseLandTax({
    salePrice: 15_000_000,
    buyCost: 10_000_000,
    sellExpense: 500_000,
    landGain: 1_000_000,
    priorLoss: 500_000,
    acquisitionDate: "2020-01-01",
    saleDate: "2026-08-14",
    resident: "resident",
    selfUseChecksPassed: false,
    special: false
  });

  assert.equal(result.transactionIncome, 4_500_000);
  assert.equal(result.taxableBaseBeforeExemption, 3_000_000);
  assert.equal(result.profile.rate, 0.2);
  assert.equal(result.tax, 600_000);
  assert.equal(result.afterTaxResult, 3_900_000);
});

test("20% 特別情形超過 5 年不覆蓋原本較低稅率", () => {
  const { calculateHouseLandTax } = loadFormulaSandbox();
  const result = calculateHouseLandTax({
    salePrice: 15_000_000,
    buyCost: 10_000_000,
    sellExpense: 0,
    landGain: 0,
    priorLoss: 0,
    acquisitionDate: "2016-01-01",
    saleDate: "2026-08-14",
    resident: "resident",
    selfUseChecksPassed: false,
    special: true
  });

  assert.equal(result.profile.rate, 0.15);
  assert.equal(result.profile.specialIgnored, true);
});

test("買方印花稅採公契價額 1‰，仲介服務費永久固定成交價 2%", () => {
  const { buyerCostModel } = loadFormulaSandbox();
  const result = buyerCostModel({
    purchasePrice: 15_000_000,
    downPayment: 3_000_000,
    mortgageSettingRatio: 1.2,
    buildingValue: 1_000_000,
    landDeclaredValue: 1_800_000,
    publicDeedValue: 2_800_000,
    scrivenerTransfer: 0,
    scrivenerLoan: 0,
    signingFee: 0,
    bankFee: 0,
    insuranceFee: 0,
    settlementFee: 0,
    transcriptCount: 0,
    certificateCount: 0
  });

  assert.equal(result.stampTax, 2_800);
  assert.equal(result.brokerFee, 300_000);
  assert.equal(result.brokerRate, 2);
});

test("本金平均加每月額外還本維持固定基礎本金並於第 277 期清償", () => {
  const { calculateLoanSchedule } = loadFormulaSandbox();
  const result = calculateLoanSchedule({
    principal: 12_000_000,
    annualRate: 2.5,
    years: 30,
    graceYears: 0,
    mode: "levelPrincipal",
    extraPayment: 10_000
  });

  assert.equal(result.paidMonths, 277);
  assert.ok(Math.abs(result.totalInterest - 3_474_041.67) < 0.02);
  assert.ok(Math.abs(result.rows[0].principalPaid - 43_333.333333) < 0.001);
  assert.equal(result.rows.at(-1).balance, 0);
  assert.equal(result.rows.reduce((sum, row) => sum + row.principalPaid, 0), 12_000_000);
});

test("一般房貸負擔回推納入寬限期、額外還本與還款方式", () => {
  const { loanCapacityFromPayment } = loadFormulaSandbox();
  const monthlyRate = 0.025 / 12;

  const levelPayment = loanCapacityFromPayment(40_000, monthlyRate, 336, "levelPayment", 10_000);
  assert.ok(Math.abs(levelPayment - 7_243_962.81) < 0.02);

  const levelPrincipal = loanCapacityFromPayment(40_000, monthlyRate, 336, "levelPrincipal", 10_000);
  assert.ok(Math.abs(levelPrincipal - 5_929_411.76) < 0.02);
});

test("提早清償的期數標籤與本金平均月付說明反映實際結果", () => {
  const { loanPeriodDefinitions, loanPaymentPresentation } = loadFormulaSandbox();
  assert.deepEqual(
    JSON.parse(JSON.stringify(loanPeriodDefinitions(277, 0))),
    [{ start: 1, end: 277, label: "第 1～277 期" }]
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(loanPeriodDefinitions(280, 24))),
    [
      { start: 1, end: 24, label: "寬限期：第 1～24 期" },
      { start: 25, end: 280, label: "第 25～280 期" }
    ]
  );
  const presentation = loanPaymentPresentation("levelPrincipal", false);
  assert.equal(presentation.normalLabel, "首期月付");
  assert.match(presentation.note, /逐期下降/);
});

test("青安拆分貸款合併兩筆利息、月付、收入與負擔率並清償尾數", () => {
  const {
    calculateYoungLoanSchedule,
    calculateLoanSchedule,
    combineLoanSummary
  } = loadFormulaSandbox();
  const young = calculateYoungLoanSchedule({
    principal: 10_000_000,
    totalMonths: 480,
    graceMonths: 24,
    baseRate: 2.275,
    rateAtMonth: youngPolicy.rateAtMonth
  });
  const supplemental = calculateLoanSchedule({
    principal: 2_000_000,
    annualRate: 2.5,
    years: 40,
    graceYears: 0,
    mode: "levelPayment",
    extraPayment: 0
  });
  const combined = combineLoanSummary(young, supplemental, 125_000);

  assert.equal(young.rows.at(-1).balance, 0);
  assert.equal(young.paidMonths, 480);
  assert.ok(Math.abs(combined.totalInterest - 6_324_382.61) < 0.02);
  assert.ok(Math.abs(combined.normalPayment - 36_761.56) < 0.02);
  assert.ok(Math.abs(combined.suggestedIncome - 91_903.91) < 0.02);
  assert.ok(Math.abs(combined.debtRatio - 29.40925) < 0.0001);
});

test("青安收入回推先用額度內基準利率，超額才用一般房貸 2.5%", () => {
  const { splitLoanCapacityFromPayment } = loadFormulaSandbox();
  const result = splitLoanCapacityFromPayment(40_000, {
    youngLimit: 10_000_000,
    youngMonthlyRate: 0.02275 / 12,
    youngMonths: 456,
    generalMonthlyRate: 0.025 / 12,
    generalMonths: 480
  });
  assert.ok(Math.abs(result - 12_190_077.58) < 0.02);
});
