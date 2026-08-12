const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const publicHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "breakeven.html"), "utf8");

function breakEvenWorkspace() {
  const start = html.indexOf('data-wizard="breakeven"');
  const end = html.indexOf('<section class="sources"', start + 1);
  assert.ok(start > -1 && end > start, "獨立頁應提供平轉成本工作區");
  return html.slice(start, end);
}

function loadBreakEvenCore() {
  const start = html.indexOf("function parseBreakEvenDate");
  const end = html.indexOf("function calculateTax()", start);
  assert.ok(start > -1, "應提供平轉日期與稅率核心");
  assert.ok(end > start, "應把純計算核心放在既有 DOM 渲染函式之前");
  const sandbox = {};
  vm.runInNewContext(html.slice(start, end), sandbox);
  return sandbox;
}

function baseModel(overrides = {}) {
  return {
    purchasePrice: 10_000_000,
    acquisitionDate: "2025-08-12",
    saleDate: "2026-08-12",
    buyerBrokerRate: 2,
    sellerBrokerRate: 4,
    costMode: "quick",
    quickPurchaseCosts: 100_000,
    quickImprovements: 0,
    quickHoldingCosts: 0,
    quickSellingCosts: 100_000,
    deedTax: 0,
    stampTax: 0,
    registrationFees: 0,
    scrivenerBankFees: 0,
    otherPurchaseCosts: 0,
    advancedImprovements: 0,
    mortgageInterest: 0,
    managementFees: 0,
    houseTax: 0,
    landTax: 0,
    insuranceCosts: 0,
    repairCosts: 0,
    otherHoldingCosts: 0,
    sellingScrivenerFee: 0,
    mortgageCancellationFee: 0,
    escrowFee: 0,
    marketingMovingFee: 0,
    otherSellingCosts: 0,
    landValueTax: 0,
    landGain: 0,
    priorTransactionLoss: 0,
    deductibleLandValueTax: 0,
    acquisitionReceipts: true,
    transferExpenseMode: "actual",
    residentType: "resident",
    selfUseRegistered: false,
    selfUseSixYears: false,
    selfUseNoRentalBusiness: false,
    selfUseNoPriorClaim: false,
    specialRate: false,
    taxMode: "auto",
    manualTaxAmount: 0,
    manualTaxConfirmed: false,
    negotiationRate: 5,
    expectedSalePrice: 0,
    outstandingLoan: 0,
    areaPing: 0,
    landDataConfirmed: true,
    ...overrides,
  };
}

test("快速模式只採用快速成本，進階模式只採用逐項明細", () => {
  const { breakEvenCostTotals } = loadBreakEvenCore();
  const input = baseModel({
    quickPurchaseCosts: 100_000,
    quickImprovements: 200_000,
    quickHoldingCosts: 300_000,
    quickSellingCosts: 400_000,
    deedTax: 11,
    stampTax: 12,
    registrationFees: 13,
    scrivenerBankFees: 14,
    otherPurchaseCosts: 15,
    advancedImprovements: 16,
    mortgageInterest: 21,
    managementFees: 22,
    houseTax: 23,
    landTax: 24,
    insuranceCosts: 25,
    repairCosts: 26,
    otherHoldingCosts: 27,
    sellingScrivenerFee: 31,
    mortgageCancellationFee: 32,
    escrowFee: 33,
    marketingMovingFee: 34,
    otherSellingCosts: 35,
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(breakEvenCostTotals(input))),
    { purchaseCosts: 100_000, improvements: 200_000, holdingCosts: 300_000, sellingCosts: 400_000 },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(breakEvenCostTotals({ ...input, costMode: "advanced" }))),
    { purchaseCosts: 65, improvements: 16, holdingCosts: 168, sellingCosts: 165 },
  );
});

test("持有期間使用周年日判斷 2 年、5 年與 10 年稅率邊界", () => {
  const { breakEvenTaxProfile } = loadBreakEvenCore();

  assert.equal(breakEvenTaxProfile(baseModel({ acquisitionDate: "2024-08-12" })).rate, 0.45);
  assert.equal(breakEvenTaxProfile(baseModel({ acquisitionDate: "2024-08-11" })).rate, 0.35);
  assert.equal(breakEvenTaxProfile(baseModel({ acquisitionDate: "2021-08-12" })).rate, 0.35);
  assert.equal(breakEvenTaxProfile(baseModel({ acquisitionDate: "2021-08-11" })).rate, 0.20);
  assert.equal(breakEvenTaxProfile(baseModel({ acquisitionDate: "2016-08-12" })).rate, 0.20);
  assert.equal(breakEvenTaxProfile(baseModel({ acquisitionDate: "2016-08-11" })).rate, 0.15);
});

