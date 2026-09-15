import pool from "../config/db.js";
import { checkAssetPrice } from "./assetPriceCheckService.js";
import { evaluatePriceAlerts } from "./priceAlertService.js";

export const updateVerifiedAssetPrice = async (assetId) => {
    const priceCheck = await checkAssetPrice(assetId);

    /*
     * No reliable reference price found.
     */
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


    /*
     * Medium/low confidence prices require
     * manual admin review.
     *
     * Save the review request in price_reviews.
     */
    if (priceCheck.confidence !== "high") {

        try {

            /*
             * Prevent duplicate pending reviews
             * for the same asset and reference price.
             */
            const existingReview = await pool.query(
                `
                SELECT id
                FROM price_reviews
                WHERE asset_id = $1
                  AND reference_price = $2
                  AND status = 'pending'
                LIMIT 1;
                `,
                [
                    assetId,
                    Number(priceCheck.referencePrice)
                ]
            );


            /*
             * Create a review only if one does not
             * already exist.
             */
            if (existingReview.rows.length === 0) {

                await pool.query(
                    `
                    INSERT INTO price_reviews
                    (
                        asset_id,
                        current_price,
                        reference_price,
                        currency,
                        source,
                        source_url,
                        price_type,
                        confidence,
                        analysis,
                        status
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
                        'pending'
                    );
                    `,
                    [
                        assetId,
                        Number(priceCheck.currentPrice),
                        Number(priceCheck.referencePrice),
                        priceCheck.currency || "INR",
                        priceCheck.source || "Unknown",
                        priceCheck.sourceUrl || null,
                        priceCheck.priceType || "market_reference",
                        priceCheck.confidence,
                        priceCheck.analysis || null
                    ]
                );

                console.log(
                    `📝 Price review created for asset ${assetId}`
                );

            } else {

                console.log(
                    `ℹ️ Pending review already exists for asset ${assetId}`
                );
            }

        } catch (error) {

            console.error(
                "❌ Error creating price review:",
                error.message
            );

            throw error;
        }


        return {
            updated: false,
            reason: "Price requires manual review",
            assetId: Number(assetId),
            currentPrice: Number(priceCheck.currentPrice),
            referencePrice: Number(priceCheck.referencePrice),
            source: priceCheck.source,
            sourceUrl: priceCheck.sourceUrl || null,
            confidence: priceCheck.confidence,
            analysis: priceCheck.analysis || null
        };
    }


    /*
     * High-confidence prices are allowed to
     * automatically update the database.
     */
    const client = await pool.connect();

    try {

        await client.query("BEGIN");


        /*
         * Lock the asset row so that two
         * updates cannot modify it simultaneously.
         */
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

        const newPrice =
            Number(priceCheck.referencePrice);


        if (
            !Number.isFinite(newPrice) ||
            newPrice <= 0
        ) {
            throw new Error(
                "Invalid verified price"
            );
        }


        /*
         * Price has not changed.
         */
        if (oldPrice === newPrice) {

            await client.query("COMMIT");

            try {
                await evaluatePriceAlerts({
                    assetId,
                    previousPrice: oldPrice,
                    currentPrice: newPrice,
                    currency: priceCheck.currency || "INR"
                });
            } catch (error) {
                console.error("Price alert evaluation failed:", error.message);
            }

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


        /*
         * Update current asset price.
         */
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
                priceCheck.priceType ||
                    "market_reference",
                assetId
            ]
        );


        /*
         * Save the new price in price history.
         */
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
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT DO NOTHING;
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
            currency:
                priceCheck.currency || "INR",
            source: priceCheck.source,
            priceType:
                priceCheck.priceType ||
                "market_reference",
            confidence:
                priceCheck.confidence,
            analysis:
                priceCheck.analysis
        };


    } catch (error) {

        await client.query("ROLLBACK");

        throw error;

    } finally {

        client.release();
    }
};