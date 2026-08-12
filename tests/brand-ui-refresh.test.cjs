const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("品牌頁首使用可維護文字與透明人物素材", () => {
  assert.match(html, /<header class="brand-hero">/);
  // 標題後半在手機會上強調色，所以包了 span
  assert.match(html, /<h1><span class="brand-hero__title-line">[^<]+<\/span><span class="brand-hero__title-line brand-hero__title-line--accent">[^<]+<\/span><\/h1>/);
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

});

test("手機頁首改為置中式 banner：頭像、膠囊標籤、雙按鈕", () => {
  assert.match(html, /<p class="brand-hero__badge">台南小魏 買厝作伙<\/p>/);
  assert.match(html, /<div class="brand-hero__actions">/);
  assert.match(html, /brand-hero__cta--ghost"[^>]*href="https:\/\/line\.me\/R\/ti\/p\/@tainanwei"/);

  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  // 膠囊與 ghost 按鈕是手機專用；ghost 要寫成 .brand-hero__cta.brand-hero__cta--ghost
  // 才蓋得過後面同權重的 .brand-hero__cta { display: inline-flex }
  assert.match(css, /\.brand-hero__cta\.brand-hero__cta--ghost\s*\{\s*display:\s*none;\s*\}/);

  // 手機：置中、人像變圓形頭像並靠 order 排到最前
  assert.match(css, /\.brand-hero\s*\{[^}]*display:\s*grid;[^}]*text-align:\s*center/s);
  assert.match(css, /\.brand-hero__portrait\s*\{[^}]*order:\s*-1/s);
  assert.match(css, /\.brand-hero__profile\s*\{[^}]*border-radius:\s*50%/s);
  assert.match(css, /\.brand-hero__accent\s*\{\s*color:/);
});

test("手機資格項目四邊都有框線、快選 chip 排成一排", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  // 前一層 @media(max-width:900px) 的 :first-child { border-left: 0 } 權重較高
  assert.match(css, /\.eligibility-item,\s*\.eligibility-item:first-child\s*\{[^}]*border-left-width:\s*1px/s);
  // 只補寬度與線型，顏色留給勾選／hover 狀態
  assert.doesNotMatch(css, /\.eligibility-item,\s*\.eligibility-item:first-child\s*\{[^}]*border-left-color/s);

  // 寬限期原本會折成 2×2
  assert.match(css, /\.chip-quick-row\s*\{[^}]*grid-auto-flow:\s*column/s);
  assert.match(css, /\.chip-quick-row \.chip\s*\{[^}]*justify-content:\s*center/s);
});

test("青安摘要的分隔線不貼到文字", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  // 分隔線是 border-left，padding-left 設 0 文字就會貼著線（桌機與手機都會）
  const rules = css.match(/\.policy-stat\s*\{[^}]*\}/gs) || [];
  assert.ok(rules.length >= 2, "桌機與手機都應有 .policy-stat 規則");
  rules.forEach(rule => {
    assert.doesNotMatch(rule, /padding:[^;]*\s0(px)?\s*;/);
  });
  assert.match(css, /\.policy-stat\s*\{[^}]*padding:\s*4px 8px 4px 13px/s);
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
  assert.match(html, /class="loan-payment-grid \$\{hasGrace \? "has-grace" : "single"\}"/);
  assert.match(html, /<span>每月月付<\/span>\s*<strong>\$\{money\.format\(Math\.round\(firstNormalPayment\)\)\}<\/strong>/);
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
  assert.match(html, /id="loanAffordRunway"/);
  assert.match(html, /id="youngAffordCard"/);
  assert.match(html, /renderAffordRunway\("loanAffordRunwayVisual"/);
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
  // 桌機與平板的可點擊高度（手機改用電話按鈕，見另一則測試）
  assert.match(css, /min-height:\s*52px/);
  assert.match(css, /min-height:\s*48px/);
});

test("頁首在所有寬度都使用核定主視覺", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block/s);
  assert.match(css, /\.brand-hero\s*\{[^}]*width:\s*100%[^}]*min-height:\s*0/s);
  assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media \(min-width:\s*901px\)\s*\{[\s\S]*\.form-grid/);
});

test("不可用 .brand-hero > * 疊 position", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  // 會蓋掉人像的 absolute，1080px 以下人像改佔一整列，頁首高度暴增
  assert.doesNotMatch(css, /\.brand-hero > \*\s*\{[^}]*position:/s);
});

