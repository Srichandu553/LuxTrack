import pool from "../config/db.js";

export const listWatchlist = async (req, res) => {
    const result = await pool.query(`
        SELECT w.id, w.asset_id, w.created_at, a.name, a.brand, a.model,
               a.current_price, a.currency, a.image_url, a.category_id
        FROM watchlist w JOIN assets a ON a.id = w.asset_id
        WHERE w.user_id = $1 AND a.status = 'ACTIVE'
        ORDER BY w.created_at DESC
    `, [req.user.sub]);
    res.json({ success: true, watchlist: result.rows });
};

export const addWatchlist = async (req, res) => {
    const assetId = Number(req.body?.asset_id);
    if (!Number.isInteger(assetId) || assetId <= 0) {
        return res.status(400).json({ success: false, message: "A valid asset_id is required" });
    }
    const result = await pool.query(`
        INSERT INTO watchlist (user_id, asset_id) VALUES ($1, $2)
        ON CONFLICT (user_id, asset_id) DO NOTHING
        RETURNING id, asset_id, created_at
    `, [req.user.sub, assetId]);
    return res.status(201).json({ success: true, watchlist: result.rows[0] || null });
};

export const removeWatchlist = async (req, res) => {
    await pool.query("DELETE FROM watchlist WHERE user_id = $1 AND asset_id = $2", [req.user.sub, req.params.assetId]);
    return res.json({ success: true });
};

export const listAlerts = async (req, res) => {
    const result = await pool.query(`
        SELECT pa.*, a.name, a.brand, a.current_price, a.currency, a.image_url
        FROM price_alerts pa JOIN assets a ON a.id = pa.asset_id
        WHERE pa.user_id = $1 ORDER BY pa.created_at DESC
    `, [req.user.sub]);
    res.json({ success: true, alerts: result.rows });
};

export const listAlertEvents = async (req, res) => {
    const result = await pool.query(`
        SELECT pae.id, pae.alert_id, pae.asset_id, pae.price, pae.previous_price,
               pae.triggered_at, pae.notification_status, pae.notification_sent_at,
               pa.target_price, pa.condition, a.name, a.brand, a.currency
        FROM price_alert_events pae
        JOIN price_alerts pa ON pa.id = pae.alert_id
        JOIN assets a ON a.id = pae.asset_id
        JOIN users u ON u.id = pa.user_id
        WHERE u.id = $1
        ORDER BY pae.triggered_at DESC
    `, [req.user.sub]);
    return res.json({ success: true, events: result.rows });
};

export const createAlert = async (req, res) => {
    const assetId = Number(req.body?.asset_id);
    const targetPrice = Number(req.body?.target_price);
    const condition = req.body?.condition === "above" ? "above" : "below";
    if (!Number.isInteger(assetId) || !Number.isFinite(targetPrice) || targetPrice <= 0) {
        return res.status(400).json({ success: false, message: "Valid asset_id and positive target_price are required" });
    }
    const result = await pool.query(`
        INSERT INTO price_alerts (user_id, asset_id, target_price, condition)
        VALUES ($1, $2, $3, $4) RETURNING *
    `, [req.user.sub, assetId, targetPrice, condition]);
    return res.status(201).json({ success: true, alert: result.rows[0] });
};

export const updateAlert = async (req, res) => {
    const targetPrice = req.body?.target_price == null ? null : Number(req.body.target_price);
    if (targetPrice !== null && (!Number.isFinite(targetPrice) || targetPrice <= 0)) {
        return res.status(400).json({ success: false, message: "target_price must be a positive number" });
    }
    const result = await pool.query(`
        UPDATE price_alerts
        SET target_price = COALESCE($1, target_price),
            condition = COALESCE($2, condition),
            is_active = COALESCE($3, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND user_id = $5
        RETURNING *
    `, [
        targetPrice,
        req.body?.condition === "above" ? "above" : req.body?.condition === "below" ? "below" : null,
        typeof req.body?.is_active === "boolean" ? req.body.is_active : null,
        req.params.id,
        req.user.sub
    ]);
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "Alert not found" });
    return res.json({ success: true, alert: result.rows[0] });
};

export const deleteAlert = async (req, res) => {
    await pool.query("DELETE FROM price_alerts WHERE id = $1 AND user_id = $2", [req.params.id, req.user.sub]);
    return res.json({ success: true });
};
