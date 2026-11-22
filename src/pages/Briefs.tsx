import { Evidence } from "../components/Badges";
import { DATA, useData } from "../lib/data";
import { longDate, dateTime } from "../lib/format";
import { href } from "../lib/router";
import { TEST_TITLE } from "../content/plain";

export function BriefList() {
  const { data, error } = useData<{ briefs: any[] }>("briefs/index.json");
  return (
    <>
      <div className="eyebrow">Weekly brief</div>
      <h1>The week in one page</h1>
      <p className="lede">Every Monday the site writes a short summary of the week just ended: the latest figures, new warnings and notices, disasters abroad that touch Canada's suppliers, and gaps in the data. A brief is never changed after it is published, so you can see what was known at the time.</p>
      <p className="small muted">Briefs are written automatically from official data and are not reviewed by an analyst. Earlier briefs keep their original wording.</p>
      <p><a className="btn ghost" href={`${DATA}feed.xml`}>Get new briefs by RSS (a news-reader feed)</a></p>
      {error && <p className="empty">No briefs yet. The first appears on the Monday after the site starts.</p>}
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
      <p className="small noprint"><a href={href("/briefs")}>← All briefs</a> · <a href={`${DATA}briefs/${id}.md`}>Plain-text version</a> · <button className="chip" onClick={() => window.print()}>Print or save as PDF</button></p>
      <div className="eyebrow">Weekly brief · {b.id}</div>
      <h1>Week of {longDate(b.week_start)} to {longDate(b.week_end)}</h1>
      <p className="small muted">Prepared {dateTime(b.prepared_at)} (data update {b.release_id}).</p>
      <div className="notice">{b.status}</div>
      <h2>Summary</h2>
      <ul>{b.overview.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
      <h2>New this week</h2>
      {b.changed.length ? b.changed.map((c: any) => (
        <div key={c.theme}><h3>{c.theme}: {c.count}</h3><ul>{c.items.map((i: any) => <li key={i.id}><a href={i.url}>{i.title}</a> <span className="muted small">({longDate(i.date)})</span></li>)}</ul></div>
      )) : <p>No new government notices were recorded this week.</p>}
      <h2>Latest readings</h2>
      <p className="small muted">Each line gives the period its data cover, which can be earlier than the week of the brief.</p>
      <ul>{b.conditions.map((c: any) => <li key={c.id}><b>{c.title}.</b> {c.text} <span className="small muted">Period: {c.period}.</span></li>)}</ul>
      <h2>Disasters abroad in countries that supply Canada</h2>
      {b.global.length ? <ul>{b.global.map((g: any, i: number) => <li key={i}><Evidence cls="supplier_link" /> <a href={g.url}>{g.title}</a>: {g.text.replace("Specific impact unknown.", "We do not yet know whether this disaster affects that supply.")}</li>)}</ul> : <p>None this week.</p>}
      <h2>Gaps in the data</h2>
      {b.gaps.length ? <ul>{b.gaps.map((g: string) => <li key={g}>{g}</li>)}</ul> : <p>All sources updated normally.</p>}
      <h2>Questions to ask</h2>
      <ul>{b.questions.map((q: string) => <li key={q}>{q}</li>)}</ul>
      <h2>A what-if to try</h2>
      <p><a href={href(`/threats/${b.stress_test.id}`)}>{TEST_TITLE[b.stress_test.id] || b.stress_test.title}</a>. We chose it because {b.stress_test.reason}. It is a simple illustration, not a forecast.</p>
      <h2>Sources</h2>
      <ul className="small">{b.sources.map((s: any) => <li key={s.id}><a href={s.url}>{s.provider}, {s.dataset}</a> (data to {longDate(s.observation_end)})</li>)}</ul>
    </article>
  );
}
