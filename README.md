# 房地稅費與貸款試算

單頁網頁試算工具，包含房地合一稅、買方費用、房貸月付與新青安試算。

## 本機預覽

`npm start` 僅供本機 HTTP 預覽與瀏覽器驗證；不代表正式環境需要 Node.js。

```bash
npm start
```

開啟：

```text
http://127.0.0.1:8787/tainan-land-value-helper.html
```

## 正式部署

- 正式網域：`https://calc.tainanwei.com/`
- VPS Nginx 直接提供靜態檔案，root 為 `/var/www/real-estate-calculator/current`。
- `tainanwei.service` 必須保持 `inactive`，8787 port 必須保持未監聽。
- GitHub 僅作原始碼備份；推送 `main` 不等於正式發布。

台南公告土地現值工具使用 `assets/land-values/` 的靜態資料；「前次移轉現值」API 目前停用。正式發布與版本化回復流程請見 [DEPLOY.md](DEPLOY.md)。
