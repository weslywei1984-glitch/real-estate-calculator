# Private Calculator Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 在 calc.tainanwei.com 新增不公開數字的匿名使用分析，透過 PHP-FPM 與 SQLite 計算全站 6 小時去重瀏覽人次、四種試算完成次數，並提供密碼保護的私人分析後台。

**Architecture:** 三個公開 HTML 頁面以同一段內嵌 JavaScript 傳送匿名事件到明確列出的 PHP 端點；PHP 將事件以 Asia/Taipei 日期、小時及匿名維度累加到網站目錄外的 SQLite。Nginx 只公開 event API，使用 Basic Auth 保護 summary API 與 /analytics/，並維持原有靜態網站、停用 Node 舊服務與不監聽 8787 的部署邊界。

**Tech Stack:** 原生 HTML/CSS/JavaScript、PHP 8.3、PDO SQLite、Nginx、SQLite 3、Node.js 20 node:test、PowerShell、Bash。

## Global Constraints

- 正式站固定使用 https://calc.tainanwei.com/，所有正式資料與服務都在既有 VPS 187.127.208.190。
- index.html、land-increment-total.html、tainan-land-value-helper.html 不載入外部分析服務、CDN、框架、LINE LIFF SDK 或 assets/liff-gate.js。
- 三個公開頁面不得顯示瀏覽人次、完成試算次數或分析錯誤。
- 同一瀏覽器在整個 calc.tainanwei.com 網域的滾動 6 小時內最多增加一次 visit。
- completion 只在 index.html 的 tax、buyer、loan、young 由非結果步驟真正進入結果頁時增加；結果頁重繪不得增加。
- 分析資料不得保存試算輸入、試算結果、原始 IP、完整 User-Agent、完整 referrer URL 或原始匿名 ID。
- 所有日期、日曆日與小時 bucket 使用 Asia/Taipei。
- PHP-FPM 使用既有 /run/php/php8.3-fpm.sock；不得新增 Node、Python 或其他常駐 API 服務。
- tainanwei.service 必須保持 inactive，8787 必須保持未監聽。
- SQLite 固定放在 /var/lib/real-estate-calculator/analytics.sqlite；密鑰放在 /etc/real-estate-calculator/analytics.env；備份放在 /var/backups/real-estate-calculator/analytics/。
- /analytics/ 與 summary API 使用 Nginx Basic Auth，使用者名稱固定 xiaowei；隨機密碼只在部署時顯示一次，且不進 Git、規格、前端或部署紀錄。
- index.html 延續專案單檔慣例；匿名分析 client 必須內嵌於三個公開 HTML，不新增公共 JavaScript bundle。
- 保留現有計算政策、免責聲明、localStorage realEstateCalcInputs.v1 與四個 hash 分頁行為。
- 每個實作 Task 都先寫失敗測試、確認失敗原因、做最小實作、重新測試並獨立 commit。

---

## File Map

### New production files

- analytics-api/schema.sql：SQLite schema，定義 metric_buckets、visit_dedupe 與必要索引。
- analytics-api/lib/Config.php：載入正式或測試指定的設定檔。
- analytics-api/lib/Database.php：建立 PDO 連線、套用 SQLite pragma 與執行 migration。
- analytics-api/lib/AnalyticsStore.php：6 小時 visit 去重、completion 累加與 summary 聚合。
- analytics-api/lib/Http.php：HTTP method、大小、JSON、同源、bot、欄位與 range 驗證。
- analytics-api/event.php：公開 POST event entrypoint，只回傳空的狀態回應。
- analytics-api/summary.php：Basic Auth 後的唯讀 GET summary entrypoint。
- analytics-api/migrate.php：CLI-only migration entrypoint。
- analytics/index.html：內嵌 CSS/JS 的私人分析儀表板。
- ops/nginx/calculator-analytics-http.conf：Nginx http context 的 rate-limit zone。
- ops/nginx/calculator-analytics-locations.conf：event、summary、analytics 與私有路徑封鎖規則。
- ops/analytics-backup.sh：SQLite 線上備份與保留最近 30 份。
- ops/analytics-backup.cron：Asia/Taipei 每日備份排程。

### New test files

- tests/php/analytics_test.php：無外部套件的 PHP 測試執行器與後端測試。
- tests/php/router.php：本機 PHP built-in server 路由。
- tests/run-php-analytics-tests.cjs：Windows 無 php.ini 時載入 pdo_sqlite/sqlite3 後執行 PHP tests。
- tests/private-analytics-client.test.cjs：三個公開頁面的 visit 與四種 completion contract。
- tests/private-analytics-dashboard.test.cjs：私人後台 DOM、API 與無外部依賴 contract。
- tests/private-analytics-ops.test.cjs：Nginx、備份、Cron 與部署文件 contract。

### Modified files

- package.json：把 PHP analytics tests 納入 npm test，保留 Node 僅供本機預覽。
- .gitignore：忽略 .superpowers/ 視覺設計暫存目錄。
- index.html：內嵌匿名 visit client，並在四種精靈真正進入結果頁時送 completion。
- land-increment-total.html：內嵌相同匿名 visit client。
- tainan-land-value-helper.html：內嵌相同匿名 visit client。
- DEPLOY.md：文件化 PHP-FPM、SQLite、Basic Auth、備份、發布與回復。
- README.md：說明正式站仍以 Nginx 靜態頁面為主，僅分析 API 使用 PHP-FPM。
- AGENTS.md：更新正式架構邊界、持久資料位置與驗證要求。

---

### Task 1: PHP test runner, configuration, and SQLite schema

**Files:**
- Create: analytics-api/schema.sql
- Create: analytics-api/lib/Config.php
- Create: analytics-api/lib/Database.php
- Create: analytics-api/migrate.php
- Create: tests/php/analytics_test.php
- Create: tests/run-php-analytics-tests.cjs
- Modify: package.json
- Modify: .gitignore

**Interfaces:**
- Produces: AnalyticsConfig::load(?string $path = null): array with databasePath, hmacKey, allowedOrigin, timezone.
- Produces: AnalyticsDatabase::connect(array $config): PDO.
- Produces: AnalyticsDatabase::migrate(PDO $pdo, string $schemaPath): void.
- Produces: command node tests/run-php-analytics-tests.cjs.
- Consumes: PHP 8.3 with PDO; the Node runner enables pdo_sqlite and sqlite3 on Windows when php -m reports them missing.

- [ ] **Step 1: Write the failing configuration and schema tests**

Create tests/php/analytics_test.php with a deterministic runner and these first cases:

~~~php
<?php
declare(strict_types=1);

require_once __DIR__ . '/../../analytics-api/lib/Config.php';
require_once __DIR__ . '/../../analytics-api/lib/Database.php';

$tests = [];
$tests['config loads explicit values and Taipei timezone'] = function (): void {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'calc-analytics-' . bin2hex(random_bytes(6));
    mkdir($dir, 0700, true);
    $configPath = $dir . DIRECTORY_SEPARATOR . 'analytics.env';
    file_put_contents($configPath, implode(PHP_EOL, [
        'database_path = "' . $dir . DIRECTORY_SEPARATOR . 'analytics.sqlite"',
        'hmac_key = "' . str_repeat('a', 64) . '"',
        'allowed_origin = "https://calc.tainanwei.com"',
    ]));
    $config = AnalyticsConfig::load($configPath);
    assertSame($dir . DIRECTORY_SEPARATOR . 'analytics.sqlite', $config['databasePath']);
    assertSame('https://calc.tainanwei.com', $config['allowedOrigin']);
    assertSame('Asia/Taipei', $config['timezone']->getName());
};

