import express from "express";
import { createRateLimit } from "../middleware/rateLimit.js";
import {
    login,
    register,
    requestPasswordReset,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const authLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many authentication attempts. Please try again later."
});
const resetLimit = createRateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many password-reset requests. Please try again later."
});

router.post("/login", authLimit, login);
router.post("/register", authLimit, register);
router.post("/forgot-password", resetLimit, requestPasswordReset);
router.post("/reset-password", resetLimit, resetPassword);
router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, updateProfile);
router.post("/change-password", requireAuth, authLimit, changePassword);

export default router;