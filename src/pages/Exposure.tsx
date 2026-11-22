// Step 3 (abroad): disasters in other countries, and whether Canada buys food or farm supplies from them.
import { useMemo, useState } from "react";
import { Evidence } from "../components/Badges";
import IndicatorCard from "../components/IndicatorCard";
import IndicatorChart from "../components/IndicatorChart";
import WorldMap from "../components/WorldMap";
import { TEST_TITLE } from "../content/plain";
import { useData } from "../lib/data";
import { longDate, num, usdM } from "../lib/format";
import { href } from "../lib/router";
import type { EventItem, Indicator } from "../lib/types";

const LEVELS = [
  ["No link found", "Canada buys little or none of the products we track from the country hit."],
  ["Canada buys from here", "Canada imports a product we track from the country hit. That is a reason to look, not proof of harm."],
  ["The disaster hit where it is grown", "The disaster overlaps the farms, ports or roads that supply the product."],
  ["Supply was damaged", "A reliable source reports damage to that supply."],
  ["Canada felt it", "Canadian prices or imports changed because of it."],
];
const GROUPS: Record<string, string> = { inputs: "Farm supplies", produce: "Fresh fruit and vegetables", staples: "Pantry staples", protein: "Seafood" };
const levelIndex = (l?: string) => (l === "L1" ? 1 : l === "L0" ? 0 : -1);

function Ladder({ at }: { at: number }) {
  return (
    <div className="ladder" aria-label={at >= 0 ? `How far the evidence goes: step ${at + 1} of 5` : "The five steps of evidence"}>
      {LEVELS.map(([t, d], i) => <div key={t} className={i === at ? "on" : i >= 2 ? "review" : ""}><b>{i + 1}. {t}</b>{d}{i >= 2 && <div className="small" style={{ marginTop: 4 }}><i>Needs a person to check</i></div>}</div>)}
    </div>
  );
}

