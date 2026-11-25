// Step 4: possible timelines. Month-by-month stories of threats arriving together,
// the moments when acting still helps, and what a bad year could cost.
import { useMemo, useState } from "react";
import { Evidence } from "../components/Badges";
import { StepFoot, StepHead } from "../components/Steps";
import { TEST_TITLE } from "../content/plain";
import { SCEN, MODELLED, STORIES, TIMELINES, KIND, fmtM } from "../legacy/core.js";
import { integrated, defaultState } from "../legacy/integrated.js";
import { href } from "../lib/router";

const S: any = SCEN;

export function TimelinesPage() {
  return (
    <>
      <StepHead n={4} />
      <p style={{ maxWidth: "75ch" }}>Real crises rarely come one at a time. A drought can be followed by a rail strike; a war abroad can raise fertilizer prices while a trade dispute closes a market. Below are four possible timelines. They are not predictions. Each one shows, month by month, when there is still time to act and when it becomes too late to do more than limit the damage.</p>
      <div className="notice model"><Evidence cls="scenario_output" /> These timelines were written by the research team from past events and the what-if tests in step 3. The months and events are illustrations.</div>
      <p className="small">How to read them: <span className="kind" style={{ border: "1px solid var(--line)", padding: "0 6px", borderRadius: 4 }}>What happens</span> an event · <span style={{ background: "var(--good)", color: "var(--on-fill)", padding: "0 6px", borderRadius: 4, fontWeight: 700 }}>Window to act</span> a moment when acting still changes the outcome · <span style={{ color: "var(--alert)", border: "1px solid var(--alert)", padding: "0 6px", borderRadius: 4 }}>Too late</span> only damage control is left.</p>
      {(TIMELINES as any[]).map((t) => {
        const story = (STORIES as any[]).find((s) => s.id === t.id);
        return (
          <section key={t.id} className="panel" id={`tl-${t.id}`}>
            <h2>{t.title}</h2>
            <p className="lede" style={{ fontSize: "1.02rem" }}>{t.lead}</p>
            <ol className="tl">
              {t.steps.map(([when, kind, text]: string[], i: number) => (
                <li key={i} className={kind}><span className="when">{when}</span><span className="kind">{KIND[kind]}</span>{kind === "window" ? text.replace(/^./, (c: string) => c.toUpperCase()) : text}</li>
              ))}
            </ol>
            <p><b>What makes the difference:</b> {t.change}</p>
            {/* Adjacent links separated only by whitespace run together when read aloud,
                so put a visible separator between them. */}
            {story && <p className="small">Threats involved: {story.on.map((k: string, i: number) => (
              <span key={k}>{i > 0 && <span aria-hidden="true"> · </span>}
                <a href={href(`/threats/${k}`)}>{TEST_TITLE[k]}</a></span>
            ))}<br />
              <a className="btn ghost" style={{ marginTop: 8 }} href={href(`/timelines/bad-year?story=${t.id}`)}>What could this year cost?</a></p>}
          </section>
        );
      })}
      <div className="grid2">
        <a className="card" href={href("/timelines/bad-year")} style={{ borderColor: "var(--accent)" }}>
          <h4>Build your own bad year</h4>
          <p>Choose which threats arrive in the same year and see how the total cost changes when responses start early, late, or not at all.</p>
        </a>
        <a className="card" href={href("/timelines/game")} style={{ borderColor: "var(--act)" }}>
          <h4>Make the calls yourself (about three minutes)</h4>
          <p>A Prairie rail line may close in 72 hours. You decide what to commit on day 0 and day 5, then see what your choices cost by day 35.</p>
        </a>
      </div>
      <StepFoot n={4} />
    </>
  );
}

