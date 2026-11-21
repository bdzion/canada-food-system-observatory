// Stress Test Lab: the seven illustrative models from the Canada Food System Stress Test,
// migrated unchanged (see tests/legacy-regression.test.ts), with new navigation from live evidence.
import { useMemo, useState } from "react";
import { Evidence, StateChip } from "../components/Badges";
import LineChart, { Legend } from "../components/LineChart";
import { useData } from "../lib/data";
import { href } from "../lib/router";
import type { Indicator } from "../lib/types";
import { getGuess, saveGuess } from "../lib/visit";
import { SCEN, MODELLED, MODEL_CARDS, MODEL_CAT, CATS, REG, STORIES, SIG, fmtM, fmtDay, VERSION, CHECKED } from "../legacy/core.js";
import { integrated, defaultState } from "../legacy/integrated.js";

const S: any = SCEN;
const LIVE: Record<string, { ind?: string[]; text: string; link?: string }> = {
  rail: { ind: ["grain_exports", "grain_stocks"], text: "Grain moving through ports and grain held in commercial storage." },
  drought: { ind: ["weather_alerts"], text: "Official weather alerts. Drought itself is assessed monthly by AAFC's Canadian Drought Monitor (not yet connected)." },
  phosphate: { text: "Where Canada's fertilizer imports come from, and whether a current hazard alert touches a supplier.", link: "/exposure" },
  "avian-flu": { text: "CFIA announcements appear in the event list. CFIA's outbreak counts are not yet connected as a data feed.", link: "/events?kind=gov_notice" },
  export: { text: "Government trade announcements appear in the event list.", link: "/events?kind=gov_notice" },
  cyber: { text: "No live feed yet. Cyber advisories rarely confirm an outage at a food business.", link: "" },
  workforce: { text: "No live feed yet.", link: "" },
};
const GUESSES: [string, number, number][] = [["Less than 10%", 0, 10], ["10 to 30%", 10, 30], ["30 to 60%", 30, 60], ["More than 60%", 60, 1000]];

export function LabHome() {
  return (
    <>
      <div className="eyebrow">Stress Test Lab</div>
      <h1>What if we acted earlier?</h1>
      <p className="lede">Seven "what if" tests of single threats, a compound bad year, and a three-minute decision game. They compare acting early, waiting to react and doing nothing, using simple models with every assumption listed.</p>
      <div className="notice model"><Evidence cls="scenario_output" /> These are examples built to show how a stress test works. The settings are assumptions, not readings from the live data, and no test has yet been checked against real events. Model version {VERSION}, sources checked {CHECKED}.</div>
      <div className="grid3" style={{ marginTop: 16 }}>
        {MODELLED.map((k: string) => (
          <a key={k} className="card" href={href(`/lab/${k}`)}>
            <div className="meta"><span className="pill">{(CATS as any[]).find((c) => c.id === MODEL_CAT[k])?.name}</span></div>
            <h4>{S[k].tab}</h4>
            <p>{MODEL_CARDS[k].q}</p>
            <div className="period">What if {S[k].ask}</div>
          </a>
        ))}
        <a className="card" href={href("/lab/year")} style={{ borderColor: "var(--accent)" }}>
          <div className="meta"><span className="pill">All seven</span></div>
          <h4>A bad year: several threats at once</h4>
          <p>Overlapping shocks compete for the same people and money. See what a shared plan, agreed in advance, is worth.</p>
        </a>
        <a className="card" href={href("/lab/game")} style={{ borderColor: "var(--act)" }}>
          <div className="meta"><span className="pill">3 minutes</span></div>
          <h4>The decision game</h4>
          <p>A Prairie grain rail line may close in 72 hours. You make the calls; see what they cost by Day 35.</p>
        </a>
        <a className="card" href={href("/lab/register")} style={{ borderColor: "var(--judge)" }}>
          <div className="meta"><Evidence cls="author_judgement" /></div>
          <h4>The threat register</h4>
          <p>Eighteen threats in six groups, with the authors' preliminary ratings and example warning levels.</p>
        </a>
      </div>
    </>
  );
}

