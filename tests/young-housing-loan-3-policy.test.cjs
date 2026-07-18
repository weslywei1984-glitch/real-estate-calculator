const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("../assets/young-housing-loan-3.js");

test("三種申請身分使用正確額度", () => {
  assert.equal(policy.getLoanLimit("general"), 10_000_000);
  assert.equal(policy.getLoanLimit("newlywed"), 12_000_000);
  assert.equal(policy.getLoanLimit("children"), 15_000_000);
});

test("三組區域使用正確房價上限", () => {
  assert.equal(policy.getPriceCap("taipei"), 35_000_000);
  assert.equal(policy.getPriceCap("newTaipeiHsinchu"), 25_000_000);
  assert.equal(policy.getPriceCap("other"), 20_000_000);
});

test("六年補貼在正確月份切換", () => {
  assert.equal(policy.subsidyAtMonth(36), 0.5);
  assert.equal(policy.subsidyAtMonth(37), 0.375);
  assert.equal(policy.subsidyAtMonth(48), 0.375);
  assert.equal(policy.subsidyAtMonth(49), 0.25);
  assert.equal(policy.subsidyAtMonth(60), 0.25);
  assert.equal(policy.subsidyAtMonth(61), 0.125);
  assert.equal(policy.subsidyAtMonth(72), 0.125);
  assert.equal(policy.subsidyAtMonth(73), 0);
});

test("基準利率 2.275 產生五階正式試算利率", () => {
  assert.equal(policy.rateAtMonth(2.275, 1), 1.775);
  assert.equal(policy.rateAtMonth(2.275, 37), 1.9);
  assert.equal(policy.rateAtMonth(2.275, 49), 2.025);
  assert.equal(policy.rateAtMonth(2.275, 61), 2.15);
  assert.equal(policy.rateAtMonth(2.275, 73), 2.275);
});

test("補貼後利率不會低於零", () => {
  assert.equal(policy.rateAtMonth(0.3, 1), 0);
});

const validInput = {
  age: 40,
  loanYears: 40,
  annualIncome: 2_000_000,
  purchasePrice: 20_000_000,
  region: "other",
  noHome: true,
  selfUse: true,
  firstUse: true
};

test("資格上限等於門檻時仍符合", () => {
  assert.equal(policy.evaluateEligibility(validInput).eligible, true);
});

test("50 歲、所得超過一元或房價超過一元時不符合", () => {
  assert.equal(policy.evaluateEligibility({...validInput, age: 50}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, annualIncome: 2_000_001}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, purchasePrice: 20_000_001}).eligible, false);
});

test("任一自住資格未勾選時不符合", () => {
  assert.equal(policy.evaluateEligibility({...validInput, noHome: false}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, selfUse: false}).eligible, false);
  assert.equal(policy.evaluateEligibility({...validInput, firstUse: false}).eligible, false);
});
