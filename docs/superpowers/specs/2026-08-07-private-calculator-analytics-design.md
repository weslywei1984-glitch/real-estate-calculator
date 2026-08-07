# 私人試算使用分析後台設計

日期：2026-08-07

狀態：設計內容已逐段確認，待規格文件審閱

正式站：`https://calc.tainanwei.com/`

## 1. 背景

目前正式站由 VPS 上的 Nginx 直接提供靜態檔案，主頁包含房地合一稅、買方費用、房貸月付與新青安四種試算器。網站沒有使用分析服務，也沒有後端計數 API。

這次要新增私人使用分析，讓站主掌握網站與各試算器的實際使用情況。統計結果不公開給一般使用者，只能從密碼保護的 `/analytics/` 後台查看。

2026-08-07 已用唯讀方式確認正式 VPS 具備下列條件：

- Ubuntu 24.04、Nginx、PHP 8.3、PHP-FPM 與 SQLite 已安裝。
- `php8.3-fpm.service` 已在執行，並提供 `/run/php/php8.3-fpm.sock`。
- PHP 已載入 `pdo_sqlite` 與 `sqlite3` 模組。
- `tainanwei.service` 為 `inactive`，8787 沒有 listener。
- 正式站目前指向 `/var/www/real-estate-calculator/releases/65e517d7816c`。

## 2. 目標

1. 統計三個公開頁面的網站「瀏覽人次」，同一瀏覽器在整個 `calc.tainanwei.com` 網域的滾動 6 小時內最多計算一次。
2. 統計「完成試算次數」，每次使用者真正進入結果頁就增加一次。
3. 完成事件必須記錄是哪一種試算器：`tax`、`buyer`、`loan` 或 `young`。
4. 在私人後台提供今天、最近 7 天、最近 30 天與全部期間的分析。
5. 提供每日趨勢、四種試算器使用量、手機／桌機、來源網站與熱門時段。
6. 不收集試算輸入值、試算結果或可識別個人的資料。
7. 分析功能故障時，原有試算功能仍須正常運作。
8. 沿用 VPS、Nginx、PHP-FPM 與 SQLite，不重新啟用 Node 服務。

## 3. 不在本次範圍

- 前台公開瀏覽人次或完成試算次數。
- 三個公開頁面各自的瀏覽量排行；第一版只提供全站 6 小時去重瀏覽人次。
- 使用者帳號、個人試算歷史或跨裝置辨識。
- 儲存房價、收入、自備款、貸款條件、稅額或任何試算結果。
- 第三方分析平台、外部 CDN、外部資料庫或外部圖表套件。
- 廣告活動歸因、UTM 報表或個別使用者行為回放。
- 宣稱統計數字完全無法被公共網路上的惡意請求影響；本設計以來源檢查、格式驗證與速率限制降低灌量風險。

## 4. 方案比較與決定

### 方案 A：PHP-FPM + SQLite（採用）

利用 VPS 已在執行的 PHP-FPM 接收事件並查詢 SQLite。Nginx 僅把明確列出的分析 API 交給 PHP，不開放任意 PHP 檔案。

優點：

- 不需要 Node 或新的常駐服務與連接埠。
- 使用現有 VPS 元件，資源消耗與維護成本最低。
- SQLite 可直接備份，資料可放在版本目錄之外。

### 方案 B：Nginx access log 分析（不採用）

瀏覽量可由 access log 推算，但「同瀏覽器 6 小時去重」不準確，完成試算仍需額外事件 API，也較容易混入機器人流量。

### 方案 C：Python + SQLite 常駐 API（不採用）

功能彈性足夠，但需要新增 systemd 服務與本機 listener，增加維運項目，沒有必要取代 VPS 已在使用的 PHP-FPM。

## 5. 整體架構

### 5.1 路由

- `/` 與既有公開頁面：維持 Nginx 靜態服務。
- `POST /api/analytics/event`：公開的匿名事件寫入端點，只接受固定事件，不回傳統計資料。
- `GET /api/analytics/summary?range=...`：私人統計查詢端點，必須通過 Nginx Basic Auth。
- `/analytics/`：私人分析頁面，必須通過同一組 Nginx Basic Auth。

Nginx 只對上述兩個 API 使用明確的 `location =` 規則及固定 `SCRIPT_FILENAME`。其他 `.php` URL 一律拒絕，避免把 PHP-FPM 變成一般公開執行入口。

### 5.2 檔案與持久資料

