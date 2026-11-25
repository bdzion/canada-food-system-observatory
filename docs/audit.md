# Audit of the Canada Food System Observatory

Audited on 24 November 2026 against commit `4405b12` (branch `main`) and data
release `20261124T1342Z`. The audit covers content, methods, data handling,
charts, accessibility, performance and code quality.

Severity means: **high** — a reader could be misled, or a stated promise of the
site is not kept; **medium** — the site is weaker or more fragile than it should
be, but nothing is wrong on the page; **low** — tidying.

Each issue has an ID used in `docs/redesign-plan.md` and in the commit messages.

## Summary

The project is in good shape for a prototype. The pipeline is careful in the
ways that matter most: missing values stay missing, every value carries its own
observation period, prices are deflated before comparison, releases are
validated and swapped atomically, and a failed source falls back to the last
good extract. The writing is plain and the evidence labels are used
consistently. Tests, type checking and the build all pass, and no page has a
console error or horizontal overflow at 1280 px or 390 px.

Three things are seriously wrong, and they are the three that bear most on
whether a decision-maker can act on the site.

1. **The "unusual for the time of year" rule is loose, not strict, and the site
   says the opposite** (A1). Its own false-positive rate is 33% at five
   comparison years and 50% at the three-year minimum. On the site's own
   history it fires on 44% of all periods, and on 13 of 20 indicators today.
2. **Nothing connects the live indicators to the what-if tests** (B1). The
   tests' Watch / Get ready / Act now signals are fixed model days. The site
   tells the reader in as many words that "the test does not use these figures."
3. **A reading can be months out of date without the indicator saying so**
   (C1). The grain feed stopped publishing on 4 October 2026, 51 days before
   this audit, and the indicator still reads as a plain statement of fact.

Everything else is smaller. Full list below.

---

## A. Methods and analysis

### A1. The screening rule is loose, and the site describes it as strict — high

**Where:** `pipeline/cfso/core.py:129` (`reference_state`), `pipeline/config.yml:4`
(`baseline.years: 5`, `min_years: 3`), `src/pages/About.tsx:87`,
`src/pages/Indicators.tsx:94`.

A reading is flagged when it falls outside the full range (minimum to maximum)
of the same period in the past five years. The About page says: "The rule is
deliberately strict and simple."

The first half of that is false, and provably so. If the new reading and the
*n* reference readings are exchangeable — that is, if nothing has changed — the
probability that the new one is the largest or smallest of the *n* + 1 values
is exactly 2/(*n* + 1), because every ordering is equally likely. So:

| Comparison years | Nominal chance of flagging when nothing has changed |
|---|---|
| 3 (the configured minimum) | 50% |
| 5 (the configured target) | 33% |
| 15 | 12.5% |
| 25 | 7.7% |

A min-max rule over a small sample is one of the *loosest* screens available,
not one of the strictest. Making the comparison window longer is the only way
to tighten it without changing the statistic, and the site does not have the
history: most series begin in 2019.

Measured on the site's own stored series, applying the rule at every historical
period of each indicator's main series:

| Indicator (main series) | Periods tested | Flagged | Share |
|---|---|---|---|
| Farm input prices (all inputs) | 18 | 18 | **100%** |
| Store prices (milk) | 45 | 43 | 96% |
| Prairie drought (Saskatchewan) | 10 | 8 | 80% |
| Work stoppages (all industries) | 57 | 36 | 63% |
| Exchange rate (USD/CAD) | 59 | 32 | 54% |
| Rail freight (grain and canola) | 56 | 24 | 43% |
| Diesel (five-city average) | 58 | 21 | 36% |
| World food prices | 58 | 14 | 24% |
| World fertilizer prices | 58 | 10 | 17% |
| US drought (California) | 53 | 0 | 0% |
| **All series pooled** | **478** | **210** | **44%** |

The farm input price index flags in *every* quarter it can be tested in, because
it rises steadily: each new quarter is a new five-year high, which is the
expected state of a trending index, not an unusual one. The same mechanism
drives the store-price and exchange-rate numbers.

Why it matters: 13 of the 20 indicators in the current release are flagged
"Unusual for the time of year". A reader told that two-thirds of the
observatory is unusual learns nothing from the label, and the genuinely
informative cases — the sea lanes, Prairie drought — are buried among the
price series that are unusual every month by construction. A screen that fires
half the time is not a screen.

