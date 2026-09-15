import pool from "../config/db.js";

export const getCategories = async (req, res) => {
    const result = await pool.query(
        "SELECT id, name, description FROM categories ORDER BY name"
    );
    return res.json({ success: true, categories: result.rows });
};
