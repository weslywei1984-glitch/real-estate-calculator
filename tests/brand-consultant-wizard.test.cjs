const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function workspace(name) {
  const start = html.indexOf(`data-panel="${name}"`);
  const next = html.indexOf('<section class="workspace', start + 1);
  const sources = html.indexOf('<section class="sources"', start + 1);
  const end = next > -1 ? next : sources;
  assert.ok(start > -1 && end > start, `missing ${name} workspace`);
  return html.slice(start, end);
}

function consultantCss() {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  return html.slice(marker, html.indexOf("</style>", marker));
}

function mobileConsultantCss() {
  const css = consultantCss();
  const marker = "/* Mobile-only Consultant B visuals */";
  const start = css.indexOf(marker);
  assert.ok(start > -1, "missing mobile-only Consultant B wrapper");
  return css.slice(start);
}

test("Consultant B theme is the final visual layer", () => {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  assert.ok(marker > html.lastIndexOf("/* Compact tool layout redesign */"));
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /--consultant-cream:\s*#f3ead7/);
  assert.match(css, /--consultant-navy:\s*#102738/);
  assert.match(css, /--consultant-terracotta:\s*#b9502d/);
});

for (const name of ["tax", "buyer", "loan", "young"]) {
  test(`${name} exposes one four-step wizard`, () => {
    const section = workspace(name);
    assert.match(section, new RegExp(`data-wizard="${name}"`));
    for (const step of [1, 2, 3, 4]) {
      assert.match(section, new RegExp(`data-wizard-step="${step}"`));
    }
    assert.match(section, /class="wizard-mobile-head"/);
    assert.match(section, /data-wizard-back/);
    assert.match(section, /data-wizard-next/);
  });
}

test("wizard controller keeps presentation state separate from calculator data", () => {
  assert.match(html, /const WIZARD_MOBILE_QUERY = window\.matchMedia\("\(max-width: 620px\)"\)/);
  assert.match(html, /function setWizardStep\(workspace, nextIndex/);
  assert.match(html, /function resetWizard\(workspace/);
  assert.match(html, /function setupMobileWizards\(\)/);
  assert.doesNotMatch(html, /localStorage\.setItem\([^)]*wizard/i);
});

test("wizard clamps steps, updates progress, and validates before next", () => {
  assert.match(html, /Math\.max\(0,\s*Math\.min\(steps\.length - 1,\s*nextIndex\)\)/);
  assert.match(html, /progress\.style\.width = `\$\{\(\(index \+ 1\) \/ steps\.length\) \* 100\}%`/);
  assert.match(html, /function validateWizardStep\(workspace\)/);
  assert.match(html, /field\.setCustomValidity\(/);
  assert.match(html, /field\.getAttribute\("min"\)/);
  assert.match(html, /field\.getAttribute\("max"\)/);
  assert.match(html, /field\.checkValidity\(\)/);
  assert.match(html, /field\.reportValidity\(\)/);
});

test("tab switch and clear return the mobile wizard to step one", () => {
  assert.match(html, /resetWizard\(panel,\s*\{\s*focus:\s*false\s*\}\)/);
  assert.match(html, /resetWizard\(button\.closest\("\[data-wizard\]"\)/);
});

test("mobile mode hides inactive steps and keeps controls touch sized", () => {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(css, /\[data-wizard-step\]:not\(\.is-wizard-active\)\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.wizard-mobile-actions button\s*\{[^}]*min-height:\s*44px/s);
});

test("mobile hero uses the approved two-line editorial title", () => {
  assert.match(
    html,
    /<h1><span class="brand-hero__title-line">房地稅費與<\/span><span class="brand-hero__title-line brand-hero__title-line--accent">貸款試算<\/span><\/h1>/
  );

  const mobile = mobileConsultantCss();
  assert.match(mobile, /\.brand-hero\s*\{[^}]*height:\s*190px/s);
  const heroHeights = [...mobile.matchAll(/\.brand-hero\s*\{([^}]*)\}/g)]
    .flatMap(([, declarations]) => [...declarations.matchAll(/(?<![-\w])height:\s*([^;\s}]+)/g)].map(([, height]) => height));
  assert.deepEqual([...new Set(heroHeights)], ["190px"]);
  assert.match(mobile, /\.brand-hero h1\s*\{[^}]*display:\s*grid[^}]*white-space:\s*normal/s);
  assert.match(mobile, /\.brand-hero__title-line--accent\s*\{[^}]*color:\s*var\(--consultant-terracotta\)/s);
});

test("mobile editorial portrait has explicit default and narrow sizes", () => {
  const mobile = mobileConsultantCss();
  assert.match(mobile, /\.brand-hero__portrait\s*\{[^}]*right:\s*4px[^}]*width:\s*145px[^}]*height:\s*186px/s);
  assert.match(mobile, /\.brand-hero__profile\s*\{[^}]*height:\s*186px[^}]*max-width:\s*145px/s);
  assert.match(mobile, /@media \(max-width:\s*360px\)[\s\S]*\.brand-hero__portrait\s*\{[^}]*right:\s*0[^}]*width:\s*136px[^}]*height:\s*180px/s);
});

