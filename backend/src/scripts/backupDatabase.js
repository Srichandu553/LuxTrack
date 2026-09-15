import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const output = process.argv[2] || `luxtrack-${new Date().toISOString().replace(/[:.]/g, "-")}.backup`;
const args = process.env.DATABASE_URL
    ? ["--dbname", process.env.DATABASE_URL, "--format=custom", "--file", output]
    : ["-h", process.env.DB_HOST || "localhost", "-p", String(process.env.DB_PORT || 5432), "-U", process.env.DB_USER || "postgres", "-d", process.env.DB_NAME || "luxtrack", "--format=custom", "--file", output];

if (fs.existsSync(path.resolve(output))) throw new Error(`Backup file already exists: ${output}`);
const child = spawn("pg_dump", args, { stdio: "inherit", shell: false });
child.on("error", (error) => { console.error(`Unable to run pg_dump: ${error.message}`); process.exitCode = 1; });
child.on("exit", (code) => { if (code === 0) console.log(`Backup created: ${output}`); else process.exitCode = code || 1; });
