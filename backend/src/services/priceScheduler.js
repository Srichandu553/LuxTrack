import cron from "node-cron";
import pool from "../config/db.js";
import { updateVerifiedAssetPrice } from "./verifiedPriceUpdateService.js";

// Check and update all assets
const updateAllAssetPrices = async () => {
    console.log("🔄 Starting automatic price check...");

    try {
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                brand,
                category_id
            FROM assets
            ORDER BY id;
            `
        );

        console.log(`📊 Found ${result.rows.length} assets`);

        for (const asset of result.rows) {
            try {
                console.log(
                    `🔎 Checking: ${asset.brand} ${asset.name} (ID: ${asset.id})`
                );

                const updateResult =
                    await updateVerifiedAssetPrice(asset.id);

                if (updateResult.updated) {
                    console.log(
                        `✅ UPDATED: ${asset.name}: ₹${updateResult.oldPrice} → ₹${updateResult.newPrice}`
                    );
                } else if (
                    updateResult.reason === "Price requires manual review"
                ) {
                    console.log(
                        `⚠️ REVIEW REQUIRED: ${asset.name} | ` +
                        `Reference: ₹${updateResult.referencePrice} | ` +
                        `Confidence: ${updateResult.confidence} | ` +
                        `Source: ${updateResult.source}`
                    );
                } else if (
                    updateResult.reason === "Price has not changed"
                ) {
                    console.log(
                        `ℹ️ UNCHANGED: ${asset.name} | ` +
                        `Price: ₹${updateResult.newPrice}`
                    );
                } else if (
                    updateResult.reason === "No reliable reference price found"
                ) {
                    console.log(
                        `⚪ NO RELIABLE PRICE: ${asset.name}`
                    );
                } else {
                    console.log(
                        `ℹ️ ${asset.name}: ${updateResult.reason}`
                    );
                }

            } catch (error) {
                console.error(
                    `❌ FAILED: ${asset.name}:`,
                    error.message
                );
            }
        }

        console.log("✅ Automatic price check completed");

    } catch (error) {
        console.error(
            "❌ Automatic price check failed:",
            error.message
        );
    }
};

// Start automatic hourly price scheduler
export const startPriceScheduler = () => {
    cron.schedule("0 * * * *", async () => {
        await updateAllAssetPrices();
    });

    console.log("⏰ Price scheduler started");
    console.log("📅 Automatic price check: every hour");
};

// Run price check immediately for testing
export const runPriceCheckNow = async () => {
    await updateAllAssetPrices();
};