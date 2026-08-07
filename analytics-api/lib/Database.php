<?php
declare(strict_types=1);

final class AnalyticsDatabase
{
    public static function connect(array $config): PDO
    {
        $databasePath = $config['databasePath'] ?? null;
        if (!is_string($databasePath) || $databasePath === '') {
            throw new InvalidArgumentException('Analytics databasePath is required.');
        }

        $pdo = new PDO('sqlite:' . $databasePath, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
        $pdo->exec('PRAGMA busy_timeout = 5000');

        return $pdo;
    }

    public static function migrate(PDO $pdo, string $schemaPath): void
    {
        $schema = file_get_contents($schemaPath);
        if ($schema === false) {
            throw new RuntimeException('Unable to read analytics schema.');
        }

        $pdo->beginTransaction();
        try {
            $pdo->exec($schema);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    }
}