- 分析程式與後台前端跟隨 Git release 發布。
- SQLite：`/var/lib/real-estate-calculator/analytics.sqlite`
- 分析密鑰：`/etc/real-estate-calculator/analytics.env`
- Basic Auth 密碼檔：`/etc/nginx/.htpasswd-calculator-analytics`
- 分析備份：`/var/backups/real-estate-calculator/analytics/`

資料庫、密鑰、密碼檔與備份都在 Nginx 網站 root 之外，不會被靜態下載，也不會因切換 `current` release 而消失。

## 6. 事件定義與前端行為

### 6.1 瀏覽事件 `visit`

1. `index.html`、`land-increment-total.html` 與 `tainan-land-value-helper.html` 三個公開頁面都送出網站瀏覽事件。
2. 瀏覽器第一次需要送出事件時，用 Web Crypto 產生隨機匿名 ID，存於同網域 localStorage 的專用 key；三個頁面共用同一個 ID。
3. 頁面完成載入且 `document.visibilityState === "visible"` 後才送出一次 `visit`；若頁面一開始在背景，等第一次變成可見時才送出。
4. PHP 使用伺服器端密鑰對匿名 ID 做 HMAC-SHA-256，資料庫不保存原始匿名 ID。
5. 伺服器查看該雜湊識別碼最近一次被計數的時間：
   - 未滿 6 小時：接受請求但不增加瀏覽人次。
   - 已滿 6 小時或沒有紀錄：增加一次，並更新最近計數時間。
6. 去重資料只為 6 小時判斷而存在；超過 48 小時未更新的雜湊識別碼可清除。
7. 若 localStorage 或 Web Crypto 無法使用，不送出 `visit`，避免每次載入都被誤算成新瀏覽器。完成試算事件仍可送出。

這是同一瀏覽器的匿名去重，不等於真實自然人去重。清除瀏覽器資料、使用另一個瀏覽器或另一台裝置會被視為新的瀏覽器。

### 6.2 完成事件 `completion`

- 只在試算流程由非結果步驟切換進結果頁時送出。
- 每次重新離開結果頁，再次走到結果頁，都算新的完成試算。
- 在結果頁修改輸入、移動滑桿、重算卡片內容或重繪畫面，不得再次送出。
- 事件必須附帶 `calculator`：
  - 房地合一稅：`tax`
  - 買方費用：`buyer`
  - 房貸月付：`loan`
  - 新青安：`young`

### 6.3 事件內容

公開事件端點只接受 JSON：

- `type`：`visit` 或 `completion`
- `calculator`：完成事件必填；瀏覽事件不得填入
- `visitorId`：瀏覽事件必填的隨機匿名 ID；完成事件不需要
- `deviceType`：`mobile` 或 `desktop`
- `referrerDomain`：外部來源網域、`direct` 或 `internal`

裝置分類以送出事件當下的 viewport 為準，寬度不大於 768 px 歸為 `mobile`，其餘歸為 `desktop`。來源只保留經正規化及長度限制的網域，不保存完整 URL、路徑、查詢參數或 hash。

事件優先使用 `navigator.sendBeacon()`；不支援時使用具短逾時與 `keepalive` 的 `fetch()`。傳送失敗時靜默結束，不顯示錯誤、不重試，也不阻擋使用者操作。

## 7. 資料模型

### 7.1 `metric_buckets`

長期保存彙總數字，不保存個別事件：

- `local_date`：台灣日期 `YYYY-MM-DD`
- `local_hour`：台灣時間 0～23
- `event_type`：`visit` 或 `completion`
- `calculator`：`NOT NULL`；完成事件為四種代碼，瀏覽事件固定使用空字串 `''`
- `device_type`：`mobile` 或 `desktop`
- `referrer_domain`：正規化來源網域或固定分類
- `count`：該組合累計次數

上述維度組成唯一鍵。每次有效事件以單一交易執行 `INSERT ... ON CONFLICT DO UPDATE`，只增加對應 bucket 的 `count`。

### 7.2 `visit_dedupe`

- `visitor_hash`：匿名 ID 的 HMAC-SHA-256
- `last_counted_at`：上一次增加瀏覽人次的 Unix timestamp
- `updated_at`：最後檢查時間

`visitor_hash` 為唯一鍵。PHP 定期在事件寫入時機會式刪除超過 48 小時未更新的紀錄，無須新增常駐清理服務。

### 7.3 SQLite 設定

- 啟用 foreign keys。
- 使用 WAL journal mode。
- 設定合理 busy timeout。
- 所有 schema migration 必須可重複執行，且在修改前先做 SQLite 線上備份。
- PHP-FPM 的 `www-data` 只能讀寫資料庫與其專用目錄，不能讀取 Basic Auth 明文密碼；密碼檔保存的是雜湊。

