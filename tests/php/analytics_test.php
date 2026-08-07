<?php
declare(strict_types=1);

require_once __DIR__ . '/../../analytics-api/lib/Config.php';
require_once __DIR__ . '/../../analytics-api/lib/Database.php';
require_once __DIR__ . '/../../analytics-api/lib/AnalyticsStore.php';
require_once __DIR__ . '/../../analytics-api/lib/Http.php';

$tests = [];

$tests['config loads explicit values and Taipei timezone'] = function (): void {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'calc-analytics-' . bin2hex(random_bytes(6));
    mkdir($dir, 0700, true);
    $configPath = $dir . DIRECTORY_SEPARATOR . 'analytics.env';

    try {
        file_put_contents($configPath, implode(PHP_EOL, [
            'database_path = "' . $dir . DIRECTORY_SEPARATOR . 'analytics.sqlite"',
            'hmac_key = "' . str_repeat('a', 64) . '"',
            'allowed_origin = "https://calc.tainanwei.com"',
        ]));

        $config = AnalyticsConfig::load($configPath);
        assertSame($dir . DIRECTORY_SEPARATOR . 'analytics.sqlite', $config['databasePath']);
        assertSame('https://calc.tainanwei.com', $config['allowedOrigin']);
        assertSame('Asia/Taipei', $config['timezone']->getName());
    } finally {
        cleanupDirectory($dir);
    }
};

$tests['config rejects allowed origins containing credentials'] = function (): void {
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'calc-analytics-' . bin2hex(random_bytes(6));
    mkdir($dir, 0700, true);
    $configPath = $dir . DIRECTORY_SEPARATOR . 'analytics.env';

    try {
        file_put_contents($configPath, implode(PHP_EOL, [
            'database_path = "' . $dir . DIRECTORY_SEPARATOR . 'analytics.sqlite"',
            'hmac_key = "' . str_repeat('a', 64) . '"',
            'allowed_origin = "https://attacker@calc.tainanwei.com"',
        ]));

        assertThrows(fn (): array => AnalyticsConfig::load($configPath));
    } finally {
        cleanupDirectory($dir);
    }
};

