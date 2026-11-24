# Redesign log, branch `redesign-2026`

**Read this file first in any new session.** It records what is done, what is
next, and the decisions made along the way with the reason for each. It is
written so that a session that has lost all other context can resume from this
file alone.

Working rule for this branch: when a choice is unclear, take the option that is
reversible and keeps the site honest, record it here, and carry on.

---

## Where to pick up

**Current stage: step 4 of 6 (build).** Steps 1–3 are done.

Next actions, in order:

1. Build the trigger and transmission layer (plan items P1–P3).
2. Build the four-question reading fields (P4).
3. Fix the staleness-on-the-indicator problem (P5) and the PortWatch retry (P6).
4. Accessibility fixes D1–D3.
5. Re-run `scripts/check-pages.py`, `pytest`, `vitest`, `npm run build`.
6. Newcomer re-read of every page; then open the pull request into `main`.

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
