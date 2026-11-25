// Step 2: the indicators. Part A: twelve published facts on where Canada is exposed.
// Part B: official figures, refreshed automatically, compared with past years.
import { useState } from "react";
import { Evidence, StateChip } from "../components/Badges";
import DroughtMap from "../components/DroughtMap";
import IndicatorCard, { evClass, ROLE } from "../components/IndicatorCard";
import IndicatorChart, { toCSV } from "../components/IndicatorChart";
import { Age, Spark, Trend } from "../components/Spark";
import { StepFoot, StepHead } from "../components/Steps";
import { INDIC, NODES, CHECKED } from "../legacy/core.js";
import { load, useData } from "../lib/data";
import { dateTime, longDate } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator, Source } from "../lib/types";

const ORDER = ["buffer", "flow", "market", "access", "signal"];
const ROLE_Q: Record<string, string> = {
  buffer: "How much backup is there: stored grain, affordable farm inputs, soil moisture?",
  flow: "Are goods moving: by rail, through ports and through the sea lanes that carry fuel and fertilizer?",
  market: "What are prices doing, at home and on world markets?",
  access: "Can households afford food?",
  signal: "Are there warnings, recalls or disputes that could break a link?",
};
const TEST_NAME: Record<string, string> = {
  rail: "the main rail line to Vancouver closes", drought: "a severe drought hits the Prairies", phosphate: "fertilizer imports are cut before seeding",
};
const fmtV = (v: number | null | undefined, unit?: string) => {
  if (v == null) return "—";
  if (unit === "dollars") return "$" + v.toFixed(2);
  if (unit === "CAD") return "$" + v.toFixed(v < 0.2 ? 4 : 3);
  if (unit === "percent") return v.toFixed(1) + "%";
  if (unit === "cents per litre") return v.toFixed(1) + "¢";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + " million";
  if (Math.abs(v) >= 1e4) return Math.round(v / 1e3).toLocaleString("en-CA") + " thousand";
  return v.toLocaleString("en-CA", { maximumFractionDigits: v < 10 ? 2 : 0 });
};
export function IndicatorList() {
  const { data } = useData<{ indicators: Indicator[] }>("indicators.json");
  const [asTable, setAsTable] = useState(false);
  const inds = [...(data?.indicators || [])].sort((a, b) => ORDER.indexOf(a.role) - ORDER.indexOf(b.role));
  /* Only the top rung each figure can actually reach counts here: see the
     note below the cards. */
  const nLook = inds.filter((i) => i.headline.screen?.worth_a_look).length;
  return (
    <>
      <StepHead n={2} />
      <p style={{ maxWidth: "75ch" }}>We use two kinds of indicator. The first shows <b>how exposed</b> each link in the chain is: facts that change slowly, such as how much of a product Canada imports. The second shows <b>what is happening now</b>: official figures that we collect automatically and compare with the same time of year in the past.</p>

      <section aria-labelledby="h-weak">
        <h2 id="h-weak">A. How exposed is Canada? {(INDIC as any[]).length} weak points</h2>
        <p className="small muted">Each figure comes from the published source named on the card, checked {CHECKED}. The rating (high, raised) and how fixable each weak point is are the research team's judgement.</p>
        <p className="noprint"><button className="btn ghost small" aria-pressed={asTable} onClick={() => setAsTable(!asTable)}>{asTable ? "Show as cards" : "Show as one table"}</button></p>
        {asTable ? (
          <div className="tablewrap"><table className="data wtable">
            <thead><tr><th>Link in the chain</th><th>Fact</th><th>Our rating</th><th>How fixable</th><th>Source</th></tr></thead>
            <tbody>{(INDIC as any[]).map((i) => (
              <tr key={i.id}><td>{(NODES as any[]).find((n) => n.id === i.node)?.name}</td>
                <td><b>{i.num}</b> {i.title}<div className="small muted">{i.text}</div></td>
                <td>{i.level === "High" ? "High exposure" : "Raised exposure"}</td><td>{i.fix}</td><td><a href={i.url}>{i.src}</a></td></tr>))}</tbody>
          </table></div>
        ) : (NODES as any[]).map((n) => {
          const items = (INDIC as any[]).filter((i) => i.node === n.id);
          if (!items.length) return null;
          return (
            <div key={n.id} style={{ marginBottom: 10 }}>
              <h3 style={{ margin: "14px 0 6px" }}>{n.name}</h3>
              <div className="grid3">
                {items.map((i: any) => (
                  <div key={i.id} className="card">
                    <div className="meta"><Evidence cls="source_fact" /><span className={`lvl ${i.level}`} style={{ color: "var(--on-fill)", borderRadius: 4, padding: "0 6px", fontWeight: 700 }}>{i.level === "High" ? "High exposure" : "Raised exposure"}</span></div>
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
        <p className="small muted">Collected automatically from government and international agencies. Each card says what period the figure covers and how old it is: some figures arrive days after the fact, others months. {data && <b>{nLook} of {inds.length} are worth a closer look today.</b>}</p>
        {!data ? <p className="muted">Loading…</p> : ORDER.map((r) => {
          const xs = inds.filter((i) => i.role === r);
          if (!xs.length) return null;
          return (
            <div key={r}>
              <h3 className="rolehead">{ROLE[r]} <span className="small muted" style={{ fontWeight: 400 }}>· {ROLE_Q[r]}</span></h3>
              <div className="grid3">{xs.map((i) => <IndicatorCard key={i.id} i={i} role={false} />)}</div>
            </div>
          );
        })}
        <div className="notice info" style={{ marginTop: 14 }}>
          <b>How we decide what is worth a closer look.</b> We run two checks on every figure.
          The <b>level check</b> asks whether the latest reading is higher or lower than the same week or month
          in each of the past five years. The <b>pace check</b> asks whether it is moving faster than it usually
          moves at this time of year. Prices are converted to today's dollars before either check.
          <br /><br />
          The two answer different questions, and the level check on its own is weak: with five years to compare,
          the highest or lowest reading happens about one year in three by chance alone, and on a figure that
          climbs year after year it happens almost every time. So a figure is only called out when <b>both</b>{" "}
          checks agree, or when only one of them can be run for that figure and it fires. Each card says which.
          Even then it is a reason to look closer, not proof of a problem.
        </div>
      </section>
      <StepFoot n={2} />
    </>
  );
}

/* The four questions, always in the same order and always labelled by the kind
 * of claim each one makes. The first is the measured figure; the other three
 * are the team's reading of it, which is a different thing and has to look
 * like one. */
function FourQuestions({ i }: { i: Indicator }) {
  const r = i.reading;
  const sc = i.headline.screen;
  return (
    <section className="panel four-q" aria-labelledby={`fourq-${i.id}`}>
      <h2 id={`fourq-${i.id}`}>Four questions about this figure</h2>
      <dl>
        <div>
          <dt><span className="q-n" aria-hidden="true">1</span> What is happening?</dt>
          <dd>
            <div className="meta"><Evidence cls="observation" /></div>
            <p>{i.headline.text}</p>
            {sc && sc.screens.length > 0 && (
              <p className="small muted">
                <b>{sc.rung_label}.</b> {sc.rung_means}
                {sc.level_luck && <> {sc.level_luck}</>}
              </p>
            )}
            {i.headline.late && i.headline.late_note && <p className="small warn">{i.headline.late_note}</p>}
          </dd>
        </div>
        {r ? (
          <>
            <div>
              <dt><span className="q-n" aria-hidden="true">2</span> Why does it matter for Canada?</dt>
              <dd><div className="meta"><Evidence cls="author_judgement" /></div><p>{r.why_for_canada}</p></dd>
            </div>
            <div>
              <dt><span className="q-n" aria-hidden="true">3</span> What could happen next?</dt>
              <dd>
                <div className="meta"><Evidence cls="author_judgement" /></div>
                <p>{r.what_next}</p>
                {i.scenario && TEST_NAME[i.scenario] && (
                  <p className="small">
                    <a href={href(`/threats/${i.scenario}`)}>
                      See how far that chain has travelled, and what the live figures say →
                    </a>
                  </p>
                )}
              </dd>
            </div>
            <div>
              <dt><span className="q-n" aria-hidden="true">4</span> What could decision-makers consider?</dt>
              <dd>
                <div className="meta"><Evidence cls="author_judgement" /></div>
                <p>{r.to_consider}</p>
                <p className="small muted">Options to weigh, not advice. No agency has agreed to any of them.</p>
              </dd>
            </div>
          </>
        ) : (
          <div>
            <dt>The other three questions</dt>
            <dd><p className="muted">We have not yet written our reading of this figure. The measurement above
              stands on its own.</p></dd>
          </div>
        )}
      </dl>
      {r && <p className="small muted note">{r.note}</p>}
    </section>
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

      <FourQuestions i={i} />

      <section className="panel">
        <h2>The figure over time</h2>
        <div className="meta" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <Evidence cls={evClass(id)} />
          <StateChip state={i.headline.state} direction={i.headline.direction} screen={i.headline.screen} />
        </div>
        <div className="cue" style={{ marginBottom: 6 }}><Trend t={i.headline.trend} freq={i.frequency} /><Age t={i.headline.observation_end} freq={i.frequency} /></div>
        <p className="small muted">Period covered: <b>{i.headline.period_label}</b>. {srcs[0]?.retrieved_at && <>Collected {dateTime(srcs[0].retrieved_at)}.</>}</p>
        {id === "weather_alerts" ? <p><a href={href("/threats/warnings?kind=weather_alert")}>See every alert in effect, on a map →</a></p> : <IndicatorChart id={id} kind={i.chart} initial={product} />}
        {id !== "weather_alerts" && <p className="noprint"><button className="btn ghost" onClick={download}>Download these figures (spreadsheet file)</button></p>}
      </section>

      {id === "prairie_drought" && (
        <section className="panel">
          <h2>Where the drought is</h2>
          <DroughtMap />
        </section>
      )}

      {i.items && i.chart !== "produce" && (
        <section className="panel">
          <h2>Each series, latest reading</h2>
          <div className="tablewrap"><table className="data">
            <thead><tr><th>Series</th><th className="num">Latest</th><th>Period</th><th className="num">Typical for the time of year</th><th className="num">Change from a year earlier</th><th>Recent trend</th><th>For the time of year</th></tr></thead>
            <tbody>{i.items.map((p: any) => (
              <tr key={p.id}><td><a href={href(`/indicators/${id}?product=${p.id}`)}>{p.label}</a></td>
                <td className="num">{fmtV(p.value, p.unit)}</td><td className="small">{p.period}</td>
                <td className="num">{p.median == null ? "—" : fmtV(p.median, p.unit)}{p.inflation_adjusted && p.median != null && <div className="small muted">in today's dollars</div>}</td>
                <td className="num">{p.vs_year_ago_pct == null ? "—" : `${p.vs_year_ago_pct > 0 ? "+" : ""}${p.vs_year_ago_pct}%`}</td>
                <td><Spark values={p.spark} w={80} h={22} /></td>
                <td><StateChip state={p.state} direction={p.direction} screen={p.screen} /> <span className="small muted">{p.n_years ? `based on ${p.n_years} past year${p.n_years === 1 ? "" : "s"}` : ""}</span></td></tr>))}</tbody>
          </table></div>
          <p className="small muted">“Typical” is the middle value of the same period in past years.{id !== "store_prices" && " Choose a series name to draw it on the chart above."}</p>
        </section>
      )}

      {i.items && i.chart === "produce" && (
        <section className="panel">
          <h2>Each product in the latest week</h2>
          <div className="tablewrap"><table className="data">
            <thead><tr><th>Product</th><th>Latest wholesale price</th><th className="num">Compared with a typical year</th><th className="num">Compared with four weeks ago</th><th>For the time of year</th></tr></thead>
            <tbody>{i.items.map((p: any) => (
              <tr key={p.id}><td><a href={href(`/indicators/produce_prices?product=${p.id}`)}>{p.label}</a><div className="small muted">{p.package}</div></td>
                <td>{p.latest_range}<div className="small muted">{longDate(p.latest_date)}</div></td>
                <td className="num">{p.vs_median_pct == null ? "—" : `${p.vs_median_pct > 0 ? "+" : ""}${p.vs_median_pct}%`}</td>
                <td className="num">{p.vs_4wk_pct == null ? "—" : `${p.vs_4wk_pct > 0 ? "+" : ""}${p.vs_4wk_pct}%`}</td>
                <td><StateChip state={p.state} direction={p.direction} screen={p.screen} /> <span className="small muted">{p.n_years ? `based on ${p.n_years} past year${p.n_years === 1 ? "" : "s"}` : ""}</span></td></tr>))}</tbody>
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
