import { Evidence } from "../components/Badges";
import { useData } from "../lib/data";
import { EVIDENCE, dateTime, longDate } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator, Manifest, Source } from "../lib/types";

// Public record of corrections to published briefs or methods. Add entries here; never delete them.
const CORRECTIONS: { date: string; text: string }[] = [];

const FREQ: Record<string, string> = { continuous: "continuously", business_days: "every business day", monthly: "monthly", weekly: "weekly", daily: "daily", event_driven: "whenever there is news", annual: "once a year" };
const HEALTH: Record<string, string> = { ok: "Working", stale: "Data older than usual", error: "Latest update failed; showing earlier data", unavailable: "No data" };

export default function About() {
  const { data: src } = useData<Source[]>("sources.json");
  const { data: ind } = useData<{ indicators: Indicator[] }>("indicators.json");
  const { data: man } = useData<Manifest>("manifest.json");
  const go = (a: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(`sec-${a}`)?.scrollIntoView({ behavior: "smooth" }); };
  return (
    <>
      <div className="eyebrow">About the data</div>
      <h1>Where the figures come from, and how far to trust them</h1>
      <p className="lede">Everything on this site can be checked. This page lists every source, how often we collect it, how each figure is worked out, and what the site will not claim.</p>
      <nav className="chips" aria-label="On this page">
        {[["who", "Who made this"], ["rules", "Our rules"], ["labels", "The labels"], ["updates", "How updates work"], ["sources", "Sources"], ["indicators", "How each figure is worked out"], ["unusual", "What “unusual” means"], ["ratings", "Our team's ratings"], ["limits", "Limits"], ["corrections", "Corrections"], ["reuse", "Reuse"]].map(([a, l]) => <a key={a} className="chip" href={`#sec-${a}`} onClick={go(a)}>{l}</a>)}
      </nav>

      <section className="panel" id="sec-who">
        <h2>Who made this, and why</h2>
        <p>The site was developed at the Arrell Food Institute, University of Guelph, as part of research on how Canada can prepare its food system for shocks. It builds on the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>, which set out the threats and what-if tests.</p>
        <p>The information it uses is public, but it is spread across many websites, published on different schedules, and rarely put side by side. The site collects it automatically, compares it with past years, and links each piece back to its source. It is a research prototype. It is not a Government of Canada service and does not issue official warnings.</p>
        <p>Contact: <a href="mailto:mbodrudd@uoguelph.ca">mbodrudd@uoguelph.ca</a>.</p>
      </section>

      <section className="panel" id="sec-rules">
        <h2>Our rules</h2>
        <ol>
          <li><b>Canada first.</b> A disaster abroad appears here only with an answer to “why could this matter for Canada?”, and a statement of how far the evidence goes.</li>
          <li><b>Facts, warnings, models and opinions stay separate.</b> Every card is labelled with the kind of information it holds.</li>
          <li><b>Every figure can be traced.</b> Each shows its source, the period it covers and when we collected it.</li>
          <li><b>No hidden gaps.</b> Missing data are shown as missing, never as zero, and old data are never presented as current.</li>
          <li><b>Watch what absorbs shocks, not only the shocks.</b> Whether a shock becomes a crisis depends on the backup in the system, so we track both.</li>
          <li><b>No single risk score.</b> Different kinds of information are not added together into one number.</li>
        </ol>
      </section>

      <section className="panel" id="sec-labels">
        <h2>The labels on each card</h2>
        <div className="tablewrap"><table className="data"><tbody>
          {Object.entries(EVIDENCE).map(([k, [, d]]) => <tr key={k}><td><Evidence cls={k} /></td><td>{d}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="panel" id="sec-updates">
        <h2>How updates work</h2>
        <p>Four times a day, a program collects the latest figures from each source, checks them, compares them with past years and publishes the result on this site. If a source cannot be reached, the site keeps the last good figures, with their original dates, and marks the source as not working. A new update replaces the old one only after every file passes its checks.</p>
        <p>The weather map also checks Environment and Climate Change Canada directly each time you open the overview page. Every Monday the program writes the weekly brief for the week just ended. A copy of each day's summary is kept, so you can see what the site showed on an earlier day.</p>
        <p>The plain-language sentences are written by fixed rules from the checked figures, not by artificial intelligence. Each sentence links to the figure it describes.</p>
        {man && <p className="small">Latest update <span className="kbd">{man.release_id}</span>, {dateTime(man.generated_at)}{man.run_url ? <> · <a href={man.run_url}>technical log</a></> : null}.</p>}
      </section>

      <section className="panel" id="sec-sources">
        <h2>Sources and whether they are working</h2>
        <div className="tablewrap"><table className="data">
          <thead><tr><th>Source</th><th>Status</th><th>Latest data</th><th>Last collected</th><th>Terms of use</th></tr></thead>
          <tbody>{(src || []).map((s) => (
            <tr key={s.id}>
              <td><a href={s.documentation_url}>{s.provider}</a><div className="small">{s.dataset}</div><div className="small muted">Published {FREQ[s.expected_frequency] || s.expected_frequency}</div></td>
              <td><span className={`dot ${s.health}`} />{HEALTH[s.health]}{s.error && <div className="small muted">{s.error}</div>}</td>
              <td>{longDate(s.observation_end)}{s.age_days != null && <div className="small muted">{s.age_days} days old; marked late after {s.stale_after_days}</div>}</td>
              <td className="small">{dateTime(s.last_success_at || s.retrieved_at)}</td>
              <td className="small">{s.licence_url ? <a href={s.licence_url}>{s.licence}</a> : s.licence}</td></tr>))}</tbody>
        </table></div>
        <p className="small muted">Next to add: the Canadian Food Inspection Agency's animal-disease records, crop maps to show which weather alerts fall on farmland, and news reports to confirm events.</p>
      </section>

      <section className="panel" id="sec-indicators">
        <h2>How each figure is worked out</h2>
        {(ind?.indicators || []).map((i) => (
          <details key={i.id} className="more"><summary>{i.title}</summary>
            <p><b>Question.</b> {i.question}</p><p><b>What it measures.</b> {i.definition}</p><p><b>How we work it out.</b> {i.how_calculated}</p>
            <p><b>Compared with.</b> {i.baseline_rule}</p><p><b>What it does not tell you.</b> {i.does_not_show}</p>
            <p><a href={href(`/indicators/${i.id}`)}>See the figures →</a></p></details>))}
      </section>

      <section className="panel" id="sec-unusual">
        <h2>What “unusual” means</h2>
        <p>A figure is marked <b>unusual for the time of year</b> only when it is higher or lower than in every one of the comparable past years we have (up to five, and at least three). Prices are first converted to today's dollars. The rule is deliberately strict and simple. It points to figures worth a closer look; it does not declare a problem. We will review it once we can test it against past events.</p>
        <p>A few figures are handled differently. World prices are compared in US dollars without adjusting for inflation, and the text says so. Food insecurity is published once a year, so we show it without an “unusual” test. The drought shares for the Prairies use straight-line boxes south of 54° north, which only approximate farmland.</p>
        <p>For disasters abroad, the automatic check stops at one question: did Canada import at least 5% of a product we track from the country hit, in the latest year of trade data? For earthquakes and volcanic eruptions, which damage a small area, the bar is 20%. Anything beyond that needs a person to check where the disaster struck and what it damaged.</p>
      </section>

      <section className="panel" id="sec-ratings">
        <h2>Our team's ratings</h2>
        <p>The list of eighteen threats, their levels of concern, their warning levels and the exposure ratings of the twelve weak points come from the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>. They are the research team's preliminary judgement, labelled <Evidence cls="author_judgement" /> wherever they appear, and never mixed into the official figures or the automatic summaries. A structured review with experts should replace them.</p>
      </section>

      <section className="panel" id="sec-limits">
        <h2>Limits</h2>
        <ul>
          <li>Coverage is narrow on purpose: one wholesale market, grain in licensed elevators, five cities for diesel, and national averages for most prices and wages.</li>
          <li>Ongoing disruptions, such as the closure of the Strait of Hormuz, are summarised by the research team from published sources. The summary is labelled as ours and carries the date we last reviewed it; only the linked figures update automatically.</li>
          <li>Sources publish at different speeds. Grain figures arrive weeks after the fact; trade figures a year or more.</li>
          <li>Canada buying from a country hit by a disaster is a reason to look, not evidence of an effect. Two things happening at the same time does not mean one caused the other.</li>
          <li>The what-if tests and timelines are simple illustrations. None has yet been checked against real events.</li>
          <li>No one reviews the content before it is published. Treat it as a starting point for questions.</li>
        </ul>
      </section>

      <section className="panel" id="sec-corrections">
        <h2>Corrections</h2>
        {CORRECTIONS.length ? <ul>{CORRECTIONS.map((c) => <li key={c.date}><b>{longDate(c.date)}.</b> {c.text}</li>)}</ul> : <p>No corrections so far. Published weekly briefs are never rewritten; any correction will be listed here with its date.</p>}
      </section>

      <section className="panel" id="sec-reuse">
        <h2>Reuse</h2>
        <p>Every indicator page has a download button. The full history of updates is kept in the project's <a href="https://github.com/bdzion/canada-food-system-observatory/tree/data">public data archive</a>. Please credit the original sources listed above, under their terms of use.</p>
        <p>Suggested citation: Bodrud-Doza, M. ({new Date().getFullYear()}). <i>Canada Food System Observatory</i> [research prototype]. Arrell Food Institute, University of Guelph. https://bdzion.github.io/canada-food-system-observatory/ (data update {man?.release_id || "…"}).</p>
      </section>
    </>
  );
}