function LiveContext({ k }: { k: string }) {
  const { data } = useData<{ indicators: Indicator[] }>("indicators.json");
  const L = LIVE[k];
  const inds = (data?.indicators || []).filter((i) => L?.ind?.includes(i.id));
  return (
    <section className="panel">
      <h3>What the live data show now</h3>
      <p className="small muted">{L?.text}</p>
      {inds.map((i) => <a key={i.id} className="card" href={href(`/indicators/${i.id}`)}><div className="meta"><Evidence cls={i.id === "weather_alerts" ? "official_alert" : "observation"} /><StateChip state={i.headline.state} direction={i.headline.direction} /></div><h4>{i.title}</h4><p>{i.headline.text}</p></a>)}
      {L?.link ? <p><a href={href(L.link)}>Go to the evidence →</a></p> : null}
      <p className="small"><b>Observed and assumed stay apart.</b> Nothing on this page sets the model's inputs from the data. You choose the settings; the live evidence is here for context.</p>
    </section>
  );
}

export function Scenario({ k }: { k: string }) {
  const s = S[k];
  const init = () => Object.fromEntries(s.params.map((p: any) => [p.id, p.value]));
  const [st, setSt] = useState<Record<string, number>>(init);
  const [guess, setGuess] = useState<string | null>(() => getGuess(k));
  const r = useMemo(() => {
    const base = s.run(st, Infinity), act = s.run(st, st.a);
    const sig = s.signals(base);
    const actDay = Math.max(0, sig[2][1]), readyDay = Math.max(0, sig[1][1]);
    const react = s.run(st, actDay), early = s.run(st, readyDay);
    const curve: number[] = [];
    for (let d = 0; d <= s.aMax; d++) curve.push(s.run(st, d).total);
    const best = Math.min(...curve);
    return { base, act, sig, actDay, readyDay, react, early, curve, best, bestDay: curve.indexOf(best) };
  }, [k, st]);
  if (!s) return <p>Unknown test. <a href={href("/lab")}>Back to the Lab</a>.</p>;
  const dayFmt = (d: number) => fmtDay(s, d);
  const diff = r.react.total - r.act.total;
  const defaults = init();
  const isDefault = s.params.every((p: any) => st[p.id] === defaults[p.id]);
  const truth = 100 * (r.react.total - r.early.total) / (r.react.total || 1);
  const showResults = !!guess;
  const sigCols = ["var(--watch)", "var(--ready)", "var(--alert)"];
  const xs = Array.from({ length: s.H + 1 }, (_, i) => i);
  const xStep = s.H <= 40 ? 5 : s.H <= 60 ? 10 : s.H <= 120 ? 20 : 30;
  const mc = MODEL_CARDS[k];
  return (
    <>
      <p className="small"><a href={href("/lab")}>← Stress Test Lab</a></p>
      <div className="eyebrow">Illustrative stress test · {(CATS as any[]).find((c) => c.id === MODEL_CAT[k])?.name}</div>
      <h1>What if {s.ask}</h1>
      <p className="lede">{mc.q}</p>
      <div className="pathrow">{s.path.map(([h, t]: string[]) => <div key={h}><b>{h}</b>{t}</div>)}</div>

      {!showResults ? (
        <section className="guess">
          <h2>Guess first</h2>
          <p>With the default settings, how much lower is the total cost (losses plus response) if the response starts at the <b>“get ready”</b> sign rather than waiting for the <b>“act now”</b> sign?</p>
          <div className="chips">{GUESSES.map(([l]) => <button key={l} className="chip" onClick={() => { saveGuess(k, l); setGuess(l); }}>{l}</button>)}</div>
          <button className="btn ghost" onClick={() => setGuess("skipped")}>Skip and show the results</button>
        </section>
      ) : (
        guess !== "skipped" && isDefault && (() => {
          const g = GUESSES.find(([l]) => l === guess);
          const hit = g && truth >= g[1] && truth < g[2];
          return <div className="notice info"><b>{hit ? "Good call." : "Not quite."}</b> You guessed {guess.toLowerCase()}. In this test, starting at the “get ready” sign ({dayFmt(r.readyDay)}) costs {fmtM(r.early.total)} against {fmtM(r.react.total)} for waiting to react: <b>{Math.round(truth)}% lower</b>. Now change the settings and see when that stops being true.</div>;
        })()
      )}

      {showResults && (
        <div className="labgrid">
          <aside>
            <div className="panel">
              <h3>Settings</h3>
              {s.params.map((p: any) => (
                <div className="ctrl" key={p.id}>
                  <label htmlFor={`in-${p.id}`}>{p.label}<output>{p.fmt(st[p.id])}</output></label>
                  <input id={`in-${p.id}`} type="range" min={p.min} max={p.max} step={p.step} value={st[p.id]} onChange={(e) => setSt({ ...st, [p.id]: +e.target.value })} />
                  <div className="hint">{p.hint}</div>
                </div>
              ))}
              <p className="small"><b>What if…</b></p>
              <div className="chips">
                {(s.questions || []).map(([q, fn]: [string, any]) => <button key={q} className="chip" style={{ textAlign: "left" }} onClick={() => setSt({ ...st, ...fn(r.sig) })}>…{q}</button>)}
                <button className="chip" onClick={() => setSt(init())}>Reset</button>
              </div>
            </div>
          </aside>
          <div>
            <div className="tiles">
              <div className="tile none"><span className="l">Do nothing</span><span className="n">{fmtM(r.base.loss)}</span><span className="s">Losses with no response</span></div>
              <div className="tile react"><span className="l">Wait and react</span><span className="n">{fmtM(r.react.total)}</span><span className="s">Starts at “act now” ({dayFmt(r.actDay)})</span></div>
              <div className="tile act"><span className="l">Your choice: {dayFmt(st.a)}</span><span className="n">{fmtM(r.act.total)}</span><span className="s">Loss {fmtM(r.act.loss)} + response {fmtM(r.act.cost)}</span></div>
              <div className="tile save"><span className="l">{diff >= 0 ? "Lower than waiting by" : "Higher than waiting by"}</span><span className="n">{fmtM(Math.abs(diff))}</span><span className="s">Best start in this test: {dayFmt(r.bestDay)}</span></div>
            </div>
            <p className="small"><b>If the warning proves false:</b> acting from {dayFmt(st.a)} would cost about {fmtM(r.act.cost)} with nothing gained. Waiting to react would cost nothing, because the “act now” sign would never be reached.</p>
            <div className="panel">
              <h3>{s.y.label}</h3>
              <Legend items={[{ label: "Do nothing", color: "var(--base)", dash: true }, { label: "Wait and react", color: "var(--late)" }, { label: "Your choice", color: "var(--act)" }, { label: "Example warning signs", color: "var(--ready)", dash: true }]} />
              <LineChart aria={`${s.y.label} over time`} xDomain={[0, s.H]} yDomain={s.refLine ? [0, 125] : undefined}
                xTicks={Array.from({ length: Math.floor(s.H / xStep) + 1 }, (_, i) => ({ v: i * xStep, label: s.dates !== undefined ? fmtDay(s, i * xStep) : String(i * xStep) }))}
                xFmt={(d) => dayFmt(d)} yFmt={(v) => s.y.fmt(v)} refLine={s.refLine ? { y: s.refLine[0], label: s.refLine[1] } : undefined}
                vlines={[...r.sig.map(([lab, d]: [string, number], i: number) => ({ x: Math.max(0, d), label: lab, color: sigCols[i] })), { x: st.a, label: "Your choice starts", color: "var(--act)", dash: "1 0" }]}
                fill={{ a: r.react.y.map((y: number, x: number) => ({ x, y })), b: r.act.y.map((y: number, x: number) => ({ x, y })), color: "var(--band)" }}
                series={[
                  { id: "none", label: "Do nothing", color: "var(--base)", dash: "6 4", data: xs.map((x) => ({ x, y: r.base.y[x] })) },
                  { id: "react", label: "Wait and react", color: "var(--late)", data: xs.map((x) => ({ x, y: r.react.y[x] })) },
                  { id: "act", label: "Your choice", color: "var(--act)", width: 2.5, data: xs.map((x) => ({ x, y: r.act.y[x] })) },
                ]} />
              <p className="small muted">{s.c1sub} Shaded: the difference between your choice and waiting to react.</p>
            </div>
            <div className="panel">
              <h3>Total cost by the day the response starts</h3>
              <LineChart aria="Total cost by start day" xDomain={[0, s.aMax]} yFmt={(v) => fmtM(v)} xFmt={(d) => "Start " + dayFmt(d)}
                xTicks={Array.from({ length: 7 }, (_, i) => Math.round((i * s.aMax) / 6)).map((v) => ({ v, label: s.dates !== undefined ? fmtDay(s, v) : String(v) }))}
                points={[{ x: st.a, y: r.curve[st.a], color: "var(--act)", label: "Your choice" }]}
                series={[
                  { id: "none", label: "Do nothing", color: "var(--base)", dash: "6 4", data: r.curve.map((_, x) => ({ x, y: r.base.loss })) },
                  { id: "react", label: "Wait and react", color: "var(--late)", dash: "3 3", data: r.curve.map((_, x) => ({ x, y: r.react.total })) },
                  { id: "curve", label: "Start on that day", color: "var(--act)", width: 2.5, data: r.curve.map((y, x) => ({ x, y })) },
                ]} />
            </div>
          </div>
        </div>
      )}

      <div className="grid2">
        <LiveContext k={k} />
        <section className="panel">
          <h3>A plan agreed in advance (proposed)</h3>
          <p><b>Trigger.</b> {s.playbook.trigger}</p>
          <p><b>Action.</b> {s.playbook.action}</p>
          <p><b>Money.</b> {s.playbook.money}</p>
          <p><b>Learning.</b> {s.playbook.learning}</p>
          <p className="small muted">Proposed leads and funding have not been agreed by any agency.</p>
        </section>
      </div>
      <section className="panel">
        <h3>Assumptions and sources</h3>
        <div className="tablewrap"><table className="data"><thead><tr><th>Input</th><th>Value</th><th>Type</th><th>Source</th></tr></thead>
          <tbody>{s.assumptions.map((a: string[]) => <tr key={a[0]}><td>{a[0]}</td><td>{a[1]}</td><td>{a[2] === "src" ? <Evidence cls="observation" /> : <Evidence cls="scenario_output" />}</td><td>{a[4] ? <a href={a[4]}>{a[3]}</a> : a[3]}</td></tr>)}</tbody></table></div>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div><b>What the model counts</b><p className="small">{mc.counts}</p></div>
          <div><b>What it leaves out</b><p className="small">{mc.omits}</p></div>
        </div>
        {mc.data && <p className="small"><b>Data the research would add:</b> {mc.data}</p>}
      </section>
    </>
  );
}

