import { useEffect, useMemo, useState } from "react";
import AlertMap from "../components/AlertMap";
import { Evidence, StateChip } from "../components/Badges";
import { load, useData } from "../lib/data";
import { dateTime, longDate } from "../lib/format";
import { liveWeather, type LiveAlerts } from "../lib/live";
import { href } from "../lib/router";
import type { Card, EventItem, Situation } from "../lib/types";
import { isNew, lastVisit, remember } from "../lib/visit";

const CLASS_OF: Record<string, string> = {
  weather_alerts: "official_alert", food_recalls: "official_notice", global_hazards: "official_alert", gov_notices: "official_notice",
};
const COLS: { key: keyof Situation["columns"]; title: string; sub: string }[] = [
  { key: "happening", title: "What is happening", sub: "Official alerts and notices, in Canada and abroad" },
  { key: "reach", title: "Where it could reach Canada", sub: "Global hazards in countries that supply us" },
  { key: "absorbs", title: "What absorbs it", sub: "Buffers and flows, compared with other years" },
  { key: "feels", title: "Who feels it", sub: "What it means for household budgets" },
];

function SitCard({ c, col }: { c: Card; col: string }) {
  const cls = col === "reach" ? "supplier_link" : CLASS_OF[c.id] || "observation";
  const link = col === "reach" ? href("/exposure") : c.id === "global_hazards" ? href("/exposure") : c.id === "gov_notices" ? href("/events?kind=gov_notice") : href(`/indicators/${c.id}`);
  return (
    <a className="card" href={link}>
      <div className="meta"><Evidence cls={cls} />{c.state && col !== "reach" && <StateChip state={c.state} direction={c.direction} />}</div>
      <h4>{c.title}</h4>
      <p>{c.text}</p>
      {c.period && <div className="period">Data: {c.period}</div>}
    </a>
  );
}

