import pool from "../config/db.js";
import { hashPassword } from "../services/authService.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const name = String(process.env.ADMIN_NAME || "LuxTrack Administrator").trim();

try {
    if (!email || !password) {
        throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this command");
    }

    const passwordHash = hashPassword(password);
    const result = await pool.query(
        `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'admin')
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role = 'admin',
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, email, role;
        `,
        [name, email, passwordHash]
    );

    console.log(`✅ Admin account ready: ${result.rows[0].email}`);
} catch (error) {
    console.error("❌ Admin creation failed:", error.message || error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