export function CompoundYear() {
  const [cfg, setCfg] = useState({ set: [...MODELLED] as string[], kappa: 8, penalty: 5 });
  const [playbook, setPlaybook] = useState(false);
  const state = useMemo(() => defaultState(), []);
  const none = integrated(cfg, null, false, state), react = integrated(cfg, "react", playbook, state), early = integrated(cfg, 0, playbook, state);
  const max = Math.max(none.combined, react.combined, early.combined, 1);
  const toggle = (k: string) => setCfg({ ...cfg, set: cfg.set.includes(k) ? cfg.set.filter((x) => x !== k) : [...cfg.set, k] });
  return (
    <>
      <p className="small"><a href={href("/lab")}>← Stress Test Lab</a></p>
      <div className="eyebrow">Illustrative stress test · compound year</div>
      <h1>What a bad year could cost</h1>
      <p className="lede">When threats overlap, they draw on the same people, money and buffers. Choose which threats arrive in the same year, then see how timing and a shared plan change the total.</p>
      <div className="notice model"><Evidence cls="scenario_output" /> The overlap penalty and the extra delay are assumed multipliers, not estimates. The research would model shared resources and timing explicitly.</div>
      <div className="labgrid">
        <aside className="panel">
          <h3>Threats in this year</h3>
          <div className="chips">{MODELLED.map((k: string) => <button key={k} className="chip" aria-pressed={cfg.set.includes(k)} onClick={() => toggle(k)}>{S[k].tab}</button>)}</div>
          <p className="small"><b>Possible timelines</b></p>
          <div className="chips">{(STORIES as any[]).map((st) => <button key={st.id} className="chip" onClick={() => setCfg({ ...cfg, set: st.on })} title={st.path}>{st.title}</button>)}</div>
          <div className="ctrl"><label htmlFor="kap">Extra damage when threats overlap<output>{cfg.kappa}%</output></label><input id="kap" type="range" min={0} max={40} value={cfg.kappa} onChange={(e) => setCfg({ ...cfg, kappa: +e.target.value })} /><div className="hint">Extra loss for each additional threat that overlaps.</div></div>
          <div className="ctrl"><label htmlFor="pen">Extra delay when agencies are stretched<output>{cfg.penalty} days</output></label><input id="pen" type="range" min={0} max={21} value={cfg.penalty} onChange={(e) => setCfg({ ...cfg, penalty: +e.target.value })} /><div className="hint">Extra days of delay for each additional threat, unless a shared plan exists.</div></div>
          <label><input type="checkbox" checked={playbook} onChange={(e) => setPlaybook(e.target.checked)} /> A shared plan agreed in advance</label>
        </aside>
        <div className="panel">
          <h3>Total cost of the year, {cfg.set.length} threat{cfg.set.length === 1 ? "" : "s"}</h3>
          <div className="bars">
            {[["Do nothing", none.combined, "var(--base)"], ["Wait and react", react.combined, "var(--late)"], ["Act at each “get ready” sign", early.combined, "var(--act)"]].map(([l, v, c]: any) => (
              <div className="row" key={l}><span>{l}</span><span><span className="bar" style={{ display: "block", width: `${(100 * v) / max}%`, background: c }} /></span><span className="v">{fmtM(v)}</span></div>))}
          </div>
          <p style={{ marginTop: 14 }}>Acting at each “get ready” sign costs <b>{fmtM(react.combined - early.combined)}</b> less than waiting to react. Overlap adds <b>{fmtM(Math.max(0, react.overlap))}</b> to the wait-and-react total compared with the same threats in separate years{playbook ? ", with the shared plan removing the extra delay" : ""}.</p>
          <h3 style={{ marginTop: 16 }}>Each threat on its own</h3>
          <div className="tablewrap"><table className="data">
            <thead><tr><th>Threat</th><th className="num">Wait and react</th><th className="num">Act at “get ready”</th><th className="num">Difference</th></tr></thead>
            <tbody>{react.per.map((p: any, i: number) => (
              <tr key={p.k}><td><a href={href(`/lab/${p.k}`)}>{S[p.k].tab}</a></td><td className="num">{fmtM(p.solo)}</td><td className="num">{fmtM(early.per[i].solo)}</td><td className="num">{fmtM(p.solo - early.per[i].solo)}</td></tr>))}</tbody>
          </table></div>
          <p className="small muted">Single-threat totals, before the overlap penalty and the extra delay are applied.</p>
          {(STORIES as any[]).filter((st) => JSON.stringify([...st.on].sort()) === JSON.stringify([...cfg.set].sort())).map((st) => (
            <div key={st.id} className="notice info"><b>{st.title}.</b> {st.path}<br /><span className="small">What could change the outcome: {st.change.join("; ")}.</span></div>))}
        </div>
      </div>
    </>
  );
}

