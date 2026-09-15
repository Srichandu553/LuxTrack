import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import assetRoutes from "./routes/assetRoutes.js";
import priceRoutes from "./routes/priceRoutes.js";
import priceReviewRoutes from "./routes/priceReviewRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import trackingRoutes from "./routes/trackingRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import { getDatabaseHealth } from "./config/db.js";

const app = express();

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin not allowed by CORS"));
    }
}));
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "LuxTrack API is running 🚀"
    });
});

app.get("/health", (req, res) => {
    res.json({
        success: true,
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.get("/health/ready", async (req, res) => {
        const database = await getDatabaseHealth();
        const ready = database.status === "ok";
        res.status(ready ? 200 : 503).json({
            success: ready,
            status: ready ? "ready" : "not_ready",
            database: database.status,
            timestamp: new Date().toISOString()
        });
});

app.use("/api/assets", assetRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/price-reviews", priceReviewRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

app.use((err, req, res, next) => {
    console.error("Unhandled API error:", err);
    const status = err.statusCode || err.status || 500;
    const message = err.message || "Internal server error";

    res.status(status).json({
        success: false,
        message
    });
});

export default app;
