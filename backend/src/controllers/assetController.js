import pool from "../config/db.js";
import { calculateFairPrice } from "../utils/calculateFairPrice.js";
import { generateAIAssetAnalysis } from "../services/groqService.js";
import {
    getFallbackAssetById,
    getFallbackAssets
} from "../data/luxuryCatalog.js";
import { seedCatalog } from "../data/catalogSeed.js";

const normalizeAssetName = (value) => String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const getMatchingCatalogAsset = (asset) => {
    const assetName = normalizeAssetName(asset.name);
    const assetBrand = normalizeAssetName(asset.brand);
    const assetNameTokens = new Set(
        assetName.split(" ").filter((token) => token.length > 2)
    );

    return getFallbackAssets().find((catalogAsset) =>
        normalizeAssetName(catalogAsset.brand) === assetBrand &&
        (
            normalizeAssetName(catalogAsset.name) === assetName ||
            normalizeAssetName(catalogAsset.name)
                .split(" ")
                .some((token) => assetNameTokens.has(token) && token.length > 2)
        )
    );
};

/*
|--------------------------------------------------------------------------
| GET ALL ASSETS
|--------------------------------------------------------------------------
*/
export const getAssets = async (req, res) => {
    try {
        const {
            search = "",
            category,
            brand,
            condition,
            rarity,
            minPrice,
            maxPrice,
            sort = "newest",
            page = "1",
            limit = "24"
        } = req.query;
        const pageNumber = Math.max(1, Math.min(10000, Number.parseInt(page, 10) || 1));
        const pageSize = Math.max(1, Math.min(100, Number.parseInt(limit, 10) || 24));
        const values = [];
        const where = ["a.status = 'ACTIVE'"];
        const add = (value) => { values.push(value); return `$${values.length}`; };
        if (search.trim()) {
            const param = add(`%${search.trim()}%`);
            where.push(`(a.name ILIKE ${param} OR a.brand ILIKE ${param} OR COALESCE(a.model, '') ILIKE ${param} OR c.name ILIKE ${param})`);
        }
        if (category) where.push(`c.name = ${add(category)}`);
        if (brand) where.push(`a.brand = ${add(brand)}`);
        if (condition) where.push(`a.condition = ${add(condition)}`);
        if (rarity) where.push(`a.rarity = ${add(rarity)}`);
        if (Number.isFinite(Number(minPrice))) where.push(`a.current_price >= ${add(Number(minPrice))}`);
        if (Number.isFinite(Number(maxPrice))) where.push(`a.current_price <= ${add(Number(maxPrice))}`);
        const orderBy = {
            "price-asc": "a.current_price ASC NULLS LAST",
            "price-desc": "a.current_price DESC NULLS LAST",
            "updated": "a.updated_at DESC",
            newest: "a.created_at DESC",
            name: "a.name ASC"
        }[sort] || "a.created_at DESC";
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total FROM assets a JOIN categories c ON c.id = a.category_id WHERE ${where.join(" AND ")}`,
            values
        );
        const total = countResult.rows[0].total;
        const offset = (pageNumber - 1) * pageSize;
        const limitParam = add(pageSize);
        const offsetParam = add(offset);

        const result = await pool.query(`
            SELECT
                a.id,
                a.name,
                a.brand,
                a.model,
                a.description,
                a.image_url,
                a.release_year,
                a.condition,
                a.rarity,
                a.current_price,
                a.currency,
                a.price_source,
                a.price_type,
                a.last_price_update,
                a.category_id,
                c.name AS category
            FROM assets a
            JOIN categories c
                ON a.category_id = c.id
            WHERE ${where.join(" AND ")}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam};
        `, values);

        const fallbackAssets = getFallbackAssets();
        const databaseAssetIds = new Set(
            result.rows.map((asset) => Number(asset.id))
        );
        const shouldMergeFallbackCatalog = Object.keys(req.query).length === 0;
        const missingCatalogAssets = shouldMergeFallbackCatalog
            ? fallbackAssets.filter((asset) => !databaseAssetIds.has(Number(asset.id)))
            : [];
        const databaseAssets = result.rows.map((asset) => {
            const catalogMatch = getMatchingCatalogAsset(asset);

            return catalogMatch
                ? {
                    ...asset,
                    image_url: catalogMatch.image_url,
                    description: asset.description || catalogMatch.description
                }
                : asset;
        });
        const assets = [
            ...databaseAssets,
            ...missingCatalogAssets
        ];

        res.status(200).json({
            success: true,
            count: total,
            assets,
            pagination: { page: pageNumber, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
            ...(missingCatalogAssets.length > 0
                ? { source: "database-plus-fallback-catalog" }
                : {})
        });

    } catch (error) {

        console.error(
            "Get Assets Error:",
            error
        );

        const fallbackAssets = getFallbackAssets();

        res.status(200).json({
            success: true,
            count: fallbackAssets.length,
            assets: fallbackAssets,
            source: "fallback-catalog",
            warning: "Database unavailable; serving catalog fallback"
        });
    }
};

export const getArchivedAssets = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT a.id, a.name, a.brand, a.model, a.description, a.image_url,
                   a.current_price, a.currency, a.condition, a.rarity,
                   a.category_id, c.name AS category, a.archived_at, a.updated_at
            FROM assets a
            JOIN categories c ON c.id = a.category_id
            WHERE a.status = 'ARCHIVED'
            ORDER BY a.archived_at DESC NULLS LAST, a.id DESC
        `);
        return res.json({ success: true, count: result.rows.length, assets: result.rows });
    } catch (error) {
        console.error("Get archived assets error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to load archived products" });
    }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE ASSET
