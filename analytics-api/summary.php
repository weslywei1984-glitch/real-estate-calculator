<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/Config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/AnalyticsStore.php';
require_once __DIR__ . '/lib/Http.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

try {
    $config = AnalyticsConfig::load();
    $range = AnalyticsHttp::parseSummaryRange($_SERVER, $_GET);
    $store = new AnalyticsStore(
        AnalyticsDatabase::connect($config),
        $config['hmacKey'],
        $config['timezone']
    );
    echo json_encode(
        $store->summary($range, new DateTimeImmutable('now')),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
    );
} catch (AnalyticsHttpException $error) {
    http_response_code($error->status());
} catch (Throwable $error) {
    error_log('Analytics summary failure: ' . $error->getMessage());
    http_response_code(500);
}
