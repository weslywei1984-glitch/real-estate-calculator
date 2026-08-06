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