## 8. 私人分析頁

### 8.1 存取

- 網址：`https://calc.tainanwei.com/analytics/`
- Nginx Basic Auth 同時保護 HTML、靜態資產與 summary API。
- 回應加入 `X-Robots-Tag: noindex, noarchive`。
- 使用者名稱與密碼不寫入 Git；部署前另外建立密碼檔。

### 8.2 期間

後台提供四個固定期間：

- 今天：台灣時間當日 00:00 到目前
- 最近 7 天：含今天的 7 個台灣日曆日
- 最近 30 天：含今天的 30 個台灣日曆日
- 全部期間：資料庫內所有彙總資料

PHP 與資料庫 bucket 一律使用 `Asia/Taipei` 產生日期與小時，避免伺服器或瀏覽器時區造成期間錯位。

### 8.3 顯示順序

1. 期間切換：今天、7 天、30 天、全部。
2. 瀏覽人次，明確標示「同一瀏覽器 6 小時內只計一次」。
3. 完成試算次數。
4. 每 100 次瀏覽所產生的完成試算次數。
5. 四種試算器的完成次數與比例。
6. 每日瀏覽與完成趨勢。
7. 手機／桌機比例。
8. 來源網站排行。
9. 0～23 時的熱門使用時段。

不使用「使用者完成率」名稱，因同一瀏覽人次可以完成多個試算，完成次數除以瀏覽人次可能超過 100%。後台改用「每 100 次瀏覽所產生的完成試算次數」，避免誤讀。

### 8.4 介面

- 使用現有品牌配色，但以易讀的數字卡、長條圖與簡單趨勢線為主。
- 不載入外部圖表函式庫；以原生 HTML、CSS、SVG 或 Canvas 完成。
- 桌機與手機都可閱讀，不要求複雜互動或個別事件明細。
- summary API 只回傳後台需要的彙總 JSON，不回傳去重資料或密鑰資訊。

## 9. 隱私與安全

### 9.1 資料最小化

- 不收集姓名、電話、電子郵件、帳號或地理位置。
- 不收集任何試算輸入與結果。
- 分析資料庫不保存原始 IP、完整 User-Agent、完整 referrer URL 或原始匿名 ID。
- User-Agent 只在請求當下用來排除常見機器人，判斷後不保存。
- 長期資料只有彙總 bucket；短期 visitor hash 只用於 6 小時去重。

### 9.2 公開端點防護

- 只允許 `POST`、`application/json` 與小型固定 schema；其他方法或格式拒絕。
- 檢查 `Origin`、`Referer` 與 `Sec-Fetch-Site` 等同源訊號；缺少或不符時拒絕瀏覽器型請求。
- PHP 嚴格允許清單驗證事件種類、計算器、裝置與來源網域。
- Nginx 對事件端點套用以來源 IP 為基礎的記憶體速率限制；IP 只用於 Nginx 即時限流，不寫入分析資料庫。
- 排除常見機器人與自動掃描 User-Agent。
- 公開端點成功時只回傳空的 `204 No Content`，不洩漏目前計數。

公共事件端點無法做到密碼學上的完全防偽；伺服器端來源檢查、驗證、6 小時去重與速率限制是本次合理的防濫用邊界。

### 9.3 後台防護

- `/analytics/` 和 summary API 共用 Nginx Basic Auth。
- 密碼用 `htpasswd` 的強雜湊格式建立，不在 Git、HTML、JavaScript、部署紀錄或對話文件中保存明文。
- 後台頁面只執行唯讀 summary 查詢，不提供刪除、修改或重設統計的控制項。

## 10. 錯誤處理

- 前端事件傳送是非關鍵路徑；任何網路、PHP 或 SQLite 錯誤都不能中斷試算。
- 前端不顯示分析錯誤，也不自動重試，避免重複計數。
- PHP 對無效請求回傳 4xx，速率限制回傳 429，內部錯誤回傳 500；回應不得包含路徑、SQL 或密鑰。
- 寫入 SQLite 使用單一交易；失敗時整筆回滾，不留下半套去重與計數狀態。
- summary API 查詢失敗時，後台顯示簡短的「資料暫時無法載入」與重新整理按鈕；公開試算頁不受影響。

## 11. 備份與保存

