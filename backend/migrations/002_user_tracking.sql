ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS assets_status_updated_idx
    ON assets (status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS watchlist_user_asset_unique
    ON watchlist (user_id, asset_id);

ALTER TABLE price_alerts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS price_alert_events (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price NUMERIC(14, 2) NOT NULL,
    previous_price NUMERIC(14, 2),
    notification_status VARCHAR(20) NOT NULL DEFAULT 'not_configured',
    notification_sent_at TIMESTAMP,
    notification_error TEXT,
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (alert_id, price)
);

ALTER TABLE price_alert_events
    ADD COLUMN IF NOT EXISTS previous_price NUMERIC(14, 2),
    ADD COLUMN IF NOT EXISTS notification_status VARCHAR(20) NOT NULL DEFAULT 'not_configured',
    ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS notification_error TEXT;

INSERT INTO schema_migrations (version)
VALUES ('002_user_tracking')
ON CONFLICT (version) DO NOTHING;
