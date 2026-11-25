# Redesign plan

Written 24 November 2026 from `docs/audit.md` and `docs/benchmarking.md`.
Item codes `A1`, `C2`, `D1` refer to the audit; `T1`–`T27` to the benchmarking
transfers.

Ranked by value to a decision-maker against effort and risk. "Value" means: does
it change what a reader can actually do with the site? A change that makes the
site look better but leaves a mid-level official no better placed to act ranks
low here however cheap it is.

---

## The problem this plan is trying to fix

A reader can get three things from the site today: a set of official figures
compared with past years, a list of threats with the team's concern ratings, and
a set of what-if tests that show acting early is cheaper than waiting. What they
cannot get is the one thing that connects them: **is any of this happening now,
and how would I know?**

Two specific failures block that.

The screening label, which is the site's only answer to "is this unusual", fires
on 44% of historical periods and on 13 of 20 indicators today (A1). It cannot
discriminate, because a min-max rule over five years has a 33% false-positive
rate by construction.

And the what-if tests are sealed off from the live data by design. Their warning
signs are fixed model days, and the site tells the reader outright that "the test
does not use these figures" (A2). So the site can say a shock is under way and
separately that acting early would save money, and never join the two.

Everything in priority 1 below exists to fix those two things. Everything else
is in service of it or is a correctness fix.

---

## Priority 1 — connect what is watched to what could happen

### P1. Two screens, honestly labelled, with the frame chosen per indicator

Fixes A1, A3, A8, F1. Transfers T1, T7, T9, T22.

**What changes.** Every indicator gets two screens instead of one, and the site
stops calling either of them "unusual" on its own.

1. **The level screen** — the existing `reference_state` rule, unchanged in
   code. Its label changes from "Unusual for the time of year" to a statement of
   fact: *"Highest of the six comparable readings"* / *"Lowest of the six"*. Its
   false-positive rate is published next to it, in words: with five comparison
   years, the highest or lowest reading happens about one year in three by
   chance alone.
2. **The pace screen** — new. Standardised growth rather than level, following
   FAO's Indicator of Food Price Anomalies, the method behind UN SDG indicator
   2.c.1 (`docs/benchmarking.md` §1). Growth over the latest quarter and the
   latest year is each standardised against the mean and standard deviation of
   that same calendar period across earlier years, then combined with the
   published weight γ = 0.4. Graded, not binary: **normal** below 0.5 standard
   deviations, **above the usual pace** from 0.5 to 1, **well above the usual
   pace** at 1 and over, and the mirror image for falls.

**Why standardised growth.** Differencing removes a steady trend and the annual
season, which is exactly what defeats the level screen: the farm input price
index rises steadily, so every quarter is a new five-year high and the level
screen flags 100% of them. On the site's own history, a trend-removed screen
cuts the pooled flag rate from 48% to 23% and takes farm inputs from 100% to 0%.

**Why not a single rule for everything.** On bounded share series it is wrong.
US drought extent goes from 0% flagged on the level screen to 83% on the change
screen, because the share itself swings between seasons. So the **headline frame
is a per-indicator setting in `config.yml` with a stated reason**, one of:

| Frame | For | Chosen because |
|---|---|---|
| `pace` | trending indices and prices | the level is almost always a new high; the question is whether it is moving faster than usual |
| `level` | bounded shares, counts, ratios | the level is the quantity of interest and does not trend |
| `both` | series where either matters | reported as two separate statements, never merged |

Both screens are always computed and published; the frame decides which one the
headline sentence leads with and which one feeds P2.

**Plus a persistence count** (T9). "Above the usual pace, and has been for
eleven months" is a different statement from "newly above the usual pace", and
the site cannot currently tell a reader which it is. The pipeline counts
consecutive periods in the current state and the card says so.

**And a scaled deterioration rule** (T7) for the small-number series. A relative
move counts as a deterioration only if it exceeds a threshold that is larger
where the base is smaller, so the Prairie drought shares and the work-stoppage
counts stop firing on noise.

**Risk.** Medium. This changes what the site says about readings that are
currently labelled unusual, including in the archive going forward. Mitigated by
keeping the level screen's computation untouched, so every past statement
remains reproducible, and by back-testing both screens over the stored history
before the change goes in.

**Effort.** Moderate: one new module, one config block per indicator, tests.

### P2. A transmission cascade, and triggers tied to live readings

Fixes A2, B1. Transfers T2, T5, T6, T25.

