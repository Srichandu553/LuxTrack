import pool from "../config/db.js";
import { getWatchPriceInINR } from "./watchPriceService.js";
import { getCarPrice } from "./carPriceService.js";
import { analyzePrice } from "./groqService.js";

export const checkAssetPrice = async (assetId) => {
    const result = await pool.query(
        `
        SELECT
            a.id,
            a.name,
            a.brand,
            a.model,
            a.current_price,
            a.currency,
            c.name AS category
        FROM assets a
        JOIN categories c
            ON a.category_id = c.id
        WHERE a.id = $1;
        `,
        [assetId]
    );

    if (result.rows.length === 0) {
        throw new Error("Asset not found");
    }

    const asset = result.rows[0];

    let referencePrice = null;
    let source = "Not provided";
    let sourceUrl = null;
    let currency = "INR";
    let priceType = "market_reference";
    let confidence = "low";

    /*
     * ============================
     * LUXURY WATCHES
     * ============================
     */
    if (asset.category === "Luxury Watches") {

        try {
            const watchPrice = await getWatchPriceInINR(
                asset.brand,
                asset.name
            );

            if (watchPrice) {
                referencePrice =
                    watchPrice.averagePriceINR;

                source = "The Watch Info";

                /*
                 * The Watch Info API does not currently
                 * return a source URL from our service.
                 */
                sourceUrl =
                    "https://thewatchinfo.com/";

                currency = "INR";

                priceType =
                    "market_reference";

                confidence =
                    "high";
            }
        } catch (error) {
            console.warn(
                `Watch reference lookup failed for asset ${asset.id}:`,
                error.message
            );
        }
    }


    /*
     * ============================
     * LUXURY CARS
     * ============================
     */
    else if (asset.category === "Luxury Cars") {

        try {
            const carPrice =
                await getCarPrice(asset);

            if (
                carPrice &&
                carPrice.price !== null
            ) {

                referencePrice =
                    Number(carPrice.price);

                currency =
                    carPrice.currency || "INR";

                source =
                    carPrice.source ||
                    "CarDekho";

                sourceUrl =
                    carPrice.sourceUrl ||
                    null;

                priceType =
                    carPrice.priceType ||
                    "market_reference";

                confidence =
                    carPrice.confidence ||
                    "low";
            }
        } catch (error) {
            console.warn(
                `Car reference lookup failed for asset ${asset.id}:`,
                error.message
            );
        }
    }


    /*
     * ============================
     * NO RELIABLE PRICE
     * ============================
     */
    if (
        referencePrice === null ||
        !Number.isFinite(referencePrice) ||
        referencePrice <= 0
    ) {

        return {
            assetId: asset.id,

            asset: asset.name,

            brand: asset.brand,

            model: asset.model,

            category: asset.category,

            currentPrice:
                Number(asset.current_price),

            referencePrice: null,

            currency,

            source,

            sourceUrl,

            priceType,

            confidence,

            message:
                "No reliable reference price found"
        };
    }


    /*
     * ============================
     * GROQ PRICE ANALYSIS
     * ============================
     */
    const analysis =
        await analyzePrice({

            name: asset.name,

            brand: asset.brand,

            model: asset.model,

            category: asset.category,

            currentPrice:
                Number(asset.current_price),

            referencePrice,

            source
        });


    /*
     * ============================
     * FINAL RESULT
     * ============================
     */
    return {

        assetId: asset.id,

        asset: asset.name,

        brand: asset.brand,

        model: asset.model,

        category: asset.category,

        currentPrice:
            Number(asset.current_price),

        referencePrice,

        currency,

        source,

        sourceUrl,

        priceType,

        confidence,

        analysis
    };
};