import groq from "../config/groq.js";

// Analyze luxury asset price comparison
export const analyzePrice = async ({
    name,
    brand,
    model,
    category,
    currentPrice,
    referencePrice,
    source
}) => {
    const prompt = `
Analyze this luxury asset price information.

Asset:
Name: ${name}
Brand: ${brand}
Model: ${model || "N/A"}
Category: ${category}

LuxTrack current price: ₹${currentPrice}
Reference price: ₹${referencePrice}
Reference source: ${source}

Calculate:
1. Difference = current price - reference price
2. Whether LuxTrack price is higher, lower, or equal
3. A short price assessment

Return ONLY valid JSON.
Do not use markdown.
Do not include any text before or after the JSON.

Use exactly this structure:

{
  "difference": 0,
  "status": "higher",
  "assessment": "short explanation"
}

Possible status values:
- "higher"
- "lower"
- "equal"
`;

    try {
        const response = await groq.chat.completions.create({
            model: "qwen/qwen3.8-27b",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0,
            max_tokens: 300
        });

        const content = response.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("No response received from Groq");
        }

        const cleanedContent = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const result = JSON.parse(cleanedContent);

        if (
            typeof result.difference !== "number" ||
            !["higher", "lower", "equal"].includes(result.status) ||
            typeof result.assessment !== "string"
        ) {
            throw new Error("Invalid analysis structure");
        }

        return {
            difference: result.difference,
            status: result.status,
            assessment: result.assessment
        };

    } catch (error) {
        console.error("Groq analyzePrice fallback triggered:", error.message);
        const diff = Number(currentPrice) - Number(referencePrice);
        const status = diff > 0 ? "higher" : diff < 0 ? "lower" : "equal";
        return {
            difference: diff,
            status,
            assessment: `Current LuxTrack valuation is ₹${Math.abs(diff).toLocaleString("en-IN")} ${status} than ${source} benchmark reference.`
        };
    }
};

/**
 * Generate Comprehensive AI Valuation & Market Analysis for an Asset
 */
export const generateAIAssetAnalysis = async ({ asset, valuation }) => {
    const prompt = `
You are a senior luxury asset valuation analyst for LuxTrack.
Analyze this luxury asset and its valuation data:

Asset:
- Name: ${asset.name}
- Brand: ${asset.brand}
- Model: ${asset.model || "N/A"}
- Category: ${asset.category}
- Condition: ${asset.condition || "Excellent"}
- Rarity: ${asset.rarity || "Medium"}
- Current Market Price: ₹${valuation.currentPrice}
- Estimated Fair Price: ₹${valuation.fairPrice}
- Deviation: ${valuation.deviationPercent}% (${valuation.valuationLabel})
- Deal Score: ${valuation.dealScore} / 10

Return ONLY valid JSON matching this exact structure:
{
  "executiveSummary": "2-3 insightful sentences evaluating the asset's current valuation, collector appeal, and pricing dynamic in the Indian and global luxury secondary market.",
  "marketSentiment": "Bullish / Strong Collector Demand" (or "Consolidating / Selective Demand" or "Bearish / Price Resistance"),
  "investmentOutlook": "Concise 12-24 month outlook on value retention and capital preservation.",
  "keyDrivers": [
    "Key driver 1",
    "Key driver 2",
    "Key driver 3"
  ],
  "riskFactors": [
    "Risk factor 1",
    "Risk factor 2"
  ],
  "recommendation": "Strong Buy" (or "Accumulate / Hold" or "Wait for Price Correction")
}

Do not include any explanation or markdown tags. Return ONLY valid JSON.
`;

    try {
        const response = await groq.chat.completions.create({
            model: "qwen/qwen3.8-27b",
            messages: [
                {
                    role: "system",
                    content: "You are an elite luxury asset investment appraisal intelligence system. Always respond with pure valid JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 500
        });

        const content = response.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("No response from Groq");
        }

        const cleanedContent = content
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        const parsed = JSON.parse(cleanedContent);

        return {
            source: "Groq AI (Qwen 3.8)",
            executiveSummary: parsed.executiveSummary || valuation.statusSummary,
            marketSentiment: parsed.marketSentiment || "Stable / Neutral",
            investmentOutlook: parsed.investmentOutlook || "Expected to maintain capital preservation over 12-24 months.",
            keyDrivers: Array.isArray(parsed.keyDrivers) && parsed.keyDrivers.length > 0 ? parsed.keyDrivers : [
                `${asset.brand} heritage and brand equity`,
                `High demand in the ${asset.category} category`,
                `${asset.rarity} tier rarity grade`
            ],
            riskFactors: Array.isArray(parsed.riskFactors) && parsed.riskFactors.length > 0 ? parsed.riskFactors : [
                "Secondary market price liquidity variations",
                "Periodic dealer premium adjustments"
            ],
            recommendation: parsed.recommendation || (valuation.dealScore >= 7.5 ? "Accumulate / Hold" : "Wait for Price Correction")
        };

    } catch (error) {
        console.warn("Groq AI analysis fallback:", error.message);

        // Fallback intelligent market synthesis
        const isUnder = valuation.valuationStatus === "undervalued";
        const isOver = valuation.valuationStatus === "overvalued";

        return {
            source: "LuxTrack Market Intelligence Engine",
            executiveSummary: isUnder
                ? `The ${asset.name} is currently trading at an attractive ${Math.abs(valuation.deviationPercent)}% discount to calculated fair market value, representing a favorable acquisition entry point.`
                : isOver
                ? `The ${asset.name} commands an active ${valuation.deviationPercent}% market premium above baseline fair valuation, driven by brand cachet and immediate inventory scarcity.`
                : `The ${asset.name} trades at market parity with an optimal balance between historical price trajectory, ${asset.condition} condition grading, and ${asset.rarity} rarity status.`,
            marketSentiment: isUnder
                ? "Bullish / Strong Collector Accumulation"
                : isOver
                ? "Consolidating / Premium Price Resistance"
                : "Equilibrium / Balanced Market Demand",
            investmentOutlook: `Historically stable secondary market performance with healthy liquidity among certified ${asset.category} collectors over 12-24 months.`,
            keyDrivers: [
                `${asset.brand} global market prestige and brand equity`,
                `${asset.condition} certified condition benchmark`,
                `${asset.rarity} tier rarity index with restricted secondary supply`
            ],
            riskFactors: [
                "Market volatility in high-ticket luxury alternative assets",
                "Transaction fees and dealer spread considerations"
            ],
            recommendation: isUnder
                ? "Strong Buy"
                : isOver
                ? "Wait for Price Correction"
                : "Accumulate / Hold"
        };
    }
};