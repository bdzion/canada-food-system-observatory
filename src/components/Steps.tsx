/* "Step N of 4" header and next/previous links, so a new reader always knows where they are. */
import { STEPS } from "../content/plain";
import { href } from "../lib/router";

export function StepHead({ n }: { n: number }) {
  const s = STEPS[n - 1];
  return (
    <div className="stephead">
      <ol className="steps" aria-label="The four steps of this site">
        {STEPS.map((x) => (
          <li key={x.n} aria-current={x.n === n ? "step" : undefined}>
            <a href={href(x.path)}><span className="num">{x.n}</span>{x.title}</a>
          </li>
        ))}
      </ol>
      <div className="eyebrow">Step {n} of 4</div>
      <h1>{s.title}</h1>
      <p className="lede">{s.q}</p>
    </div>
  );
}

export function StepFoot({ n }: { n: number }) {
  const prev = STEPS[n - 2], next = STEPS[n];
  return (
    <nav className="stepfoot" aria-label="Next and previous steps">
      {prev ? <a href={href(prev.path)}>← Step {prev.n}: {prev.title}</a> : <a href={href("/")}>← Overview</a>}
      {next ? <a className="btn" href={href(next.path)}>Next, step {next.n}: {next.title} →</a> : <a className="btn" href={href("/briefs")}>Read the weekly brief →</a>}
    </nav>
  );
}
