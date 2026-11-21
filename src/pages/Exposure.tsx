import { useMemo, useState } from "react";
import { Evidence } from "../components/Badges";
import { useData } from "../lib/data";
import { longDate, num, usdM } from "../lib/format";
import { href } from "../lib/router";
import type { EventItem } from "../lib/types";

const LEVELS = [
  ["L0", "No link found", "No tracked import comes from the affected country."],
  ["L1", "Supplier link", "Canada imports a tracked product from that country. Specific impact unknown."],
  ["L2", "Overlap", "The hazard overlaps where the product is grown or shipped."],
  ["L3", "Supply effect", "A reliable source confirms damage to that supply chain."],
  ["L4", "Canadian outcome", "Canadian data show a specified consequence."],
];
const GROUPS: Record<string, string> = { inputs: "Farm inputs", produce: "Fresh produce", staples: "Staples", protein: "Protein" };

function Ladder({ level }: { level: string }) {
  const n = level ? +level.slice(1) : -1;
  return (
    <div className="ladder" aria-label={`Evidence reached: ${level}`}>
      {LEVELS.map(([l, t, d], i) => <div key={l} className={i === n || (i > 0 && i <= n) ? "on" : i >= 2 ? "review" : ""}><b>{l} · {t}</b>{d}{i >= 2 && <div className="small" style={{ marginTop: 4 }}><i>Needs analyst review</i></div>}</div>)}
    </div>
  );
}

