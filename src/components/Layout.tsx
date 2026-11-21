import { useEffect, useState } from "react";
import { useData } from "../lib/data";
import { ago, dateTime } from "../lib/format";
import { href } from "../lib/router";
import type { Manifest, Source } from "../lib/types";

const NAV: [string, string][] = [
  ["/", "Situation Room"], ["/indicators", "Indicators"], ["/events", "Events"], ["/exposure", "Global links"],
  ["/lab", "Stress Test Lab"], ["/briefs", "Briefs"], ["/methods", "Methods & sources"],
];

function ThemeButton() {
  const [t, setT] = useState<string>(() => { try { return localStorage.getItem("cfso.theme") || ""; } catch { return ""; } });
  useEffect(() => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }, [t]);
  const next = t === "dark" ? "light" : t === "light" ? "" : "dark";
  const label = t === "dark" ? "Dark" : t === "light" ? "Light" : "Auto";
  return <button className="themebtn" onClick={() => { setT(next); try { localStorage.setItem("cfso.theme", next); } catch { /* */ } }} aria-label={`Colour theme: ${label}. Change`}>◐ {label}</button>;
}

export function Header({ section }: { section: string }) {
  const { data: man } = useData<Manifest>("manifest.json");
  const { data: src } = useData<Source[]>("sources.json");
  const bad = (src || []).filter((s) => s.health !== "ok");
  return (
    <>
      <header className="top">
        <div className="wrap topbar">
          <a className="brand" href={href("/")}>
            <span>Arrell Food Institute · University of Guelph · Research prototype</span>
            <b>Canada Food System Observatory</b>
          </a>
          <nav className="nav" aria-label="Main">
            {NAV.map(([p, l]) => <a key={p} href={href(p)} aria-current={(p === "/" ? section === "" : section === p.slice(1)) ? "page" : undefined}>{l}</a>)}
          </nav>
          <ThemeButton />
        </div>
      </header>
      <div className="status" role="status">
        <div className="wrap">
          {man ? <span>Data processed <b>{dateTime(man.generated_at)}</b> <span className="muted">({ago(man.generated_at)})</span></span> : <span className="muted">Loading data release…</span>}
          {src && <a href={href("/methods")} style={{ color: "inherit" }}><span className={`dot ${bad.length ? "stale" : "ok"}`} />{src.length - bad.length} of {src.length} sources normal{bad.length ? ` · ${bad.map((b) => b.id).join(", ")} need attention` : ""}</a>}
          <span className="muted">Each figure shows its own data period. Not an official alert service.</span>
        </div>
      </div>
    </>
  );
}

export function Footer() {
  const { data: man } = useData<Manifest>("manifest.json");
  return (
    <footer>
      <div className="wrap cols">
        <div>
          <p><b>Research prototype.</b> This platform brings together publicly available evidence for research, discussion and preparedness analysis. It is not a Government of Canada monitoring service or an official alerting system. Source data may be delayed or revised. Stress-test results are illustrative unless explicitly identified as validated.</p>
          <p>Developed at the Arrell Food Institute, University of Guelph, as a companion to the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>. Comments: <a href="mailto:mbodrudd@uoguelph.ca">mbodrudd@uoguelph.ca</a>.</p>
        </div>
        <div>
          <p><b>Explore</b><br />
            {NAV.map(([p, l]) => <span key={p}><a href={href(p)}>{l}</a><br /></span>)}</p>
        </div>
        <div>
          <p><b>Reuse</b><br />
            <a href={`${import.meta.env.BASE_URL}data/feed.xml`}>Weekly brief RSS feed</a><br />
            <a href={`${import.meta.env.BASE_URL}data/manifest.json`}>Data release manifest</a><br />
            <a href="https://github.com/bdzion/canada-food-system-observatory">Source code and data history</a></p>
          {man && <p className="small">Release <span className="kbd">{man.release_id}</span>{man.git_sha ? <> · code <span className="kbd">{man.git_sha.slice(0, 7)}</span></> : null}</p>}
        </div>
      </div>
    </footer>
  );
}
