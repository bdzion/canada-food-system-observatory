// The front page: written to stand on its own for a reader who has never seen the site.
import { useEffect, useMemo, useState } from "react";
import AlertMap from "../components/AlertMap";
import { Evidence } from "../components/Badges";
import { STEPS, TEST_TITLE } from "../content/plain";
import { INDIC, CHECKED } from "../legacy/core.js";
import { load, useData } from "../lib/data";
import { dateTime, longDate } from "../lib/format";
import { liveWeather, type LiveAlerts } from "../lib/live";
import { href } from "../lib/router";
import type { EventItem, Situation } from "../lib/types";
import { isNew, lastVisit, remember } from "../lib/visit";

const KEY_FACTS = ["phosphate", "rail", "beef", "produce"];

export default function Overview({ day }: { day?: string }) {
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
  const facts = KEY_FACTS.map((id) => (INDIC as any[]).find((i) => i.id === id)).filter(Boolean);
  const notices = (events?.items || []).filter((e) => e.kind === "recall" || e.kind === "gov_notice").slice(0, 6);
  return (
    <>
      <section className="intro">
        <div>
          <h1>Is Canada's food system ready for the next shock?</h1>
          <p className="lede">Canada grows far more food than it eats. But food reaches people through a chain of farms, rail lines, ports, processing plants and stores, and some links in that chain have little or no backup.</p>
          <p>Droughts, animal diseases, strikes and trade disputes will keep happening. Whether one turns into empty shelves or lost incomes depends on how much backup each link has, and on how early governments and industry act.</p>
          <p>This site gathers official data that are now spread across many websites, updates them automatically several times a day, and puts them in one place. It is a research tool from the University of Guelph, not an official warning service.</p>
        </div>
        <div className="howto">
          <b>How to use this site</b>
          <p style={{ marginTop: 6 }}>Read it as four steps. Each step answers one question and leads to the next.</p>
          <ol style={{ paddingLeft: 18, margin: 0 }}>
            {STEPS.map((x) => <li key={x.n}><a href={href(x.path)}>{x.title}</a>: {x.q}</li>)}
          </ol>
          <p className="small muted" style={{ marginTop: 8 }}>Every figure shows where it comes from and the date it describes. Labels such as <Evidence cls="observation" /> and <Evidence cls="author_judgement" /> tell you what kind of information you are looking at.</p>
        </div>
      </section>

      <h2>Four facts about where Canada is exposed</h2>
      <div className="facts">
        {facts.map((f: any) => (
          <a key={f.id} className="fact" href={href("/indicators")} style={{ textDecoration: "none", color: "inherit" }}>
            <span className="n">{f.num}</span><span className="t">{f.title}</span>
            <span className="s">Source: {f.src}</span>
          </a>
        ))}
      </div>
      <p className="small muted" style={{ marginTop: -16 }}>Published figures, checked {CHECKED}. Step 2 lists all twelve with their sources.</p>

      <section className="panel" aria-labelledby="h-week" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
          <h2 id="h-week" style={{ margin: 0 }}>{day ? `The situation on ${longDate(day)}` : "This week, in plain numbers"}</h2>
          <span className="small muted">Updated {s ? dateTime(s.generated_at) : "…"}</span>
        </div>
        {!s ? <p className="muted">Loading…</p> : (
          <ul className="brief5" style={{ marginTop: 10 }}>
            {s.headline.map((h, i) => <li key={i}><span className="theme">{h.theme}</span><span>{h.text} <a href={href(h.link.replace("/exposure", "/threats/abroad"))} className="small">See the data →</a></span></li>)}
          </ul>
        )}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 10, fontSize: ".9rem" }}>
          {!day && (visit ? <a href={href("/threats/warnings?new=1")} className="pill new">{newEvents.length} new item{newEvents.length === 1 ? "" : "s"} since your last visit</a> : <span className="pill">Welcome. Next time, new items will be marked for you.</span>)}
          <label>See an earlier day:{" "}
            <select value={day || ""} onChange={(e) => { location.hash = e.target.value ? `#/?day=${e.target.value}` : "#/"; }}>
              <option value="">Today</option>
              {(archive?.days || []).slice().reverse().map((d) => <option key={d} value={d}>{longDate(d)}</option>)}
            </select>
          </label>
          <a href={href("/briefs")}>Read the weekly brief →</a>
        </div>
        {day && <div className="notice info">You are looking at the summary as it was recorded on {longDate(day)}. <a href={href("/")}>Back to today</a>.</div>}
      </section>

      <h2>Start here</h2>
      <div className="stepcards">
        {STEPS.map((x) => (
          <a key={x.n} className="stepcard" href={href(x.path)}>
            <span className="num">{x.n}</span><b>{x.title}</b><p>{x.blurb}</p>
          </a>
        ))}
      </div>

      {s && (
        <div className="grid2" style={{ marginTop: 22 }}>
          <section className="panel">
            <h2>Questions to ask this week</h2>
            <p className="small muted">Prompted by this week's figures. They are questions, not advice.</p>
            <ul className="qlist">{s.questions.map((q, i) => <li key={i}>{q.text}{q.scenario && <> <a href={href(`/threats/${q.scenario}`)}>Try the what-if →</a></>}</li>)}</ul>
          </section>
          <section className="sow">
            <div className="eyebrow" style={{ color: "#c9d6ee" }}>This week's what-if</div>
            <h2>What if {(TEST_TITLE[s.scenario_of_week.id] || s.scenario_of_week.title).replace(/^./, (c) => c.toLowerCase())}?</h2>
            <p>We chose this one because {s.scenario_of_week.reason}. Move the settings and see how much acting early could save compared with waiting.</p>
            <a className="btn" href={href(`/threats/${s.scenario_of_week.id}`)}>Try it</a>
            <p className="small" style={{ marginTop: 12, opacity: 0.85 }}>A simple illustration with every assumption listed. Not a forecast.</p>
          </section>
        </div>
      )}

      <div className="grid2">
        <section className="panel">
          <h2>Weather warnings in effect</h2>
          {live && !day ? <p className="small"><span className="dot ok" />Checked just now with Environment and Climate Change Canada: <b>{live.count}</b> alert{live.count === 1 ? "" : "s"}, including {live.warnings} warning{live.warnings === 1 ? "" : "s"}.</p>
            : <p className="small"><span className="dot stale" />{liveErr ? "Could not reach Environment and Climate Change Canada just now, so this map" : "This map"} shows the alerts at our last daily update.</p>}
          <AlertMap geo={live && !day ? live.geo : geo} height={320} />
          <p className="small muted" style={{ marginTop: 6 }}>Coloured areas are forecast regions, not farmland. Full alert text is on <a href="https://weather.gc.ca/warnings/index_e.html">weather.gc.ca</a>.</p>
        </section>
        <section className="panel">
          <h2>Latest government notices</h2>
          <ul className="changes">
            {notices.map((e) => <li key={e.id}>{isNew(e.id) && <span className="pill new">New</span>} <a href={e.url}>{e.title}</a> <span className="muted small">· {e.issuer} · {longDate(e.date)}</span></li>)}
          </ul>
          <p style={{ marginTop: 10 }}><a href={href("/threats/warnings")}>All current warnings and notices →</a></p>
          {s && s.changes.length > 0 && (<><h3 style={{ marginTop: 16 }}>New since the previous update</h3>
            <ul className="changes">{s.changes.map((c, i) => <li key={i}><a href={href(c.link)}>{c.text}</a></li>)}</ul></>)}
          {s && s.gaps.length > 0 && (<><h3 style={{ marginTop: 16 }}>Gaps in the data</h3>
            <ul className="changes">{s.gaps.map((g, i) => <li key={i}><span className="dot stale" />{g.text}</li>)}</ul></>)}
        </section>
      </div>
    </>
  );
}