$tests['migration creates both tables with WAL and foreign keys'] = function (): void {
    [$pdo, $dir] = newTemporaryDatabase();
    $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        ->fetchAll(PDO::FETCH_COLUMN);
    assertTrue(in_array('metric_buckets', $tables, true));
    assertTrue(in_array('visit_dedupe', $tables, true));
    assertSame('wal', strtolower((string) $pdo->query('PRAGMA journal_mode')->fetchColumn()));
    assertSame('1', (string) $pdo->query('PRAGMA foreign_keys')->fetchColumn());
};
~~~

Define assertSame(), assertTrue(), newTemporaryDatabase(), cleanupDirectory(), pass/fail output, and process exit code in the same file. newTemporaryDatabase() must call AnalyticsDatabase::connect() and AnalyticsDatabase::migrate() with analytics-api/schema.sql.

- [ ] **Step 2: Add the cross-platform PHP runner and verify the test fails**

Create tests/run-php-analytics-tests.cjs:

~~~javascript
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const php = process.env.CALC_PHP_BINARY || "php";
const modules = spawnSync(php, ["-m"], { encoding: "utf8" });
if (modules.status !== 0) process.exit(modules.status || 1);

const args = [];
if (!/pdo_sqlite/i.test(modules.stdout)) {
  if (process.platform !== "win32") {
    throw new Error("pdo_sqlite is required");
  }
  const located = spawnSync("where.exe", ["php"], { encoding: "utf8" });
  const phpPath = located.stdout.split(/\r?\n/).find(Boolean);
  const extensionDir = path.join(path.dirname(phpPath), "ext");
  args.push(
    "-d", "extension_dir=" + extensionDir,
    "-d", "extension=pdo_sqlite",
    "-d", "extension=sqlite3"
  );
}
args.push(path.join(__dirname, "php", "analytics_test.php"));
const result = spawnSync(php, args, { stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
~~~

Run: node tests/run-php-analytics-tests.cjs

Expected: FAIL because Config.php and Database.php do not exist.

- [ ] **Step 3: Implement the exact SQLite schema**

Create analytics-api/schema.sql:

~~~sql
CREATE TABLE IF NOT EXISTS metric_buckets (
    local_date TEXT NOT NULL,
    local_hour INTEGER NOT NULL CHECK (local_hour BETWEEN 0 AND 23),
    event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'completion')),
    calculator TEXT NOT NULL DEFAULT '' CHECK (
        calculator = '' OR calculator IN ('tax', 'buyer', 'loan', 'young')
    ),
    device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
    referrer_domain TEXT NOT NULL CHECK (length(referrer_domain) BETWEEN 1 AND 120),
    count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
    PRIMARY KEY (
        local_date, local_hour, event_type, calculator,
        device_type, referrer_domain
    )
);