export default function Exposure() {
  const { data } = useData<any>("exposure.json");
  const { data: ev } = useData<{ items: EventItem[] }>("events.json");
  const [hs, setHs] = useState<string>("3105");
  const [evSel, setEvSel] = useState<string | null>(null);
  const hazards = useMemo(() => (ev?.items || []).filter((e) => e.kind === "global_hazard"), [ev]);
  if (!data || !ev) return <p className="muted">Loading…</p>;
  const linked = hazards.filter((e) => e.canada_link?.level === "L1");
  const sel = hazards.find((e) => e.id === evSel) || linked[0] || hazards[0];
  const c = data.commodities.find((x: any) => x.hs === hs) || data.commodities[0];
  const maxShare = Math.max(...(c?.partners || []).map((p: any) => p.share || 0), 0.01);
  const hazardIsos = new Set(hazards.flatMap((e) => (e.countries || []).map((x: any) => x.iso3)));
  const produce = data.produce_origins.filter((p: any) => p.link === hs);
  return (
    <>
      <div className="eyebrow">Global Exposure · the Canada relevance filter</div>
      <h1>Why could a disaster abroad matter here?</h1>
      <p className="lede">Most hazard feeds answer "what happened in the world?" This page asks a narrower question: is there a documented supply link to Canada, and how far does the evidence go? The answer climbs a ladder, one level at a time.</p>
      <Ladder level="" />
      <p className="small muted">The pipeline assigns only L0 or L1 automatically, because those need nothing but trade records. Levels 2 to 4 need evidence about places and effects that a rule cannot establish, so they are shown as review steps. A link at L1 is a reason to look, not evidence of harm.</p>

      <section className="panel" aria-labelledby="h-haz">
        <h2 id="h-haz">Current global hazards and their Canadian links</h2>
        <p className="small muted">GDACS orange and red alerts from the last {75} days. {linked.length} of {hazards.length} touch a country that supplied at least {Math.round(data.min_partner_share * 100)}% of Canada's imports of a tracked product.</p>
        <div className="chips" role="group" aria-label="Choose a hazard">
          {[...hazards].sort((a, b) => (b.canada_link?.level === "L1" ? 1 : 0) - (a.canada_link?.level === "L1" ? 1 : 0)).map((e) => <button key={e.id} className="chip" aria-pressed={sel?.id === e.id} onClick={() => setEvSel(e.id)}>{e.canada_link?.level === "L1" ? "● " : "○ "}{e.title.length > 64 ? e.title.slice(0, 62) + "…" : e.title}</button>)}
        </div>
        {sel && (
          <div className="card">
            <div className="meta"><Evidence cls="official_alert" /><span>GDACS {sel.alert_level} · {sel.event_type}</span><span>· {longDate(sel.date)}{sel.end && sel.end !== sel.date ? ` to ${longDate(sel.end)}` : ""}</span>{sel.canada_link?.level === "L1" && <Evidence cls="supplier_link" />}</div>
            <h4><a href={sel.url}>{sel.title}</a></h4>
            <p className="small">Affected: {sel.place}{sel.severity_text ? `. GDACS assessment: ${sel.severity_text}` : ""}</p>
            <Ladder level={sel.canada_link?.level || "L0"} />
            <p><b>{sel.canada_link?.phrase}</b></p>
            {sel.canada_link?.commodities?.length > 0 && (
              <div className="tablewrap"><table className="data">
                <thead><tr><th>Tracked product</th><th>Supplier</th><th className="num">Share of Canada's imports (value)</th><th>Year</th><th>Related stress test</th></tr></thead>
                <tbody>{sel.canada_link.commodities.map((x: any) => (
                  <tr key={x.hs + x.iso3}><td><button className="chip" onClick={() => setHs(x.hs)}>{x.label}</button> <span className="small muted">HS {x.hs}</span></td>
                    <td>{x.country}{x.large_country && <div className="small muted">Large country: the hazard may be far from where it is grown.</div>}</td>
                    <td className="num">{(x.share * 100).toFixed(1)}%</td><td>{x.year}</td>
                    <td>{x.scenario ? <a href={href(`/lab/${x.scenario}`)}>Open</a> : <span className="muted">none yet</span>}</td></tr>))}</tbody>
              </table></div>
            )}
            <h4 style={{ marginTop: 12 }}>What would move this further up the ladder?</h4>
            <ul>{(sel.canada_link?.next_evidence || []).map((q: string) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="h-com">
        <h2 id="h-com">Where Canada's imports come from</h2>
        <p className="small muted">UN Comtrade, imports reported by Canada, latest available year. Choose a product.</p>
        {Object.entries(GROUPS).map(([g, gl]) => (
          <div key={g} style={{ marginBottom: 4 }}><span className="small muted" style={{ marginRight: 8 }}>{gl}</span>
            {data.commodities.filter((x: any) => x.group === g).map((x: any) => <button key={x.hs} className="chip" style={{ margin: 2 }} aria-pressed={x.hs === hs} onClick={() => setHs(x.hs)}>{x.label}</button>)}
          </div>
        ))}
        {c && (
          <>
            <h3 style={{ marginTop: 14 }}>{c.label} <span className="small muted">HS {c.hs} · {c.year} · total {c.total_value_usd ? usdM(c.total_value_usd) : "—"}</span></h3>
            <div className="bars" role="table" aria-label={`Canada's ${c.label} imports by supplier, share of value`}>
              {c.partners.slice(0, 10).map((p: any) => (
                <div className="row" role="row" key={p.code}>
                  <span role="cell">{p.name}{hazardIsos.has(p.iso3) && <span className="pill" style={{ marginLeft: 6, borderColor: "var(--ready)" }} title="A current GDACS alert lists this country">hazard alert</span>}</span>
                  <span role="cell"><span className="bar" style={{ display: "block", width: `${(100 * (p.share || 0)) / maxShare}%`, background: hazardIsos.has(p.iso3) ? "var(--ready)" : "var(--act)" }} /></span>
                  <span role="cell" className="v">{((p.share || 0) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="small muted">Shares are by customs value in US dollars; the largest supplier by value need not be the largest by weight{c.partners[0]?.net_kg ? ` (top supplier: ${num(c.partners[0].net_kg / 1e6, 1)} thousand tonnes)` : ""}. Import share is not dependence: domestic production, stocks and other suppliers matter too. Goods shipped through the United States may be recorded as American.</p>
            {produce.length > 0 && <p>Tracked wholesale prices for this product: {produce.map((p: any) => <a key={p.id} href={href(`/indicators/produce_prices?product=${p.id}`)} style={{ marginRight: 10 }}>{p.label}</a>)}</p>}
            {c.scenario && <p><a className="btn ghost" href={href(`/lab/${c.scenario}`)}>Explore the related stress test</a></p>}
          </>
        )}
      </section>
    </>
  );
}
