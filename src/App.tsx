import { useEffect, useMemo, useState } from "react";
import { appConfig } from "./config";
import Controls from "./components/Controls";
import DetailPanel from "./components/DetailPanel";
import LeadList from "./components/LeadList";
import LeadsView from "./components/LeadsView";
import MapView from "./components/MapView";
import { useLeads } from "./lib/leads";
import { agingRoofs, MAX_ROWS, openPermits, permitCounts } from "./lib/queries";
import type { PermitFilter, PermitLead, Pin, Property } from "./lib/types";

const NAV = [
  { id: "map", label: "Map & Leads", enabled: true },
  { id: "leads", label: "CRM Leads", enabled: true },
  { id: "agent", label: "Ask the Agent", enabled: true },
  { id: "outreach", label: "Outreach", enabled: false },
  { id: "pipeline", label: "Sales Pipeline", enabled: false },
  { id: "reports", label: "Reports", enabled: false },
];

const HICKSVILLE: Pin = { lat: appConfig.county.center[1], lon: appConfig.county.center[0] };

export default function App() {
  const [active, setActive] = useState("map");
  const [pin, setPin] = useState<Pin>(HICKSVILLE);
  const [radius, setRadius] = useState<number>(appConfig.defaults.radiusMiles);
  const [roofAge, setRoofAge] = useState<number>(appConfig.defaults.roofAgeYears);
  const [permitFilter, setPermitFilter] = useState<PermitFilter>("roofing");
  const [tab, setTab] = useState<"roofs" | "permits">("roofs");
  const [roofs, setRoofs] = useState<Property[]>([]);
  const [roofsTotal, setRoofsTotal] = useState(0);
  const [permits, setPermits] = useState<PermitLead[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { leads, add, update, remove, has } = useLeads();

  // Debounce so dragging a slider or pin doesn't fire a query per tick.
  useEffect(() => {
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      Promise.all([agingRoofs(pin, radius, roofAge), openPermits(pin, radius, permitFilter), permitCounts(pin, radius)])
        .then(([r, p, c]) => { if (!live) return; setRoofs(r.rows); setRoofsTotal(r.total); setPermits(p); setCounts(c); setError(null); })
        .catch((e) => live && setError(String(e?.message ?? e)))
        .finally(() => live && setLoading(false));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [pin, radius, roofAge, permitFilter]);

  const mapRoofs = useMemo(() => roofs, [roofs]);

  return (
    <div className="shell">
      <aside className="nav">
        <h1>Roofing CRM</h1>
        {NAV.map((n) => (
          <button key={n.id} disabled={!n.enabled} className={n.id === active ? "active" : ""} onClick={() => setActive(n.id)} title={n.enabled ? undefined : "Coming soon"}>
            {n.label}{!n.enabled && <small> · soon</small>}
          </button>
        ))}
        <small className="navfoot">{leads.length} saved lead{leads.length === 1 ? "" : "s"}</small>
      </aside>
      {active === "map" && (
        <main className="mapPage">
          <div className="side">
            <h2>{appConfig.county.name}</h2>
            <Controls pin={pin} radius={radius} roofAge={roofAge} permitFilter={permitFilter}
              onRadius={setRadius} onRoofAge={setRoofAge} onPermitFilter={setPermitFilter} onPin={setPin} />
            <LeadList tab={tab} onTab={setTab} roofs={roofs} roofsTotal={roofsTotal} permits={permits} loading={loading} error={error}
              selectedKey={selected} onSelect={setSelected} permitCounts={counts} permitFilter={permitFilter}
              onWiden={() => { setPermitFilter("roofing_low"); setTab("permits"); }} maxRows={MAX_ROWS} />
          </div>
          <div className="mapWrap">
            <MapView pin={pin} radiusMiles={radius} roofs={mapRoofs} permits={permits} selectedKey={selected} onPin={setPin} onSelect={setSelected} />
            <div className="legend"><span className="dot amber" /> Roof ≥ {roofAge} yrs <span className="dot red" /> Open permit</div>
            {selected && <DetailPanel propertyKey={selected} onClose={() => setSelected(null)} hasLead={has} onAddLead={add} />}
          </div>
        </main>
      )}
      {active === "leads" && (
        <main className="page"><h2>CRM Leads</h2><LeadsView leads={leads} pin={pin} radius={radius} onUpdate={update} onRemove={remove} /></main>
      )}
      {active === "agent" && (
        <main className="page"><h2>Ask the Agent</h2>
          <p className="muted">The natural-language agent is a separate step (it will call the Cloudflare Worker stub). The data it will query is the same Parquet used by the map.</p></main>
      )}
    </div>
  );
}
