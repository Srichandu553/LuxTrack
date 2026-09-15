import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const requiredDbEnv = process.env.DATABASE_URL
  ? ["DATABASE_URL"]
  : ["DB_USER", "DB_HOST", "DB_NAME", "DB_PASSWORD"];

const missingDbEnv = requiredDbEnv.filter((key) => !process.env[key]);
const hasPlaceholderPassword = [
  "your_db_password",
  "your-password",
  "change-me",
  "changeme"
].includes((process.env.DB_PASSWORD || "").trim().toLowerCase());

if (missingDbEnv.length > 0) {
  console.warn(
    `Missing DB environment variables: ${missingDbEnv.join(", ")}. Database features will be unavailable until they are configured.`
  );
}

if (hasPlaceholderPassword) {
  console.warn(
    "DB_PASSWORD is still a placeholder. Set the real PostgreSQL password in backend/.env before running database commands."
  );
}

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
    }
  : {
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "luxtrack",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT || 5432),
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000)
    };

const pool = new Pool(poolConfig);

export const checkDatabaseConnection = async () => {
  let client;

  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("✅ PostgreSQL Connected");
    return true;
  } catch (error) {
    const detail = {
      "28P01": "invalid PostgreSQL credentials",
      "3D000": "database does not exist",
      ECONNREFUSED: "database unavailable or PostgreSQL is not running",
      ETIMEDOUT: "database connection timed out"
    }[error.code] || "database connection failed";

    console.error(`❌ PostgreSQL ${detail}.`);
    return false;
  } finally {
    client?.release();
  }
};

export const getDatabaseHealth = async () => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok" };
  } catch {
    return { status: "unavailable" };
  }
};

export default pool;