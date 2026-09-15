import openRouter from "../config/openrouter.js";

// Search for a current/reference price of a luxury car
export const getCarPrice = async (asset) => {
    const prompt = `
Find the current official or reliable market/reference price in India for this luxury car.

Car:
Brand: ${asset.brand}
Name: ${asset.name}
Model: ${asset.model || "N/A"}

Requirements:
- Search the web.
- Prefer the official manufacturer website or official Indian dealer.
- If an official Indian price is unavailable, use a reputable automotive source.
- Return the actual price for this exact car/model.
- Do NOT invent, estimate, multiply, or convert a price unless the source explicitly gives the INR price.
- Be careful with Indian numbering and extra zeros.
- Return the numeric price in plain INR number format.
- Example: ₹2,11,29,000 = 21129000.
- Example: ₹21,129,000 = 21129000.
- Do NOT return 211290000 if the source price is ₹21,129,000.

Return ONLY a JSON object in this format:

{
  "price": null,
  "currency": "INR",
  "source": "Not found",
  "priceType": "market_reference",
  "confidence": "low"
}

If you find a reliable price, replace null with the numeric INR price.
`;

    const response = await openRouter([
        {
            role: "user",
            content: prompt
        }
    ]);

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("No response received from OpenRouter");
    }

    console.log("OpenRouter raw response:", content);

    // Find the JSON object inside the response
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("OpenRouter did not return a JSON object");
    }

    const jsonText = content.substring(
        jsonStart,
        jsonEnd + 1
    );

    let result;

    try {
        result = JSON.parse(jsonText);
    } catch (error) {
        console.error("OpenRouter JSON:", jsonText);
        throw new Error("OpenRouter returned invalid JSON");
    }

    // Validate returned price
    if (result.price !== null) {
        const price = Number(result.price);

        if (!Number.isFinite(price) || price <= 0) {
            throw new Error("OpenRouter returned an invalid car price");
        }

        result.price = Math.round(price);

        // Prevent obvious extra-zero errors
        if (result.price > 100000000) {
            throw new Error(
                `Returned car price looks invalid: ₹${result.price}`
            );
        }
    }

    // Clean Markdown links returned by the AI
    if (typeof result.source === "string") {
        const markdownLink = result.source.match(
            /\[[^\]]+\]\((https?:\/\/[^)]+)\)/
        );

        if (markdownLink) {
            result.source = markdownLink[1];
        }
    }

    return result;
};