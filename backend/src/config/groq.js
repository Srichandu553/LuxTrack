import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const groqApiKey = process.env.GROQ_API_KEY || "";
const groqTimeoutMs = Number(process.env.GROQ_TIMEOUT_MS || 20000);

if (!groqApiKey) {
    console.warn("⚠️ GROQ_API_KEY is not configured. AI analysis will fall back to local logic.");
}

const groq = new Groq({
    apiKey: groqApiKey,
    timeout: groqTimeoutMs,
});

export default groq;