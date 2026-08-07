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

function allMetricCount(PDO $pdo): int
{
    return (int) $pdo->query('SELECT COALESCE(SUM(count), 0) FROM metric_buckets')->fetchColumn();
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
