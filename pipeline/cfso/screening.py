"""Two screens on every reading, and the words used to report them.

Why two. The level screen asks whether a reading falls outside the full range
of the same period in earlier years. That is the rule the site has always used,
and it is kept unchanged. But it cannot discriminate on a series that trends:
if the new reading and the n reference readings are exchangeable - that is, if
nothing has changed - the chance that the new one is the largest or smallest of
the n + 1 values is exactly 2/(n + 1), because every ordering is equally likely.
At five comparison years that is one year in three; at the three-year minimum it
is one in two. Measured over the site's own stored history the level screen
fires on 44% of all periods, and on every testable quarter of the farm input
price index, which rises steadily so that each quarter is a new five-year high.

The pace screen removes the trend. It standardises *growth* rather than level,
following the Indicator of Food Price Anomalies, the method behind UN SDG
indicator 2.c.1 (United Nations, metadata for indicator 2.c.1, last updated
29 July 2024, https://unstats.un.org/sdgs/metadata/files/Metadata-02-0C-01.pdf).
Growth over the latest quarter and over the latest year is each standardised
against the same calendar period in earlier years, then combined with the
published weight gamma = 0.4 on the quarterly part.

Two deliberate departures from the published method, both recorded on the About
page:

- it is applied two-sided, because a fall matters here as much as a rise (a
  grain buffer emptying, ships no longer passing a strait), whereas SDG 2.c.1
  reports abnormally *high* consumer prices only;
- it is applied to series that are not prices, where "growth" is the proportional
  change in a count, a ratio or a share. On bounded shares that is the wrong
  frame and the pace screen is not used for the headline; which screen leads is
  set per indicator in config.yml with its reason.

Nothing here invents a value. Too few comparable periods and the screen reports
"not enough history" rather than a number.
"""
from __future__ import annotations

import statistics
from datetime import date, timedelta

from .core import config, pct_change, rnd

# Periods per year, by the frequency labels the indicators already use.
PER_YEAR = {"monthly": 12, "quarterly": 4, "weekly": 52, "daily": 365,
            "business days": 52, "three_times_a_year": 3, "annual": 1}


def _cfg() -> dict:
    return config()["screening"]


# ------------------------------------------------------------------ the level screen

def level_luck_phrase(n_years: int | None) -> str | None:
    """Plain words for how often the level screen fires by chance alone."""
    if not n_years:
        return None
    table = _cfg()["level_luck_rate"]
    phrase = table.get(n_years) or table.get(max(table))
    return (f"With {n_years} years to compare, the highest or lowest reading happens "
            f"{phrase} by chance alone, even when nothing has changed.")


def level_words(state: dict) -> str:
    """A statement of fact about the rank, not a verdict on whether it is odd."""
    n = state.get("n_years") or 0
    if state.get("state") == "insufficient_data":
        return "There are not enough comparable past years to place this reading."
    if state.get("direction") == "within":
        return f"It sits inside the range of the past {n} years for this time of year."
    side = "highest" if state.get("direction") == "above" else "lowest"
    return f"It is the {side} of the {n + 1} comparable readings: this one and the past {n} years."


# ------------------------------------------------------------------ the pace screen

def _growth(values: dict[str, float], t: str, months_back: int, per_year: int) -> float | None:
    """Compound growth to `t` from `months_back` months earlier, as % a month.

    Following SDG 2.c.1, growth is a geometric mean scaled by the length of the
    period in months, so the quarterly and annual components are comparable.
    """
    cur = values.get(t)
    if cur is None or cur <= 0:
        return None
    base = _at_months_back(values, t, months_back, per_year)
    if base is None or base <= 0:
        return None
    return 100.0 * ((cur / base) ** (1.0 / months_back) - 1.0)


def _at_months_back(values: dict[str, float], t: str, months: int, per_year: int) -> float | None:
    """The value `months` months before `t`, allowing a little slack for weekly data."""
    d = date.fromisoformat(t)
    m = d.month - 1 - months
    y = d.year + m // 12
    target = date(y, m % 12 + 1, min(d.day, 28))
    if per_year >= 52:  # weekly or daily: take the nearest reading within a fortnight
        best, gap = None, timedelta(days=15)
        for k, v in values.items():
            if v is None:
                continue
            delta = abs(date.fromisoformat(k) - target)
            if delta < gap:
                best, gap = v, delta
        return best
    # Monthly and coarser: the reading in that calendar month, if there is one.
    for k, v in values.items():
        kd = date.fromisoformat(k)
        if (kd.year, kd.month) == (target.year, target.month):
            return v
    return None