CREATE TABLE IF NOT EXISTS visit_dedupe (
    visitor_hash TEXT PRIMARY KEY CHECK (length(visitor_hash) = 64),
    last_counted_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metric_buckets_date
ON metric_buckets (local_date, event_type);

CREATE INDEX IF NOT EXISTS idx_visit_dedupe_updated
ON visit_dedupe (updated_at);
~~~

The visit calculator value is the non-null empty string. This avoids SQLite unique-key behavior where multiple NULL values would create duplicate visit buckets.

- [ ] **Step 4: Implement Config.php and Database.php**

Config.php parses an INI file, requires a 64-character hexadecimal HMAC key, and returns DateTimeZone('Asia/Taipei'). allowed_origin must use HTTPS in production; only http://127.0.0.1 with an explicit port or http://localhost with an explicit port is accepted for local tests. The default path is /etc/real-estate-calculator/analytics.env; CALC_ANALYTICS_CONFIG may override it only for local tests.

Database.php uses:

~~~php
$pdo = new PDO('sqlite:' . $config['databasePath'], null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$pdo->exec('PRAGMA foreign_keys = ON');
$pdo->exec('PRAGMA journal_mode = WAL');
$pdo->exec('PRAGMA busy_timeout = 5000');
~~~

AnalyticsDatabase::migrate() reads schema.sql and executes it inside a transaction. migrate.php rejects non-CLI execution, loads the config, connects, migrates, prints one success line, and exits 0.

- [ ] **Step 5: Add PHP analytics tests to npm test and ignore visual scratch files**

Change package.json scripts to:

~~~json
{
  "test": "node --test tests/*.test.cjs && node tests/run-php-analytics-tests.cjs",
  "test:js": "node --test tests/*.test.cjs",
  "test:php": "node tests/run-php-analytics-tests.cjs"
}
~~~

Keep start and dev unchanged. Change the package description so it no longer says production is served by Node.js. Add .superpowers/ to .gitignore without deleting the existing directory.

- [ ] **Step 6: Run the foundation tests**

Run: npm.cmd run test:php

Expected: both initial PHP tests PASS and the process exits 0.

Run: npm.cmd run test:js

Expected: all pre-existing JavaScript tests PASS.

- [ ] **Step 7: Commit the foundation**

~~~powershell
git add .gitignore package.json analytics-api/schema.sql analytics-api/lib/Config.php analytics-api/lib/Database.php analytics-api/migrate.php tests/php/analytics_test.php tests/run-php-analytics-tests.cjs
git diff --cached --check
git commit -m "feat: add analytics database foundation"
~~~

---

### Task 2: Anonymous event validation and recording

**Files:**
- Create: analytics-api/lib/AnalyticsStore.php
- Create: analytics-api/lib/Http.php
- Create: analytics-api/event.php
- Modify: tests/php/analytics_test.php

**Interfaces:**
- Consumes: AnalyticsDatabase::connect(), AnalyticsConfig::load(), schema tables from Task 1.
- Produces: AnalyticsStore::__construct(PDO $pdo, string $hmacKey, DateTimeZone $timezone).
- Produces: AnalyticsStore::record(array $event, DateTimeImmutable $now): bool; return true only when a visit or completion increments a bucket.
- Produces: AnalyticsHttp::parseEvent(array $server, string $rawBody, string $allowedOrigin): array with type, calculator, visitorId, deviceType, referrerDomain, skipBot.
- Produces: AnalyticsHttpException with status(): int.
- Produces: POST /api/analytics/event returning 204 for counted, deduped, or known-bot requests without exposing totals.

- [ ] **Step 1: Add failing visit, completion, validation, and transaction tests**

Append named cases to tests/php/analytics_test.php:

~~~php
$tests['visit counts once inside rolling six hours and again at six hours'] = function (): void {
    [$store, $pdo] = newTemporaryStore();
    $event = visitEvent('11111111-1111-4111-8111-111111111111');
    $start = new DateTimeImmutable('2026-08-07T00:30:00+08:00');
    assertTrue($store->record($event, $start));
    assertFalse($store->record($event, $start->modify('+5 hours 59 minutes 59 seconds')));
    assertTrue($store->record($event, $start->modify('+6 hours')));
    assertSame(2, metricCount($pdo, 'visit', ''));
};

$tests['completion increments every valid result transition event'] = function (): void {
    [$store, $pdo] = newTemporaryStore();
    $now = new DateTimeImmutable('2026-08-07T12:00:00+08:00');
    foreach (['tax', 'buyer', 'loan', 'young'] as $calculator) {
        assertTrue($store->record(completionEvent($calculator), $now));
        assertTrue($store->record(completionEvent($calculator), $now));
        assertSame(2, metricCount($pdo, 'completion', $calculator));
    }
};

$tests['invalid event requests never mutate SQLite'] = function (): void {
    [$store, $pdo, $config] = newTemporaryStoreWithConfig();
    $cases = [
        [['REQUEST_METHOD' => 'GET'], '{}', 405],
        [sameOriginServer('text/plain'), '{}', 415],
        [sameOriginServer('application/json'), '{', 400],
        [sameOriginServer('application/json'), '{"type":"completion","calculator":"other","deviceType":"desktop","referrerDomain":"direct"}', 400],
        [crossOriginServer(), '{"type":"visit"}', 403],
    ];
    foreach ($cases as [$server, $body, $status]) {
        assertThrowsStatus(
            $status,
            fn () => AnalyticsHttp::parseEvent($server, $body, $config['allowedOrigin'])
        );
    }
    assertSame(0, allMetricCount($pdo));
};
~~~

Also test:

- Different visitor IDs each count.
- A visitor record with updated_at older than 48 hours is removed.
- local_date and local_hour use Asia/Taipei across a UTC day boundary.
- referrer domains are lowercased, leading www. is removed, and values over 120 characters are rejected.
- unknown JSON keys, raw body over 2048 bytes, missing visitorId on visit, visitorId on completion, unknown deviceType, non-v4 UUID, and mismatched Origin/Referer are rejected.
- common bot User-Agent is classified as a bot and skipped.

- [ ] **Step 2: Run the event tests and confirm the failure**

Run: npm.cmd run test:php

Expected: FAIL with missing AnalyticsStore.php or missing AnalyticsHttp class.

- [ ] **Step 3: Implement AnalyticsStore atomically**

AnalyticsStore::record() must:

1. Convert the injected time to Asia/Taipei and derive local_date plus local_hour.
2. Begin an IMMEDIATE SQLite transaction.
3. Delete visit_dedupe rows where updated_at is older than now minus 172800 seconds.
4. For visit, HMAC the UUID using hash_hmac('sha256', visitorId, hmacKey), read last_counted_at, and only increment when elapsed time is at least 21600 seconds.
5. For a deduped visit, update updated_at but leave last_counted_at and metric_buckets unchanged.
6. For completion, always increment the matching calculator bucket.
7. Commit dedupe and bucket changes together; rollback on Throwable.

Use one bucket statement:

~~~sql
INSERT INTO metric_buckets (
    local_date, local_hour, event_type, calculator,
    device_type, referrer_domain, count
) VALUES (
    :local_date, :local_hour, :event_type, :calculator,
    :device_type, :referrer_domain, 1
)
ON CONFLICT (
    local_date, local_hour, event_type, calculator,
    device_type, referrer_domain
)
DO UPDATE SET count = count + 1
~~~

Do not insert visitor_hash into metric_buckets.

- [ ] **Step 4: Implement strict HTTP parsing**

Http.php must:

- Accept POST only.
- Reject CONTENT_LENGTH over 2048 before decoding.
- Require Content-Type beginning application/json.
- Require an exact same-origin Origin or, when Origin is absent, an exact same-origin Referer origin.
- Reject Sec-Fetch-Site when present and not same-origin.
- Detect common bot tokens bot, crawler, spider, slurp, preview, headless and return skipBot without storing User-Agent.
- Use JSON_THROW_ON_ERROR.
- Reject keys outside the exact per-event allowlist.
- Require UUID v4 for visit.
- Require calculator only for completion.
- Normalize referrerDomain to direct, internal, or a lowercased hostname without leading www.

The normalized event always has the six interface keys. visitorId is an empty string for completion; calculator is an empty string for visit.

- [ ] **Step 5: Implement event.php as a thin non-leaking entrypoint**

event.php loads all library files, reads php://input, parses, skips bots, records the event, and returns 204 with Cache-Control: no-store. AnalyticsHttpException returns its safe 4xx status with an empty body. Any other Throwable is logged with error_log(), returns 500, and never emits SQL, filesystem paths, stack traces, counts, or secrets.

Do not add CORS response headers.

- [ ] **Step 6: Run event tests and the full suite**

Run: npm.cmd run test:php

Expected: all event and foundation tests PASS.

Run: npm.cmd test

Expected: existing JavaScript tests and all PHP analytics tests PASS.

- [ ] **Step 7: Commit event recording**

~~~powershell
git add analytics-api/lib/AnalyticsStore.php analytics-api/lib/Http.php analytics-api/event.php tests/php/analytics_test.php
git diff --cached --check
git commit -m "feat: record anonymous calculator analytics"
~~~

---

### Task 3: Summary aggregation and private API

**Files:**
- Modify: analytics-api/lib/AnalyticsStore.php
- Modify: analytics-api/lib/Http.php
- Create: analytics-api/summary.php
- Modify: tests/php/analytics_test.php

**Interfaces:**
- Consumes: metric_buckets from Tasks 1-2.
- Produces: AnalyticsStore::summary(string $range, DateTimeImmutable $now): array.
- Produces: AnalyticsHttp::parseSummaryRange(array $server, array $query): string.
- Produces: GET /api/analytics/summary?range=today|7d|30d|all with Cache-Control: no-store.

- [ ] **Step 1: Add failing range and summary shape tests**

Append a fixed dataset covering 2026-07-01 through 2026-08-07. Assert this public shape:

~~~php
$summary = $store->summary('7d', new DateTimeImmutable('2026-08-07T15:00:00+08:00'));
assertSame('7d', $summary['range']);
assertSame('2026-08-01', $summary['period']['startDate']);
assertSame('2026-08-07', $summary['period']['endDate']);
assertSame(12, $summary['totals']['visits']);
assertSame(9, $summary['totals']['completions']);
assertSame(75.0, $summary['totals']['completionsPer100Visits']);
assertSame(['tax', 'buyer', 'loan', 'young'], array_column($summary['calculators'], 'key'));
assertSame(7, count($summary['trend']));
assertSame(['mobile', 'desktop'], array_column($summary['devices'], 'key'));
assertSame('direct', $summary['referrers'][0]['domain']);
assertSame(24, count($summary['hours']));
~~~

Also assert:

- today starts at the current Taiwan date.
- 30d includes today plus the previous 29 Taiwan calendar days.
- all has a null startDate and includes all seeded rows.
- trend fills missing dates with zeroes for bounded ranges.
- calculator share uses completion totals.
- devices, referrers, and hours use visit rows only.
- no visits yields null completionsPer100Visits instead of division by zero.
- invalid range and extra query keys return 400.
- POST to summary returns 405.

- [ ] **Step 2: Run the summary tests and verify failure**

Run: npm.cmd run test:php

Expected: FAIL because AnalyticsStore::summary() and AnalyticsHttp::parseSummaryRange() do not exist.

- [ ] **Step 3: Implement range boundaries and SQL aggregation**

summary() maps:

~~~php
$startDate = match ($range) {
    'today' => $localNow->format('Y-m-d'),
    '7d' => $localNow->modify('-6 days')->format('Y-m-d'),
    '30d' => $localNow->modify('-29 days')->format('Y-m-d'),
    'all' => null,
};
~~~

Use parameterized queries for:

- totals grouped by event_type.
- calculators grouped by calculator where event_type = completion.
- trend grouped by local_date and event_type.
- devices grouped by device_type where event_type = visit.
- referrers grouped by referrer_domain where event_type = visit, ordered by count descending then domain ascending, limit 10.
- hours grouped by local_hour where event_type = visit.

Return integer counts, one-decimal percentages, a complete ordered calculator list, a complete mobile/desktop list, and all 24 hour entries. For all, trend starts from the earliest local_date in metric_buckets and returns an empty array when no rows exist.

- [ ] **Step 4: Implement summary request validation and entrypoint**

AnalyticsHttp::parseSummaryRange() accepts GET and exactly zero or one range query key. The default is 30d. summary.php returns:

~~~php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
echo json_encode(
    $summary,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
);
~~~

Basic Auth is intentionally not implemented in PHP; Nginx owns the auth boundary. The PHP entrypoint remains read-only and never includes visit_dedupe data.

- [ ] **Step 5: Run summary tests and full backend tests**

Run: npm.cmd run test:php

Expected: all foundation, event, and summary tests PASS.

- [ ] **Step 6: Commit summary API**

~~~powershell
git add analytics-api/lib/AnalyticsStore.php analytics-api/lib/Http.php analytics-api/summary.php tests/php/analytics_test.php
git diff --cached --check
git commit -m "feat: expose private analytics summaries"
~~~

---

### Task 4: Public-page visit client and four completion hooks

**Files:**
- Create: tests/private-analytics-client.test.cjs
- Modify: index.html
- Modify: land-increment-total.html
- Modify: tainan-land-value-helper.html
- Modify: tests/restart-and-wizard-validation.test.cjs

**Interfaces:**
- Consumes: POST /api/analytics/event from Task 2.
- Produces: sendPrivateAnalyticsEvent(type, calculator): void where type is visit or completion.
- Produces: setupPrivateAnalyticsVisit(): void.
- Preserves: setupWizards(), setWizardStep(), runGroup(), hash tab behavior, localStorage realEstateCalcInputs.v1.

- [ ] **Step 1: Write failing public-client contract tests**

Create tests/private-analytics-client.test.cjs. Read all three public HTML files, extract the text between these comments, and assert the block is byte-identical:

~~~javascript
/* Private anonymous analytics client: start */
/* Private anonymous analytics client: end */
~~~

Assert each page:

- Contains no visible analytics counter element or public total fetch.
- Uses localStorage key realEstateAnalyticsVisitor.v1, crypto.randomUUID(), document.visibilityState, visibilitychange, navigator.sendBeacon(), fetch keepalive, and /api/analytics/event.
- Sends only one visit request after the page first becomes visible.
- Classifies viewport width at 768 px.
- Converts empty referrer to direct, same host to internal, and external referrer to a normalized hostname.
- Does not display failures through DOM text, alert, console.error, or retry.

Extract setupWizards() from index.html into a VM fixture. Simulate two rapid next clicks from step 2 and assert:

~~~javascript
assert.deepEqual(sentEvents, [
  { type: "completion", calculator: "loan" }
]);
~~~

Loop the fixture across tax, buyer, loan, young. Assert input/change result recalculation does not call sendPrivateAnalyticsEvent().

- [ ] **Step 2: Run the client tests and confirm failure**

Run: node --test tests/private-analytics-client.test.cjs tests/restart-and-wizard-validation.test.cjs

Expected: FAIL because the analytics client block and completion call do not exist.

- [ ] **Step 3: Add the exact inline client contract to all three pages**

Place the same marked source near the beginning of each page's existing inline script. The block defines:

~~~javascript
const PRIVATE_ANALYTICS_ENDPOINT = "/api/analytics/event";
const PRIVATE_ANALYTICS_VISITOR_KEY = "realEstateAnalyticsVisitor.v1";
let privateAnalyticsVisitSent = false;

function privateAnalyticsDeviceType() {
  return window.innerWidth <= 768 ? "mobile" : "desktop";
}

function privateAnalyticsReferrerDomain() {
  if (!document.referrer) return "direct";
  try {
    const url = new URL(document.referrer);
    if (url.hostname === location.hostname) return "internal";
    return url.hostname.toLowerCase().replace(/^www\./, "").slice(0, 120);
  } catch {
    return "direct";
  }
}
~~~

getPrivateAnalyticsVisitorId() uses crypto.randomUUID(), stores only the anonymous UUID in the dedicated key, and returns an empty string when Web Crypto or localStorage is unavailable.

sendPrivateAnalyticsEvent() builds the exact per-event payload. It tries sendBeacon with an application/json Blob first; when sendBeacon returns false or is unavailable, it uses fetch with method POST, credentials same-origin, Content-Type application/json, keepalive true, and a swallowed catch.

setupPrivateAnalyticsVisit() sends at most once per page lifetime, immediately when visible or once on the first visibilitychange to visible. A missing visitor ID suppresses visit but not completion.

Call setupPrivateAnalyticsVisit() once from each page after the function definitions.

- [ ] **Step 4: Hook completion into the actual result transition**

In index.html setupWizards(), calculate resultIndex once. Keep runGroup() before setWizardStep(). Send completion only inside the existing penultimate-step branch and only after setWizardStep() enters the result:

~~~javascript
const steps = wizardSteps(workspace);
const resultIndex = steps.length - 1;
if (index === resultIndex - 1) {
  runGroup(workspace.dataset.wizard, { loading: true, feedback: "已更新" });
  setWizardStep(workspace, resultIndex, { focus: true });
  sendPrivateAnalyticsEvent("completion", workspace.dataset.wizard);
  return;
}
setWizardStep(workspace, index + 1, { focus: true });
~~~

Do not call completion from runGroup(), form input/change handlers, result sliders, restoreInputs(), resetWizard(), activateTab(), or initial page setup.

- [ ] **Step 5: Run focused client and wizard tests**

Run: node --test tests/private-analytics-client.test.cjs tests/restart-and-wizard-validation.test.cjs

Expected: visit block, client initialization, all four completion transitions, rapid-click protection, restart, recalculation and wizard validation tests PASS.

Run: npm.cmd test

Expected: full JavaScript and PHP suite PASS.

- [ ] **Step 6: Commit public event instrumentation**

~~~powershell
git add index.html land-increment-total.html tainan-land-value-helper.html tests/private-analytics-client.test.cjs tests/restart-and-wizard-validation.test.cjs
git diff --cached --check
git commit -m "feat: track anonymous calculator usage"
~~~

---

### Task 5: Password-protected analytics dashboard

**Files:**
- Create: analytics/index.html
- Create: tests/private-analytics-dashboard.test.cjs
- Create: tests/php/router.php

**Interfaces:**
- Consumes: GET /api/analytics/summary?range=today|7d|30d|all and the Task 3 JSON shape.
- Produces: a single-file responsive /analytics/ UI with no external assets.
- Produces: local router command php -S 127.0.0.1:8796 tests/php/router.php.

- [ ] **Step 1: Write failing dashboard contract tests**

Create tests/private-analytics-dashboard.test.cjs and assert:

- lang is zh-Hant and title identifies the private analysis backend.
- No external script, stylesheet, font, analytics vendor, CDN, iframe, form, password field, public counter, reset, delete, or export control exists.
- Range buttons have data-range values today, 7d, 30d, all.
- Stable IDs exist for totalVisits, totalCompletions, completionsPer100, calculatorBreakdown, trendChart, deviceBreakdown, referrerTable, hourlyChart, analyticsUpdatedAt, analyticsError, analyticsRetry.
- JavaScript requests /api/analytics/summary?range= using credentials same-origin and cache no-store.
- Loading, empty, success and error states are represented.
- CSS has a max-width layout, responsive breakpoint at 700 px or lower, visible focus style, tabular numbers, and reduced-motion handling.
- SVG trend rendering includes title/description text and does not depend on a chart library.

- [ ] **Step 2: Run the dashboard test and verify failure**

Run: node --test tests/private-analytics-dashboard.test.cjs

Expected: FAIL because analytics/index.html does not exist.

- [ ] **Step 3: Build the semantic dashboard shell**

Create one analytics/index.html with inline CSS and JavaScript:

~~~html
<main class="analytics-shell">
  <header class="analytics-header">
    <p class="eyebrow">台南小魏｜私人分析</p>
    <h1>試算工具使用概況</h1>
    <p>資料僅供站主查看，不包含使用者輸入或試算結果。</p>
  </header>
  <nav class="range-tabs" aria-label="統計期間">
    <button type="button" data-range="today">今天</button>
    <button type="button" data-range="7d">最近 7 天</button>
    <button type="button" data-range="30d" aria-pressed="true">最近 30 天</button>
    <button type="button" data-range="all">全部期間</button>
  </nav>
  <section class="metric-grid" aria-label="主要統計"></section>
  <section aria-labelledby="calculatorHeading"></section>
  <section aria-labelledby="trendHeading"></section>
  <section class="detail-grid"></section>
  <p id="analyticsError" role="alert" hidden></p>
  <button id="analyticsRetry" type="button" hidden>重新載入</button>
</main>
~~~

Use the existing cream, navy, terracotta and teal brand colors. Cards use large tabular figures and short labels. The mobile layout is one column and must not horizontally overflow at 375 px.

- [ ] **Step 4: Implement deterministic rendering**

Define:

~~~javascript
async function loadAnalytics(range) {
  setLoading(true);
  clearError();
  try {
    const response = await fetch(
      "/api/analytics/summary?range=" + encodeURIComponent(range),
      { credentials: "same-origin", cache: "no-store" }
    );
    if (!response.ok) throw new Error("summary unavailable");
    renderAnalytics(await response.json());
  } catch {
    showError("資料暫時無法載入，請稍後再試。");
  } finally {
    setLoading(false);
  }
}
~~~

renderAnalytics() must:

- Format totals with zh-TW Intl.NumberFormat.
- Show an em dash when completionsPer100Visits is null.
- Render all four calculator labels in fixed order.
- Render a responsive SVG line chart with two series, a readable legend, title and desc; show a friendly empty state when trend is empty.
- Render mobile/desktop proportions as accessible bars.
- Render the top 10 referrers as a table, mapping direct to「直接開啟」and internal to「站內移動」。
- Render all 24 hourly bars and emphasize the maximum hour.
- Show the API generatedAt value in Taiwan-readable format.
- Keep the selected range in aria-pressed state without changing the public site hash.

- [ ] **Step 5: Add the local PHP router**

tests/php/router.php maps:

~~~php
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($path === '/api/analytics/event') {
    require __DIR__ . '/../../analytics-api/event.php';
    return true;
}
if ($path === '/api/analytics/summary') {
    require __DIR__ . '/../../analytics-api/summary.php';
    return true;
}
if ($path === '/analytics/' || $path === '/analytics') {
    readfile(__DIR__ . '/../../analytics/index.html');
    return true;
}
return false;
~~~

The router is for local verification only and must never be copied into the production Nginx configuration.

- [ ] **Step 6: Run dashboard and full tests**

Run: node --test tests/private-analytics-dashboard.test.cjs

Expected: all dashboard contract tests PASS.

Run: npm.cmd test

Expected: all JavaScript and PHP tests PASS.

- [ ] **Step 7: Commit the dashboard**

~~~powershell
git add analytics/index.html tests/private-analytics-dashboard.test.cjs tests/php/router.php
git diff --cached --check
git commit -m "feat: add private analytics dashboard"
~~~

---

### Task 6: Nginx protection, backups, and deployment documentation

**Files:**
- Create: ops/nginx/calculator-analytics-http.conf
- Create: ops/nginx/calculator-analytics-locations.conf
- Create: ops/analytics-backup.sh
- Create: ops/analytics-backup.cron
- Create: tests/private-analytics-ops.test.cjs
- Modify: DEPLOY.md
- Modify: README.md
- Modify: AGENTS.md

**Interfaces:**
- Consumes: production files from Tasks 1-5.
- Produces: Nginx zone calculator_analytics_event and exact PHP-FPM routes.
- Produces: /usr/local/sbin/calc-analytics-backup contract and /etc/cron.d/calc-analytics-backup schedule.
- Preserves: current static root, X-Calculator-Release, TLS settings, tainanwei.service inactive, port 8787 closed.

- [ ] **Step 1: Write failing operations contract tests**

Create tests/private-analytics-ops.test.cjs. Assert:

- http config defines limit_req_zone using binary_remote_addr, 10m zone, and 30 requests per minute.
- location config has exact /api/analytics/event and exact /api/analytics/summary locations.
- event uses limit_req with burst 10 nodelay, only POST, access_log off, and php8.3-fpm.sock.
- summary and ^~ /analytics/ both use auth_basic and /etc/nginx/.htpasswd-calculator-analytics.
- /analytics redirects to /analytics/.
- /analytics-api/, /ops/, arbitrary /api/analytics/ paths, and direct .php URLs return 404.
- X-Robots-Tag noindex, noarchive and Cache-Control no-store protect analytics pages.
- backup script uses sqlite3 .backup, umask 077, exact database/backup paths, retains 30 files, and contains no recursive deletion.
- cron sets CRON_TZ=Asia/Taipei and runs once daily.
- DEPLOY.md, README.md, and AGENTS.md describe PHP-FPM analytics while still requiring tainanwei.service inactive and 8787 unlistened.
- No documentation says production needs npm start or a Node listener.

- [ ] **Step 2: Run the operations test and confirm failure**

Run: node --test tests/private-analytics-ops.test.cjs

Expected: FAIL because ops files and updated documentation do not exist.

- [ ] **Step 3: Add the Nginx http configuration**

ops/nginx/calculator-analytics-http.conf:

~~~nginx
limit_req_zone $binary_remote_addr
    zone=calculator_analytics_event:10m
    rate=30r/m;
~~~

Install this file in /etc/nginx/conf.d/ so it remains in the http context.

- [ ] **Step 4: Add exact protected locations**

ops/nginx/calculator-analytics-locations.conf:

~~~nginx
location = /analytics {
    return 301 /analytics/;
}

location ^~ /analytics/ {
    auth_basic "Private calculator analytics";
    auth_basic_user_file /etc/nginx/.htpasswd-calculator-analytics;
    add_header X-Robots-Tag "noindex, noarchive" always;
    add_header Cache-Control "no-store" always;
    try_files $uri $uri/ =404;
}

location = /api/analytics/event {
    if ($request_method != POST) { return 405; }
    limit_req zone=calculator_analytics_event burst=10 nodelay;
    client_max_body_size 2k;
    access_log off;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/analytics-api/event.php;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
}

location = /api/analytics/summary {
    if ($request_method != GET) { return 405; }
    auth_basic "Private calculator analytics";
    auth_basic_user_file /etc/nginx/.htpasswd-calculator-analytics;
    add_header Cache-Control "no-store" always;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root/analytics-api/summary.php;
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
}

location ^~ /analytics-api/ { return 404; }
location ^~ /ops/ { return 404; }
location ^~ /api/analytics/ { return 404; }
location ~ \.php(?:/|$) { return 404; }
~~~

Use one-line if-return only; do not use rewrite, proxy_pass, Node ports, or FastCGI path info.

- [ ] **Step 5: Add safe SQLite backup and cron files**

ops/analytics-backup.sh:

~~~bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

db=/var/lib/real-estate-calculator/analytics.sqlite
backup_dir=/var/backups/real-estate-calculator/analytics
timestamp=$(date +%Y%m%d-%H%M%S)

install -d -m 0700 "$backup_dir"
if [[ ! -f "$db" ]]; then
  exit 0
fi

backup_file="$backup_dir/analytics-$timestamp.sqlite"
sqlite3 "$db" ".backup '$backup_file'"

mapfile -d '' old_backups < <(
  find "$backup_dir" -maxdepth 1 -type f -name 'analytics-*.sqlite' -printf '%T@ %p\0' |
    sort -z -rn |
    tail -z -n +31 |
    cut -z -d ' ' -f 2-
)
for old_backup in "${old_backups[@]}"; do
  case "$old_backup" in
    "$backup_dir"/analytics-*.sqlite) rm -- "$old_backup" ;;
    *) exit 1 ;;
  esac
