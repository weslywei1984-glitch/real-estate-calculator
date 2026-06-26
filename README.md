# 房地稅費與貸款試算

單頁網頁試算工具，包含房地合一稅、買方費用、房貸月付與新青安試算。

## 台南公告土地現值工具

`tainan-land-value-helper.html` 需要透過 Node.js 服務啟動，才能協助查詢前次移轉現值。

本機使用：

```bash
npm start
```

開啟：

```text
http://127.0.0.1:8787/tainan-land-value-helper.html
```

公開部署：

- 需要支援 Node.js 的主機。
- 啟動指令：`npm start`
- 主檔案：`tainan-land-value-server.js`
- 環境變數：主機通常會自動提供 `PORT`。

注意：這不是純靜態網站。若只放到 GitHub Pages 這類靜態空間，前次移轉現值自動查詢不會運作。
