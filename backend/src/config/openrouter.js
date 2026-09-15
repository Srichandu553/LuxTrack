import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 20000);

const openRouter = async (messages) => {
    if (!OPENROUTER_API_KEY) {
        throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

    try {
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: "openrouter/free",
                    messages,
                    max_tokens: 300,
                    temperature: 0
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `OpenRouter request failed: ${response.status} ${errorText}`
            );
        }

        return response.json();
    } finally {
        clearTimeout(timeout);
    }
};

export default openRouter;
