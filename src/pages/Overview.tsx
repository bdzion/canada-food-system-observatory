// The front page: written to stand on its own for a reader who has never seen the site.
import { useEffect, useMemo, useState } from "react";
import AlertMap from "../components/AlertMap";
import { Evidence } from "../components/Badges";
import { Spark } from "../components/Spark";
import { LIVE_NODE, NODE_ORDER, STEPS, TEST_TITLE } from "../content/plain";
import { INDIC, NODES, CHECKED } from "../legacy/core.js";
import { load, useData } from "../lib/data";
import { dateTime, longDate } from "../lib/format";
import { liveWeather, type LiveAlerts } from "../lib/live";
import { href } from "../lib/router";
import type { EventItem, Indicator, Situation } from "../lib/types";
import { isNew, lastVisit, remember } from "../lib/visit";

const KEY_FACTS = ["phosphate", "rail", "beef", "produce"];

export default function Overview({ day }: { day?: string }) {
  const { data: current } = useData<Situation>("situation.json");
  const { data: events } = useData<{ items: EventItem[] }>("events.json");
  const { data: geo } = useData("weather-alerts.geojson");
  const { data: archive } = useData<{ days: string[] }>("archive/index.json");
  const { data: indData } = useData<{ indicators: Indicator[] }>("indicators.json");
  const { data: ongoing } = useData<{ items: any[] }>("ongoing.json");
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
      <h1>Is Canada's food system ready for the next shock?</h1>
      <p className="lede" style={{ maxWidth: "78ch" }}>
        Canada grows far more food than it eats, but food reaches people through a chain of farms, rail lines,
        ports, processing plants and stores, and some links in that chain have little backup. This page shows
        where the published figures stand today.
      </p>

      {s && <NowInOneLine s={s} />}

      {!day && (ongoing?.items || []).map((o) => (
        <section key={o.id} className="ongoing" aria-labelledby={`h-${o.id}`}>
          <span className="tag">Ongoing disruption · day {o.days}</span> <Evidence cls="author_judgement" /> <Evidence cls="observation" />
          <h2 id={`h-${o.id}`}>{o.title}</h2>
          <p>{o.summary[0]} {o.summary[1]}</p>
          <div className="live">
            <span className={`dot ${o.live.state === "still_showing" ? "stale" : "ok"}`} />
            <span><b>Live check:</b> {o.live.text}</span>
            <Spark values={o.live.spark} w={120} h={28} label="Ships through the Strait of Hormuz, recent weeks" />
          </div>
          <p className="small muted">{o.note}</p>
          <a className="btn" href={href("/threats/ongoing")}>What it could mean for Canada</a>
        </section>
      ))}

      {indData && <Glance inds={indData.indicators} />}

      <section className="intro" style={{ marginTop: 26 }}>
        <div>
          <h2 style={{ marginTop: 0 }}>What this site is</h2>
          <p>Droughts, animal diseases, strikes and trade disputes will keep happening. Whether one turns into empty shelves or lost incomes depends on how much backup each link has, and on how early governments and industry act.</p>
          <p>This site gathers official data that are now spread across many websites, updates them automatically several times a day, and puts them in one place. It is a research tool from the University of Guelph, not an official warning service.</p>
          <p className="notice judge" style={{ marginTop: 10 }}>
            <b>No one reviews the content before it is published.</b> Treat it as a starting point for questions,
            not as advice. Only the responsible agency can issue a warning. Where you see{" "}
            <Evidence cls="author_judgement" /> the words are ours, not a measurement.
          </p>
          <p className="small muted">
            Two things worth holding on to, borrowed from the United Kingdom's food security reporting: a single
            event rarely has a measurable effect on food security on its own, and food security cannot be
            reduced to one number. That is why this site has no overall score.
          </p>
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

/* The state of the system in one line, for a reader who has thirty seconds.
   Everything in it is already published in situation.json; nothing is computed
   here beyond counting. */
function NowInOneLine({ s }: { s: Situation }) {
  const t = s.transmission;
  const look = s.counts?.worth_a_look ?? 0;
  const total = s.counts?.indicators ?? 0;
  const late = s.gaps?.length ?? 0;
  return (
    <section className="nowline" aria-labelledby="h-now">
      <h2 id="h-now">Where things stand today</h2>
      <ul>
        <li>
          <b>{look} of {total}</b> figures we follow are worth a closer look, meaning both of our checks agree
          on them. <a href={href("/indicators")}>See the figures →</a>
        </li>
        {t && (
          <li>
            {t.n_moving === 0
              ? <>None of the <b>{t.n_chains}</b> chains of knock-on effects shows readings that have moved along it.</>
              : <>
                  <b>{t.n_moving} of {t.n_chains}</b> chains of knock-on effects show readings that have moved
                  along them{t.furthest[0]?.stage_label && <>. The furthest has reached the link we call
                    “{t.furthest[0].stage_label.toLowerCase()}”</>}.
                </>}{" "}
            <a href={href("/threats")}>See the chains →</a>
          </li>
        )}
        {late > 0 && (
          <li>
            <b>{late}</b> source{late === 1 ? " is" : "s are"} late or unavailable, so some figures below are the
            last ones published rather than current ones. <a href={href("/about#sec-sources")}>Which ones →</a>
          </li>
        )}
      </ul>
    </section>
  );
}

/* The food chain at a glance: for each link, how many of the live figures
   there are worth a closer look. */
function Glance({ inds }: { inds: Indicator[] }) {
  const nodes = NODES as any[];
  return (
    <section aria-labelledby="h-glance">
      <h2 id="h-glance" style={{ marginBottom: 4 }}>The food chain at a glance</h2>
      <p className="small muted" style={{ margin: 0 }}>How many of the figures we follow at each link are worth a closer look today, meaning both our checks agree on them. Choose a link to see them.</p>
      <div className="glance">
        {NODE_ORDER.map((id) => {
          const xs = inds.filter((i) => LIVE_NODE[i.id] === id);
          const out = xs.filter((i) => i.headline.screen?.worth_a_look);
          const n = nodes.find((x) => x.id === id);
          return (
            <a key={id} href={href(`/system?node=${id}`)}>
              <b>{n?.name || id}</b>
              <span className="n">{xs.length} figure{xs.length === 1 ? "" : "s"}</span><br />
              {out.length ? <span className="flag">◆ {out.length} worth a look</span> : <span className="ok">● nothing standing out</span>}
            </a>
          );
        })}
      </div>
    </section>
  );
}
