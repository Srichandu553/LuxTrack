CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    description TEXT,
    image_url TEXT,
    release_year INTEGER,
    condition VARCHAR(100),
    rarity VARCHAR(100),
    current_price NUMERIC(14, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price_source VARCHAR(255),
    price_type VARCHAR(100),
    last_price_update TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    price NUMERIC(14, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    source VARCHAR(255),
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
    ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS google_subject VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_subject_unique
    ON users (google_subject)
    WHERE google_subject IS NOT NULL;

ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS catalog_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS assets_catalog_key_unique
    ON assets (catalog_key)
    WHERE catalog_key IS NOT NULL;

UPDATE assets
SET catalog_key = 'luxtrack-' || LPAD(id::text, 3, '0')
WHERE catalog_key IS NULL
  AND id BETWEEN 1 AND 50;

CREATE UNIQUE INDEX IF NOT EXISTS price_history_event_unique
    ON price_history (
        asset_id,
        price,
        currency,
        COALESCE(source, ''),
        recorded_at
    );

INSERT INTO schema_migrations (version)
VALUES ('001_production_catalog')
ON CONFLICT (version) DO NOTHING;
