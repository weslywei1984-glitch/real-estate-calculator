(function attachYoungHousingLoan3(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.YoungHousingLoan3 = api;
})(typeof globalThis === "object" ? globalThis : this, function createPolicy() {
  const POLICY = Object.freeze({
    applicationPeriod: "2026/8/1～2029/7/31",
    maxLtv: 80,
    maxLoanYears: 40,
    maxGraceYears: 5,
    minAge: 18,
    maxAgeExclusive: 50,
    maxAgePlusTerm: 80,
    maxAnnualIncome: 2_000_000,
    defaultBaseRate: 2.275,
    loanLimits: Object.freeze({
      general: 10_000_000,
      newlywed: 12_000_000,
      children: 15_000_000
    }),
    priceCaps: Object.freeze({
      taipei: 35_000_000,
      newTaipeiHsinchu: 25_000_000,
      other: 20_000_000
    })
  });

  function getLoanLimit(type) {
    return POLICY.loanLimits[type] || POLICY.loanLimits.general;
  }

  function getPriceCap(region) {
    return POLICY.priceCaps[region] || POLICY.priceCaps.other;
  }

  function subsidyAtMonth(month) {
    if (month <= 36) return 0.5;
    if (month <= 48) return 0.375;
    if (month <= 60) return 0.25;
    if (month <= 72) return 0.125;
    return 0;
  }

  function rateAtMonth(baseRate, month) {
    return Math.max(0, Number((baseRate - subsidyAtMonth(month)).toFixed(3)));
  }

  function evaluateEligibility(input) {
    const priceCap = getPriceCap(input.region);
    const checks = {
      adult: input.age >= POLICY.minAge,
      ageLimit: input.age < POLICY.maxAgeExclusive,
      agePlusTerm: input.age + input.loanYears <= POLICY.maxAgePlusTerm,
      income: input.annualIncome <= POLICY.maxAnnualIncome,
      price: input.purchasePrice <= priceCap,
      noHome: Boolean(input.noHome),
      selfUse: Boolean(input.selfUse),
      firstUse: Boolean(input.firstUse)
    };
    return {eligible: Object.values(checks).every(Boolean), checks, priceCap};
  }

  return {
    POLICY,
    getLoanLimit,
    getPriceCap,
    subsidyAtMonth,
    rateAtMonth,
    evaluateEligibility
  };
});
