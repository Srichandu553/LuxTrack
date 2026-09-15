import pool from "../config/db.js";
import {
    createAccessToken,
    createPasswordResetToken,
    createOAuthState,
    hashPassword,
    hashResetToken,
    verifyPassword,
    verifyOAuthState
} from "../services/authService.js";
import { sendPasswordResetEmail } from "../services/mailService.js";

export const login = async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required"
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT id, name, email, password_hash, role
            FROM users
            WHERE LOWER(email) = $1
            LIMIT 1;
            `,
            [email]
        );
        const user = result.rows[0];

        if (!user || !verifyPassword(password, user.password_hash)) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            token: createAccessToken(user)
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(503).json({
            success: false,
            message: "Authentication service unavailable"
        });
    }
};

export const register = async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Name, email, and password are required"
        });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO users (name, email, password_hash, role)
            VALUES ($1, $2, $3, 'user')
            RETURNING id, name, email, role;
            `,
            [name, email, hashPassword(password)]
        );

        return res.status(201).json({
            success: true,
            user: result.rows[0],
            token: createAccessToken(result.rows[0])
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        if (error.message.includes("Password must be")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Registration error:", error.message);
        return res.status(503).json({
            success: false,
            message: "Registration service unavailable"
        });
    }
};

export const requestPasswordReset = async (req, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email) {
        return res.status(400).json({
            success: false,
            message: "Email is required"
        });
    }

    try {
        const reset = createPasswordResetToken();
        await pool.query(
            `
            UPDATE users
            SET password_reset_token_hash = $1,
                password_reset_expires_at = $2
            WHERE LOWER(email) = $3;
            `,
            [reset.tokenHash, reset.expiresAt, email]
        );
        const accountResult = await pool.query(
            "SELECT email FROM users WHERE LOWER(email) = $1 LIMIT 1",
            [email]
        );
        const emailSent = accountResult.rows.length > 0
            ? await sendPasswordResetEmail({ email, token: reset.token })
            : false;

        // Do not disclose whether an account exists.
        const response = {
            success: true,
            message: "If an account exists, password reset instructions have been prepared."
        };

        if (process.env.NODE_ENV !== "production" && accountResult.rows.length > 0) {
            response.resetToken = reset.token;
            response.emailSent = emailSent;
        }

        return res.status(200).json(response);
    } catch (error) {
        console.error("Password reset request error:", error.message);
        return res.status(503).json({
            success: false,
            message: "Password recovery service unavailable"
        });
    }
};

export const resetPassword = async (req, res) => {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");

    if (!token || !password) {
        return res.status(400).json({
            success: false,
            message: "Reset token and new password are required"
        });
    }

    try {
        const result = await pool.query(
            `
            SELECT id
            FROM users
            WHERE password_reset_token_hash = $1
              AND password_reset_expires_at > CURRENT_TIMESTAMP
            LIMIT 1;
            `,
            [hashResetToken(token)]
        );
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Reset token is invalid or expired"
            });
        }

        await pool.query(
            `
            UPDATE users
            SET password_hash = $1,
                password_reset_token_hash = NULL,
                password_reset_expires_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2;
            `,
            [hashPassword(password), user.id]
        );

        return res.status(200).json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (error) {
        if (error.message.includes("Password must be")) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Password reset error:", error.message);
        return res.status(503).json({
            success: false,
            message: "Password reset service unavailable"
        });
    }
};

export const getProfile = async (req, res) => {
    const result = await pool.query(
        "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
        [req.user.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: result.rows[0] });
};

export const updateProfile = async (req, res) => {
    const name = String(req.body?.name || "").trim();
    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ success: false, message: "Name must be between 2 and 80 characters" });
    }
    const result = await pool.query(
        "UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, role, created_at",
        [name, req.user.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user: result.rows[0], message: "Profile updated successfully" });
};

export const changePassword = async (req, res) => {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current and new passwords are required" });
    }
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [req.user.sub]);
    if (!result.rows[0] || !verifyPassword(currentPassword, result.rows[0].password_hash)) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    try {
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
            [hashPassword(newPassword), req.user.sub]
        );
        return res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
        if (error.message.includes("Password must be")) {
            return res.status(400).json({ success: false, message: error.message });
        }
        throw error;
    }
};

export const googleLogin = (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
        return res.status(503).json({
            success: false,
            message: "Google sign-in is not configured. Set Google OAuth credentials and GOOGLE_REDIRECT_URI."
        });
    }

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        state: createOAuthState()
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

export const googleCallback = async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    if (error || !code || !verifyOAuthState(state)) {
        return res.redirect(`${frontendUrl}/?auth_error=google_auth_failed`);
    }

    try {
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: "authorization_code"
            })
        });
        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            throw new Error("Google token exchange failed");
        }

        const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const profile = await profileResponse.json();

        if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified !== true) {
            throw new Error("Google profile verification failed");
        }

        const result = await pool.query(
            `
            INSERT INTO users (name, email, password_hash, role, google_subject)
            VALUES ($1, LOWER($2), $3, 'user', $4)
            ON CONFLICT (email) DO UPDATE SET
                name = EXCLUDED.name,
                google_subject = EXCLUDED.google_subject,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id, name, email, role;
            `,
            [
                profile.name || profile.email,
                profile.email,
                `google:${profile.sub}`,
                profile.sub
            ]
        );
        const user = result.rows[0];
        const token = createAccessToken(user);

        return res.redirect(`${frontendUrl}/?auth_token=${encodeURIComponent(token)}`);
    } catch (callbackError) {
        console.error("Google OAuth callback failed:", callbackError.message);
        return res.redirect(`${frontendUrl}/?auth_error=google_auth_failed`);
    }
};