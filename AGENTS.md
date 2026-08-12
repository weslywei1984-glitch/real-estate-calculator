# AGENTS.md — AI 助手工作說明

## 品牌與聯絡資訊(所有對外文案都要用這組資料)

- 姓名:魏泉承
- 品牌:台南小魏 買厝作伙
- 電話:0927-617-207
- 任職:永慶不動產-小東南紡店
- 網站文案一律使用繁體中文(台灣用語)。

## 專案是什麼

台灣不動產試算工具,給台南的買賣方客戶使用。主頁 `index.html` 是單一檔案的網頁應用,含四個公開計算器:

1. 房地合一稅(出售所得)
2. 買方現金需求(稅費、規費、代辦費)
3. 房貸月付(本息平均/本金平均、寬限期)
4. 青安貸款 3.0(政策情境試算)

其他檔案:
- `breakeven.html`:不放在公開導覽的房屋平轉成本獨立工具，正式網址為 `/breakeven.html`。使用獨立 localStorage key `realEstateBreakevenInputs.v1`，不得接入公開分析事件，也不得從 `index.html` 加入連結。
- `tainan-land-value-helper.html`:台南公告土地現值查詢。公告現值查詢用 `assets/land-values/` 的各行政區靜態資料；「前次移轉現值」API 流程目前停用，正式站不執行 Node 伺服器。
- `land-increment-total.html`:土地漲價總數額試算。

## 程式慣例

- `index.html` 的 CSS、JS 全部寫在同一個檔案內,不拆檔、不引入外部框架或 CDN。
- CSS 有三層主題疊加,最後一層(墨綠+金色的「IMAGE2」風格)是目前的視覺,新樣式加在 `</style>` 前面。
- 金額輸入欄用 `setupNumericInputs()` 轉成千分位文字輸入;新增金額欄位時照現有 `.field > .control` 結構寫即可自動套用。
- 公開四工具輸入存在 localStorage(key:`realEstateCalcInputs.v1`)；平轉獨立頁使用 `realEstateBreakevenInputs.v1`。新增欄位時記得在對應頁面的 `defaults` 與儲存欄位清單補預設值。
- 公開分頁狀態記在網址 hash(`#tax` / `#buyer` / `#loan` / `#young`)；`#breakeven` 不得加回公開首頁。

## 修改規則

- **稅率、免稅額、政策數字不可以隨意改**:要改必須附上政府來源(財政部、地政局等),並同步更新頁尾「計算依據」的連結。
- 買方仲介服務費**固定為成交總價 2%**,寫死在程式裡,不做成可調整欄位(使用者 2026-07-08 指示)。
- 新青安 2.0 是「研議中」的情境試算,相關文案要保留「尚待行政院核定」等免責說明。
- 頁面上的免責聲明(正式以稅務機關、地政士、銀行核定為準)不可刪除。
- 改完要在本機開起來驗證四個公開計算器與 `breakeven.html` 都能算出結果、手機版(375px)排版正常、console 沒有錯誤。

## 社群貼文風格(成交文、開發文、買方故事、屋主溝通文、房仲日常貼文)

幫使用者寫這類文案時,優先用這種模式:

- `#一句重點當小標題`
- 口語、有節奏,不要太像作文
- 每段短短的
- 中間加一點表情符號
- 最後放買房賣房 CTA + 聯絡資訊(台南小魏 買厝作伙|魏泉承 0927-617-207)

原因:看起來不像硬廣告,像在分享真實成交故事,讀者比較容易看完 😊

## 公開瀏覽器存取

- 三個公開分享頁面與不公開導覽的 `breakeven.html` 均不得載入 LINE LIFF SDK 或 `assets/liff-gate.js`，Safari、Chrome 與 LINE 內建瀏覽器都要能直接使用。
- 對外分享唯一正式網域為 `https://calc.tainanwei.com/`；子頁面直接加 `/land-increment-total.html` 或 `/tainan-land-value-helper.html`。
- `assets/liff-gate.js` 僅保留作為歷史與回復用途，公開頁面不執行它。
- 頁面既有 LINE 按鈕只作為使用後的聯絡入口，不可用登入或好友狀態阻擋試算工具。

## 部署

- 正式環境由 VPS Nginx 靜態服務，root 為 `/var/www/real-estate-calculator/current`。
- `tainanwei.service` 必須保持 `inactive`，8787 port 必須保持未監聽。
- GitHub 只作原始碼備份；推送 `main` 不等於正式發布。
- 正式發布後可使用新的 `?v=` 參數避免瀏覽器快取（例如 `?v=6688003`）。

## 私有分析維運邊界

- 公開計算器與 land value helper 維持 Nginx 靜態服務；只有 `POST /api/analytics/event`、`GET /api/analytics/summary` 兩個精確 API 經 PHP-FPM socket `/run/php/php8.3-fpm.sock`。
- `/analytics/` 與 summary 受 Basic Auth 保護；帳號固定 `xiaowei`，密碼只在部署時一次隨機產生，不能寫入 Git、測試、文件或 deployment record。
- SQLite 位於 `/var/lib/real-estate-calculator/analytics.sqlite`，設定位於 `/etc/real-estate-calculator/analytics.env`，認證檔位於 `/etc/nginx/.htpasswd-calculator-analytics`，備份位於 `/var/backups/real-estate-calculator/analytics/`；皆不可置於 web root。
- Nginx 必須封鎖 `/analytics-api/`、`/ops/`、任意其他 analytics API 與直接 `.php` URL。event 僅 POST、30/m、burst 10 nodelay、2k body、關閉 access log；summary 僅 GET。
- 部署前後驗證 `nginx -t`、PHP-FPM、匿名與 authenticated 路由、live event smoke、SQLite backup、schema migration 與 rollback 目標。備份以 SQLite `.backup`、`umask 077`、Taiwan 每日 cron，僅保留最新 30 個指定檔案，不可遞迴刪除。
- `tainanwei.service` 必須保持 `inactive`，8787 必須保持未監聽。正式環境不需要 `npm start` 或 Node listener；analytics 故障不能阻斷公開計算器。
- 執行 analytics 完整測試：`npm test`；ops focused test：`node --test tests/private-analytics-ops.test.cjs`；PHP focused test：`node tests/run-php-analytics-tests.cjs`。
