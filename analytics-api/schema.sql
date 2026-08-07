CREATE TABLE IF NOT EXISTS metric_buckets (
    local_date TEXT NOT NULL,
    local_hour INTEGER NOT NULL CHECK (local_hour BETWEEN 0 AND 23),
    event_type TEXT NOT NULL CHECK (event_type IN ('visit', 'completion')),
    calculator TEXT NOT NULL DEFAULT '' CHECK (
        calculator = '' OR calculator IN ('tax', 'buyer', 'loan', 'young')
    ),
    device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
    referrer_domain TEXT NOT NULL CHECK (length(referrer_domain) BETWEEN 1 AND 120),
    count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
    PRIMARY KEY (
        local_date, local_hour, event_type, calculator,
        device_type, referrer_domain
    )
);

CREATE TABLE IF NOT EXISTS visit_dedupe (
    visitor_hash TEXT PRIMARY KEY CHECK (length(visitor_hash) = 64),
    last_counted_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metric_buckets_date
ON metric_buckets (local_date, event_type);

CREATE INDEX IF NOT EXISTS idx_visit_dedupe_updated
ON visit_dedupe (updated_at);
