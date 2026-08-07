<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit(1);
}

require_once __DIR__ . '/lib/Config.php';
require_once __DIR__ . '/lib/Database.php';

try {
    $config = AnalyticsConfig::load();
    $pdo = AnalyticsDatabase::connect($config);
    AnalyticsDatabase::migrate($pdo, __DIR__ . '/schema.sql');
    fwrite(STDOUT, "Analytics schema migrated.\n");
    exit(0);
} catch (Throwable $error) {
    fwrite(STDERR, "Analytics migration failed: {$error->getMessage()}\n");
    exit(1);
}
