// Step 3 (ongoing): long-running disruptions that the automatic feeds cannot name,
// written up by the team from published sources and tied to live data.
import { Evidence } from "../components/Badges";
import IndicatorCard from "../components/IndicatorCard";
import IndicatorChart from "../components/IndicatorChart";
import { TEST_TITLE } from "../content/plain";
import { useData } from "../lib/data";
import { longDate } from "../lib/format";
import { href } from "../lib/router";
import type { Indicator } from "../lib/types";

const KIND: Record<string, string> = { reported: "Reported", our_reading: "Our reading" };

export default function Ongoing() {
  const { data } = useData<{ items: any[] }>("ongoing.json");
  const { data: ind } = useData<{ indicators: Indicator[] }>("indicators.json");
  if (!data) return <p className="muted">Loading…</p>;
  return (
    <>
      <p className="small"><a href={href("/threats")}>← Step 3: The threats</a></p>
      <div className="eyebrow">Step 3 · The threats</div>
      <h1>Ongoing disruptions</h1>
      <p className="lede">Some shocks last for months. Our automatic feeds cannot always name them: the disaster feed covers natural hazards, not wars or blockades, and our supplier check covers only what Canada imports directly.</p>
      <p style={{ maxWidth: "75ch" }}>So we describe them here ourselves, from the published sources listed, and tie each one to live figures that show whether it is still showing up in the data. The written part is our summary and carries the date we last reviewed it. The figures update automatically.</p>
      {!data.items.length && <p className="empty">No ongoing disruption is recorded at present.</p>}
      {data.items.map((o) => (
        <article key={o.id}>
          <section className="ongoing">
            <span className="tag">Ongoing · since {longDate(o.since)} · day {o.days}</span> <Evidence cls="author_judgement" />
            <h2>{o.title}</h2>
            {o.summary.map((p: string, i: number) => <p key={i}>{p}</p>)}
            <p className="small muted">{o.note}</p>
            {o.review_overdue && <div className="notice warn">This summary is due for review. Check the sources below for newer information.</div>}
          </section>

          <section className="panel">
            <h2>Is it still showing up in the data?</h2>
            <div className="live" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Evidence cls="observation" /><span className={`dot ${o.live.state === "still_showing" ? "stale" : "ok"}`} /><b>{o.live.text}</b>
            </div>
            <p className="small muted">Estimated from ships' tracking signals by the International Monetary Fund's PortWatch. The shaded band is the range for the same weeks in the past five years.</p>
            {o.live.indicator && <IndicatorChart id={o.live.indicator} kind="lines" initial="chokepoint6" />}
          </section>

          <section className="panel">
            <h2>How it could reach Canada</h2>
            <p className="small muted">Each point is labelled: <span className="kindtag reported">Reported</span> means a source below reports it; <span className="kindtag our_reading">Our reading</span> is the team's own reasoning, not a finding.</p>
            <div className="grid2">
              {o.reach.map((r: any) => (
                <div key={r.title} className="card"><div className="meta"><span className={`kindtag ${r.kind}`}>{KIND[r.kind] || r.kind}</span></div><h4>{r.title}</h4><p>{r.text}</p></div>
              ))}
            </div>
            {o.scenario && <p style={{ marginTop: 10 }}><a className="btn ghost" href={href(`/threats/${o.scenario}`)}>Try the what-if: {TEST_TITLE[o.scenario]?.toLowerCase()}</a></p>}
          </section>

          <section className="panel">
            <h2>What to watch</h2>
            <p className="small muted">The live figures that would show the disruption reaching Canada, or easing.</p>
            <div className="grid3">
              {(ind?.indicators || []).filter((i) => o.watch.some((w: any) => w.id === i.id)).map((i) => <IndicatorCard key={i.id} i={i} compact />)}
            </div>
          </section>

          <section className="panel">
            <h2>Sources for the summary</h2>
            <ul>{o.sources.map((s: any) => <li key={s.url}>{s.publisher} ({s.date}). <a href={s.url}>{s.title}</a>.</li>)}</ul>
            <p className="small muted">Last reviewed {longDate(o.last_reviewed)}. Figures quoted from these sources are as they reported them; we have not checked them against the underlying data.</p>
          </section>
        </article>
      ))}
    </>
  );
}
