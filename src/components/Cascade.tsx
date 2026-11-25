/* How far along the food chain the published readings have reached.
 *
 * This is the piece that joins step 2 (the indicators) to step 4 (the possible
 * timelines). It shows, for one what-if test: the stages of the chain, which
 * readings are watched at each, which of them are saying something now, which
 * of the three warning signs that matches, and what would change the answer.
 *
 * Everything the reader is told here is either a published figure, named and
 * linked so it can be checked, or the team's judgement, labelled as such. The
 * component shows no number the pipeline did not publish. */
import { href } from "../lib/router";
import type { Chain, Sign, Stage, StageWatch } from "../lib/types";
import { Evidence } from "./Badges";

const STAGE_STATE: Record<string, { label: string; cls: string }> = {
  reached: { label: "Readings here are saying so", cls: "reached" },
  easing: { label: "Was reached earlier, now quiet", cls: "easing" },
  clear: { label: "Nothing unusual here", cls: "clear" },
  insufficient: { label: "Not enough data to tell", cls: "thin" },
  unwatched: { label: "No figure for this stage", cls: "thin" },
};

function Reading({ w }: { w: StageWatch }) {
  const to = `/indicators/${w.indicator}`;
  return (
    <li className={`reading ${w.firing ? "firing" : w.state}`}>
      <div className="reading-head">
        <a href={href(to)}>{w.title || w.indicator}</a>
        {w.firing
          ? <span className="tag firing">Saying so now</span>
          : w.state === "quiet" ? <span className="tag quiet">Quiet</span>
          : w.state === "missing" ? <span className="tag thin">Not in this update</span>
          : <span className="tag thin">Not enough data</span>}
        {w.late && <span className="tag late">Late</span>}
      </div>
      {w.firing && w.rung_label && (
        <p className="reading-why">
          <b>{w.rung_label}.</b>{" "}
          {w.period && <span className="muted">{w.period}. </span>}
          {w.direction_seen === "up" ? "Moving up." : w.direction_seen === "down" ? "Moving down." : null}
        </p>
      )}
      <p className="reading-why">
        <span className="muted">Why it is watched here: </span>{w.why}
      </p>
      {w.late && w.late_note && <p className="reading-why warn">{w.late_note}</p>}
    </li>
  );
}

function StageBlock({ s, n, total }: { s: Stage; n: number; total: number }) {
  const st = STAGE_STATE[s.state] ?? STAGE_STATE.clear;
  return (
    <li className={`stage ${st.cls}${s.unsupported ? " unsupported" : ""}`}>
      <div className="stage-head">
        <span className="stage-n" aria-hidden="true">{n}</span>
        <div>
          <h4>{s.label}</h4>
          <p className="muted small">{s.what}</p>
        </div>
      </div>
      <p className="stage-state">
        <b>{st.label}.</b>{" "}
        {s.counts.watched > 0 && (
          <span>
            {s.counts.firing} of the {s.counts.watched} figure{s.counts.watched === 1 ? "" : "s"} watched here
            {s.counts.firing === 1 ? " is" : " are"} saying so
            {s.counts.unreadable > 0 && `, and ${s.counts.unreadable} cannot be read`}
            {s.counts.late > 0 && `, with ${s.counts.late} older than the source normally publishes`}.
          </span>
        )}
        {s.state === "unwatched" && s.unwatched_why && <span> {s.unwatched_why}</span>}
        {s.unsupported && (
          <span className="warn">
            {" "}Nothing earlier in the chain supports this, so this chain is not the explanation for it.
          </span>
        )}
        {s.state === "easing" && (
          <span> It was reached earlier in this disruption, which is not the same as never having happened.</span>
        )}
      </p>
      {s.watch.length > 0 && <ul className="readings">{s.watch.map((w) => <Reading key={w.indicator + (w.item || "")} w={w} />)}</ul>}
      {n < total && <div className="stage-arrow" aria-hidden="true">↓</div>}
    </li>
  );
}

