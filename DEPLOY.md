# calc.tainanwei.com 靜態部署說明

主計算器由 VPS 上的 Nginx 直接提供靜態檔案，不需要 Node.js 常駐服務。

## 正式環境

- 網域：`https://calc.tainanwei.com/`
- Nginx root：`/var/www/real-estate-calculator/current`
- 版本目錄：`/var/www/real-estate-calculator/releases/<release>`
- 部署紀錄：`/var/www/real-estate-calculator/deployments/<release>/deployment.txt`
- 舊的 `tainanwei.service` 必須保持 `inactive`。
- 8787 port 必須保持未監聽。

## 發布流程

1. 完成本機測試、桌機與手機瀏覽器驗證。
2. 用 Git commit 前 12 碼建立不可變版本目錄。
3. 上傳 `git archive`，解壓到新的 release 目錄。
4. 驗證 release 內容後，原子切換 `current` symlink。
5. 更新 Nginx 的 `X-Calculator-Release`，執行 `nginx -t` 後 reload。
6. 驗證正式網域版本標頭、HTML、桌機與手機畫面及 console。

## 回復

先用 `readlink -f /var/www/real-estate-calculator/current` 確認目前版本，再把 `current` 原子切回已驗證的前一版 release。更新 `X-Calculator-Release`、通過 `nginx -t` 並 reload 後，重新檢查正式網域。

## 本機預覽

`npm start` 只用於本機 HTTP 預覽與瀏覽器驗證，不代表正式環境需要 Node.js。

## 私有分析（PHP-FPM 與 SQLite）

公開的三個計算器頁面仍是 Nginx 直接提供的靜態檔案。只有下列兩個**精確**路由會交給 PHP 8.3 FPM socket `/run/php/php8.3-fpm.sock`：

- `POST /api/analytics/event`
- `GET /api/analytics/summary`

不得將 `analytics-api/`、`ops/`、任意其他 `/api/analytics/` 路由或直接 `.php` URL 公開；這些路徑必須由 Nginx 回應 404。`/analytics/` 與 summary 都使用 Basic Auth；分析頁另需 `X-Robots-Tag: noindex, noarchive` 與 `Cache-Control: no-store`。

持久資料均位於 web root 外：

- SQLite：`/var/lib/real-estate-calculator/analytics.sqlite`
- 設定：`/etc/real-estate-calculator/analytics.env`
- Basic Auth 檔：`/etc/nginx/.htpasswd-calculator-analytics`
- 備份目錄：`/var/backups/real-estate-calculator/analytics/`

`analytics.env` 僅由 root 管理，包含 `database_path`、`hmac_key`、`allowed_origin`。Basic Auth 使用者固定為 `xiaowei`；部署時以 `openssl rand` 產生一次隨機密碼，立刻寫成雜湊至 htpasswd 後交給管理者存入密碼管理器。不可把明文密碼、HMAC key、SQLite 檔或備份提交至 Git、寫入部署紀錄或 shell history。

## 分析發布與驗證

1. 在切換 release 前，對現有資料庫使用 `sqlite3 /var/lib/real-estate-calculator/analytics.sqlite ".backup '<safe-backup-path>'"` 建立 SQLite 線上備份，並備份目前 Nginx site 與 analytics include。
2. 將 `ops/nginx/calculator-analytics-http.conf` 安裝為 `/etc/nginx/conf.d/calculator-analytics-http.conf`，將 `ops/nginx/calculator-analytics-locations.conf` 安裝為 `/etc/nginx/snippets/calculator-analytics-locations.conf`，並在既有 site 的 server block include 後者。
3. 將 `ops/analytics-backup.sh` 安裝為 `/usr/local/sbin/calc-analytics-backup`（0755），將 `ops/analytics-backup.cron` 安裝為 `/etc/cron.d/calc-analytics-backup`（0644）。此工作以 `CRON_TZ=Asia/Taipei` 每日執行、`umask 077`、只以 SQLite `.backup` 備份指定資料庫，並只保留最新 30 個指定檔名的備份。
4. 以 `runuser -u www-data -- php /var/www/real-estate-calculator/current/analytics-api/migrate.php` 執行 schema migration，再執行 `/usr/local/sbin/calc-analytics-backup`。
5. 在 reload 前先執行 `nginx -t`；通過後才 `systemctl reload nginx`。不可啟動 `tainanwei.service`，也不可建立 8787 listener。
6. 匿名驗證：`/analytics/` 與 `/api/analytics/summary?range=30d` 必須為 401；`/analytics-api/event.php`、`/api/analytics/other`、`/ops/` 必須為 404；event 的非 POST 與 summary 的非 GET 必須為 405。
7. 使用保存於密碼管理器的 `xiaowei` 認證驗證 `/analytics/` 與 summary 的 `today`、`7d`、`30d`、`all` 都為 200；以同源 headers 發送一次合法 event，確認 204 與摘要增量。再確認錯誤 Origin、過大 body 與錯誤方法均為安全的 4xx。
8. 以桌機與手機查看三個公開頁及私有 dashboard；公開頁不應顯示計數器，分析 API 暫時失敗也不能阻斷計算器。

發布前與發布後均執行：`systemctl is-active tainanwei.service || true`（預期 `inactive`）、`ss -ltnp '( sport = :8787 )'`（預期無 listener）、`systemctl is-active php8.3-fpm`、`nginx -t`。正式環境不需要 `npm start`，也不需要 Node listener。

## Rollback

保留切換前的 release symlink、Nginx site/include 備份及上述 SQLite `.backup`。若 `nginx -t`、reload、認證測試或 live event smoke 任一失敗：原子切回已驗證的前一 release，還原同一批 Nginx 檔，重新 `nginx -t` 後 reload。資料庫只在確認需要時由管理者以 SQLite 復原程序處理；不得以遞迴刪除清理備份。Rollback 完成後重做匿名/認證路由測試、public calculator smoke、`tainanwei.service` inactive 與 8787 未監聽檢查。
