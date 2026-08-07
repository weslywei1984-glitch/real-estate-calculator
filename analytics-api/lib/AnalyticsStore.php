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

    public function summary(string $range, DateTimeImmutable $now): array
    {
        $localNow = $now->setTimezone($this->timezone);
        $endDate = $localNow->format('Y-m-d');
        $startDate = match ($range) {
            'today' => $endDate,
            '7d' => $localNow->modify('-6 days')->format('Y-m-d'),
            '30d' => $localNow->modify('-29 days')->format('Y-m-d'),
            'all' => null,
            default => throw new InvalidArgumentException('Unsupported analytics summary range.'),
        };
        [$where, $parameters] = $this->summaryFilter($startDate, $endDate);

        $totalsByType = $this->countsByEventType($where, $parameters);
        $visits = $totalsByType['visit'] ?? 0;
        $completions = $totalsByType['completion'] ?? 0;

        return [
            'generatedAt' => $now->setTimezone($this->timezone)->format(DATE_ATOM),
            'range' => $range,
            'period' => [
                'startDate' => $startDate,
                'endDate' => $endDate,
            ],
            'totals' => [
                'visits' => $visits,
                'completions' => $completions,
                'completionsPer100Visits' => $this->percentage($completions, $visits),
            ],
            'calculators' => $this->calculatorSummary($where, $parameters, $completions),
            'trend' => $this->trendSummary($where, $parameters, $startDate, $endDate),
            'devices' => $this->deviceSummary($where, $parameters, $visits),
            'referrers' => $this->referrerSummary($where, $parameters, $visits),
            'hours' => $this->hourSummary($where, $parameters),
        ];
    }

    private function summaryFilter(?string $startDate, string $endDate): array
    {
        if ($startDate === null) {
            return ['WHERE local_date <= :end_date', [':end_date' => $endDate]];
        }

        return [
            'WHERE local_date >= :start_date AND local_date <= :end_date',
            [':start_date' => $startDate, ':end_date' => $endDate],
        ];
    }

    private function countsByEventType(string $where, array $parameters): array
    {
        $rows = $this->selectAll(
            "SELECT event_type, SUM(count) AS total FROM metric_buckets {$where} GROUP BY event_type",
            $parameters
        );
        $counts = [];
        foreach ($rows as $row) {
            $counts[(string) $row['event_type']] = (int) $row['total'];
        }
        return $counts;
    }

    private function calculatorSummary(string $where, array $parameters, int $totalCompletions): array
    {
        $rows = $this->selectAll(
            "SELECT calculator, SUM(count) AS total FROM metric_buckets {$where}
             AND event_type = :event_type GROUP BY calculator",
            array_merge($parameters, [':event_type' => 'completion'])
        );
        $counts = $this->indexedCounts($rows, 'calculator');
        $calculators = [];
        foreach (['tax', 'buyer', 'loan', 'young'] as $calculator) {
            $count = $counts[$calculator] ?? 0;
            $calculators[] = [
                'key' => $calculator,
                'completions' => $count,
                'share' => $this->percentage($count, $totalCompletions),
            ];
        }
        return $calculators;
    }

    private function trendSummary(
        string $where,
        array $parameters,
        ?string $startDate,
        string $endDate
    ): array {
        if ($startDate === null) {
            $firstDate = $this->selectValue("SELECT MIN(local_date) FROM metric_buckets {$where}", $parameters);
            if ($firstDate === null) {
                return [];
            }
            $startDate = $firstDate;
        }

        $rows = $this->selectAll(
            "SELECT local_date, event_type, SUM(count) AS total FROM metric_buckets {$where}
             GROUP BY local_date, event_type",
            $parameters
        );
        $counts = [];
        foreach ($rows as $row) {
            $date = (string) $row['local_date'];
            $counts[$date][(string) $row['event_type']] = (int) $row['total'];
        }

        $trend = [];
        $date = new DateTimeImmutable($startDate, $this->timezone);
        $lastDate = new DateTimeImmutable($endDate, $this->timezone);
        while ($date <= $lastDate) {
            $dateKey = $date->format('Y-m-d');
            $trend[] = [
                'date' => $dateKey,
                'visits' => $counts[$dateKey]['visit'] ?? 0,
                'completions' => $counts[$dateKey]['completion'] ?? 0,
            ];
            $date = $date->modify('+1 day');
        }
        return $trend;
    }

    private function deviceSummary(string $where, array $parameters, int $totalVisits): array
    {
        $rows = $this->selectAll(
            "SELECT device_type, SUM(count) AS total FROM metric_buckets {$where}
             AND event_type = :event_type GROUP BY device_type",
            array_merge($parameters, [':event_type' => 'visit'])
        );
        $counts = $this->indexedCounts($rows, 'device_type');
        $devices = [];
        foreach (['mobile', 'desktop'] as $device) {
            $count = $counts[$device] ?? 0;
            $devices[] = [
                'key' => $device,
                'visits' => $count,
                'share' => $this->percentage($count, $totalVisits),
            ];
        }
        return $devices;
    }

    private function referrerSummary(string $where, array $parameters, int $totalVisits): array
    {
        $rows = $this->selectAll(
            "SELECT referrer_domain, SUM(count) AS total FROM metric_buckets {$where}
             AND event_type = :event_type
             GROUP BY referrer_domain
             ORDER BY total DESC, referrer_domain ASC
             LIMIT 10",
            array_merge($parameters, [':event_type' => 'visit'])
        );
        $referrers = [];
        foreach ($rows as $row) {
            $count = (int) $row['total'];
            $referrers[] = [
                'domain' => (string) $row['referrer_domain'],
                'visits' => $count,
                'share' => $this->percentage($count, $totalVisits),
            ];
        }
        return $referrers;
    }

    private function hourSummary(string $where, array $parameters): array
    {
        $rows = $this->selectAll(
            "SELECT local_hour, SUM(count) AS total FROM metric_buckets {$where}
             AND event_type = :event_type GROUP BY local_hour",
            array_merge($parameters, [':event_type' => 'visit'])
        );
        $counts = $this->indexedCounts($rows, 'local_hour');
        $hours = [];
        for ($hour = 0; $hour < 24; $hour++) {
            $hours[] = ['hour' => $hour, 'visits' => $counts[(string) $hour] ?? 0];
        }
        return $hours;
    }

    private function indexedCounts(array $rows, string $key): array
    {
        $counts = [];
        foreach ($rows as $row) {
            $counts[(string) $row[$key]] = (int) $row['total'];
        }
        return $counts;
    }

    private function selectAll(string $sql, array $parameters): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($parameters);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    private function selectValue(string $sql, array $parameters): ?string
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($parameters);
        $value = $statement->fetchColumn();
        return $value === false || $value === null ? null : (string) $value;
    }

    private function percentage(int $count, int $total): ?float
    {
        if ($total === 0) {
            return null;
        }
        return round($count / $total * 100, 1);
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
