# Redesign log, branch `redesign-2026`

**Read this file first in any new session.** It records what is done, what is
next, and the decisions made along the way with the reason for each. It is
written so that a session that has lost all other context can resume from this
file alone.

Working rule for this branch: when a choice is unclear, take the option that is
reversible and keeps the site honest, record it here, and carry on.

---

## Where to pick up

**Current stage: step 6 of 6 (pull request).** Steps 1–5 are done. The
definition of done is met: 80 pytest, 32 vitest, a clean `npm run build`, and
19 pages x 2 viewports x 2 colour schemes passing with no console errors, no
horizontal overflow and no axe violations.

Next actions, in order:

1. Push `redesign-2026` and open the pull request into `main`. **Do not
   merge it.** The owner reviews it.
2. If anything is still open after that, it is in "Remaining research needs"
   below, not in the build.

Nothing in the branch is half-finished. If a later session needs to change
something, start from the newcomer re-read notes in session 2 below, which
list what was read and what was left alone deliberately.

## Setup facts a new session needs

- Branch: `redesign-2026`, off `main` at `4405b12`. Never push to `main` or to
  the `data` branch.
- Git identity is already set in the clone: `bdzion
  <bdzion@users.noreply.github.com>`. Commits must carry no co-author,
  "generated with" or session lines.
- A real data release is checked out at `public/data/`, taken from the `data`
  branch (`git fetch --depth 1 origin data`, then
  `git archive FETCH_HEAD data | tar -x --strip-components=1 -C public/data`).
  It is release `20261124T1342Z`. `public/data` is gitignored; it is working
  material, not part of the branch.
- Rebuild the release offline, without touching any provider:
  `cd pipeline && python -m cfso.run --data ../public/data --offline`
- Refresh one source only: `python -m cfso.run --data ../public/data --only GL-03`
- Page checks and screenshots: `npm run build && python3 scripts/check-pages.py`
  (needs `axe-core`, already added as a devDependency, and Chrome).
- Tests: `cd pipeline && python -m pytest -q`; `npm test`; `npm run build`.

## Session 1 — 24 November 2026

### Done

- Created `redesign-2026`; set the git identity; installed dependencies.
- Established a green baseline before changing anything: 14 pytest, 11 vitest,
  `npm run build` clean.
- Pulled a real release from the `data` branch to develop against, so no work
  depends on hammering the providers.
- Wrote `scripts/check-pages.py`: loads all 19 reader-reachable pages in
  headless Chrome at 1280 px and 390 px, and records console errors, page
  exceptions, failed requests, horizontal overflow (naming the widest offending
  elements) and axe-core violations against the WCAG 2.0/2.1 A and AA rule
  sets; saves wide-view screenshots to `docs/screenshots/`. Added `axe-core` as
  a devDependency for this.
- Audited the repository and the live release. **`docs/audit.md`**: 7 high, 14
  medium, 13 low, each with location, why it matters and severity.
- Benchmarked twelve external platforms with three parallel helper agents.
  **`docs/benchmarking.md`**.

### What the audit turned up that was not already known

Three things matter more than the rest.

**1. The "unusual for the time of year" rule is loose, not strict** (audit A1).
This is the most consequential finding. The rule flags a reading that falls
outside the full range of the same period in the past five years. Under
exchangeability the chance of that happening when nothing has changed is
exactly 2/(n+1): **33% with five comparison years, 50% with the configured
three-year minimum**. The About page claims the rule is "deliberately strict".
It is the opposite.

Back-tested on the site's own stored series, the rule fires on **44% of all
historical periods** (210 of 478), and on **100%** of testable quarters for the
farm input price index, which rises steadily so that every quarter is a new
five-year high. Today 13 of 20 indicators carry the "unusual" label. A screen
that fires on two-thirds of the board is not a screen, and it buries the cases
that matter.

**2. PortWatch was down on a transient provider error** (audit C2). GL-03 was
in the `error` state with "PortWatch error: Invalid URL". I reproduced the
connector's exact queries against the live ArcGIS service: both work and page
cleanly to 11,532 rows. ArcGIS returns HTTP 200 with an error object in the
body, so `core.fetch`'s retry never sees a failure and `_query` abandons the
source on the first error object. That one hiccup takes out `sea_lanes` and
`ports`, and with them the live check on the site's only ongoing disruption.
Confirmed fixed-by-retry: a `--only GL-03` run now returns data to
2026-11-22.

