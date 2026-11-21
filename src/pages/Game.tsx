// The rail-closure decision game from the Canada Food System Stress Test.
// Model (gSim, costs, debrief) is the migrated legacy code; only the screens are new.
import { useState } from "react";
import { Evidence } from "../components/Badges";
import LineChart, { Legend } from "../components/LineChart";
import { href } from "../lib/router";
import { GPLANS0, GPATHS, GWORST, GCOMP, GNONE, GCAT, GCOST_SRC, gOpts5, gSim, gDebrief, gMetrics, gPlanName, fmtCM } from "../legacy/core.js";

const STEPS = ["Briefing", "Day 0: your plan", "Day 5: update", "Day 35: outcome"];
const CAT_COL: Record<string, string> = { resp: "var(--act)", delay: "var(--ready)", tail: "var(--watch)", refused: "var(--off)", feed: "var(--alert)" };

function CostBars({ rows }: { rows: [string, any][] }) {
  const max = Math.max(...rows.map(([, m]) => m.c.total), 1);
  return (
    <div>
      {rows.map(([lab, m]) => (
        <div key={lab} style={{ margin: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".9rem" }}><b>{lab}</b><span>{fmtCM(m.c.total)}</span></div>
          <div style={{ display: "flex", height: 18, gap: 2 }} role="img" aria-label={`${lab}: total ${fmtCM(m.c.total)}; ${GCAT.map(([k, n]: string[]) => n.toLowerCase() + " " + fmtCM(m.c[k])).join(", ")}`}>
            {GCAT.map(([k, n]: string[]) => m.c[k] > 0.05 ? <i key={k} title={`${n}: ${fmtCM(m.c[k])}`} style={{ width: `${(100 * m.c[k]) / max}%`, background: CAT_COL[k], borderRadius: 3 }} /> : null)}
          </div>
        </div>
      ))}
      <Legend items={GCAT.map(([k, n]: string[]) => ({ label: n, color: CAT_COL[k], box: true }))} />
    </div>
  );
}

