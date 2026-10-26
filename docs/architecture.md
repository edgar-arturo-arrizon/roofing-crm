# Architecture

## Stack
- Vite + React + TypeScript, single static site (no server to run or pay for).
- MapLibre GL JS with OSM raster tiles (no API key).
- DuckDB-WASM in the browser queries Parquet directly (HTTP range reads).
- Leads in `localStorage` (deliberate MVP choice; later move to a small persistent store, e.g. Cloudflare D1/KV behind the Worker).
- Hosting: Cloudflare Pages free tier. One small Cloudflare Worker (`worker/`, stub only) will proxy the future LLM agent call so the API key never ships to the browser.

## Data flow
```
Nassau County DuckDB (sibling pipeline repo)
   | scripts/export-parquet (dev-time, local only)
   v
public/data/*.parquet  --(later)-->  published to IPFS (CIDs)
   |                                    |
   +------------- config.dataSource ----+
   v
Browser: DuckDB-WASM  ->  SQL over Parquet (radius, roof age, open permits)
   v
React + MapLibre UI  ->  leads in localStorage
```
`.duckdb` files and `*.parquet` are git-ignored; each developer exports locally.

## "Oracle carries no infrastructure cost"
The pipeline's output is static Parquet published to IPFS. Oracle runs no API, database server, or query service at request time: all querying happens in the user's browser (DuckDB-WASM), the site is static files on Cloudflare Pages' free tier, and data is served by IPFS gateways/pins. The only compute is the optional LLM Worker, which is outside Oracle and request-metered on the free tier.

## Config swap
`src/config.ts` exports one `dataSource` value:
- `{ kind: "local", basePath: "/data" }` -> `/data/<table>.parquet`
- `{ kind: "ipfs", gateway: "https://ipfs.io", cids: { parcels: "<cid>", ... } }` -> `<gateway>/ipfs/<cid>`

Switching is changing that one value (or `VITE_DATA_SOURCE=ipfs`). All code builds URLs through `tableUrl(table)`.

## Export script
`npm run export:parquet -- --db /path/to/nassau.duckdb` (or `DUCKDB_PATH`) runs `scripts/export-parquet.mjs`, which opens the DB read-only with the native `duckdb` Node package and runs `COPY (SELECT * FROM <table>) TO 'public/data/<table>.parquet' (FORMAT PARQUET, COMPRESSION ZSTD)` for each table in the contract. Output uses the same Parquet path the app will use via IPFS.

## Assumed table/column contract (TODO: confirm against the real schema)
All names below are ASSUMPTIONS.
- `parcels`: parcel_id, address, city, zip, lat, lon, property_type (residential/commercial), year_built  -- TODO: confirm lat/lon exist on parcels vs. separate geometry table.
- `permits`: permit_id, parcel_id, permit_type, status, opened_date, closed_date, contractor_id  -- TODO: how "roofing" permits are identified (type vs description); status vocabulary for "open".
- `ownership`: parcel_id, owner_name, mailing_address  -- TODO: confirm privacy/usage constraints.
- `roof_age`: parcel_id, roof_age_years, roof_install_year, confidence, source  -- TODO: confirm estimate method and whether it is a table or a column.
- `contractors`: contractor_id, name, license_no, bbb_rating, bbb_score  -- TODO: confirm BBB data lives here.
Radius search: haversine on lat/lon in SQL (DuckDB `spatial` extension optional).
