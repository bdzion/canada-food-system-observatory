# Canada Food System Observatory

**Shocks are inevitable. Crises are not. Watch the buffers.**

A research prototype that follows what is hitting Canada's food system, what is absorbing it, and who would feel it. It reads official Canadian and global data automatically, runs two checks on every reading, and traces how far a shock has travelled along each of seven chains of knock-on effects, from the first pressure outside Canada to the moment it reaches a shop shelf.

**Live site:** https://bdzion.github.io/canada-food-system-observatory/

Developed at the Arrell Food Institute (AFI), University of Guelph, as the evidence layer for the [Canada Food System Stress Test](https://github.com/bdzion/canada-food-stress-test).

> **Research prototype.** Not a Government of Canada monitoring service or an official alerting system. Source data may be delayed or revised. Stress-test results are illustrative, not forecasts.

## What the site does

The site is written for readers who are new to the topic, such as policy staff. It opens with a plain overview and then walks through four steps:

| Step | Question it answers |
|---|---|
| **Overview** | What is this site, and what do this week's figures say? Ongoing disruptions (such as the Strait of Hormuz closure) with a live data check, the food chain at a glance, four key facts, a plain-language summary of the latest data, a live weather-alert map, new government notices, and a look-back to any earlier day. |
| **1. The system** | How does food move through Canada, and where can it get stuck? A clickable map of the chain from farm supplies to grocery stores, showing the weak points, threats and live figures for each link. |
| **2. The indicators** | How exposed is each link, and what do the latest figures show? Published facts on where Canada has little backup, plus official figures (grain in storage, on farms and shipped, rail freight, port cargo, ships through four sea lanes, food processors' stock, world fertilizer, food and energy prices, diesel, farm input prices, the exchange rate, wholesale and store food prices, grocery prices by province and against wages, food insecurity, Prairie and US drought, strikes and lockouts, food recalls, weather warnings). Each figure answers four questions, and carries two screening checks and the age of its data. |
| **3. The threats** | What could go wrong, and is anything happening now? Ongoing disruptions written up from published sources, the threat register with the research team's ratings, current warnings and notices, disasters abroad checked against Canada's suppliers, and seven what-if tests of acting early — each with a live reading of how far a shock has travelled along its chain. |
| **4. Possible timelines** | How could a bad year unfold, and when is there still time to act? Four month-by-month timelines, a calculator for what a bad year could cost, and a three-minute decision game. |
| **Weekly brief** | A one-page summary written every Monday, never changed afterwards, with an RSS feed. |
| **About the data** | Every source and whether it is working, how each figure is worked out, the labels used, the limits, and a corrections log. |

## Data sources

| ID | Source | Use |
|---|---|---|
| CA-01 | ECCC MSC GeoMet, weather alerts | Alerts in effect (also checked live in the browser) |
| CA-03 | AAFC InfoHort daily wholesale prices (and archives since 2018) | Produce prices compared with earlier years |
| CA-04 | Statistics Canada WDS: CPI 18-10-0004-01, LFS wages 14-10-0063-01 | Inflation adjustment; food prices compared with wages |
| CA-05 | Canadian Grain Commission, Grain Statistics Weekly | Commercial grain stocks and terminal exports |
| CA-06 | Recalls and Safety Alerts open data (CFIA records) | Food recalls |
| CA-07 | Government of Canada News Centre (AAFC, CFIA, Public Safety) | Official announcements |
| GL-01 | UN Comtrade public API | Where Canada's imports come from |
| GL-02 | GDACS event API | Orange and red global hazard alerts |
| CA-08 | Statistics Canada WDS: 18-10-0001, 18-10-0245, 18-10-0258, 23-10-0216, 18-10-0004 (provinces), 13-10-0835, 14-10-0350 | Diesel, store prices, farm input prices, rail freight, provincial grocery prices, food insecurity, strikes and lockouts |
| CA-09 | AAFC Canadian Drought Monitor (monthly GeoJSON) | Share of Prairie farmland in drought; drought map |
| CA-10 | Bank of Canada Valet API | US dollar and Mexican peso exchange rates |
| GL-03 | IMF PortWatch (ArcGIS feature services) | Ships through Hormuz, Suez, Bab el-Mandeb and Panama; cargo at five Canadian ports |
| GL-04 | World Bank commodity prices (Pink Sheet) | World fertilizer, food and energy prices |
| GL-05 | US Drought Monitor web service | Drought in California, Arizona, Florida and Washington |
| GL-06 | US National Weather Service alerts API | Crop- and road-relevant alerts in those four states |
| CA-11 | Statistics Canada WDS: 32-10-0013 | Grain stocks including grain held on farms, three times a year |
| CA-12 | Statistics Canada WDS: 16-10-0047 | Stock held by food processors against what they ship, monthly |

Ongoing disruptions that no feed names (for example the closure of the Strait of Hormuz since 28 February 2026) are kept in `pipeline/ongoing.yml`: a short summary written by the team from cited sources, a last-reviewed date, and a link to the live indicator that shows whether the disruption is still visible in the data. The site flags an entry whose review is overdue.

Full details, licences and refresh rules: [`pipeline/sources.yml`](pipeline/sources.yml). Analytical settings (product basket, comparison years, screening checks and thresholds): [`pipeline/config.yml`](pipeline/config.yml).

**Known gap.** There is no live animal-disease feed. The CFIA's *Federally Reportable Diseases for Terrestrial Animals in Canada* is published as CSV under the Open Government Licence but ends in 2021, so it cannot support a current indicator. CFIA announcements reach the site through CA-07 with headline, date and link only. The avian influenza chain therefore begins at an unwatched stage, and says so.

## How it works

```
official APIs ──► pipeline/ (Python, 4× a day in GitHub Actions)
                    connectors → checks → indicators, events, links → summary, brief, feed, archive
                    keeps the last good data if a source fails; publishes only a release that validates
                ──► `data` branch (every release kept)
                ──► site (Vite + React + TypeScript) reads the release as static JSON ──► GitHub Pages
```

Rules the code enforces: missing values stay missing (never zero); every value keeps its own data period; prices are compared in today's dollars; a hazard abroad plus historical imports is a supplier link, never evidence of an effect; a figure older than its source's normal rhythm says so on its own card, in the weekly brief and in every archived day.

### Two screening checks, and a ladder

Every reading gets two checks, and the site reports them separately rather than adding them together.

- **The level check** — is the reading outside the full range of the same period in the past five years? This is the original rule, unchanged in code.
- **The pace check** — is it moving faster than it usually moves at this time of year? Growth over the last quarter and the last year is standardised against the same periods in earlier years, following the method behind UN SDG indicator 2.c.1, the FAO [Indicator of Food Price Anomalies](https://unstats.un.org/sdgs/metadata/files/Metadata-02-0C-01.pdf), with its published weight and thresholds.

The level check alone cannot do the job. If nothing has changed, a reading has a one-in-three chance of being the highest or lowest of six comparable values by luck, and a one-in-two chance with the three-year minimum. Measured over this site's own stored history it fired on 44% of all periods, and on *every* testable quarter of the farm input price index, which climbs year after year. So a reading is called out only when both checks agree, or when only one of them is meaningful for that figure and it fires. Which checks apply to which figure, and why, is set in [`pipeline/config.yml`](pipeline/config.yml) under `screening.frames`.

### Chains of knock-on effects

[`pipeline/transmission.yml`](pipeline/transmission.yml) writes out, for each what-if test, the links a shock would pass through and the published figures that would show it passing. [`pipeline/cfso/transmission.py`](pipeline/cfso/transmission.py) evaluates them into `transmission.json`. Three properties, taken from the European Drought Observatory's Combined Drought Indicator:

- **Contiguity.** A stage counts only if every stage before it counts. A reading at the far end on its own is not evidence that anything travelled, and the site says so when it happens.
- **An unwatched link stops the chain.** Where there is no figure for a link — animal disease, cyber incidents, plant absence — the chain stops there rather than passing through, because a gap in the data must never become a finding.
- **Memory.** A stage depends on the readings now and on where the chain stood at the previous release, with explicit easing states, so a disruption reads as one continuous thing.

Every threshold in that file is the research team's judgement and is labelled as such on screen. The chains do not feed the what-if models, whose settings the reader chooses; and there is no forecast layer, because there is no skill score to gate one on.

The stress-test models in `src/legacy/core.js` are generated from the Stress Test's `index.html` at a pinned commit (`reference/LEGACY_SHA`). `tests/legacy-regression.test.ts` runs both versions side by side and fails if any result differs.

## Run it locally

```bash
# data pipeline (Python 3.11+)
cd pipeline
pip install -r requirements.txt
python -m pytest -q
python -m cfso.run --data ../public/data      # fetches from the official APIs
python -m cfso.run --data ../public/data --offline   # rebuilds from the stored extracts
python -m cfso.run --data ../public/data --only CA-11,CA-12   # refresh named sources only

# website (Node 22)
cd ..
npm ci
npm test          # model regression tests
npm run dev       # http://localhost:5173/canada-food-system-observatory/

# every page in a headless browser at 1280 px and 390 px: console errors,
# horizontal overflow, and axe-core against WCAG 2.1 AA. Saves screenshots.
npm run build
python3 scripts/check-pages.py
```

## Repository layout

```
pipeline/            Python data pipeline (connectors, indicators, screening, chains, briefs)
  sources.yml        every source with its licence, update rhythm and staleness limit
  config.yml         analytical settings, including which screening checks apply to each figure
  transmission.yml   the chains of knock-on effects, and the figures watched at each link
  readings.yml       the team's written answers to three of the four questions, per figure
  ongoing.yml        disruptions no feed names, written up from cited sources
src/                 Website (React + TypeScript); src/legacy holds the migrated stress-test models
reference/           Pinned copy of the original Stress Test page used for regression tests
scripts/             Extracts the legacy models into src/legacy; checks every page in a browser
docs/                Audit, benchmarking, redesign plan and log, screenshots
.github/workflows/   Tests; scheduled refresh and deployment
```

## Feedback

Comments and corrections: mbodrudd@uoguelph.ca. Corrections to published briefs are listed on the Methods page.

## Contact

Arrell Food Institute, University of Guelph