What a trend-removed screen does instead, on the same history: comparing the
*year-on-year change* with the range of same-period year-on-year changes in the
past five years (year-on-year differencing removes both a steady trend and the
annual season) cuts the pooled rate from 48% to 23%, and takes farm inputs from
100% to 0%. It is not a universal replacement: on bounded share series such as
drought extent it fires *more* (US drought 0% → 83%), because the share itself
swings. The choice of frame has to be made per indicator and recorded, not
applied blindly.

### A2. Trigger levels and transmission are missing entirely — high

**Where:** `src/legacy/core.js` (every `signals:` function), `src/pages/Threats.tsx:145`
and `:104`, `src/content/plain.ts:45` (`TEST_LIVE`).

Each what-if test defines its three warning signs as fixed offsets in model
time — `rail` is Watch on day 0, Get ready on day 3, Act now on day 13 — with
no reference to any live reading. The live indicators appear beside the test in
a panel whose own text says: "**The test does not use these figures.** You set
its assumptions yourself."

So the site can tell a reader that acting at "get ready" saves 32% of the cost,
and separately that sea-lane transits are below every one of the past five
years, and never joins the two. There is no statement of what reading, at what
level, would mean the Prairie rail scenario has reached "get ready" now. This
is the central gap: the observatory watches, and it illustrates, but it does not
connect watching to acting.

Related: there is no representation at all of how a shock passes from one link
of the chain to the next. `s.path` in the legacy models holds four static
strings ("What happens", "Weak point", "What absorbs it", "Who feels it") with
no lags, no attenuation and no indicators attached to the links.

### A3. The five-year reference window is applied to series that do not have five years — medium

**Where:** `pipeline/cfso/panels.py:21` (`YEARS = 5`), `pipeline/config.yml:300`
(`cdm.first_year: 2023`).

The Canadian Drought Monitor GeoJSON archive begins in 2023, so Prairie drought
has at most three comparison years and often fewer. The code correctly reports
`n_years`, and `prairie_drought`'s text falls back to "The monitor's online maps
start in 2023, so we cannot yet say whether this is unusual" — but only when the
worst province has insufficient data. When three years happen to be available
the indicator is flagged on a 3-year comparison, whose false-positive rate is
50% (A1). The back-test above shows Saskatchewan flagged in 8 of 10 testable
months.

### A4. Prairie drought shares use rectangles, not farmland — medium

**Where:** `pipeline/config.yml:302` (`cdm.zones`), `pipeline/cfso/connectors/cdm.py`.

Known and documented: the three provincial shares are measured over straight-
line boxes south of 54° N, which include forest, lakes and towns. The
`does_not_show` text says so. It remains a real limit on the one indicator that
speaks most directly to the drought scenario, and a census-agricultural-region
or AAFC cropland mask would fix it with data that are already open.

### A5. Diesel is a five-city mean presented as a national figure — medium

**Where:** `pipeline/config.yml:190`, `pipeline/cfso/panels.py:352`.

Statistics Canada publishes no national diesel average, so the site averages
Montréal, Toronto, Regina, Calgary and Vancouver with equal weight. Equal
weighting is not population weighting or volume weighting, and the five cities
are not where most farm diesel is bought. The definition explains the choice;
the headline sentence calls it "across five cities", which is honest. Low risk
of misreading, but the weighting is an undocumented analytical choice.

### A6. Supplier links rest on trade data that are 328 days old — medium

**Where:** `pipeline/cfso/exposure.py`, `pipeline/sources.yml:103` (GL-01,
`stale_after_days: 760`).

The Canada-relevance filter uses UN Comtrade annual import shares; the current
release's newest year is 2025 (observation end 2025-12-31). A 760-day staleness
threshold means the site will not mark this source late for over two years. For
a structural share that is defensible, but a reader is not told on the
`/threats/abroad` page how old the shares are, only the year in the sentence.

### A7. No animal-disease feed — medium

**Where:** `src/content/plain.ts:49`, `pipeline/sources.yml`.

The avian influenza what-if test has no live data at all: `TEST_LIVE["avian-flu"]`
says so plainly. Of the eighteen threats, the animal-disease group is the one
with the fewest live figures behind it, and avian influenza is among the most
likely shocks to actually arrive.

### A8. The "unusual" count mixes indicators with very different update speeds — low

**Where:** `src/pages/Indicators.tsx:41`, `pipeline/cfso/narrative.py:212`
(`counts.unusual`).

`13 of 20 are unusual` counts a weekly sea-lane figure, a monthly price index
and an annual food-insecurity series as equal. The count is prominent on the
indicators page and in `situation.json`.

---

## B. Connecting what is watched to what could happen

### B1. See A2 — the one change with the most value to a decision-maker. — high

### B2. Readings answer two of the four questions, not four — high

