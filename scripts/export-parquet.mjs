// Dev-time: export tables from a local DuckDB file to public/data/*.parquet.
// Usage: npm run export:parquet -- --db /path/to/nassau.duckdb [--out public/data]
import { DuckDBInstance } from "@duckdb/node-api";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

// TODO: confirm table names against the real schema (see docs/architecture.md).
const TABLES = ["parcels", "permits", "ownership", "roof_age", "contractors"];

const args = process.argv.slice(2);
const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const dbPath = arg("--db") ?? process.env.DUCKDB_PATH;
const outDir = resolve(arg("--out") ?? "public/data");
if (!dbPath) { console.error("Missing --db <file.duckdb> (or DUCKDB_PATH)"); process.exit(1); }

mkdirSync(outDir, { recursive: true });
const instance = await DuckDBInstance.create(resolve(dbPath), { access_mode: "READ_ONLY" });
const conn = await instance.connect();

for (const t of TABLES) {
  const file = `${outDir}/${t}.parquet`;
  try {
    await conn.run(`COPY (SELECT * FROM "${t}") TO '${file}' (FORMAT PARQUET, COMPRESSION ZSTD)`);
    console.log(`exported ${t} -> ${file}`);
  } catch (e) {
    console.warn(`skipped ${t}: ${e.message}`);
  }
}
conn.closeSync();