$tests['migration creates both tables with WAL and foreign keys'] = function (): void {
    [$pdo, $dir] = newTemporaryDatabase();

    try {
        $tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            ->fetchAll(PDO::FETCH_COLUMN);
        assertTrue(in_array('metric_buckets', $tables, true));
        assertTrue(in_array('visit_dedupe', $tables, true));
        assertSame('wal', strtolower((string) $pdo->query('PRAGMA journal_mode')->fetchColumn()));
        assertSame('1', (string) $pdo->query('PRAGMA foreign_keys')->fetchColumn());
    } finally {
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['visit counts once inside rolling six hours and again at six hours'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        $event = visitEvent('11111111-1111-4111-8111-111111111111');
        $start = new DateTimeImmutable('2026-08-07T00:30:00+08:00');
        assertTrue($store->record($event, $start));
        assertFalse($store->record($event, $start->modify('+5 hours 59 minutes 59 seconds')));
        assertTrue($store->record($event, $start->modify('+6 hours')));
        assertSame(2, metricCount($pdo, 'visit', ''));
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['different visitor IDs each count'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        $now = new DateTimeImmutable('2026-08-07T12:00:00+08:00');
        assertTrue($store->record(visitEvent('11111111-1111-4111-8111-111111111111'), $now));
        assertTrue($store->record(visitEvent('22222222-2222-4222-8222-222222222222'), $now));
        assertSame(2, metricCount($pdo, 'visit', ''));
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['completion increments every valid result transition event'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        $now = new DateTimeImmutable('2026-08-07T12:00:00+08:00');
        foreach (['tax', 'buyer', 'loan', 'young'] as $calculator) {
            assertTrue($store->record(completionEvent($calculator), $now));
            assertTrue($store->record(completionEvent($calculator), $now));
            assertSame(2, metricCount($pdo, 'completion', $calculator));
        }
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['visit dedupe cleanup removes records older than 48 hours'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        $oldHash = hash_hmac('sha256', '11111111-1111-4111-8111-111111111111', str_repeat('a', 64));
        $pdo->prepare('INSERT INTO visit_dedupe (visitor_hash, last_counted_at, updated_at) VALUES (?, ?, ?)')
            ->execute([$oldHash, 1, 1]);
        assertTrue($store->record(visitEvent('22222222-2222-4222-8222-222222222222'), new DateTimeImmutable('@1722988800')));
        assertSame(0, (int) $pdo->query("SELECT COUNT(*) FROM visit_dedupe WHERE visitor_hash = '{$oldHash}'")->fetchColumn());
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['bucket dates and hours use Asia Taipei across UTC day boundary'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        assertTrue($store->record(visitEvent('11111111-1111-4111-8111-111111111111'), new DateTimeImmutable('2026-08-06T16:30:00Z')));
        $bucket = $pdo->query("SELECT local_date, local_hour FROM metric_buckets WHERE event_type = 'visit'")->fetch();
        assertSame('2026-08-07', $bucket['local_date']);
        assertSame(0, (int) $bucket['local_hour']);
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['invalid event requests never mutate SQLite'] = function (): void {
    [$store, $pdo, $config, $dir] = newTemporaryStoreWithConfig();

    try {
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
                fn (): array => AnalyticsHttp::parseEvent($server, $body, $config['allowedOrigin'])
            );
        }
        assertSame(0, allMetricCount($pdo));
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['referrer domains normalize and overlong values are rejected'] = function (): void {
    $server = sameOriginServer('application/json');
    $event = AnalyticsHttp::parseEvent(
        $server,
        '{"type":"completion","calculator":"tax","deviceType":"desktop","referrerDomain":"WWW.Example.COM"}',
        'https://calc.tainanwei.com'
    );
    assertSame('example.com', $event['referrerDomain']);

    assertThrowsStatus(400, fn (): array => AnalyticsHttp::parseEvent(
        $server,
        '{"type":"completion","calculator":"tax","deviceType":"desktop","referrerDomain":"' . str_repeat('a', 121) . '"}',
        'https://calc.tainanwei.com'
    ));
};

$tests['parser rejects invalid strict event contracts'] = function (): void {
    $allowedOrigin = 'https://calc.tainanwei.com';
    $validVisit = '{"type":"visit","visitorId":"11111111-1111-4111-8111-111111111111","deviceType":"mobile","referrerDomain":"direct"}';
    $cases = [
        [sameOriginServer('application/json', 2049), $validVisit, 413],
        [sameOriginServer('application/json'), str_repeat(' ', 2049), 413],
        [sameOriginServer('application/json'), '{"type":"visit","deviceType":"mobile","referrerDomain":"direct"}', 400],
        [sameOriginServer('application/json'), '{"type":"completion","visitorId":"11111111-1111-4111-8111-111111111111","calculator":"tax","deviceType":"mobile","referrerDomain":"direct"}', 400],
        [sameOriginServer('application/json'), '{"type":"visit","visitorId":"11111111-1111-3111-8111-111111111111","deviceType":"mobile","referrerDomain":"direct"}', 400],
        [sameOriginServer('application/json'), '{"type":"visit","visitorId":"11111111-1111-4111-8111-111111111111","deviceType":"tablet","referrerDomain":"direct"}', 400],
        [sameOriginServer('application/json'), '{"type":"visit","visitorId":"11111111-1111-4111-8111-111111111111","deviceType":"mobile","referrerDomain":"direct","extra":true}', 400],
        [[
            'REQUEST_METHOD' => 'POST',
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ORIGIN' => $allowedOrigin,
            'HTTP_REFERER' => 'https://attacker.example/path',
        ], $validVisit, 403],
        [array_merge(sameOriginServer('application/json'), ['HTTP_SEC_FETCH_SITE' => 'cross-site']), $validVisit, 403],
    ];

    foreach ($cases as [$server, $body, $status]) {
        assertThrowsStatus($status, fn (): array => AnalyticsHttp::parseEvent($server, $body, $allowedOrigin));
    }
};

$tests['common bots are parsed as skipped without retaining user agent'] = function (): void {
    $event = AnalyticsHttp::parseEvent(
        array_merge(sameOriginServer('application/json'), ['HTTP_USER_AGENT' => 'Googlebot/2.1']),
        '{"type":"visit","visitorId":"11111111-1111-4111-8111-111111111111","deviceType":"mobile","referrerDomain":"internal"}',
        'https://calc.tainanwei.com'
    );
    assertTrue($event['skipBot']);
    assertSame(['type', 'calculator', 'visitorId', 'deviceType', 'referrerDomain', 'skipBot'], array_keys($event));
};

$tests['failed bucket writes roll back visit cleanup and dedupe changes'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        $now = new DateTimeImmutable('2026-08-07T12:00:00+08:00');
        $timestamp = $now->getTimestamp();
        $expiredHash = hash_hmac('sha256', '11111111-1111-4111-8111-111111111111', str_repeat('a', 64));
        $existingVisitorId = '22222222-2222-4222-8222-222222222222';
        $existingHash = hash_hmac('sha256', $existingVisitorId, str_repeat('a', 64));
        $newVisitorId = '33333333-3333-4333-8333-333333333333';
        $newHash = hash_hmac('sha256', $newVisitorId, str_repeat('a', 64));

        $dedupeInsert = $pdo->prepare(
            'INSERT INTO visit_dedupe (visitor_hash, last_counted_at, updated_at) VALUES (?, ?, ?)'
        );
        $dedupeInsert->execute([$expiredHash, 1, 1]);
        $dedupeInsert->execute([$existingHash, $timestamp - 21600, $timestamp - 30]);
        $pdo->exec("INSERT INTO metric_buckets (local_date, local_hour, event_type, calculator, device_type, referrer_domain, count) VALUES ('2026-08-07', 12, 'completion', 'tax', 'desktop', 'internal', 7)");
        $pdo->exec("CREATE TRIGGER abort_metric_bucket_insert BEFORE INSERT ON metric_buckets BEGIN SELECT RAISE(ABORT, 'forced bucket failure'); END");

        assertThrows(fn (): bool => $store->record(visitEvent($existingVisitorId), $now));
        assertSame(1, dedupeRowCount($pdo, $expiredHash));
        assertSame([$timestamp - 21600, $timestamp - 30], dedupeTimestamps($pdo, $existingHash));
        assertSame(7, allMetricCount($pdo));

        assertThrows(fn (): bool => $store->record(visitEvent($newVisitorId), $now));
        assertSame(1, dedupeRowCount($pdo, $expiredHash));
        assertSame(0, dedupeRowCount($pdo, $newHash));
        assertSame(7, allMetricCount($pdo));
    } finally {
        $dedupeInsert = null;
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['event endpoint returns empty status-only responses without leaks'] = function (): void {
    $dir = newTemporaryDirectory();
    $configPath = $dir . DIRECTORY_SEPARATOR . 'analytics.env';
    $databasePath = $dir . DIRECTORY_SEPARATOR . 'analytics.sqlite';

    try {
        [$port, $reservation] = reserveLocalPort();
        fclose($reservation);
        $origin = 'http://127.0.0.1:' . $port;
        writeAnalyticsConfig($configPath, $databasePath, $origin);
        $pdo = AnalyticsDatabase::connect(['databasePath' => $databasePath]);
        AnalyticsDatabase::migrate($pdo, __DIR__ . '/../../analytics-api/schema.sql');
        $pdo = null;

        $server = startAnalyticsServer($configPath, $port);
        try {
            waitForAnalyticsServer($port);
            $validBody = '{"type":"visit","visitorId":"11111111-1111-4111-8111-111111111111","deviceType":"mobile","referrerDomain":"direct"}';
            assertHttpResponse(204, '', analyticsEndpointRequest($port, 'POST', $validBody, $origin));
            assertHttpResponse(204, '', analyticsEndpointRequest($port, 'POST', $validBody, $origin));
            assertHttpResponse(204, '', analyticsEndpointRequest(
                $port,
                'POST',
                $validBody,
                $origin,
                ['User-Agent' => 'Googlebot/2.1']
            ));
            assertHttpResponse(400, '', analyticsEndpointRequest($port, 'POST', '{"type":"visit"}', $origin));
        } finally {
            stopAnalyticsServer($server);
        }

        $pdo = AnalyticsDatabase::connect(['databasePath' => $databasePath]);
        assertSame(1, allMetricCount($pdo));
        $pdo = null;

        $missingConfigServer = startAnalyticsServer($dir . DIRECTORY_SEPARATOR . 'missing.env', $port);
        try {
            waitForAnalyticsServer($port);
            assertHttpResponseWithoutDetail(
                500,
                'Unable to load analytics configuration',
                analyticsEndpointRequest($port, 'POST', $validBody, $origin)
            );
        } finally {
            stopAnalyticsServer($missingConfigServer);
        }

        $databaseFailureConfig = $dir . DIRECTORY_SEPARATOR . 'database-failure.env';
        writeAnalyticsConfig($databaseFailureConfig, $dir, $origin);
        $databaseFailureServer = startAnalyticsServer($databaseFailureConfig, $port);
        try {
            waitForAnalyticsServer($port);
            assertHttpResponseWithoutDetail(
                500,
                'database',
                analyticsEndpointRequest($port, 'POST', $validBody, $origin)
            );
        } finally {
            stopAnalyticsServer($databaseFailureServer);
        }

        $writeFailureConfig = $dir . DIRECTORY_SEPARATOR . 'write-failure.env';
        $writeFailureDatabase = $dir . DIRECTORY_SEPARATOR . 'write-failure.sqlite';
        writeAnalyticsConfig($writeFailureConfig, $writeFailureDatabase, $origin);
        $pdo = AnalyticsDatabase::connect(['databasePath' => $writeFailureDatabase]);
        AnalyticsDatabase::migrate($pdo, __DIR__ . '/../../analytics-api/schema.sql');
        $pdo->exec("CREATE TRIGGER abort_metric_bucket_insert BEFORE INSERT ON metric_buckets BEGIN SELECT RAISE(ABORT, 'forced endpoint write failure'); END");
        $pdo = null;
        $writeFailureServer = startAnalyticsServer($writeFailureConfig, $port);
        try {
            waitForAnalyticsServer($port);
            assertHttpResponseWithoutDetail(
                500,
                'forced endpoint write failure',
                analyticsEndpointRequest($port, 'POST', $validBody, $origin)
            );
        } finally {
            stopAnalyticsServer($writeFailureServer);
        }
    } finally {
        cleanupDirectory($dir);
    }
};

$tests['summary aggregates the bounded Taiwan range into complete dashboard dimensions'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        seedMetricBucket($pdo, '2026-07-01', 3, 'visit', '', 'mobile', 'direct', 4);
        seedMetricBucket($pdo, '2026-07-01', 3, 'completion', 'tax', 'desktop', 'internal', 2);
        seedMetricBucket($pdo, '2026-08-01', 0, 'visit', '', 'mobile', 'direct', 4);
        seedMetricBucket($pdo, '2026-08-01', 0, 'completion', 'tax', 'desktop', 'internal', 2);
        seedMetricBucket($pdo, '2026-08-03', 8, 'visit', '', 'desktop', 'z.example', 3);
        seedMetricBucket($pdo, '2026-08-03', 8, 'completion', 'buyer', 'desktop', 'internal', 3);
        seedMetricBucket($pdo, '2026-08-05', 8, 'visit', '', 'mobile', 'alpha.example', 1);
        seedMetricBucket($pdo, '2026-08-05', 8, 'completion', 'loan', 'desktop', 'internal', 1);
        seedMetricBucket($pdo, '2026-08-07', 23, 'visit', '', 'desktop', 'direct', 4);
        seedMetricBucket($pdo, '2026-08-07', 23, 'completion', 'young', 'desktop', 'internal', 3);

        $now = new DateTimeImmutable('2026-08-07T15:00:00+08:00');
        $summary = $store->summary('7d', $now);

        assertSame('7d', $summary['range']);
        assertSame(['startDate' => '2026-08-01', 'endDate' => '2026-08-07'], $summary['period']);
        assertSame(['visits' => 12, 'completions' => 9, 'completionsPer100Visits' => 75.0], $summary['totals']);
        assertSame([
            ['key' => 'tax', 'completions' => 2, 'share' => 22.2],
            ['key' => 'buyer', 'completions' => 3, 'share' => 33.3],
            ['key' => 'loan', 'completions' => 1, 'share' => 11.1],
            ['key' => 'young', 'completions' => 3, 'share' => 33.3],
        ], $summary['calculators']);
        assertSame([
            ['date' => '2026-08-01', 'visits' => 4, 'completions' => 2],
            ['date' => '2026-08-02', 'visits' => 0, 'completions' => 0],
            ['date' => '2026-08-03', 'visits' => 3, 'completions' => 3],
            ['date' => '2026-08-04', 'visits' => 0, 'completions' => 0],
            ['date' => '2026-08-05', 'visits' => 1, 'completions' => 1],
            ['date' => '2026-08-06', 'visits' => 0, 'completions' => 0],
            ['date' => '2026-08-07', 'visits' => 4, 'completions' => 3],
        ], $summary['trend']);
        assertSame([
            ['key' => 'mobile', 'visits' => 5, 'share' => 41.7],
            ['key' => 'desktop', 'visits' => 7, 'share' => 58.3],
        ], $summary['devices']);
        assertSame([
            ['domain' => 'direct', 'visits' => 8, 'share' => 66.7],
            ['domain' => 'z.example', 'visits' => 3, 'share' => 25.0],
            ['domain' => 'alpha.example', 'visits' => 1, 'share' => 8.3],
        ], $summary['referrers']);
        assertSame(24, count($summary['hours']));
        assertSame(['hour' => 0, 'visits' => 4], $summary['hours'][0]);
        assertSame(['hour' => 8, 'visits' => 4], $summary['hours'][8]);
        assertSame(['hour' => 23, 'visits' => 4], $summary['hours'][23]);

        $today = $store->summary('today', $now);
        assertSame(['startDate' => '2026-08-07', 'endDate' => '2026-08-07'], $today['period']);
        assertSame(4, $today['totals']['visits']);

        $thirtyDays = $store->summary('30d', $now);
        assertSame(['startDate' => '2026-07-09', 'endDate' => '2026-08-07'], $thirtyDays['period']);
        assertSame(12, $thirtyDays['totals']['visits']);
        assertSame(30, count($thirtyDays['trend']));

        $all = $store->summary('all', $now);
        assertSame(['startDate' => null, 'endDate' => '2026-08-07'], $all['period']);
        assertSame(16, $all['totals']['visits']);
        assertSame(['date' => '2026-07-01', 'visits' => 4, 'completions' => 2], $all['trend'][0]);
        assertSame(['date' => '2026-08-07', 'visits' => 4, 'completions' => 3], $all['trend'][37]);
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['summary returns zero-safe values and limits ordered visit referrers'] = function (): void {
    [$store, $pdo, $dir] = newTemporaryStore();

    try {
        $now = new DateTimeImmutable('2026-08-07T15:00:00+08:00');
        seedMetricBucket($pdo, '2026-08-07', 4, 'completion', 'tax', 'desktop', 'internal', 2);
        $emptyVisits = $store->summary('today', $now);
        assertSame(['visits' => 0, 'completions' => 2, 'completionsPer100Visits' => null], $emptyVisits['totals']);
        assertSame([
            ['key' => 'mobile', 'visits' => 0, 'share' => null],
            ['key' => 'desktop', 'visits' => 0, 'share' => null],
        ], $emptyVisits['devices']);
        assertSame([], $emptyVisits['referrers']);
        assertSame(['hour' => 4, 'visits' => 0], $emptyVisits['hours'][4]);

        foreach (range('a', 'l') as $letter) {
            seedMetricBucket($pdo, '2026-08-07', 9, 'visit', '', 'mobile', $letter . '.example', 1);
        }
        $limited = $store->summary('today', $now);
        assertSame(10, count($limited['referrers']));
        assertSame('a.example', $limited['referrers'][0]['domain']);
        assertSame('j.example', $limited['referrers'][9]['domain']);

        [$emptyStore, $emptyPdo, $emptyDir] = newTemporaryStore();
        try {
            $empty = $emptyStore->summary('all', $now);
            assertSame([], $empty['trend']);
            assertSame(['startDate' => null, 'endDate' => '2026-08-07'], $empty['period']);
        } finally {
            $emptyStore = null;
            $emptyPdo = null;
            cleanupDirectory($emptyDir);
        }
    } finally {
        $store = null;
        $pdo = null;
        cleanupDirectory($dir);
    }
};

$tests['summary parser accepts only GET and one optional supported range'] = function (): void {
    assertSame('30d', AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], []));
    assertSame('today', AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], ['range' => 'today']));
    assertSame('7d', AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], ['range' => '7d']));
    assertSame('all', AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], ['range' => 'all']));
    assertThrowsStatus(400, fn (): string => AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], ['range' => 'yesterday']));
    assertThrowsStatus(400, fn (): string => AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], ['range' => ['today']]));
    assertThrowsStatus(400, fn (): string => AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'GET'], ['range' => 'today', 'extra' => '1']));
    assertThrowsStatus(405, fn (): string => AnalyticsHttp::parseSummaryRange(['REQUEST_METHOD' => 'POST'], []));
};