**Where:** `pipeline/cfso/indicators.py`, `pipeline/cfso/panels.py`, every
indicator dict.

Each indicator carries `question`, `definition`, `how_calculated`,
`does_not_show` and a headline sentence. Between them they answer **what is
happening** and, in part, **what this does not show**. Nothing answers:

- *why it matters for Canada* — there is no field for the consequence, only the
  measurement;
- *what could happen next* — no field at all;
- *what decision-makers could consider* — exists only inside the what-if tests
  (`s.playbook`), never on an indicator.

The `scenario` field is the only link from an indicator to anything
forward-looking, and it is a bare string pointing at one test.

### B3. The ongoing-disruption live check is hard-wired to one indicator — medium

**Where:** `pipeline/cfso/ongoing.py:29`, `src/pages/Ongoing.tsx:41` and `:42`.

Three things are hard-coded to the Hormuz entry and would be wrong for any
second disruption:

- the live sentence is built as `"about {value} ships a day"`, whatever the
  indicator's unit is;
- `state` is `still_showing` if and only if `direction == "below"`, so a
  disruption that *raises* a reading would be reported as not showing;
- the page's caption always reads "Estimated from ships' tracking signals by
  the International Monetary Fund's PortWatch", and the chart always opens on
  `chokepoint6`.

### B4. The threat register's warning levels are frozen at a check date — medium

**Where:** `src/legacy/core.js` (`REG`, `SIG`, `CHECKED = "12 November 2026"`),
`src/pages/Threats.tsx:86`.

Eighteen threats each carry a warning level from Normal to Act now, labelled as
the team's reading at 12 November 2026 and correctly marked as not live. As the
check date recedes, a page showing "Warning level: Watch" beside live figures
invites the reader to treat it as current. The label is honest; the adjacency is
not helpful.

---

## C. Data handling and honesty about gaps

### C1. A stale reading is presented as a plain fact on the indicator itself — high

**Where:** `pipeline/cfso/build.py:70` (`source_health`), `pipeline/cfso/narrative.py:69`
(`note`), `pipeline/cfso/indicators.py:109`, `src/components/IndicatorCard.tsx`.

Staleness is computed and published in `sources.json`, and the *situation*
headline appends "These are the latest figures published; the source has not
updated as expected since." But the indicator's own `headline.text` — the
sentence shown on the card, on the indicator page, in the weekly brief and in
the daily archive — says only:

> Grain elevators and port terminals held 7.2 million tonnes of grain in the
> week ending 4 October 2026.

In the audited release the Canadian Grain Commission feed has not published
since 4 October, 51 days earlier, against a 21-day staleness threshold. The
grain-in-storage indicator is one of two that speak to the rail scenario. A
reader who meets that sentence on the indicator page, in the brief or in an
archived day gets the date but no statement that the source has stopped.

The brief for this work says plainly: when a source fails, "say plainly that it
is late". The pipeline knows; the indicator does not carry it.

### C2. PortWatch failed on a transient error and stayed down — high

**Where:** `pipeline/cfso/connectors/portwatch.py:17` (`_query`),
`pipeline/cfso/core.py:65` (`fetch`).

In the audited release GL-03 is in the `error` state with
`SourceError: PortWatch error: Invalid URL`. I reproduced the connector's exact
queries against the live ArcGIS service: both the chokepoints and the ports
query return data normally, paging cleanly to 11,532 rows. The error was
transient on the provider's side.

The connector cannot survive one. ArcGIS returns HTTP 200 with an error object
in the body, so `core.fetch`'s retry logic never sees a failure; `_query` raises
on the first error object and the whole source is abandoned until the next
scheduled run. Because this is the source behind both `sea_lanes` and `ports`,
and because the Hormuz ongoing disruption's live check reads `sea_lanes`, one
transient provider hiccup takes out the live check on the site's only ongoing
disruption, plus two of the four flow indicators.

### C3. The front end and the source registry disagree about when data are late — medium

**Where:** `src/components/Spark.tsx:28` (`EXPECT`), `pipeline/sources.yml`
(`stale_after_days` per source).

The pipeline decides lateness per source from the registry: 21 days for the
grain feed, 70 for the CPI, 14 for PortWatch. The `Age` component decides it
again in the browser from a hardcoded table keyed on *frequency*: weekly 21,
monthly 120, quarterly 280. The two can disagree — a monthly source with
`stale_after_days: 70` is late by the registry at 71 days and not late in the
browser until 120 — and the same reading can therefore be marked late on the
About page and not on its own card.

### C4. Only the latest run of each day is archived, and the index can lose days — low