export function BadYear({ story }: { story?: string }) {
  const preset = (STORIES as any[]).find((s) => s.id === story);
  const [cfg, setCfg] = useState({ set: preset ? [...preset.on] : [...MODELLED] as string[], kappa: 8, penalty: 5 });
  const [agreedPlan, setAgreedPlan] = useState(false);
  const state = useMemo(() => defaultState(), []);
  const none = integrated(cfg, null, false, state), react = integrated(cfg, "react", agreedPlan, state), early = integrated(cfg, 0, agreedPlan, state);
  const max = Math.max(none.combined, react.combined, early.combined, 1);
  const toggle = (k: string) => setCfg({ ...cfg, set: cfg.set.includes(k) ? cfg.set.filter((x) => x !== k) : [...cfg.set, k] });
  const match = (STORIES as any[]).find((st) => JSON.stringify([...st.on].sort()) === JSON.stringify([...cfg.set].sort()));
  return (
    <>
      <p className="small"><a href={href("/timelines")}>← Step 4: Possible timelines</a></p>
      <div className="eyebrow">Step 4 · Possible timelines</div>
      <h1>What could a bad year cost?</h1>
      <p className="lede">When several threats arrive in the same year, they compete for the same people, money and storage. Responses slow down and losses grow. Choose the threats, then compare doing nothing, waiting until damage is visible, and acting at the first warning signs.</p>
      <div className="notice model"><Evidence cls="scenario_output" /> A simple illustration. The extra damage and extra delay when threats overlap are assumptions you set below, not estimates.</div>
      <div className="labgrid">
        <aside className="panel">
          <h3>Threats arriving this year</h3>
          <div className="chips">{MODELLED.map((k: string) => <button key={k} className="chip" aria-pressed={cfg.set.includes(k)} onClick={() => toggle(k)}>{S[k].tab}</button>)}</div>
          <p className="small"><b>Or start from a timeline in step 4</b></p>
          <div className="chips">{(STORIES as any[]).map((st) => <button key={st.id} className="chip" onClick={() => setCfg({ ...cfg, set: [...st.on] })}>{st.title}</button>)}</div>
          <div className="ctrl"><label htmlFor="kap">Extra damage when threats overlap<output>{cfg.kappa}%</output></label><input id="kap" type="range" min={0} max={40} value={cfg.kappa} onChange={(e) => setCfg({ ...cfg, kappa: +e.target.value })} /><div className="hint">Added to losses for each extra threat in the same year.</div></div>
          <div className="ctrl"><label htmlFor="pen">Extra delay when agencies are stretched<output>{cfg.penalty} days</output></label><input id="pen" type="range" min={0} max={21} value={cfg.penalty} onChange={(e) => setCfg({ ...cfg, penalty: +e.target.value })} /><div className="hint">Added to every response for each extra threat, unless a joint plan was agreed in advance.</div></div>
          <label><input type="checkbox" checked={agreedPlan} onChange={(e) => setAgreedPlan(e.target.checked)} /> Governments and industry agreed a joint plan in advance</label>
        </aside>
        <div className="panel">
          <h3>Total cost of the year with {cfg.set.length} threat{cfg.set.length === 1 ? "" : "s"}</h3>
          <div className="bars">
            {[["If nothing is done", none.combined, "var(--base)"], ["If we wait until damage is visible", react.combined, "var(--late)"], ["If we act at the first warning signs", early.combined, "var(--act)"]].map(([l, v, c]: any) => (
              <div className="row" key={l}><span>{l}</span><span><span className="bar" style={{ display: "block", width: `${(100 * v) / max}%`, background: c }} /></span><span className="v">{fmtM(v)}</span></div>))}
          </div>
          <p style={{ marginTop: 14 }}>Acting at the first warning signs costs <b>{fmtM(react.combined - early.combined)}</b> less than waiting. Because the threats overlap, waiting costs <b>{fmtM(Math.max(0, react.overlap))}</b> more than it would if the same threats came in separate years{agreedPlan ? "; the joint plan removes the extra delay" : ""}.</p>
          {match && <div className="notice info"><b>{match.title}.</b> {match.path}<br /><span className="small">What could change the outcome: {match.change.join("; ")}.</span></div>}
          <h3 style={{ marginTop: 16 }}>Each threat on its own</h3>
          <div className="tablewrap"><table className="data">
            <thead><tr><th>Threat</th><th className="num">If we wait</th><th className="num">If we act early</th><th className="num">Difference</th></tr></thead>
            <tbody>{react.per.map((p: any, i: number) => (
              <tr key={p.k}><td><a href={href(`/threats/${p.k}`)}>{S[p.k].tab}</a></td><td className="num">{fmtM(p.solo)}</td><td className="num">{fmtM(early.per[i].solo)}</td><td className="num">{fmtM(p.solo - early.per[i].solo)}</td></tr>))}</tbody>
          </table></div>
          <p className="small muted">Costs for each threat in a year with no other threats, before the overlap effects are added.</p>
        </div>
      </div>
    </>
  );
}
