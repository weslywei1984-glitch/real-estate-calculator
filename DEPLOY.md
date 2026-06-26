# 公開部署說明

這個工具需要 Node.js 主機，不能只用靜態網頁空間。

## 部署設定

- Runtime：Node.js 20 以上
- Build command：不用填，或填 `npm install`
- Start command：`npm start`
- Public URL：部署完成後開啟 `/tainan-land-value-helper.html`

## 環境變數

一般部署平台會自動提供 `PORT`，不需要另外設定。

可選：

- `NODE_ENV=production`
- `DEBUG_TRANSFER=0`

公開使用時建議保持 `DEBUG_TRANSFER=0`，避免把查詢摘要寫到 `output/last-transfer-result.json`。

## 本機使用

雙擊 `start-tainan-land-value-helper.bat`，或在資料夾內執行：

```bash
npm start
```

再開啟：

```text
http://127.0.0.1:8787/tainan-land-value-helper.html
```

## 注意事項

前次移轉現值查詢會把使用者填入的地號與權利人統一編號送到本服務，再由本服務送往台南市官方查詢頁。公開給一般人使用前，請確認使用者知道資料會用於官方查詢。