$tests['summary endpoint is read-only JSON with no-store cache headers'] = function (): void {
    $dir = newTemporaryDirectory();
    $configPath = $dir . DIRECTORY_SEPARATOR . 'analytics.env';
    $databasePath = $dir . DIRECTORY_SEPARATOR . 'analytics.sqlite';

    try {
        [$port, $reservation] = reserveLocalPort();
        fclose($reservation);
        $origin = 'http://127.0.0.1:' . $port;
        writeAnalyticsConfig($configPath, $databasePath, $origin);
        $pdo = AnalyticsDatabase::connect(['databasePath' => $databasePath]);
        AnalyticsDatabase::migrate($pdo, __DIR__ . '/../../analytics-api/schema.sql');
        seedMetricBucket($pdo, '2026-08-07', 8, 'visit', '', 'mobile', 'direct', 1);
        $pdo = null;

        $server = startAnalyticsServer($configPath, $port);
        try {
            waitForAnalyticsServer($port);
            $response = analyticsSummaryRequest($port, 'GET', 'all');
            assertSame(200, $response[0]);
            assertHeaderContains('Content-Type: application/json; charset=utf-8', $response[2]);
            assertHeaderContains('Cache-Control: no-store, max-age=0', $response[2]);
            $body = json_decode($response[1], true, 32, JSON_THROW_ON_ERROR);
            assertSame('all', $body['range']);
            assertSame(1, $body['totals']['visits']);
            assertHttpResponse(405, '', analyticsSummaryRequest($port, 'POST', 'all'));
        } finally {
            stopAnalyticsServer($server);
        }
    } finally {
        cleanupDirectory($dir);
    }
};