**3. A stale reading reads as a plain fact on the indicator itself** (audit C1).
The grain feed stopped publishing on 4 October 2026, 51 days before the audit,
against a 21-day threshold. `sources.json` knows. The situation headline adds a
sentence. But the indicator's own headline text — the sentence shown on the
card, on the indicator page, in the weekly brief and in every archived day —
says only "Grain elevators and port terminals held 7.2 million tonnes of grain
in the week ending 4 October 2026."

### Decisions made, with reasons

**D1. Treat the screening rule as a method to improve, not a fixed decision.**
The brief fixes "old warning levels and risk bands", which are the threat
register's bands in `src/legacy/core.js` (`REG`, `SIG`). The screening rule in
`core.reference_state` is a different thing: it is described under "what exists
now", and the About page already promises "We will review it once we can test
it against past events." A1 is that test. Reversible: the rule stays in the
code and keeps its label; what changes is that a second, trend-removed screen
sits beside it and the site stops calling the level screen strict.

**D2. Do not try to fix the screen with a cleverer threshold.** Widening the
seasonal window to ±1 month over five years should cut the nominal rate from
33% to 12.5%, but the back-test shows the real reference count only reaching
about nine values, because most series begin in 2019. There is not enough
history. So the fix is presentational and structural, not a new threshold:
report the rank and the chance of landing outside by luck, and add a separate
detrended screen.

**D3. Choose the screening frame per indicator, and record the choice in
`config.yml`.** Year-on-year differencing removes a steady trend and the annual
season, and cuts the pooled flag rate from 48% to 23% while taking farm inputs
from 100% to 0%. But on bounded share series it is wrong: US drought goes from
0% to 83%, because the share itself swings. A single rule applied blindly to
trending indices, bounded shares and counts cannot be right for all three. The
frame is therefore a per-indicator setting with a stated reason, not a global
constant.

**D4. Keep the screening work in the pipeline, not the browser.** Everything
the site says about a reading should be computable from the published release,
so an archived day and a published brief say the same thing a year later as
they did on the day. This is why C1 is fixed by adding staleness to the
indicator in the pipeline rather than by styling the card.

**D5. `public/data` stays out of the branch.** It is already gitignored. A
committed data snapshot would rot and would compete with the `data` branch for
authority.

**D6. Added one devDependency, `axe-core`.** The definition of done requires a
WCAG 2.1 AA check; doing it by hand is not repeatable. `axe-core` is MPL-2.0,
dev-only, and does not ship in the bundle.

### Open questions for the owner (collected for the pull request)

- A4: the Prairie drought boxes should become a cropland or census-agricultural-
  region mask. AAFC's Annual Crop Inventory would do it. Not attempted in this
  branch: it changes a published indicator's values, and the brief prefers a few
  well-validated additions to many shallow ones.
- A7: no animal-disease feed. CFIA publishes avian influenza data; whether any
  endpoint is machine-readable and licensed for reuse is a research need, not a
  build item, until verified.
- B4: the threat register's warning levels are frozen at 12 November 2026. They
  stay, as the brief requires, but they sit beside live figures. The pull
  request will propose showing the check date in the same line as the level.

---

## Session 2 — 25 November 2026

### Done

- **P1–P3, the transmission layer.** `pipeline/transmission.yml` writes out
  seven chains of knock-on effects, each stage naming the published figures
  that would show a shock at that link. `pipeline/cfso/transmission.py`
  evaluates them against the live screening results and publishes
  `transmission.json`. The site shows it on the threats hub, on each threat
  page beside its what-if test, and in one line on the overview.
- **P4, the four questions.** Every indicator carries `reading`, filled from
  `pipeline/readings.yml` (22 entries): what is happening, why it matters for
  Canada, what could happen next, what decision-makers could consider. It
  renders above the chart on each indicator page.
- **P5, lateness travels on the indicator.** `mark_lateness()` puts the age of
  the data and a plain sentence about it on the figure itself, so every card,
  brief and archived day repeats it rather than relying on a banner the reader
  may not have seen.
