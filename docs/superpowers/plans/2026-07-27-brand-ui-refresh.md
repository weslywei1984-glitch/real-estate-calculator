# 房地稅費與貸款試算品牌化 UI 改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將主頁四個計算器改為與 `tainanwei.com` 一致的深海軍藍、暖米白、陶土橘品牌介面，同時保留全部計算、互動與 LIFF 流程。

**Architecture:** 繼續使用單一 `index.html`，先把靜態合成頁首改成可維護的 HTML 結構，再於現有 IMAGE2 樣式與手機青安壓縮樣式後新增最後一層品牌 CSS 覆寫。測試以 Node 內建 test runner 驗證頁首語意、品牌 token、響應式契約與既有青安功能，最後以本機瀏覽器實測四個分頁、375px 排版與 console。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Node.js `node:test`、Codex 內建瀏覽器。

## Global Constraints

- 網站文案一律使用繁體中文，品牌資料維持「台南小魏 買厝作伙｜魏泉承｜永慶不動產-小東南紡店｜0927-617-207」。
- `index.html` 維持單一檔案，不拆 CSS 或 JS，不引入外部框架、CSS library 或 CDN。
- 四個計算器的欄位、公式、政策數字、驗證、結果、localStorage、網址 hash、LIFF 好友鎖與免責聲明不得改變。
- 買方仲介服務費固定為成交總價 2%，不得新增可調整欄位。
- 主頁採 `#102738` 深海軍藍、`#f4efe5` 暖米白、`#b94f2c` 陶土橘；成功、警告與錯誤保留語意色。
- 沿用 `assets/xiaowei-profile.png`，不重新生成或修改人物照片。
- 375px 手機版不得水平溢出、欄位截斷或按鈕重疊。
- 保留現有尚未提交的青安手機摘要壓縮 CSS 與其測試，不回復或覆蓋使用者工作。

---

### Task 1: 建立品牌頁首的可維護 HTML 結構

**Files:**
- Create: `tests/brand-ui-refresh.test.cjs`
- Modify: `index.html:2303-2335`

**Interfaces:**
- Consumes: `assets/xiaowei-profile.png`、既有 `.shell` 與 `.tabs`。
- Produces: `.brand-hero`、`.brand-hero__content`、`.brand-hero__profile`、`.brand-hero__baseline`，供 Task 2 CSS 使用。

- [ ] **Step 1: 寫入失敗的頁首契約測試**

```js
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
```

- [ ] **Step 2: 執行測試並確認因新結構尚不存在而失敗**

Run: `node --test tests/brand-ui-refresh.test.cjs`

Expected: FAIL，訊息包含 `品牌頁首使用可維護文字與透明人物素材`。

- [ ] **Step 3: 以語意化 HTML 取代靜態合成頁首**

```html
<header class="brand-hero">
  <div class="brand-hero__content">
    <p class="brand-hero__eyebrow">TAINAN REAL ESTATE CALCULATOR</p>
    <h1>房地稅費與貸款試算</h1>
    <p class="brand-hero__lead">把複雜的稅費與貸款，整理成看得懂的數字。</p>

    <div class="brand-hero__identity" aria-label="客戶專屬聯絡資訊">
      <span class="brand-mark" aria-hidden="true">魏</span>
      <span>
        <strong>台南小魏 買厝作伙</strong>
        <small>魏泉承｜永慶不動產-小東南紡店｜0927-617-207</small>
      </span>
    </div>

    <p class="brand-hero__notice">
      以新臺幣輸入金額，快速估算出售房地合一稅、買方準備現金與房貸月付。
      <span>正式申報仍以稅務機關、地政士、銀行核定為準。</span>
    </p>
  </div>

  <div class="brand-hero__portrait">
    <img class="brand-hero__profile" src="assets/xiaowei-profile.png"
      width="609" height="900" fetchpriority="high"
      alt="台南小魏魏泉承">
  </div>

  <div class="brand-hero__baseline" aria-label="資料版本">
    <span>資料基準</span>
    <strong>2026-07-16</strong>
  </div>
</header>
```

- [ ] **Step 4: 執行頁首契約測試並確認通過**

Run: `node --test tests/brand-ui-refresh.test.cjs`

Expected: 2 tests PASS。

- [ ] **Step 5: 提交頁首結構**

```powershell
git add -- index.html tests/brand-ui-refresh.test.cjs
git commit -m "feat: rebuild calculator brand header"
```

---

### Task 2: 建立品牌色彩與元件視覺覆寫