export default function SituationRoom({ day }: { day?: string }) {
  const { data: current } = useData<Situation>("situation.json");
  const { data: events } = useData<{ items: EventItem[] }>("events.json");
  const { data: geo } = useData("weather-alerts.geojson");
  const { data: archive } = useData<{ days: string[] }>("archive/index.json");
  const [past, setPast] = useState<Situation | null>(null);
  const [live, setLive] = useState<LiveAlerts | null>(null);
  const [liveErr, setLiveErr] = useState(false);

  useEffect(() => {
    setPast(null);
    if (day) load(`archive/${day}.json`).then((a: any) => setPast(a.situation), () => setPast(null));
  }, [day]);
  useEffect(() => {
    const ac = new AbortController();
    liveWeather(ac.signal).then(setLive, () => setLiveErr(true));
    return () => ac.abort();
  }, []);
  const visit = lastVisit();
  const newEvents = useMemo(() => (events && visit ? events.items.filter((e) => isNew(e.id)) : []), [events, visit]);
  useEffect(() => {
    if (current && events && !day) remember(current.release_id, events.items.map((e) => e.id));
  }, [current, events, day]);

  const s = day ? past : current;
  if (!s) return <p className="muted">Loading the situation…</p>;
  const latestEvents = (events?.items || []).filter((e) => e.kind === "recall" || e.kind === "gov_notice").slice(0, 7);
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow">National situation · {day ? `as recorded on ${longDate(day)}` : "updated automatically from official sources"}</div>
          <h1>Shocks are inevitable. Crises are not.</h1>
          <p className="tag">This page follows what is hitting Canada's food system, what is absorbing it, and who would feel it.</p>
          <p className="lede">Every line below is built by fixed rules from official data and links to its source. When something looks unusual, the page says so and asks a question. It never declares a crisis.</p>
        </div>
        <div className="release">
          <div className="row"><span>Data release</span><b>{dateTime(s.generated_at)}</b></div>
          <div className="row"><span>Since your last visit</span>
            {day ? <span className="muted">—</span> : visit ? <a href={href("/events?new=1")} className="pill new">{newEvents.length} new event{newEvents.length === 1 ? "" : "s"}</a> : <span className="muted">first visit: welcome</span>}</div>
          <div className="row"><span>Look back</span>
            <select aria-label="View the situation as recorded on an earlier day" value={day || ""} onChange={(e) => { location.hash = e.target.value ? `#/?day=${e.target.value}` : "#/"; }}>
              <option value="">Today</option>
              {(archive?.days || []).slice().reverse().map((d) => <option key={d} value={d}>{longDate(d)}</option>)}
            </select></div>
          <div className="row"><span>Weekly brief</span><a href={href("/briefs")}>Read or subscribe →</a></div>
        </div>
      </section>
      {day && <div className="notice info">You are viewing the situation as the pipeline recorded it on {longDate(day)}. <a href={href("/")}>Return to today</a>.</div>}

      <section className="panel" aria-labelledby="h-week">
        <h2 id="h-week">This week at a glance</h2>
        <ul className="brief5">
          {s.headline.map((h, i) => <li key={i}><span className="theme">{h.theme}</span><span>{h.text} <a href={href(h.link)} className="small">Evidence →</a></span></li>)}
        </ul>
      </section>

      <section aria-labelledby="h-chain">
        <h2 id="h-chain">From shock to household</h2>
        <p className="muted small">Read left to right: a shock matters when it reaches a weak point and the buffers that should absorb it are thin.</p>
        <div className="chain">
          {COLS.map((c) => (
            <div className="col" key={c.key}>
              <div className="colhead"><h3>{c.title}</h3><p>{c.sub}</p></div>
              {s.columns[c.key].length ? s.columns[c.key].map((card) => <SitCard key={card.id} c={card} col={c.key} />)
                : <div className="empty">{c.key === "reach" ? "No current global hazard alert is in a country that supplies a large share of the tracked imports." : "No data in this release."}</div>}
            </div>
          ))}
        </div>
      </section>

      <div className="grid2">
        <section className="panel" aria-labelledby="h-q">
          <h2 id="h-q">Questions worth asking</h2>
          <p className="small muted">Prompts generated from this week's data, not recommendations.</p>
          <ul className="qlist">{s.questions.map((q, i) => <li key={i}>{q.text}{q.scenario && <> <a href={href(`/lab/${q.scenario}`)}>Test it →</a></>}</li>)}</ul>
        </section>
        <section className="sow" aria-labelledby="h-sow">
          <div className="eyebrow" style={{ color: "#c9d6ee" }}>Stress test of the week</div>
          <h2 id="h-sow">{s.scenario_of_week.title}</h2>
          <p>Chosen because {s.scenario_of_week.reason}. Guess the answer first, then move the settings and see how much acting earlier could change.</p>
          <a className="btn" href={href(`/lab/${s.scenario_of_week.id}`)}>Open the stress test</a>
          <p className="small" style={{ marginTop: 12, opacity: 0.85 }}>Illustrative model with stated assumptions. Not a forecast.</p>
        </section>
      </div>

      <div className="grid2">
        <section className="panel" aria-labelledby="h-map">
          <h2 id="h-map">Weather alerts in effect</h2>
          {live && !day ? <p className="small"><span className="dot ok" />Live check from ECCC GeoMet at {dateTime(live.at)}: <b>{live.count}</b> alert{live.count === 1 ? "" : "s"} ({live.warnings} warning{live.warnings === 1 ? "" : "s"}).</p>
            : <p className="small"><span className="dot stale" />{liveErr ? "Live check unavailable; showing" : "Showing"} the snapshot from the latest data release.</p>}
          <AlertMap geo={live && !day ? live.geo : geo} height={330} />
          <p className="small muted" style={{ marginTop: 6 }}>Alert areas are forecast regions, not farmland. <a href="https://weather.gc.ca/warnings/index_e.html">Full text at weather.gc.ca</a>.</p>
        </section>
        <section className="panel" aria-labelledby="h-latest">
          <h2 id="h-latest">Latest official notices</h2>
          <ul className="changes">
            {latestEvents.map((e) => <li key={e.id}>{isNew(e.id) && <span className="pill new">New</span>} <Evidence cls={e.evidence_class} /> <a href={e.url}>{e.title}</a> <span className="muted small">· {e.issuer} · {longDate(e.date)}</span></li>)}
          </ul>
          <p style={{ marginTop: 10 }}><a href={href("/events")}>All events and filters →</a></p>
        </section>
      </div>

      <div className="grid2">
        <section className="panel" aria-labelledby="h-changed">
          <h2 id="h-changed">What changed since the previous release</h2>
          {s.changes.length ? <ul className="changes">{s.changes.map((c, i) => <li key={i}><a href={href(c.link)}>{c.text}</a></li>)}</ul>
            : <p className="muted">No new observations or notices since the previous release. No new data is not the same as no change.</p>}
        </section>
        <section className="panel" aria-labelledby="h-gaps">
          <h2 id="h-gaps">Evidence gaps</h2>
          {s.gaps.length ? <ul className="changes">{s.gaps.map((g, i) => <li key={i}><span className="dot stale" />{g.text}</li>)}</ul>
            : <p>All sources refreshed normally in this release. Each still has its own publication lag; see each card's data period.</p>}
          <p className="small muted">The grain statistics are published weeks after the fact, and monthly prices a few weeks after month-end. Daily wholesale prices and official alerts are the freshest signals here.</p>
        </section>
      </div>
    </>
  );
}
