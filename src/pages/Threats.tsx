// Step 3: the threats. What could go wrong, what is showing up now, and what acting early could save.
import { useMemo, useState } from "react";
import { Evidence } from "../components/Badges";
import IndicatorCard from "../components/IndicatorCard";
import LineChart, { Legend } from "../components/LineChart";
import { StepFoot, StepHead } from "../components/Steps";
import { GROUP_PLAIN, ORIGIN_PLAIN, TEST_LIVE, TEST_TITLE } from "../content/plain";
import { SCEN, MODELLED, MODEL_CARDS, CATS, REG, SIG, fmtM, fmtDay, CHECKED } from "../legacy/core.js";
import { useData } from "../lib/data";
import { href } from "../lib/router";
import type { EventItem, Indicator } from "../lib/types";
import { getGuess, saveGuess } from "../lib/visit";

const S: any = SCEN;
const BAND: Record<string, string> = { High: "High concern", Moderate: "Moderate concern", Low: "Lower concern" };

export function ThreatsHub() {
  const { data: ev } = useData<{ items: EventItem[] }>("events.json");
  const { data: og } = useData<{ items: any[] }>("ongoing.json");
  const [open, setOpen] = useState<string | null>(null);
  const items = ev?.items || [];
  const nWarn = items.filter((e) => e.kind === "weather_alert").length;
  const nRecent = items.filter((e) => (e.kind === "recall" || e.kind === "gov_notice") && (e.date || "") >= new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)).length;
  const abroad = items.filter((e) => e.kind === "global_hazard");
  const linked = abroad.filter((e) => e.canada_link?.level === "L1").length;
  return (
    <>
      <StepHead n={3} />
      <p style={{ maxWidth: "75ch" }}>A threat is anything that could break a link in the chain: bad weather, an animal disease, a strike, a cyberattack, a trade dispute. Some start in Canada, others abroad. This step lists the eighteen threats we track, shows which ones are showing up now, and lets you test what acting early could save.</p>

      <h2>Is anything happening now?</h2>
      {(og?.items || []).map((o) => (
        <a key={o.id} className="card ongoing" href={href("/threats/ongoing")} style={{ display: "block" }}>
          <span className="tag">Ongoing disruption · day {o.days}</span>
          <h4 style={{ marginTop: 8 }}>{o.title}</h4>
          <p>{o.live.text}</p>
        </a>
      ))}
      <div className="grid2">
        <a className="card" href={href("/threats/warnings")}>
          <div className="meta"><Evidence cls="official_alert" /><Evidence cls="official_notice" /></div>
          <h4>Warnings and notices in Canada</h4>
          <p>{nWarn} weather alert{nWarn === 1 ? "" : "s"} in effect, and {nRecent} food recall{nRecent === 1 ? "" : "s"} and government announcement{nRecent === 1 ? "" : "s"} in the last 30 days.</p>
        </a>
        <a className="card" href={href("/threats/abroad")}>
          <div className="meta"><Evidence cls="official_alert" /><Evidence cls="supplier_link" /></div>
          <h4>Disasters abroad, and whether Canada buys from those places</h4>
          <p>{abroad.length} serious disaster{abroad.length === 1 ? "" : "s"} listed in recent weeks; {linked} in countries that supply food or farm supplies to Canada.</p>
        </a>
      </div>

      <h2 style={{ marginTop: 24 }}>What if? Seven threats you can test</h2>
      <p className="small muted" style={{ maxWidth: "75ch" }}>Each test is a simple model. It compares doing nothing, waiting until damage is visible, and acting at the first warning signs. You can change the settings. The numbers are illustrations built from stated assumptions, not forecasts.</p>
      <div className="grid3">
        {MODELLED.map((k: string) => (
          <a key={k} className="card" href={href(`/threats/${k}`)}>
            <div className="meta"><Evidence cls="scenario_output" /></div>
            <h4>What if {TEST_TITLE[k].replace(/^./, (c) => c.toLowerCase())}?</h4>
            <p>{MODEL_CARDS[k].q}</p>
          </a>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>All eighteen threats we track</h2>
      <div className="notice judge"><Evidence cls="author_judgement" /> The level of concern and the warning level for each threat are the research team's own ratings, carried over from the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>. They are not measurements. A structured review with experts should replace them.</div>
      {(CATS as any[]).map((c) => {
        const rows = (REG as any[]).filter((r) => r.cat === c.id).sort((a, b) => b.score - a.score);
        return (
          <section key={c.id} className="panel">
            <h3>{GROUP_PLAIN[c.id] || c.name}</h3>
            {rows.map((r) => (
              <div key={r.name} style={{ borderTop: "1px solid var(--line)", padding: "10px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <b>{r.name}</b>
                  <span className="small"><span className="fixtag">{BAND[r.band]}</span> <span className="fixtag">Warning level: {SIG[r.sig]}</span></span>
                </div>
                <p className="small" style={{ margin: "4px 0" }}><span className="muted">{ORIGIN_PLAIN[r.origin]}.</span> Weak point: {r.choke}. Could lead to: {r.outcome.toLowerCase()}.</p>
                <p className="small" style={{ margin: 0 }}>Why we think it is real: <a href={r.url}>{r.ev}</a>{r.model && <> · <a href={href(`/threats/${r.model}`)}>Try the what-if test →</a></>}</p>
                <button className="chip" style={{ marginTop: 6 }} onClick={() => setOpen(open === r.name ? null : r.name)} aria-expanded={open === r.name}>How we rated it</button>
                {open === r.name && <p className="small muted" style={{ marginTop: 6 }}>Likelihood {r.L} of 5 · impact {r.I} of 5 · speed {r.S} of 5 · reach {r.R} of 5. Score = likelihood × impact × (speed + reach) ÷ 10 = {r.score}. Our confidence: {String(r.conf).toLowerCase()}.</p>}
              </div>
            ))}
          </section>
        );
      })}
      <p className="small muted">Warning levels run from Normal to Watch, Get ready and Act now. They show how the team would read the signs at the date of the last check ({CHECKED}); they are not live readings.</p>
      <StepFoot n={3} />
    </>
  );
}

const GUESSES: [string, number, number][] = [["Less than 10%", 0, 10], ["10 to 30%", 10, 30], ["30 to 60%", 30, 60], ["More than 60%", 60, 1000]];

function LiveContext({ k }: { k: string }) {
  const { data } = useData<{ indicators: Indicator[] }>("indicators.json");
  const L = TEST_LIVE[k];
  const inds = (data?.indicators || []).filter((i) => L?.ind?.includes(i.id));
  return (
    <section className="panel">
      <h3>What the latest data show</h3>
      <p className="small muted">{L?.text}</p>
      {inds.map((i) => <IndicatorCard key={i.id} i={i} compact role={false} />)}
      {L?.link ? <p><a href={href(L.link)}>{L.label} →</a></p> : null}
      <p className="small"><b>The test does not use these figures.</b> You set its assumptions yourself. The live data are here so you can judge how close the situation is to the test.</p>
    </section>
  );
}

export function TestPage({ k }: { k: string }) {
  const s = S[k];
  const init = () => (s ? Object.fromEntries(s.params.map((p: any) => [p.id, p.value])) : {});
  const [st, setSt] = useState<Record<string, number>>(init);
  const [guess, setGuess] = useState<string | null>(() => getGuess(k));
  const r = useMemo(() => {
    if (!s) return null;
    const base = s.run(st, Infinity), act = s.run(st, st.a);
    const sig = s.signals(base);
    const actDay = Math.max(0, sig[2][1]), readyDay = Math.max(0, sig[1][1]);
    const react = s.run(st, actDay), early = s.run(st, readyDay);
    const curve: number[] = [];
    for (let d = 0; d <= s.aMax; d++) curve.push(s.run(st, d).total);
    const best = Math.min(...curve);
    return { base, act, sig, actDay, readyDay, react, early, curve, best, bestDay: curve.indexOf(best) };
  }, [k, st]);
  if (!s || !r) return <p>We could not find that test. <a href={href("/threats")}>Back to the threats</a>.</p>;
  const dayFmt = (d: number) => fmtDay(s, d);
  const diff = r.react.total - r.act.total;
  const defaults = init();
  const isDefault = s.params.every((p: any) => st[p.id] === defaults[p.id]);
  const truth = (100 * (r.react.total - r.early.total)) / (r.react.total || 1);
  const sigCols = ["var(--watch)", "var(--ready)", "var(--alert)"];
  const xs = Array.from({ length: s.H + 1 }, (_, i) => i);
  const xStep = s.H <= 40 ? 5 : s.H <= 60 ? 10 : s.H <= 120 ? 20 : 30;
  const mc = MODEL_CARDS[k];
  const [what, weak, absorbs, feels] = s.path.map((p: string[]) => p[1]);
  return (
    <>
      <p className="small"><a href={href("/threats")}>← Step 3: The threats</a></p>
      <div className="eyebrow">What-if test · a simple illustration, not a forecast</div>
      <h1>What if {TEST_TITLE[k].replace(/^./, (c) => c.toLowerCase())}?</h1>
      <p className="lede">{mc.q}</p>
      <div className="pathrow">
        <div><b>What happens</b>{what}</div><div><b>Weak point</b>{weak}</div><div><b>What softens the blow</b>{absorbs}</div><div><b>Who is hurt</b>{feels}</div>
      </div>
      <p className="small muted">The test tracks three warning signs: <b>Watch</b>, <b>Get ready</b> and <b>Act now</b>. It compares acting at “get ready” with waiting until “act now”, when damage is already visible.</p>

      {!guess ? (
        <section className="guess">
          <h2>Before you look: what is your guess?</h2>
          <p>With the starting settings, how much lower is the total cost (losses plus the cost of responding) if the response starts at <b>“get ready”</b> rather than waiting for <b>“act now”</b>?</p>
          <div className="chips">{GUESSES.map(([l]) => <button key={l} className="chip" onClick={() => { saveGuess(k, l); setGuess(l); }}>{l}</button>)}</div>
          <button className="btn ghost" onClick={() => setGuess("skipped")}>Skip and show the results</button>
        </section>
      ) : (
        guess !== "skipped" && isDefault && (() => {
          const g = GUESSES.find(([l]) => l === guess);
          const hit = g && truth >= g[1] && truth < g[2];
          return <div className="notice info"><b>{hit ? "Good guess." : "Not quite."}</b> You guessed {guess.toLowerCase()}. In this test, starting at “get ready” ({dayFmt(r.readyDay)}) costs {fmtM(r.early.total)}, against {fmtM(r.react.total)} for waiting until “act now”: <b>{Math.round(truth)}% less</b>. Now change the settings and see when that stops being true.</div>;
        })()
      )}

      {guess && (
        <div className="labgrid">
          <aside>
            <div className="panel">
              <h3>Settings you can change</h3>
              {s.params.map((p: any) => (
                <div className="ctrl" key={p.id}>
                  <label htmlFor={`in-${p.id}`}>{p.label}<output>{p.fmt(st[p.id])}</output></label>
                  <input id={`in-${p.id}`} type="range" min={p.min} max={p.max} step={p.step} value={st[p.id]} onChange={(e) => setSt({ ...st, [p.id]: +e.target.value })} />
                  <div className="hint">{p.hint}</div>
                </div>
              ))}
              <p className="small"><b>Try these:</b> what if…</p>
              <div className="chips">
                {(s.questions || []).map(([q, fn]: [string, any]) => <button key={q} className="chip" style={{ textAlign: "left" }} onClick={() => setSt({ ...st, ...fn(r.sig) })}>…{q}</button>)}
                <button className="chip" onClick={() => setSt(init())}>Back to the starting settings</button>
              </div>
            </div>
          </aside>
          <div>
            <div className="tiles">
              <div className="tile none"><span className="l">If nothing is done</span><span className="n">{fmtM(r.base.loss)}</span><span className="s">Losses with no response</span></div>
              <div className="tile react"><span className="l">If we wait until “act now”</span><span className="n">{fmtM(r.react.total)}</span><span className="s">Response starts {dayFmt(r.actDay)}</span></div>
              <div className="tile act"><span className="l">Your choice: start {dayFmt(st.a)}</span><span className="n">{fmtM(r.act.total)}</span><span className="s">Losses {fmtM(r.act.loss)} + response {fmtM(r.act.cost)}</span></div>
              <div className="tile save"><span className="l">{diff >= 0 ? "Saved compared with waiting" : "Extra cost compared with waiting"}</span><span className="n">{fmtM(Math.abs(diff))}</span><span className="s">Cheapest start in this test: {dayFmt(r.bestDay)}</span></div>
            </div>
            <p className="small"><b>And if the warning turns out to be false?</b> Starting {dayFmt(st.a)} would cost about {fmtM(r.act.cost)} for nothing. Waiting would cost nothing, because “act now” would never arrive. That is the trade-off of acting early.</p>
            <div className="panel">
              <h3>{s.y.label}</h3>
              <Legend items={[{ label: "If nothing is done", color: "var(--base)", dash: true }, { label: "If we wait until “act now”", color: "var(--late)" }, { label: "Your choice", color: "var(--act)" }, { label: "Warning signs", color: "var(--ready)", dash: true }]} />
              <LineChart aria={`${s.y.label} over time`} xDomain={[0, s.H]} yDomain={s.refLine ? [0, 125] : undefined}
                xTicks={Array.from({ length: Math.floor(s.H / xStep) + 1 }, (_, i) => ({ v: i * xStep, label: fmtDay(s, i * xStep) }))}
                xFmt={(d) => dayFmt(d)} yFmt={(v) => s.y.fmt(v)} refLine={s.refLine ? { y: s.refLine[0], label: s.refLine[1] } : undefined}
                vlines={[...r.sig.map(([lab, d]: [string, number], i: number) => ({ x: Math.max(0, d), label: lab, color: sigCols[i] })), { x: st.a, label: "Your choice starts", color: "var(--act)", dash: "1 0" }]}
                fill={{ a: r.react.y.map((y: number, x: number) => ({ x, y })), b: r.act.y.map((y: number, x: number) => ({ x, y })), color: "var(--band)" }}
                series={[
                  { id: "none", label: "Nothing done", color: "var(--base)", dash: "6 4", data: xs.map((x) => ({ x, y: r.base.y[x] })) },
                  { id: "react", label: "Wait", color: "var(--late)", data: xs.map((x) => ({ x, y: r.react.y[x] })) },
                  { id: "act", label: "Your choice", color: "var(--act)", width: 2.5, data: xs.map((x) => ({ x, y: r.act.y[x] })) },
                ]} />
              <p className="small muted">{s.c1sub} The shaded area is the difference between your choice and waiting.</p>
            </div>
            <div className="panel">
              <h3>Total cost, by the day the response starts</h3>
              <LineChart aria="Total cost by the day the response starts" xDomain={[0, s.aMax]} yFmt={(v) => fmtM(v)} xFmt={(d) => "Start " + dayFmt(d)}
                xTicks={Array.from({ length: 7 }, (_, i) => Math.round((i * s.aMax) / 6)).map((v) => ({ v, label: fmtDay(s, v) }))}
                points={[{ x: st.a, y: r.curve[st.a], color: "var(--act)", label: "Your choice" }]}
                series={[
                  { id: "none", label: "Nothing done", color: "var(--base)", dash: "6 4", data: r.curve.map((_, x) => ({ x, y: r.base.loss })) },
                  { id: "react", label: "Wait", color: "var(--late)", dash: "3 3", data: r.curve.map((_, x) => ({ x, y: r.react.total })) },
                  { id: "curve", label: "Start that day", color: "var(--act)", width: 2.5, data: r.curve.map((y, x) => ({ x, y })) },
                ]} />
              <p className="small muted">Read along the blue line: the lower it is, the cheaper it is to start on that day.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid2">
        <LiveContext k={k} />
        <section className="panel">
          <h3>What could be agreed before it happens</h3>
          <p className="small muted">A proposal for discussion. No agency has agreed to it.</p>
          <p><b>When to act.</b> {s.playbook.trigger}</p>
          <p><b>What to do.</b> {s.playbook.action}</p>
          <p><b>How to pay for it.</b> {s.playbook.money}</p>
          <p><b>How to tell whether it worked.</b> {s.playbook.learning}</p>
        </section>
      </div>
      <section className="panel">
        <h3>The assumptions behind this test</h3>
        <div className="tablewrap"><table className="data"><thead><tr><th>Assumption</th><th>Value used</th><th>Where it comes from</th><th>Source</th></tr></thead>
          <tbody>{s.assumptions.map((a: string[]) => <tr key={a[0]}><td>{a[0]}</td><td>{a[1]}</td><td>{a[2] === "src" ? "Published figure" : "Assumed for illustration"}</td><td>{a[4] ? <a href={a[4]}>{a[3]}</a> : a[3]}</td></tr>)}</tbody></table></div>
        <div className="grid3" style={{ marginTop: 12 }}>
          <div><b>What the test counts</b><p className="small">{mc.counts}</p></div>
          <div><b>What it leaves out</b><p className="small">{mc.omits}</p></div>
          {mc.data && <div><b>Data that would make it better</b><p className="small">{mc.data}</p></div>}
        </div>
      </section>
      <p><a href={href("/timelines")}>See how this threat could combine with others in a bad year → Step 4: Possible timelines</a></p>
    </>
  );
}
