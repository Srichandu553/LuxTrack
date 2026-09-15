const WATCH_API_URL = "https://thewatchinfo.com/api/v1.php";
const FX_API_URL = "https://api.frankfurter.app/latest?from=USD&to=INR";

// Search for a watch model
export const searchWatchModel = async (brand, model) => {
    try {
        const url = new URL(WATCH_API_URL);

        url.searchParams.set("resource", "models");
        url.searchParams.set("brand", brand);
        url.searchParams.set("q", model);
        url.searchParams.set("limit", "10");

        const response = await fetch(url);

        if (!response.ok) {
            console.warn(
                `Watch API request failed: ${response.status} ${response.statusText}. Falling back to no reference price.`
            );
            return null;
        }

        const data = await response.json();

        if (!data || !data.ok || !Array.isArray(data.data)) {
            return null;
        }

        if (data.data.length === 0) {
            return null;
        }

        const watch = data.data[0];
        const averagePriceUSD = Number(watch.avg_price_usd);
        const minimumPriceUSD = Number(watch.min_price_usd);
        const maximumPriceUSD = Number(watch.max_price_usd);

        if (
            !Number.isFinite(averagePriceUSD) ||
            !Number.isFinite(minimumPriceUSD) ||
            !Number.isFinite(maximumPriceUSD)
        ) {
            return null;
        }

        return {
            id: watch.id,
            brand: watch.brand,
            name: watch.name,
            reference: watch.reference,
            listings: watch.listings,
            averagePriceUSD,
            minimumPriceUSD,
            maximumPriceUSD,
            currency: "USD"
        };
    } catch (error) {
        console.warn("Watch model lookup unavailable:", error.message);
        return null;
    }
};


// Get current USD → INR exchange rate
export const getUsdToInrRate = async () => {
    try {
        const response = await fetch(FX_API_URL);

        if (!response.ok) {
            console.warn(
                `Currency API request failed: ${response.status} ${response.statusText}. Falling back to no reference price.`
            );
            return null;
        }

        const data = await response.json();
        const rate = Number(data?.rates?.INR);

        if (!Number.isFinite(rate) || rate <= 0) {
            return null;
        }

        return rate;
    } catch (error) {
        console.warn("Currency conversion unavailable:", error.message);
        return null;
    }
};


// Get average watch price in INR
export const getWatchPriceInINR = async (brand, model) => {
    const watch = await searchWatchModel(brand, model);

    if (!watch) {
        return null;
    }

    const usdToInr = await getUsdToInrRate();

    if (!Number.isFinite(usdToInr) || usdToInr <= 0) {
        return null;
    }

    const averagePriceINR =
        watch.averagePriceUSD * usdToInr;

    return {
        ...watch,
        usdToInr,
        averagePriceINR: Math.round(averagePriceINR)
    };
};