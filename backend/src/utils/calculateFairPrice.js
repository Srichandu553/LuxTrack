/**
 * Calculate Fair Market Price & Valuation Metrics for a Luxury Asset
 *
 * Combines historical moving average, condition weight, rarity premium,
 * and price momentum.
 */
export const calculateFairPrice = ({
    currentPrice,
    condition = "Excellent",
    rarity = "Medium",
    priceHistory = [],
    category = "General"
}) => {
    const numericCurrentPrice = Number(currentPrice);

    if (!Number.isFinite(numericCurrentPrice) || numericCurrentPrice <= 0) {
        throw new Error("Invalid current price for fair valuation");
    }

    // 1. Historical Weighted Base
    let weightedBase = numericCurrentPrice;

    if (Array.isArray(priceHistory) && priceHistory.length > 0) {
        const validHistory = priceHistory
            .map((item) => ({
                price: Number(item.price),
                timestamp: new Date(item.recorded_at || item.recordedAt).getTime()
            }))
            .filter((item) => Number.isFinite(item.price) && item.price > 0 && !Number.isNaN(item.timestamp))
            .sort((a, b) => a.timestamp - b.timestamp);

        if (validHistory.length > 0) {
            // Apply exponential recency weights: recent entries carry more weight
            let totalWeight = 0;
            let weightedSum = 0;

            validHistory.forEach((item, index) => {
                const weight = Math.pow(1.25, index + 1);
                weightedSum += item.price * weight;
                totalWeight += weight;
            });

            const histWeightedAvg = weightedSum / totalWeight;

            // Blend 65% historical moving average + 35% current listed price
            weightedBase = (histWeightedAvg * 0.65) + (numericCurrentPrice * 0.35);
        }
    }

    // 2. Condition Multiplier
    const conditionNorm = String(condition || "").toLowerCase().trim();
    let conditionMultiplier = 1.0;

    if (conditionNorm.includes("mint") || conditionNorm.includes("new")) {
        conditionMultiplier = 1.05; // +5%
    } else if (conditionNorm.includes("excellent")) {
        conditionMultiplier = 1.0;
    } else if (conditionNorm.includes("very good")) {
        conditionMultiplier = 0.95; // -5%
    } else if (conditionNorm.includes("good")) {
        conditionMultiplier = 0.90; // -10%
    } else if (conditionNorm.includes("fair")) {
        conditionMultiplier = 0.85; // -15%
    }

    // 3. Rarity Multiplier
    const rarityNorm = String(rarity || "").toLowerCase().trim();
    let rarityMultiplier = 1.0;

    if (rarityNorm.includes("ultra") || rarityNorm.includes("one of a kind") || rarityNorm.includes("1 of")) {
        rarityMultiplier = 1.08; // +8%
    } else if (rarityNorm.includes("high") || rarityNorm.includes("rare")) {
        rarityMultiplier = 1.04; // +4%
    } else if (rarityNorm.includes("medium")) {
        rarityMultiplier = 1.0;
    } else if (rarityNorm.includes("low") || rarityNorm.includes("common")) {
        rarityMultiplier = 0.96; // -4%
    }

    // 4. Calculate Final Fair Price
    const fairPrice = Math.round(weightedBase * conditionMultiplier * rarityMultiplier);

    // 5. Valuation Deviation
    const difference = numericCurrentPrice - fairPrice;
    const deviationPercent = Number((((numericCurrentPrice - fairPrice) / fairPrice) * 100).toFixed(2));

    // 6. Valuation Status Classification
    let valuationStatus = "fairly_valued";
    let valuationLabel = "Fairly Valued";
    let statusSummary = "Currently trading in equilibrium with market fundamentals and collector demand.";

    if (deviationPercent <= -3.0) {
        valuationStatus = "undervalued";
        valuationLabel = "Undervalued";
        statusSummary = `Trading ${Math.abs(deviationPercent)}% below estimated fair market value. Strong acquisition opportunity.`;
    } else if (deviationPercent >= 3.0) {
        valuationStatus = "overvalued";
        valuationLabel = "Overvalued";
        statusSummary = `Trading ${deviationPercent}% above estimated fair market value. Carries a secondary market scarcity premium.`;
    }

    // 7. Deal Score (Scale of 1.0 to 10.0)
    // Baseline 7.0; higher score means more undervalued/favorable investment
    let dealScore = 7.0 - (deviationPercent * 0.4);
    dealScore = Math.max(1.0, Math.min(9.8, Number(dealScore.toFixed(1))));

    return {
        currentPrice: numericCurrentPrice,
        fairPrice,
        difference,
        deviationPercent,
        valuationStatus,
        valuationLabel,
        dealScore,
        statusSummary,
        factors: {
            conditionMultiplier,
            rarityMultiplier,
            condition,
            rarity
        }
    };
};