- 每次 schema migration 與正式發布前，使用 SQLite `.backup` 建立一致性備份，不直接複製正在寫入的 WAL 資料庫。
- VPS 每日建立一次 SQLite 線上備份，放入 `/var/backups/real-estate-calculator/analytics/`，保留最近 30 份。
- 備份目錄不可由 Nginx 存取。
- 發布回復只切換程式 release 與 Nginx 設定，不刪除正式資料庫；若 migration 不相容，依部署前備份回復資料庫。

## 12. 測試策略

### 12.1 後端自動測試

使用暫存 SQLite 資料庫驗證：

- 第一個 visit 會增加一次。
- 同一 visitor 未滿 6 小時不增加。
- 剛好滿 6 小時可再增加。
- 不同 visitor 各自增加。
- 過期 dedupe 紀錄會清除。
- 四種 calculator 的 completion 分別累加。
- malformed JSON、未知事件、缺少欄位、超長 referrer 與未知 calculator 被拒絕且不改變資料庫。
- 今天、7 天、30 天與全部期間在 `Asia/Taipei` 邊界正確。
- summary 聚合的趨勢、裝置、來源、時段與計算器數字正確。

### 12.2 前端與回歸測試

- 三個公開頁面第一次可見時各自最多送一個 visit 請求，伺服器在全站共用 6 小時去重。
- 由非結果步驟進入結果頁時送出一次 completion。
- 結果頁內重新計算或重繪不重送。
- 離開結果頁後再次進入會再送一次。
- API 不可用或逾時時，四種試算仍可完成。
- 保留並執行現有完整測試套件。
- `git diff --check` 無錯誤。

### 12.3 瀏覽器與正式站驗證

- 本機桌機與 375 px 手機版確認四種試算器、後台版面及 console。
- 未驗證 `/analytics/` 必須回 401；正確帳密才可取得 HTML 與 summary JSON。
- 正式站用不同匿名 ID 驗證 visit，並以測試資料或可還原方式確認 6 小時去重，不污染無法辨識的正式統計。
- 四種試算器各完成一次，確認完成事件與後台分類一致。
- 確認分析 API 失敗時正式試算仍可使用。

## 13. 發布與回復

### 13.1 發布前

1. 記錄目前 `current` release、Nginx 設定與正式資料庫狀態。
2. 備份 Nginx site config 與 SQLite。
3. 確認 `tainanwei.service` 為 `inactive`、8787 未監聽。
4. 建立 Basic Auth 密碼檔與分析 HMAC 密鑰，兩者均不進 Git。
5. 建立資料目錄、備份目錄與最小權限。

### 13.2 發布

1. 以 Git commit 前 12 碼建立新的不可變 release。
2. 執行 schema migration 與暫存資料庫驗證。
3. 安裝精確的 Nginx event、summary 與 `/analytics/` location。
4. `nginx -t` 通過後才 reload。
5. 原子切換 `current` symlink。
6. 驗證 release header、三個公開頁面、兩個 API 與後台登入。
7. 再次確認 `tainanwei.service` 未啟用、8787 未監聽。

不新增 Node、Python 或其他常駐 API 服務；沿用已在執行的 `php8.3-fpm.service` 與既有 Unix socket。

### 13.3 回復

- 程式問題：把 `current` 切回上一個已驗證 release，還原 Nginx site config，`nginx -t` 後 reload。
- schema 問題：先停止分析 API 寫入，再用發布前 SQLite backup 回復；公開試算頁仍保持可用。
- 回復不得啟動 `tainanwei.service`，也不得把分析服務改到 8787。

## 14. 驗收條件

1. 公開網站沒有顯示任何瀏覽或完成統計。
2. 同一瀏覽器在三個公開頁面之間移動時，visit 在全站滾動 6 小時內最多計算一次。
3. 四種試算器每次真正進入結果頁都分別增加 completion。
4. 結果頁內重繪不會重複計數。
5. `/analytics/` 與 summary API 未登入皆為 401。
6. 後台可正確切換今天、7 天、30 天與全部期間。
7. 後台可查看瀏覽、完成、四種試算器、每日趨勢、裝置、來源與時段。
8. 分析資料庫不包含試算內容、原始 IP、完整 User-Agent、完整 referrer URL 或原始匿名 ID。
9. 分析 API 故障不影響任何試算功能。
10. 現有測試、後端測試、手機／桌機瀏覽器驗證與正式站驗證全部通過。
11. Node 舊服務保持停用，8787 保持未監聽。

## 15. 待實作前決定

設計本身不保存登入憑證。實作與部署前需要站主指定後台登入使用者名稱；密碼應在部署時另外建立，不寫入規格、Git 或前端檔案。
