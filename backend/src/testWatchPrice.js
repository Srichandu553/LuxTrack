import { searchWatchModel } from "./services/watchPriceService.js";

try {
    const result = await searchWatchModel(
        "Rolex",
        "Submariner"
    );

    console.log("✅ Watch API Result:");
    console.dir(result, { depth: null });
} catch (error) {
    console.error("❌ Watch API Error:", error.message);
}