This is the core of the work and the item with the most value to a
decision-maker. It has three parts.

**P2a. The cascade.** For each what-if test, the food chain is written out as an
ordered set of **stages**, each stage evidenced by named live indicators with a
team-judged threshold. The stage reached says **how far along the chain the
evidence has travelled**, not how bad things are:

| Stage | Means |
|---|---|
| `clear` | nothing along this chain is reading unusually |
| `pressure` | an upstream cost or supply signal has moved (world prices, sea lanes, drought) |
| `flow` | movement has been affected (rail, ports, shipments) |
| `buffer` | stored supply is being drawn down (grain stocks, inventories) |
| `household` | prices or access have moved (store prices, prices against wages) |
| `easing` | a stage was reached and its evidence has since returned to normal |

Modelled on the European Drought Observatory's Combined Drought Indicator
(benchmarking §6), which is the only published design found that answers "how
does a shock pass from one link to the next". Two features of it are kept
deliberately:

- **Memory.** The stage depends on the readings now *and* on the stage at the
  previous release. Without that the stage flickers between updates and the
  reader loses any sense that a disruption is one continuous thing.
- **Explicit easing states.** A chain that reached `flow` and has since cleared
  is not the same as one that was never affected, and the site must be able to
  say so.

Each stage also carries its **evidence count**, in the ASAP style
(benchmarking §5): how many of the indicators watched at that stage are
currently firing, out of how many. A stage reached on one of four indicators is
reported differently from one reached on four of four.

**P2b. Triggers.** Each what-if test's three warning signs — Watch, Get ready,
Act now — get a definition in terms of live readings: which indicators, at what
threshold, and how many of them must fire. Every threshold is labelled as the
team's judgement, because that is what it is: there is no validated Canadian
threshold for any of these, and inventing the appearance of one would be worse
than useless.

The model days stay. They are what the simulation needs. What changes is that
the test page now says, beside them, *which sign the live data currently
support, and on what evidence* — and when none is supported, says that plainly.

**P2c. What would change our mind.** Each test gets a standing block, following
FEWS NET's Step 8 (benchmarking §2): the one or two readings the conclusion
most depends on, and the specific change in each that would move the test to the
next sign. Written as a conditional sentence with a named next action (T5).

**What this deliberately does not do.** It does not feed live readings into the
models' parameters. The brief asks to show "the live indicators that would give
early warning" and "how a shock could pass from one link of the chain to the
next" — not to drive the simulation from the data. Driving a seven-parameter
illustrative model from live readings would manufacture precision the data
cannot support, and it would make the test's output change under the reader's
feet. The settings stay the reader's to set; the cascade is a separate, parallel
statement about what the data show. The site will say this in as many words.

**No forecast layer** (T25). ASAP suppresses a forecast warning wherever its
skill score is at or below zero. Seasonal precipitation forecast skill over the
Prairies is low, and the observatory has no skill score for anything else, so
there is nothing it could honestly gate on. The cascade reports where the
evidence has reached, never where it will reach next. This is recorded as a
research need, not quietly omitted.

**Risk.** Medium-high, and the highest in this plan. The thresholds are
judgement, and a reader may take a stage as a warning. Mitigated by: labelling
every threshold as the team's rating with the existing evidence label; naming the
indicator and reading behind every stage so the reader can check it; publishing
the whole cascade in the release so an archived day can be reproduced; and the
Copernicus disclaimer (T27) stating that this is information and not an early
warning, which only the responsible authority can issue.

**Effort.** Large. A new pipeline module, a config block per test, new page
sections, tests.

### P3. Every reading answers the four questions

Fixes B2. Transfers T3, T23.

Each indicator gains four fields alongside what it already has, on the UK Food
Security Report's rationale / headline / supporting pattern (benchmarking §11):

| Field | Question | Kind of claim |
|---|---|---|
| existing headline text | What is happening? | measured |
| `why_for_canada` | Why does it matter for Canada? | the team's reading |
| `what_next` | What could happen next? | points at the cascade and the what-if test |
| `to_consider` | What could decision-makers consider? | the team's reading, labelled as a proposal |

`why_for_canada` and `to_consider` are written text, held in config, carrying the
team's-rating label wherever they state a judgement. They are not generated. The
site already keeps `definition`, `how_calculated` and `does_not_show`; these
three sit beside them, and the four questions are shown in a fixed order on every
indicator page so a reader learns the shape once.

