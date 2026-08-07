<?php
declare(strict_types=1);

final class AnalyticsStore
{
    private const VISIT_DEDUPE_SECONDS = 21600;
    private const VISIT_RETENTION_SECONDS = 172800;

    public function __construct(
        private readonly PDO $pdo,
        private readonly string $hmacKey,
        private readonly DateTimeZone $timezone
    ) {
    }

    public function record(array $event, DateTimeImmutable $now): bool
    {
        $localNow = $now->setTimezone($this->timezone);
        $timestamp = $now->getTimestamp();
        $transactionStarted = false;

        try {
            $this->pdo->exec('BEGIN IMMEDIATE');
            $transactionStarted = true;

            $this->deleteExpiredVisits($timestamp);
            if ($event['type'] === 'visit') {
                $counted = $this->recordVisit($event, $timestamp, $localNow);
            } else {
                $this->incrementBucket($event, $localNow);
                $counted = true;
            }

            $this->pdo->exec('COMMIT');
            return $counted;
        } catch (Throwable $error) {
            if ($transactionStarted) {
                try {
                    $this->pdo->exec('ROLLBACK');
                } catch (Throwable) {
                }
            }
            throw $error;
        }
    }

    private function deleteExpiredVisits(int $timestamp): void
    {
        $statement = $this->pdo->prepare('DELETE FROM visit_dedupe WHERE updated_at < :expires_at');
        $statement->execute([':expires_at' => $timestamp - self::VISIT_RETENTION_SECONDS]);
    }

    private function recordVisit(array $event, int $timestamp, DateTimeImmutable $localNow): bool
    {
        $visitorHash = hash_hmac('sha256', (string) $event['visitorId'], $this->hmacKey);
        $lastCountedStatement = $this->pdo->prepare(
            'SELECT last_counted_at FROM visit_dedupe WHERE visitor_hash = :visitor_hash'
        );
        $lastCountedStatement->execute([':visitor_hash' => $visitorHash]);
        $lastCountedAt = $lastCountedStatement->fetchColumn();

        if ($lastCountedAt !== false && $timestamp - (int) $lastCountedAt < self::VISIT_DEDUPE_SECONDS) {
            $statement = $this->pdo->prepare(
                'UPDATE visit_dedupe SET updated_at = :updated_at WHERE visitor_hash = :visitor_hash'
            );
            $statement->execute([
                ':updated_at' => $timestamp,
                ':visitor_hash' => $visitorHash,
            ]);
            return false;
        }

        $this->incrementBucket($event, $localNow);
        $statement = $this->pdo->prepare(
            'INSERT INTO visit_dedupe (visitor_hash, last_counted_at, updated_at)
             VALUES (:visitor_hash, :last_counted_at, :updated_at)
             ON CONFLICT(visitor_hash) DO UPDATE SET
                last_counted_at = excluded.last_counted_at,
                updated_at = excluded.updated_at'
        );
        $statement->execute([
            ':visitor_hash' => $visitorHash,
            ':last_counted_at' => $timestamp,
            ':updated_at' => $timestamp,
        ]);

        return true;
    }

    private function incrementBucket(array $event, DateTimeImmutable $localNow): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO metric_buckets (
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
            DO UPDATE SET count = count + 1'
        );
        $statement->execute([
            ':local_date' => $localNow->format('Y-m-d'),
            ':local_hour' => (int) $localNow->format('G'),
            ':event_type' => $event['type'],
            ':calculator' => $event['calculator'],
            ':device_type' => $event['deviceType'],
            ':referrer_domain' => $event['referrerDomain'],
        ]);
    }
}
