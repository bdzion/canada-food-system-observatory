# What leading early-warning and food-system platforms do, and what transfers

Researched 24 November 2026 by three parallel reviews, one per group, covering
sixteen platforms and reports. Every claim below is tied to a page that was
actually fetched. Where something could not be verified it says so; nothing here
is filled in from memory.

The question this review was asked to answer is narrower than "what do these
platforms do". It is: **how does a platform get from a live reading to a
forward-looking statement, and how does it stop the reader mistaking one kind of
evidence for another?** That is the gap in the observatory (audit A2/B1).

---

## The finding that matters most

On the first question, the platforms split in three.

- **GIEWS, AMIS and WFP publish numeric triggers but no scenarios.** They can
  tell you a price is abnormal to a stated standard deviation, and then stop.
- **FEWS NET and IPC have rigorous scenario method but almost no numeric
  triggers.** They can tell you what would change their mind, in prose, and
  leave the watching to a monthly analyst cycle. FEWS NET's own guidance
  confirms it describes no indicator thresholds and no formal revision trigger
  ([Scenario Development guidance, January 2018](https://fews.net/sites/default/files/documents/reports/Guidance_Document_Scenario_Development_2018.pdf),
  [how we make projections](https://fews.net/our-work/our-work/scenario-development)).
- **JRC's two drought and crop systems come closest to a bridge, and they do it
  without a scenario at all.** ASAP pairs an automatic sub-national warning
  layer with a monthly expert hotspot assessment and keeps the machine evidence
  in the same record as the human verdict (§5). The European Drought
  Observatory's Combined Drought Indicator encodes a **cascade with memory**:
  rainfall deficit, then soil moisture, then vegetation, with each pixel's class
  depending on its indicators now and its class in the previous period (§6).

So the exact bridge this observatory needs — a live reading with a stated
threshold *wired* to a named assumption inside a what-if test, such that
crossing it marks the test as needing review — is not something to copy whole.
But two of its three parts exist and are proven.

**The cascade is the answer to "how does a shock pass from one link of the chain
to the next".** The drought indicator's Watch → Warning → Alert ladder is not a
severity scale; it is a statement about *how far along the chain the evidence has
reached*. ASAP's warning levels do the same thing a different way: level 1 is a
meteorological signal only, level 2 a biomass signal only, level 3 the two
converging, level 4 the end of the season when the loss is irrecoverable. Both
say "here is what is known, and here is how far it has travelled" in the label
itself. That transfers directly to a food chain of inputs, farms, transport,
processing and stores.

Four further things stand out.

1. **FAO publishes a complete, implementable anomaly statistic** — the Indicator
   of Food Price Anomalies, an adopted UN SDG indicator — which solves the
   observatory's screening problem (audit A1) by standardising *growth* rather
   than level (§1).
2. **IPC publishes an evidence-reliability system that gates what you are
   allowed to say** (§4), which is a better answer to "how do we publish early
   without over-claiming" than any amount of hedging prose.
3. **ASAP shows that an expert tier can be audited.** Its monthly record carries
   the count of sub-national units under automatic warning beside the expert
   verdict, so the override rate is measurable — and it is large: 34 of 81
   countries had automatic warnings but no hotspot designation in the latest
   assessment (§5).
4. **Two platforms refuse to speak where they lack skill.** ASAP suppresses a
   seasonal forecast warning where the skill score is at or below zero (§5), and
   the drought tracker withholds "potential" events from its headline view
   (§6). Both are better than hedged prose.

---

## 1. FAO GIEWS

The Global Information and Early Warning System is several loosely coupled
products, each with a narrow job, rather than one platform.

### What it does well

- **Country Briefs** are short prose situation notes covering the current
  season, harvest prospects for main staples, livestock, cereal production and
  trade estimates and forecasts, and price and policy developments
  ([index](https://www.fao.org/giews/country-analysis/country-briefs/index.jsp)).
  The structural trick worth copying: each brief opens with a three-bullet Food
  Security Snapshot, and each bullet then becomes a section heading. The
  headline bullet *is* the finding
  ([Nepal brief](https://www.fao.org/giews/countrybrief/country/NPL/pdf/NPL.pdf)).
- **Countries requiring external assistance** is a short, stable watch list —
  41 countries in November 2026, updated three times a year — sorted into three
  deliberately overlapping categories: exceptional shortfall in aggregate
  production or supplies; widespread lack of access; severe localized food
  insecurity ([external assistance](https://www.fao.org/giews/country-analysis/external-assistance/en)).
- **Earth Observation (ASIS)** is a reproducible indicator pipeline with every
  constant published: a crop-flagged pixel whose season-weighted Vegetation
  Health Index falls below 0.35 counts as a drought pixel, the Agricultural
  Stress Index is the percentage of arable area so affected per administrative
  unit, and areas above a mean VHI of 42% are treated as showing no water
  stress ([EO FAQ](https://www.fao.org/giews/earthobservation/faq.jsp)).

### The Indicator of Food Price Anomalies — the single most useful artefact found

GIEWS has one fully specified statistical trigger, and it is adopted as UN SDG
indicator 2.c.1. From the UN metadata sheet, last updated 29 July 2024
([SDG 2.c.1 metadata](https://unstats.un.org/sdgs/metadata/files/Metadata-02-0C-01.pdf)):

- It flags prices abnormally high for a given month by comparing each year's
  price growth with the historical growth for that same month, which accounts
  for both seasonality and inflation.
- It uses a compound quarterly growth rate and a compound annual growth rate,
  each a geometric mean scaled by period length in months, then standardises
  the year's growth against the weighted mean and weighted standard deviation
  of that calendar month across years.
- The composite is **IFPA = γ·QIFPA + (1 − γ)·AIFPA with γ = 0.4**, so quarterly
  anomalies carry 40% weight and year-on-year anomalies 60%.
- Thresholds, in standard deviations: **Normal** −0.5 ≤ IFPA < 0.5;
  **Moderately high** 0.5 ≤ IFPA < 1; **Abnormally high** IFPA ≥ 1. The one-SD
  cut was chosen to reduce the chance of missing significant market events.
- Data rules are explicit and auditable: at least five years (the analysis year
  plus four), an uninterrupted monthly series, dropped if more than three
  consecutive months are missing, **real (deflated) prices**, and **no
  imputation** of missing values.
- Stated limitation: it is a guide to market dynamics and should be weighed
  alongside other market, macroeconomic and shock information.

Why this matters here: it is a published, citable, distribution-aware
replacement for a min-max rule, it standardises *growth* rather than *level* so
a trending series does not flag every month, it already requires deflation
(which the observatory does), and it needs only five years of monthly data —
which the observatory has.

One thing to improve on rather than copy: GIEWS's public
[domestic price warnings](https://www.fao.org/giews/food-prices/price-warnings/de/)
page shows only a two-level legend (High, Moderate) and a date — at the time of
fetching, three High entries: Pakistan (wheat flour), South Sudan and Sudan
(staple foods), each dated 13/10/2026 while describing September 2026
conditions. **The computed IFPA value is not shown**, so a reader cannot see
how close a country is to a threshold. Show the number.

### Uncertainty

Weak and almost entirely lexical. The Nepal brief carries no ranges or
confidence statements; uncertainty is signalled by verb choice — *estimated*
for completed seasons, *forecast* for the coming marketing year, *prospects* for
an unharvested crop. For balance sheets the hedge is blanket: all figures are
subject to revision ([Data and Tools](https://www.fao.org/giews/data-tools/en)).

The exception is ASIS, whose caveat list is unusually candid: cloud cover
degrades data and cleaning introduces noise; the static crop mask does not
reflect actual planting; fixed phenology makes progress-of-season maps a proxy
only; the Vegetation Condition Index may overestimate stress, and the NDVI
anomaly should be used only when other indices are unavailable
([EO FAQ](https://www.fao.org/giews/earthobservation/faq.jsp)).

### Data age

GIEWS's strongest transferable habit. Every Country Brief carries one prominent
**Reference Date** and no other date marker, with vintage otherwise carried by
season and marketing-year labels and status words such as "final"
([Nepal brief](https://www.fao.org/giews/countrybrief/country/NPL/pdf/NPL.pdf)).
The index adds a recency filter rather than a cadence promise: a "new" badge
legended "Briefs updated in past 60 days", no fixed schedule stated, and
previous versions archived back to 2009
([index](https://www.fao.org/giews/country-analysis/country-briefs/index.jsp)).

Earth Observation states its latency and admits to revising published values:
dekadal data about 4–5 days after each dekad ends, monthly data around the 5th
of the following month, rasters updated over the next five dekads, and an annual
summary around 5 July ([EO FAQ](https://www.fao.org/giews/earthobservation/faq.jsp)).
The FPMA Bulletin publishes its release calendar in advance — ten dated 2026
issues — and restricts its focus to countries where price data are consistent
and up to date ([FPMA Bulletin](https://www.fao.org/giews/reports/fpma-bulletin)).
That last point is how GIEWS handles a late feed: the country drops out of the
reporting set rather than being shown stale. No page states an explicit
late-feed policy; this is inferred from behaviour.

### Separation of evidence, and evidence ladder

Only by product type and wording, not by markup. Briefs attribute inputs as a
fixed four-source list — balance sheets, FPMA, Earth Observation, IPC — and
remote sensing is kept physically separate from the analyst narrative
([index](https://www.fao.org/giews/country-analysis/country-briefs/index.jsp)).
**No evidence ladder of its own**: GIEWS borrows IPC classifications as an
input instead.

### Access and licence

Country Briefs are **CC BY 4.0**, with a recommended citation containing a
`[Date of Access]` placeholder — the clearest licence statement found anywhere
in this review ([index](https://www.fao.org/giews/country-analysis/country-briefs/index.jsp)).
No API is mentioned for GIEWS; FPMA offers downloads
([Data and Tools](https://www.fao.org/giews/data-tools/en)). ASIS bulk access
is real: pre-calculated zonal statistics as CSV, CSV time series by
administrative level, and rasters via several platforms, but NDVI and
precipitation maps are not redistributed for copyright reasons
([EO FAQ](https://www.fao.org/giews/earthobservation/faq.jsp)). A
machine-readable licence for FPMA price series was **not found**.

---

## 2. FEWS NET

The only platform here with a documented, teachable method for getting from
indicators to a forward-looking classification, and it publishes that method.

### What it does well

- **Fixed, public cadence.** Every four months analysts produce estimates for
  the following eight months, with reports in February, June and October
  ([projections](https://fews.net/about/projections)). The product ladder is
  explicit: Food Security Outlook three times a year on an eight-month horizon;
  Outlook Update in the off months on a six-month horizon; Key Messages every
  other month; Alerts ad hoc; Global Weather Hazards weekly.
- **An eight-step method with a template**: set scenario parameters (area,
  household group — usually the poorest 20% or more, duration typically eight
  months split into current, ML1 and ML2); classify current food security;
  develop key assumptions; assess impacts on income sources; on food sources;
  project household outcomes; project area outcomes; identify events that could
  change the scenario
  ([Scenario Development guidance](https://fews.net/sites/default/files/documents/reports/Guidance_Document_Scenario_Development_2018.pdf)).

### Uncertainty — the strongest here, and structural rather than decorative

- **Assumption strength is graded in prose, with worked examples.** The
  guidance contrasts "weak" and "strong" wording, where strong assumptions
  specify magnitude, timing, duration and source. Assistance has a higher bar
  still: it enters the scenario only if **planned, funded and likely** —
  documentary evidence, funding in place, no clear impediment to delivery.
- **Step 8 is the designated uncertainty channel.** Analysts name the one or
  two assumptions they are least confident in, ask whether outcomes would be at
  least one phase worse under an alternative assumption, and exclude events
  without a reasonable chance. Worst cases must be *plausible*, not absolute.
  Outcomes must be described across the whole period, not only at the end.
- **Price projections carry explicit bounds** from historical variation, expert
  judgement and market context, and note the months of highest and lowest
  confidence ([Price Projections guidance, April 2018](https://fews.net/sites/default/files/documents/reports/Guidance_Document_Price_Projections_2018.pdf)).
- **Published figures are ranges, not points** — counts such as 21.0–21.99
  million, shares such as 40–45%, and "less than 5%" for small shares — with a
  note that wider ranges are used on the map than in the table
  ([Food Assistance Outlook Brief, June 2026](https://fews.net/global/food-assistance-outlook-brief/june-2026/print)).
- **A named device for the tail risk.** "Risk of Famine" means a credible
  alternative scenario could lead to Famine without it being the most likely
  outcome — and the brief admits its own display gap: risk of Famine is not
  shown in the regular mapping, so readers need the full country reports.
- **Terminology discipline**: projections ("what will likely happen if") are
  distinguished from predictions or forecasts, which analysts are told to avoid.

### Separation of evidence — the cleanest found

Two mechanisms, both worth copying.

**Direct versus inferred.** Survey indicators are direct evidence;
livelihood-based analysis is inferred. Classification relies on a convergence of
evidence rather than any single indicator, with food-related factors weighted
more heavily than unrelated ones
([Scenario Development guidance](https://fews.net/sites/default/files/documents/reports/Guidance_Document_Scenario_Development_2018.pdf)).

**Model output published unmixed, then reconciled.** For prices, Step 4 produces
nominal prices from the mathematical model(s) only, kept separate from
judgement; Step 5 then combines those with the fundamentals analysis and expert
judgement to reach a most-likely path. Analysing price history alone is
strongly discouraged
([Price Projections guidance](https://fews.net/sites/default/files/documents/reports/Guidance_Document_Price_Projections_2018.pdf)).
This two-track-then-merge design is the clearest measured/modelled/judged
separation in this review.

**Low-confidence flagging**: "RM" marks remotely monitored countries where
analytical confidence is lower
([FAOB June 2026](https://fews.net/global/food-assistance-outlook-brief/june-2026/print)).

### Assumption register

Not a numbered ladder but a **Scenario Summary Table**, with a blank template as
Annex II, and assumptions split into normal factors, shocks, and assistance
([Scenario Development guidance](https://fews.net/sites/default/files/documents/reports/Guidance_Document_Scenario_Development_2018.pdf)).
Reliability grading is inherited from IPC: FEWS NET describes its analysis as
"IPC-compatible", following key IPC protocols but not necessarily built on
multi-partner consensus, citing timing, urgency or independence, and uses IPC
version 3.1 ([IPC page](https://fews.net/about/integrated-phase-classification)).
Worth flagging for any reader: the January 2018 scenario guidance is written
against IPC 2.0.

### Data age

Mixed. Reports date their evidence item by item rather than through one "as of"
field — the December 2025 East Africa alert cites November 2025 market data from
named markets, early-December field reports, and a November 2025 projection
covering February–May 2026, and states when the next update is expected
([alert](https://fews.net/east-africa/alert/december-2025-0/print)). The
homepage is poor at this: cards show "November 17", "November 10" with no year
([fews.net](https://fews.net/)). Behind the scenes recency is governed rather
than displayed: source documents carry a collection schedule, and notifications
fire when collections are published or placed under review
([data source management](https://help.fews.net/fdw/data-source-management)).
Comparison gaps get a footnote marker: each country's figure is compared with
the prior year and the five-year average and labelled Higher, Similar or Lower,
with an asterisk where the historical record has gaps
([FAOB June 2026](https://fews.net/global/food-assistance-outlook-brief/june-2026/print)).

### Indicators to scenarios

FEWS NET's linkage is the **monitored assumption**, not the threshold. New
monthly data lets analysts refine assumptions; stronger assumptions raise the
scenario's likelihood; there is **no formal revision trigger**
([how we make projections](https://fews.net/our-work/our-work/scenario-development)).

In practice the trigger is written in prose, and often very well. The December
2025 East Africa alert states the governing assumption (average March–May
rainfall), quantifies the assumption's own spread (analogue years ranging from
60% above to 60% below average), and names the conditional action: a shift in
the forecast toward a poor season would prompt FEWS NET to assess the risk of
Famine, with tracking of forecast updates described as critical
([alert](https://fews.net/east-africa/alert/december-2025-0/print)). That is the
pattern: **indicator → named assumption → the specific change that would
re-open the analysis.**

Also worth copying: the definitional honesty about what the headline number
counts. FEWS NET states that its population-in-need figure uses its own
definition, which differs from IPC's
([FAOB June 2026](https://fews.net/global/food-assistance-outlook-brief/june-2026/print)).

### Access and licence

A real REST API at `https://fdw.fews.net/api`, with time-series endpoints for
market prices, cross-border trade and IPC classifications, geographic-unit
endpoints, metadata endpoints, session and token authentication, HTML, JSON,
CSV, XML and some GeoJSON and KML, filters, pagination, field selection and
interactive Swagger documentation ([FEWS NET API](https://help.fews.net/fdw/fews-net-api)).

Licence is **not one open licence**: usage policies are set per source document,
sometimes per series, as Public, FEWS NET Only, Restricted, or Early Warning
Analysis Only, with series inheriting the document's policy unless overridden,
a required written justification for non-public policies, Usage Notes for
attribution conditions, and a License field naming the applicable open licence
([categorization and permissions](https://help.fews.net/fdw/categorization-and-permissions),
[data source management](https://help.fews.net/fdw/data-source-management)). The
Data Explorer surfaces this at the point of download through a Usage
Requirements drawer ([export data](https://help.fews.net/fde/v3/export-data)).

---

## 3. AMIS Market Monitor

The best of the group at **treating multi-source disagreement as a first-class
display**, and at monthly revision accounting. All observations from Market
Monitor No. 141, September 2026
([PDF](https://www.foodsecurityportal.org/sites/default/files/2026-09/AMIS_Market_Monitor_September_2026.pdf)).

### What it does well

- A "Markets at a glance" summary rates each crop as easing, neutral or
  tightening, **both against the previous forecast and against the previous
  season** — cheap, near-free self-scoring.
- Each crop's balance table compares two marketing years across **three
  independent sources** — FAO-AMIS, USDA and IGC — with each source separately
  dated (FAO-AMIS 3 July and 4 September; USDA 12 August; IGC 20 August).
- A separate **revisions table** showing only changes above 1,000 tonnes, with
  a note that sources diverge because of methodology and release timing.
- Market indicators include implied and historical volatility, with rice
  excluded because its liquidity is very limited — the right instinct when a
  contract is thin.

### Uncertainty

Three concrete mechanisms: source triangulation with the divergence explained;
market-implied uncertainty reported as an indicator in its own right; and
**flagging unreliable observations rather than dropping them** — some prices are
described as notional or highly nominal, including deep-sea Black Sea values and
Ukrainian maize, because shipments had effectively stalled.

### Data age

The best per-item dating of the group. Every input carries its own cut-off:
prices and futures through August 2026, policy items through 25 August,
fertilizer figures as estimates from weekly data available to date, three
balance sources each with their own release date, forward curves dated per
snapshot, and the issue numbered against a published release calendar. **No
statement of what AMIS does when a member country's submission is late.**

### Separation of evidence

Estimates are labelled "est" and forecasts "f'cast" — a typographic convention.
Expert consensus is labelled as such (the Crop Monitor reflects consensus expert
statements). Measured market data sit in their own section, separate from the
analyst narrative. And the GEOGLAM crop-condition legend **separates state from
cause**, which is unusually good design: conditions are Exceptional, Favourable,
Watch, Poor, Out-of-Season, No Data; drivers are Wet, Dry, Hot, Cool, Extreme
Event, Pests and diseases, Conflict, Delayed-Onset, Socio-Economic — and maps
show only crops in less-than-favourable condition.

### The designed-but-only-partly-adopted triggers

AMIS Research Paper No. 5, *Developing a Set of Early Warning Global Market
Indicators*, by Joe Glauber (IFPRI), March 2016, specifies two fully defined
trigger systems
([PDF](https://legacy.amis-outlook.org/fileadmin/user_upload/amis/docs/resources/5%20Developing%20a%20set%20of%20early%20warning%20global%20market%20indicators%20March%202016.pdf)):

- **IFPRI Excessive Food Price Variability** — a nonparametric model on daily
  futures returns; a return is extreme above the 95th percentile of the
  estimated distribution; the system tests whether extreme returns are unusually
  frequent over the previous 60 trading days, with a traffic light: Red at
  probability ≤2.5%, Orange above 2.5% to 5%, Green above 5% — **and a
  persistence counter**, the published table showing all five contracts at Low
  volatility with 235 to 423 consecutive days at that level.
- **World Bank Food Price Crisis Monitor** — global food and fuel prices against
  a detrended 1960–2006 mean, with three triggers calibrated on the 2008 and
  2011 spikes: the global index exceeding 3 standard deviations; domestic staple
  prices rising at least 15% over five months in two or more countries in a
  region; and those countries also showing at least one macroeconomic
  vulnerability. Crucially it is **two-directional**: alerts are top-down from
  global price shocks, or bottom-up from regional domestic vulnerability even
  when global prices are calm. The paper also shows a *non*-triggering state.

Two caveats from the same paper, both of which should travel with the method:
work remained on what threshold levels would signal a need for particular
vigilance, and **neither measure is predictive** — both indicate only whether
recent movements are statistically abnormal.

Whether these are now in operational use with live thresholds **could not be
verified**: the current AMIS site is client-rendered and returned only an HTML
shell. Treat "AMIS has no public API" as unconfirmed rather than established
([FAO agroinformatics, 12 December 2024](https://www.fao.org/agroinformatics/news/news-detail/a-new-chapter-for-amis--enhanced-technology-for-greater-market-transparency/en)).

---

## 4. IPC (Integrated Food Security Phase Classification)

**Manual in force: Technical Manual Version 3.1, IPC Global Partners, Rome,
August 2021**, which states that earlier versions are obsolete
([Technical Manual 3.1](https://www.fsinplatform.org/sites/default/files/resources/files/IPC_Technical_Manual_3_Final_0.pdf)),
corroborated by FEWS NET's use of 3.1 in 2026
([FEWS NET IPC page](https://fews.net/about/integrated-phase-classification)).
No evidence of a version 4.0 was found; the IPC technical-development page
failed to load, so this rests on two sources rather than a release-notes page.

### The evidence-reliability system — the centrepiece

IPC is the only platform here with a formal, numeric evidence-reliability
system, and it is the most valuable thing in this review after the IFPA.

**Reliability score (Tool 5)** is a two-dimensional grid combining **Soundness
of Method (M)** and **Time Relevance (T)**:

| | T2 Good | T1 Limited |
|---|---|---|
| **M2 Good** | R2 Reliable | R1+ |
| **M1 Limited** | R1+ | R1− |

R0 covers reasonable evidence below R1 — field trip reports, local knowledge —
which may support analysis but **cannot count toward minimum evidence
requirements**, except in areas with limited humanitarian access meeting
specific parameters.

Both axes have published numeric criteria. M2 surveys: simple or systematic
surveys with at least 150 cases, or probabilistic multi-stage surveys with at
least 25 clusters. M1: at least five clusters and at least 90 observations. On
time relevance, T2 is evidence collected during the season of analysis, with
baselines up to ten years old in stable situations and five in unstable ones;
T1 is inferred estimates from data collected within the last six months, twelve
for unimodal areas.

**Evidence Level 1/2/3 is then a counting rule over reliability-scored items.**
For current classifications: Level 1 (Acceptable) permits area classification
only, **with no population tables**, and requires at least one R1+ piece of
direct evidence on food consumption or livelihood change plus four other R1
pieces, at least two from the season of analysis. Level 2 (Medium) requires two
R1 or one R2 direct piece plus five other R1 pieces. Level 3 (High) requires two
R2 direct pieces plus six other R1 pieces.

**The design insight to steal: the evidence level gates what you are allowed to
publish, not merely how confident you sound.** At Acceptable you may colour a
map but may not publish population numbers.

### Uncertainty

IPC uses **no numerical confidence intervals**. Uncertainty is handled through
critical review of assumptions and likely trends, and through explicit statement
of supporting *and contradictory* evidence. Reference tables give common
thresholds but indicators do not always align, so they guide classification
rather than determine it. Where data are limited, IPC keeps minimum standards,
uses specialized parameters for low-access areas, and presents the limitations
of each classification ([FAQs](https://www.ipcinfo.org/ipcinfo-website/faqs/en/)).

Uncertainty about *worse* outcomes is handled by a separate, named product:
**Risk of Famine** (IPC Technical Advisory Group and Global Support Unit, March
2023) ([guidance note](https://www.ipcinfo.org/fileadmin/user_upload/ipcinfo/docs/IPC_Guidance_Note_on_Risk_of_Famine.pdf)).
Its status is carefully bounded, and the bounding is the point:

- It is **"only a statement and not a classification"** — no area
  classification, no population estimates, no evidence level assigned, though it
  requires at least four R1 pieces and clear forecast assumptions.
- Analysts build a worst case from critical shocks, **test whether all assumed
  conditions could realistically coincide**, and declare a risk only if Famine
  would occur in that scenario.
- It gets its own map symbol and legend on the standard projection map, and is
  styled lowercase "risk of Famine (IPC Phase 5)".
- Reporting is prescriptive **including the negative case**: if no risk is
  found, the report should say so and explain why.

### Data age — a rule, not a label

IPC is the only platform where data age is formally enforceable:

- Time relevance is half the reliability score.
- Projections require evidence no more than **12 months old at the end of the
  projection period**, plus a minimum count of R1 evidence with clear forecast
  assumptions.
- Every analysis carries an **explicit validity period** set by analysts, from a
  few weeks to a maximum of 12 months, during which the expected situation
  should not change significantly; if it does, analysts run a new analysis or a
  projection update.

### Indicators to scenarios

Projections follow the same framework as current classifications: Step 7 sets
assumptions about future shocks and ongoing conditions, Step 8 analyses evidence
against them, Step 9 determines phase and population. Assumptions must be
written as **if-then chains** — usual conditions, the expected impact of a
forecast event, the likely outcome. And **Step 11 requires identifying risk
factors to monitor** — conflict, rainfall, prices, floods — which are the
triggers for a projection update or a new analysis.

So IPC's indicator-to-scenario link is: *validity period + risk factors to
monitor + evidence-age rule* → when a monitored factor moves or the clock runs
out, the analysis must be redone. Unlike FEWS NET's, it has hard numbers
attached.

### Access and licence

An API exists but is **gated**: it shares IPC Acute Food Insecurity
classifications from 2017 onward for more than 30 countries, organised by
analysis unit with population tables, with maps as GeoJSON and vector tiles;
access requires a request form and an issued key
([IPC API](https://www.ipcinfo.org/ipc-country-analysis/api/)). **Licence,
attribution and redistribution terms are not stated on any IPC page fetched.**
Note the side effect: IPC classifications are more easily obtained
unauthenticated through FEWS NET's API. Gating cost reuse without buying much
control.

---

## 5. JRC ASAP — Anomaly hot Spots of Agricultural Production

The platform that most directly answers the question this review was asked,
because its two-tier structure is not merely documented but queryable.

### The two tiers, exactly as they work

**Tier A — automatic, ten-daily, sub-national, unreviewed.** Published every ten
days, two or three days after each dekad closes, flagging low or delayed
vegetation performance at province level
([about](https://agricultural-production-hotspots.ec.europa.eu/about.php)).

**Tier B — expert, monthly, national, narrative, reviewed.** JRC experts
identify hotspot countries and write short regional and country summaries,
published after about the 27th of each month, covering 80 countries. The final
hotspot selection rests on expert judgement **supported by** the automatic
classification ([introduction deck](https://agricultural-production-hotspots.ec.europa.eu/files/ASAP_short_introduction.pdf)).

Users see the separation as **separately toggleable layers with separate
legends**: the Warning Explorer's analysis panel reports "Monitoring warning",
"Current hotspots" and "Forecast warning" as distinct fields with distinct
legend blocks ([Warning Explorer](https://agricultural-production-hotspots.ec.europa.eu/wexplorer/)).
The hotspot page carries its dated assessment at the top — "ASAP hotspot
assessment October 2026 (updated on 11/10/2026)" — and states when the next one
is due ([front page](https://agricultural-production-hotspots.ec.europa.eu/index.php)).

### The two tiers measurably disagree, and that is the point

The monthly hotspot time series is downloadable as a CSV
([HDX](https://data.humdata.org/dataset/asap-hotspots-monthly), 9,102 rows,
October 2016 to October 2026). **Each row carries the expert verdict and the
machine evidence side by side**: the country, the date, the expert `hs_code`
(0 No hotspot, 1 Hotspot, 2 Major hotspot, 3/99 Not assessed), the analyst
comment, and `g1_w_crop`, `g1_w_range`, `g1_w_any` — counts of admin-1 units
under automatic warning.

Computed from that CSV for the latest assessment (11 October 2026, 81 assessed
countries): **34 countries had at least one sub-national unit under automatic
warning but were not declared hotspots**, and **three countries were declared
hotspots with zero or one warning unit** (Afghanistan 1, Madagascar 0, Syria 0).

That is a quantified demonstration that the expert tier is neither a rubber
stamp nor a threshold restatement. **The override rate is itself a publishable
quality metric**, and it is the answer to the fair criticism that an expert tier
launders judgement.

### Warning levels that are semantic about evidence, not just severity

Methodology: *ASAP warning classification scheme* v8.0, dated 15 July 2024
([PDF](https://agricultural-production-hotspots.ec.europa.eu/files/asap_warning_classification_v_8_0.pdf)).
The superseded v4.0 (8 July 2019, JRC EUR 28757 EN) is still online and is what
the HDX record still links to — a documentation-versioning lesson in itself.

Pixel-level criticality thresholds (v8.0): the z-score of the Water Satisfaction
Index critical below −1 SD; the 3-month Standardized Precipitation Index critical
below −1 SD; cumulative FPAR z-score critical below −1 SD **but only if** the
mean FPAR difference is also critical; mean FPAR difference critical below −10%
of the historical mean. Aggregation: a warning fires when the **critical area
fraction exceeds 25%** of the unit's active area, where a unit becomes active
when more than 15% of its cropland or rangeland is in season. Cropland and
rangeland are assessed separately.

The resulting ladder reads as a claim about *what is known*:

| Level | Meaning |
|---|---|
| 1 | ≥25% of active area anomalous on a **meteorological** indicator only |
| 1+ | anomalous on **both** meteorological indicators |
| 2 | ≥25% anomalous on the **biomass** indicator only |
| 3 | biomass **and** one meteorological indicator converge |
| 3+ | biomass **and both** meteorological indicators converge |
| 4 | season in **senescence** with biomass anomalous — irrecoverable |
| 0 with exceptional conditions | no negative anomaly, ≥25% positive biomass anomaly |
| 20 | successful season |
| **98** | **off season** — under 15% of area active |
| **99** | **insufficient crop or rangeland area** — unit not in the system |

Two observations worth recording. The "+" suffix marks stronger convergence, and
level 4 exists because only the biomass proxy is used during senescence, rainfall
having little effect by then. And the production feed **still labels the biomass
indicator `zNDVIc` although v8.0 states the proxy is now FPAR** — live
documentation drift, observed directly in the WFS response.

### Absence is coded, in three distinct ways

Off season (98), structurally excluded (99), and favourable or exceptional —
each with its own label rather than a blank. Area-based exclusions in v8.0 drop
units with cropland under 25 km² or below 0.25% of unit area, and rangeland
units with cattle-equivalent density below 0.5 per km². The v8.0 PDF contains
an internal inconsistency on the national minimum (250 km² in text, 1,000 km² in
its Table 3), reported here rather than resolved.

### Data age — the strongest treatment found

v8.0 documents a **staged consolidation pipeline**: stage 0 is the first estimate
for the current dekad, and stages 1 to 4 progressively refine the four preceding
dekads, so the fully consolidated value for a dekad is available only after
about three months. Quality flags accompany each stage. Rainfall latency is
handled by substitution — forecasts fill the most recent dekads where the
reanalysis lags — and gaps are smoothed and gap-filled rather than blanked.

An **observed staleness discrepancy**, reported with caution: on 24 November 2026
the front page and the HDX mirror both showed the 11 October assessment, while
the live `public:hotspots` WFS layer returned dates of only 2026-08-10 and
1970-01-01. The machine-readable layer appeared about two months behind the
human-readable page. Cause unknown; it is exactly the failure mode an
observatory must instrument against.

### A forecast layer that refuses to speak where it has no skill

ASAP's seasonal forecast warnings are the cleanest example found
([documentation](https://agricultural-production-hotspots.ec.europa.eu/documentation-sf-warnings.php)):

- Input: monthly precipitation from a nine-system multi-model ensemble, six-month
  horizon.
- Trigger: a warning fires when ≥25% of a unit's crop or rangeland area is
  forecast drier than usual with probability above 0.4.
- **Phenology gating**: the forecast counts only if the dry conditions fall
  inside the unit's growing season.
- Categories drier / normal / wetter as terciles, **plus an explicit "other"**
  class when no tercile reaches 0.4 or two tie.
- **Skill display and suppression**: the Ranked Probability Skill Score is shown
  as a ring on the probability chart, and **warnings are suppressed where the
  skill score is at or below zero or cannot be computed**. Skill is only
  available between 50°N and 50°S.

### Access and licence — the best of the group

Hotspot and warning time series as ZIPped CSV (warnings from May 2001),
shapefiles, 10-day GeoTIFF rasters for every indicator, GAUL boundaries, crop
and rangeland masks, phenology and crop calendars, and an unauthenticated OGC
endpoint that served GeoJSON to a single `curl`
([downloads](https://agricultural-production-hotspots.ec.europa.eu/download.php)).
Reuse is authorised with acknowledgement under the European Commission reuse
decision of 12 December 2011; the HDX hotspots dataset is **CC BY-IGO**. Yield
forecasts for 77 countries are published and labelled **pre-operational**.

Peer-reviewed references, all DOIs verified to resolve:

- Rembold, F., Meroni, M., Urbano, F., *et al.* (2019). ASAP: A new global early
  warning system to detect anomaly hot spots of agricultural production for food
  security analysis. *Agricultural Systems*, 168, 247–257.
  <https://doi.org/10.1016/j.agsy.2018.07.002>
- Rembold, F., Meroni, M., Otieno, V., *et al.* (2023). New functionalities and
  regional/national use cases of the ASAP platform. *Remote Sensing*, 15(17),
  4284. <https://doi.org/10.3390/rs15174284>
- Seguini, L., Klisch, A., Meroni, M., *et al.* (2026). Global near real-time
  500 m 10 d FPAR dataset from MODIS and VIIRS. *Earth System Science Data*, 18,
  309–331. <https://doi.org/10.5194/essd-18-309-2026>
- Meroni, M., Vojnović, P., Zampieri, M., *et al.* (2024). Increasing the
  prospective capacity of global crop and rangeland monitoring with phenology
  tailored seasonal precipitation forecasts. *Climate Services*, 33, 100434.
  <https://doi.org/10.1016/j.cliser.2023.100434>
- Fritz, S., Lesiv, M., See, L., *et al.* (2024). A new global hybrid map of
  annual herbaceous cropland at a 500 m resolution for the year 2019.
  *Environmental Research Letters*, 19, 084025.
  <https://doi.org/10.1088/1748-9326/ad6a71>

---

## 6. Copernicus EMS — European and Global Drought Observatories

### The Combined Drought Indicator: a cascade with memory, not a composite score

The most instructive design in the whole review, because it does not average its
inputs. It encodes a **physical propagation chain**, so the class name itself
tells the reader *where in the cascade the evidence sits*. From the current
factsheet, v4.1.1, July 2026
([PDF](https://drought.emergency.copernicus.eu/data/factsheets/factsheet_combinedDroughtIndicator_v4.pdf)):

Components and critical thresholds: the Standardized Precipitation Index at one
and three months, critical at SPI-1 ≤ −2 or SPI-3 ≤ −1; the Soil Moisture Index
Anomaly, critical at ≤ −1; and the FAPAR vegetation anomaly, critical at ≤ −1.

| Level | Class | Rule |
|---|---|---|
| 0 | No drought | normal |
| 1 | **Watch** | rainfall deficit |
| 2 | **Warning** | soil moisture deficit, usually following a rainfall deficit |
| 3 | **Alert** | vegetation deficit, usually with both of the above |
| 4 | Recovery | all three back to normal |
| 5 | **Temporary soil moisture recovery** | soil moisture recovered, episode not yet closed |
| 6 | **Temporary vegetation recovery** | vegetation recovered, episode not yet closed |

**Each pixel's class depends on its three indicator values now and its class in
the previous period.** Two masks constrain false signals: crop masks restrict
negative vegetation anomalies to the growing season, and snow masks exclude
negative soil-moisture and vegetation anomalies under snow.

The three recovery classes are the feature most worth taking: they let the map
say *improving but not resolved* instead of flipping back to green and
destroying the reader's sense that an event is continuous.

Stated limitation, directly relevant to a Canadian analogue at similar
latitudes: low clouds are not always detected before the vegetation index is
computed, which can produce erroneous values particularly in northern Europe.

### Provisional-versus-final file versioning — the cheapest practice here

From the distribution directory README
([ver4-1-1](https://drought.emergency.copernicus.eu/data/Drought_Observatories_datasets/EDO_Combined_Drought_Indicator/ver4-1-1/README.txt)):

- Files ending `pNN` are **provisional** — a stand-in to cope with delays.
- Final files carry a `zMM` suffix, where MM follows the last NN used.
- **The indicator version is embedded in the filename**, and a changelog states
  which date ranges belong to which version — v4.1.0 for data from 2012-01-01 to
  2026-06-21, v4.1.1 from 2026-07-01, the switch marking a satellite transition
  for the vegetation component.

So the data file declares its own maturity and its own algorithm version.
Nothing else in this review matches it.

Observed latency: on 24 November 2026 the bulk annual archive ran only through
the first dekad of November, roughly two to three weeks behind the map.

### The global observatory: a risk index and an event tracker, with no global CDI

Enumerating the full open-data directory (174 directories) confirms
`EDO_Combined_Drought_Indicator` exists and **there is no global CDI**. The
global headline products are instead:

**Risk of Drought Impacts for Agriculture** — a *relative* risk score from 0 to
1, computed as hazard × exposure × vulnerability, at sub-national level
([factsheet](https://cidportal.jrc.ec.europa.eu/ftp/jrc-opendata/DROUGHTOBS/Drought_Observatories_datasets/factsheets/factsheet_rdri_agri.pdf),
2021). Exposure combines population, agricultural land, livestock and water
stress through **Data Envelopment Analysis**, which is deliberately
non-compensatory: abundance of any one asset type makes a region highly exposed.
**No classes or thresholds are defined — only the 0 to 1 range — and no
confidence levels or error metrics are reported.** Its own stated limitations:
the scores are relative, not absolute measures of loss; they may be biased by
input uncertainty and error propagation; and most vulnerability indicators exist
only at country level, so within-country variation is missed.

**Indicator for Drought Tracking v1.0** — the strongest uncertainty-*state*
design found ([factsheet](https://drought.emergency.copernicus.eu/data/factsheets/factsheet_drought_tracking.pdf)).
Clusters of contiguous negative anomalies are linked through time so an event
persists while its cells stay connected, with every parameter published. Events
carry **three maturity states: consolidated (final), on-going (provisional, may
change at later updates), and potential (anomalies that may yet join an
event)** — and the main map shows only consolidated and on-going, withholding
potential events from the headline view.

Forecast layers are provided **per modelling system and as a multi-system
ensemble**, visible in the directory names. Exposing each member alongside the
ensemble is itself an uncertainty-communication choice.

Note a dated-methodology problem this review ran into: the CDI factsheet linked
from the curated Commission landing page is **v3, dated September 2023**, while
the live operational product is **v4.1.1**. Two official pages disagree about
which methodology is current.

### Access and licence

Open directory listings, NetCDF, ZIP and per-dekad GeoTIFF, mirrored, both
returning full listings unauthenticated. **CC BY 4.0**
([copyright](https://drought.emergency.copernicus.eu/data/Drought_Observatories_datasets/copyright.txt)).
Two things in the portal terms are worth copying: the required attribution
strings ("Generated using Copernicus Emergency Management Service information
[Year]", or "Contains modified … information [Year]" for adapted data), and an
explicit institutional disclaimer that **the data are for information only and
are not an early warning, which only national or regional authorities are
authorised to issue** ([terms](https://drought.emergency.copernicus.eu/terms&conditions)).

---

## 7. WFP HungerMap LIVE

A rebuilt platform was released on 16 April 2026, adding predictive modelling
and forecasting of projected needs in 16 hunger hotspots
([WFP news](https://www.wfp.org/news/wfp-releases-hungermap-live-modernized-intelligence-platform-turns-data-global-hunger-early)).
Coverage is 94 countries
([about](https://wfp-hungermap.netlify.app/about)).

### A deterioration rule that scales with the baseline — the one-line fix worth copying

Country risk tiers have explicit numeric rules
([global summary report](https://static.hungermapdata.org/insight-reports/latest/global-summary.pdf)).
Tier 1 "High risk and deteriorating" covers sub-national regions where the mean
of two prevalences exceeds 40% *and* has significantly deteriorated against 90
days earlier; a country enters Tier 1 if at least 10% of its population lives in
such regions. Tiers 2 to 4 follow by combining the level and the direction.

The portable part is the definition of deterioration: **a relative rise of +15%
where prevalence is above 40%, +20% between 20% and 40%, and +25% below 20%.**
The change needed to call something "deteriorating" is *larger where the
baseline is smaller*, which suppresses noise-driven alarms in low-prevalence
areas. That is the commonest false-alarm pathway in small-number sub-regions,
and this is a one-line fix for it.

### The nowcast, and the gap between its method and its product

The model is gradient-boosted trees retrained as new data arrive, applied to
first-level administrative areas lacking near-real-time survey data, running
nightly ([UNIDO workshop deck](https://stat.unido.org/pdf/NowcastingWorkshop-Day2-WFP.pdf)).
Predictors include the latest survey values, conflict fatalities, rainfall and
vegetation anomalies, a price-spike indicator, inflation, GDP, exchange rates,
nightlights and undernourishment prevalence.

Published performance, stratified by whether past survey data exist for the unit
([method deck](https://stg.nutritioncluster.net/sites/nutritioncluster.com/files/2021-02/Session%204%29%20HungerMap%20LIVE%20-%20Predictive%20model.pdf)):

| Indicator | Setting | R² | Mean absolute error |
|---|---|---|---|
| Food consumption | with past data | 0.71 ± 0.02 | 0.081 ± 0.002 |
| Food consumption | **no past data** | **0.48 ± 0.02** | 0.115 ± 0.002 |
| Coping strategies | with past data | 0.81 ± 0.02 | 0.061 ± 0.002 |
| Coping strategies | **no past data** | **0.63 ± 0.01** | 0.092 ± 0.002 |

Peer-reviewed method paper, DOI verified: Martini, G., Bracci, A., Riches, L.,
*et al.* (2022). Machine learning can guide food security efforts when primary
data are not available. *Nature Food*, 3, 716–728.
<https://doi.org/10.1038/s43016-022-00587-8>

**This is the weakest platform here on uncertainty display, and the gap is
instructive.** The model *computes* bootstrap confidence intervals from 100
repetitions; the public report shows **single point values with no intervals,
ranges or margins of error**. What it does separate cleanly is provenance: every
country figure is labelled **ACTUAL** (near-real-time monitoring) or
**PREDICTED** (model), in both the rankings and the annex tables. Partial
coverage is footnoted rather than encoded, absent figures appear as undefined
dashes, and the words "insufficient data" and "no data" never appear.

A searching of the production JavaScript bundle found no user-facing labels for
confidence intervals, nowcast status or data age, so **how the 2026 platform
labels these on screen could not be verified**.

Note a recency-signalling failure to learn from: the `/latest/` report path was
serving a document dated February 2024.

### ALPS — a second published threshold scheme

WFP's Alert for Price Spikes, from technical guidance dated April 2014
([PDF](https://documents.wfp.org/stellent/groups/public/documents/manual_guide_proced/wfp264186.pdf)):
regress monthly prices on a linear trend plus twelve monthly dummies, take the
residual, keep only positive residuals, and divide by the residual standard
deviation. Classes: **Normal** below 0.25, **Stress** 0.25 to 1, **Alert** 1 to
2, **Crisis** at or above 2. Prerequisites: a stationarity check and roughly 36
monthly observations minimum. A newer forecasting methodology exists but was not
opened, so the current method and any prediction intervals are unverified.

### Access

**The food-security API is not an open data source.** Of nine endpoints probed,
the food-security ones returned 401 Unauthorized and the rest 404 or 503. The
only unauthenticated routes confirmed are the PDF insight reports and a static
admin-1 label GeoJSON. The underlying VAM DataBridges API uses OAuth
client-credentials with some datasets requiring named authorisation
([client repo](https://github.com/WFP-VAM/DataBridgesAPI)); unauthenticated
probes returned 403. A third-party bulk route exists through HDX HAPI, whose
records carry explicit reference-period start and end fields
([HAPI reference](https://docs.humdata.org/build/hdx-apis/hapi/api-reference/food-security-nutrition-and-poverty)).

---

## 8. GEOGLAM Crop Monitor

### A documented consensus protocol, not a model

The distinguishing feature is that the product is an explicitly negotiated
expert consensus with a **written reconciliation procedure**
([methodology](https://cropmonitor.org/methodology)):

1. Partners submit crop-condition assessments through a web interface using a
   common classification system.
2. The team compiles a draft and checks it against Earth-observation datasets in
   the same interface.
3. **Discrepancies — where agencies diverge for the same region — and
   month-over-month changes are sent back to partners** and usually resolved
   through discussion and shared evidence.
4. A video conference reviews assessments, evidence, discrepancies **and
   uncertainties**, comparing with the previous assessment and the previous
   season.
5. Draft text and graphics go to all partners for review before publication.

Cadence: the first Thursday of the month, eleven times a year, with mid-month
special reports when a situation develops. The November 2026 report's disclaimer
states the findings are consensual statements from the expert group and do not
necessarily reflect individual agencies' views
([No. 121](https://www.cropmonitor.org/s/EarlyWarning_CropMonitor_202611-2tj4.pdf)).

### Condition classes, with the bands widened for early warning

Conditions are relative to the previous **five-year** average, a window chosen
to limit the influence of long-term trends in seed varieties and management
([AMIS classes](https://www.cropmonitor.org/crop-conditions)). For the
early-warning product the bands are wider and there is a fifth severity class,
because early-warning regions have highly variable yields
([early-warning classes](https://www.cropmonitor.org/early-warning-classification-system)):

| Class | AMIS | Early warning |
|---|---|---|
| Exceptional | ≥5% above average | ≥10% above average |
| Favourable | within 5% | within 10% |
| Watch | near average, at risk, recovery still possible | same |
| Poor | ≥5% below average | 10% to 25% below |
| **Failure** | — | **≥25% below** |
| Out of season | not planted or developing | same |
| No data | no reliable source | same |

**The baseline is adjusted for conflict**: where conflict drives crop condition,
conditions are compared with the **pre-conflict** average rather than the
five-year average, and where conflict is protracted, experts decide case by case.

**A driver tag is mandatory for every non-favourable condition**: Wet, Dry, Hot,
Cool or Cold, Extreme Events (the analyst must specify which), Delayed-Onset,
Pest and Disease, Socio-economic, Conflict. Forcing an attribution at assessment
time is what makes a monitoring record usable for later causal analysis.

Season naming is explicit rather than implied: where a crop has multiple
seasons, each is labelled with its national name, with Season 1 being the larger
producing season over the past five years.

### Uncertainty and data age

**Uncertainty is procedural, not quantified.** There are no confidence intervals
or probability statements in the condition classes. The honest summary: the Crop
Monitor converts disagreement into a single negotiated label and then discloses
that the label is a negotiated one.

**Data age is handled by an explicit information cut-off stated on the artefact
itself.** The November 2026 report, published on 5 November, states its synthesis
is based on best available information **as of 28 October**, and repeats that
as-of date in the map caption. Two dates — cut-off and publication — on every
map.

Absent evidence is carried into the graphics: in the regional pie charts each
slice is a country's share of regional production coloured by condition, with
**grey explicitly meaning out of season**, and gaps on the Earth-observation
maps appear as missing data rather than as a value.

Forward-looking statements are **segregated into labelled outlook sections and
cross-referenced by page number** from the at-a-glance text, keeping the
forecast claim distinct from the current-condition claim.

### Access and licence — the most permissive found

**CC BY 4.0** for the website, reports, graphics and datasets, commercial use
allowed, with a published citation template that asks users to note
modifications including recoloured or removed icons
([referencing guidelines](https://www.cropmonitor.org/referencing-guidelines)).
Crop calendars are properly deposited and citable
(<https://doi.org/10.5281/zenodo.15850408>), as are the crop masks
(<https://doi.org/10.1038/s41597-023-02047-9>). Whether the crop-condition
classes themselves are available as a machine-readable service **could not be
verified**.

---

## 9. The Food Systems Dashboard (GAIN, Columbia, Cornell, FAO)

Governance note: Johns Hopkins is often named as a founder, but the current
About page lists the leads as GAIN, the Columbia Climate School, Cornell CALS
and FAO ([about](https://foodsystemsdashboard.org/information/about-the-dashboard)).

### What it does well

- Breadth: about **300 indicators from over 40 sources covering 230 countries**,
  up from roughly 140 at its 2020 launch
  ([about](https://foodsystemsdashboard.org/information/about-the-dashboard)).
- A genuine diagnostic layer rather than a raw portal: 39 diagnostic indicators
  per country profile rated green, yellow (potential challenge) or red (likely
  challenge), with 52 visualizations per profile, on a **describe → diagnose →
  decide** spine, plus 87 catalogued policies and actions.
- Per-indicator metadata as a design principle: source, definition, relevance,
  calculations made, and treatment of missing values
  ([methodology](https://foodsystemsdashboard.org/data-sources-and-methodology)).

### Uncertainty and data age

Limitations live in metadata rather than on the chart, and the gap between
principle and practice is instructive: on the Agrobiodiversity Index graph page,
the only metadata rendered were a unit, a source and a data year — **no
definition, no limitations, no "what this does not show"**
([graph page](https://foodsystemsdashboard.org/indicators/outcomes/environmental-impacts/agrobiodiversity-index/graph)).

Two things are worth copying anyway. One excellent caveat archetype: for policy
indicators, missing data **"cannot necessarily be interpreted as the lack of a
policy"**. And a hard staleness rule, which is unusual: indicators whose most
recent data are more than **ten years old are typically excluded**, and
frequently updated sources are prioritised
([methodology](https://foodsystemsdashboard.org/data-sources-and-methodology)).

### Separation of evidence

Weak. The green/yellow/red diagnostic rating is an *interpretation* rendered in
the same visual register as the measured value, with no device distinguishing
them. No forward-looking content was found.

### Access and licence

Bulk CSVs only, three files, dataset-level timestamp 10 September 2025; **no
API documented** ([downloads](https://www.foodsystemsdashboard.org/downloads)).
**Licence not stated** while the About page calls the data open access — a
pattern to avoid, not copy.

---

## 10. The Food Systems Countdown Initiative

Verified citations, all DOIs confirmed to resolve and metadata confirmed through
Crossref:

- Schneider, K.R., Fanzo, J., Haddad, L., *et al.* (2023). The state of food
  systems worldwide in the countdown to 2030. *Nature Food*, **4**, 1090–1110.
  <https://doi.org/10.1038/s43016-023-00885-9>
- Schneider, K.R., Remans, R., Bekele, T.H., *et al.* (2025). Governance and
  resilience as entry points for transforming food systems in the countdown to
  2030. *Nature Food*, **6**(1), 105–116.
  <https://doi.org/10.1038/s43016-024-01109-4>
  (The Harvard Kennedy School record gives a conflicting page range of 1–12;
  Crossref's 105–116 is authoritative.)
- Fanzo, J., *et al.* (2021). Viewpoint: Rigorous monitoring is necessary to
  guide food system transformation in the countdown to the 2030 global goals.
  *Food Policy*, **104**, 102163.
  <https://doi.org/10.1016/j.foodpol.2021.102163>
  **DOI and metadata verified; the paper itself was not read**, so nothing is
  claimed about its content.

### What it does well — and this is the best uncertainty writing found

- Fifty indicators across five themes, selected through expert surveys and
  consultation with more than 500 policy stakeholders.
- **It refuses to build a composite index**, and cautions against reading
  inter-indicator correlations as redundancy. This is the single most important
  design decision for an observatory under pressure to produce one number.
- The 2025 update adds a systems layer absent from most dashboards: qualitative
  analysis of how indicators interact, with expert elicitation identifying
  governance and resilience indicators as the most connected across themes —
  and it is **explicitly labelled qualitative and expert-elicited**, living in a
  different analytical section from the measured indicators.
- Honest trend reporting: of 42 indicators with time series, 20 moved in a
  desirable direction since 2000 and 7 declined significantly
  ([FAO newsroom](https://www.fao.org/newsroom/detail/new-report-highlights-critical-food-system-trends-and-challenges-in-countdown-to-2030/en)).

### The practices to copy

- **Proxy honesty stated as such**: agriculture's share of GDP stands in for
  development level; rural unemployment stands in for agricultural labour
  markets.
- **Coverage asymmetry quantified**: diet-quality data cover only 41 mostly
  low- and lower-middle-income countries; no adult diet-quality data exist for
  Oceania.
- **Missingness analysed, not hidden**: missing data do not bias the overall
  ranking but implicitly weight thematic averages.
- **A named-gaps register**: no adequate food safety indicators exist;
  country-level food loss and waste data are missing; the true cost of food
  including externalities is not measured; livelihood indicators are thin for
  non-agricultural work and gender equity; governance gaps include policy
  coherence and food-system budget allocations.
- **Explicit "what this does not show" statements**: the rankings are
  descriptive baselines, not performance assessments; extreme top- and
  bottom-ranked countries are outliers that should not be treated as models;
  indicators do not prescribe actions; improvement in one domain does not carry
  to others; many indicators cannot separate food from non-food agricultural
  products such as fibres and biofuels. The paper also concedes against itself
  that its 10% functional-integrity threshold may be insufficient.
- **A vintage profile** for the whole indicator set: about 92.5% of points from
  2017–2022, 6.5% from 2010–2016, 1% from 2000–2009. Directly portable.

### Access and licence

No API or dataset download on the FSCI site; indicator data are accessed through
the Dashboard's CSVs. Site content is **CC BY-NC-SA 4.0**
([foodcountdown.org](https://foodcountdown.org/)) — note the non-commercial and
share-alike terms, which would restrict some reuse. The split between a thin
front website and data hosted elsewhere is a failure mode to avoid.

---

## 11. UK Food Security Report, and its companion publications

**The three-publication architecture is the most important finding here.** Defra
now runs:

- the **UK Food Security Report 2024**, published 11 December 2024 as Official
  Statistics under section 19 of the Agriculture Act 2020, updated at least
  every three years
  ([contents](https://www.gov.uk/government/statistics/united-kingdom-food-security-report-2024/united-kingdom-food-security-report-2024-contents),
  [introduction](https://www.gov.uk/government/statistics/united-kingdom-food-security-report-2024/united-kingdom-food-security-report-2024-introduction));
- the **UK Food Security Digest 2025**, first published 11 December 2025, an
  annual intercalary publication
  ([digest](https://www.gov.uk/government/statistics/united-kingdom-food-security-digest-2025/united-kingdom-food-security-digest-2025));
- the annual **UK Food Security Index**, first released 2024
  ([index](https://www.gov.uk/government/publications/uk-food-security-index-2024/uk-food-security-index-2024)).

The split is the design: **the UKFSR declines to judge**, providing no
ministerial or government positions and leaving overall judgements to the
reader; **the Index does judge**, rating each indicator and the overall picture
on a defined scale from "broad reduction in risks" to "broad increase in risks"
(2024: "broadly stable"), and it explicitly contains policy positions. The
evidence base and the government's assessment are in physically distinct
documents. That protects the indicator base's credibility when the assessment is
contested.

### The three-part indicator template — the best structural idea in this review

Every indicator has **a rationale, a "headline evidence" section on the main
dataset, and a "supporting evidence" section** adding context and longer
timeframes. This is a structural, not typographic, separation of *why we measure
this* / *what the data say* / *what else bears on it*, and it scales down: a
small team can fill three short fields per indicator far more reliably than it
can write narrative chapters.

### "What this does not show" — inline, specific, and exemplary

From Theme 3
([theme 3](https://www.gov.uk/government/statistics/united-kingdom-food-security-report-2024/united-kingdom-food-security-report-2024-theme-3-food-supply-chain-resilience)):

- Scope limits: "this indicator has not considered sustainability of these
  post-farmgate inputs".
- Named data gaps: a data gap on what proportion of plant protection products
  used in the UK are imported; pesticide data that make trend establishment
  difficult.
- Coverage boundaries: employment figures are Great Britain only; local
  authority resourcing data do not represent average annual workforce.
- **Measurement-threshold exclusions**: abstraction licences are not required
  below 20 cubic metres a day, so small agricultural users are not captured, and
  glasshouses and vertical farms on public supply are largely excluded.
- Theme-level scope exclusion: the report does not include data on contingency
  planning for these risks.

### Uncertainty — structurally handled, statistically not

There are **no confidence intervals or margins of error** for indicators in the
material fetched. What it does well instead:

- **Comparability flagging**: Scottish consumer survey results cannot be
  compared with the other nations because data collection differed; a shortened
  survey wave means not all results are directly comparable
  ([annexes](https://gov.uk/government/statistics/united-kingdom-food-security-report-2024/united-kingdom-food-security-report-2024-annexes)).
- **Noise discipline**: fluctuations in one biodiversity indicator are not
  treated as meaningful change; incident counts fluctuate for many reasons and
  do not reflect investigation length or complexity.
- **Framework-level coverage honesty**: no theme covers all six food security
  dimensions; social value is not covered at all and agency covered least often.

### Data age

A hard **declared cut-off**: the report covers data only up to the start of
October 2024, though it may point to newer data. Older indicators are shown with
their years stated and placed in longer trends, some graphs defaulting to 20
years. Consistency slips in places — one figure is titled "2023" while its text
covers 2010 to 2024.

The Digest exists precisely to handle recency: smaller in scope, produced
between UKFSR editions, designed to complement rather than replace it, focused
on data updated more often than the three-year cycle, and deliberately avoiding
repetition of frequently quoted statistics. It mixes vintages transparently —
CPIH to October 2025 while some household data run only to financial year ending
2024 — and flags one series as "official statistics in development".

### Indicator governance — the most underrated feature

**Annex I is a changes log** mapping 2021 to 2024 indicator numbers and names
and recording for each whether it was retained, enhanced, merged, removed or
new. **Annex II maps each indicator to its food security dimensions.** Selection
was shaped by workshops, a public questionnaire and an ongoing Expert
Elicitation Group, against criteria of data quality, relevance, added value, and
publication and peer review where possible, with some proposals dropped for poor
availability or to keep the set manageable
([annexes](https://gov.uk/government/statistics/united-kingdom-food-security-report-2024/united-kingdom-food-security-report-2024-annexes)).

### Scenario handling

Forward-looking content is confined mainly to climate analysis and isolated into
a dedicated annex: Annex III notes that scenario choice matters, explaining that
RCP8.5 has been the common worst-case policy benchmark while SSP5-8.5 is the
only SSP reaching those emission levels. **The weakness**: outside that annex
there is no formal scenario label — forward-looking content is marked only by
hedged language ("could", "likely", "may") and attributed projections. Hedged
verbs are a weak separation device.

### Plain language

Two Digest statements belong on the front page of any observatory: **individual
events rarely have a quantifiable food security impact on their own**, and
**food security cannot be reduced to a single metric**. Also worth copying: a
table of the year's events (port closures, cyber attacks, drought, avian
influenza housing measures), a summary across people, businesses and
international scales, a concrete consumer-scale anchor ("the cost of a coffee
break"), a standalone "How to read the UKFSR" section, and a glossary. Execution
is uneven: repeated long acronym expansions make the text dense in places.

### Access and licence

No API; figures carry source notes and chart-level data downloads. **Licence was
not verified** from the pages fetched — UK government content is normally Open
Government Licence, but that could not be confirmed, so it should not be assumed.

---

## 12. EU Food Security Crisis Preparedness and Response Mechanism, and the JRC stress-test framework

The only benchmark that has **operationalised stress testing as recurring
institutional practice**, and the closest existing analogue to a resilience
observatory.

### What it does well

EFSCM is an architecture, not a website: a Commission expert group created under
the 2021 contingency plan, bringing together national ministries from all 27
member states, about 15 non-EU countries with closely linked supply chains, about
30 stakeholder groups and about 16 observers, meeting about twice a year plus ad
hoc, convenable without delay in an emergency
([EFSCM](https://agriculture.ec.europa.eu/common-agricultural-policy/agri-food-supply-chain/ensuring-global-food-supply-and-food-security_en)).

Its output portfolio is a standing one: three sets of recommendations; six
qualitative "State of Food Security in the EU" assessments based on bi-annual
member surveys, the latest May 2026; three annual activity reports; a JRC
risks-and-vulnerabilities study; a national preparedness survey; and a 2025
screening of whether earlier recommendations were implemented. A July 2025
meeting covered "Towards an annual stress test for the EU food sector".

### The stress-test framework

Magnuszewski, P., Hegadorn, C., Szewczyk, K., Bertolozzi Caredio, D., and
Ciaian, P. (2026). *Operational framework for stress testing EU food security*.
Publications Office of the European Union, for the Joint Research Centre.
JRC145765, EUR 40675. ISBN 978-92-68-38842-6.
<https://doi.org/10.2760/5895818> — **DOI verified, resolves**
([repository record](https://publications.jrc.ec.europa.eu/repository/handle/JRC145765)).

The method uses a multidimensional food-security view covering availability,
physical and economic access, nutritional utilization, stability, sustainability
and human agency; combines systems thinking with scenario-based foresight; and
proceeds by **mapping complex supply chains, designing plausible disruption
scenarios, and evaluating how impacts cascade through the system** — iteratively,
with experts supplying analytical rigour and stakeholders supplying sectoral
knowledge. Only the repository abstract was read, not the full PDF, so the
specific indicators and named shock scenarios are unverified.

### Separation of evidence — the clearest institutional separation found

EFSCM physically separates three registers into three products: a **monitoring**
section of datasets updated annually or less often; an **alerts** section of
datasets and external alert sources updated monthly or weekly; and a
**qualitative assessment** of the agri-food sector
([dashboard](https://agridata.ec.europa.eu/extensions/DataPortal/food-supply-security.html)).
Measured monitoring, fast-moving signals and expert judgement are not mixed, and
each tier declares its own cadence.

### The weak flank

The dashboard page states **no caveats, no per-dataset timestamps, no indicator
list, no downloads or API, and no licence** — only a general update frequency per
section. Do not copy that silence.

---

## 13. USDA ERS — food security data and the Agricultural Baseline

Included for its **documented statistical discipline** and its clean
institutional separation of measurement from projection.

### A written quality standard the agency binds itself to

ERS data product quality standards require that, where statistically
appropriate, products report accuracy measures alongside the data, with
estimates and projections reporting forecast error and survey programs
reporting sampling and nonsampling error where practicable; that products tell
users about strengths and limitations including sources of error and degree of
reliability; that documentation cover data source, production method, item
definitions, variables, error sources and applicable limitations; and that where
a product's data resemble other federal data, **it needs a user guide explaining
the differences**
([standards](https://www.ers.usda.gov/about-ers/policies-and-standards/data-product-quality/ers-data-product-quality-standards)).

Note the gap between standard and practice: on the food security data product
page itself, standard errors and margins of error are not explicitly mentioned
([food security data](https://www.ers.usda.gov/data-products/food-security-in-the-united-states.aspx)).

### Data age — the strongest recency discipline found

The standards require that routine updates be publicly reported and **the next
release date appear on the product's overview page**; that release schedules be
published the calendar year before release; that significant changes get advance
notice; that premier products provide update and revision history; and that
products offer archival access to five years of data. In practice the food
security page shows an "Updated" date with per-file "Last Updated" dates.
**Publishing the next release date is the move almost nobody else makes.**

### Forward-looking content, rigorously fenced off

The ten-year Agricultural Baseline rests on neutral assumptions about
macroeconomy, policy, weather and international developments, with smoothed
macroeconomic inputs, no recessions or booms, and policy generally assumed
unchanged from current law. Baseline and forecast are defined against each
other: baselines address longer-term underlying trends under those assumptions;
forecasts cover about one to two years and add information departing from them
([baseline Q&A](https://ers.usda.gov/topics/farm-economy/agricultural-baseline/questions-answers)).

The disclaimers are model text: **the projections are not predictions of actual
outcomes and assume no shocks**; they do not reflect recessions, booms or policy
changes beyond current law; they are one plausible scenario for the next ten
years, serving as a neutral basis for comparing alternative policies — not a
probabilistic forecast, and **confidence intervals and probability ranges are
not provided**.

Measured versus projected is handled by provenance: historical supply and demand
figures from the October WASDE report serve as the projections' starting point
([documentation](https://www.ers.usda.gov/data-products/agricultural-baseline-database/documentation)).

### Honest disclosure of its own gaps

Some international livestock data are missing, so FAOSTAT supplements certain
country-commodity pairs, and **the 2026 international trade analysis through
2035 was not conducted and will not be published**. Publicly announcing a
product you failed to produce is a transparency practice worth adopting.

### Licence

**Not stated** on either page; only a recommended citation. Users should check
Census Bureau terms for the microdata.

---

## 14. Global Food Security Index — included as a negative benchmark

The most widely cited national food-security composite, and the design most
likely to be demanded of this observatory. It should be studied in order to be
refused.

It measures food security across 113 countries, first published 2012, with 18
parameters grouped into Affordability, Availability, Quality and Safety, and
Sustainability and Adaptation
([overview](https://en.wikipedia.org/wiki/Global_Food_Security_Index)).
**Its current status could not be verified**: no official GFSI site was reached,
and the newest edition confirmable from the source consulted is 2022.

The peer-reviewed sensitivity analysis is: Izraelov, M., and Silber, J. (2019).
An assessment of the global food security index. *Food Security*, **11**(5),
1135–1152. <https://doi.org/10.1007/s12571-019-00941-y> (Crossref confirms
volume, pages and date; the doi.org resolver returned HTTP 429, a publisher rate
limit, not a resolution failure).

**Be careful how this paper is used: it is broadly favourable**, concluding that
both the weights and the indicator choice give a reasonable ranking. The usable
cautions are that expert-panel weights may be decisive for rankings; that
rankings are sensitive to the indicator list, which differs from FAO's; and that
**the first principal component explains only 35–47% of variance**, which limits
how much any single index can summarise
([article](https://link.springer.com/doi/10.1007/s12571-019-00941-y)). Only the
preview and appendices were accessible, not the full text.

Reported criticisms that **were not independently verified**: that imports play
the largest role in index scores, so developing countries with large
agricultural workforces score lowest while the United States and Singapore rank
highest despite little agriculture. The underlying sources were not fetched.

That 35–47% figure is the citable reason to publish a scored *profile* rather
than a single rank, consistent with FSCI's refusal to build an index.

---

## 15. Statistics Canada — the observatory's own upstream supplier

Its conventions, cadence, licence and API constrain everything downstream.

### What it does well

Food insecurity is measured with the **Household Food Security Survey Module**,
18 questions on the previous 12 months, classifying households as marginally,
moderately or severely food insecure, with annual estimates from 2018 to 2024
sourced to table 13-10-0835-01 — the table the observatory already uses
([Quality of Life Hub](https://www.statcan.gc.ca/hub-carrefour/quality-life-qualite-vie/prosperity-prosperite/food-security-securite-alimentaire-eng.htm)).

**Source-discrepancy honesty is the most useful convention here**: the page names
two surveys — the Canadian Income Survey and the Canadian Community Health
Survey — and warns that estimates can vary between data sources because of
differences in reference periods, populations and methodology. There is no
explicit "what this does not show" statement, and no confidence intervals on the
Hub page, and **no next-release date** — a clear gap against ERS practice.

### Machine access

Statistics Canada offers a **Web Data Service** including SDMX REST services for
time series; a **Delta File** of all data and metadata released each business
day, preferred for large updates; full table downloads as CSV or SDMX-ML with
metadata; Reference Data as a Service for codesets and classifications;
indicator JSON services; a **release-schedule JSON service** for major economic
release dates; and real-time tables with revision histories for 19 series
([developers](https://www.statcan.gc.ca/en/developers)). Registration
requirements and rate limits are not stated.

The release-schedule service is immediately useful: it can auto-populate a "next
expected update" field per indicator, which is the ERS practice nobody else
copies.

### Licence — the best position in this review, with conditions that bear on design

The Statistics Canada Open Licence is worldwide, royalty-free and non-exclusive,
permitting use, reproduction, publication, distribution or sale of the
Information and of Value-added Products, with sublicensing on consistent terms
([licence](https://statcan.gc.ca/reference/licence)). The conditions that matter
here:

- Reproduce accurately and do not misrepresent the Information or its source.
- Do not suggest Statistics Canada endorses you.
- **Do not merge or link the Information with other databases to identify any
  person, business or organization** — this limits microdata joins.
- **Do not use Statistics Canada's name, crest, logos or Government of Canada
  symbols** without Treasury Board Secretariat authorization — this governs the
  observatory's visual design.
- Attribution is specific and should be a per-indicator metadata field: on
  licensed Information, a source notice naming Statistics Canada, the product
  name and the reference date, stating the material is reproduced "as is" with
  permission; on Value-added Products, an **"Adapted from Statistics Canada"**
  notice with product name and reference date plus a non-endorsement statement.
- The Information is provided "as is" with no warranties, and the licence may be
  modified at any time, with use governed by the version in force when the
  Information was accessed.

A product named "Canadian Food Flows" **could not be confirmed to exist**. The
nearest products found were the "Food available for consumption" / Food
Availability program (record 3475) and the "Food production and availability"
subject page, neither of which was fetched.

---

## 16. Canada's Food Price Report — the closest structural analogue, and a cautionary one

The only benchmark produced by the kind of body this observatory is: a small
university team publishing annual forward-looking national food-system analysis
in Canada. The 16th edition was produced by the Agri-Food Analytics Lab at
Dalhousie with contributors from Guelph, Saskatchewan, Alberta, Laval, Saint
Mary's, Cape Breton and Prince Edward Island
([report PDF](https://cdn.dal.ca/content/dam/dalhousie/pdf/sites/agri-food/FINAL%20E%20low.res%20DAL_PRICE_REPORT_2026.pdf)).

### What it does well

- One documented method across all categories, with **model triangulation**:
  Temporal Fusion Transformer, AutoETS, ARIMA and DeepAR, run in two Python
  libraries to check consistency, with inputs including Statistics Canada food
  CPI, an ENSO climate index, the USD-CAD exchange rate, a produce price index
  and a global uncertainty index, trained on 2008 to August 2025 data, each
  category's forecast being the average of the models' median values.
- **It scores its own past forecasts.** A "Looking Back" section compares 2025
  forecasts with observed CPI: the total fell within range, meat and "other" ran
  above, fruit and vegetables below.
- **It labels the weakest evidence as weak**: the provincial tables are
  explicitly directional, based on regional knowledge rather than precise
  forecasting.
- Assumptions on the user-facing number are disclosed: household estimates
  assume 5% food waste and exclude delivery fees, service charges and special
  diets.

### Where it fails — the failure modes to design against

- **Uncertainty is doubly described and therefore undefined.** A table gives an
  anticipated change range *and* a "±" value per category, with a footnote
  describing the ± as one standard deviation, while the text describes the
  ranges as best- and worst-case scenarios. The relation between the two is
  never explained and **no confidence level is stated**.
- **Internal inconsistency in headline figures**: the executive summary cites a
  4% in-store rate while a table shows 3.4%; dairy at 1.9% is described as
  within a 2–4% range.
- **Derived values mislabelled as observed**: the 2025 household figure is
  labelled "observed" but is calculated from CPI changes, not measured
  spending. This is exactly the measured/modelled boundary violation an
  observatory must avoid.
- **Headline derived from the pessimistic tail**: the widely quoted household
  cost estimate applies the *top* of the forecast range to 2025 costs.
- **No back-test history** across past editions, and **no data or code release**.

---

## What transfers to Canada, in priority order

Ranked by value to this observatory against the effort of building it. Each
item names the source it comes from.

### Build first

**T1. Replace the min-max screen's framing with a published anomaly statistic.**
Implement the FAO IFPA (§1) for price series: standardised growth rather than
level, γ = 0.4, thresholds at 0.5 and 1.0 standard deviations, five years
minimum, deflated prices, no imputation. It directly answers audit A1, it is a
UN SDG indicator with published metadata, and the observatory already deflates
its Canadian-dollar prices. **Improve on GIEWS by showing the computed value
next to the level**, which GIEWS does not.

**T2. Wire assumptions to indicators, which nobody does.** Build FEWS NET's
Scenario Summary Table (§2) as a real object — one row per assumption with
magnitude, timing, duration and source — and give each row a key to the
indicator that would falsify it plus a numeric breach condition from T1. A
crossing then marks the dependent scenario "assumption breached, under review".
IPC asks analysts to do this by hand in Step 11 (§4); FEWS NET leaves it to a
monthly analyst cycle with no formal trigger. This is the bridge, and it is the
answer to audit A2/B1.

**T3. Adopt the UKFSR three-part indicator template** (§11): rationale, headline
evidence, supporting evidence. It separates purpose from measurement from
interpretation structurally, and three short fields per indicator is a load a
small team can actually carry. It maps onto the four questions the brief
requires.

**T4. Put staleness on the indicator, and state your late-feed policy.** Combine
GIEWS's single prominent Reference Date and "updated in the past 60 days" badge
(§1), AMIS's per-input cut-off lines (§3), the Dashboard's hard staleness
exclusion rule (§9), and AMIS's practice of flagging notional values rather than
dropping them (§3). Answers audit C1 and C3.

**T5. Write triggers as conditional sentences with a named next action**, as the
FEWS NET East Africa alert does (§2): the governing assumption, the spread of
that assumption, and the specific change that would re-open the analysis.

**T6. Model transmission as a cascade whose stages are evidence, not severity.**
This is the answer to "how a shock could pass from one link of the chain to the
next", and it comes from the European Drought Observatory's Combined Drought
Indicator (§6): rainfall deficit → soil moisture → vegetation, where **the class
depends on the indicators now and on the class in the previous period**, plus
explicit *temporary recovery* states for improvement within an episode that has
not closed. ASAP reaches the same place differently (§5): level 1 for one
signal, level 2 for another, level 3 where they converge, "+" for stronger
convergence, level 4 for the end of the season when the loss is irrecoverable.

For a food chain of inputs → farms → transport → processing → stores, a stage
says *how far along the chain the evidence has reached*, which is exactly what
the observatory's four-column overview already gestures at without measuring.
The event memory matters as much as the ladder: without it the stage flickers
between updates and the reader loses any sense that a disruption is one
continuous thing. Keep the whole cascade computable from the published release
so an archived day says the same thing a year later.

**T7. Scale the deterioration threshold to the baseline** (§7). WFP calls a
region "deteriorating" on a relative rise of +15% where prevalence is above 40%,
+20% between 20% and 40%, and +25% below 20% — a larger change required where
the baseline is smaller. That is a one-line fix for the commonest false-alarm
pathway in small-number series, and it is directly relevant to the Prairie
drought shares and the work-stoppage counts. Fit the bands to the observatory's
own distributions rather than importing these numbers.

### Build next

**T8. Score every ingested series on an M × T reliability grid** (§4) and let
the resulting level **gate what the site may publish** — direction only at the
lowest level, indexed values next, absolute quantities only at the top. This is
the most defensible way for a small team to publish early without over-claiming,
and it is better than hedging prose.

**T9. Keep an R0 class** (§4) for key-informant notes and media reports:
visible in the narrative, explicitly ineligible to count toward any computed
indicator. The observatory's `ongoing.yml` entries are close to this already;
the missing piece is the explicit ineligibility.

**T10. Give every scenario and every curated entry an expiry date and a maximum
validity** (§4: IPC caps at 12 months), and let expired items visibly expire.
`ongoing.yml` already has `review_every_days`; what is missing is the maximum
and the hard stop.

**T11. Add a persistence counter beside any status** (§3): days or weeks at the
current level. "Unusual for the time of year, and has been for eleven months"
is a different statement from "newly unusual", and the observatory currently
cannot tell a reader which it is.

**T12. Separate state from cause in every legend** (§3, GEOGLAM): conditions as
one axis, drivers as another, and show only the less-than-favourable cases.

**T13. Publish a vintage profile** of the whole indicator set (§10) and a
**named-gaps register** (§10). The observatory's "remaining research needs"
section is the right place.

**T14. Keep refusing a composite index** (§10, §14), and keep the citation ready:
the first principal component of the GFSI explains only 35–47% of variance. The
observatory's existing rule "No single risk score" is correct; it now has an
empirical defence.

### Worth adopting, cheap

**T15. One bounded tail-risk statement type**, modelled on IPC's Risk of Famine
(§4): a statement rather than a classification, no quantities, its own symbol, a
lower evidence bar, a requirement to test whether the assumed shocks could
realistically coincide, and **a mandatory negative statement when no risk is
found** so silence does not read as reassurance.

**T16. Publish a release calendar in advance** (§1) and a **next expected update
date per indicator** (§13), auto-populated from Statistics Canada's
release-schedule JSON service (§15).

**T17. Keep a changes log and a coverage map** (§11, Annexes I and II): what each
indicator was called before, and what the observatory cannot cover. Converts a
weakness into a research agenda.

**T18. Rate each indicator against your own previous statement**, not only
against history (§3, easing / neutral / tightening). Near-free accountability.

**T19. Mark incomparable comparisons** with an explicit flag (§2, the asterisk
convention) — directly relevant to the Prairie drought series, which has at most
three comparison years (audit A3).

**T20. Encode the Statistics Canada attribution strings as a required
per-indicator field** (§15): product name, reference date, and "as is" or
"Adapted from Statistics Canada" plus non-endorsement. Two design constraints
follow: no record linkage for identification, and no use of Government of Canada
symbols.

**T21. Two sentences for the front page** (§11, the Digest): individual events
rarely have a quantifiable food security impact on their own, and food security
cannot be reduced to a single metric.

**T22. Code every absence explicitly, with a distinct code per reason** (§5, §8).
ASAP distinguishes *off season* from *structurally excluded*; the Crop Monitor
distinguishes *out of season* from *no data* and carries grey-for-out-of-season
into its charts. Never a blank, never a bare dash — HungerMap's undefined dashes
are the counter-example (§7). The observatory already has
`insufficient_data`; what it lacks is a distinction between "not enough past
years to compare" and "the source has stopped publishing".

**T23. Require a driver tag on every reading that is not normal** (§8). The Crop
Monitor's mandatory attribution — wet, dry, hot, cool, extreme event,
delayed-onset, pest and disease, socio-economic, conflict — is what makes a
monitoring record usable for causal analysis later. The observatory currently
asks "is this unusual?" and never records a candidate reason, so the archive
cannot be mined. A Canadian set might be excess moisture, drought, heat, frost
or winterkill, extreme event, delayed seeding, pest and disease, market or
policy, transport or processing disruption.

**T24. Publish the override rate between the automatic and the curated tier**
(§5). ASAP's monthly record carries the count of sub-national units under
automatic warning beside the expert verdict, which makes the override auditable.
The observatory's `ongoing.yml` entries and the threat register's warning levels
are a curated tier with no such record; adding one would turn a fair criticism
into a published statistic.

**T25. Gate any forward-looking layer on measured skill** (§5), and expect the
honest outcome. ASAP suppresses a seasonal forecast warning where the skill score
is at or below zero, and gates it on phenology so a forecast counts only inside
the growing season. For Canada the equivalent gate is seasonal precipitation
forecast skill over the Prairies and southern Ontario, which is low — so be
prepared for the result that there is no defensible forecast layer at all. That
is a finding, not a failure, and it belongs in remaining research needs.

**T26. Mark provisional data as provisional in the artefact itself** (§6). The
drought observatory suffixes provisional files `pNN` and final files `zMM`,
embeds the method version in the filename, and keeps a changelog saying which
date ranges belong to which version. The observatory's releases are already
versioned and checksummed; what is missing is a per-value maturity flag, which
matters because several sources revise recent weeks (PortWatch says so in its
own `does_not_show` text).

**T27. Add the institutional disclaimer Copernicus uses** (§6): the data are for
information only and are **not an early warning, which only the competent
authority is authorised to issue**. The observatory says it is "not an official
alerting system", which is close — but the Copernicus phrasing names *who* may
issue one, and in a Canadian setting where ECCC, CFIA, AAFC, provincial
ministries and conservation authorities hold statutory mandates, that sentence
does real work.

### What does not transfer

- **Thresholds calibrated to subsistence crises**: IPC's Famine thresholds and
  the worst-off-20% household unit presume livelihood-zone baselines Canada
  lacks (§4).
- **Consensus governance**: IPC Technical Working Groups and the Famine Review
  Committee, AMIS's Rapid Response Forum with member-government submission,
  EFSCM's 27-state convening and emergency authority, FSCI's 500-stakeholder
  consultation, Defra's Expert Elicitation Group.
- **Production cadence at scale**: FEWS NET's three outlook cycles a year with
  country analysts; IPC's one-to-three-month analysis cycle per country.
- **Bespoke global remote-sensing pipelines**: rebuilding ASIS is out of reach,
  and FAO itself notes resolution refinement is noisy and that NDVI and
  precipitation layers cannot be redistributed (§1). The same goes for ASAP's
  dekadal raster pipeline, which needs a five- or six-stage consolidation filter
  with per-stage quality flags, forecast substitution for late reanalysis, and
  preliminary-versus-final rainfall handling (§5). Consume finished products and
  spend the effort on the classification logic instead.
- **A near-real-time survey operation**: HungerMap's measured tier rests on live
  call centres and a large analyst network (§7). Canada's equivalent anchor data
  are administrative and sectoral, not survey-telephonic.
- **Machine-learning nowcasting of food insecurity**, at least for now (§7). The
  published performance split is the governing fact: R² falls from 0.71 to 0.48
  when no past survey data exist for the unit, and Canada has no high-frequency
  household food-security survey at sub-provincial resolution to anchor
  against — so the observatory would be operating permanently in the weaker
  regime. If it is ever attempted, do what WFP's method does and its product
  does not: compute the intervals *and show them*, and carry the
  measured-versus-predicted distinction into every table, chart and field.
- **A composite risk index** on the RDrI-Agri pattern (§6), tempting because it
  formally includes exposure and vulnerability. Its own factsheet concedes the
  scores are relative not absolute, carry propagated input error, rest mostly on
  country-level vulnerability data that misses within-country variation, and
  publish no classes or thresholds at all. For sub-provincial Canadian units the
  heterogeneity problem would be worse, not better. See also T14.
- **A closed or authenticated API** (§7): it presumes an institution that can run
  credential issuance indefinitely, and it defeats the main reason a university
  observatory is worth funding.
- **Breadth**: 300 indicators across 230 countries (§9). Design for 20–40
  indicators each with a complete and honest metadata record.
- **Statutory standing**: the UKFSR's parliamentary mandate (§11).
- **Patterns to actively avoid**: licence silence (§9, §12, §13); two coexisting
  uncertainty metrics, headline figures drawn from a range's upper bound, and
  labelling CPI-derived values "observed" (§16); a gated API when the same data
  are available openly elsewhere (§4); and GIEWS's no-fixed-cadence posture,
  which is tolerable for FAO and corrosive for a small team because it hides
  staleness (§1).

---

## Verification gaps

Recorded so that nothing here is mistaken for more than it is.

**Pages that failed or returned nothing usable:** the GIEWS top-level landing
page (fetch refused, so GIEWS findings come from sub-pages); two IPC country
reports and the IPC technical-development page (client errors — **so no IPC
display claim here comes from a real published analysis**, only from the manual
and the Risk of Famine note, and "3.1 is the latest manual" rests on two
corroborating sources rather than a release-notes page); the current AMIS site
and its policy database (client-rendered, HTML shell only — **so AMIS's current
databases, download formats, licence terms, governance and whether the 2016
early-warning indicators are live are all unverified**); the legacy AMIS home
(served November 2024 cached content); the Food Systems Dashboard root and one
indicator detail page (allowlist); and the HTML versions of both *Nature Food*
papers (allowlist; worked around via the PDF and Crossref).

**Partial reads.** The IPC Technical Manual was read at three offsets of about
500,000 characters, with the final ~40% unread, so late annexes may contain
evidence-level material not seen here. FEWS NET's scenario guidance was read to
100,000 of 151,019 characters, which means **Annex II, the blank Scenario
Summary Table template, was truncated and not seen** — T2 above is built from
the guidance text describing it, not from the template itself. The price
projections guidance was read to 100,000 of 294,483. The UKFSR introduction,
Theme 3, the 2025 Digest and the *Nature Food* 2023 PDF were all read in part
only. The JRC stress-test framework was read as its repository abstract, not the
full PDF.

**Not verified, stated as such:** whether IPC's API exposes projections as well
as current classifications; IPC API licence and attribution terms; a
machine-readable licence for FPMA price series; any platform's explicit
late-or-missing-feed display policy (T4 is assembled from observed behaviour,
not a stated rule anywhere); whether FAO's Market Sentiment Index was ever
operationalised; the Global Food Security Index's current status, methodology,
uncertainty treatment and licence; the EU dashboard's indicator list,
timestamps, caveats, API and licence; UK government licence terms on the UKFSR
pages; Statistics Canada WDS registration requirements and rate limits; whether
the Food Systems Dashboard has an undocumented API; and the existence of a
Statistics Canada product named "Canadian Food Flows".

**Reported but not independently checked:** the criticisms of the GFSI
attributed to Baryshnikova et al. (2019) and Maricic et al. (2016) — neither
source was fetched, and the attribution of one critique to *Science* is itself
unclear on the page where it was found.

**From the operational systems (§5 to §8), also unverified:** how the rebuilt
2026 HungerMap labels nowcasts, data age or confidence intervals on screen (the
reports document the measured/predicted split, but no such strings appear in the
production JavaScript bundle and the data API is authenticated); whether Crop
Monitor crop-condition classes are available as machine-readable data (the
dashboard and tools sites could not be reached); the drought indicator's full
class-transition table, Table 2a, whose text did not extract — the trigger
thresholds and class list above are verified, the state machine is not; WFP's
current price-forecasting method and whether it publishes prediction intervals
(the 2014 ALPS thresholds are verified, the 2025 successor document was not
opened); and why ASAP's machine-readable hotspot layer returned dates about two
months behind its own website and its HDX mirror.

**Internal inconsistencies observed in sources, reported rather than resolved:**
ASAP's v8.0 classification scheme gives the national minimum area as 250 km² in
text and 1,000 km² in its own Table 3; its live feed still labels the biomass
indicator by its superseded name; its HDX record still links the 2019 v4.0
scheme while the system runs v8.0; and two official Commission pages disagree
about whether the current Combined Drought Indicator methodology is v3 or
v4.1.1. The lesson taken into the plan is to build a consistency check between
the documentation and the production code, not to assume published tables agree
with running systems.

**DOIs from the operational systems**, all verified to resolve with matching
metadata: 10.1016/j.agsy.2018.07.002, 10.3390/rs15174284,
10.5194/essd-18-309-2026, 10.1016/j.cliser.2023.100434,
10.1088/1748-9326/ad6a71, 10.1038/s43016-022-00587-8,
10.5281/zenodo.15850408 and 10.1038/s41597-023-02047-9.

**DOIs.** Five were verified to resolve with metadata confirmed through
Crossref: 10.1038/s43016-023-00885-9, 10.1038/s43016-024-01109-4,
10.1016/j.foodpol.2021.102163 (metadata only; paper not read),
10.1007/s12571-019-00941-y (resolver rate-limited, article page and Crossref
record both resolved), and 10.2760/5895818.
