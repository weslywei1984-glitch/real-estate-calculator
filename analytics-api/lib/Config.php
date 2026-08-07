<?php
declare(strict_types=1);

final class AnalyticsConfig
{
    private const DEFAULT_PATH = '/etc/real-estate-calculator/analytics.env';

    public static function load(?string $path = null): array
    {
        $configPath = $path ?? self::localOverridePath() ?? self::DEFAULT_PATH;
        $values = parse_ini_file($configPath, false, INI_SCANNER_RAW);
        if ($values === false) {
            throw new RuntimeException('Unable to load analytics configuration.');
        }

        $databasePath = self::requiredString($values, 'database_path');
        $hmacKey = self::requiredString($values, 'hmac_key');
        $allowedOrigin = self::requiredString($values, 'allowed_origin');

        if (!preg_match('/\A[0-9a-f]{64}\z/i', $hmacKey)) {
            throw new RuntimeException('Analytics HMAC key must be a 64-character hexadecimal string.');
        }

        self::assertAllowedOrigin($allowedOrigin);

        return [
            'databasePath' => $databasePath,
            'hmacKey' => $hmacKey,
            'allowedOrigin' => $allowedOrigin,
            'timezone' => new DateTimeZone('Asia/Taipei'),
        ];
    }

    private static function localOverridePath(): ?string
    {
        if (PHP_SAPI !== 'cli') {
            return null;
        }

        $path = getenv('CALC_ANALYTICS_CONFIG');
        return is_string($path) && $path !== '' ? $path : null;
    }

    private static function requiredString(array $values, string $key): string
    {
        $value = $values[$key] ?? null;
        if (!is_string($value) || $value === '') {
            throw new RuntimeException("Missing required analytics configuration value: {$key}.");
        }

        return $value;
    }

    private static function assertAllowedOrigin(string $origin): void
    {
        $parts = parse_url($origin);
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            throw new RuntimeException('Analytics allowed origin must be a valid origin.');
        }

        foreach (['user', 'pass', 'path', 'query', 'fragment'] as $forbiddenPart) {
            if (array_key_exists($forbiddenPart, $parts)) {
                throw new RuntimeException('Analytics allowed origin must not include a path, credentials, query, or fragment.');
            }
        }

        $scheme = strtolower($parts['scheme']);
        if ($scheme === 'https') {
            return;
        }

        $host = strtolower($parts['host']);
        $isLocalHttp = $scheme === 'http'
            && isset($parts['port'])
            && ($host === '127.0.0.1' || $host === 'localhost');
        if (!$isLocalHttp) {
            throw new RuntimeException('Analytics allowed origin must use HTTPS except for explicit local test origins.');
        }
    }
}
