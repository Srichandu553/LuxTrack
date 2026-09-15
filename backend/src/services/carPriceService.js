const CARDEKHO_BASE_URL = "https://www.cardekho.com";

/*
 * Convert Indian price formats into INR.
 *
 * Examples:
 * ₹2 Cr         → 20000000
 * ₹3.76 Cr      → 37600000
 * ₹3 Crore      → 30000000
 * ₹77.75 Lakh   → 7775000
 */
const parseIndianPrice = (text) => {
    const match = text.match(
        /₹\s*([\d,.]+)\s*(Cr|Crore|Lakh)?/i
    );

    if (!match) {
        return null;
    }

    const number = Number(
        match[1].replace(/,/g, "")
    );

    if (!Number.isFinite(number)) {
        return null;
    }

    const unit = (match[2] || "").toLowerCase();

    if (
        unit === "cr" ||
        unit === "crore"
    ) {
        return Math.round(number * 10000000);
    }

    if (unit === "lakh") {
        return Math.round(number * 100000);
    }

    return Math.round(number);
};


/*
 * Convert our database asset name into
 * the correct CarDekho URL.
 */
const getCarDekhoSlug = (brand, name) => {

    const brandLower = String(brand)
        .trim()
        .toLowerCase();

    const nameLower = String(name)
        .trim()
        .toLowerCase();


    /*
     * Porsche 911 variants
     *
     * Example:
     * Porsche 911 Carrera
     *
     * CarDekho:
     * /porsche/911
     */
    if (
        brandLower === "porsche" &&
        nameLower.includes("911")
    ) {
        return "porsche/911";
    }


    /*
     * Ferrari Roma
     */
    if (
        brandLower === "ferrari" &&
        nameLower.includes("roma")
    ) {
        return "ferrari/roma";
    }


    /*
     * Lamborghini Huracan
     */
    if (
        brandLower === "lamborghini" &&
        nameLower.includes("huracan")
    ) {
        return "lamborghini/huracan";
    }


    /*
     * Default URL generation.
     */
    const brandSlug = brandLower
        .replace(/\s+/g, "-");

    const nameSlug = nameLower
        .replace(/\s+/g, "-");

    return `${brandSlug}/${nameSlug}`;
};


/*
 * Extract the starting price from a
 * CarDekho page.
 */
const extractStartingPrice = (html) => {

    /*
     * Example:
     *
     * price starts at ₹2 Cr
     * price starts ₹3.76 Cr
     */
    const startingPricePatterns = [

        /price\s+starts\s+at\s+(₹\s*[\d,.]+\s*(?:Cr|Crore|Lakh)?)/i,

        /price\s+starts\s+(₹\s*[\d,.]+\s*(?:Cr|Crore|Lakh)?)/i

    ];


    for (
        const pattern of startingPricePatterns
    ) {

        const match = html.match(pattern);

        if (match) {
            return match[1];
        }
    }


    /*
     * Lamborghini and some other pages
     * may show a range such as:
     *
     * ₹3 Cr to ₹4 Cr
     *
     * In that case, use the first price
     * because it represents the starting
     * price.
     */
    const rangeMatch = html.match(
        /(₹\s*[\d,.]+\s*(?:Cr|Crore|Lakh)?)\s+to\s+₹/i
    );

    if (rangeMatch) {
        return rangeMatch[1];
    }


    /*
     * Fallback for structured price fields.
     */
    const fallbackPatterns = [

        /"price"\s*:\s*"?(₹\s*[\d,.]+\s*(?:Cr|Crore|Lakh)?)/i,

        /"priceText"\s*:\s*"?(₹\s*[\d,.]+\s*(?:Cr|Crore|Lakh)?)/i

    ];


    for (
        const pattern of fallbackPatterns
    ) {

        const match = html.match(pattern);

        if (match) {
            return match[1];
        }
    }


    return null;
};


/*
 * Get car price from CarDekho.
 */
export const getCarPrice = async (asset) => {

    const slug = getCarDekhoSlug(
        asset.brand,
        asset.name
    );

    const url = `${CARDEKHO_BASE_URL}/${slug}`;


    console.log(
        `🚗 Checking CarDekho: ${url}`
    );


    /*
     * Request public CarDekho page.
     */
    const response = await fetch(url, {

        headers: {

            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",

            "Accept":
                "text/html,application/xhtml+xml"

        }

    });


    if (!response.ok) {

        throw new Error(
            `CarDekho request failed: ${response.status}`
        );
    }


    const html = await response.text();


    /*
     * Extract starting price.
     */
    const priceText =
        extractStartingPrice(html);


    if (!priceText) {

        throw new Error(
            `Starting price not found on CarDekho page: ${url}`
        );
    }


    console.log(
        `💰 CarDekho price found: ${priceText}`
    );


    /*
     * Convert price to INR.
     */
    const price =
        parseIndianPrice(priceText);


    if (!price || price <= 0) {

        throw new Error(
            `Invalid CarDekho price: ${priceText}`
        );
    }


    /*
     * Safety check.
     */
    if (price > 100000000) {

        throw new Error(
            `CarDekho price looks invalid: ₹${price}`
        );
    }


    /*
     * Return standardized result.
     */
    return {

        price,

        currency: "INR",

        source: "CarDekho",

        sourceUrl: url,

        priceType: "market_reference",

        confidence: "medium"

    };
};