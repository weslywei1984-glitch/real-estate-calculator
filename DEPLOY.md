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