test("資格說明字色要過 AA 對比", () => {
  // #738092 對淡橘底只有 3.77:1，字級縮到 10px 後更吃力
  assert.doesNotMatch(html, /\.eligibility-item small\s*\{[^}]*color:\s*#738092/s);
  assert.match(html, /\.eligibility-item small\s*\{[^}]*color:\s*#5a6675/s);
});

test("貸款成數以「成」為單位，不用百分比", () => {
  assert.match(html, /<input id="loanRatio"[^>]*max="10"[^>]*value="8">\s*<span class="unit">成<\/span>/);
  assert.match(html, /<input id="loanLtvRatio"[^>]*max="10"[^>]*value="8">\s*<span class="unit">成<\/span>/);
  assert.match(html, /loanRatio:\s*8,/);
  assert.match(html, /loanLtvRatio:\s*8,/);
  // 8 成 = 80%，換算除以 10
  assert.match(html, /const loanAmount = purchasePrice \* ratio \/ 10;/);
  assert.match(html, /const principal = Math\.round\(purchasePrice \* ratio \/ 10\);/);
  assert.match(html, /actualLoanRatio = purchasePrice > 0 \? principal \/ purchasePrice \* 10 : 0/);
  assert.match(html, /實際貸款成數<\/span><strong>\$\{number\.format\(actualLoanRatio\)\} 成<\/strong>/);
});

test("貸款結果的自備款用萬，總利息改放收合明細", () => {
  assert.match(html, /<span>自備款<\/span>\s*<strong>\$\{wanAmount\(downPayment\)\}<\/strong>/);
  assert.match(html, /<span>房屋成交總價<\/span><strong>\$\{wanAmount\(purchasePrice\)\}<\/strong>/);
  assert.doesNotMatch(html, /<span>總利息與月付範圍<\/span>/);
  assert.match(html, /approxWanLine\("總預估利息", totalInterest\)/);
  assert.match(html, /approxWanLine\("總預估還款額", principal \+ totalInterest\)/);
});

test("房地合一稅欄位預設為 0，且移除兩個套用範例", () => {
  ["salePrice", "buyCost", "sellExpense", "holdingYears"].forEach(id => {
    assert.match(html, new RegExp(`<input id="${id}"[^>]*value="0">`));
  });
  assert.match(html, /salePrice:\s*0,[\s\S]{0,120}holdingYears:\s*0,/);
  assert.doesNotMatch(html, /data-reset="tax"/);
  assert.doesNotMatch(html, /data-reset="loan"/);
});

test("買方面板標題改為買方所需費用", () => {
  assert.match(html, /<h2>買方所需費用<\/h2>/);
  assert.doesNotMatch(html, /<h2>買方現金需求<\/h2>/);
});

test("手機的面板副標與標題同一行、查詢連結變並排按鈕", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  // ≤900px 那層把 .panel-head 改成直排，手機要轉回同一行
  assert.match(css, /\.panel-head\s*\{[^}]*flex-direction:\s*row/s);
  // 桌機用 display: contents 讓包裝層不影響原本的文字連結版面
  assert.match(html, /\.lookup-buttons\s*\{\s*display:\s*contents;\s*\}/);
  assert.match(css, /\.lookup-buttons\s*\{[^}]*grid-template-columns:\s*1fr 1fr/s);
  assert.match(html, /<svg class="lookup-icon"/);
});

test("土地查詢連結指向台南市公告土地現值及公告地價", () => {
  // 舊的 easymap.land.moi.gov.tw 會轉到地籍圖首頁，頁面沒有地價資訊
  assert.doesNotMatch(html, /easymap\.land\.moi\.gov\.tw/);
  assert.match(html, /href="https:\/\/land-query\.tainan\.gov\.tw\/query\/rwd\/valueprice\.jsp\?menu=false"/);
});

test("抵押權設定倍率保留既有值並使用白話貸款標籤", () => {
  assert.match(html, /data-chip-input="mortgageSettingRatio"/);
  assert.match(html, /class="chip" data-value="1\.2">銀行貸款<\/button>/);
  assert.match(html, /class="chip" data-value="0">不用貸款<\/button>/);
  assert.match(html, /<input id="mortgageSettingRatio" type="hidden" value="1\.2">/);
});

test("聯絡列在桌機進入主流程，手機維持固定電話與 LINE 列", () => {
  assert.match(html, /<div class="float-contact" id="floatContact"/);
  assert.match(html, /href="tel:\+886927617207"[^>]*aria-label="撥打電話/);
  // LINE 官方帳號要跟好友鎖定畫面同一組
  assert.match(html, /href="https:\/\/line\.me\/R\/ti\/p\/@tainanwei"/);
  assert.match(html, /<svg class="float-contact__icon"/);

  const marker = html.lastIndexOf("/* Consultant B wizard theme */");
  assert.ok(marker > -1, "應有 Consultant B 視覺層");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  const mobile = css.slice(css.lastIndexOf("@media (max-width: 620px)"));

  assert.match(css, /\.float-contact\s*\{[^}]*position:\s*static[^}]*display:\s*grid/s);
  assert.match(css, /\.float-contact__btn\s*\{[^}]*min-height:\s*48px[^}]*background:\s*var\(--consultant-terracotta\)/s);
  assert.match(mobile, /\.float-contact\s*\{[^}]*position:\s*fixed[^}]*right:\s*12px[^}]*bottom:\s*12px[^}]*left:\s*12px/s);
  // 固定列不可以蓋住頁尾內容。
  assert.match(mobile, /\.shell\s*\{[^}]*padding:\s*10px 0 92px/s);

  // 頁首已不放電話，浮動列要一進站就在，不再等捲動
  assert.doesNotMatch(html, /setupFloatContact/);
  assert.doesNotMatch(css, /\.float-contact\.is-visible/);
});

