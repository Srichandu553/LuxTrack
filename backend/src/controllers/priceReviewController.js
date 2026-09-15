import pool from "../config/db.js";

/*
 * Get all pending price reviews
 */
export const getPendingPriceReviews = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                pr.id,
                pr.asset_id,
                a.name AS asset,
                a.brand,
                a.model,
                a.current_price,
                pr.reference_price,
                pr.currency,
                pr.source,
                pr.source_url,
                pr.price_type,
                pr.confidence,
                pr.analysis,
                pr.status,
                pr.admin_note,
                pr.created_at
            FROM price_reviews pr
            JOIN assets a
                ON pr.asset_id = a.id
            WHERE pr.status = 'pending'
            ORDER BY pr.created_at DESC;
        `);

        res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {

        console.error(
            "Get Pending Price Reviews Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch price reviews"
        });
    }
};


/*
 * Get a single price review
 */
export const getPriceReviewById = async (req, res) => {
    try {

        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT
                pr.id,
                pr.asset_id,
                a.name AS asset,
                a.brand,
                a.model,
                a.current_price,
                pr.reference_price,
                pr.currency,
                pr.source,
                pr.source_url,
                pr.price_type,
                pr.confidence,
                pr.analysis,
                pr.status,
                pr.admin_note,
                pr.created_at,
                pr.reviewed_at
            FROM price_reviews pr
            JOIN assets a
                ON pr.asset_id = a.id
            WHERE pr.id = $1;
            `,
            [id]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Price review not found"
            });
        }

        res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Get Price Review Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch price review"
        });
    }
};


/*
 * Approve a price review
 *
 * This will:
 * 1. Get the pending review
 * 2. Update the asset price
 * 3. Add the price to price_history
 * 4. Mark the review as approved
 * 5. Save admin note
 * 6. Save reviewed_at
 */
export const approvePriceReview = async (req, res) => {

    const client = await pool.connect();

    try {

        const { id } = req.params;

        const {
            adminNote = null
        } = req.body;

        await client.query("BEGIN");

        /*
         * Get and lock the review
         */
        const reviewResult = await client.query(
            `
            SELECT
                pr.id,
                pr.asset_id,
                pr.reference_price,
                pr.currency,
                pr.source,
                pr.price_type,
                pr.status
            FROM price_reviews pr
            WHERE pr.id = $1
            FOR UPDATE;
            `,
            [id]
        );

        if (reviewResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Price review not found"
            });
        }

        const review = reviewResult.rows[0];

        /*
         * Only pending reviews can be approved
         */
        if (review.status !== "pending") {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: `Review is already ${review.status}`
            });
        }

        const newPrice =
            Number(review.reference_price);

        /*
         * Validate reference price
         */
        if (
            !Number.isFinite(newPrice) ||
            newPrice <= 0
        ) {

            await client.query("ROLLBACK");

            return res.status(400).json({
                success: false,
                message: "Invalid reference price"
            });
        }

        /*
         * Get current asset price
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
            [review.asset_id]
        );

        if (assetResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Asset not found"
            });
        }

        const asset = assetResult.rows[0];

        const oldPrice =
            Number(asset.current_price);

        /*
         * Update asset price
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
                review.currency || "INR",
                review.source || "Unknown",
                review.price_type || "market_reference",
                review.asset_id
            ]
        );

        /*
         * Add approved price to history
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
                review.asset_id,
                newPrice,
                review.currency || "INR",
                review.source || "Unknown"
            ]
        );

        /*
         * Mark review as approved
         */
        await client.query(
            `
            UPDATE price_reviews
            SET
                status = 'approved',
                admin_note = $1,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2;
            `,
            [
                adminNote,
                id
            ]
        );

        await client.query("COMMIT");

        res.status(200).json({
            success: true,
            message: "Price review approved successfully",
            data: {
                reviewId: Number(id),
                assetId: review.asset_id,
                oldPrice,
                newPrice,
                currency:
                    review.currency || "INR",
                source:
                    review.source || "Unknown",
                status: "approved"
            }
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Approve Price Review Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to approve price review"
        });

    } finally {

        client.release();
    }
};


/*
 * Reject a price review
 *
 * The asset price will NOT be changed.
 */
export const rejectPriceReview = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            adminNote = null
        } = req.body;

        /*
         * Check that the review exists
         */
        const reviewResult = await pool.query(
            `
            SELECT
                id,
                status
            FROM price_reviews
            WHERE id = $1;
            `,
            [id]
        );

        if (reviewResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Price review not found"
            });
        }

        const review =
            reviewResult.rows[0];

        /*
         * Only pending reviews can be rejected
         */
        if (review.status !== "pending") {

            return res.status(400).json({
                success: false,
                message: `Review is already ${review.status}`
            });
        }

        /*
         * Reject review
         */
        const result = await pool.query(
            `
            UPDATE price_reviews
            SET
                status = 'rejected',
                admin_note = $1,
                reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING
                id,
                status,
                admin_note,
                reviewed_at;
            `,
            [
                adminNote,
                id
            ]
        );

        res.status(200).json({
            success: true,
            message: "Price review rejected successfully",
            data: result.rows[0]
        });

    } catch (error) {

        console.error(
            "Reject Price Review Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to reject price review"
        });
    }
};