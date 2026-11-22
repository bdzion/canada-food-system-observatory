// Step 2: the indicators. Part A: twelve published facts on where Canada is exposed.
// Part B: official figures, refreshed automatically, compared with past years.
import { Evidence, StateChip } from "../components/Badges";
import IndicatorChart, { toCSV } from "../components/IndicatorChart";
import { StepFoot, StepHead } from "../components/Steps";
import { INDIC, NODES, CHECKED } from "../legacy/core.js";
import { load, useData } from "../lib/data";
import { dateTime, longDate } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator, Source } from "../lib/types";

const ROLE: Record<string, string> = {
  buffer: "Backup supply", flow: "Movement of goods", market: "Prices", access: "Household budgets", signal: "Warnings and notices",
};
const ORDER = ["buffer", "flow", "market", "access", "signal"];
const TEST_NAME: Record<string, string> = { rail: "the main rail line to Vancouver closes", drought: "a severe drought hits the Prairies" };
const evClass = (id: string) => (id === "weather_alerts" ? "official_alert" : id === "food_recalls" ? "official_notice" : "observation");

export function IndicatorList() {
  const { data } = useData<{ indicators: Indicator[] }>("indicators.json");
  const inds = [...(data?.indicators || [])].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  return (
    <>
      <StepHead n={2} />
      <p style={{ maxWidth: "75ch" }}>We use two kinds of indicator. The first shows <b>how exposed</b> each link in the chain is: facts that change slowly, such as how much of a product Canada imports. The second shows <b>what is happening now</b>: official figures that we collect automatically and compare with the same time of year in the past.</p>

      <section aria-labelledby="h-weak">
        <h2 id="h-weak">A. How exposed is Canada? Twelve weak points</h2>
        <p className="small muted">Each figure comes from the published source named on the card, checked {CHECKED}. The rating (high, raised) and how fixable each weak point is are the research team's judgement.</p>
        {(NODES as any[]).map((n) => {
          const items = (INDIC as any[]).filter((i) => i.node === n.id);
          if (!items.length) return null;
          return (
            <div key={n.id} style={{ marginBottom: 10 }}>
              <h3 style={{ margin: "14px 0 6px" }}>{n.name}</h3>
              <div className="grid3">
                {items.map((i: any) => (
                  <div key={i.id} className="card">
                    <div className="meta"><Evidence cls="source_fact" /><span className={`lvl ${i.level}`} style={{ color: "#fff", borderRadius: 4, padding: "0 6px", fontWeight: 700 }}>{i.level === "High" ? "High exposure" : "Raised exposure"}</span></div>
                    <div className="fact" style={{ border: 0, boxShadow: "none", padding: "6px 0", background: "transparent" }}><span className="n">{i.num}</span><span className="t">{i.title}</span></div>
                    <p>{i.text}</p>
                    <p className="small" style={{ marginTop: 6 }}><span className="fixtag">{i.fix}</span> {i.fixwhy}</p>
                    <div className="period">Source: <a href={i.url}>{i.src}</a></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="h-live" style={{ marginTop: 26 }}>
        <h2 id="h-live">B. What do the latest figures show?</h2>
        <p className="small muted">Collected automatically from government and international agencies. Each card says what period the figure covers, which can be days or weeks before today.</p>
        {!data ? <p className="muted">Loading…</p> : (
          <div className="grid3">
            {inds.map((i) => (
              <a key={i.id} className="card" href={href(`/indicators/${i.id}`)}>
                <div className="meta"><span className="pill">{ROLE[i.role] || i.role}</span><Evidence cls={evClass(i.id)} /></div>
                <h4>{i.title}</h4>
                <p className="muted small">{i.question}</p>
                <p style={{ marginTop: 6 }}>{i.headline.text}</p>
                <div className="period">{i.headline.period_label} <StateChip state={i.headline.state} direction={i.headline.direction} /></div>
              </a>
            ))}
          </div>
        )}
        <div className="notice info" style={{ marginTop: 14 }}><b>How we decide what is “unusual”.</b> We compare the latest figure with the same week or month in up to five past years. A figure is marked unusual only if it is higher or lower than in every one of those years. Prices from past years are first converted to today's dollars. An unusual figure is a reason to look closer, not proof of a problem.</div>
      </section>
      <StepFoot n={2} />
    </>
  );
}

export function IndicatorDetail({ id, product }: { id: string; product?: string }) {
  const { data } = useData<{ indicators: Indicator[]; release_id: string }>("indicators.json");
  const { data: sources } = useData<Source[]>("sources.json");
  if (!data) return <p className="muted">Loading…</p>;
  const i = data.indicators.find((x) => x.id === id);
  if (!i) return <p>We could not find that indicator. <a href={href("/indicators")}>See all indicators</a>.</p>;
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
      <p className="small"><a href={href("/indicators")}>← Step 2: The indicators</a></p>
      <div className="eyebrow">{ROLE[i.role]}</div>
      <h1>{i.title}</h1>
      <p className="lede">{i.question}</p>
      <section className="panel">
        <div className="meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <Evidence cls={evClass(id)} />
          <StateChip state={i.headline.state} direction={i.headline.direction} />
        </div>
        <p style={{ fontSize: "1.1rem" }}>{i.headline.text}</p>
        <p className="small muted">Period covered: <b>{i.headline.period_label}</b>. {srcs[0]?.retrieved_at && <>Collected {dateTime(srcs[0].retrieved_at)}.</>}</p>
        {id === "weather_alerts" ? <p><a href={href("/threats/warnings?kind=weather_alert")}>See every alert in effect, on a map →</a></p> : <IndicatorChart id={id} kind={i.chart} initial={product} />}
        {id !== "weather_alerts" && <p className="noprint"><button className="btn ghost" onClick={download}>Download these figures (spreadsheet file)</button></p>}
      </section>

      {i.items && (
        <section className="panel">
          <h2>Each product in the latest week</h2>
          <div className="tablewrap"><table className="data">
            <thead><tr><th>Product</th><th>Latest wholesale price</th><th className="num">Compared with a typical year</th><th className="num">Compared with four weeks ago</th><th>For the time of year</th></tr></thead>
            <tbody>{i.items.map((p: any) => (
              <tr key={p.id}><td><a href={href(`/indicators/produce_prices?product=${p.id}`)}>{p.label}</a><div className="small muted">{p.package}</div></td>
                <td>{p.latest_range}<div className="small muted">{longDate(p.latest_date)}</div></td>
                <td className="num">{p.vs_median_pct == null ? "—" : `${p.vs_median_pct > 0 ? "+" : ""}${p.vs_median_pct}%`}</td>
                <td className="num">{p.vs_4wk_pct == null ? "—" : `${p.vs_4wk_pct > 0 ? "+" : ""}${p.vs_4wk_pct}%`}</td>
                <td><StateChip state={p.state} direction={p.direction} /> <span className="small muted">{p.n_years ? `based on ${p.n_years} past year${p.n_years === 1 ? "" : "s"}` : ""}</span></td></tr>))}</tbody>
          </table></div>
          <p className="small muted">“A typical year” is the middle value of past years for the same week, in today's dollars.</p>
        </section>
      )}

      <div className="grid2">
        <section className="panel">
          <h2>What this measures</h2>
          <p>{i.definition}</p>
          <h3>How we work it out</h3>
          <p>{i.how_calculated}</p>
          <p className="small muted">{i.baseline_rule}</p>
        </section>
        <section className="panel">
          <h2>What it does not tell you</h2>
          <p>{i.does_not_show}</p>
          {i.scenario && TEST_NAME[i.scenario] && (
            <div className="notice model">Related what-if test: <a href={href(`/threats/${i.scenario}`)}>what if {TEST_NAME[i.scenario]}?</a> You choose that test's settings yourself; they are not taken from these figures.</div>
          )}
          <h3>Where the data come from</h3>
          <ul>{srcs.map((s) => <li key={s.id}><a href={s.documentation_url}>{s.provider}: {s.dataset}</a> <span className="small muted">(latest data {longDate(s.observation_end)})</span></li>)}</ul>
        </section>
      </div>
    </>
  );
}
