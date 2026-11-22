import { useEffect, useState } from "react";
import { useData } from "../lib/data";
import { ago, dateTime } from "../lib/format";
import { href } from "../lib/router";
import type { Manifest, Source } from "../lib/types";

const NAV: [string, string, string][] = [
  ["/", "Overview", ""], ["/system", "The system", "system"], ["/indicators", "The indicators", "indicators"],
  ["/threats", "The threats", "threats"], ["/timelines", "Possible timelines", "timelines"],
  ["/briefs", "Weekly brief", "briefs"], ["/about", "About the data", "about"],
];

function ThemeButton() {
  const [t, setT] = useState<string>(() => { try { return localStorage.getItem("cfso.theme") || ""; } catch { return ""; } });
  useEffect(() => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }, [t]);
  const next = t === "dark" ? "light" : t === "light" ? "" : "dark";
  const label = t === "dark" ? "Dark" : t === "light" ? "Light" : "Auto";
  return <button className="themebtn" onClick={() => { setT(next); try { localStorage.setItem("cfso.theme", next); } catch { /* */ } }} aria-label={`Colours: ${label}. Change`}>◐ {label}</button>;
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
          <ThemeButton />
        </div>
        <div className="wrap">
          <nav className="nav" aria-label="Main">
            {NAV.map(([p, l, k], i) => (
              <a key={p} href={href(p)} aria-current={section === k ? "page" : undefined}>
                {i >= 1 && i <= 4 && <span className="num">{i}</span>}{l}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div className="status" role="status">
        <div className="wrap">
          {man ? <span>Data updated <b>{dateTime(man.generated_at)}</b> <span className="muted">({ago(man.generated_at)})</span></span> : <span className="muted">Loading the latest data…</span>}
          {src && <a href={href("/about")} style={{ color: "inherit" }}><span className={`dot ${bad.length ? "stale" : "ok"}`} />{bad.length ? `${src.length - bad.length} of ${src.length} data sources working` : `All ${src.length} data sources working`}</a>}
          <span className="muted">A research tool, not an official warning service.</span>
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
          <p><b>About this site.</b> The Canada Food System Observatory brings together public data on Canada's food supply for research and planning. It is not a Government of Canada service and does not issue official warnings. Official data can arrive late or be revised. The what-if tests are simple illustrations, not forecasts.</p>
          <p>Developed at the Arrell Food Institute, University of Guelph. It builds on the <a href="https://bdzion.github.io/canada-food-stress-test/">Canada Food System Stress Test</a>. Questions and corrections: <a href="mailto:mbodrudd@uoguelph.ca">mbodrudd@uoguelph.ca</a>.</p>
        </div>
        <div>
          <p><b>The site</b><br />
            {NAV.map(([p, l]) => <span key={p}><a href={href(p)}>{l}</a><br /></span>)}</p>
        </div>
        <div>
          <p><b>Get the data</b><br />
            <a href={`${import.meta.env.BASE_URL}data/feed.xml`}>Weekly brief by RSS</a><br />
            <a href={href("/about")}>Sources and methods</a><br />
            <a href="https://github.com/bdzion/canada-food-system-observatory">Code and full data history</a></p>
          {man && <p className="small">Data update <span className="kbd">{man.release_id}</span></p>}
        </div>
      </div>
    </footer>
  );
}
