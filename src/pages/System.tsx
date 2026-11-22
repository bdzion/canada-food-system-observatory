// Step 1: a simple map of Canada's food system. Each link shows its weak points,
// the threats that hit it, and the live data we follow there.
import { useState } from "react";
import { Evidence, StateChip } from "../components/Badges";
import { StepFoot, StepHead } from "../components/Steps";
import { LIVE_NODE, PATH_TO_NODE, TEST_TITLE } from "../content/plain";
import { INDIC, NODES, REG } from "../legacy/core.js";
import { useData } from "../lib/data";
import { href } from "../lib/router";
import type { Indicator } from "../lib/types";

const MAIN = ["inputs", "farms", "transport", "processing", "stores"];
const RANK: Record<string, number> = { High: 3, Raised: 2, Watch: 1 };

export default function System() {
  const { data } = useData<{ indicators: Indicator[] }>("indicators.json");
  const [sel, setSel] = useState("transport");
  const nodes = NODES as any[];
  const byNode = (id: string) => ({
    weak: (INDIC as any[]).filter((i) => i.node === id),
    threats: (REG as any[]).filter((r) => PATH_TO_NODE[r.path] === id),
    live: (data?.indicators || []).filter((i) => LIVE_NODE[i.id] === id),
  });
  const worst = (id: string) => byNode(id).weak.reduce((m: string, i: any) => (RANK[i.level] > (RANK[m] || 0) ? i.level : m), "");
  const Node = ({ id, main }: { id: string; main?: boolean }) => {
    const n = nodes.find((x) => x.id === id);
    const b = byNode(id);
    const w = worst(id);
    return (
      <button className={`sysnode${main && id !== "stores" ? " main" : ""}`} aria-pressed={sel === id} onClick={() => setSel(id)}>
        <b>{n.name}{w && <span className={`lvl ${w}`}>{w === "High" ? "high exposure" : "raised"}</span>}</b>
        <span className="what">{n.what}</span>
        <span className="counts">{b.weak.length} weak point{b.weak.length === 1 ? "" : "s"} · {b.threats.length} threat{b.threats.length === 1 ? "" : "s"} · {b.live.length} live figure{b.live.length === 1 ? "" : "s"}</span>
      </button>
    );
  };
  const cur = nodes.find((x) => x.id === sel);
  const d = byNode(sel);
  return (
    <>
      <StepHead n={1} />
      <p style={{ maxWidth: "75ch" }}>Food reaches Canadians through a chain. Farms need fertilizer, fuel, seed and workers. Grain and livestock move by truck and rail to processors, ports and stores. Much of what we grow is sold abroad, and much of our fresh fruit and vegetables is bought abroad. A problem at any link can travel along the chain.</p>
      <p style={{ maxWidth: "75ch" }}>Choose a link in the map to see its weak points, the threats that could hit it, and the figures we follow there.</p>
      <section className="panel" aria-label="Map of Canada's food system">
        <div className="sysmap">
          {MAIN.map((id) => <Node key={id} id={id} main />)}
          <div className="sysbranch" style={{ gridColumn: "3" }}><span className="arrow">↓ much of the grain, oilseeds and meat is sold abroad</span><Node id="exports" /></div>
          <div className="sysbranch" style={{ gridColumn: "5" }}><span className="arrow">↑ most fresh fruit, many vegetables</span><Node id="imports" /></div>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>A simplified picture of how food moves, not a model of actual quantities. Exposure ratings (“high”, “raised”) are the research team's judgement, based on the published facts in step 2.</p>
      </section>

      <section className="panel" aria-live="polite">
        <div className="eyebrow">Selected link</div>
        <h2>{cur.name}</h2>
        <p>{cur.what}</p>
        <div className="grid3">
          <div>
            <h3>Weak points</h3>
            {d.weak.length ? d.weak.map((i: any) => (
              <div key={i.id} className="card"><div className="meta"><Evidence cls="source_fact" /><span>Our rating: {i.level.toLowerCase()}</span></div>
                <h4>{i.num} · {i.title}</h4><p>{i.text}</p><div className="period">Source: <a href={i.url}>{i.src}</a></div></div>
            )) : <p className="empty">No weak point recorded for this link yet.</p>}
          </div>
          <div>
            <h3>Threats that could hit here</h3>
            {d.threats.length ? <ul className="changes">{d.threats.map((r: any) => <li key={r.name}>{r.name}{r.model && <> · <a href={href(`/threats/${r.model}`)}>what-if test</a></>}</li>)}</ul> : <p className="empty">None recorded.</p>}
            <p className="small"><a href={href("/threats")}>All 18 threats →</a></p>
          </div>
          <div>
            <h3>Figures we follow here</h3>
            {d.live.length ? d.live.map((i) => (
              <a key={i.id} className="card" href={href(`/indicators/${i.id}`)}><div className="meta"><Evidence cls={i.id === "weather_alerts" ? "official_alert" : i.id === "food_recalls" ? "official_notice" : "observation"} /><StateChip state={i.headline.state} direction={i.headline.direction} /></div>
                <h4>{i.title}</h4><p>{i.headline.text}</p></a>
            )) : <p className="empty">We do not yet follow a live figure for this link.</p>}
          </div>
        </div>
        {d.threats.some((r: any) => r.model) && <p className="small muted">What-if tests for this link: {[...new Set(d.threats.filter((r: any) => r.model).map((r: any) => r.model))].map((m: any) => <a key={m} href={href(`/threats/${m}`)} style={{ marginRight: 10 }}>{TEST_TITLE[m]}</a>)}</p>}
      </section>
      <StepFoot n={1} />
    </>
  );
}