Also: **a driver tag** (T23) on any reading that is not normal — a candidate
reason from a fixed list (weather, input costs, exchange rate, transport,
demand, policy, measurement change, not established). Recorded as the team's
reading, defaulting to `not established`. Without it the archive cannot be
mined later for why anything moved.

**Risk.** Low, but it is the item most likely to slide into over-claiming. Every
field is labelled, and `to_consider` is phrased as something to weigh, never as
advice.

**Effort.** Moderate, mostly writing. The engineering is small.

### P4. Say plainly when a reading is late

Fixes C1, C3. Transfers T4, T22, T26.

The pipeline already computes source health; the indicator does not carry it.
After this change the indicator's own headline carries `age_days`, a `late`
flag and, when late, a sentence in the headline text itself: the source has not
published since the date shown, against how often it normally publishes. The
front end reads that flag instead of deciding lateness again from its own table,
which removes the divergence in C3.

Two distinct kinds of absence (T22), because they mean different things to a
reader: *not enough past years to compare* and *the source has stopped
publishing*. Today both collapse into `insufficient_data` or a bare date.

A **maturity flag** (T26) on any reading whose provider revises recent periods —
PortWatch says it does, in its own `does_not_show` text — so a value that may
change is marked as provisional rather than presented as settled.

**Risk.** Low. It can only make the site more honest.

**Effort.** Small.

---

## Priority 2 — correctness and robustness

### P5. Make PortWatch survive a transient provider error

Fixes C2.

ArcGIS returns HTTP 200 with an error object, so the retry logic never sees a
failure. The connector will retry on the error-object case with the same bounded
back-off `core.fetch` already uses, and give up only after the same number of
attempts. One transient hiccup should not take out both sea-lane and port
indicators and the live check on the only ongoing disruption.

**Risk.** Low. **Effort.** Small.

### P6. Connector tests against stored payloads

Fixes E2.

There is not one fixture test for any connector's parsing. A provider renaming
a column is currently caught in production, by the staleness flag, weeks later.
Fixtures will be cut down from the extracts already on the data branch — real
payloads, trimmed, with no credentials — for the connectors whose formats are
most likely to drift: the Grain Commission CSV, the InfoHort CSV, the Statistics
Canada WDS responses, PortWatch's ArcGIS JSON and the World Bank workbook.

**Risk.** None. **Effort.** Moderate.

### P7. Generalise the ongoing-disruption live check

Fixes B3.

Three things are hard-wired to the Hormuz entry: the sentence is built as "about
N ships a day" whatever the unit is; `still_showing` is true only when the
reading is *below* normal, so a disruption that raises a reading would be
reported as not showing; and the page caption always credits PortWatch. All three
become properties of the entry in `ongoing.yml`, with the direction that counts
as "still showing" stated per entry.

Also an **expiry** (T8): `ongoing.yml` has `review_every_days` but no maximum.
IPC caps an analysis's validity at 12 months. An entry past its maximum is
shown as expired, not merely overdue.

**Risk.** Low. **Effort.** Small.

### P8. The small correctness fixes