function assertSame(mixed $expected, mixed $actual): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(
            'Expected ' . var_export($expected, true) . ' but received ' . var_export($actual, true)
        );
    }
}

function assertTrue(bool $condition): void
{
    if (!$condition) {
        throw new RuntimeException('Expected condition to be true');
    }
}

function assertFalse(bool $condition): void
{
    if ($condition) {
        throw new RuntimeException('Expected condition to be false');
    }
}

function assertThrows(callable $callback): void
{
    try {
        $callback();
    } catch (Throwable) {
        return;
    }

    throw new RuntimeException('Expected callback to throw');
}

function assertThrowsStatus(int $expectedStatus, callable $callback): void
{
    try {
        $callback();
    } catch (AnalyticsHttpException $error) {
        assertSame($expectedStatus, $error->status());
        return;
    }

    throw new RuntimeException('Expected AnalyticsHttpException with status ' . $expectedStatus);
}

function newTemporaryStore(): array
{
    [$pdo, $dir] = newTemporaryDatabase();
    return [new AnalyticsStore($pdo, str_repeat('a', 64), new DateTimeZone('Asia/Taipei')), $pdo, $dir];
}

function newTemporaryStoreWithConfig(): array
{
    [$pdo, $dir] = newTemporaryDatabase();
    $config = [
        'hmacKey' => str_repeat('a', 64),
        'allowedOrigin' => 'https://calc.tainanwei.com',
        'timezone' => new DateTimeZone('Asia/Taipei'),
    ];
    return [new AnalyticsStore($pdo, $config['hmacKey'], $config['timezone']), $pdo, $config, $dir];
}