done
~~~

ops/analytics-backup.cron:

~~~cron
CRON_TZ=Asia/Taipei
17 3 * * * root /usr/local/sbin/calc-analytics-backup
~~~

- [ ] **Step 6: Update deployment and project documentation**

DEPLOY.md must document:

- Existing static release path and PHP-FPM socket.
- Exact persistent data, config, auth and backup paths.
- Username xiaowei and one-time generated password rule.
- Config file keys database_path, hmac_key, allowed_origin.
- Pre-deploy sqlite3 .backup, Nginx config backup, schema migration, nginx -t, reload, auth tests, live event tests, and rollback.
- Node service and port boundaries before and after deployment.

README.md and AGENTS.md must say the public calculators remain static; only the two exact analytics endpoints use PHP-FPM. Add the new test commands and state that API failure cannot block calculators.

- [ ] **Step 7: Run operations and full tests**

Run: node --test tests/private-analytics-ops.test.cjs

Expected: all Nginx, backup, cron and documentation contracts PASS.

Run: npm.cmd test

Expected: full JavaScript and PHP suite PASS.

Run: git diff --check

Expected: no output and exit 0.

- [ ] **Step 8: Commit operations and documentation**

~~~powershell
git add ops tests/private-analytics-ops.test.cjs DEPLOY.md README.md AGENTS.md
git diff --cached --check
git commit -m "docs: define analytics VPS operations"
~~~

