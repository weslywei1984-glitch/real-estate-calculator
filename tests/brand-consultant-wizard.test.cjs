const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const exactMobileHeroPath = path.join(__dirname, "..", "assets", "mobile-hero-exact.jpg");

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

test("phone hero uses the approved artwork byte for byte", () => {
  assert.ok(fs.existsSync(exactMobileHeroPath), "missing approved mobile hero artwork");
  const digest = crypto
    .createHash("sha256")
    .update(fs.readFileSync(exactMobileHeroPath))
    .digest("hex")
    .toUpperCase();

  assert.equal(digest, "8C01A4C8464E2B033D0B98C8655A6B493A53D46C0C11D6817ABA71C40B4AA827");
  assert.match(
    html,
    /class="brand-hero__mobile-art"[^>]*src="assets\/mobile-hero-exact\.jpg"[^>]*width="1787"[^>]*height="880"/
  );
});

test("approved hero artwork is the only visible hero at every width", () => {
  const css = consultantCss();
  const shared = css.slice(0, css.indexOf("@media (max-width: 900px)"));

  assert.match(shared, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block[^}]*width:\s*100%[^}]*height:\s*auto/s);
  assert.match(shared, /\.brand-hero__content,\s*\.brand-hero__identity,\s*\.brand-hero__portrait\s*\{[^}]*display:\s*none/s);
  assert.match(shared, /\.brand-hero\s*\{[^}]*width:\s*100%[^}]*min-height:\s*0[^}]*background:\s*transparent/s);
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

test("Consultant B theme is shared by every viewport", () => {
  const css = consultantCss();
  const firstResponsiveOverride = css.indexOf("@media (max-width: 900px)");
  assert.ok(firstResponsiveOverride > -1, "missing responsive override");
  const shared = css.slice(0, firstResponsiveOverride);

  assert.match(shared, /:root\s*\{[^}]*--consultant-cream:\s*#f3ead7/s);
  assert.match(shared, /body\s*\{[^}]*background:/s);
  assert.match(shared, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(shared, /\.wizard-mobile-head\s*\{[^}]*display:\s*grid/s);
  assert.match(shared, /\[data-wizard-step\]:not\(\.is-wizard-active\)\s*\{[^}]*display:\s*none/s);
  assert.match(shared, /\[data-wizard\]\[data-wizard-current="3"\]\s*>\s*form\s*\{[^}]*display:\s*none/s);
  assert.match(shared, /\.wizard-mobile-actions\s*\{[^}]*display:\s*grid/s);
  assert.match(shared, /\.wizard-result-actions\s*\{[^}]*display:\s*grid/s);
});

test("legacy saved loan rate migrates to the 2.5 percent default once", () => {
  assert.match(html, /__annualRateDefaultVersion:\s*2/);
  assert.match(html, /const annualRateDefaultVersion = Number\(data\.__annualRateDefaultVersion\) \|\| 1/);
  assert.match(html, /id === "annualRate" && annualRateDefaultVersion < 2\s*\?\s*2\.5/);
});

test("source references are structured lists at every width", () => {
  const css = consultantCss();
  const shared = css.slice(0, css.indexOf("@media (max-width: 900px)"));

  assert.equal((html.match(/<li class="source-item">/g) || []).length, 5);
  assert.match(shared, /\.sources-list\s*\{[^}]*display:\s*grid/s);
  assert.match(shared, /\.source-item\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/s);
  assert.doesNotMatch(shared, /\.source-item:not\(:last-child\)::after\s*\{[^}]*content:\s*"；"/s);
});

test("desktop contact actions sit before sources inside the main flow", () => {
  const contact = html.indexOf('<div class="float-contact"');
  const sources = html.indexOf('<section class="sources"');
  const mainEnd = html.indexOf("</main>");

  assert.ok(contact > -1 && contact < sources && sources < mainEnd);
});
