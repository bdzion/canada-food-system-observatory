import { Evidence } from "../components/Badges";
import { DATA, useData } from "../lib/data";
import { longDate, dateTime } from "../lib/format";
import { href } from "../lib/router";

export function BriefList() {
  const { data, error } = useData<{ briefs: any[] }>("briefs/index.json");
  return (
    <>
      <div className="eyebrow">Situation Brief Archive</div>
      <h1>Weekly situation updates</h1>
      <p className="lede">Every Monday the pipeline writes a brief for the week just ended. Once published, a brief is never rewritten, so you can see what was known at the time. Corrections, if any, appear as notes.</p>
      <p><a className="btn ghost" href={`${DATA}feed.xml`}>Subscribe with RSS</a></p>
      {error && <p className="empty">No briefs yet.</p>}
      {(data?.briefs || []).map((b) => (
        <a key={b.id} className="card" href={href(`/briefs/${b.id}`)}>
          <div className="meta"><span className="pill">{b.id}</span><span>{longDate(b.week_start)} to {longDate(b.week_end)}</span></div>
          <p>{b.lead}</p>
        </a>
      ))}
    </>
  );
}

export function BriefDetail({ id }: { id: string }) {
  const { data: b, error } = useData<any>(`briefs/${id}.json`);
  if (error) return <p>That brief could not be found. <a href={href("/briefs")}>All briefs</a></p>;
  if (!b) return <p className="muted">Loading…</p>;
  return (
    <article className="brief-doc">
      <p className="small noprint"><a href={href("/briefs")}>← All briefs</a> · <a href={`${DATA}briefs/${id}.md`}>Markdown version</a> · <button className="chip" onClick={() => window.print()}>Print or save as PDF</button></p>
      <div className="eyebrow">Canada Food System Situation Update · {b.id}</div>
      <h1>Week of {longDate(b.week_start)} to {longDate(b.week_end)}</h1>
      <p className="small muted">Prepared {dateTime(b.prepared_at)} from data release {b.release_id}.</p>
      <div className="notice">{b.status}</div>
      <h2>National overview</h2>
      <ul>{b.overview.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
      <h2>What changed this week</h2>
      {b.changed.length ? b.changed.map((c: any) => (
        <div key={c.theme}><h3>{c.theme}: {c.count}</h3><ul>{c.items.map((i: any) => <li key={i.id}><a href={i.url}>{i.title}</a> <span className="muted small">({longDate(i.date)})</span></li>)}</ul></div>
      )) : <p>No new official notices were recorded for this week.</p>}
      <h2>Conditions</h2>
      <p className="small muted">Each line carries its own data period. A brief's date does not stand in for monthly or weekly data dates.</p>
      <ul>{b.conditions.map((c: any) => <li key={c.id}><b>{c.title}.</b> {c.text} <span className="small muted">Data: {c.period}.</span></li>)}</ul>
      <h2>Global developments with a Canadian supplier link</h2>
      {b.global.length ? <ul>{b.global.map((g: any, i: number) => <li key={i}><Evidence cls="supplier_link" /> <a href={g.url}>{g.title}</a>: {g.text}</li>)}</ul> : <p>None this week.</p>}
      <h2>Evidence gaps</h2>
      {b.gaps.length ? <ul>{b.gaps.map((g: string) => <li key={g}>{g}</li>)}</ul> : <p>All sources refreshed normally.</p>}
      <h2>Questions worth asking</h2>
      <ul>{b.questions.map((q: string) => <li key={q}>{q}</li>)}</ul>
      <h2>Related stress test</h2>
      <p><a href={href(`/lab/${b.stress_test.id}`)}>{b.stress_test.title}</a>, chosen because {b.stress_test.reason}. Illustrative model; not a forecast.</p>
      <h2>Sources</h2>
      <ul className="small">{b.sources.map((s: any) => <li key={s.id}><a href={s.url}>{s.provider}, {s.dataset}</a> (data to {longDate(s.observation_end)})</li>)}</ul>
    </article>
  );
}
