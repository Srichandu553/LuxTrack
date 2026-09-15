import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool, { checkDatabaseConnection } from "../config/db.js";

const currentFile = fileURLToPath(import.meta.url);
const migrationsDirectory = path.resolve(
    path.dirname(currentFile),
    "../../migrations"
);

try {
    if (!await checkDatabaseConnection()) {
        process.exitCode = 1;
    } else {
        const migrationFiles = (await fs.readdir(migrationsDirectory))
            .filter((file) => file.endsWith(".sql"))
            .sort();

        for (const file of migrationFiles) {
            const sql = await fs.readFile(
                path.join(migrationsDirectory, file),
                "utf8"
            );
            await pool.query(sql);
            console.log(`✅ Applied migration: ${file}`);
        }

        console.log(`✅ Database setup complete (${migrationFiles.length} migration(s)).`);
    }
} catch (error) {
    console.error("❌ Database migration failed:", error.message || error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