def _same_period_history(values: dict[str, float], t: str, years: int, per_year: int,
                         months_back: int) -> list[float]:
    """Growth over the same window, ending at the same point in earlier years."""
    out = []
    d = date.fromisoformat(t)
    for k in range(1, years + 1):
        try:
            anchor = d.replace(year=d.year - k)
        except ValueError:
            anchor = d.replace(year=d.year - k, day=28)
        key = _nearest_key(values, anchor, per_year)
        if key is None:
            continue
        g = _growth(values, key, months_back, per_year)
        if g is not None:
            out.append(g)
    return out


def _nearest_key(values: dict[str, float], target: date, per_year: int) -> str | None:
    slack = timedelta(days=15 if per_year >= 52 else 20)
    best, gap = None, slack
    for k, v in values.items():
        if v is None:
            continue
        delta = abs(date.fromisoformat(k) - target)
        if delta < gap:
            best, gap = k, delta
    return best


def pace_state(points: list[dict], freq: str) -> dict:
    """Standardised growth for the latest reading. See the module docstring.

    `points` is [{"t": iso date, "v": value}, ...] in any order.
    """
    cfg = _cfg()["pace"]
    years = config()["baseline"]["years"]
    per_year = PER_YEAR.get(freq, 12)
    values = {p["t"][:10]: p["v"] for p in points if p.get("t") and p.get("v") is not None}
    if not values:
        return {"state": "insufficient_data", "reason": "no readings"}
    t = max(values)
    parts, used = {}, []
    for name, months in (("quarter", 3), ("year", 12)):
        g = _growth(values, t, months, per_year)
        hist = _same_period_history(values, t, years, per_year, months)
        if g is None or len(hist) < cfg["min_years"]:
            parts[name] = None
            continue
        mean = statistics.fmean(hist)
        sd = statistics.stdev(hist) if len(hist) > 1 else 0.0
        # A spread of effectively zero gives no scale to measure against, and
        # dividing by floating-point dust would make any deviation look
        # infinitely significant. Say nothing instead.
        if sd < 1e-6 * max(1.0, abs(mean)):
            parts[name] = None
            continue
        parts[name] = {"growth_pct_per_month": rnd(g, 3), "mean": rnd(mean, 3),
                       "sd": rnd(sd, 3), "n_years": len(hist), "z": rnd((g - mean) / sd, 2)}
        used.append(name)
    if not used:
        return {"state": "insufficient_data", "observation_end": t,
                "reason": "not enough comparable past years to judge the pace"}
    gamma = cfg["gamma"]
    if len(used) == 2:
        score = gamma * parts["quarter"]["z"] + (1 - gamma) * parts["year"]["z"]
        basis = "both"
    else:
        score = parts[used[0]]["z"]
        basis = used[0]
    mag = abs(score)
    if mag >= cfg["high"]:
        band = "well_above" if score > 0 else "well_below"
    elif mag >= cfg["elevated"]:
        band = "above" if score > 0 else "below"
    else:
        band = "usual"
    return {"state": "screened", "score": rnd(score, 2), "band": band, "basis": basis,
            "observation_end": t, "components": parts,
            "n_years": min(p["n_years"] for p in parts.values() if p),
            "thresholds": {"elevated": cfg["elevated"], "high": cfg["high"], "gamma": gamma}}


#: The "above" and "below" bands are between half and one standard deviation.
#: A reading lands there in roughly one period in three when nothing has
#: changed, so the words say "a little" and "not enough to stand out": they
#: must not read as a warning, or they would contradict the rung.
PACE_WORDS = {
    "usual": "It is moving at about its usual pace for this time of year.",
    "above": "It is rising a little faster than usual for this time of year, but not enough to stand out.",
    "well_above": "It is rising much faster than usual for this time of year.",
    "below": "It is falling a little faster than usual for this time of year, but not enough to stand out.",
    "well_below": "It is falling much faster than usual for this time of year.",
}


def pace_words(state: dict) -> str:
    if state.get("state") != "screened":
        return "There is not enough past data to say whether it is moving unusually fast."
    return PACE_WORDS[state["band"]]


# ------------------------------------------------------------------ putting them together

