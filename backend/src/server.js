import app from "./app.js";
import { checkDatabaseConnection } from "./config/db.js";
import { startPriceScheduler } from "./services/priceScheduler.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    const databaseReady = await checkDatabaseConnection();
    if (!databaseReady) {
        throw new Error("LuxTrack cannot start because PostgreSQL is unavailable.");
    }

    app.listen(PORT, () => {
        console.log(`LuxTrack server running on port ${PORT}`);
        startPriceScheduler();
    });
};

startServer().catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
});