function visitEvent(string $visitorId): array
{
    return [
        'type' => 'visit',
        'calculator' => '',
        'visitorId' => $visitorId,
        'deviceType' => 'mobile',
        'referrerDomain' => 'direct',
        'skipBot' => false,
    ];
}

function completionEvent(string $calculator): array
{
    return [
        'type' => 'completion',
        'calculator' => $calculator,
        'visitorId' => '',
        'deviceType' => 'desktop',
        'referrerDomain' => 'internal',
        'skipBot' => false,
    ];
}

function metricCount(PDO $pdo, string $eventType, string $calculator): int
{
    $statement = $pdo->prepare('SELECT COALESCE(SUM(count), 0) FROM metric_buckets WHERE event_type = ? AND calculator = ?');
    $statement->execute([$eventType, $calculator]);
    return (int) $statement->fetchColumn();
}

function seedMetricBucket(
    PDO $pdo,
    string $date,
    int $hour,
    string $eventType,
    string $calculator,
    string $deviceType,
    string $referrerDomain,
    int $count
): void {
    $statement = $pdo->prepare(
        'INSERT INTO metric_buckets (
            local_date, local_hour, event_type, calculator,
            device_type, referrer_domain, count
        ) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $statement->execute([$date, $hour, $eventType, $calculator, $deviceType, $referrerDomain, $count]);
}