function SignBlock({ g }: { g: Sign }) {
  return (
    <li className={`sign ${g.id}${g.supported ? " supported" : ""}`}>
      <div className="sign-head">
        <h4>{g.label}</h4>
        {g.supported
          ? <span className="tag firing">The readings match this now</span>
          : g.fired_without_support
            ? <span className="tag thin">A reading here has moved, but nothing earlier in the chain has</span>
            : <span className="tag quiet">Not matched by the readings</span>}
      </div>
      <p>{g.text}</p>
      <p className="small muted">
        What would put us here: {g.min_firing === 1 ? "at least one" : `at least ${g.min_firing}`} of the{" "}
        {g.watched} figure{g.watched === 1 ? "" : "s"} at the stage “{g.stage_label.toLowerCase()}”.{" "}
        <Evidence cls="author_judgement" /> The level that counts is our rating, not a measurement.
      </p>
      {g.supported && g.evidence.length > 0 && (
        <p className="small">
          On these readings:{" "}
          {g.evidence.map((e, i) => (
            <span key={e.indicator + (e.item || "")}>
              {i > 0 && ", "}
              <a href={href(`/indicators/${e.indicator}`)}>{e.title || e.indicator}</a>
              {e.late && <span className="muted"> (late)</span>}
            </span>
          ))}
          .
        </p>
      )}
      {g.supported && g.rests_on_late_data && (
        <p className="small warn">
          Every figure putting us here is older than its source normally publishes, so this is where the chain
          stood when the data stopped.
        </p>
      )}
    </li>
  );
}

export default function Cascade({ chain, note }: { chain: Chain; note?: string }) {
  return (
    <section className="cascade" aria-labelledby={`casc-${chain.id}`}>
      <h3 id={`casc-${chain.id}`}>What the live figures say about this chain</h3>
      <p className="lede">{chain.summary}</p>
      <p className="cascade-verdict">{chain.text}</p>

      <h4 className="sub">The chain, stage by stage</h4>
      <p className="muted small">
        Each stage is a link in the chain. A stage counts as reached only if every stage before it has been
        reached too: a shock travelling along a chain leaves a mark at each link it passes, so a reading at the
        far end on its own does not show that it travelled. Where we have no figure for a link, the chain stops
        there, because we cannot know whether a shock passed through it.
      </p>
      <ol className="stages">
        {chain.stages.map((s, i) => <StageBlock key={s.id} s={s} n={i + 1} total={chain.stages.length} />)}
      </ol>

      <h4 className="sub">The three warning signs, and which one the figures match</h4>
      <p className="muted small">
        The signs and the levels that count as reaching them are the research team's judgement. No threshold
        here has been tested against a past Canadian disruption. <Evidence cls="author_judgement" />
      </p>
      <ol className="signs">{chain.signs.map((g) => <SignBlock key={g.id} g={g} />)}</ol>

      {chain.depends_on.length > 0 && (
        <>
          <h4 className="sub">What would change our mind</h4>
          <p className="muted small">
            The readings this conclusion leans on most, and what would make us read them differently.
          </p>
          <dl className="depends">
            {chain.depends_on.map((d) => (
              <div key={d.indicator}>
                <dt><a href={href(`/indicators/${d.indicator}`)}>{d.indicator.replace(/_/g, " ")}</a></dt>
                <dd>
                  <p><span className="muted">We are assuming: </span>{d.assumption}</p>
                  <p><span className="muted">That would be wrong if: </span>{d.would_change}</p>
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {note && <p className="small muted note">{note}</p>}
    </section>
  );
}

/* A one-line summary used on the threats hub and the overview. */
export function CascadeLine({ chain }: { chain: Chain }) {
  if (!chain.stage_reached) {
    const allUnwatched = chain.unwatched_stages.length === chain.stages.length;
    return (
      <span className="casc-line">
        {/* When a downstream stage has moved but nothing upstream supports it, saying
            "nothing has travelled" first and then "a reading has moved" reads as a
            contradiction. Lead with the unsupported reading instead and explain it. */}
        <span className="tag quiet">
          {allUnwatched
            ? "No live figures for this chain"
            : chain.unsupported_stages.length > 0
              ? "Nothing has travelled along this chain in order"
              : "Nothing has travelled along this chain"}
        </span>
        {chain.unsupported_stages.length > 0 && (
          <span className="muted small"> One reading near the end of the chain has moved, but no
            earlier link has, so a shock travelling along this chain is unlikely to be the cause.</span>
        )}
      </span>
    );
  }
  return (
    <span className="casc-line">
      <span className="tag firing">Reached: {chain.stage_reached_label}</span>
      {chain.sign_supported_label && <span className="tag sign">Matches “{chain.sign_supported_label}”</span>}
      {chain.rests_on_late_data && <span className="tag late">On late data</span>}
    </span>
  );
}
