import { Evidence } from "../components/Badges";
import { useData } from "../lib/data";
import { EVIDENCE, dateTime, longDate } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator, Manifest, Source } from "../lib/types";

// Public record of corrections to published briefs or methods. Add entries here; never delete them.
const CORRECTIONS: { date: string; text: string }[] = [];

const HEALTH: Record<string, string> = { ok: "Normal", stale: "Older than expected", error: "Last refresh failed (showing earlier data)", unavailable: "No data" };

export default function Methods() {
  const { data: src } = useData<Source[]>("sources.json");
  const { data: ind } = useData<{ indicators: Indicator[] }>("indicators.json");
  const { data: man } = useData<Manifest>("manifest.json");
  return (
    <>
      <div className="eyebrow">Methods & sources</div>
      <h1>How this site knows what it says</h1>
      <p className="lede">Trust comes from being able to check. This page lists every source, how often we read it, how each number is calculated, and what the site will not claim.</p>
      <nav className="chips" aria-label="On this page">
        {[["principles", "Principles"], ["evidence", "Evidence classes"], ["pipeline", "How updates work"], ["sources", "Sources and status"], ["indicators", "Indicator definitions"], ["screening", "Screening rule"], ["judgement", "Author judgement"], ["limits", "Limits"], ["corrections", "Corrections"], ["reuse", "Reuse and citation"]].map(([a, l]) => <a key={a} className="chip" href={`#sec-${a}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${a}`)?.scrollIntoView({ behavior: "smooth" }); }}>{l}</a>)}
      </nav>

      <section className="panel" id="sec-principles">
        <h2>Principles</h2>
        <ol>
          <li><b>Canada first.</b> Every global item must answer “why could this matter for Canada?”, and say how far the evidence goes.</li>
          <li><b>Evidence before interpretation.</b> Observations, official notices, screening flags, model results and the authors' judgements are kept apart and labelled.</li>
          <li><b>Traceable.</b> Every value carries its source, its own data period and the time it was retrieved.</li>
          <li><b>No silent gaps.</b> A failed source is not a zero, and old data are never shown as current.</li>
          <li><b>Buffers, not just shocks.</b> Whether a shock becomes a crisis depends on what can absorb it, so the site watches both.</li>
          <li><b>No single risk score.</b> Conditions, exposures and signals are different things and are not added together.</li>
        </ol>
      </section>

      <section className="panel" id="sec-evidence">
        <h2>Evidence classes</h2>
        <div className="tablewrap"><table className="data"><tbody>
          {Object.entries(EVIDENCE).map(([k, [, d]]) => <tr key={k}><td><Evidence cls={k} /></td><td>{d}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="panel" id="sec-pipeline">
        <h2>How updates work</h2>
        <p>A scheduled job runs four times a day. It reads each official source, checks the data, computes the comparisons and writes a new data release. If a source fails, the last good data are kept, dated as they were, and the source is marked. The new release replaces the old one only after every file passes validation.</p>
        <p>The weather-alert map also checks ECCC's service directly from your browser and says when it does. Every Monday the job writes the brief for the week just ended. A daily snapshot is kept so you can view the situation as it stood on an earlier day.</p>
        <p>Summaries are written by fixed rules from validated numbers, not by a language model, and every sentence links to the measure it describes.</p>
        {man && <p className="small">Current release <span className="kbd">{man.release_id}</span>, processed {dateTime(man.generated_at)}{man.run_url ? <> · <a href={man.run_url}>processing log</a></> : null}. Checksums for every file are in the <a href={`${import.meta.env.BASE_URL}data/manifest.json`}>manifest</a>.</p>}
      </section>

      <section className="panel" id="sec-sources">
        <h2>Sources and their status</h2>
        <div className="tablewrap"><table className="data">
          <thead><tr><th>ID</th><th>Source</th><th>Status</th><th>Newest data</th><th>Checked</th><th>Licence</th></tr></thead>
          <tbody>{(src || []).map((s) => (
            <tr key={s.id}><td>{s.id}</td>
              <td><a href={s.documentation_url}>{s.provider}</a><div className="small">{s.dataset}</div><div className="small muted">Expected: {s.expected_frequency.replace(/_/g, " ")}{s.browser_live ? " · also checked live in your browser" : ""}</div></td>
              <td><span className={`dot ${s.health}`} />{HEALTH[s.health]}{s.error && <div className="small muted">{s.error}</div>}</td>
              <td>{longDate(s.observation_end)}{s.age_days != null && <div className="small muted">{s.age_days} days old; flagged after {s.stale_after_days}</div>}</td>
              <td className="small">{dateTime(s.last_success_at || s.retrieved_at)}</td>
              <td className="small">{s.licence_url ? <a href={s.licence_url}>{s.licence}</a> : s.licence}</td></tr>))}</tbody>
        </table></div>
        <p className="small muted">Planned next: AAFC Canadian Drought Monitor (monthly drought classes), CFIA animal-disease status, AAFC crop inventory for farmland overlays, and licensed news metadata for corroboration.</p>
      </section>

      <section className="panel" id="sec-indicators">
        <h2>Indicator definitions</h2>
        {(ind?.indicators || []).map((i) => (
          <details key={i.id} className="more"><summary>{i.title}</summary>
            <p><b>Question.</b> {i.question}</p><p><b>Definition.</b> {i.definition}</p><p><b>Calculation.</b> {i.how_calculated}</p>
            <p><b>Comparison rule.</b> {i.baseline_rule}</p><p><b>Does not show.</b> {i.does_not_show}</p>
            <p><a href={href(`/indicators/${i.id}`)}>Open the indicator →</a></p></details>))}
      </section>

      <section className="panel" id="sec-screening">
        <h2>Screening rule</h2>
        <p>A measure is marked <b>“outside usual range — review”</b> only when the latest value is higher or lower than in every one of the comparable earlier years (up to five; at least three needed). Prices are converted to today's dollars before comparing. The rule is deliberately strict and simple for a first release. It flags values to look at, not crises. Thresholds will be revisited after a historical backtest.</p>
        <p>The Canada relevance filter assigns <b>L1</b> when a hazard alert lists a country that supplied at least 5% of Canada's import value of a tracked product in the latest year available (UN Comtrade). It never assigns L2 to L4; those need an analyst and evidence about places and effects.</p>
      </section>

      <section className="panel" id="sec-judgement">
        <h2>Preliminary author judgement</h2>
        <p>The threat register, its ratings and the example warning levels come unchanged from the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>. They are the authors' preliminary judgement, marked with <Evidence cls="author_judgement" /> wherever they appear, and never mixed into the observed data or the automatic briefs. The first phase of the research would replace them with a structured expert ranking.</p>
      </section>

      <section className="panel" id="sec-limits">
        <h2>Limits</h2>
        <ul>
          <li>Coverage is narrow by design: one wholesale market, grain in the licensed handling system, national averages for prices and wages.</li>
          <li>Publication lags differ: grain statistics arrive weeks after the fact; trade data a year or more.</li>
          <li>A link between a hazard abroad and Canadian imports is a reason to look, not evidence of an effect. Co-occurrence in time is not causation.</li>
          <li>The stress tests are illustrative and have not been checked against real events.</li>
          <li>Nothing here is reviewed by an analyst before publication yet. This is a research prototype, not an official service.</li>
        </ul>
      </section>

      <section className="panel" id="sec-corrections">
        <h2>Corrections</h2>
        {CORRECTIONS.length ? <ul>{CORRECTIONS.map((c) => <li key={c.date}><b>{longDate(c.date)}.</b> {c.text}</li>)}</ul> : <p>No corrections yet. Published briefs are never rewritten; any correction will be listed here with its date.</p>}
      </section>

      <section className="panel" id="sec-reuse">
        <h2>Reuse and citation</h2>
        <p>The processed data are public JSON files in this site's <a href={`${import.meta.env.BASE_URL}data/manifest.json`}>data folder</a>, and every release is kept in the repository's <span className="kbd">data</span> branch. Each indicator page has a CSV download. Please credit the original providers listed above, under their licences.</p>
        <p>Suggested citation: Bodrud-Doza, M. ({new Date().getFullYear()}). <i>Canada Food System Observatory</i> [research prototype]. Arrell Food Institute, University of Guelph. https://bdzion.github.io/canada-food-system-observatory/ (data release {man?.release_id || "…"}).</p>
      </section>
    </>
  );
}
