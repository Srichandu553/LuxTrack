import pool from "../config/db.js";
import { checkAssetPrice } from "./assetPriceCheckService.js";

// Update database only when a verified external price is available
export const updateVerifiedAssetPrice = async (assetId) => {
    // 1. Get the verified reference price
    const priceCheck = await checkAssetPrice(assetId);

    // 2. Stop if no reliable reference price exists
    if (
        priceCheck.referencePrice === null ||
        !Number.isFinite(Number(priceCheck.referencePrice)) ||
        Number(priceCheck.referencePrice) <= 0
    ) {
        return {
            updated: false,
            reason: "No reliable reference price found",
            data: priceCheck
        };
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 3. Lock the asset row while updating
        const assetResult = await client.query(
            `
            SELECT
                id,
                current_price,
                currency
            FROM assets
            WHERE id = $1
            FOR UPDATE;
            `,
            [assetId]
        );

        if (assetResult.rows.length === 0) {
            throw new Error("Asset not found");
        }

        const asset = assetResult.rows[0];

        const oldPrice = Number(asset.current_price);
        const newPrice = Number(priceCheck.referencePrice);

        // 4. Safety validation
        if (!Number.isFinite(newPrice) || newPrice <= 0) {
            throw new Error("Invalid verified price");
        }

        // 5. Do not create duplicate history if price has not changed
        if (oldPrice === newPrice) {
            await client.query("COMMIT");

            return {
                updated: false,
                reason: "Price has not changed",
                assetId: Number(assetId),
                oldPrice,
                newPrice,
                source: priceCheck.source,
                confidence: priceCheck.confidence
            };
        }

        // 6. Update current price
        await client.query(
            `
            UPDATE assets
            SET
                current_price = $1,
                currency = $2,
                price_source = $3,
                price_type = $4,
                last_price_update = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5;
            `,
            [
                newPrice,
                priceCheck.currency || "INR",
                priceCheck.source,
                priceCheck.priceType || "market_reference",
                assetId
            ]
        );

        // 7. Record the new price in price history
        await client.query(
            `
            INSERT INTO price_history
            (
                asset_id,
                price,
                currency,
                source,
                recorded_at
            )
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP);
            `,
            [
                assetId,
                newPrice,
                priceCheck.currency || "INR",
                priceCheck.source
            ]
        );

        await client.query("COMMIT");

        return {
            updated: true,
            assetId: Number(assetId),
            oldPrice,
            newPrice,
            currency: priceCheck.currency || "INR",
            source: priceCheck.source,
            priceType: priceCheck.priceType || "market_reference",
            confidence: priceCheck.confidence,
            analysis: priceCheck.analysis
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};