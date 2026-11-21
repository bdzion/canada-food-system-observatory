import { useMemo, useState } from "react";
import AlertMap from "../components/AlertMap";
import { Evidence } from "../components/Badges";
import { useData } from "../lib/data";
import { longDate } from "../lib/format";
import { href } from "../lib/router";
import type { EventItem } from "../lib/types";
import { isNew, lastVisit } from "../lib/visit";

const KINDS: [string, string][] = [["all", "All"], ["weather_alert", "Weather alerts"], ["recall", "Food recalls"], ["gov_notice", "Government announcements"], ["global_hazard", "Global hazards"]];
const HAZ: Record<string, string> = { allergen: "Undeclared allergen", microbial: "Microbial contamination", physical: "Foreign material", chemical: "Chemical", quality: "Quality", other: "Other", unspecified: "Not stated" };
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
      <div className="eyebrow">News & Event Watch</div>
      <h1>Official alerts and notices</h1>
      <p className="lede">Events, not headlines: each item comes from an official feed, keeps its source link, and says what it does not establish. A notice shows that something was announced or forecast. It does not show that the food system was affected.</p>
      <div className="notice">This first release uses official feeds only (ECCC, CFIA, the Government of Canada News Centre and GDACS). News reports are not yet included, and no item has been reviewed by an analyst.</div>
      <div className="chips" role="group" aria-label="Type of event">
        {KINDS.map(([k, l]) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{l} <span className="muted">({k === "all" ? data.items.length : data.items.filter((e) => e.kind === k).length})</span></button>)}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <label>Period <select value={days} onChange={(e) => setDays(+e.target.value)}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={120}>Last 120 days</option><option value={365}>Everything in this release</option></select></label>
        <input type="search" placeholder="Search titles, places, hazards" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" />
        {visit && <label><input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} /> Only new since my last visit</label>}
        <span className="muted small">{items.length} shown</span>
      </div>
      {(kind === "weather_alert" || kind === "all" || showWorld) && (
        <div className="panel">
          <AlertMap geo={showWorld ? null : geo} points={showWorld || kind === "all" ? pts : []} world={showWorld} height={340} />
          <p className="small muted" style={{ marginTop: 6 }}>{showWorld ? "GDACS orange and red alerts. Points mark the event centre, not the affected area." : "Polygons: ECCC alert areas in effect at the latest data release (warning = red, watch = orange, advisory = brown, statement = purple)."}</p>
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
            {e.kind === "recall" && <p className="small">Hazard: {HAZ[e.hazard] || e.hazard}{e.issue ? ` (${e.issue})` : ""}{e.recall_class ? ` · ${e.recall_class}` : ""}</p>}
            {e.kind === "global_hazard" && (
              <p className="small">{e.event_type} · GDACS {e.alert_level} alert{e.severity_text ? ` · ${e.severity_text}` : ""}{e.is_current ? " · current" : ""}<br />
                {e.canada_link?.level === "L1" ? <>Canadian link: <b>L1 supplier connection</b> — {e.canada_link.commodities.slice(0, 3).map((c: any) => `${c.label} (${c.country}, ${(c.share * 100).toFixed(0)}% of imports, ${c.year})`).join("; ")}. <a href={href("/exposure")}>What this means →</a></>
                  : <>Canadian link: L0 — no connection established from tracked imports.</>}</p>
            )}
            <p className="small muted">{e.impact_status === "not_applicable" ? "Announcement: records what a department said or plans; effects are not assessed." : "Effect on Canada's food system: not established."}</p>
          </article>
        ))}
        {!items.length && <p className="empty">Nothing matches these filters.</p>}
      </div>
    </>
  );
}
