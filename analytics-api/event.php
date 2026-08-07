<?php
declare(strict_types=1);

require_once __DIR__ . '/lib/Config.php';
require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/AnalyticsStore.php';
require_once __DIR__ . '/lib/Http.php';

try {
    $config = AnalyticsConfig::load();
    $event = AnalyticsHttp::parseEvent($_SERVER, file_get_contents('php://input') ?: '', $config['allowedOrigin']);
    if (!$event['skipBot']) {
        $store = new AnalyticsStore(
            AnalyticsDatabase::connect($config),
            $config['hmacKey'],
            $config['timezone']
        );
        $store->record($event, new DateTimeImmutable('now'));
    }

    header('Cache-Control: no-store');
    http_response_code(204);
} catch (AnalyticsHttpException $error) {
    header('Cache-Control: no-store');
    http_response_code($error->status());
} catch (Throwable $error) {
    error_log('Analytics event failure: ' . $error->getMessage());
    header('Cache-Control: no-store');
    http_response_code(500);
}
