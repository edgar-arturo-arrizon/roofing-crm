// Single place to choose where data comes from. Swap local -> IPFS by changing `dataSource`
// (or setting VITE_DATA_SOURCE=ipfs at build time).

export type TableName = "properties" | "permits";

export type DataSource =
  | { kind: "local"; basePath: string }
  | { kind: "ipfs"; gateway: string; cids: Record<TableName, string> };

const local: DataSource = { kind: "local", basePath: "/data" };

const ipfs: DataSource = {
  kind: "ipfs",
  gateway: "https://ipfs.io",
  // TODO: fill in once the pipeline publishes Parquet to IPFS.
  cids: { properties: "", permits: "" },
};

export const dataSource: DataSource = import.meta.env.VITE_DATA_SOURCE === "ipfs" ? ipfs : local;

export const appConfig = {
  county: { name: "Nassau County, NY", center: [-73.5251, 40.7684] as [number, number], zoom: 12 }, // Hicksville: where the permit data is concentrated
  defaults: { roofAgeYears: 15, radiusMiles: 1 },
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
};

/** URL of the Parquet file for a table; the only place data URLs are built. */
export function tableUrl(table: TableName): string {
  if (dataSource.kind === "local") return `${dataSource.basePath}/${table}.parquet`;
  return `${dataSource.gateway}/ipfs/${dataSource.cids[table]}`;
}