#: Only the "high" band counts as the pace screen firing. See config.yml.
PACE_FIRING = {"well_above", "well_below"}
#: Reported, but not treated as a firing: beyond half a standard deviation
#: either way happens in about three periods in five by chance.
PACE_ELEVATED = {"above", "below"}

#: The rungs of the ladder, weakest first. Named for what is known, not for
#: how bad things are, following the ASAP warning levels (docs/benchmarking.md).
RUNGS = ["clear", "level", "pace", "converging"]

RUNG_LABEL = {
    "clear": "Nothing unusual in these readings",
    "level": "Highest or lowest in five years, but moving at its usual pace",
    "pace": "Moving unusually fast, but still within past years",
    "converging": "Outside past years and moving unusually fast",
    "not_screened": "Not screened",
    "insufficient": "Not enough past data to compare",
}

#: One line explaining what each rung means, in plain words.
RUNG_MEANS = {
    "clear": "Neither of the two checks we run found anything out of the ordinary.",
    "level": ("This reading is the highest or lowest of the comparable years, but it is not moving faster "
              "than usual. On a figure that climbs year after year this is the normal state, not a warning."),
    "pace": ("This reading is moving faster than usual for the time of year, though it has not yet passed "
             "the range of the past five years. It is the earlier of the two signals."),
    "converging": ("Both checks agree: the reading is outside the range of the past five years for this time "
                   "of year, and it is moving unusually fast. This is the combination worth a closer look."),
    "not_screened": "This figure is shown as published, without either check. The reason is on its own page.",
    "insufficient": "We do not have enough comparable past years to run the checks.",
}


def screens_for(ind_id: str) -> dict:
    """Which screens are meaningful for this indicator, and why."""
    f = _cfg()["frames"].get(ind_id)
    if f:
        return {"screens": list(f.get("screens") or []), "why": f["why"]}
    # An indicator with no entry keeps the original behaviour: the level screen.
    return {"screens": ["level"],
            "why": "No screening frame has been recorded for this figure yet, so only the level check runs."}


def verdict(ind_id: str, level: dict | None, pace: dict | None) -> dict:
    """Place a reading on the ladder. Never merges the screens into one number.

    Where both screens are meaningful, the top rung needs both to fire, because
    two independent kinds of evidence agreeing is a far stronger statement than
    either alone. Where only one is meaningful, that screen firing is the top of
    the ladder for that indicator, and `top_rung` says so, so the site does not
    imply a convergence it cannot test.
    """
    sc = screens_for(ind_id)
    which = sc["screens"]
    level = level or {}
    pace = pace or {}
    min_flag = _cfg()["level_min_years_to_flag"]
    n_years = level.get("n_years") or 0
    lvl_can_flag = "level" in which and n_years >= min_flag
    lvl_fired = lvl_can_flag and level.get("state") == "outside_reference_range_review"
    pace_fired = "pace" in which and pace.get("band") in PACE_FIRING
    pace_elevated = "pace" in which and pace.get("band") in PACE_ELEVATED

    if not which:
        rung, top = "not_screened", "not_screened"
    elif len(which) == 2:
        top = "converging"
        rung = "converging" if (lvl_fired and pace_fired) else (
            "pace" if pace_fired else ("level" if lvl_fired else "clear"))
    else:
        top = which[0]
        fired = lvl_fired if which[0] == "level" else pace_fired
        rung = which[0] if fired else "clear"
    # "clear" is only honest when a screen could actually have fired.
    if rung == "clear":
        could = (lvl_can_flag and level.get("state") in
                 ("outside_reference_range_review", "within_reference_range")) or pace.get("state") == "screened"
        if not could:
            rung = "insufficient"

    out = {
        "screens": which, "screens_why": sc["why"],
        "rung": rung, "top_rung": top, "rung_label": RUNG_LABEL[rung], "rung_means": RUNG_MEANS[rung],
        "flagged": rung in ("converging", "pace", "level"),
        "worth_a_look": rung == top and rung not in ("clear", "insufficient", "not_screened"),
        "level_fired": bool(lvl_fired), "pace_fired": bool(pace_fired), "pace_elevated": bool(pace_elevated),
        "level_blocked_by_years": bool("level" in which and 0 < n_years < min_flag),
        "level_min_years_to_flag": min_flag,
    }
    if "level" in which:
        out["level_words"] = level_words(level)
        out["level_luck"] = level_luck_phrase(n_years)
    if "pace" in which:
        out["pace_words"] = pace_words(pace)
    return out