function allMetricCount(PDO $pdo): int
{
    return (int) $pdo->query('SELECT COALESCE(SUM(count), 0) FROM metric_buckets')->fetchColumn();
}

function dedupeRowCount(PDO $pdo, string $visitorHash): int
{
    $statement = $pdo->prepare('SELECT COUNT(*) FROM visit_dedupe WHERE visitor_hash = ?');
    $statement->execute([$visitorHash]);
    return (int) $statement->fetchColumn();
}

function dedupeTimestamps(PDO $pdo, string $visitorHash): array
{
    $statement = $pdo->prepare('SELECT last_counted_at, updated_at FROM visit_dedupe WHERE visitor_hash = ?');
    $statement->execute([$visitorHash]);
    $row = $statement->fetch();
    if (!is_array($row)) {
        throw new RuntimeException('Expected visit dedupe row to exist');
    }
    return [(int) $row['last_counted_at'], (int) $row['updated_at']];
}

function newTemporaryDirectory(): string
{
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'calc-analytics-' . bin2hex(random_bytes(6));
    mkdir($dir, 0700, true);
    return $dir;
}

function writeAnalyticsConfig(string $configPath, string $databasePath, string $origin): void
{
    file_put_contents($configPath, implode(PHP_EOL, [
        'database_path = "' . str_replace('\\', '/', $databasePath) . '"',
        'hmac_key = "' . str_repeat('a', 64) . '"',
        'allowed_origin = "' . $origin . '"',
    ]));
}

