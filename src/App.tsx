import { useEffect } from "react";
import { Footer, Header } from "./components/Layout";
import { useRoute } from "./lib/router";
import About from "./pages/About";
import { BriefDetail, BriefList } from "./pages/Briefs";
import Events from "./pages/Events";
import Exposure from "./pages/Exposure";
import Game from "./pages/Game";
import { IndicatorDetail, IndicatorList } from "./pages/Indicators";
import Overview from "./pages/Overview";
import System from "./pages/System";
import { TestPage, ThreatsHub } from "./pages/Threats";
import Ongoing from "./pages/Ongoing";
import { BadYear, TimelinesPage } from "./pages/Timelines";

const TITLES: Record<string, string> = {
  "": "Overview", system: "The system", indicators: "The indicators", threats: "The threats",
  timelines: "Possible timelines", briefs: "Weekly brief", about: "About the data",
};
// Addresses used by the first version of the site, kept working.
const OLD: Record<string, string> = { events: "/threats/warnings", exposure: "/threats/abroad", methods: "/about" };

export default function App() {
  const { path, query } = useRoute();
  const [sec, sub] = path;
  useEffect(() => { document.title = `${TITLES[sec || ""] || "Page"} · Canada Food System Observatory`; }, [sec]);
  if (sec === "lab") {
    const to = !sub ? "/threats" : sub === "year" ? "/timelines/bad-year" : sub === "game" ? "/timelines/game" : sub === "register" ? "/threats" : `/threats/${sub}`;
    location.replace("#" + to); return null;
  }
  if (sec && OLD[sec]) { location.replace("#" + OLD[sec] + (query.toString() ? "?" + query : "")); return null; }
  let page;
  switch (sec) {
    case undefined: page = <Overview day={query.get("day") || undefined} />; break;
    case "system": page = <System key={query.get("node") || ""} node={query.get("node") || undefined} />; break;
    case "indicators": page = sub ? <IndicatorDetail id={sub} product={query.get("product") || undefined} /> : <IndicatorList />; break;
    case "threats":
      page = !sub ? <ThreatsHub /> : sub === "warnings" ? <Events key={query.toString()} query={query} /> : sub === "abroad" ? <Exposure /> : sub === "ongoing" ? <Ongoing /> : <TestPage key={sub} k={sub} />;
      break;
    case "timelines":
      page = !sub ? <TimelinesPage /> : sub === "bad-year" ? <BadYear key={query.toString()} story={query.get("story") || undefined} /> : sub === "game" ? <Game /> : <p>Page not found.</p>;
      break;
    case "briefs": page = sub ? <BriefDetail id={sub} /> : <BriefList />; break;
    case "about": page = <About />; break;
    default: page = <p>Page not found. <a href="#/">Go to the overview</a>.</p>;
  }
  return (
    <>
      <Header section={sec || ""} />
      <main id="main" className="wrap" tabIndex={-1}>{page}</main>
      <Footer />
    </>
  );
}