test("2016 年前取得或房地合一 2.0 前出售時要求手動稅額", () => {
  const { breakEvenTaxProfile, estimateBreakEvenTax } = loadBreakEvenCore();
  const oldAcquisition = baseModel({ acquisitionDate: "2015-12-31" });
  const oldSale = baseModel({ acquisitionDate: "2020-01-01", saleDate: "2021-06-30" });

  assert.equal(breakEvenTaxProfile(oldAcquisition).manualRequired, true);
  assert.equal(breakEvenTaxProfile(oldSale).manualRequired, true);
  assert.throws(() => estimateBreakEvenTax(11_000_000, oldAcquisition), /手動輸入稅額/);
  assert.equal(
    estimateBreakEvenTax(11_000_000, {
      ...oldAcquisition,
      taxMode: "manual",
      manualTaxAmount: 250_000,
      manualTaxConfirmed: true,
    }).tax,
    250_000,
  );
});

test("推計移轉費用採成交價 3% 且最高 30 萬元", () => {
  const { estimateBreakEvenTax } = loadBreakEvenCore();
  const low = estimateBreakEvenTax(8_000_000, baseModel({ transferExpenseMode: "deemed" }));
  const high = estimateBreakEvenTax(20_000_000, baseModel({ transferExpenseMode: "deemed" }));

  assert.equal(low.transferDeduction, 240_000);
  assert.equal(high.transferDeduction, 300_000);
});

test("自住房地先扣 400 萬免稅額再按 10% 計稅", () => {
  const { estimateBreakEvenTax } = loadBreakEvenCore();
  const model = baseModel({
    acquisitionDate: "2019-08-12",
    selfUseRegistered: true,
    selfUseSixYears: true,
    selfUseNoRentalBusiness: true,
    selfUseNoPriorClaim: true,
  });

  const exempt = estimateBreakEvenTax(14_000_000, model);
  const taxed = estimateBreakEvenTax(15_500_000, model);
  assert.equal(exempt.profile.selfUse, true);
  assert.equal(exempt.tax, 0);
  assert.equal(taxed.tax, 48_000);
});

test("交易日前 3 年房地交易損失會從課稅所得扣除", () => {
  const { estimateBreakEvenTax } = loadBreakEvenCore();
  const withoutLoss = estimateBreakEvenTax(12_000_000, baseModel());
  const withLoss = estimateBreakEvenTax(12_000_000, baseModel({ priorTransactionLoss: 500_000 }));

  assert.equal(withLoss.priorLossDeduction, 500_000);
  assert.equal(withoutLoss.tax - withLoss.tax, 225_000);
});

test("固定案例反推出交易平轉價與含持有成本不賠價", () => {
  const { solveBreakEvenPrice, roundUpToTenThousand } = loadBreakEvenCore();
  const model = baseModel();
  const transaction = solveBreakEvenPrice(model, false);
  const full = solveBreakEvenPrice({ ...model, quickHoldingCosts: 600_000 }, true);

  assert.ok(Math.abs(transaction - 10_833_333.3333) < 2);
  assert.equal(roundUpToTenThousand(transaction), 10_840_000);
  assert.ok(Math.abs(full - 11_969_696.9696) < 2);
  assert.equal(roundUpToTenThousand(full), 11_970_000);
  assert.equal(roundUpToTenThousand(full / 0.95), 12_600_000);
});

test("剩餘房貸只影響可拿回現金，不改變兩種不賠價", () => {
  const { buildBreakEvenSummary } = loadBreakEvenCore();
  const withoutLoan = buildBreakEvenSummary(baseModel({ expectedSalePrice: 12_000_000 }));
  const withLoan = buildBreakEvenSummary(baseModel({
    expectedSalePrice: 12_000_000,
    outstandingLoan: 7_000_000,
  }));

  assert.equal(withLoan.transactionPrice, withoutLoan.transactionPrice);
  assert.equal(withLoan.fullPrice, withoutLoan.fullPrice);
  assert.equal(withLoan.cashAfterMortgage, withoutLoan.cashAfterMortgage - 7_000_000);
});

test("已確認的手動稅額標示覆寫但不把完整資料誤判為缺漏", () => {
  const { buildBreakEvenSummary } = loadBreakEvenCore();
  const summary = buildBreakEvenSummary(baseModel({
    taxMode: "manual",
    manualTaxAmount: 250_000,
    manualTaxConfirmed: true,
  }));

  assert.equal(summary.complete, true);
  assert.match(summary.notices.join(" "), /手動輸入/);
});

test("拒絕日期顛倒、負值、超額仲介費與異常議價率", () => {
  const { solveBreakEvenPrice } = loadBreakEvenCore();

  assert.throws(
    () => solveBreakEvenPrice(baseModel({ acquisitionDate: "2026-08-13" }), false),
    /出售日期不可早於取得日期/,
  );
  assert.throws(() => solveBreakEvenPrice(baseModel({ purchasePrice: -1 }), false), /買入總價/);
  assert.throws(() => solveBreakEvenPrice(baseModel({ sellerBrokerRate: 6.1 }), false), /仲介費率/);
  assert.throws(() => solveBreakEvenPrice(baseModel({ negotiationRate: 100 }), false), /議價率/);
});

