import { useMemo, useState } from "react";
import AlertMap from "../components/AlertMap";
import { Evidence } from "../components/Badges";
import { useData } from "../lib/data";
import { longDate } from "../lib/format";
import { href } from "../lib/router";
import type { EventItem } from "../lib/types";
import { isNew, lastVisit } from "../lib/visit";

const KINDS: [string, string][] = [["all", "All"], ["weather_alert", "Weather alerts"], ["recall", "Food recalls"], ["gov_notice", "Government announcements"], ["global_hazard", "Disasters abroad"]];
const HAZ: Record<string, string> = { allergen: "an allergen not listed on the label", microbial: "possible bacteria or other germs", physical: "pieces of foreign material", chemical: "a chemical", quality: "quality", other: "other", unspecified: "not stated" };
// Recall classes as defined by the Canadian Food Inspection Agency.
const RISK: Record<string, string> = { "Class 1": "high health risk", "Class 2": "moderate health risk", "Class 3": "low health risk" };
const PROV: Record<string, string> = { AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon", CA: "Canada" };

export default function Events({ query }: { query: URLSearchParams }) {
  const { data } = useData<{ items: EventItem[] }>("events.json");
  const { data: geo } = useData("weather-alerts.geojson");
  const [kind, setKind] = useState(query.get("kind") || "all");
  const [days, setDays] = useState(query.get("new") ? 365 : 30);
  const [q, setQ] = useState("");
  const [onlyNew, setOnlyNew] = useState(!!query.get("new"));
  const visit = lastVisit();
  const items = useMemo(() => {
    if (!data) return [];
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const t = q.trim().toLowerCase();
    return data.items.filter((e) => (kind === "all" || e.kind === kind) &&
      (e.kind === "weather_alert" || (e.date || "") >= since || (e.kind === "global_hazard" && e.is_current)) &&
      (!t || `${e.title} ${e.place} ${e.issuer} ${e.issue || ""}`.toLowerCase().includes(t)) && (!onlyNew || isNew(e.id)));
  }, [data, kind, days, q, onlyNew]);
  if (!data) return <p className="muted">Loading…</p>;
  const pts = items.filter((e) => e.kind === "global_hazard" && e.point).map((e) => ({ lat: e.point[1], lon: e.point[0], title: e.title, level: e.alert_level, url: e.url, link: e.canada_link?.phrase }));
  const showWorld = kind === "global_hazard";
  return (
    <>
      <p className="small"><a href={href("/threats")}>← Step 3: The threats</a></p>
      <div className="eyebrow">Step 3 · The threats</div>
      <h1>Warnings and notices</h1>
      <p className="lede">Official weather alerts, food recalls and government announcements, collected automatically. Each item links to the original. A warning or notice tells you that something was forecast or announced. It does not tell you whether food supply was affected.</p>
      <div className="notice">Sources: Environment and Climate Change Canada, the Canadian Food Inspection Agency, the Government of Canada News Centre, and the Global Disaster Alert and Coordination System. News reports are not yet included, and no item has been checked by an analyst.</div>
      <div className="chips" role="group" aria-label="Type of event">
        {KINDS.map(([k, l]) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{l} <span className="muted">({k === "all" ? data.items.length : data.items.filter((e) => e.kind === k).length})</span></button>)}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <label>Period <select value={days} onChange={(e) => setDays(+e.target.value)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={120}>Last 120 days</option><option value={365}>Everything in this release</option></select></label>
        <input type="search" placeholder="Search by word or place" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" />
        {visit && <label><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> Only new since my last visit</label>}
        <span className="muted small">{items.length} shown</span>
      </div>
      {(kind === "weather_alert" || kind === "all" || showWorld) && (
        <div className="panel">
          <AlertMap geo={showWorld ? null : geo} points={showWorld || kind === "all" ? pts : []} world={showWorld} height={340} />
          <p className="small muted" style={{ marginTop: 6 }}>{showWorld ? "Serious disasters listed by the Global Disaster Alert and Coordination System. Each dot marks the centre of the event, not the whole area affected." : "Coloured areas show weather alerts in effect at our last update: warnings in red, watches in orange, advisories in brown, special statements in purple."}</p>
        </div>
      )}
      <div>
        {items.slice(0, 200).map((e) => (
          <article key={e.id} className={`card${isNew(e.id) ? " isnew" : ""}`}>
            <div className="meta">
              {isNew(e.id) && <span className="pill new">New since last visit</span>}
              <Evidence cls={e.evidence_class} />
              <span>{e.issuer}</span><span>·</span><span>{e.kind === "weather_alert" ? `issued ${longDate(e.date)}, until ${longDate(e.end)}` : longDate(e.date)}</span>
              {e.place && <><span>·</span><span>{PROV[e.place] || e.place}</span></>}
            </div>
            <h4><a href={e.url}>{e.title}</a></h4>
            {e.kind === "weather_alert" && <p className="small">{e.n_areas} forecast area{e.n_areas === 1 ? "" : "s"}: {e.areas.join("; ")}{e.n_areas > e.areas.length ? "…" : ""}</p>}
            {e.kind === "recall" && <p className="small">Reason: {HAZ[e.hazard] || e.hazard}{e.issue ? ` (${e.issue})` : ""}{e.recall_class ? ` · ${e.recall_class}${RISK[e.recall_class] ? ` (${RISK[e.recall_class]})` : ""}` : ""}</p>}
            {e.kind === "global_hazard" && (
              <p className="small">{e.event_type} · {e.alert_level === "Red" ? "red alert (most serious)" : "orange alert (serious)"}{e.severity_text ? ` · ${e.severity_text}` : ""}{e.is_current ? " · still under way" : ""}<br />
                {e.canada_link?.level === "L1" ? <><b>Canada buys from here:</b> {e.canada_link.commodities.slice(0, 3).map((c: any) => `${c.label.toLowerCase()} (${(c.share * 100).toFixed(0)}% of Canada's imports in ${c.year})`).join("; ")}. <a href={href("/threats/abroad")}>What this means →</a></>
                  : <>We found no direct link: Canada buys little or none of the products we track from here.</>}</p>
            )}
            <p className="small muted">{e.impact_status === "not_applicable" ? "An announcement of what a department said or plans to do. We do not assess its effects." : "Effect on Canada's food supply: not known."}</p>
          </article>
        ))}
        {!items.length && <p className="empty">Nothing matches these filters.</p>}
      </div>
    </>
  );
}