test("changing mobile steps returns the wizard header to view", () => {
  assert.match(html, /const wizardHead = workspace\.querySelector\("\.wizard-mobile-head"\)/);
  assert.match(html, /wizardHead\?\.scrollIntoView\(\{\s*block:\s*"start"/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
});

test("mobile wizard header clears the sticky calculator tabs", () => {
  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  const mobile = css.slice(css.indexOf("@media (max-width: 620px)"));
  assert.match(mobile, /\.wizard-mobile-head\s*\{[^}]*scroll-margin-top:\s*4\.5rem/s);
});

test("legacy percent-based loan ratios migrate to cheng units", () => {
  assert.match(html, /__loanRatioUnitVersion:\s*2/);
  assert.match(html, /const loanRatioUnitVersion = Number\(data\.__loanRatioUnitVersion\) \|\| 1/);
  assert.match(html, /loanRatioUnitVersion < 2 && \["loanRatio", "loanLtvRatio"\]\.includes\(id\)/);
  assert.match(html, /parseNumericValue\(saved\) > 10\s*\?\s*parseNumericValue\(saved\) \/ 10/);
});

test("Consultant B visual theme is enclosed by the phone breakpoint", () => {
  const css = consultantCss();
  assert.match(css, /\.wizard-mobile-head,[\s\S]*display:\s*none/);
  assert.match(css, /@media \(max-width:\s*620px\)\s*\{\s*\/\* Mobile-only Consultant B visuals \*\//);

  const beforeMobile = css.slice(0, css.indexOf("/* Mobile-only Consultant B visuals */"));
  assert.doesNotMatch(beforeMobile, /--consultant-cream|\.brand-hero\s*\{|\.workspace\s*\{/);
  assert.doesNotMatch(beforeMobile, /\.brand-hero__title-line|height:\s*190px/);
});

test("desktop does not hide calculator forms from wizard state", () => {
  const css = consultantCss();
  const beforeMobile = css.slice(0, css.indexOf("/* Mobile-only Consultant B visuals */"));
  assert.doesNotMatch(beforeMobile, /\[data-wizard\]\[data-wizard-current="3"\]\s*>\s*form/);
});

test("legacy saved loan rate migrates to the 2.5 percent default once", () => {
  assert.match(html, /__annualRateDefaultVersion:\s*2/);
  assert.match(html, /const annualRateDefaultVersion = Number\(data\.__annualRateDefaultVersion\) \|\| 1/);
  assert.match(html, /id === "annualRate" && annualRateDefaultVersion < 2\s*\?\s*2\.5/);
});

test("source references are inline on desktop and listed on phones", () => {
  assert.match(html, /<ul class="sources-list">/);
  assert.equal((html.match(/<li class="source-item">/g) || []).length, 5);

  const css = consultantCss();
  const mobile = mobileConsultantCss();
  assert.match(css, /\.sources-list\s*\{[^}]*display:\s*inline/s);
  assert.match(css, /\.source-item\s*\{[^}]*display:\s*inline/s);
  assert.match(mobile, /\.sources-list\s*\{[^}]*display:\s*grid/s);
  assert.match(mobile, /\.source-item\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/s);
});
