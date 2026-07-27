const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("品牌頁首使用可維護文字與透明人物素材", () => {
  assert.match(html, /<header class="brand-hero">/);
  assert.match(html, /<h1>房地稅費與貸款試算<\/h1>/);
  assert.match(html, /src="assets\/xiaowei-profile\.png"/);
  assert.match(html, /class="brand-hero__baseline"/);
  assert.match(html, /<span>資料基準<\/span>/);
  assert.doesNotMatch(html, /class="hero-art"/);
});

test("品牌頁首保留既有品牌與免責文案", () => {
  assert.match(html, /台南小魏 買厝作伙/);
  assert.match(html, /魏泉承/);
  assert.match(html, /0927-617-207/);
  assert.match(html, /正式申報仍以稅務機關、地政士、銀行核定為準/);
});