---

### Task 7: Local browser verification and VPS release

**Files:**
- Verify: index.html
- Verify: land-increment-total.html
- Verify: tainan-land-value-helper.html
- Verify: analytics/index.html
- Verify: analytics-api/
- Verify: ops/
- Verify: DEPLOY.md
- Deploy: /var/www/real-estate-calculator/releases/$release，$release 由 git rev-parse HEAD 的前 12 字元計算。
- Deploy: /var/lib/real-estate-calculator/analytics.sqlite
- Deploy: /etc/real-estate-calculator/analytics.env
- Deploy: /etc/nginx/.htpasswd-calculator-analytics
- Deploy: /etc/nginx/conf.d/calculator-analytics-http.conf
- Deploy: /etc/nginx/snippets/calculator-analytics-locations.conf
- Deploy: /usr/local/sbin/calc-analytics-backup
- Deploy: /etc/cron.d/calc-analytics-backup

**Interfaces:**
- Consumes: committed Tasks 1-6 and approved design spec.
- Produces: verified production https://calc.tainanwei.com/analytics/ and live anonymous event collection.
- Produces: one-time Basic Auth credential with username xiaowei.
- Preserves: previous immutable releases and a tested rollback target.

- [ ] **Step 1: Run the final local automated checks**

~~~powershell
npm.cmd test
git diff --check
git status --short --branch
git log -7 --oneline
~~~