**Files:**
- Modify: `index.html` 的最後一個 `</style>` 前
- Modify: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: Task 1 的 `.brand-hero*` 結構與既有 `.tabs`、`.panel`、`.control`、`.metric`、`.primary`、`.secondary`。
- Produces: `/* Tainanwei brand tool theme */` 最終主題層與 `--brand-*` CSS tokens。

- [ ] **Step 1: 新增失敗的品牌 token 與元件契約測試**

```js
test("最後一層主題採用台南小魏品牌色", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  assert.ok(marker > -1, "應新增品牌工具主題");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /--brand-navy:\s*#102738/);
  assert.match(css, /--brand-cream:\s*#f4efe5/);
  assert.match(css, /--brand-terracotta:\s*#b94f2c/);
  assert.match(css, /\.panel\s*\{[^}]*border-radius:\s*12px/s);
  assert.match(css, /\.control\s*\{[^}]*border-radius:\s*9px/s);
  assert.match(css, /\.primary[^}]*\{[^}]*background:\s*var\(--brand-terracotta\)/s);
  assert.doesNotMatch(css, /linear-gradient\([^)]*#d1a258/);
});

test("品牌主題提供可見的鍵盤焦點與減少動態效果", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
```

- [ ] **Step 2: 執行測試並確認因品牌主題尚不存在而失敗**

Run: `node --test tests/brand-ui-refresh.test.cjs`

Expected: FAIL，訊息包含 `應新增品牌工具主題`。

- [ ] **Step 3: 在現有所有樣式後新增品牌 token 與基礎版面**

```css
/* Tainanwei brand tool theme */
:root {
  --brand-navy: #102738;
  --brand-navy-strong: #0b1f2c;
  --brand-cream: #f4efe5;
  --brand-paper: #fffdf8;
  --brand-terracotta: #b94f2c;
  --brand-terracotta-dark: #963f24;
  --brand-ink: #2d2b28;
  --brand-muted: #6f6a62;
  --brand-line: #d8d0c3;
  --brand-success: #176b5b;
  --brand-warning: #9a621e;
  --brand-error: #a33b32;
  --bg: var(--brand-cream);
  --panel: var(--brand-paper);
  --ink: var(--brand-ink);
  --muted: var(--brand-muted);
  --line: var(--brand-line);
  --shadow: 0 14px 34px rgba(16, 39, 56, .09);
  --shadow-soft: 0 6px 18px rgba(16, 39, 56, .07);
}

body {
  background: var(--brand-cream);
  color: var(--brand-ink);
}

body::before {
  opacity: .32;
  background-image: radial-gradient(rgba(16, 39, 56, .14) .7px, transparent .7px);
  background-size: 18px 18px;
  mask-image: linear-gradient(180deg, #000, transparent 58%);
}

.shell {
  width: min(1220px, calc(100% - 40px));
  padding: 28px 0 52px;
}
```

- [ ] **Step 4: 實作品牌頁首、分頁與工具元件樣式**

