const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("品牌頁首使用可維護文字與透明人物素材", () => {
  assert.match(html, /<header class="brand-hero">/);
  assert.match(html, /<h1>房地稅費與貸款試算<\/h1>/);
  assert.match(html, /src="assets\/xiaowei-profile\.png"/);
  assert.doesNotMatch(html, /class="hero-art"/);
});

test("頁首移除資料基準標籤", () => {
  assert.doesNotMatch(html, /brand-hero__baseline/);
  assert.doesNotMatch(html, /hero-data-date/);
  assert.doesNotMatch(html, /資料基準/);
});

test("品牌頁首保留既有品牌與免責文案", () => {
  assert.match(html, /台南小魏 買厝作伙/);
  assert.match(html, /魏泉承/);
  assert.match(html, /0927-617-207/);
  assert.match(html, /正式申報仍以稅務機關、地政士、銀行核定為準/);
});

test("頁首電話可直接撥打", () => {
  assert.match(html, /<a class="brand-hero__tel" href="tel:\+886927617207"[^>]*>0927-617-207<\/a>/);
});

test("手機版顯示免責聲明且不縮到難以閱讀", () => {
  const marker = html.indexOf("/* Compact tool layout redesign */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  const mobile = css.slice(css.lastIndexOf("@media (max-width: 620px)"));

  // 法定免責聲明在手機必須可見，且允許換行不被截斷
  assert.doesNotMatch(mobile, /\.brand-hero__notice-legal\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.brand-hero__notice\s*\{[^}]*white-space:\s*normal/s);
  // 必須用 span.xxx 才蓋得過前一層的 .brand-hero__notice span { display: block }
  assert.match(mobile, /\.brand-hero__notice span\.brand-hero__notice-intro\s*\{[^}]*display:\s*none/s);

  // 聯絡資訊與免責文字不得再使用 .5rem 以下的字級
  assert.match(mobile, /\.brand-hero__identity small\s*\{[^}]*font-size:\s*\.68rem/s);
  assert.match(mobile, /\.brand-hero__tel\s*\{[^}]*font-size:\s*\.8rem/s);
  assert.match(mobile, /\.brand-hero__notice\s*\{[^}]*font-size:\s*\.68rem/s);
});

test("最後一層主題採用台南小魏品牌色", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  assert.ok(marker > -1, "應新增品牌工具主題");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /--brand-navy:\s*#102738/);
  assert.match(css, /--brand-cream:\s*#f4efe5/);
  assert.match(css, /--brand-terracotta:\s*#b94f2c/);
  assert.match(css, /\.panel\s*\{[^}]*border-radius:\s*12px/s);
  assert.match(css, /\.control\s*\{[^}]*border-radius:\s*9px/s);
  assert.match(css, /\.primary,\s*\.young-primary\s*\{[^}]*background:\s*var\(--brand-terracotta\)/s);
  assert.doesNotMatch(css, /linear-gradient\([^)]*#d1a258/);
});

test("品牌主題提供可見的鍵盤焦點與減少動態效果", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  assert.ok(marker > -1, "應新增品牌工具主題");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("品牌主題在平板與手機提供緊湊版面", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  assert.ok(marker > -1, "應新增品牌工具主題");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*300px/s);
  assert.match(css, /\.tabs\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.tab\s*\{[^}]*min-width:\s*112px/s);
});

test("桌機頁首完整顯示人物且作用中分頁會捲入視野", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.brand-hero__profile\s*\{[^}]*width:\s*auto;[^}]*height:\s*calc\(100% - 18px\)/s);
  assert.match(html, /tab\.scrollIntoView\(\{\s*block:\s*"nearest",\s*inline:\s*"center"\s*\}\)/);
});

test("關閉舊金色主題殘留的徽章光暈", () => {
  const marker = html.indexOf("/* Compact tool layout redesign */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.brand-mark::before,\s*\.brand-mark::after\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.brand-hero \.brand-mark\s*\{[^}]*text-shadow:\s*none/s);
});

test("緊湊工具版重新配置桌機頁首與工作區", () => {
  const marker = html.indexOf("/* Compact tool layout redesign */");
  assert.ok(marker > -1, "應新增緊湊工具版最終樣式");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*184px;[^}]*max-height:\s*none/s);
  assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.38fr\)\s*minmax\(360px,\s*1fr\);[^}]*gap:\s*16px/s);
  assert.match(css, /\.young-hero\s*\{[^}]*background:\s*var\(--brand-paper\);[^}]*color:\s*var\(--brand-ink\)/s);
  assert.match(css, /\.tabs\s*\{[^}]*min-height:\s*48px/s);
});

test("緊湊工具版在手機維持單行標題與觸控尺寸", () => {
  const marker = html.indexOf("/* Compact tool layout redesign */");
  assert.ok(marker > -1, "應新增緊湊工具版最終樣式");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /@media \(max-width:\s*620px\)/);
  assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*146px;[^}]*max-height:\s*none/s);
  assert.match(css, /\.brand-hero h1\s*\{[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\.actions button\s*\{[^}]*min-height:\s*44px/s);
});
