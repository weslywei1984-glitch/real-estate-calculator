# Land Increment Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依瀏覽器標註移除土地漲多少計算器的品牌膠囊與步驟數字，並精簡結果文案。

**Architecture:** 只修改單一靜態頁面的標記、CSS 與結果顯示字串。以 Node.js 靜態契約測試防止被移除的元素或舊文案回歸。

**Tech Stack:** 靜態 HTML/CSS/JavaScript、Node.js 內建測試執行器、GitHub Pages

## Global Constraints

- 不修改計算公式、輸入模式、欄位、結果明細或其他頁面。
- 正數結果使用「這塊土地估算漲了 X 萬」，X 最多一位小數。
- 桌機與手機都不得保留品牌膠囊或步驟數字的空白欄位。
- 工具列不得顯示官方頁面與輸入單位；固定以元計算，並把舊萬元存檔轉為元。

---

### Task 1: 精簡土地漲多少計算器

**Files:**
- Create: `tests/land-increment-cleanup.test.cjs`
- Modify: `land-increment-total.html`

**Interfaces:**
- Consumes: `increase` 土地漲價數值。
- Produces: 無品牌膠囊、無步驟編號、以萬元顯示的結果說明。

- [ ] **Step 1: 新增回歸測試**

測試必須確認 `.brand-line`、`.step-mark` 與舊答案句不存在，並確認欄位為單欄及新文案使用 `increase / 10000`。

後續標註測試同時確認工具列不再有官方頁面或單位選單，金額固定以元計算，舊萬元存檔可安全轉換。

- [ ] **Step 2: 確認測試先失敗**

Run: `node --test tests/land-increment-cleanup.test.cjs`

Expected: FAIL，因現有頁面仍包含品牌膠囊、步驟數字與舊答案句。

- [ ] **Step 3: 最小修改 HTML、CSS 與結果文案**

刪除品牌膠囊與全部步驟標記；將 `.field-row` 改為 `grid-template-columns: minmax(0, 1fr)`；正數結果以萬元格式輸出。

- [ ] **Step 4: 執行新測試與完整測試**

Run: `node --test tests/land-increment-cleanup.test.cjs`

Run: `npm.cmd test`

Expected: 全部 PASS，0 failures。

- [ ] **Step 5: 提交、推送與正式頁面驗證**

提交本次檔案並推送 `main`。等待 GitHub Pages 成功後，以 430px 與桌機寬度確認元素已移除、答案文案正確且 console 無 error。