|--------------------------------------------------------------------------
*/
export const getAssetById = async (req, res) => {

    try {

        const { id } = req.params;

        /*
         * Get asset details
         */
        const assetResult = await pool.query(
            `
            SELECT
                a.id,
                a.name,
                a.brand,
                a.model,
                a.description,
                a.image_url,
                a.release_year,
                a.condition,
                a.rarity,
                a.current_price,
                a.currency,
                a.price_source,
                a.price_type,
                a.last_price_update,
                a.category_id,
                c.name AS category
            FROM assets a
            JOIN categories c
                ON a.category_id = c.id
            WHERE a.id = $1;
            `,
            [id]
        );

        if (assetResult.rows.length === 0) {
            const fallbackAsset = getFallbackAssetById(id);

            if (!fallbackAsset) {
                return res.status(404).json({
                    success: false,
                    message: "Asset not found"
                });
            }

            return res.status(200).json({
                success: true,
                asset: {
                    ...fallbackAsset,
                    category_id: fallbackAsset.category_id ?? 1,
                    price_history: fallbackAsset.price_history || []
                },
                source: "fallback-catalog"
            });
        }


        /*
         * Get price history
         */
        const historyResult = await pool.query(
            `
            SELECT
                id,
                price,
                currency,
                source,
                recorded_at
            FROM price_history
            WHERE asset_id = $1
            ORDER BY recorded_at ASC;
            `,
            [id]
        );


        const catalogAsset = getMatchingCatalogAsset(assetResult.rows[0]);
        const asset = {
            ...assetResult.rows[0],
            ...(catalogAsset
                ? {
                    image_url: catalogAsset.image_url,
                    description: assetResult.rows[0].description || catalogAsset.description
                }
                : {}),
            price_history: historyResult.rows.length > 0
                ? historyResult.rows
                : (getFallbackAssetById(id)?.price_history || [])
        };


        res.status(200).json({
            success: true,
            asset
        });

    } catch (error) {

        console.error(
            "Get Asset By ID Error:",
            error
        );

        const fallbackAsset = getFallbackAssetById(req.params.id);

        if (fallbackAsset) {
            return res.status(200).json({
                success: true,
                asset: {
                    ...fallbackAsset,
                    category_id: fallbackAsset.category_id ?? 1,
                    price_history: fallbackAsset.price_history || []
                },
                source: "fallback-catalog",
                warning: "Database unavailable; serving catalog fallback"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to fetch asset"
        });
    }
};


/*
|--------------------------------------------------------------------------
| CREATE ASSET
|--------------------------------------------------------------------------
*/
export const createAsset = async (req, res) => {

    try {

        const {
            name,
            brand,
            model,
            description = null,
            image_url = null,
            release_year = null,
            condition = "Excellent",
            rarity = "Medium",
            current_price,
            currency = "INR",
            category_id,
            price_source = null,
            price_type = "market",
        } = req.body;


        /*
         * Required fields
         */
        if (
            !name ||
            !brand ||
            !current_price ||
            !category_id
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "name, brand, current_price and category_id are required"
            });
        }

        const duplicate = await pool.query(
            `SELECT id FROM assets
             WHERE LOWER(name) = LOWER($1)
               AND LOWER(brand) = LOWER($2)
               AND COALESCE(LOWER(model), '') = COALESCE(LOWER($3), '')
               AND status = 'ACTIVE'
             LIMIT 1`,
            [name, brand, model || null]
        );
        if (duplicate.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This product already exists."
            });
        }


        /*
         * Validate price
         */
        const price = Number(current_price);

        if (
            !Number.isFinite(price) ||
            price <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "current_price must be a valid positive number"
            });
        }


        /*
         * Validate category
         */
        const categoryResult = await pool.query(
            `
            SELECT id, name
            FROM categories
            WHERE id = $1;
            `,
            [category_id]
        );

        if (categoryResult.rows.length === 0) {

            return res.status(400).json({
                success: false,
                message: "Invalid category_id"
            });
        }


        /*
         * Insert asset
         */
        const result = await pool.query(
            `
            INSERT INTO assets
            (
                name,
                brand,
                model,
                description,
                image_url,
                release_year,
                condition,
                rarity,
                current_price,
                currency,
                category_id,
                price_source,
                price_type,
                last_price_update,
                created_at,
                updated_at
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING *;
            `,
            [
                name,
                brand,
                model,
                description,
                image_url,
                release_year,
                condition,
                rarity,
                price,
                currency,
                category_id,
                price_source,
                price_type
            ]
        );


        res.status(201).json({
            success: true,
            message: "Asset created successfully",
            asset: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Create Asset Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to create asset"
        });
    }
};


