# 公開瀏覽器存取設計

## 目標

讓房地產試算工具能在 iPhone、Android 的 Safari、Chrome 與 LINE 內建瀏覽器直接開啟使用，不再以 LINE 登入或好友狀態阻擋頁面。保留既有 LINE 詢問連結，讓使用者完成試算後自行聯絡台南小魏。

## 現況與原因

三個公開頁面目前都載入 LINE LIFF SDK 與 `assets/liff-gate.js`。該程式會先建立全螢幕遮罩，未能完成 LINE 驗證時顯示「官方帳號好友專屬」，因此一般手機瀏覽器無法直接使用工具。

## 方案比較

1. **移除三個頁面的 LIFF SDK 與好友鎖載入（採用）**：外部瀏覽器直接使用，不再依賴第三方 SDK；改動小、故障點最少。
2. 保留 LIFF 程式但預設放行：表面上可用，但仍下載不需要的 SDK，未來容易再次被舊邏輯鎖住。
3. 外部瀏覽器改成 LINE 帳號登入：仍有登入摩擦與 LIFF 設定依賴，不符合「每個手機直接使用」的目標。

## 修改範圍

- 從 `index.html`、`land-increment-total.html`、`tainan-land-value-helper.html` 移除 LINE LIFF SDK 與 `assets/liff-gate.js` 的 `<script>` 載入。
- 保留 `assets/liff-gate.js` 檔案作為歷史與快速回復用途，但公開頁面不再執行它。
- 更新專案 `AGENTS.md` 的公開連結與存取規則，避免後續修改誤把好友鎖加回來。
- 保留主頁既有電話與 LINE 詢問按鈕，不變更人物圖、版面、試算公式、政策數字、localStorage 或網址 hash。

## 測試與驗收

- 先新增回歸測試，確認三個公開頁面不得載入 LIFF SDK 或 `liff-gate.js`；測試在修改前必須失敗。
- 修改後執行完整 `npm test`，既有測試與新增測試全部通過。
- 部署後以手機尺寸開啟 GitHub Pages，確認沒有 `#liffGate` 遮罩、主頁可直接操作、LINE 詢問連結仍存在。
- 核對線上部署版本與本機提交一致。

## 成功標準

使用者從 Safari、Chrome 或 LINE 點開公開網址時，第一個畫面直接是試算工具；不需要 LINE 登入或先加好友，且仍能從頁面上的 LINE 按鈕聯絡台南小魏。
