import pool from "../config/db.js";
import { evaluatePriceAlerts } from "./priceAlertService.js";

/**
 * Update an asset price.
 *
 * This function:
 * 1. Gets the current price
 * 2. Compares it with the new price
 * 3. Updates the asset if the price changed
 * 4. Saves the new price in price_history
 * 5. Updates the source and last update time
 */
export const updateAssetPrice = async (
    assetId,
    newPrice,
    currency = "INR",
    source = "Unknown",
    priceType = "market"
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Get current asset price
        const assetResult = await client.query(
            `
            SELECT id, current_price, currency
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
        const updatedPrice = Number(newPrice);

        if (!Number.isFinite(updatedPrice) || updatedPrice <= 0) {
            throw new Error("Invalid price");
        }

        // Check whether price changed
        if (oldPrice === updatedPrice) {
            await client.query("COMMIT");

            try {
                await evaluatePriceAlerts({
                    assetId,
                    previousPrice: oldPrice,
                    currentPrice: updatedPrice,
                    currency
                });
            } catch (error) {
                console.error("Price alert evaluation failed:", error.message);
            }

            return {
                changed: false,
                assetId,
                oldPrice,
                newPrice: updatedPrice,
                message: "Price has not changed"
            };
        }

        // Update current asset price
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
                updatedPrice,
                currency,
                source,
                priceType,
                assetId
            ]
        );

        // Save price history
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
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT DO NOTHING;
            `,
            [
                assetId,
                updatedPrice,
                currency,
                source
            ]
        );

        await client.query("COMMIT");

        return {
            changed: true,
            assetId,
            oldPrice,
            newPrice: updatedPrice,
            currency,
            source,
            priceType,
            updatedAt: new Date()
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};