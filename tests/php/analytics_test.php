<?php
declare(strict_types=1);

require_once __DIR__ . '/../../analytics-api/lib/Config.php';
require_once __DIR__ . '/../../analytics-api/lib/Database.php';

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

function assertThrows(callable $callback): void
{
    try {
        $callback();
    } catch (Throwable) {
        return;
    }

    throw new RuntimeException('Expected callback to throw');
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
