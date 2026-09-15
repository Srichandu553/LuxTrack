import { verifyAccessToken } from "../services/authService.js";

export const requireAuth = (req, res, next) => {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    try {
        const user = verifyAccessToken(token);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired access token"
            });
        }

        req.user = user;
        return next();
    } catch (error) {
        console.error("Authentication verification failed:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid authentication configuration"
        });
    }
};

export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Administrator access required"
        });
    }

    return next();
};