def aggregate_verdict(ind_id: str, items: list[dict]) -> dict:
    """Place an indicator whose headline covers many series, such as the twelve
    wholesale products, on the same ladder.

    Each item is screened on its own; the indicator takes the highest rung any
    item reached, and reports how many items each screen flagged, so "three of
    twelve" is visible rather than collapsed into one word.
    """
    sc = screens_for(ind_id)
    if not sc["screens"]:
        # Nothing is screened for this indicator, so there is no ladder to
        # place it on and "not enough data" would be the wrong thing to say.
        return {"screens": [], "screens_why": sc["why"], "rung": "not_screened", "top_rung": "not_screened",
                "rung_label": RUNG_LABEL["not_screened"], "rung_means": RUNG_MEANS["not_screened"],
                "flagged": False, "worth_a_look": False,
                "counts": {"n": len(items), "level": 0, "pace": 0, "converging": 0},
                "level_fired": False, "pace_fired": False, "pace_elevated": False,
                "level_blocked_by_years": False,
                "level_min_years_to_flag": _cfg()["level_min_years_to_flag"]}
    per = [verdict(ind_id, it.get("level"), it.get("pace")) for it in items]
    counts = {
        "n": len(per),
        "level": sum(1 for v in per if v["level_fired"]),
        "pace": sum(1 for v in per if v["pace_fired"]),
        "converging": sum(1 for v in per if v["rung"] == "converging"),
    }
    reached = [v["rung"] for v in per if v["rung"] in RUNGS]
    if not per:
        best = "insufficient"
    elif not reached:
        best = "insufficient"  # every item short of comparable history
    else:
        best = max(reached, key=RUNGS.index)
    top = per[0]["top_rung"] if per else "not_screened"
    out = {
        "screens": sc["screens"], "screens_why": sc["why"], "rung": best, "top_rung": top,
        "rung_label": RUNG_LABEL[best], "rung_means": RUNG_MEANS[best],
        "flagged": best in ("converging", "pace", "level"),
        "worth_a_look": best == top and best not in ("clear", "insufficient", "not_screened"),
        "counts": counts,
        "level_fired": counts["level"] > 0, "pace_fired": counts["pace"] > 0,
        "pace_elevated": any(v["pace_elevated"] for v in per),
        "level_blocked_by_years": any(v["level_blocked_by_years"] for v in per),
        "level_min_years_to_flag": _cfg()["level_min_years_to_flag"],
    }
    return out


def screen_series(ind_id: str, points: list[dict], freq: str, level: dict) -> tuple[dict, dict]:
    """Run both screens on one series. Returns (verdict, pace_state).

    The pace screen is computed only when the indicator's frame says it is
    meaningful, so no effort is spent producing a number the site will not use.
    """
    which = screens_for(ind_id)["screens"]
    pace = pace_state(points, freq) if "pace" in which else {}
    return verdict(ind_id, level, pace), pace


# ------------------------------------------------------------------ persistence

def persistence(history: list[dict], current: bool) -> dict:
    """How many consecutive past releases agreed with the current verdict.

    `history` is oldest-first: [{"flagged": bool}, ...] from the archive. Lets a
    card say "and has been for eleven months" rather than leaving the reader to
    guess whether this is new.
    """
    n = 0
    for h in reversed(history):
        if bool(h.get("flagged")) != current:
            break
        n += 1
    return {"runs": n, "new": n == 0}


def persistence_words(p: dict, flagged: bool, freq: str) -> str | None:
    n = p.get("runs") or 0
    if n < 2:
        return "This is the first update in which it reads this way." if flagged and n == 0 else None
    unit = {"monthly": "months", "quarterly": "quarters", "weekly": "weeks",
            "three_times_a_year": "readings", "annual": "years"}.get(freq, "updates")
    if flagged:
        return f"It has read this way for the last {n} {unit} we have."
    return None


# ------------------------------------------------------------------ deterioration bands

def is_deterioration(current: float | None, base: float | None) -> bool | None:
    """Whether a move is large enough to count, given how small the base is.

    A relative change has to clear a bar that rises as the base falls, so a
    small count moving by one does not register as a change of state. Adapted
    from WFP HungerMap's deterioration rule (docs/benchmarking.md).
    """
    if current is None or base is None or base <= 0:
        return None
    change = pct_change(current, base)
    if change is None:
        return None
    for band in _cfg()["deterioration_bands"]:
        if base >= band["at_or_above"]:
            return abs(change) >= band["relative_pct"]
    return None