- **P6, the PortWatch retry.** ArcGIS answers a bad query with HTTP 200 and an
  error object in the body, which the HTTP-status retry could not see.
  `_page()` now retries on the error body with bounded back-off.
- **P7–P8, two new sources.** CA-11 (StatCan 32-10-0013, grain stocks including
  grain on farms, three times a year) and CA-12 (StatCan 16-10-0047, stock held
  by food processors against what they ship, monthly). Both verified live,
  registered in `sources.yml` with licence and refresh rules, and the first
  connectors in this repository with parsing tests.
- **Accessibility.** A table view for every chart. The page checker now runs
  both colour schemes, which found 20 dark-mode contrast failures; all are
  fixed. See commit `2680a2a`.
- **The release contract.** `tests/release-contract.test.ts` reads the
  published JSON the way a page does and asserts what the pages assume.

### The newcomer re-read

Every page was rendered from the built site and read as plain text, start to
finish, as someone arriving cold. Seven things were changed as a result:

1. `both` and `checks` rendered as "bothchecks" — JSX drops the newline
   between a closing tag and the next line's text.
2. The cascade's one-line summary contradicted itself where a downstream
   reading had moved with nothing upstream behind it.
3. The sentence introducing the what-if tests said the live reading was "a
   separate thing" without saying separate from what.
4. The source table printed `three_times_a_year` raw.
5. It also printed "1 days old; marked late after 1" — a plural error and a
   missing unit.
6. The chain sentence ended "the evidence has reached stored supply is used
   up", which reads as a run-on because stage names are phrases.
7. Threat links under each timeline were separated only by whitespace, so they
   ran together on the page and when read aloud.

Two figures looked implausible and were checked against the raw extracts
rather than trusted or quietly dropped:

- Diesel at 262.9 cents a litre in October 2026, 51% above the five-year
  median for October. The five city series in `CA-08` average to 262.94
  exactly. Correct.
- Grain and canola by rail at 3,791,412 tonnes in August 2026, 80% above the
  median. Wheat 2,588,081 + other grains 628,446 + canola 574,885 = 3,791,412,
  and the five past Augusts give median 2,111,106, min 1,477,667, max
  2,622,536 — all matching the published headline. Correct.

Both are real signals in this release, not artefacts, and both are left as
they are.

### Decisions made, with reasons

**D7. A downstream reading alone never moves a chain.** The first working
version of the cascade read "Act now" on the avian influenza chain from egg
prices by themselves, with no outbreak anywhere in the evidence. A shock
travelling a chain leaves a mark at each link it passes, so a reading at the
far end with nothing behind it is not evidence that anything travelled. Stages
now count only if the stages before them count too, an unwatched stage breaks
the chain rather than being skipped over, and an unsupported downstream
reading is reported as one, with a suggestion to look for another cause. This
is the single most important correctness decision in the branch.

**D8. Only |z| >= 1.0 fires the pace check.** The first threshold treated 0.5
standard deviations as firing, which is roughly a 62% event, and the screen
fired on 67–82% of periods. 0.5 to 1.0 is now reported as moving a little
faster than usual but not enough to stand out.

**D9. A near-zero spread says nothing.** Dividing by floating-point dust made
any deviation look infinitely significant. Below a relative floor the pace
screen returns no verdict rather than a huge one. Caught by a test, not in
production.

**D10. Panel headlines aggregate over the lines that are not context.** A
panel read "clear" while one of its items was at the top rung, because the
headline followed the main series only. Lines that are context (all
manufacturing against food manufacturing; on-farm and commercial stocks, which
sum to the total) carry `context: true` and are excluded from the aggregate.

**D11. --on-fill rather than per-rule dark overrides.** The dark scheme
lightens the semantic colours because they are mostly text on a dark
background; the same tokens used as fills then need dark text. One token that
flips with the scheme fixes every such rule at once and cannot drift apart the
way eight separate overrides would.

### Open questions for the owner, added this session

- The seven chains, their stages and their trigger levels are the research
  team's judgement, labelled as such on every page. They are the part of this
  branch most in need of expert review, and the structured review the brief
  asks for should start there rather than with the threat ratings.
- `readings.yml` carries 22 hand-written "what decision-makers could consider"
  entries. They are deliberately phrased as questions, not advice. Whether the
  Institute wants to go further than questions is the owner's call, not a
  technical one.
