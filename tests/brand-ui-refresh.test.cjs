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
  // 直接在整層樣式裡找：這層可能有多個 620px 區塊，
  // 用 lastIndexOf 定位會在新增區塊後失效
  const mobile = html.slice(marker, html.indexOf("</style>", marker));

  // 法定免責聲明在手機必須可見，且允許換行不被截斷
  assert.doesNotMatch(mobile, /\.brand-hero__notice-legal\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.brand-hero__notice\s*\{[^}]*white-space:\s*normal/s);
  assert.match(html, /正式申報仍以稅務機關、地政士、銀行核定為準/);

  // 手機頁首只留標題、CTA、免責聲明與電話；電話要維持可讀字級
  assert.match(mobile, /\.brand-hero__identity strong,\s*\.brand-hero__identity small\s*\{[^}]*display:\s*none/s);
  assert.match(mobile, /\.brand-hero__identity \.brand-hero__tel\s*\{[^}]*font-size:\s*\.92rem/s);
});

test("手機頁首壓在 160px", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*160px/s);
  // 副標與英文眉題讓位，才塞得下 CTA 與免責聲明
  assert.match(css, /\.brand-hero__eyebrow,\s*\.brand-hero__lead\s*\{[^}]*display:\s*none/s);
});

test("手機版青安摘要要有標籤與數值的層次", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  // 原本標籤 10.9px、數值 11.8px 幾乎一樣大
  assert.match(css, /\.policy-stat span\s*\{[^}]*font-size:\s*\.66rem/s);
  assert.match(css, /\.policy-stat strong\s*\{[^}]*font-size:\s*\.84rem/s);
});

test("移除說明句後不留無效的 intro 樣式", () => {
  assert.doesNotMatch(html, /notice-intro/);
});

test("沒有寬限期時不顯示寬限期月付，也不硬切在第 36 期", () => {
  assert.match(html, /const hasGrace = graceMonths > 0/);
  assert.match(html, /const periodBreak = hasGrace \? graceMonths : totalMonths/);
  assert.match(html, /metric\("每月月付", firstNormalPayment, "main"\)/);
  assert.doesNotMatch(html, /Math\.min\(36, totalMonths\)/);
});

test("貸款分頁年利率預設為 2.5", () => {
  assert.match(html, /<input id="annualRate"[^>]*value="2\.5"/);
  assert.match(html, /annualRate:\s*2\.5/);
});

test("兩個分頁都能用收入回推可負擔房價", () => {
  // 月付抓收入 1/3 ～ 2/5，再用現值公式回推貸款本金
  assert.match(html, /AFFORD_RATIO_LOW = 1 \/ 3/);
  assert.match(html, /AFFORD_RATIO_HIGH = 2 \/ 5/);
  assert.match(html, /function loanFromPayment\(payment, monthlyRate, months\)/);
  assert.match(html, /payment \* \(1 - Math\.pow\(1 \+ monthlyRate, -months\)\) \/ monthlyRate/);

  assert.match(html, /id="loanSalary"/);
  assert.match(html, /id="loanAffordCard"/);
  assert.match(html, /id="youngAffordCard"/);
  assert.match(html, /renderAffordCard\("loanAffordCard"/);
  assert.match(html, /renderAffordCard\("youngAffordCard"/);

  // 青安要用補貼期滿後的基準利率，不能用首期補貼利率（會高估負擔能力）
  assert.match(html, /renderAffordCard\("youngAffordCard",[\s\S]{0,160}annualRate: baseRate/);
});

test("頁首有明確的行動呼籲按鈕", () => {
  assert.match(html, /<button class="brand-hero__cta" type="button" id="heroCta">立即開始試算/);
  // 點了要捲到分頁列並把游標帶進第一個欄位
  assert.match(html, /getElementById\("heroCta"\)\?\.addEventListener\("click"/);
  assert.match(html, /tabs\?\.scrollIntoView/);

  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  assert.ok(marker > -1, "應有 hero banner 樣式");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  // .brand-hero__content 是格線容器，沒有 justify-self 按鈕會被撐滿整欄
  assert.match(css, /\.brand-hero__cta\s*\{[^}]*justify-self:\s*start/s);
  assert.match(css, /\.brand-hero__cta\s*\{[^}]*background:\s*var\(--brand-terracotta\)/s);
  // 每個斷點都要有可點擊高度（手機 44px 是觸控下限）
  assert.match(css, /min-height:\s*52px/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /\.brand-hero__cta\s*\{[^}]*min-height:\s*44px/s);
});

test("頁首是 banner 而非形象橫幅：三欄、大標題、貼齊底部的人像", () => {
  assert.match(html, /<\/div>\s*<div class="brand-hero__identity"/);
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /@media \(min-width: 901px\) and \(max-width: 1079px\)/);
  assert.match(css, /@media \(min-width: 1080px\)/);
  assert.match(css, /\.brand-hero\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto 210px/s);
  assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*320px/s);
  // 主標 60–72px、說明 19–22px
  assert.match(css, /\.brand-hero h1\s*\{[^}]*font-size:\s*clamp\(3\.2rem, 4\.6vw, 4\.3rem\)/s);
  assert.match(css, /\.brand-hero__lead\s*\{[^}]*font-size:\s*1\.24rem/s);
  // 極淡格線與人像光暈
  assert.match(css, /\.brand-hero::before\s*\{[^}]*background-image:/s);
  assert.match(css, /\.brand-hero__portrait::before\s*\{[^}]*radial-gradient/s);
});

test("不可用 .brand-hero > * 疊 position", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  // 會蓋掉人像的 absolute，1080px 以下人像改佔一整列，頁首高度暴增
  assert.doesNotMatch(css, /\.brand-hero > \*\s*\{[^}]*position:/s);
});

test("分頁列不換行", () => {
  const marker = html.indexOf("/* Compact tool layout redesign */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /\.tabs\s*\{[^}]*flex-wrap:\s*nowrap/s);
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
