import pool from "../config/db.js";
import { sendPriceAlertEmail } from "./mailService.js";

export const evaluatePriceAlerts = async ({ assetId, previousPrice, currentPrice, currency }) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const alerts = await client.query(`
            SELECT pa.id, pa.target_price, pa.condition, u.email,
                   a.name, a.brand, a.model
            FROM price_alerts pa
            JOIN users u ON u.id = pa.user_id
            JOIN assets a ON a.id = pa.asset_id
            WHERE pa.asset_id = $1 AND pa.is_active = TRUE
            FOR UPDATE
        `, [assetId]);

        const triggered = [];
        for (const alert of alerts.rows) {
            const reached = alert.condition === "above"
                ? currentPrice >= Number(alert.target_price)
                : currentPrice <= Number(alert.target_price);
            if (!reached) continue;

            const event = await client.query(`
                INSERT INTO price_alert_events
                    (alert_id, asset_id, price, previous_price)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (alert_id, price) DO NOTHING
                RETURNING id
            `, [alert.id, assetId, currentPrice, previousPrice]);
            if (!event.rows[0]) continue;

            await client.query(`
                UPDATE price_alerts
                SET is_active = FALSE, triggered_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [alert.id]);
            triggered.push({ ...alert, eventId: event.rows[0].id });
        }
        await client.query("COMMIT");

        for (const alert of triggered) {
            try {
                const sent = await sendPriceAlertEmail({
                    email: alert.email,
                    assetName: alert.name,
                    brand: alert.brand,
                    model: alert.model,
                    previousPrice,
                    currentPrice,
                    targetPrice: alert.target_price,
                    currency
                });
                await pool.query(`
                    UPDATE price_alert_events
                    SET notification_status = $1::varchar,
                        notification_sent_at = CASE WHEN $1::varchar = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END
                    WHERE id = $2
                `, [sent ? "sent" : "not_configured", alert.eventId]);
            } catch (error) {
                console.error("Price alert notification failed:", error.message);
                await pool.query(
                    "UPDATE price_alert_events SET notification_status = 'failed', notification_error = $1 WHERE id = $2",
                    [error.message, alert.eventId]
                );
            }
        }
        return triggered.length;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};