test("獨立頁提供 noindex 與四步驟平轉工作區", () => {
  const section = breakEvenWorkspace();
  const bodyMarkup = html.slice(html.indexOf("<body"), html.indexOf("<script"));
  assert.match(html, /<meta[^>]+name="robots"[^>]+content="noindex,\s*nofollow,\s*noarchive"/i);
  assert.doesNotMatch(bodyMarkup, /class="tabs"|data-tab="(?:tax|buyer|loan|young|breakeven)"/);
  assert.match(section, /data-wizard="breakeven"/);
  assert.match(section, /id="breakevenForm"/);
  assert.match(section, /id="breakevenResult"/);
  for (const step of [1, 2, 3, 4]) {
    assert.match(section, new RegExp(`data-wizard-step="${step}"`));
  }
  assert.match(section, /data-copy="breakeven"/);
  assert.match(section, /data-jpg="breakeven"/);
  assert.match(section, /class="secondary breakeven-wizard-clear" data-clear="breakeven">清空/);
});

test("快速與進階成本欄位完整且由單一模式控制", () => {
  const section = breakEvenWorkspace();
  assert.match(section, /id="breakevenCostMode"/);
  assert.match(section, /data-cost-mode-panel="quick"/);
  assert.match(section, /data-cost-mode-panel="advanced"/);
  for (const id of [
    "breakevenPurchasePrice", "breakevenAcquisitionDate", "breakevenSaleDate",
    "breakevenBuyerBrokerRate", "breakevenSellerBrokerRate", "breakevenExpectedSalePrice",
    "breakevenAreaPing", "breakevenOutstandingLoan", "breakevenNegotiationRate",
    "breakevenQuickPurchaseCosts", "breakevenQuickImprovements", "breakevenQuickHoldingCosts",
    "breakevenQuickSellingCosts", "breakevenDeedTax", "breakevenStampTax",
    "breakevenRegistrationFees", "breakevenScrivenerBankFees", "breakevenOtherPurchaseCosts",
    "breakevenAdvancedImprovements", "breakevenMortgageInterest", "breakevenManagementFees",
    "breakevenHouseTax", "breakevenLandTax", "breakevenInsuranceCosts",
    "breakevenRepairCosts", "breakevenOtherHoldingCosts", "breakevenSellingScrivenerFee",
    "breakevenMortgageCancellationFee", "breakevenEscrowFee", "breakevenMarketingMovingFee",
    "breakevenOtherSellingCosts"
  ]) {
    assert.match(section, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /control\.disabled\s*=\s*!active/);
  assert.match(html, /manualControl\.disabled\s*=\s*!manual/);
  assert.match(html, /if \(input\.disabled\) return/);
  assert.match(html, /if \(field\.disabled\) continue/);
});

test("平轉稅務欄位區分自動估算、手動覆寫與資料完整度", () => {
  const section = breakEvenWorkspace();
  for (const id of [
    "breakevenLandValueTax", "breakevenLandGain", "breakevenPriorTransactionLoss",
    "breakevenDeductibleLandValueTax",
    "breakevenAcquisitionReceipts", "breakevenTransferExpenseMode", "breakevenResidentType",
    "breakevenTaxMode", "breakevenManualTaxAmount", "breakevenManualTaxConfirmed",
    "breakevenLandDataConfirmed", "breakevenSelfUseRegistered", "breakevenSelfUseSixYears",
    "breakevenSelfUseNoRentalBusiness", "breakevenSelfUseNoPriorClaim", "breakevenSpecialRate"
  ]) {
    assert.match(section, new RegExp(`id="${id}"`), id);
  }
  assert.match(section, /href="land-increment-total\.html"/);
  assert.match(section, /正式仍以稅務機關、地政士與實際契約核定為準/);
});

test("平轉分頁接入預設值、計算器、摘要與日期稅制同步", () => {
  assert.match(html, /breakeven:\s*\{[\s\S]*breakevenBuyerBrokerRate:\s*2[\s\S]*breakevenSellerBrokerRate:\s*4[\s\S]*breakevenNegotiationRate:\s*5/);
  assert.match(html, /breakeven:\s*\{\s*formId:\s*"breakevenForm",\s*resultId:\s*"breakevenResult",\s*run:\s*calculateBreakEven\s*\}/);
  assert.match(html, /breakeven:\s*"房屋平轉成本試算"/);
  assert.match(html, /function syncBreakEvenInterface\(\)/);
  assert.match(html, /function collectBreakEvenInput\(\)/);
});
