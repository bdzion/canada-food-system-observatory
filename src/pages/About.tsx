import { Evidence } from "../components/Badges";
import { useData } from "../lib/data";
import { EVIDENCE, dateTime, longDate, days } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator, Manifest, Source } from "../lib/types";

// Public record of corrections to published briefs or methods. Add entries here; never delete them.
const CORRECTIONS: { date: string; text: string }[] = [
  { date: "2026-11-25", text: "We replaced the single “unusual” check with two checks, one on the level of a reading and one on its pace. Testing had shown the old rule flagged far too many readings. This page had described the old rule as “deliberately strict”. It was not. The section on what is worth a closer look explains the change." },
];

/* Every value sources.yml allows for expected_frequency needs an entry here, or the
   raw key reaches the page. The fallback below turns underscores into spaces so a
   new value reads as English even before someone adds it. */
const FREQ: Record<string, string> = { continuous: "continuously", business_days: "every business day", monthly: "monthly", weekly: "weekly", daily: "daily", event_driven: "whenever there is news", annual: "once a year", three_times_a_year: "three times a year", quarterly: "every three months", biweekly: "every two weeks" };
const freqWords = (k: string) => FREQ[k] || k.replace(/_/g, " ");
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
        {[["who", "Who made this"], ["rules", "Our rules"], ["labels", "The labels"], ["updates", "How updates work"], ["sources", "Sources"], ["indicators", "How each figure is worked out"], ["unusual", "What is worth a closer look"], ["chains", "Chains of knock-on effects"], ["ratings", "Our team's ratings"], ["limits", "Limits"], ["corrections", "Corrections"], ["reuse", "Reuse"]].map(([a, l]) => <a key={a} className="chip" href={`#sec-${a}`} onClick={go(a)}>{l}</a>)}
      </nav>

      <section className="panel" id="sec-who">
        <h2>Who made this, and why</h2>
        <p>Droughts, strikes, disease outbreaks and trade disputes will keep happening. Whether one becomes a crisis depends on how much backup the food system has, and on how early people act. This site is meant to help people see trouble early.</p>
        <p>We built it at the Arrell Food Institute, University of Guelph, as part of research on how Canada can prepare its food system for shocks. It builds on the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>, which set out the threats and the what-if tests.</p>
        <p>The information we use is public. But it is spread across many websites, published on different schedules and rarely put side by side. The site collects it automatically, compares it with past years and links each figure back to its source.</p>
        <p>This is a research prototype. It is not a Government of Canada service, and it does not issue official warnings.</p>
        <p>Contact: <a href="mailto:mbodrudd@uoguelph.ca">mbodrudd@uoguelph.ca</a>.</p>
      </section>

      <section className="panel" id="sec-rules">
        <h2>Our rules</h2>
        <ol>
          <li><b>Canada first.</b> A disaster abroad appears here only with an answer to “Why could this matter for Canada?” and a statement of how far the evidence goes.</li>
          <li><b>Facts, warnings, models and opinions stay separate.</b> Every card is labelled with the kind of information it holds.</li>
          <li><b>Every figure can be traced.</b> Each shows its source, the period it covers and when we collected it.</li>
          <li><b>No hidden gaps.</b> Missing data are shown as missing, never as zero. Old data are never shown as current.</li>
          <li><b>Watch the backup, not only the shocks.</b> Stocks of grain, spare transport capacity and household budgets decide how far a shock travels, so we track them alongside the shocks themselves.</li>
          <li><b>No single risk score.</b> We do not add different kinds of information into one number, because the total would hide what each part says.</li>
        </ol>
      </section>

      <section className="panel" id="sec-labels">
        <h2>The labels on each card</h2>
        <p>Every card carries one of these labels, so you can tell a measurement from a warning, a model or our own opinion.</p>
        <div className="tablewrap"><table className="data"><tbody>
          {Object.entries(EVIDENCE).map(([k, [, d]]) => <tr key={k}><td><Evidence cls={k} /></td><td>{d}</td></tr>)}
        </tbody></table></div>
      </section>

      <section className="panel" id="sec-updates">
        <h2>How updates work</h2>
        <p>Four times a day, a computer program collects the latest figures from each source, checks them, compares them with past years and publishes the result here. A new update replaces the old one only after every file passes its checks.</p>
        <p>If a source cannot be reached, the site keeps the last good figures with their original dates and marks the source as not working. Nothing is filled in.</p>
        <p>The weather map also checks Environment and Climate Change Canada directly each time you open the overview page. Every Monday the program writes the weekly brief for the week just ended. A copy of each day's summary is kept, so you can see what the site showed on an earlier day.</p>
        <p>The plain-language summaries are assembled by fixed rules from the checked figures, not written by artificial intelligence. Each summary links to the figures it describes.</p>
        {man && <p className="small">Latest update {dateTime(man.generated_at)} (version <span className="kbd">{man.release_id}</span>){man.run_url ? <> · <a href={man.run_url}>technical log</a></> : null}.</p>}
      </section>

      <section className="panel" id="sec-sources">
        <h2>Sources and whether they are working</h2>
        <div className="tablewrap"><table className="data">
          <thead><tr><th>Source</th><th>Status</th><th>Latest data</th><th>Last collected</th><th>Terms of use</th></tr></thead>
          <tbody>{(src || []).map((s) => (
            <tr key={s.id}>
              <td><a href={s.documentation_url}>{s.provider}</a><div className="small">{s.dataset}</div><div className="small muted">Published {freqWords(s.expected_frequency)}</div></td>
              <td><span className={`dot ${s.health}`} />{HEALTH[s.health]}{s.error && <div className="small muted">{s.error}</div>}</td>
              <td>{longDate(s.observation_end)}{s.age_days != null && <div className="small muted">{days(s.age_days)} old; marked late after {days(s.stale_after_days)}</div>}</td>
              <td className="small">{dateTime(s.last_success_at || s.retrieved_at)}</td>
              <td className="small">{s.licence_url ? <a href={s.licence_url}>{s.licence}</a> : s.licence}</td></tr>))}</tbody>
        </table></div>
        <p className="small muted">Next to add: the Canadian Food Inspection Agency's animal-disease records, crop maps to show which weather alerts fall on farmland, and news reports to confirm events.</p>
      </section>

      <section className="panel" id="sec-indicators">
        <h2>How each figure is worked out</h2>
        <p>Open a figure to see the question it answers, what it measures, how we work it out, what we compare it with, and what it cannot tell you.</p>
        {(ind?.indicators || []).map((i) => (
          <details key={i.id} className="more"><summary>{i.title}</summary>
            <p><b>Question.</b> {i.question}</p><p><b>What it measures.</b> {i.definition}</p><p><b>How we work it out.</b> {i.how_calculated}</p>
            {i.baseline_rule && <p><b>Compared with.</b> {i.baseline_rule}</p>}<p><b>What it does not tell you.</b> {i.does_not_show}</p>
            <p><a href={href(`/indicators/${i.id}`)}>See the figures →</a></p></details>))}
      </section>

      <section className="panel" id="sec-unusual">
        <h2>How we decide what is worth a closer look</h2>
        <p>Every figure gets two checks. They answer different questions, so we report them side by side and never add them together.</p>
        <p><b>The level check.</b> Is the latest reading above the highest, or below the lowest, of the same week or month in the past five years? Prices are converted to today's dollars first.</p>
        <p><b>The pace check.</b> Is the figure rising or falling faster than it usually does at this time of year? We compare its change over the last three months and the last year with its changes over the same periods in earlier years.</p>

        <h3>Why we changed the check in November 2026</h3>
        <p>Until November 2026, this site used the level check alone and called any reading outside past years “unusual”. When we tested that rule against our own stored history, it failed. This page had described the rule as “deliberately strict”. It was not.</p>
        <p>The reason is chance. If nothing has changed, a new reading is equally likely to land anywhere among the readings it is compared with. Set against five past years, it has a <b>one-in-three</b> chance of being the highest or lowest of the six by luck alone. Set against three years, the chance is <b>one in two</b>. A check that fires a third of the time when nothing is happening cannot tell you that something is.</p>
        <p>Our records bore this out. Applied to every past period of every figure we hold, the level check fired <b>44%</b> of the time. For the farm input price index, it fired in every quarter we could test: the index rises year after year, so each quarter sets a new five-year high. On the day we changed the rule, 13 of our 20 figures carried the “unusual” label. When two-thirds of a dashboard is flagged, the flag means nothing, and the readings that mattered were lost among those flagged every month by design.</p>
        <p>The pace check fixes this weakness. Because it compares change rather than level, it sets aside both a steady climb and the usual seasonal pattern. But it does not replace the level check. For shares, such as the share of farmland in drought, the pace check is the wrong tool and fires far more often than the level check. So for each figure we record which checks make sense and why, and the figure's own page shows that reasoning.</p>

        <h3>What we say, and when</h3>
        <p>Each reading sits on a short ladder:</p>
        <ul>
          <li><b>Nothing unusual.</b> Neither check fired.</li>
          <li><b>Highest or lowest in five years.</b> The level check fired, but the figure is moving at its usual pace. For a figure that climbs every year, this is normal and not a warning.</li>
          <li><b>Moving unusually fast.</b> The pace check fired, but the reading is still within the range of past years. This is the earlier of the two signals.</li>
          <li><b>Outside past years and moving unusually fast.</b> Both checks agree. This is the combination we call out.</li>
        </ul>
        <p>Some figures suit only one check. For those, that check firing is the highest step they can reach, and we say so rather than imply an agreement we cannot test. We show a comparison once three past years are available, but the level check counts as firing only with five, because with three it would be wrong half the time.</p>
        <p>The pace check follows the method of the <a href="https://unstats.un.org/sdgs/metadata/files/Metadata-02-0C-01.pdf">Indicator of Food Price Anomalies</a>, which the Food and Agriculture Organization of the United Nations uses for Sustainable Development Goal indicator 2.c.1. We keep its weighting and its thresholds of a half and one standard deviation. We depart from it in two deliberate ways. We apply it in both directions, because a buffer emptying matters here as much as a price rising. And we apply it to figures that are not prices, where “change” means the proportional change in a count or a share.</p>
        <p>Neither check is a forecast. Both say only whether a recent movement is unusual compared with the past. Only the responsible agency can issue a warning; this site does not.</p>

        <h3>Figures handled differently</h3>
        <ul>
          <li>World prices are compared in US dollars without adjusting for inflation, and the text says so.</li>
          <li>Food insecurity is published once a year, which gives too few readings for either check, so we show it as published.</li>
          <li>Grocery prices against wages is already the gap between two rates of change, and it can be negative, so neither check applies.</li>
          <li>Prairie drought shares use straight-line boxes south of 54° north, which only approximate farmland. The drought monitor's online archive starts in 2023, so there are at most three years to compare and the level check cannot yet fire.</li>
        </ul>
        <p>For disasters abroad, the automatic check asks one question: in the latest year of trade data, did Canada import at least 5% of a product we track from the country hit? For earthquakes and volcanic eruptions, which damage a small area, the bar is 20%. Anything beyond that needs a person to check where the disaster struck and what it damaged.</p>
      </section>

      <section className="panel" id="sec-chains">
        <h2>How we read a chain of knock-on effects</h2>
        <p>Each of the seven what-if tests comes with a chain: the links a shock would pass through, from the first pressure to the shop shelf. For each link we name the published figures that would show the shock passing, and the reading that would count as a sign.</p>
        <p><b>A stage counts only if the stages before it count too.</b> A shock leaves a mark at each link it passes, so a reading at the far end on its own is not evidence that anything travelled. High egg prices are not evidence of a bird flu outbreak unless something further up the chain says so too. Where a reading further down has moved with nothing behind it, we say so and suggest looking for another cause.</p>
        <p><b>A link we cannot see stops the chain.</b> Three chains begin at a stage with no figure at all: animal disease, cyberattacks on food businesses, and staff absences at food plants. For none of them have we found current figures that we can collect automatically under an open licence. We mark those stages as unwatched, not clear. Treating a gap in the data as good news would be the worst mistake this site could make.</p>
        <p><b>A stage remembers.</b> Whether a stage counts depends on today's readings and on where the chain stood at the previous update. Without that memory, a stage would flicker on and off between updates, and one continuous disruption would look like several. A stage that was reached and has since gone quiet is shown as easing, which is not the same as never having happened.</p>
        <p><b>The levels are our judgement.</b> No threshold in any chain has been tested against a past Canadian disruption. Every one is labelled <Evidence cls="author_judgement" />, and every figure behind it is named and linked so you can check it yourself. The chains do not feed the what-if tests: you set those yourself, and their numbers do not move when the data do.</p>
        <p>The design borrows from two European systems. The European Drought Observatory's Combined Drought Indicator rates a place by how far along the drought chain the evidence has reached: too little rain, then dry soil, then stressed crops (<a href="https://doi.org/10.5194/nhess-12-3519-2012">Sepulcre-Canto and others, 2012</a>). It does not use one severity score. The European Commission's ASAP early-warning system publishes its automatic warnings beside its experts' assessment, so the two can be compared (<a href="https://doi.org/10.1016/j.agsy.2018.07.002">Rembold and others, 2019</a>).</p>
      </section>

      <section className="panel" id="sec-ratings">
        <h2>Our team's ratings</h2>
        <p>The list of threats, their levels of concern and warning levels, and the exposure ratings of the weak points all come from the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>. They are the research team's preliminary judgement. They carry the label <Evidence cls="author_judgement" /> wherever they appear, and they are never mixed into the official figures or the automatic summaries. A structured review with experts should replace them.</p>
      </section>

      <section className="panel" id="sec-limits">
        <h2>Limits</h2>
        <ul>
          <li>Coverage is narrow: one wholesale market, grain in licensed elevators, five cities for diesel, and national averages for most prices and wages.</li>
          <li>Ongoing disruptions, such as the closure of the Strait of Hormuz, are summarised by the research team from published sources. Each summary is labelled as ours and carries the date we last reviewed it. Only the linked figures update automatically.</li>
          <li>Sources publish at different speeds. Some figures arrive within days, others, such as rail freight, two or three months later, and trade figures a year or more later.</li>
          <li>Canada buying from a country hit by a disaster is a reason to look, not evidence of an effect. Two things happening at the same time does not mean one caused the other.</li>
          <li>The what-if tests and timelines are simple illustrations. None has yet been checked against real events.</li>
          <li>No one checks the automatic updates before they are published. Treat the site as a starting point for questions, not a final answer.</li>
        </ul>
      </section>

      <section className="panel" id="sec-corrections">
        <h2>Corrections</h2>
        <p>Published weekly briefs are never rewritten. Corrections to briefs or to our methods are listed here with their dates.</p>
        {CORRECTIONS.length ? <ul>{CORRECTIONS.map((c) => <li key={c.date}><b>{longDate(c.date)}.</b> {c.text}</li>)}</ul> : <p>No corrections so far.</p>}
      </section>

      <section className="panel" id="sec-reuse">
        <h2>Reuse</h2>
        <p>Every indicator page has a download button. The full history of updates is kept in the project's <a href="https://github.com/bdzion/canada-food-system-observatory/tree/data">public data archive</a>. Please credit the original sources listed above, under their terms of use.</p>
        <p>Suggested citation: Bodrud-Doza, M. ({(man?.generated_at || "").slice(0, 4) || "n.d."}). <i>Canada Food System Observatory</i> [research prototype]. Arrell Food Institute, University of Guelph. https://bdzion.github.io/canada-food-system-observatory/ (data update {man?.release_id || "…"}).</p>
      </section>
    </>
  );
}
