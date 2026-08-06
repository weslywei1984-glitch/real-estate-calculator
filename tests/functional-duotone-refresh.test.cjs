const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const helperHtml = fs.readFileSync(path.join(root, "tainan-land-value-helper.html"), "utf8");

test("tax result hero uses the approved terracotta and sand palette", () => {
  assert.match(indexHtml, /--feature-tax:\s*#8e402b/i);
  assert.match(indexHtml, /--feature-highlight:\s*#ffe0a8/i);
  assert.match(indexHtml, /\.metric\.main\.tax-result-hero\s*\{[^}]*border-color:\s*var\(--feature-tax\)[^}]*background:\s*var\(--feature-tax\)/is);
  assert.match(indexHtml, /\.tax-result-hero[\s\S]*?strong\s*\{[^}]*color:\s*var\(--feature-highlight\)/i);
});

test("loan result hero uses the approved lake blue and sand palette", () => {
  assert.match(indexHtml, /--feature-loan:\s*#164d5c/i);
  assert.match(indexHtml, /\.metric\.main\.loan-payment-hero\s*\{[^}]*border-color:\s*var\(--feature-loan\)[^}]*background:\s*var\(--feature-loan\)/is);
  assert.match(indexHtml, /\.loan-payment-stage\s+strong\s*\{[^}]*color:\s*var\(--feature-highlight\)/i);
});

test("land helper keeps its approved header and intro unchanged", () => {
  assert.match(helperHtml, /<header class="brand-hero">\s*<img class="brand-hero__mobile-art" src="assets\/mobile-hero-exact\.jpg" width="1787" height="880" alt="台南小魏 買厝作伙。房地稅費與貸款試算。正式申報仍以稅務機關、地政士、銀行核定為準。">\s*<\/header>/);
  assert.match(helperHtml, /<section class="tool-intro" aria-labelledby="toolTitle">[\s\S]*?<h1 id="toolTitle">用地號查詢公告現值<\/h1>[\s\S]*?只有門牌先查地號[\s\S]*?<\/section>/);
});

test("land helper exposes a three-step query flow and result dashboard", () => {
  assert.match(helperHtml, /class="workspace land-value-workspace"/);
  assert.match(helperHtml, /class="panel land-query-flow"/);
  assert.equal((helperHtml.match(/class="land-query-step(?:\s|")/g) || []).length, 3);
  assert.match(helperHtml, /class="panel result-panel land-result-dashboard"/);
  assert.match(helperHtml, /class="metric main land-metric land-metric--primary"/);
});

test("land helper preserves every behavior-bound ID", () => {
  for (const id of [
    "district", "sectionName", "mainNo", "subNo", "areaSqm", "areaPing",
    "currentValue", "previousValue", "queryLandValues", "lookupStatus",
    "currentTotalOut", "previousTotalOut", "gainTotalOut", "currentPingOut",
    "summaryText", "copySummary"
  ]) {
    assert.match(helperHtml, new RegExp(`id="${id}"`));
  }
  assert.match(helperHtml, /const STORAGE_KEY = "tainanLandValueHelperForm"/);
});

test("land helper uses the approved desktop workbench proportions", () => {
  assert.match(helperHtml, /\.land-value-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.12fr\)\s+minmax\(340px,\s*\.88fr\)/s);
  assert.match(helperHtml, /\.land-result-dashboard\s*\{[^}]*position:\s*sticky[^}]*top:\s*12px/s);
});

test("land helper collapses cleanly and disables sticky positioning on mobile", () => {
  assert.match(helperHtml, /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.land-value-workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)[^}]*\}[\s\S]*?\.land-result-dashboard\s*\{[^}]*position:\s*static/s);
  assert.match(helperHtml, /@media \(max-width:\s*620px\)\s*\{[\s\S]*?\.land-query-step\s*\{[^}]*padding:/s);
});
