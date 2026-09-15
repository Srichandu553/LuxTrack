import { updateAssetPrice } from "../services/priceService.js";
import { checkAssetPrice } from "../services/assetPriceCheckService.js";
import { updateVerifiedAssetPrice } from "../services/verifiedPriceUpdateService.js";

// Update an asset's price manually
export const updatePrice = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            price,
            currency = "INR",
            source = "Unknown",
            priceType = "market"
        } = req.body;

        const result = await updateAssetPrice(
            id,
            price,
            currency,
            source,
            priceType
        );

        res.status(200).json({
            success: true,
            message: result.changed
                ? "Asset price updated successfully"
                : "Price has not changed",
            data: result
        });

    } catch (error) {
        console.error("Update Price Error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Check the current reference price of an asset
export const checkPrice = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await checkAssetPrice(id);

        res.status(200).json({
            success: true,
            message: "Asset price checked successfully",
            data: result
        });

    } catch (error) {
        console.error("Check Price Error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Update asset price using a verified external reference price
export const verifyAndUpdatePrice = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await updateVerifiedAssetPrice(id);

        res.status(200).json({
            success: true,
            message: result.updated
                ? "Verified asset price updated successfully"
                : result.reason,
            data: result
        });

    } catch (error) {
        console.error("Verified Price Update Error:", error);

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};