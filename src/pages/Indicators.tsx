import { Evidence, StateChip } from "../components/Badges";
import IndicatorChart, { toCSV } from "../components/IndicatorChart";
import { load, useData } from "../lib/data";
import { dateTime, longDate } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator, Source } from "../lib/types";

const ROLE: Record<string, [string, string]> = {
  buffer: ["Buffer", "Spare capacity that can absorb a shock."],
  flow: ["Flow", "Whether goods are moving at a normal pace."],
  market: ["Market", "Prices that show strain in supply or demand."],
  access: ["Access", "Whether households can afford food."],
  signal: ["Shock signal", "Official alerts and notices of possible shocks."],
};
const SCEN_TITLE: Record<string, string> = { rail: "Rail or port shutdown", drought: "Prairie drought", phosphate: "Fertilizer supply cut" };
const ORDER = ["buffer", "flow", "market", "access", "signal"];

export function IndicatorList() {
  const { data } = useData<{ indicators: Indicator[] }>("indicators.json");
  if (!data) return <p className="muted">Loading…</p>;
  const inds = [...data.indicators].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  return (
    <>
      <div className="eyebrow">Indicator Explorer</div>
      <h1>A few measures, each with its source and its limits</h1>
      <p className="lede">We track a small set of measures that bear on Canada's buffers, rather than a wall of charts. Each compares the latest value with the same time of year in earlier years, and says what it cannot tell you.</p>
      <div className="grid3" style={{ marginTop: 18 }}>
        {inds.map((i) => (
          <a key={i.id} className="card" href={href(`/indicators/${i.id}`)}>
            <div className="meta"><span className="pill">{ROLE[i.role]?.[0] || i.role}</span><Evidence cls={i.role === "signal" ? (i.id === "weather_alerts" ? "official_alert" : "official_notice") : "observation"} /></div>
            <h4>{i.title}</h4>
            <p className="muted small">{i.question}</p>
            <p style={{ marginTop: 6 }}>{i.headline.text}</p>
            <div className="period">{i.headline.period_label} <StateChip state={i.headline.state} direction={i.headline.direction} /></div>
          </a>
        ))}
      </div>
    </>
  );
}

export function IndicatorDetail({ id, product }: { id: string; product?: string }) {
  const { data } = useData<{ indicators: Indicator[]; release_id: string }>("indicators.json");
  const { data: sources } = useData<Source[]>("sources.json");
  if (!data) return <p className="muted">Loading…</p>;
  const i = data.indicators.find((x) => x.id === id);
  if (!i) return <p>Unknown indicator. <a href={href("/indicators")}>See all indicators</a>.</p>;
  const srcs = (sources || []).filter((s) => i.source_ids?.includes(s.id));
  const download = async () => {
    const d = await load(`series/${id}.json`);
    const blob = new Blob([toCSV(d)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${id}_${data.release_id}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <>
      <p className="small"><a href={href("/indicators")}>← All indicators</a></p>
      <div className="eyebrow">{ROLE[i.role]?.[0]} · {ROLE[i.role]?.[1]}</div>
      <h1>{i.title}</h1>
      <p className="lede">{i.question}</p>
      <section className="panel">
        <div className="meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <Evidence cls={i.role === "signal" ? (id === "weather_alerts" ? "official_alert" : "official_notice") : "observation"} />
          <StateChip state={i.headline.state} direction={i.headline.direction} />
          {i.headline.state === "outside_reference_range_review" && <Evidence cls="screening_signal" />}
        </div>
        <p style={{ fontSize: "1.1rem" }}>{i.headline.text}</p>
        <p className="small muted">Data period: <b>{i.headline.period_label}</b>. {srcs[0]?.retrieved_at && <>Retrieved {dateTime(srcs[0].retrieved_at)}.</>}</p>
        {id === "weather_alerts" ? <p><a href={href("/events?kind=weather_alert")}>See every alert in effect, with a map →</a></p> : <IndicatorChart id={id} kind={i.chart} initial={product} />}
        {id !== "weather_alerts" && <p className="noprint"><button className="btn ghost" onClick={download}>Download the data (CSV)</button></p>}
      </section>

      {i.items && (
        <section className="panel">
          <h2>Each product this week</h2>
          <div className="tablewrap"><table className="data">
            <thead><tr><th>Product</th><th>Latest quote</th><th className="num">vs usual (median)</th><th className="num">vs 4 weeks ago</th><th>Compared with earlier years</th></tr></thead>
            <tbody>{i.items.map((p: any) => (
              <tr key={p.id}><td><a href={href(`/indicators/produce_prices?product=${p.id}`)}>{p.label}</a><div className="small muted">{p.package}</div></td>
                <td>{p.latest_range}<div className="small muted">{longDate(p.latest_date)}</div></td>
                <td className="num">{p.vs_median_pct == null ? "—" : `${p.vs_median_pct > 0 ? "+" : ""}${p.vs_median_pct}%`}</td>
                <td className="num">{p.vs_4wk_pct == null ? "—" : `${p.vs_4wk_pct > 0 ? "+" : ""}${p.vs_4wk_pct}%`}</td>
                <td><StateChip state={p.state} direction={p.direction} /> <span className="small muted">{p.n_years ? `${p.n_years} earlier year${p.n_years === 1 ? "" : "s"}` : ""}</span></td></tr>))}</tbody>
          </table></div>
        </section>
      )}

      <div className="grid2">
        <section className="panel">
          <h2>What it measures</h2>
          <p>{i.definition}</p>
          <h3>How it is calculated</h3>
          <p>{i.how_calculated}</p>
          <p className="small muted">Comparison rule: {i.baseline_rule}</p>
        </section>
        <section className="panel">
          <h2>What it does not show</h2>
          <p>{i.does_not_show}</p>
          {i.scenario && SCEN_TITLE[i.scenario] && (
            <div className="notice model"><b>Explore a related stress test:</b> <a href={href(`/lab/${i.scenario}`)}>{SCEN_TITLE[i.scenario]}</a>. The test's settings are assumptions you choose; they are not filled in from this indicator.</div>
          )}
          <h3>Sources</h3>
          <ul>{srcs.map((s) => <li key={s.id}><a href={s.documentation_url}>{s.provider}: {s.dataset}</a> <span className="small muted">({s.licence}; data to {longDate(s.observation_end)})</span></li>)}</ul>
        </section>
      </div>
    </>
  );
}