function reserveLocalPort(): array
{
    $socket = stream_socket_server('tcp://127.0.0.1:0', $errorNumber, $errorMessage);
    if ($socket === false) {
        throw new RuntimeException('Unable to reserve local test port: ' . $errorMessage);
    }
    $address = stream_socket_get_name($socket, false);
    if (!is_string($address) || !preg_match('/:(\d+)\z/', $address, $matches)) {
        fclose($socket);
        throw new RuntimeException('Unable to determine local test port.');
    }
    return [(int) $matches[1], $socket];
}

function startAnalyticsServer(string $configPath, int $port): array
{
    $previousConfig = getenv('CALC_ANALYTICS_CONFIG');
    putenv('CALC_ANALYTICS_CONFIG=' . $configPath);
    $repoPath = realpath(__DIR__ . '/../..');
    if ($repoPath === false) {
        throw new RuntimeException('Unable to resolve analytics repository path.');
    }
    $pipes = [];
    $process = proc_open(
        analyticsServerCommand($port, $repoPath),
        [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes,
        $repoPath
    );
    if (!is_resource($process)) {
        restoreAnalyticsConfig($previousConfig);
        throw new RuntimeException('Unable to start local analytics server.');
    }
    foreach ($pipes as $pipe) {
        stream_set_blocking($pipe, false);
    }
    return [$process, $pipes, $previousConfig];
}

function analyticsServerCommand(int $port, string $repoPath): array
{
    $command = [PHP_BINARY];
    if (!barePhpHasSqlite()) {
        if (PHP_OS_FAMILY !== 'Windows') {
            throw new RuntimeException('The local PHP server requires pdo_sqlite.');
        }
        $extensionDirectory = dirname(PHP_BINARY) . DIRECTORY_SEPARATOR . 'ext';
        $command = array_merge($command, [
            '-d', 'extension_dir=' . $extensionDirectory,
            '-d', 'extension=pdo_sqlite',
            '-d', 'extension=sqlite3',
        ]);
    }
    return array_merge($command, ['-S', '127.0.0.1:' . $port, '-t', $repoPath]);
}

function barePhpHasSqlite(): bool
{
    $pipes = [];
    $process = proc_open([PHP_BINARY, '-m'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (!is_resource($process)) {
        throw new RuntimeException('Unable to inspect local PHP modules.');
    }
    $modules = stream_get_contents($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $status = proc_close($process);
    if ($status !== 0 || !is_string($modules)) {
        throw new RuntimeException('Unable to inspect local PHP modules: ' . $errors);
    }
    return preg_match('/^pdo_sqlite$/mi', $modules) === 1;
}

function stopAnalyticsServer(array $server): void
{
    [$process, $pipes, $previousConfig] = $server;
    if (is_resource($process)) {
        proc_terminate($process);
        proc_close($process);
    }
    foreach ($pipes as $pipe) {
        if (is_resource($pipe)) {
            fclose($pipe);
        }
    }
    restoreAnalyticsConfig($previousConfig);
}

function restoreAnalyticsConfig(string|false $previousConfig): void
{
    if ($previousConfig === false) {
        putenv('CALC_ANALYTICS_CONFIG');
        return;
    }
    putenv('CALC_ANALYTICS_CONFIG=' . $previousConfig);
}

function waitForAnalyticsServer(int $port): void
{
    for ($attempt = 0; $attempt < 30; $attempt++) {
        $socket = @stream_socket_client('tcp://127.0.0.1:' . $port, $errorNumber, $errorMessage, 0.1);
        if (is_resource($socket)) {
            fclose($socket);
            return;
        }
        usleep(100000);
    }
    throw new RuntimeException('Local analytics server did not start in time.');
}

function analyticsEndpointRequest(int $port, string $method, string $body, string $origin, array $extraHeaders = []): array
{
    $socket = stream_socket_client('tcp://127.0.0.1:' . $port, $errorNumber, $errorMessage, 5);
    if ($socket === false) {
        throw new RuntimeException('Unable to contact local analytics server: ' . $errorMessage);
    }
    $headers = array_merge([
        'Host' => '127.0.0.1:' . $port,
        'Content-Type' => 'application/json',
        'Content-Length' => (string) strlen($body),
        'Origin' => $origin,
        'Referer' => $origin . '/calculator',
        'Sec-Fetch-Site' => 'same-origin',
        'Connection' => 'close',
    ], $extraHeaders);
    $lines = [$method . ' /analytics-api/event.php HTTP/1.1'];
    foreach ($headers as $name => $value) {
        $lines[] = $name . ': ' . $value;
    }
    fwrite($socket, implode("\r\n", $lines) . "\r\n\r\n" . $body);
    $rawResponse = stream_get_contents($socket);
    fclose($socket);
    if (!is_string($rawResponse)) {
        throw new RuntimeException('Unable to read local analytics response.');
    }
    [$headerBlock, $responseBody] = array_pad(explode("\r\n\r\n", $rawResponse, 2), 2, '');
    if (!preg_match('/\AHTTP\/\d(?:\.\d)?\s+(\d{3})/', $headerBlock, $matches)) {
        throw new RuntimeException('Local analytics response did not include an HTTP status.');
    }
    return [(int) $matches[1], $responseBody, $headerBlock];
}

function analyticsSummaryRequest(int $port, string $method, string $range): array
{
    $socket = stream_socket_client('tcp://127.0.0.1:' . $port, $errorNumber, $errorMessage, 5);
    if ($socket === false) {
        throw new RuntimeException('Unable to contact local analytics server: ' . $errorMessage);
    }
    $request = implode("\r\n", [
        $method . ' /analytics-api/summary.php?range=' . rawurlencode($range) . ' HTTP/1.1',
        'Host: 127.0.0.1:' . $port,
        'Connection: close',
        '',
        '',
    ]);
    fwrite($socket, $request);
    $rawResponse = stream_get_contents($socket);
    fclose($socket);
    if (!is_string($rawResponse)) {
        throw new RuntimeException('Unable to read local analytics response.');
    }
    [$headerBlock, $responseBody] = array_pad(explode("\r\n\r\n", $rawResponse, 2), 2, '');
    if (!preg_match('/\AHTTP\/\d(?:\.\d)?\s+(\d{3})/', $headerBlock, $matches)) {
        throw new RuntimeException('Local analytics response did not include an HTTP status.');
    }
    return [(int) $matches[1], $responseBody, $headerBlock];
}

function assertHeaderContains(string $expected, string $headers): void
{
    if (!str_contains($headers, $expected)) {
        throw new RuntimeException('Expected response headers to contain ' . $expected . ' but received ' . $headers);
    }
}

function assertHttpResponse(int $expectedStatus, string $expectedBody, array $response): void
{
    if ($expectedStatus !== $response[0]) {
        throw new RuntimeException(
            'Expected HTTP ' . $expectedStatus . ' but received HTTP ' . $response[0] . ': ' . $response[2]
            . ' BODY=' . $response[1]
        );
    }
    assertSame($expectedBody, $response[1]);
}

function assertHttpResponseWithoutDetail(int $expectedStatus, string $forbiddenDetail, array $response): void
{
    assertSame($expectedStatus, $response[0]);
    assertSame('', $response[1]);
    assertFalse(str_contains($response[1], $forbiddenDetail));
}

function sameOriginServer(string $contentType, ?int $contentLength = null): array
{
    $server = [
        'REQUEST_METHOD' => 'POST',
        'CONTENT_TYPE' => $contentType,
        'HTTP_ORIGIN' => 'https://calc.tainanwei.com',
        'HTTP_REFERER' => 'https://calc.tainanwei.com/calculator',
        'HTTP_SEC_FETCH_SITE' => 'same-origin',
    ];
    if ($contentLength !== null) {
        $server['CONTENT_LENGTH'] = (string) $contentLength;
    }
    return $server;
}

function crossOriginServer(): array
{
    return [
        'REQUEST_METHOD' => 'POST',
        'CONTENT_TYPE' => 'application/json',
        'HTTP_ORIGIN' => 'https://attacker.example',
    ];
}

function newTemporaryDatabase(): array
{
    $dir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'calc-analytics-' . bin2hex(random_bytes(6));
    mkdir($dir, 0700, true);
    $pdo = AnalyticsDatabase::connect(['databasePath' => $dir . DIRECTORY_SEPARATOR . 'analytics.sqlite']);
    AnalyticsDatabase::migrate($pdo, __DIR__ . '/../../analytics-api/schema.sql');

    return [$pdo, $dir];
}

function cleanupDirectory(string $dir): void
{
    if (!is_dir($dir)) {
        return;
    }

    $items = scandir($dir);
    if ($items === false) {
        return;
    }

    foreach ($items as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $path = $dir . DIRECTORY_SEPARATOR . $item;
        if (is_dir($path)) {
            cleanupDirectory($path);
        } else {
            unlink($path);
        }
    }

    rmdir($dir);
}

$failed = 0;
foreach ($tests as $name => $test) {
    try {
        $test();
        fwrite(STDOUT, "PASS {$name}" . PHP_EOL);
    } catch (Throwable $error) {
        $failed++;
        fwrite(STDERR, "FAIL {$name}: {$error->getMessage()}" . PHP_EOL);
    }
}

$passed = count($tests) - $failed;
fwrite(STDOUT, "{$passed} passed, {$failed} failed" . PHP_EOL);
exit($failed === 0 ? 0 : 1);
