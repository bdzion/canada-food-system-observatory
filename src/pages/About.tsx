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
        <h2>How we decide what is worth a closer look</h2>
        <p>We run two checks on every figure. They answer different questions, and we report them separately rather than adding them together.</p>
        <p><b>The level check.</b> Is the latest reading higher or lower than the same week or month in every one of the past five years? Prices are converted to today's dollars first.</p>
        <p><b>The pace check.</b> Is the figure moving faster than it usually moves at this time of year? We compare its growth over the last three months and over the last year against how much it grew over the same periods in earlier years.</p>

        <h3>Why two, and not one</h3>
        <p>Until November 2026 this site used the level check alone and called any reading outside past years “unusual”. Testing that rule against our own stored history showed it cannot do the job it was given, and the page here used to claim it was “deliberately strict”. It is the opposite.</p>
        <p>If nothing has changed, a new reading has an equal chance of landing anywhere among the readings it is compared with. With five past years, that gives it a <b>one in three</b> chance of being the highest or the lowest of the six simply by luck. With the three-year minimum we sometimes fall back to, the chance is <b>one in two</b>. A check that fires a third of the time when nothing is happening cannot tell you that something is.</p>
        <p>The measured result matched. Applied to every past period of every figure we hold, the level check fired on <b>44%</b> of them. For the farm input price index it fired on <b>every single quarter</b> we could test, because that index climbs year after year, so each quarter is a new five-year high. On the day we changed this, 13 of 20 figures carried the “unusual” label. When two-thirds of a dashboard is flagged, the flag means nothing, and the readings that did matter were buried among the ones that are flagged every month by construction.</p>
        <p>The pace check fixes the specific weakness: comparing growth rather than level removes a steady climb and the yearly seasonal pattern at the same time. It is not a replacement, though. On figures that are already a share of something, such as the drought extent, it is the wrong frame and fires far more often than the level check does. So for every figure we record which checks are meaningful for it and why, and each figure's own page shows that reasoning.</p>

        <h3>What we say, and when</h3>
        <p>Each reading is placed on a short ladder. <b>Nothing unusual</b> means neither check fired. <b>Highest or lowest in five years</b> means the level check fired but the figure is moving at its usual pace, which on a climbing figure is its ordinary state and is not a warning. <b>Moving unusually fast</b> means the pace check fired but the reading is still inside the range of past years; it is the earlier of the two signals. <b>Outside past years and moving unusually fast</b> means both agree, and that is the combination we call out.</p>
        <p>Where only one check is meaningful for a figure, that check firing is as far as that figure can go, and we say so rather than implying an agreement we cannot test. The level check does not fire at all on fewer than five comparison years, because at three it would be wrong half the time.</p>
        <p>The pace check follows the method behind UN Sustainable Development Goal indicator 2.c.1, the <a href="https://unstats.un.org/sdgs/metadata/files/Metadata-02-0C-01.pdf">Indicator of Food Price Anomalies</a> published by the Food and Agriculture Organization, including its weighting and its thresholds of half and one standard deviation. We depart from it in two ways, both deliberate: we apply it in both directions, because a buffer emptying matters here as much as a price rising, and we apply it to figures that are not prices, where growth means the proportional change in a count or a ratio.</p>
        <p>Neither check is a forecast. Both say only whether a recent movement is unusual against the past, and this site is not an alerting service: only the responsible agency can issue a warning.</p>

        <h3>Figures handled differently</h3>
        <p>World prices are compared in US dollars without adjusting for inflation, and the text says so. Food insecurity is published once a year, with too few readings for either check, so we show it as published. Grocery prices against wages are already a gap between two rates of change, which can be negative, so neither check applies. The drought shares for the Prairies use straight-line boxes south of 54° north, which only approximate farmland, and the monitor's archive starts in 2023, so there are at most three years to compare and the level check cannot fire on it.</p>
        <p>For disasters abroad, the automatic check stops at one question: did Canada import at least 5% of a product we track from the country hit, in the latest year of trade data? For earthquakes and volcanic eruptions, which damage a small area, the bar is 20%. Anything beyond that needs a person to check where the disaster struck and what it damaged.</p>
      </section>

      <section className="panel" id="sec-chains">
        <h2>How we read a chain of knock-on effects</h2>
        <p>Each of the seven what-if tests has a chain written out beside it: the links a shock would pass through, from the first pressure outside Canada to the moment it reaches a shop shelf. At each link we name the published figures that would show a shock passing, and the reading that would count as one speaking.</p>
        <p><b>A stage counts only if the stages before it count too.</b> A shock travelling along a chain leaves a mark at each link it passes, so a reading at the far end on its own is not evidence that anything travelled. Egg prices being high is not evidence of a bird flu outbreak unless something upstream of the shop shelf says so as well. Where a reading further down has moved with nothing behind it, we say so and suggest looking for another cause.</p>
        <p><b>A link we cannot see stops the chain.</b> Three chains begin at a stage with no figure at all: animal disease, cyberattacks on food businesses, and absence at food plants. Canada publishes no current, openly licensed data for any of them. We mark those stages as unwatched rather than clear, because treating a gap in the data as a finding would be the worst mistake this site could make.</p>
        <p><b>A stage remembers.</b> Whether a stage counts depends on the readings now and on where the chain stood at the previous update. Without that the stage would flicker between updates, and a disruption that is one continuous thing would look like several. A stage that was reached and has since gone quiet is shown as easing, which is not the same as never having happened.</p>
        <p><b>The levels are our judgement.</b> No threshold in any chain has been tested against a past Canadian disruption. Every one is labelled <Evidence cls="author_judgement" />, and every figure behind it is named and linked so you can check it yourself. The chains do not feed the what-if tests: you set those yourself, and their numbers do not move when the data do.</p>
        <p>The design follows the European Commission's Combined Drought Indicator, which classifies a place by which link of the drought cascade its evidence has reached rather than by a single severity score, and the Joint Research Centre's hotspot system, which publishes the automatic warning counts beside the expert assessment so the two can be compared.</p>
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
