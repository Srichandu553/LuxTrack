import { seedCatalog } from "../data/catalogSeed.js";
import pool, { checkDatabaseConnection } from "../config/db.js";

try {
    if (!await checkDatabaseConnection()) {
        process.exitCode = 1;
    } else {
        const result = await seedCatalog();
        console.log("✅ Catalog seed complete");
        console.log(`Database connected`);
        console.log(`Existing products: ${result.existing}`);
        console.log(`Inserted: ${result.inserted}`);
        console.log(`Updated: ${result.updated}`);
        console.log(`Skipped: ${result.skipped}`);
        console.log(`Total products: ${result.total}`);
    }
} catch (error) {
    console.error("❌ Catalog seed failed:", error.message || error);
    process.exitCode = 1;
} finally {
    await pool.end();
}