export default function Game() {
  const [step, setStep] = useState(0);
  const [p0, setP0] = useState("");
  const [p5, setP5] = useState("");
  const plan = { p0, p5: p5 || "keep" };
  const stepper = <ol className="chips" aria-label="Progress" style={{ listStyle: "none", padding: 0 }}>{STEPS.map((s, i) => <li key={s} className="chip" aria-current={i === step ? "step" : undefined} style={i === step ? { background: "var(--accent)", color: "var(--bg)" } : i < step ? { opacity: 0.7 } : {}}>{i + 1}. {s}</li>)}</ol>;
  return (
    <>
      <p className="small"><a href={href("/lab")}>← Stress Test Lab</a></p>
      <div className="eyebrow">Decision game · about three minutes</div>
      <h1>A Prairie grain rail line may close in 72 hours</h1>
      {stepper}
      {step === 0 && (
        <section className="panel">
          <p style={{ fontSize: "1.1rem" }}>Day 0. An operator warns that the main rail line from the Prairies to the Port of Vancouver may close in 72 hours. It is October, peak export season.</p>
          <div className="grid3">
            <div><h3>Your role</h3><p>You advise a joint coordination table of governments, railways, shippers and grain companies. You recommend a plan; the members decide whether to approve it.</p></div>
            <div><h3>Your objective</h3><p>Keep the total cost as low as possible: what the response spends plus losses from late exports, farm deliveries turned away and feed and food shortfalls (15 kt a day of priority demand).</p></div>
            <div><h3>What is uncertain</h3><p>Whether the closure happens, how long it lasts, and how much trucking operators can confirm.</p></div>
          </div>
          <p className="small"><Evidence cls="scenario_output" /> Volumes (kt = thousand tonnes), lead times, capacities and costs (Canadian dollars) are assumptions chosen to show the mechanism; cost rates are anchored to published figures listed at the end. <Evidence cls="observation" /> About 94% of Canada's grain exports move by rail.</p>
          <button className="btn" onClick={() => setStep(1)}>Choose a plan</button>
        </section>
      )}
      {step === 1 && (
        <section className="panel">
          <h2>What would you commit today?</h2>
          <fieldset style={{ border: 0, padding: 0 }}><legend className="sr">Day 0 plan</legend>
            {Object.entries(GPLANS0).map(([k, o]: [string, any]) => {
              const lo = gSim({ p0: k, p5: "keep" }, "resolved").c.resp, hi = gSim({ p0: k, p5: "keep" }, GWORST).c.resp;
              return (
                <label key={k} className="card" style={{ cursor: "pointer", boxShadow: p0 === k ? "0 0 0 2px var(--act)" : undefined }}>
                  <input type="radio" name="p0" value={k} checked={p0 === k} onChange={() => setP0(k)} /> <b>{o.name}</b>
                  <ul className="small" style={{ margin: "6px 0" }}>{o.facts.map((f: string) => <li key={f}>{f}</li>)}</ul>
                  <p className="small">{lo === hi ? `Costs ${fmtCM(lo)}` : `Costs ${fmtCM(lo)} if talks succeed; up to ${fmtCM(hi)} if the closure runs past Day 35`}</p>
                  <p className="small"><span style={{ color: "var(--good)" }}>+ {o.up}</span><br /><span style={{ color: "var(--alert)" }}>− {o.risk}</span></p>
                </label>);
            })}
          </fieldset>
          <button className="btn ghost" onClick={() => setStep(0)}>Back</button> <button className="btn" disabled={!p0} onClick={() => setStep(2)}>Commit and advance to Day 5</button>
        </section>
      )}
      {step === 2 && (() => {
        const sim5 = gSim({ p0, p5: "keep" }, "long");
        return (
          <section className="panel">
            <h2>Day 5 update</h2>
            <div className="tiles">
              <div className="tile act"><span className="l">Spent so far</span><span className="n">{fmtCM(sim5.cumResp[5])}</span></div>
              <div className="tile none"><span className="l">Losses so far</span><span className="n">{fmtCM(sim5.cumLoss[5])}</span></div>
              <div className="tile"><span className="l">Storage room left</span><span className="n">{Math.round(sim5.head[5])} kt</span></div>
              <div className="tile react"><span className="l">Rail closure</span><span className="n">Day 3</span><span className="s">began as warned</span></div>
            </div>
            <div className="grid2">
              <div><h3>What has happened</h3><ul>{sim5.ev.filter(([d]: [number]) => d <= 5).map(([d, t]: [number, string], i: number) => <li key={i}><b>Day {d}</b> {t}</li>)}</ul></div>
              <div><h3>New information</h3><p>{GPATHS.long.info}</p></div>
            </div>
            <h3>Your Day 5 decision</h3>
            {gOpts5(p0, "long").map((o: any) => (
              <label key={o.id} className="card" style={{ cursor: "pointer", boxShadow: p5 === o.id ? "0 0 0 2px var(--act)" : undefined }}>
                <input type="radio" name="p5" checked={p5 === o.id} onChange={() => setP5(o.id)} /> <b>{o.name}</b> <span className="small muted">· {o.cost}</span>
                <p className="small">{o.desc}</p>
              </label>))}
            <button className="btn ghost" onClick={() => setStep(1)}>Back</button> <button className="btn" disabled={!p5} onClick={() => setStep(3)}>See Day 35</button>
          </section>
        );
      })()}
      {step === 3 && (() => {
        const D = gDebrief(plan);
        const xs = Array.from({ length: D.L.stock.length }, (_, i) => i);
        return (
          <>
            <section className="panel">
              <div className="eyebrow">Your plan: {gPlanName(plan)}</div>
              <h2>{D.verdict}</h2>
              {D.out.map((t: string, i: number) => <p key={i} dangerouslySetInnerHTML={{ __html: t }} />)}
            </section>
            <div className="grid2">
              <section className="panel">
                <h3>Where the money went (long closure)</h3>
                <CostBars rows={[["Your plan", D.L], ["Wait and react", D.C], ["Do nothing", D.N]]} />
              </section>
              <section className="panel">
                <h3>Freight dispatched each day</h3>
                <Legend items={[{ label: "Your plan", color: "var(--act)" }, { label: "Wait and react", color: "var(--late)", dash: true }]} />
                <LineChart aria="Freight dispatched per day, your plan compared with waiting to react" xDomain={[0, xs.length - 1]}
                  xTicks={[0, 5, 10, 15, 20, 25, 30, 35].map((v) => ({ v, label: "Day " + v }))} xFmt={(d) => "Day " + d} yFmt={(v) => Math.round(v) + " kt"}
                  series={[{ id: "c", label: "Wait and react", color: "var(--late)", dash: "6 4", data: xs.map((x) => ({ x, y: D.C.disp[x] })) },
                    { id: "l", label: "Your plan", color: "var(--act)", width: 2.5, data: xs.map((x) => ({ x, y: D.L.disp[x] })) }]} />
              </section>
            </div>
            <section className="panel">
              <h3>Your plan in numbers</h3>
              <div className="tablewrap"><table className="data"><tbody>{gMetrics(D.L).map(([a, b, c]: string[]) => <tr key={a}><th>{a}</th><td className="num">{b}</td><td className="small muted">{c}</td></tr>)}</tbody></table></div>
              <h3 style={{ marginTop: 16 }}>The same plan if events had gone differently</h3>
              <div className="tablewrap"><table className="data"><thead><tr><th>Path</th><th className="num">Your plan</th><th className="num">Wait and react</th></tr></thead>
                <tbody>{Object.entries(GPATHS).map(([k, P]: [string, any]) => <tr key={k}><td>{P.name}</td><td className="num">{fmtCM(gSim(plan, k).c.total)}</td><td className="num">{fmtCM(gSim(GCOMP, k).c.total)}</td></tr>)}
                  <tr><td>Do nothing at all (long closure)</td><td className="num" colSpan={2}>{fmtCM(gSim(GNONE, "long").c.total)}</td></tr></tbody></table></div>
              <p><button className="btn" onClick={() => { setStep(1); setP0(""); setP5(""); }}>Play again</button> <a className="btn ghost" href={href("/lab/rail")}>Open the rail stress test</a></p>
            </section>
            <section className="panel">
              <h3>Cost assumptions and sources</h3>
              <div className="tablewrap"><table className="data"><thead><tr><th>Item</th><th>Rate</th><th>Basis</th></tr></thead>
                <tbody>{GCOST_SRC.map(([a, b, c]: string[]) => <tr key={a}><td>{a}</td><td>{b}</td><td className="small" dangerouslySetInnerHTML={{ __html: c }} /></tr>)}</tbody></table></div>
            </section>
          </>
        );
      })()}
    </>
  );
}
