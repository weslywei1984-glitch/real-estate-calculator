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

## 私有匿名使用分析

三個公開計算器仍是靜態網站；只有 `POST /api/analytics/event` 與 `GET /api/analytics/summary` 經 Nginx 交由 PHP-FPM（`/run/php/php8.3-fpm.sock`）處理。`/analytics/` 是 Basic Auth 保護的私有 dashboard，使用者名稱固定為 `xiaowei`；密碼只在部署時一次隨機產生並保存於密碼管理器，絕不進入 Git。

分析 SQLite、設定、htpasswd 與備份均在 web root 外。事件或摘要 API 失敗時，公開計算器必須照常運作，不能被 analytics 阻斷。正式環境保持 `tainanwei.service` inactive、8787 未監聽；不需要 `npm start` 或 Node listener。

測試：

```bash
npm test
node --test tests/private-analytics-ops.test.cjs
node tests/run-php-analytics-tests.cjs
```

完整安裝、Nginx 驗證、備份、migration、認證 smoke 與 rollback 請見 [DEPLOY.md](DEPLOY.md)。

台南公告土地現值工具使用 `assets/land-values/` 的靜態資料；「前次移轉現值」API 目前停用。正式發布與版本化回復流程請見 [DEPLOY.md](DEPLOY.md)。