```css
.brand-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, .68fr);
  min-height: 390px;
  overflow: hidden;
  padding: 48px 48px 0;
  color: #fff;
  background: var(--brand-navy);
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.brand-hero__content {
  z-index: 2;
  align-self: center;
  padding-bottom: 42px;
}

.brand-hero h1 {
  max-width: 720px;
  margin: 8px 0 12px;
  color: #fff;
  font-family: "Noto Serif TC", "PMingLiU", serif;
  font-size: clamp(2.6rem, 5vw, 4.7rem);
  line-height: 1.08;
  letter-spacing: -.04em;
}

.brand-hero__eyebrow,
.brand-hero__baseline span {
  color: #e98767;
  font-size: .75rem;
  font-weight: 850;
  letter-spacing: .16em;
}

.brand-hero__lead {
  margin: 0 0 22px;
  color: rgba(255, 255, 255, .8);
  font-size: 1.06rem;
}

.brand-hero__identity {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-left: 3px solid var(--brand-terracotta);
  background: rgba(255, 255, 255, .06);
}

.brand-hero__identity small,
.brand-hero__notice span {
  display: block;
}

.brand-hero__portrait {
  position: relative;
  align-self: end;
  height: 100%;
}

.brand-hero__profile {
  position: absolute;
  right: 4%;
  bottom: 0;
  width: min(390px, 100%);
  height: auto;
}

.brand-hero__baseline {
  position: absolute;
  top: 26px;
  right: 28px;
  z-index: 3;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, .24);
  background: rgba(11, 31, 44, .72);
}

.tabs {
  margin: 16px 0;
  padding: 5px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 10px;
  background: var(--brand-navy);
  box-shadow: var(--shadow-soft);
}

.tab {
  border-radius: 7px;
  color: rgba(255, 255, 255, .72);
}

.tab[aria-selected="true"],
.tab[data-tab="buyer"][aria-selected="true"],
.tab[data-tab="loan"][aria-selected="true"],
.tab-young[aria-selected="true"] {
  color: #fff;
  background: var(--brand-terracotta);
  box-shadow: none;
}

.panel {
  border: 1px solid var(--brand-line);
  border-radius: 12px;
  background: var(--brand-paper);
  box-shadow: var(--shadow-soft);
}

.panel-head {
  padding: 18px 20px;
  border-bottom: 1px solid var(--brand-line);
  background: transparent;
}

.control {
  min-height: 50px;
  border: 1px solid var(--brand-line);
  border-radius: 9px;
  background: #fff;
}

.control:hover,
.control:focus-within {
  border-color: var(--brand-terracotta);
  box-shadow: 0 0 0 3px rgba(185, 79, 44, .12);
}

.primary,
.young-primary {
  color: #fff;
  background: var(--brand-terracotta);
  box-shadow: none;
}

.secondary {
  color: var(--brand-navy);
  border-color: rgba(16, 39, 56, .28);
  background: transparent;
}

.metric {
  border: 1px solid var(--brand-line);
  border-radius: 10px;
  background: #fff;
  box-shadow: none;
}

.metric.main,
.metric.young-main {
  color: #fff;
  border-color: var(--brand-navy);
  background: var(--brand-navy);
}

.metric.main span,
.metric.young-main span {
  color: rgba(255, 255, 255, .72);
}

.metric.main strong,
.metric.young-main strong {
  color: #fff;
}

:where(button, input, select, a):focus-visible {
  outline: 3px solid rgba(185, 79, 44, .42);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: .01ms !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 5: 套用青安摘要與表格的同品牌樣式**

```css
.young-hero {
  color: #fff;
  background: var(--brand-navy);
}

.young-hero::before {
  border-color: rgba(255, 255, 255, .12);
  background: rgba(255, 255, 255, .04);
}

.young-kicker {
  color: #ffd8c8;
  border-color: rgba(233, 135, 103, .42);
  background: rgba(185, 79, 44, .16);
}

.eligibility-item:has(input:checked),
.check-row:has(input:checked) {
  border-color: rgba(185, 79, 44, .3);
  background: #fff6f1;
}

.table-wrap {
  border: 1px solid var(--brand-line);
  border-radius: 9px;
}

