import pool from "./config/db.js";

const checkReviews = async () => {
    try {
        const result = await pool.query(`
            SELECT
                pr.id,
                pr.asset_id,
                a.name AS asset,
                pr.current_price,
                pr.reference_price,
                pr.source,
                pr.source_url,
                pr.confidence,
                pr.status,
                pr.analysis,
                pr.created_at
            FROM price_reviews pr
            JOIN assets a
                ON pr.asset_id = a.id
            ORDER BY pr.id;
        `);

        console.table(result.rows);

    } catch (error) {
        console.error(
            "❌ Error:",
            error.message
        );

    } finally {
        await pool.end();
    }
};

checkReviews();