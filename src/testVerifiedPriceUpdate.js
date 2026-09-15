import { updateVerifiedAssetPrice } from "./services/verifiedPriceUpdateService.js";

try {
    const result = await updateVerifiedAssetPrice(1);

    console.log("✅ Verified Price Update Result:");
    console.dir(result, { depth: null });
} catch (error) {
    console.error("❌ Error:", error.message);
}