export default function Exposure() {
  const { data } = useData<any>("exposure.json");
  const { data: ev } = useData<{ items: EventItem[] }>("events.json");
  const { data: ind } = useData<{ indicators: Indicator[] }>("indicators.json");
  const [hs, setHs] = useState<string>("3105");
  const [evSel, setEvSel] = useState<string | null>(null);
  const hazards = useMemo(() => (ev?.items || []).filter((e) => e.kind === "global_hazard")
    .sort((a, b) => (b.canada_link?.level === "L1" ? 1 : 0) - (a.canada_link?.level === "L1" ? 1 : 0)), [ev]);
  if (!data || !ev) return <p className="muted">Loading…</p>;
  const linked = hazards.filter((e) => e.canada_link?.level === "L1");
  const sel = hazards.find((e) => e.id === evSel) || linked[0] || hazards[0];
  const c = data.commodities.find((x: any) => x.hs === hs) || data.commodities[0];
  const maxShare = Math.max(...(c?.partners || []).map((p: any) => p.share || 0), 0.01);
  const hazardIsos = new Set(hazards.flatMap((e) => (e.countries || []).map((x: any) => x.iso3)));
  const produce = data.produce_origins.filter((p: any) => p.link === hs);
  return (
    <>
      <p className="small"><a href={href("/threats")}>← Step 3: The threats</a></p>
      <div className="eyebrow">Step 3 · The threats</div>
      <h1>Disasters abroad: could they reach Canada?</h1>
      <p className="lede">Canada imports most of its fresh fruit, much of its fertilizer and many other foods. A flood, cyclone or drought in a supplying country could reduce what reaches us. This page checks each serious disaster against the countries Canada buys from.</p>
      <nav className="small" aria-label="On this page" style={{ margin: "6px 0 12px" }}>On this page: <a href="#h-lanes">Sea lanes</a> · <a href="#h-prices">World prices</a> · <a href="#h-haz">Disasters</a> · <a href="#h-com">Where imports come from</a> · <a href="#h-us">US growing regions</a></nav>
      <p>Disasters are only one route. Wars and blockades can close sea lanes, and world prices carry shocks to Canada even when we buy nothing from the place hit. The first two sections below follow those routes.</p>

      <section className="panel" aria-labelledby="h-lanes">
        <h2 id="h-lanes">Sea lanes that carry fuel and fertilizer</h2>
        <p className="small muted">Ships a day through four narrow passages, estimated by the International Monetary Fund's PortWatch. Choose a passage; the shaded band is the range for the same weeks in the past five years. <a href={href("/threats/ongoing")}>Read about the Strait of Hormuz closure →</a></p>
        <IndicatorChart id="sea_lanes" kind="lines" />
      </section>

      <section className="panel" aria-labelledby="h-prices">
        <h2 id="h-prices">World prices</h2>
        <p className="small muted">Canada buys fertilizer, fuel and much of its food at world prices, so a shock anywhere can reach Canadian farms and stores this way.</p>
        <div className="grid3">{(ind?.indicators || []).filter((i) => ["world_fertilizer", "world_prices", "exchange_rate"].includes(i.id)).map((i) => <IndicatorCard key={i.id} i={i} compact />)}</div>
      </section>

      <h2 style={{ marginTop: 24 }}>Disasters abroad</h2>
      <p>The answer comes in steps. Our automatic check can reach only step 2: it can tell that Canada buys from the country hit. Going further needs a person to look at where the disaster struck and what it damaged.</p>
      <Ladder at={-1} />

      <section className="panel" aria-labelledby="h-haz">
        <h2 id="h-haz">Serious disasters in recent weeks</h2>
        <p className="small muted">From the Global Disaster Alert and Coordination System, run by the United Nations and the European Commission. {linked.length} of {hazards.length} are in a country that supplied at least {Math.round(data.min_partner_share * 100)}% of a product Canada imports.</p>
        <div className="chips" role="group" aria-label="Choose a disaster">
          {hazards.map((e) => <button key={e.id} className="chip" aria-pressed={sel?.id === e.id} onClick={() => setEvSel(e.id)}>{e.canada_link?.level === "L1" ? "● " : "○ "}{e.title.length > 64 ? e.title.slice(0, 62) + "…" : e.title}</button>)}
        </div>
        <p className="small muted" style={{ marginTop: -6 }}>● Canada buys from the country hit · ○ no direct link found</p>
        {sel && (
          <div className="card">
            <div className="meta"><Evidence cls="official_alert" /><span>{sel.event_type} · {sel.alert_level === "Red" ? "red alert (most serious)" : "orange alert (serious)"}</span><span>· {longDate(sel.date)}{sel.end && sel.end !== sel.date ? ` to ${longDate(sel.end)}` : ""}</span>{sel.canada_link?.level === "L1" && <Evidence cls="supplier_link" />}</div>
            <h4><a href={sel.url}>{sel.title}</a></h4>
            <p className="small">Countries affected: {sel.place}{sel.severity_text ? `. Assessment: ${sel.severity_text}` : ""}</p>
            <h4 style={{ marginTop: 10 }}>How far does the evidence go?</h4>
            <Ladder at={levelIndex(sel.canada_link?.level)} />
            <p><b>{sel.canada_link?.phrase}</b></p>
            {sel.canada_link?.commodities?.length > 0 && (
              <div className="tablewrap"><table className="data">
                <thead><tr><th>Product Canada imports</th><th>Supplying country</th><th className="num">Share of Canada's imports (by value)</th><th>Year</th><th>Related what-if test</th></tr></thead>
                <tbody>{sel.canada_link.commodities.map((x: any) => (
                  <tr key={x.hs + x.iso3}><td><button className="chip" onClick={() => setHs(x.hs)}>{x.label}</button></td>
                    <td>{x.country}{x.large_country && <div className="small muted">A large country: the disaster may be far from where this is produced.</div>}</td>
                    <td className="num">{(x.share * 100).toFixed(1)}%</td><td>{x.year}</td>
                    <td>{x.scenario ? <a href={href(`/threats/${x.scenario}`)}>{TEST_TITLE[x.scenario]}</a> : <span className="muted">none yet</span>}</td></tr>))}</tbody>
              </table></div>
            )}
            <h4 style={{ marginTop: 12 }}>What would we need to know next?</h4>
            <ul>{(sel.canada_link?.next_evidence || []).map((q: string) => <li key={q}>{q}</li>)}</ul>
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="h-com">
        <h2 id="h-com">Where Canada's imports come from</h2>
        <p className="small muted">Canada's own import records, as reported to the United Nations trade database (UN Comtrade), for the latest full year available. Choose a product.</p>
        {Object.entries(GROUPS).map(([g, gl]) => (
          <div key={g} style={{ marginBottom: 4 }}><span className="small muted" style={{ marginRight: 8 }}>{gl}</span>
            {data.commodities.filter((x: any) => x.group === g).map((x: any) => <button key={x.hs} className="chip" style={{ margin: 2 }} aria-pressed={x.hs === hs} onClick={() => setHs(x.hs)}>{x.label}</button>)}
          </div>
        ))}
        {c && (
          <>
            <h3 style={{ marginTop: 14 }}>{c.label}: imports worth {c.total_value_usd ? usdM(c.total_value_usd) : "—"} in {c.year}</h3>
            <WorldMap shares={Object.fromEntries(c.partners.filter((p: any) => p.iso3 && p.share != null).map((p: any) => [p.iso3, p.share]))}
              flagged={new Set(c.partners.filter((p: any) => hazardIsos.has(p.iso3) && (p.share || 0) >= 0.01).map((p: any) => p.iso3))}
              label={`World map: share of Canada's ${c.label.toLowerCase()} imports by supplying country. The ten largest suppliers are listed below.`} />
            <div className="bars" role="table" aria-label={`Where Canada's ${c.label} imports came from, share of value`}>
              {c.partners.slice(0, 10).map((p: any) => (
                <div className="row" role="row" key={p.code}>
                  <span role="cell">{p.name}{hazardIsos.has(p.iso3) && <span className="pill" style={{ marginLeft: 6, borderColor: "var(--ready)" }} title="A serious disaster has been listed in this country in recent weeks">disaster listed</span>}</span>
                  <span role="cell"><span className="bar" style={{ display: "block", width: `${(100 * (p.share || 0)) / maxShare}%`, background: hazardIsos.has(p.iso3) ? "var(--ready)" : "var(--act)" }} /></span>
                  <span role="cell" className="v">{((p.share || 0) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
            <p className="small muted">Shares are by value in US dollars; the biggest supplier by value is not always the biggest by weight{c.partners[0]?.net_kg ? ` (the top supplier sent about ${num(c.partners[0].net_kg / 1e6, 1)} thousand tonnes)` : ""}. A high share does not mean Canada depends on that country: Canadian production, stocks and other suppliers matter too. Goods shipped through the United States may be recorded as American.</p>
            {produce.length > 0 && <p>Wholesale prices we follow for this product: {produce.map((p: any) => <a key={p.id} href={href(`/indicators/produce_prices?product=${p.id}`)} style={{ marginRight: 10 }}>{p.label}</a>)}</p>}
            {c.scenario && <p><a className="btn ghost" href={href(`/threats/${c.scenario}`)}>Try the related what-if test</a></p>}
          </>
        )}
      </section>

      <section className="panel" aria-labelledby="h-us">
        <h2 id="h-us">US growing regions</h2>
        <p className="small muted">Much of Canada's imported fresh fruit and vegetables comes from California, Arizona, Florida and Washington. We follow drought there, and US National Weather Service alerts that could hurt crops in the field or stop trucks.</p>
        <div className="grid2">
          <div>{(ind?.indicators || []).filter((i) => i.id === "us_drought").map((i) => <IndicatorCard key={i.id} i={i} compact />)}</div>
          <div>
            <h3>Weather alerts in effect</h3>
            {(() => { const us = ev.items.filter((e) => e.kind === "us_alert"); return us.length ? (
              <ul className="changes">{us.slice(0, 12).map((e) => <li key={e.id}><a href={e.url}>{e.title}</a> <span className="small muted">· {e.n_areas} zone{e.n_areas === 1 ? "" : "s"}{e.end ? ` · until ${longDate(e.end)}` : ""}</span></li>)}</ul>
            ) : <p className="empty">No frost, freeze, heat, flood, wind, fire-weather or storm alerts in effect in these four states when we last checked.</p>; })()}
            <p className="small muted">An alert is a forecast warning, not evidence of crop damage.</p>
          </div>
        </div>
      </section>
    </>
  );
}
