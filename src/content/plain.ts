/* Plain-language text and the links between the four steps of the site.
 * Model equations and the original register live, unchanged, in src/legacy. */

export const STEPS = [
  { n: 1, path: "/system", title: "The system", q: "How does food move through Canada, and where can it get stuck?",
    blurb: "A simple map of the chain from farm supplies to grocery stores, with the weak points marked." },
  { n: 2, path: "/indicators", title: "The indicators", q: "How exposed is each link, and what do the latest figures show?",
    blurb: "Twelve facts that show where Canada has little backup, and official data updated automatically." },
  { n: 3, path: "/threats", title: "The threats", q: "What could go wrong, and is anything happening now?",
    blurb: "Eighteen threats, current warnings at home and abroad, and seven tests of what acting early could save." },
  { n: 4, path: "/timelines", title: "Possible timelines", q: "How could a bad year unfold, and when is there still time to act?",
    blurb: "Four month-by-month stories of threats arriving together, and what a bad year could cost." },
];

/* Where each live data series sits in the system map. */
export const LIVE_NODE: Record<string, string> = {
  weather_alerts: "farms", grain_stocks: "transport", grain_exports: "exports",
  produce_prices: "imports", food_affordability: "stores", food_recalls: "processing",
};
/* Register paths (from the original stress-test site) mapped to system-map nodes. */
export const PATH_TO_NODE: Record<string, string> = {
  inputs: "inputs", prod: "farms", logistics: "transport", labour: "processing",
  exports: "exports", imports: "imports", digital: "stores",
};

/* Short titles for the seven tests, written as the question a reader would ask. */
export const TEST_TITLE: Record<string, string> = {
  rail: "The main rail line to Vancouver closes",
  phosphate: "Fertilizer imports are cut before seeding",
  drought: "A severe drought hits the Prairies",
  "avian-flu": "Bird flu reaches a major poultry region",
  export: "A major buyer closes its market",
  cyber: "A cyberattack takes a grocery distributor offline",
  workforce: "Illness spreads through meat-plant workers",
};

/* Live indicators that bear on each test, shown beside it. */
export const TEST_LIVE: Record<string, { ind?: string[]; text: string; link?: string; label?: string }> = {
  rail: { ind: ["grain_exports", "grain_stocks"], text: "How much grain is moving through the ports, and how much is in storage." },
  drought: { ind: ["weather_alerts"], text: "Weather warnings in effect now. Drought itself is mapped monthly by Agriculture and Agri-Food Canada's Canadian Drought Monitor, which we have not yet connected." },
  phosphate: { text: "Where Canada's fertilizer imports come from, and whether a disaster abroad has hit a supplier.", link: "/threats/abroad", label: "See disasters abroad" },
  "avian-flu": { text: "Announcements from the Canadian Food Inspection Agency appear with the current warnings. Its outbreak counts are not yet connected.", link: "/threats/warnings", label: "See current warnings" },
  export: { text: "Government trade announcements appear with the current warnings.", link: "/threats/warnings", label: "See current warnings" },
  cyber: { text: "We do not yet have a live data source for this threat. Public cyber advisories rarely confirm an outage at a food business." },
  workforce: { text: "We do not yet have a live data source for this threat." },
};

/* Plain names for the six threat groups in the register. */
export const GROUP_PLAIN: Record<string, string> = {
  climate: "Weather and climate", health: "Plant and animal disease", trade: "Trade and conflict",
  inputs: "Fertilizer, fuel and other farm supplies", logistics: "Transport and computer systems", people: "Workers and public health",
};
export const ORIGIN_PLAIN: Record<string, string> = { inside: "Starts in Canada", outside: "Starts abroad", both: "Can start in Canada or abroad" };
