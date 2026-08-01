# Public Browser Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓三個公開試算頁面在 Safari、Chrome 與 LINE 內建瀏覽器直接使用，不再顯示 LINE 好友驗證遮罩。

**Architecture:** 取消 HTML 對 LINE LIFF SDK 與共用好友鎖的載入，讓頁面不再建立 `#liffGate`。既有 `assets/liff-gate.js` 保留但不執行，主頁的電話與 LINE 詢問連結維持原狀。

**Tech Stack:** 靜態 HTML、Node.js 內建測試執行器、GitHub Pages

## Global Constraints

- 不變更人物圖、版面、試算公式、政策數字、localStorage 或網址 hash。
- 主頁既有 `https://line.me/R/ti/p/@tainanwei` 聯絡連結必須保留。
- 三個公開頁面都不得載入 LIFF SDK 或 `assets/liff-gate.js`。
- 部署後必須用手機尺寸實際驗證線上 GitHub Pages。

---

### Task 1: 鎖定公開瀏覽器存取契約

**Files:**
- Create: `tests/public-browser-access.test.cjs`
- Modify: `index.html:15-16`
- Modify: `land-increment-total.html:8-9`
- Modify: `tainan-land-value-helper.html:7-8`

**Interfaces:**
- Consumes: 三個 GitHub Pages 公開 HTML 入口。
- Produces: 不載入 LIFF 驗證、但仍保留主頁 LINE 聯絡入口的靜態頁面。

- [ ] **Step 1: 寫入失敗測試**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const publicPages = [
  "index.html",
  "land-increment-total.html",
  "tainan-land-value-helper.html",
];

test("公開頁面不載入 LINE LIFF 好友鎖", () => {
  for (const file of publicPages) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(html, /static\.line-scdn\.net\/liff/i, file);
    assert.doesNotMatch(html, /assets\/liff-gate\.js/i, file);
  }
});

test("主頁保留 LINE 詢問入口", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /https:\/\/line\.me\/R\/ti\/p\/@tainanwei/);
});
```

- [ ] **Step 2: 執行測試並確認因現有好友鎖而失敗**

Run: `node --test tests/public-browser-access.test.cjs`

Expected: 第一項測試 FAIL，指出 `index.html` 仍包含 LINE LIFF SDK；第二項測試 PASS。

- [ ] **Step 3: 做最小實作**

從三個 HTML `<head>` 各移除以下兩行：

```html
<script charset="utf-8" src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
<script src="assets/liff-gate.js"></script>
```

- [ ] **Step 4: 執行新測試與完整測試**

Run: `node --test tests/public-browser-access.test.cjs`

Expected: 2 tests PASS。

Run: `npm.cmd test`

Expected: 全部測試 PASS，0 failures。

### Task 2: 同步專案規則與部署驗證

**Files:**
- Modify: `AGENTS.md:52-58`

**Interfaces:**
- Consumes: 已確認的公開瀏覽器存取政策。
- Produces: 後續工作不會誤把好友鎖加回來的專案指示，以及已部署的 GitHub Pages。

- [ ] **Step 1: 更新專案存取規則**

把「LINE LIFF 好友鎖」改為「公開瀏覽器存取」：三個頁面不得載入好友鎖；對外分享使用 GitHub Pages；LINE 按鈕僅作為使用後的聯絡入口。

- [ ] **Step 2: 檢查差異並提交**

Run: `git diff --check`

Expected: 無輸出且 exit code 0。

Run: `git add AGENTS.md index.html land-increment-total.html tainan-land-value-helper.html tests/public-browser-access.test.cjs docs/superpowers/plans/2026-08-01-public-browser-access.md && git commit -m "fix: allow direct browser access"`

Expected: commit 成功，只包含本次五個修改檔、測試檔與計畫文件。

- [ ] **Step 3: 推送並等待 GitHub Pages 部署成功**

Run: `git push origin main`

Expected: push 成功；對應 GitHub Pages workflow 結束且 conclusion 為 `success`。

- [ ] **Step 4: 驗證線上手機版**

以 430 × 932 開啟帶新 `?v=` 參數的正式網址，確認：

```text
#liffGate 不存在
第一個畫面直接顯示試算工具
LINE 詢問連結仍指向 https://line.me/R/ti/p/@tainanwei
console 沒有專案程式 error
```

- [ ] **Step 5: 核對部署提交**

Run: `git rev-parse HEAD` 與 `git ls-remote origin refs/heads/main`

Expected: 本機、遠端 main 的 SHA 完全相同。
