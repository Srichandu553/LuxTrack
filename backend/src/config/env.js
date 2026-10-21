import dotenv from "dotenv";

dotenv.config();

const normalizeList = (value = "") =>
    (value || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

const getRequiredInProduction = (name) => {
    const value = process.env[name];
    if (process.env.NODE_ENV === "production" && (!value || value.includes("your_") || value.includes("replace-with"))) {
        throw new Error(`Missing or placeholder production environment variable: ${name}`);
    }
    return value;
};

export const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 5000),
    authSecret: getRequiredInProduction("AUTH_SECRET") || "development-secret-at-least-32-characters",
    frontendOrigins: normalizeList(process.env.FRONTEND_URL || "http://localhost:5173"),
    databaseUrl: process.env.DATABASE_URL || null,
    dbUser: process.env.DB_USER || "postgres",
    dbHost: process.env.DB_HOST || "localhost",
    dbName: process.env.DB_NAME || "luxtrack",
    dbPassword: process.env.DB_PASSWORD || "",
    dbPort: Number(process.env.DB_PORT || 5432),
    dbConnectionTimeoutMs: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
    validateRuntimeEnvironment() {
        if (this.nodeEnv !== "production") return true;

        const configured = Boolean(this.databaseUrl || (this.dbUser && this.dbHost && this.dbName));
        if (!configured) {
            throw new Error("Production requires DATABASE_URL or DB_* PostgreSQL settings.");
        }
        if (!this.authSecret || this.authSecret.length < 32) {
            throw new Error("Production requires AUTH_SECRET with at least 32 characters.");
        }
        if (this.frontendOrigins.length === 0) {
            throw new Error("Production requires FRONTEND_URL to be configured.");
        }

        return true;
    }
};

export default env;
