import pool from "../config/db.js";
import { luxuryCatalog } from "./luxuryCatalog.js";

const catalogKeyFor = (asset) =>
    `luxtrack-${String(asset.id).padStart(3, "0")}`;

const verifyRequiredTables = async (client) => {
    const result = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('assets', 'categories', 'price_history')
    `);
    const tables = new Set(result.rows.map((row) => row.table_name));
    const missing = ["assets", "categories", "price_history"]
        .filter((table) => !tables.has(table));

    if (missing.length > 0) {
        throw new Error(
            `Required tables are missing: ${missing.join(", ")}. Run npm run migrate first.`
        );
    }

    const columnResult = await client.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'assets'
          AND column_name = 'catalog_key'
    `);

    if (columnResult.rows.length === 0) {
        throw new Error("assets.catalog_key is missing. Run npm run migrate first.");
    }
};

const upsertCategory = async (client, categoryName) => {
    const result = await client.query(
        `
        INSERT INTO categories (name)
        VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
        `,
        [categoryName]
    );

    return result.rows[0].id;
};

export const seedCatalog = async () => {
    const client = await pool.connect();
    const summary = {
        existing: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: luxuryCatalog.length
    };

    try {
        await client.query("BEGIN");
        await verifyRequiredTables(client);

        const categoryIds = new Map();
        for (const categoryName of new Set(luxuryCatalog.map((asset) => asset.category))) {
            categoryIds.set(
                categoryName,
                await upsertCategory(client, categoryName)
            );
        }

        for (const asset of luxuryCatalog) {
            const catalogKey = catalogKeyFor(asset);
            const existing = await client.query(
                "SELECT id FROM assets WHERE catalog_key = $1",
                [catalogKey]
            );
            const categoryId = categoryIds.get(asset.category);

            if (existing.rows.length > 0) {
                summary.existing += 1;
            }

            await client.query(
                `
                INSERT INTO assets (
                    id, catalog_key, name, brand, model, description, image_url,
                    release_year, condition, rarity, current_price, currency,
                    category_id, price_source, price_type, last_price_update,
                    created_at, updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13, $14, $15, $16, COALESCE($17, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    brand = EXCLUDED.brand,
                    model = EXCLUDED.model,
                    description = EXCLUDED.description,
                    image_url = EXCLUDED.image_url,
                    release_year = EXCLUDED.release_year,
                    condition = EXCLUDED.condition,
                    rarity = EXCLUDED.rarity,
                    current_price = EXCLUDED.current_price,
                    currency = EXCLUDED.currency,
                    category_id = EXCLUDED.category_id,
                    price_source = EXCLUDED.price_source,
                    price_type = EXCLUDED.price_type,
                    last_price_update = EXCLUDED.last_price_update,
                    updated_at = CURRENT_TIMESTAMP
                `,
                [
                    Number(asset.id),
                    catalogKey,
                    asset.name,
                    asset.brand,
                    asset.model || null,
                    asset.description || null,
                    asset.image_url || null,
                    asset.release_year || null,
                    asset.condition || null,
                    asset.rarity || null,
                    Number(asset.current_price),
                    asset.currency || "INR",
                    categoryId,
                    asset.price_source || null,
                    asset.price_type || "market_reference",
                    asset.last_price_update
                        ? new Date(asset.last_price_update)
                        : null,
                    asset.last_price_update
                        ? new Date(asset.last_price_update)
                        : null
                ]
            );

            if (existing.rows.length > 0) {
                summary.updated += 1;
            } else {
                summary.inserted += 1;
            }

            const historyDate = asset.last_price_update
                ? new Date(asset.last_price_update)
                : new Date("2026-01-01T00:00:00.000Z");

            const historyResult = await client.query(
                `
                INSERT INTO price_history (
                    asset_id, price, currency, source, recorded_at
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT DO NOTHING
                RETURNING id;
                `,
                [
                    Number(asset.id),
                    Number(asset.current_price),
                    asset.currency || "INR",
                    asset.price_source || "Market Reference",
                    historyDate
                ]
            );

            if (historyResult.rows.length === 0) {
                summary.skipped += 1;
            }
        }

        await client.query(`
            SELECT setval(
                pg_get_serial_sequence('assets', 'id'),
                GREATEST((SELECT COALESCE(MAX(id), 1) FROM assets), 1),
                true
            )
        `);
        await client.query("COMMIT");

        return summary;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