/*
|--------------------------------------------------------------------------
| UPDATE ASSET
|--------------------------------------------------------------------------
*/
export const updateAsset = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            name,
            brand,
            model,
            description,
            image_url,
            release_year,
            condition,
            rarity,
            current_price,
            currency,
            category_id,
            price_source,
            price_type
        } = req.body;


        /*
         * Check asset exists
         */
        const existingAsset = await pool.query(
            `
            SELECT id
            FROM assets
            WHERE id = $1;
            `,
            [id]
        );

        if (existingAsset.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Asset not found"
            });
        }

        if (name !== undefined || brand !== undefined || model !== undefined) {
            const duplicate = await pool.query(
                `SELECT id FROM assets
                 WHERE LOWER(name) = LOWER(COALESCE($1, name))
                   AND LOWER(brand) = LOWER(COALESCE($2, brand))
                   AND COALESCE(LOWER(model), '') = COALESCE(LOWER($3), COALESCE(LOWER(model), ''))
                   AND id <> $4 AND status = 'ACTIVE'
                 LIMIT 1`,
                [name, brand, model, id]
            );
            if (duplicate.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "This product already exists."
                });
            }
        }


        /*
         * Validate price if supplied
         */
        if (current_price !== undefined) {

            const price = Number(current_price);

            if (
                !Number.isFinite(price) ||
                price <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "current_price must be a valid positive number"
                });
            }
        }


        /*
         * Validate category if supplied
         */
        if (category_id !== undefined) {

            const categoryResult = await pool.query(
                `
                SELECT id
                FROM categories
                WHERE id = $1;
                `,
                [category_id]
            );

            if (categoryResult.rows.length === 0) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid category_id"
                });
            }
        }


        /*
         * Update asset
         *
         * COALESCE keeps the old value when
         * a field is not provided.
         */
        const result = await pool.query(
            `
            UPDATE assets
            SET
                name = COALESCE($1, name),
                brand = COALESCE($2, brand),
                model = COALESCE($3, model),
                description = COALESCE($4, description),
                image_url = COALESCE($5, image_url),
                release_year = COALESCE($6, release_year),
                condition = COALESCE($7, condition),
                rarity = COALESCE($8, rarity),
                current_price = COALESCE($9, current_price),
                currency = COALESCE($10, currency),
                category_id = COALESCE($11, category_id),
                price_source = COALESCE($12, price_source),
                price_type = COALESCE($13, price_type),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $14
            RETURNING *;
            `,
            [
                name,
                brand,
                model,
                description,
                image_url,
                release_year,
                condition,
                rarity,
                current_price !== undefined
                    ? Number(current_price)
                    : null,
                currency,
                category_id,
                price_source,
                price_type,
                id
            ]
        );


        res.status(200).json({
            success: true,
            message: "Asset updated successfully",
            asset: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Update Asset Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update asset"
        });
    }
};