**Where:** `pipeline/cfso/build.py:341`.

The archive writes `archive/{day}.json` on every run, so the last of the four
daily runs wins. That is documented behaviour ("latest run of the day wins").
Worth noting only because the day file is what the "see an earlier day" control
reads, so an intra-day state change is not recoverable.

### C5. A builder failure produces an indicator with no title or question — low

**Where:** `pipeline/cfso/build.py:107` (`add`).

On an exception the fallback indicator is `{"id": ind_id, "title":
ind_id.replace("_"," ").capitalize(), "role": "unknown", ...}`. It has no
`question`, `definition`, `how_calculated` or `does_not_show`, so the About
page's "How each figure is worked out" section renders a stub with four empty
paragraphs, and `role: "unknown"` falls outside the `ORDER` array in
`Indicators.tsx:16`, so the card is dropped from the list entirely while still
being counted in `inds.length`.

### C6. `_round_geo` rounds to about 100 m and the About page does not say so — low

**Where:** `pipeline/cfso/build.py:248`.

Drought polygons are rounded to three decimal places to keep the map light.
Sensible; undocumented on the methods page.

---

## D. Accessibility (WCAG 2.1 AA)

Checked with axe-core 4.10 against the WCAG 2.0/2.1 A and AA rule sets, on
every page, at 1280 × 900 and 390 × 844. Script: `scripts/check-pages.py`.
Results: no console errors, no page exceptions, no failed requests and **no
horizontal overflow** on any page at either width. Two contrast failures and
one structural gap.

### D1. No table alternative for the what-if test charts — high

**Where:** `src/components/LineChart.tsx` (used by `src/pages/Threats.tsx:192`
and `:206`, and `src/pages/Game.tsx`).

`IndicatorChart` has a "Show as a table" toggle and a CSV download, and the
provincial bar chart uses `role="table"`. `LineChart` has neither: it is an
`<svg role="img">` with a one-line `aria-label` such as "Agri-food freight
moving (% of normal) over time". The numbers behind the three lines, the warning
signs and the cost-by-start-day curve are not available in any text form. These
are the charts that carry the site's central argument about acting early, and
they are the ones a screen-reader user cannot read. The definition of done for
this work requires a table view for every chart.

### D2. Ghost button fails contrast on tinted panels — medium

**Where:** `src/styles.css:158` (`.btn.ghost`), rendered inside `.guess` on
every what-if test page.

Measured 3.95:1 — foreground `#2a6fb8` on background `#dce2e7`, 16 px bold.
AA requires 4.5:1 for text below 18.66 px bold. Affects "Skip and show the
results" on all seven test pages, at both widths.

### D3. Muted text inside a pressed chip fails contrast badly — medium

**Where:** `src/styles.css:191` (`.chip`), `:192` (`.chip[aria-pressed="true"]`),
with a `.muted` child; seen on `/threats/warnings` at 390 px.

Measured 2.28:1 — `#586174` on `#1b2a4a`. The pressed chip sets
`color: var(--bg)` on itself but a nested `.muted` span re-asserts
`color: var(--muted)`, which was chosen against the light page background, not
against the dark pressed state.

### D4. `aria-expanded` without `aria-controls` — low

**Where:** `src/pages/Threats.tsx:79`, `src/pages/Indicators.tsx:50`.

The "How we rated it" and "Show as one table" buttons set `aria-expanded` but
the region they reveal is an unlabelled sibling with no `id`, so a screen reader
announces the state without being able to reach the controlled region directly.

### D5. Dark-mode contrast is unverified — low

The stylesheet ships a full dark palette (`src/styles.css:30` and `:37`) and the
automated check only ran in the default light scheme, because `reduced_motion`
was set but `color_scheme` was not. No dark-mode contrast figure in this audit
is therefore trustworthy.

---

## E. Code quality, tests and build

### E1. `package.json` points at a script that does not exist — low

