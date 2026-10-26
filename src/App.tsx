import { useState } from "react";
import { appConfig } from "./config";

const NAV = [
  { id: "map", label: "Map & Leads", enabled: true },
  { id: "leads", label: "CRM Leads", enabled: true },
  { id: "agent", label: "Ask the Agent", enabled: true },
  { id: "outreach", label: "Outreach", enabled: false },
  { id: "pipeline", label: "Sales Pipeline", enabled: false },
  { id: "reports", label: "Reports", enabled: false },
];

export default function App() {
  const [active, setActive] = useState("map");
  return (
    <div className="shell">
      <aside className="nav">
        <h1>Roofing CRM</h1>
        {NAV.map((n) => (
          <button
            key={n.id}
            disabled={!n.enabled}
            className={n.id === active ? "active" : ""}
            onClick={() => setActive(n.id)}
            title={n.enabled ? undefined : "Coming soon"}
          >
            {n.label}
          </button>
        ))}
      </aside>
      <main className="main">
        <h2>{NAV.find((n) => n.id === active)?.label}</h2>
        <p>Placeholder. Default area: {appConfig.county.name}.</p>
      </main>
    </div>
  );
}
