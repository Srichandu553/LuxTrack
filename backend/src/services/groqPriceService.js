import groq from "../config/groq.js";

export const getGroqPrice = async (asset) => {
    const prompt = `
Analyze the following luxury asset price information.

Asset:
${asset.brand} ${asset.name}
Model: ${asset.model || "N/A"}
Category: ${asset.category}

Current LuxTrack price: ₹${asset.current_price}

Return ONLY valid JSON:

{
  "price": null,
  "currency": "INR",
  "source": "Not provided",
  "priceType": "reference"
}

Important:
- Do NOT search the web.
- Do NOT invent a price.
- This service will receive a reference price from an external price-data source later.
- For now, price must remain null.
`;

    const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
            {
                role: "user",
                content: prompt
            }
        ],
        temperature: 0,
        max_tokens: 100
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
        throw new Error("No response received from Groq");
    }

    const cleanedContent = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleanedContent);
    } catch {
        console.error("Groq response:", content);
        throw new Error("Groq returned invalid JSON");
    }
};