export function Register() {
  const [cat, setCat] = useState("all");
  const rows = (REG as any[]).filter((r) => cat === "all" || r.cat === cat).sort((a, b) => b.score - a.score);
  return (
    <>
      <p className="small"><a href={href("/lab")}>← Stress Test Lab</a></p>
      <div className="eyebrow">Threat register</div>
      <h1>Eighteen threats to Canada's food system</h1>
      <div className="notice judge"><Evidence cls="author_judgement" /> <b>Preliminary author judgement.</b> Likelihood (L), impact (I), speed (S) and reach (R) ratings, the scores, the bands and the example warning levels are the authors' own settings, carried over unchanged from the Canada Food System Stress Test. They are not measurements, not live readings and not combined with the observed data elsewhere on this site. The first phase of the research would replace them with a structured expert ranking.</div>
      <div className="chips">{[{ id: "all", name: "All" }, ...(CATS as any[])].map((c) => <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.name}</button>)}</div>
      <div className="tablewrap panel"><table className="data">
        <thead><tr><th>Threat</th><th>Weak point</th><th>Evidence it is real</th><th className="num">L</th><th className="num">I</th><th className="num">S</th><th className="num">R</th><th>Band</th><th>Example warning level</th><th>Test</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.name}><td><b>{r.name}</b><div className="small muted">{(CATS as any[]).find((c) => c.id === r.cat)?.name}</div></td><td className="small">{r.choke}</td>
            <td className="small"><a href={r.url}>{r.ev}</a></td><td className="num">{r.L}</td><td className="num">{r.I}</td><td className="num">{r.S}</td><td className="num">{r.R}</td>
            <td>{r.band}</td><td>{SIG[r.sig]}</td><td>{r.model ? <a href={href(`/lab/${r.model}`)}>Open</a> : <span className="muted">—</span>}</td></tr>))}</tbody>
      </table></div>
      <p className="small muted">Score = L × I × (S + R) / 10, as in the original prototype. Bands: High ≥ 12, Moderate ≥ 6, otherwise Low.</p>
    </>
  );
}