Expected:

- All JavaScript and PHP tests PASS.
- git diff --check has no output.
- No unrelated unstaged or untracked change is included.
- Tasks 1-6 each have their intended commit.

- [ ] **Step 2: Start a disposable local analytics server**

Use a new temporary directory and test-only config. Do not place secrets or SQLite files in the repository:

~~~powershell
$analyticsTemp = Join-Path ([System.IO.Path]::GetTempPath()) ("calc-analytics-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $analyticsTemp | Out-Null
$env:CALC_ANALYTICS_CONFIG = Join-Path $analyticsTemp "analytics.env"
$analyticsKey = -join ((1..64) | ForEach-Object { "0123456789abcdef"[(Get-Random -Maximum 16)] })
@(
  'database_path = "' + (Join-Path $analyticsTemp "analytics.sqlite").Replace('\','/') + '"'
  'hmac_key = "' + $analyticsKey + '"'
  'allowed_origin = "http://127.0.0.1:8796"'
) | Set-Content -LiteralPath $env:CALC_ANALYTICS_CONFIG -Encoding UTF8
$phpSource = (Get-Command php).Source
$phpArgs = @()
if (-not (php -m | Select-String -Pattern '^pdo_sqlite$')) {
  $phpArgs = @(
    '-d', ('extension_dir=' + (Join-Path (Split-Path -Parent $phpSource) 'ext')),
    '-d', 'extension=pdo_sqlite',
    '-d', 'extension=sqlite3'
  )
}
& $phpSource @phpArgs analytics-api/migrate.php
& $phpSource @phpArgs -S 127.0.0.1:8796 tests/php/router.php
~~~

Expected: PHP reports the local server on 127.0.0.1:8796. The temporary directory is explicit and outside the repository.

- [ ] **Step 3: Verify the public client and dashboard in the in-app browser**

Use the Browser skill and inspect:

- 1054 by 1014 desktop and 375 by 844 mobile.
- All three public pages load without visible counters, horizontal overflow, console errors, LIFF, or blocked calculator behavior.
- One visible load sends a visit; repeated reload and navigation across the three pages do not increase the database count within six hours.
- Each of tax, buyer, loan, young sends exactly one completion on result entry.
- Loan result salary slider and other result redraws do not send another completion.
- Leaving a result and reaching it again sends another completion.
- /analytics/ renders all four ranges, cards, four calculators, trend, device, referrer, and 24-hour sections.
- Force event API failure and confirm all four calculators still reach correct results without visible analytics errors.

Read the temporary SQLite through PHP test helpers or sqlite3 when available; do not infer counting from network requests alone.

- [ ] **Step 4: Stop the local server and remove only the resolved temporary directory**

Stop the foreground PHP process. Resolve and verify that $analyticsTemp begins with the operating-system temp directory and contains the calc-analytics- prefix before deleting it with Remove-Item -LiteralPath $analyticsTemp -Recurse. Clear CALC_ANALYTICS_CONFIG.

- [ ] **Step 5: Perform read-only VPS preflight**

~~~powershell
$sshKey = "C:\Users\w\.ssh\id_ed25519_hostinger_vps"
ssh -i $sshKey -o BatchMode=yes root@187.127.208.190 "set -eu; readlink -f /var/www/real-estate-calculator/current; systemctl is-active nginx; systemctl is-active php8.3-fpm; systemctl is-active tainanwei.service || true; ss -ltnp '( sport = :8787 )'; test -S /run/php/php8.3-fpm.sock; php -m | grep -E 'pdo_sqlite|sqlite3'; nginx -T 2>/dev/null | grep -F 'include /etc/nginx/conf.d/*.conf'; df -h /; free -h"
~~~

Expected:

- Nginx and php8.3-fpm are active.
- tainanwei.service is inactive.
- 8787 has no listener.
- PHP SQLite modules and FPM socket exist.
- Current release is the previously verified release.
- Nginx includes conf.d and VPS has adequate disk/memory.

Stop before any write if a boundary is different.

- [ ] **Step 6: Build and upload the immutable release**

~~~powershell
$repo = "C:\Users\w\Documents\NODE 主機\real-estate-calculator"
$release = (git -C $repo rev-parse HEAD).Substring(0, 12)
$archive = Join-Path ([System.IO.Path]::GetTempPath()) ("real-estate-calculator-" + $release + ".tar.gz")
git -C $repo archive --format=tar.gz -o $archive HEAD
scp -i $sshKey $archive ("root@187.127.208.190:/tmp/real-estate-calculator-" + $release + ".tar.gz")
~~~

Expected: one archive named with the exact committed first 12 characters exists on the VPS /tmp directory.

- [ ] **Step 7: Install the release, persistent configuration, one-time credential, and migration**

Pass the committed release ID to this literal remote script. It stops when the immutable release directory already exists:

~~~powershell
$remoteInstall = @'
set -euo pipefail
release="$1"
archive="/tmp/real-estate-calculator-$release.tar.gz"
release_dir="/var/www/real-estate-calculator/releases/$release"
deploy_dir="/var/www/real-estate-calculator/deployments/$release"
config_dir=/etc/real-estate-calculator
config_file="$config_dir/analytics.env"
auth_file=/etc/nginx/.htpasswd-calculator-analytics

test -f "$archive"
test ! -e "$release_dir"
install -d -m 0755 "$release_dir"
tar -xzf "$archive" -C "$release_dir"
install -d -m 0755 "$deploy_dir"
readlink -f /var/www/real-estate-calculator/current > "$deploy_dir/previous-release.txt"
nginx_site=$(readlink -f /etc/nginx/sites-enabled/calc.tainanwei.com)
cp "$nginx_site" "$deploy_dir/nginx.before.conf"

install -d -o www-data -g www-data -m 0750 /var/lib/real-estate-calculator
install -d -o root -g root -m 0700 /var/backups/real-estate-calculator/analytics
install -d -o root -g www-data -m 0750 "$config_dir"

if [[ ! -f "$config_file" ]]; then
  hmac_key=$(openssl rand -hex 32)
  install -o root -g www-data -m 0640 /dev/null "$config_file"
  {
    printf 'database_path = "/var/lib/real-estate-calculator/analytics.sqlite"\n'
    printf 'hmac_key = "%s"\n' "$hmac_key"
    printf 'allowed_origin = "https://calc.tainanwei.com"\n'
  } > "$config_file"
fi

analytics_password=
if [[ ! -f "$auth_file" ]]; then
  analytics_password=$(openssl rand -base64 24 | tr -d '\r\n')
  analytics_hash=$(printf '%s' "$analytics_password" | openssl passwd -6 -stdin)
  install -o root -g www-data -m 0640 /dev/null "$auth_file"
  printf 'xiaowei:%s\n' "$analytics_hash" > "$auth_file"
fi

if [[ -f /etc/nginx/conf.d/calculator-analytics-http.conf ]]; then
  cp /etc/nginx/conf.d/calculator-analytics-http.conf "$deploy_dir/http.before.conf"
else
  : > "$deploy_dir/http.was-absent"
fi
if [[ -f /etc/nginx/snippets/calculator-analytics-locations.conf ]]; then
  cp /etc/nginx/snippets/calculator-analytics-locations.conf "$deploy_dir/locations.before.conf"
else
  : > "$deploy_dir/locations.was-absent"
fi

install -o root -g root -m 0644 "$release_dir/ops/nginx/calculator-analytics-http.conf" /etc/nginx/conf.d/calculator-analytics-http.conf
install -o root -g root -m 0644 "$release_dir/ops/nginx/calculator-analytics-locations.conf" /etc/nginx/snippets/calculator-analytics-locations.conf
install -o root -g root -m 0755 "$release_dir/ops/analytics-backup.sh" /usr/local/sbin/calc-analytics-backup
install -o root -g root -m 0644 "$release_dir/ops/analytics-backup.cron" /etc/cron.d/calc-analytics-backup

/usr/local/sbin/calc-analytics-backup
runuser -u www-data -- php "$release_dir/analytics-api/migrate.php"

if [[ -n "$analytics_password" ]]; then
  printf 'ANALYTICS_INITIAL_PASSWORD=%s\n' "$analytics_password"
fi
'@
$remoteInstall | ssh -i $sshKey root@187.127.208.190 ("bash -s -- " + $release)
~~~

Capture the one-time password from the result into the in-memory variable $analyticsPassword. Do not write it to a repository file, deployment.txt, analytics.env, or remote shell history.

- [ ] **Step 8: Install the Nginx include, switch release, and validate before reload**

Run a second audited remote script. It must insert the snippet include only when absent, update the release header, atomically switch current, and automatically restore on validation/reload failure:

~~~bash
set -euo pipefail
release="$1"
release_dir="/var/www/real-estate-calculator/releases/$release"
deploy_dir="/var/www/real-estate-calculator/deployments/$release"
nginx_site=$(readlink -f /etc/nginx/sites-enabled/calc.tainanwei.com)
previous_release=$(cat "$deploy_dir/previous-release.txt")

if ! grep -Fq 'include /etc/nginx/snippets/calculator-analytics-locations.conf;' "$nginx_site"; then
  sed -i '/add_header Cache-Control "no-cache" always;/a\    include /etc/nginx/snippets/calculator-analytics-locations.conf;' "$nginx_site"
fi
sed -i -E "s/X-Calculator-Release \"[^\"]*\"/X-Calculator-Release \"$release\"/" "$nginx_site"

next_link="/var/www/real-estate-calculator/.current-$release"
ln -s "$release_dir" "$next_link"
mv -Tf "$next_link" /var/www/real-estate-calculator/current

if ! nginx -t || ! systemctl reload nginx; then
  ln -sfn "$previous_release" "$next_link"
  mv -Tf "$next_link" /var/www/real-estate-calculator/current
  cp "$deploy_dir/nginx.before.conf" "$nginx_site"
  if [[ -f "$deploy_dir/http.before.conf" ]]; then
    cp "$deploy_dir/http.before.conf" /etc/nginx/conf.d/calculator-analytics-http.conf
  else
    rm -f /etc/nginx/conf.d/calculator-analytics-http.conf
  fi
  if [[ -f "$deploy_dir/locations.before.conf" ]]; then
    cp "$deploy_dir/locations.before.conf" /etc/nginx/snippets/calculator-analytics-locations.conf
  else
    rm -f /etc/nginx/snippets/calculator-analytics-locations.conf
  fi
  nginx -t
  systemctl reload nginx
  exit 1
fi

/usr/local/sbin/calc-analytics-backup
~~~

The first remote script records whether both analytics Nginx files existed, and the rollback branch restores or removes only those exact files. Never start tainanwei.service and never add a listener on 8787.

- [ ] **Step 9: Verify auth, API methods, privacy, counting, and clean smoke data**

Without credentials:

~~~powershell
curl.exe -sS -o NUL -w "%{http_code}\n" https://calc.tainanwei.com/analytics/
curl.exe -sS -o NUL -w "%{http_code}\n" "https://calc.tainanwei.com/api/analytics/summary?range=30d"
curl.exe -sS -o NUL -w "%{http_code}\n" https://calc.tainanwei.com/analytics-api/event.php
~~~

Expected: 401, 401, 404.

With $analyticsPassword supplied through curl --user at execution time, verify /analytics/ and all four ranges return 200. Do not place the password in a committed script or deployment record.

Create one UUID v4 and a referrer domain deployment-check-$release.invalid. Send the same visit twice and one completion for each calculator, with exact Origin, Referer, Sec-Fetch-Site, Content-Type and User-Agent headers. Verify:

~~~powershell
$smokeVisitor = [guid]::NewGuid().ToString()
$smokeReferrer = "deployment-check-" + $release + ".invalid"
$eventArgs = @(
  "-sS", "-o", "NUL", "-w", "%{http_code}\n",
  "-H", "Origin: https://calc.tainanwei.com",
  "-H", "Referer: https://calc.tainanwei.com/",
  "-H", "Sec-Fetch-Site: same-origin",
  "-H", "Content-Type: application/json",
  "-H", "User-Agent: CalculatorDeploymentCheck/1.0"
)
$credential = "xiaowei:" + $analyticsPassword
$before = curl.exe -sS --user $credential "https://calc.tainanwei.com/api/analytics/summary?range=today" | ConvertFrom-Json
$visitBody = @{
  type = "visit"
  visitorId = $smokeVisitor
  deviceType = "desktop"
  referrerDomain = $smokeReferrer
} | ConvertTo-Json -Compress
curl.exe @eventArgs --data-raw $visitBody https://calc.tainanwei.com/api/analytics/event
curl.exe @eventArgs --data-raw $visitBody https://calc.tainanwei.com/api/analytics/event
foreach ($calculator in @("tax", "buyer", "loan", "young")) {
  $completionBody = @{
    type = "completion"
    calculator = $calculator
    deviceType = "desktop"
    referrerDomain = $smokeReferrer
  } | ConvertTo-Json -Compress
  curl.exe @eventArgs --data-raw $completionBody https://calc.tainanwei.com/api/analytics/event
}
$after = curl.exe -sS --user $credential "https://calc.tainanwei.com/api/analytics/summary?range=today" | ConvertFrom-Json
~~~

- All valid writes return 204.
- Visit total rises by exactly one.
- Each calculator completion rises by exactly one.
- Malformed, cross-origin, wrong-method and oversized requests return safe 4xx responses without changing totals.

After saving the before/after aggregate evidence, compute the test visitor HMAC from the protected config and delete only:

- visit_dedupe row matching that HMAC.
- metric_buckets rows whose referrer_domain exactly equals deployment-check-$release.invalid.

Use one SQLite BEGIN IMMEDIATE transaction, verify the marker count is zero, and leave all other rows untouched. The deployment backup from Steps 7-8 must exist before this cleanup.

~~~powershell
$cleanupScript = @'
set -euo pipefail
visitor_id="$1"
marker="$2"
[[ "$visitor_id" =~ ^[0-9a-f-]{36}$ ]]
[[ "$marker" =~ ^deployment-check-[0-9a-f]{12}\.invalid$ ]]
config=/etc/real-estate-calculator/analytics.env
db=/var/lib/real-estate-calculator/analytics.sqlite
hmac_key=$(sed -n -E 's/^hmac_key = "([0-9a-f]{64})"$/\1/p' "$config")
test "$(printf '%s' "$hmac_key" | wc -c)" -eq 64
visitor_hash=$(php -r 'echo hash_hmac("sha256", $argv[1], $argv[2]);' "$visitor_id" "$hmac_key")
sqlite3 "$db" "BEGIN IMMEDIATE;
DELETE FROM visit_dedupe WHERE visitor_hash = '$visitor_hash';
DELETE FROM metric_buckets WHERE referrer_domain = '$marker';
COMMIT;"
test "$(sqlite3 "$db" "SELECT COUNT(*) FROM metric_buckets WHERE referrer_domain = '$marker';")" = 0
'@
$cleanupScript | ssh -i $sshKey root@187.127.208.190 ("bash -s -- " + $smokeVisitor + " " + $smokeReferrer)
$cleaned = curl.exe -sS --user $credential "https://calc.tainanwei.com/api/analytics/summary?range=today" | ConvertFrom-Json
~~~

Assert cleaned totals and calculator counts equal before. Then clear $credential, $analyticsPassword, $smokeVisitor and all response variables from the PowerShell session after reporting the credential to the user.

Use the in-app browser at 1054 by 1014 and 375 by 844 to verify:

- All three public pages and four calculators.
- No public counter or analytics error text.
- Private dashboard layout and range switching after Basic Auth.
- No horizontal overflow.
- Console error list is empty.
- Network responses contain no input values, secrets, SQL, paths or visitor hash.

- [ ] **Step 10: Verify production boundaries and provenance**

~~~powershell
curl.exe -fsSI ("https://calc.tainanwei.com/?v=" + $release)
ssh -i $sshKey root@187.127.208.190 "set -eu; readlink -f /var/www/real-estate-calculator/current; grep -F 'X-Calculator-Release' /etc/nginx/sites-enabled/calc.tainanwei.com; systemctl is-active tainanwei.service || true; ss -ltnp '( sport = :8787 )'; systemctl is-active php8.3-fpm; nginx -t; test -s /var/lib/real-estate-calculator/analytics.sqlite; test -s /etc/nginx/.htpasswd-calculator-analytics; test -s /etc/real-estate-calculator/analytics.env; ls -1 /var/backups/real-estate-calculator/analytics/ | tail -n 3"
~~~

Expected:

- current and X-Calculator-Release match $release.
- Node service remains inactive and 8787 remains unlistened.
- PHP-FPM remains active and nginx -t succeeds.
- Database, auth file, config, and backup exist outside the web root.

- [ ] **Step 11: Record deployment and hand off credentials**

Append a deployment record containing release ID, UTC and Asia/Taipei timestamps, previous release, automated test result, Nginx config backup path, database backup path, auth/API/live-browser checks, Node boundary checks, and rollback target. Do not include the generated password, HMAC key, raw IP, test UUID or visitor hash.

Report the one-time credential to the user:

- URL: https://calc.tainanwei.com/analytics/
- Username: xiaowei
- Password: the one-time generated value from Step 7

Ask the user to save it in a password manager. If the credential is lost, rotate the Basic Auth hash; never try to recover plaintext.

---

## Completion Gate

Do not claim completion until all items below have direct evidence:

- npm test passes with existing calculator tests, new JavaScript analytics tests, and new PHP tests.
- git diff --check passes and implementation commits contain no secrets or transient SQLite files.
- Three public pages show no counters and keep existing functionality.
- Six-hour visit behavior and every-result-entry completion behavior match the spec.
- /analytics/ and summary return 401 anonymously and 200 only with Basic Auth.
- Dashboard reports today, 7d, 30d, all, four calculators, trend, device, referrer, and hours.
- Analytics outage cannot block calculators.
- SQLite, auth, config and backups are outside the web root with restrictive ownership.
- nginx -t, release provenance, desktop/mobile browser checks and console checks pass.
- tainanwei.service remains inactive and 8787 remains unlistened.
- A verified previous release and Nginx/SQLite backups exist for rollback.