.amortization th {
  color: var(--brand-navy);
  background: #eee7dc;
}
```

- [ ] **Step 6: 執行品牌契約與既有測試**

Run: `npm.cmd test`

Expected: 全部 PASS，且 `young-housing-loan-3-markup.test.cjs` 的手機摘要測試仍通過。

- [ ] **Step 7: 提交品牌元件主題**

```powershell
git add -- index.html tests/brand-ui-refresh.test.cjs
git commit -m "style: apply Tainanwei calculator theme"
```

---

### Task 3: 完成桌機、平板與手機響應式

**Files:**
- Modify: `index.html` 的 `/* Tainanwei brand tool theme */` 區塊
- Modify: `tests/brand-ui-refresh.test.cjs`

**Interfaces:**
- Consumes: Task 2 的 `--brand-*` tokens 與 `.brand-hero*` 元件。
- Produces: 900px 單欄版面、620px 緊湊頁首與可橫向滑動分頁。

- [ ] **Step 1: 新增失敗的響應式契約測試**

```js
test("品牌主題在平板與手機提供緊湊版面", () => {
  const marker = html.indexOf("/* Tainanwei brand tool theme */");
  const css = html.slice(marker, html.indexOf("</style>", marker));

  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /\.brand-hero\s*\{[^}]*min-height:\s*300px/s);
  assert.match(css, /\.tabs\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.tab\s*\{[^}]*min-width:\s*112px/s);
});
```

- [ ] **Step 2: 執行測試並確認因響應式品牌樣式尚不存在而失敗**

Run: `node --test tests/brand-ui-refresh.test.cjs`

Expected: FAIL，訊息包含 `品牌主題在平板與手機提供緊湊版面`。

- [ ] **Step 3: 新增平板單欄與手機緊湊樣式**

```css
@media (max-width: 900px) {
  .brand-hero {
    grid-template-columns: minmax(0, 1fr) minmax(210px, .56fr);
    min-height: 340px;
    padding: 38px 34px 0;
  }

  .workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .shell {
    width: min(100% - 28px, 1220px);
    padding-top: 14px;
  }

  .brand-hero {
    display: block;
    min-height: 300px;
    padding: 24px 18px 0;
  }

  .brand-hero__content {
    width: 67%;
    padding-bottom: 18px;
  }

  .brand-hero h1 {
    margin-top: 5px;
    font-size: clamp(1.8rem, 8.5vw, 2.35rem);
  }

  .brand-hero__lead {
    margin-bottom: 12px;
    font-size: .8rem;
  }

  .brand-hero__identity {
    padding: 8px 10px;
  }

  .brand-hero__identity small,
  .brand-hero__notice {
    font-size: .68rem;
  }

  .brand-hero__portrait {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 42%;
    height: 78%;
  }

  .brand-hero__baseline {
    top: 12px;
    right: 12px;
    padding: 6px 8px;
    font-size: .68rem;
  }

  .tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs::-webkit-scrollbar {
    display: none;
  }

  .tab {
    flex: 0 0 auto;
    min-width: 112px;
    min-height: 44px;
  }

  .panel-head,
  .section {
    padding: 16px;
  }

  .actions button {
    min-height: 44px;
  }
}
```

- [ ] **Step 4: 執行完整測試**

Run: `npm.cmd test`

Expected: 全部 PASS。

- [ ] **Step 5: 提交響應式改版**

```powershell
git add -- index.html tests/brand-ui-refresh.test.cjs
git commit -m "style: refine calculator responsive layout"
```

---

### Task 4: 執行功能、視覺與正式站回歸驗證

**Files:**
- Verify: `index.html`
- Verify: `tests/brand-ui-refresh.test.cjs`
- Verify: `tests/young-housing-loan-3-markup.test.cjs`
- Verify: `tests/young-housing-loan-3-policy.test.cjs`

**Interfaces:**
- Consumes: Task 1 至 Task 3 的完成版。
- Produces: 通過的自動測試、桌機與 375px 瀏覽器證據、無 console error 的正式部署。

- [ ] **Step 1: 執行靜態與完整自動測試**

```powershell
npm.cmd test
git diff --check
```

Expected: 所有 tests PASS；`git diff --check` 無輸出。

- [ ] **Step 2: 啟動本機伺服器**

```powershell
npm.cmd start
```

Expected: `http://127.0.0.1:8787/index.html#tax` 回傳 HTTP 200。

- [ ] **Step 3: 驗證桌機四個計算器**

依序切換：

1. `#tax`
2. `#buyer`
3. `#loan`
4. `#young`

每個分頁都執行「套用範例」，確認：

- 結果區進入成功狀態。
- 清空、複製結果、存成圖片按鈕仍存在且可操作。
- 表單與結果維持雙欄。
- 頁首、分頁、表單卡片與結果卡片使用品牌色。
- Console error 數量為 0。

- [ ] **Step 4: 使用 375x812 viewport 驗證手機版**

確認：

- `document.documentElement.scrollWidth === document.documentElement.clientWidth`。
- 頁首高度不超過 300px。
- 四個分頁單列可水平滑動且文字完整。
- 表單與結果改為單欄。
- 青安政策四項維持 2x2 緊湊排列。
- 按鈕沒有重疊，輸入欄與表格沒有超出 viewport。

- [ ] **Step 5: 檢查工作區並提交剩餘驗證調整**

```powershell
git status --short
git diff -- index.html tests/brand-ui-refresh.test.cjs tests/young-housing-loan-3-markup.test.cjs
git add -- index.html tests/brand-ui-refresh.test.cjs tests/young-housing-loan-3-markup.test.cjs
git commit -m "test: verify calculator brand refresh"
```

只有存在實際驗證調整時才建立此 commit；不得加入未追蹤的 `tools/`。

- [ ] **Step 6: 推送並驗證正式部署**

```powershell
git push origin main
```

等待 GitHub Pages 完成後，以帶版號網址驗證：

```text
https://weslywei1984-glitch.github.io/real-estate-calculator/?v=<short-commit>#tax
```

Expected:

- HTTP 200。
- 正式 HTML 包含 `/* Tainanwei brand tool theme */`。
- 桌機與 375px 顯示與本機一致。
- Console error 數量為 0。
- 提供使用者新的 `?v=` 網址避免快取。