C5 (a failed builder produces an indicator with no question or definition, and
`role: "unknown"` drops it from the list while still counting it), E1 (a
`package.json` script pointing at a file that does not exist), E3 (six hardcoded
counts in prose beside data that will change — derive them), E6 (`--only CA-99`
refreshes nothing and exits 0), E4 (string surgery on an ongoing entry's title to
make a theme label), F5 (`screening_signal` defined and never used), F6 (the
suggested citation takes its year from the reader's browser clock).

**Risk.** None. **Effort.** Small each.

---

## Priority 3 — accessibility

### P9. A table view for every chart

Fixes D1. Required by the definition of done.

`IndicatorChart` already has a table toggle and a CSV download. `LineChart`,
which carries the site's central argument about acting early on seven test pages
and the decision game, has no text alternative at all beyond a one-line
`aria-label`. It gets the same toggle: the series values at each step, the
warning signs and the cost-by-start-day curve, as a real table.

### P10. The two contrast failures and the `aria-controls` gap

Fixes D2 (ghost button at 3.95:1 on the tinted panel, against the 4.5:1 AA
requirement for text below 18.66 px bold), D3 (muted text inside a pressed chip
at 2.28:1), D4 (`aria-expanded` with no `aria-controls`).

Also D5: run the page checks in dark mode as well, since the stylesheet ships a
full dark palette that no automated check has ever looked at.

**Risk.** Low, but D2 touches a shared colour token, so the fix is scoped to the
ghost button on tinted panels rather than applied to `--act` globally, which
would change every chart line.

**Effort.** Small.

---

## Priority 4 — content and framing

### P11. Lead the overview with the situation

Fixes F2, F3. Transfers T19, T27.

The first screen is currently three paragraphs about Canada's food system and a
"how to use this site" box; the first live figure is below them. The four steps
are a fixed decision and stay. What changes is the order of the first screen: the
state of the system first, the framing after it.

Two sentences from the UK Digest go near the top (T19): individual events rarely
have a measurable effect on food security on their own, and food security cannot
be reduced to a single number. The second one also defends the site's existing
"no single risk score" rule.

And the caveat that matters most — that nobody reviews the content before it is
published — moves out of the sixth bullet of the Limits section on the last
page. With it, the Copernicus disclaimer naming who may actually issue a warning
(T27).

### P12. Rename the `playbook` key

Fixes F4. The brief names "playbook" as jargon to avoid. No reader sees it, but
it is the key used throughout the models, the narrative module and the brief
output, and whoever maintains this next will see it constantly. It becomes
`agreed_in_advance`, matching the heading already shown on the page.

Risk: it is a key in generated legacy code. The extraction script and the
regression test both have to agree, and the regression test must keep passing
against the pinned legacy page, so this is a rename in the extraction layer, not
in the pinned reference.

---

## New sources

Two, both filling a gap that P2's cascade opens up, both through the Statistics
Canada Web Data Service pattern the pipeline already uses, both verified against
the live endpoint on 24 November 2026.

### CA-11. Grain supply and disposition, including stocks on farms

- **Provider and dataset.** Statistics Canada, table 32-10-0013, *Supply and
  disposition of grains in Canada*.
- **Endpoint.** `https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods`,
  product `32100013`. Verified: coordinate `1.1.18.0.0.0.0.0.0.0` returns all-wheat
  total ending stocks; `1.1.19...` stocks on farms; `1.1.20...` stocks in
  commercial positions; crop position 2 selects the crop (1 all wheat, 8 canola).
- **Licence.** Statistics Canada Open Licence,
  <https://www.statcan.gc.ca/en/reference/licence>. Already the licence of record
  for CA-04 and CA-08.
- **Update frequency.** Three times a year: stocks at 31 December, 31 March and
  31 July.
- **Delay.** About 70 days. Verified: the period ending 31 July 2026 was released
  on 9 October 2026.
- **Units.** Thousand tonnes (scalar factor 3), the same unit the Grain
  Commission indicator already uses.

**Why it fills a gap.** The grain-in-storage indicator covers commercial
elevators and port terminals only, and its own `does_not_show` text says so:
"Grain still on farms, which is most of Canada's grain". The verified figures
show how much that matters — at 31 December 2025, 25.1 of 28.5 million tonnes of
all-wheat stocks, 88%, were on farms. So the site's only grain buffer indicator
currently measures about an eighth of the buffer at its seasonal peak. The
`buffer` stage of the rail and drought cascades cannot be read honestly without
this.

It also **backstops the stale Grain Commission feed** (C1). When CA-05 has not
published for weeks, as it has not since 4 October 2026, the site will still have
a grain-stocks reading — three times a year, clearly labelled as a different
measure on a different schedule, never silently substituted.

**What it does not show.** Three readings a year cannot show a developing
disruption; it is a structural buffer measure, not an early-warning signal. The
survey is of farmers and of licensed commercial positions, so grain in transit
is counted in neither. Comparison years are few: three periods a year means the
five-year rule has at most five comparable readings per date.

### CA-12. Food manufacturing inventories and the inventory-to-sales ratio

- **Provider and dataset.** Statistics Canada, table 16-10-0047,
  *Manufacturers' sales, inventories, orders and inventory to sales ratios, by
  industry*.
- **Endpoint.** The same WDS method, product `16100047`. Verified coordinates,
  unadjusted, Canada: `1.8.1.3.0.0.0.0.0.0` ratio of total inventory to sales for
  food manufacturing (0.98 in September 2026); `1.9.1.3...` ratio of finished
  goods to sales (0.54); `1.7.1.3...` total inventory in dollars;
  `1.8.1.1...` the same ratio for all manufacturing as context (1.55).
- **Licence.** Statistics Canada Open Licence.
- **Update frequency.** Monthly.
- **Delay.** About 45 days. Verified: September 2026 released 13 November 2026.

**Why it fills a gap.** The processing link of the chain has one live indicator,
food recalls, which is a safety signal and not a buffer. The site's own stated
rule is to "watch what absorbs shocks, not only the shocks", and at this link it
currently watches neither. An inventory-to-sales ratio is a direct, published,
monthly measure of how much stock the food-processing sector holds relative to
what it is shipping — the `buffer` stage for the processing link, and the
indicator the cyber and workforce what-if tests have been missing entirely.

**What it does not show.** Dollars, not tonnes or days of supply, so it moves
with prices as well as with volumes. National and industry-wide, so it says
nothing about a single plant or region. It is a monthly average of
end-of-month positions, so a week-long disruption may not appear at all.

### Rejected after checking

- **A live animal-disease feed** (A7, the avian influenza gap). The CFIA's
  *Federally Reportable Diseases for Terrestrial Animals in Canada* is published
  as CSV under the Open Government Licence, which would be ideal — but the
  dataset ends in **2021**. There is no current, machine-readable, openly
  licensed count of infected premises. CFIA announcements already reach the site
  through the Government of Canada news feed (CA-07), which carries headline,
  date and link only. This stays a remaining research need; the pull request will
  record the dataset, its licence and the reason it cannot be used.
- **Anything needing a key or payment.** None was pursued, per the repository
  rules.

---

## Deliberately left out, and why

**A cropland mask for the Prairie drought shares (A4).** The three provincial
shares are measured over straight-line boxes south of 54° N, which include
forest, lakes and towns. AAFC's Annual Crop Inventory would fix it. Left out
because it changes the values of a published indicator, and doing that without
validating the new series against the old — on a series that has at most three
comparison years to begin with (A3) — would trade a documented approximation for
an undocumented one. Recorded as the first thing to do next.

**A composite score or index.** Tempting, and repeatedly requested of platforms
like this one. The site's existing rule, "No single risk score", is correct and
now has an empirical defence: the first principal component of the Global Food
Security Index explains only 35–47% of its variance (benchmarking §14), and the
Food Systems Countdown Initiative explicitly declines to build an index at all
(§10). The cascade in P2 is deliberately *not* a score: it says where evidence
has reached, and it does not add unlike things together.

**Machine-learning nowcasting.** Within reach technically. Left out because the
published performance of the one operational example falls from R² 0.71 to 0.48
when a unit has no past survey data (benchmarking §7), and Canada has no
high-frequency food-security survey at sub-provincial resolution to anchor
against — so the observatory would be operating permanently in the weaker
regime. A nowcast nobody can check is worse than an honest gap.

**A forecast or outlook layer.** See P2. There is nothing to gate it on.

**An evidence-reliability grid scoring every source** (T6). The right idea, and
IPC's method-by-time-relevance grid is the right shape. Left out of this branch
because it needs a judgement per source that should be made with the owner, not
on his behalf, and because P1 and P4 already deliver most of what it would buy
here. Recorded for the pull request.

**A revisions table, a vintage profile, a changes log, release-calendar
publishing, the Statistics Canada attribution strings as structured fields**
(T11, T14, T15, T16, T18, T26 in full). All cheap, all good, none of them
changing what a reader can do with the site this month. If the build runs short
of room they are the first to be cut, and they are listed in the pull request as
the obvious next increment.

**Code splitting the 493 kB bundle** (E5). Not a problem for this audience.

---

## Order of work, and what each step must not break

1. **P5, P8** — small correctness fixes first, so later work is not debugging
   around them.
2. **P6** — connector fixtures, before touching anything a connector feeds.
3. **P1** — the screens. Must keep `reference_state` byte-identical in behaviour,
   so every past statement stays reproducible. Back-test before and after.
4. **P4** — staleness, which P2 depends on: a cascade must never advance a stage
   on a reading that is months old without saying so.
5. **P2** — the cascade and the triggers. Must not change any model output;
   `tests/legacy-regression.test.ts` must keep passing untouched.
6. **P3** — the four-question fields and driver tags.
7. **P7** — the ongoing-disruption generalisation.
8. **P9, P10** — accessibility, then re-run the page checks in both colour
   schemes.
9. **P11, P12** — framing and the rename.
10. Newcomer re-read of every page, then the pull request.

Three things must be true at every step: `pytest`, `vitest` and `npm run build`
all pass; the pipeline still rebuilds offline from stored extracts without
crashing; and no page gains a console error or horizontal overflow at 1280 px or
390 px.
