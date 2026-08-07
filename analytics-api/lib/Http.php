<?php
declare(strict_types=1);

final class AnalyticsHttpException extends RuntimeException
{
    public function __construct(private readonly int $httpStatus)
    {
        parent::__construct('Invalid analytics event request.');
    }

    public function status(): int
    {
        return $this->httpStatus;
    }
}

final class AnalyticsHttp
{
    private const MAX_BODY_BYTES = 2048;

    public static function parseEvent(array $server, string $rawBody, string $allowedOrigin): array
    {
        self::assertMethod($server);
        self::assertBodyLength($server, $rawBody);
        self::assertJsonContentType($server);
        self::assertSameOrigin($server, $allowedOrigin);

        try {
            $payload = json_decode($rawBody, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new AnalyticsHttpException(400);
        }

        if (!is_array($payload) || array_is_list($payload)) {
            throw new AnalyticsHttpException(400);
        }

        $type = self::requiredString($payload, 'type');
        if ($type === 'visit') {
            self::assertExactKeys($payload, ['type', 'visitorId', 'deviceType', 'referrerDomain']);
            $calculator = '';
            $visitorId = self::visitorId($payload);
        } elseif ($type === 'completion') {
            self::assertExactKeys($payload, ['type', 'calculator', 'deviceType', 'referrerDomain']);
            $calculator = self::calculator($payload);
            $visitorId = '';
        } else {
            throw new AnalyticsHttpException(400);
        }

        return [
            'type' => $type,
            'calculator' => $calculator,
            'visitorId' => $visitorId,
            'deviceType' => self::deviceType($payload),
            'referrerDomain' => self::referrerDomain($payload),
            'skipBot' => self::isBot((string) ($server['HTTP_USER_AGENT'] ?? '')),
        ];
    }

    private static function assertMethod(array $server): void
    {
        if (($server['REQUEST_METHOD'] ?? '') !== 'POST') {
            throw new AnalyticsHttpException(405);
        }
    }

    private static function assertBodyLength(array $server, string $rawBody): void
    {
        if (strlen($rawBody) > self::MAX_BODY_BYTES) {
            throw new AnalyticsHttpException(413);
        }

        if (!array_key_exists('CONTENT_LENGTH', $server)) {
            return;
        }

        $contentLength = $server['CONTENT_LENGTH'];
        if (!is_string($contentLength) && !is_int($contentLength)) {
            throw new AnalyticsHttpException(400);
        }

        $contentLength = (string) $contentLength;
        if ($contentLength === '' || !ctype_digit($contentLength)) {
            throw new AnalyticsHttpException(400);
        }
        if ((int) $contentLength > self::MAX_BODY_BYTES) {
            throw new AnalyticsHttpException(413);
        }
    }

    private static function assertJsonContentType(array $server): void
    {
        $contentType = $server['CONTENT_TYPE'] ?? $server['HTTP_CONTENT_TYPE'] ?? '';
        if (!is_string($contentType) || !preg_match('/\Aapplication\/json(?:\s*;|\s*\z)/i', $contentType)) {
            throw new AnalyticsHttpException(415);
        }
    }

    private static function assertSameOrigin(array $server, string $allowedOrigin): void
    {
        $expectedOrigin = self::origin($allowedOrigin, false);
        if ($expectedOrigin === null) {
            throw new LogicException('Configured analytics origin is invalid.');
        }

        $originPresent = array_key_exists('HTTP_ORIGIN', $server);
        if ($originPresent && self::origin((string) $server['HTTP_ORIGIN'], false) !== $expectedOrigin) {
            throw new AnalyticsHttpException(403);
        }

        $refererPresent = array_key_exists('HTTP_REFERER', $server);
        if ($refererPresent && self::origin((string) $server['HTTP_REFERER'], true) !== $expectedOrigin) {
            throw new AnalyticsHttpException(403);
        }

        if (!$originPresent && !$refererPresent) {
            throw new AnalyticsHttpException(403);
        }

        if (array_key_exists('HTTP_SEC_FETCH_SITE', $server)
            && $server['HTTP_SEC_FETCH_SITE'] !== 'same-origin') {
            throw new AnalyticsHttpException(403);
        }
    }

    private static function origin(string $value, bool $allowPath): ?string
    {
        $parts = parse_url($value);
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            return null;
        }
        if (isset($parts['user'], $parts['pass']) || isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }
        if (!$allowPath && (isset($parts['path']) || isset($parts['query']) || isset($parts['fragment']))) {
            return null;
        }

        $scheme = strtolower((string) $parts['scheme']);
        $host = strtolower((string) $parts['host']);
        if (($scheme !== 'https' && $scheme !== 'http') || $host === '') {
            return null;
        }
        if (isset($parts['port']) && (!is_int($parts['port']) || $parts['port'] < 1 || $parts['port'] > 65535)) {
            return null;
        }

        return $scheme . '://' . $host . (isset($parts['port']) ? ':' . $parts['port'] : '');
    }

    private static function assertExactKeys(array $payload, array $allowedKeys): void
    {
        $keys = array_keys($payload);
        if (array_diff($keys, $allowedKeys) !== [] || array_diff($allowedKeys, $keys) !== []) {
            throw new AnalyticsHttpException(400);
        }
    }

    private static function requiredString(array $payload, string $key): string
    {
        $value = $payload[$key] ?? null;
        if (!is_string($value) || $value === '') {
            throw new AnalyticsHttpException(400);
        }

        return $value;
    }

    private static function visitorId(array $payload): string
    {
        $visitorId = self::requiredString($payload, 'visitorId');
        if (!preg_match('/\A[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\z/i', $visitorId)) {
            throw new AnalyticsHttpException(400);
        }

        return $visitorId;
    }

    private static function calculator(array $payload): string
    {
        $calculator = self::requiredString($payload, 'calculator');
        if (!in_array($calculator, ['tax', 'buyer', 'loan', 'young'], true)) {
            throw new AnalyticsHttpException(400);
        }

        return $calculator;
    }

    private static function deviceType(array $payload): string
    {
        $deviceType = self::requiredString($payload, 'deviceType');
        if (!in_array($deviceType, ['mobile', 'desktop'], true)) {
            throw new AnalyticsHttpException(400);
        }

        return $deviceType;
    }

    private static function referrerDomain(array $payload): string
    {
        $domain = strtolower(self::requiredString($payload, 'referrerDomain'));
        if (str_starts_with($domain, 'www.')) {
            $domain = substr($domain, 4);
        }
        if ($domain === 'direct' || $domain === 'internal') {
            return $domain;
        }
        if (strlen($domain) > 120 || !self::isHostname($domain)) {
            throw new AnalyticsHttpException(400);
        }

        return $domain;
    }

    private static function isHostname(string $value): bool
    {
        if ($value === '' || strlen($value) > 120 || strlen($value) > 253) {
            return false;
        }
        foreach (explode('.', $value) as $label) {
            if ($label === '' || strlen($label) > 63 || !preg_match('/\A[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\z/', $label)) {
                return false;
            }
        }

        return true;
    }

    private static function isBot(string $userAgent): bool
    {
        return preg_match('/bot|crawler|spider|slurp|preview|headless/i', $userAgent) === 1;
    }
}
