<?php
declare(strict_types=1);

// Local PHP built-in-server router for analytics verification only; production uses Nginx.
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