**Where:** `package.json:12` — `"seed-data": "node scripts/seed-data.mjs"`.
`scripts/` contains only `extract-legacy.mjs` and `make-world-paths.py`. Anyone
following the README's local-development path and reaching for `npm run
seed-data` gets a module-not-found error.

### E2. Test coverage is thin where the risk is highest — medium

**Where:** `pipeline/tests/test_rules.py` (14 tests), `tests/legacy-regression.test.ts`
(11 tests).

The 14 pipeline tests cover `reference_state`, percentage change, crop-year
labelling, the CGC parser and a few narrative rules. There is **no test for any
connector's parsing of a real payload** — not one fixture — so a provider
changing a column name is caught only in production, by the staleness flag. The
legacy regression suite is good and does exactly what it claims: it runs both
copies of the models side by side and fails on any divergence.

### E3. Hardcoded counts in prose will drift from the data — low

**Where:** `README.md:21` ("twenty sets of official figures"), `:22`
("eighteen threats"), `src/content/plain.ts:8` ("Twelve facts… twenty sets"),
`src/pages/Threats.tsx:29` ("the eighteen threats"), `:64` ("All eighteen
threats"), `src/pages/Indicators.tsx:48` ("Twelve weak points").

All six numbers are correct today (20 indicators, 18 register entries, 12 weak
points, 7 modelled tests). All six are prose constants beside data that will
change. `Indicators.tsx:83` already derives its count from the data; the rest
do not.

### E4. Fragile string surgery to derive a theme label — low

**Where:** `pipeline/cfso/narrative.py:81`.

`d["title"].split(" is ")[0].replace("The ", "")` turns "The Strait of Hormuz is
largely closed to shipping" into "Strait of Hormuz". Any ongoing entry whose
title lacks " is " yields the whole title as the theme.

### E5. One 493 kB JavaScript bundle, no code splitting — low

**Where:** build output; `vite.config.ts`.

492.56 kB raw, 153.66 kB gzipped, in a single chunk, including Leaflet and the
legacy models on every page. Acceptable for this audience and not worth a
rewrite, but the maps and the what-if models are each used on a minority of
pages and are natural dynamic imports.

### E6. The `--only` flag silently accepts unknown source IDs — low

**Where:** `pipeline/cfso/run.py:23`, `pipeline/cfso/build.py:36`.

`--only CA-99` refreshes nothing and exits 0 with a normal-looking manifest,
because `only` is only ever tested with `sid not in only`. A typo in the
workflow's manual input would look like a successful run.

---

## F. Content and plain language

### F1. "The rule is deliberately strict" is wrong — high

**Where:** `src/pages/About.tsx:87`. Covered under A1; listed here because the
fix is a sentence on a page as well as a change of method.

### F2. The overview leads with the site, not with the situation — medium

**Where:** `src/pages/Overview.tsx:48`.

The first screen is three paragraphs about Canada's food system and a "How to
use this site" box. The first live figure appears after the ongoing-disruption
banner and the glance strip. A reader who has thirty seconds gets the framing
and not the state of the system. The four steps are a fixed decision and should
stay; the order of the first screen is not fixed.

### F3. "Research prototype" is prominent; "not reviewed by anyone" is buried — medium

**Where:** `src/pages/About.tsx:105`, `README.md:11`.

"No one reviews the content before it is published" is the sixth bullet of the
Limits section, on the last substantive page. It is the single most important
caveat on the site and it is the least visible. The weekly brief's `status`
field states it properly; the pages do not.

### F4. Jargon the brief rules out still appears — medium

**Where:** `src/pages/Threats.tsx:223` and `src/legacy/core.js` (`playbook`).

Every what-if test renders a panel headed "What could be agreed before it
happens" whose content comes from `s.playbook`. The reader never sees the word,
but it is in the code, in `narrative.py`'s brief output path, and in the
`playbook` key used throughout — and the brief for this work names "playbook"
as jargon to avoid. Also `src/pages/Timelines.tsx:84` uses "the joint plan",
which is fine; the key name is the problem, for whoever maintains this next.

### F5. Two labels for the same idea — low

`screening_signal` is defined in `src/lib/format.ts:52` as "Unusual reading",
and `STATE.outside_reference_range_review` as "Unusual for the time of year".
Both are shown. Only the second is ever produced by the pipeline;
`screening_signal` is defined and never used as an evidence class on any card.

### F6. The citation suggests a year from the reader's clock — low

**Where:** `src/pages/About.tsx:117` — `{new Date().getFullYear()}`.

The suggested citation's year comes from the browser, not from the release, so
a reader with a wrong system clock is handed a wrong citation.

---

## G. Performance

No problems worth acting on. First release is 4.2 MB on the data branch; the
site fetches `situation.json`, `events.json`, `indicators.json` and
`archive/index.json` on the overview page, and series files only on demand. All
nineteen pages loaded and settled within the 8-second budget used by the check
script at both widths. E5 above is the only item, and it is a nicety.

---

## Issues by severity

**High (7):** A1, A2 / B1, B2, C1, C2, D1, F1.
**Medium (16):** A3, A4, A5, A6, A7, B3, B4, C3, D2, D3, E2, F2, F3, F4.
**Low (16):** A8, C4, C5, C6, D4, D5, E1, E3, E4, E5, E6, F5, F6.