test("手機頁首不再重複放電話按鈕", () => {
  const marker = html.indexOf("/* Hero banner：把「開始試算」變成視覺主角 */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  // 手機的電話入口由底部浮動列負責
  assert.match(css, /\.brand-hero__identity\s*\{\s*display:\s*none;\s*\}/);
  assert.doesNotMatch(css, /\.brand-hero__identity \.brand-hero__tel\s*\{[^}]*background:\s*var\(--brand-terracotta\)/s);
  // 桌機的聯絡資訊要保留
  assert.match(html, /<div class="brand-hero__identity" aria-label="客戶專屬聯絡資訊">/);
});

test("圖片摘要要收錄區塊內的每一組金額", () => {
  // 寬限期前後月付併在同一張卡，querySelector 只抓第一組會整組漏掉
  assert.doesNotMatch(html, /const headline = block\.querySelector\(":scope > strong"\)/);
  assert.match(html, /\[\.\.\.block\.children\]\.forEach\(child => \{[\s\S]*?child\.tagName === "STRONG"/);
  // 只有說明文字的區塊（青安＋一般房貸拆分）也要留下
  assert.match(html, /const note = block\.querySelector\(":scope > \.policy-note"\)/);
  assert.match(html, /parts\.push\(`※ \$\{note\}`\)/);
});

test("存成圖片在手機要走系統分享面板", () => {
  // a[download] 在 LINE 內建瀏覽器（iOS WKWebView）會被忽略，檔案存不進相簿
  assert.match(html, /const isTouch = window\.matchMedia\("\(pointer: coarse\)"\)\.matches/);
  assert.match(html, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(html, /await navigator\.share\(\{ files: \[file\], title: fileName \}\)/);
  // 觸控裝置不可退回 a[download]
  assert.match(html, /if \(!isTouch && "download" in link\)/);
  // 使用者自己取消分享不該再彈備援
  assert.match(html, /if \(error && error\.name === "AbortError"\) return "shared"/);
  // 最後備援：長按儲存
  assert.match(html, /function showImageSaveFallback\(url, fileName\)/);
  assert.match(html, /長按下面的圖片/);
  // 改成非同步後呼叫端要接 promise
  assert.match(html, /async function downloadResultJpg\(group\)/);
  assert.match(html, /downloadResultJpg\(group\)\.then\(outcome =>/);
});

test("分頁列不換行", () => {
  const marker = html.indexOf("/* Compact tool layout redesign */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /\.tabs\s*\{[^}]*flex-wrap:\s*nowrap/s);
});

test("五個計算器分頁在桌機與手機使用核定字級", () => {
  const marker = html.indexOf("/* Consultant B wizard theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.tabs \.tab\s*\{[^}]*font-size:\s*16px/s);
  assert.match(css, /\.tabs \.tab\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /@media \(max-width:\s*620px\)[\s\S]*\.tabs \.tab\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css, /\.tabs \.tab\s*\{[^}]*white-space:\s*nowrap/s);
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

test("桌機沿用核定主視覺且作用中分頁會捲入視野", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block[^}]*width:\s*100%/s);
  assert.match(css, /\.brand-hero__content,\s*\.brand-hero__identity,\s*\.brand-hero__portrait\s*\{[^}]*display:\s*none/s);
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

  assert.match(css, /\.brand-hero__mobile-art\s*\{[^}]*display:\s*block/s);
  assert.match(css, /\.brand-hero\s*\{[^}]*width:\s*100%[^}]*min-height:\s*0/s);
  assert.match(css, /\.workspace\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s);
  assert.match(css, /@media \(min-width:\s*901px\)\s*\{[\s\S]*\.form-grid/);
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