/*
|--------------------------------------------------------------------------
| DELETE ASSET
|--------------------------------------------------------------------------
*/
export const deleteAsset = async (req, res) => {

    try {

        const { id } = req.params;


        /*
         * Check asset exists
         */
        const existingAsset = await pool.query(
            `
            SELECT
                id,
                name
            FROM assets
            WHERE id = $1;
            `,
            [id]
        );

        if (existingAsset.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Asset not found"
            });
        }


        /*
         * Delete asset
         *
         * Related price_history and
         * price_reviews rows will be
         * removed because their foreign
         * keys use ON DELETE CASCADE.
         */
        await pool.query(
            `UPDATE assets
             SET status = 'ARCHIVED', archived_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1;`,
            [id]
        );


        res.status(200).json({
            success: true,
            message: "Asset archived successfully",
            assetId: Number(id),
            asset: existingAsset.rows[0].name
        });

    } catch (error) {

        console.error(
            "Delete Asset Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete asset"
        });
    }
};

export const restoreAsset = async (req, res) => {
    const result = await pool.query(
        `UPDATE assets
         SET status = 'ACTIVE', archived_at = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [req.params.id]
    );
    if (!result.rows[0]) {
        return res.status(404).json({ success: false, message: "Asset not found" });
    }
    return res.json({ success: true, message: "Asset restored successfully", asset: result.rows[0] });
};


/*
|--------------------------------------------------------------------------
| GET AI ASSET VALUATION & PRICE ANALYSIS
|--------------------------------------------------------------------------
*/
export const getAssetAIAnalysis = async (req, res) => {
    try {
        const { id } = req.params;

        const assetResult = await pool.query(
            `
            SELECT
                a.id,
                a.name,
                a.brand,
                a.model,
                a.description,
                a.image_url,
                a.release_year,
                a.condition,
                a.rarity,
                a.current_price,
                a.currency,
                a.price_source,
                a.price_type,
                a.last_price_update,
                a.category_id,
                c.name AS category
            FROM assets a
            JOIN categories c
                ON a.category_id = c.id
            WHERE a.id = $1;
            `,
            [id]
        );

        if (assetResult.rows.length === 0) {
            const fallbackAsset = getFallbackAssetById(id);

            if (!fallbackAsset) {
                return res.status(404).json({
                    success: false,
                    message: "Asset not found"
                });
            }

            const valuation = calculateFairPrice({
                currentPrice: fallbackAsset.current_price,
                condition: fallbackAsset.condition,
                rarity: fallbackAsset.rarity,
                priceHistory: fallbackAsset.price_history,
                category: fallbackAsset.category
            });
            const aiAnalysis = await generateAIAssetAnalysis({
                asset: fallbackAsset,
                valuation
            });

            return res.status(200).json({
                success: true,
                assetId: Number(id),
                asset: fallbackAsset.name,
                valuation,
                ai: aiAnalysis,
                timestamp: new Date().toISOString(),
                source: "fallback-catalog"
            });
        }

        const asset = assetResult.rows[0];

        const historyResult = await pool.query(
            `
            SELECT id, price, currency, source, recorded_at
            FROM price_history
            WHERE asset_id = $1
            ORDER BY recorded_at ASC;
            `,
            [id]
        );

        const history = historyResult.rows.length > 0
            ? historyResult.rows
            : (getFallbackAssetById(id)?.price_history || []);

        // 1. Calculate statistical fair price and valuation deviation
        const valuation = calculateFairPrice({
            currentPrice: asset.current_price,
            condition: asset.condition,
            rarity: asset.rarity,
            priceHistory: history,
            category: asset.category
        });

        // 2. Generate AI market commentary, outlook, and key drivers
        const aiAnalysis = await generateAIAssetAnalysis({
            asset,
            valuation
        });

        res.status(200).json({
            success: true,
            assetId: Number(id),
            asset: asset.name,
            valuation,
            ai: aiAnalysis,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("Get Asset AI Analysis Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate AI price analysis",
            error: error.message
        });
    }
};

export const seedCatalogRecords = async (req, res) => {
    try {
        const summary = await seedCatalog();

        res.status(200).json({
            success: true,
            message: "Luxury catalog seeded successfully",
            ...summary
        });
    } catch (error) {
        console.error("Seed catalog error:", error);

        res.status(503).json({
            success: false,
            message: "Unable to seed the catalog right now. Check the database configuration.",
            error: error.message
        });
    }
};