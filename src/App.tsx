import { useEffect } from "react";
import { Footer, Header } from "./components/Layout";
import { useRoute } from "./lib/router";
import Events from "./pages/Events";
import Exposure from "./pages/Exposure";
import Game from "./pages/Game";
import { BriefDetail, BriefList } from "./pages/Briefs";
import { IndicatorDetail, IndicatorList } from "./pages/Indicators";
import { CompoundYear, LabHome, Register, Scenario } from "./pages/Lab";
import Methods from "./pages/Methods";
import SituationRoom from "./pages/SituationRoom";

const TITLES: Record<string, string> = { "": "Situation Room", indicators: "Indicators", events: "Events", exposure: "Global links", lab: "Stress Test Lab", briefs: "Briefs", methods: "Methods and sources" };

export default function App() {
  const { path, query } = useRoute();
  const [sec, sub] = path;
  useEffect(() => { document.title = `${TITLES[sec || ""] || "Page"} · Canada Food System Observatory`; }, [sec]);
  let page;
  switch (sec) {
    case undefined: page = <SituationRoom day={query.get("day") || undefined} />; break;
    case "indicators": page = sub ? <IndicatorDetail id={sub} product={query.get("product") || undefined} /> : <IndicatorList />; break;
    case "events": page = <Events key={query.toString()} query={query} />; break;
    case "exposure": page = <Exposure />; break;
    case "lab":
      page = !sub ? <LabHome /> : sub === "year" ? <CompoundYear /> : sub === "game" ? <Game /> : sub === "register" ? <Register /> : <Scenario key={sub} k={sub} />;
      break;
    case "briefs": page = sub ? <BriefDetail id={sub} /> : <BriefList />; break;
    case "methods": page = <Methods />; break;
    default: page = <p>Page not found. <a href="#/">Go to the Situation Room</a>.</p>;
  }
  return (
    <>
      <Header section={sec || ""} />
      <main id="main" className="wrap" tabIndex={-1}>{page}</main>
      <Footer />
    </>
  );
}
