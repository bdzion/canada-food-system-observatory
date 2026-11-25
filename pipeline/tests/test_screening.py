"""Tests for the two screens and the ladder they place a reading on.

The point of these is the arithmetic and the logic, not the wording: that a
steadily rising series does not reach the top rung on the level alone, that the
pace screen only fires beyond a full standard deviation, that three comparison
years never flag, and that a reading is never placed on a rung the indicator's
own frame cannot reach.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from cfso import screening
from cfso.core import reference_state


def monthly(values: list[float], end: str = "2026-09-01") -> list[dict]:
    """A monthly series ending at `end`, oldest first."""
    d = date.fromisoformat(end)
    out = []
    for i, v in enumerate(reversed(values)):
        m = d.month - 1 - i
        y = d.year + m // 12
        out.append({"t": date(y, m % 12 + 1, 1).isoformat(), "v": v})
    return list(reversed(out))


# ------------------------------------------------------------------ the level screen

def test_level_luck_rate_is_published_and_falls_with_more_years():
    """The rule's own false-positive rate is 2/(n+1); the words must say so."""
    assert "one year in two" in screening.level_luck_phrase(3)
    assert "one year in three" in screening.level_luck_phrase(5)
    assert screening.level_luck_phrase(None) is None


def test_level_words_state_the_rank_not_a_verdict():
    st = reference_state(10.0, [1.0, 2.0, 3.0, 4.0, 5.0], 3)
    words = screening.level_words(st)
    assert "highest of the 6 comparable readings" in words
    # It must not call the reading unusual on its own.
    assert "unusual" not in words.lower()


def test_level_cannot_fire_on_only_three_comparison_years():
    """Three years means a 50% false-positive rate, so it must not flag."""
    st = reference_state(10.0, [1.0, 2.0, 3.0], 3)
    assert st["state"] == "outside_reference_range_review"
    v = screening.verdict("sea_lanes", st, {})
    assert v["level_fired"] is False
    assert v["level_blocked_by_years"] is True
    assert v["rung"] == "insufficient"


def test_level_fires_with_five_comparison_years():
    st = reference_state(10.0, [1.0, 2.0, 3.0, 4.0, 5.0], 3)
    v = screening.verdict("sea_lanes", st, {})
    assert v["level_fired"] is True
    assert v["rung"] == "level"
    assert v["worth_a_look"] is True  # sea_lanes has only the level screen


# ------------------------------------------------------------------ the pace screen

def trending(n: int = 72, rate: float = 1.005, wobble: float = 0.01) -> list[float]:
    """A rising series with a repeatable wobble, so past growth has a spread."""
    jitter = [0.0, 1.0, -0.6, 0.4, -1.0, 0.7, -0.3, 0.9, -0.8, 0.2, 0.5, -0.5, 0.3, -0.9]
    return [100.0 * (rate ** i) * (1 + wobble * jitter[i % len(jitter)]) for i in range(n)]


def test_pace_is_quiet_on_a_steady_trend():
    """This is the farm-input case: a figure that climbs year after year.

    The level screen flags every period of such a series. The pace screen must
    not, because the growth itself is not unusual.
    """
    st = screening.pace_state(monthly(trending()), "monthly")
    assert st["state"] == "screened"
    assert st["band"] == "usual", st


def test_pace_fires_on_a_jump_but_only_beyond_one_sd():
    base = trending(71)
    jumped = screening.pace_state(monthly(base + [base[-1] * 1.4]), "monthly")
    assert jumped["state"] == "screened"
    assert jumped["band"] == "well_above", jumped
    assert abs(jumped["score"]) >= 1.0


def test_pace_fires_downward_too():
    """A fall matters here as much as a rise: a buffer emptying, ships stopping."""
    base = trending(71)
    dropped = screening.pace_state(monthly(base + [base[-1] * 0.6]), "monthly")
    assert dropped["band"] == "well_below", dropped
    assert dropped["score"] < -1.0


def test_pace_declines_to_standardise_with_no_spread_to_measure_against():
    """Growth identical in every past year gives no scale, so report nothing.

    Dividing by a zero standard deviation would make any deviation look
    infinitely significant, which is worse than saying we cannot tell.
    """
    st = screening.pace_state(monthly([100.0 * (1.005 ** i) for i in range(72)]), "monthly")
    assert st["state"] == "insufficient_data"


def test_pace_reports_but_does_not_fire_in_the_middle_band():
    """Between half and one standard deviation is reported, never flagged."""
    st = {"state": "screened", "band": "above", "score": 0.7}
    v = screening.verdict("farm_inputs", {"state": "within_reference_range", "n_years": 5}, st)
    assert v["pace_fired"] is False
    assert v["pace_elevated"] is True
    assert v["rung"] == "clear"
    assert "not enough to stand out" in screening.pace_words(st)


def test_pace_needs_enough_comparable_years():
    st = screening.pace_state(monthly([100.0, 101.0, 102.0, 103.0]), "monthly")
    assert st["state"] == "insufficient_data"


def test_pace_never_divides_by_a_zero_or_missing_base():
    assert screening.pace_state([], "monthly")["state"] == "insufficient_data"
    assert screening.pace_state(monthly([0.0] * 72), "monthly")["state"] == "insufficient_data"


def test_pace_uses_the_published_weight_and_thresholds():
    cfg = screening._cfg()["pace"]
    assert cfg["gamma"] == 0.4          # SDG 2.c.1
    assert cfg["elevated"] == 0.5
    assert cfg["high"] == 1.0


# ------------------------------------------------------------------ the ladder

def test_a_trending_series_at_a_new_high_stops_at_the_level_rung():
    """The farm input price index case: a new five-year high every quarter."""
    level = reference_state(187.0, [150.0, 155.0, 160.0, 168.0, 175.0], 3)
    pace = {"state": "screened", "band": "usual", "score": 0.1}
    v = screening.verdict("farm_inputs", level, pace)
    assert v["level_fired"] is True
    assert v["rung"] == "level"
    assert v["top_rung"] == "converging"
    assert v["worth_a_look"] is False   # not the top rung, so not called out


def test_the_top_rung_needs_both_screens_to_agree():
    level = reference_state(187.0, [150.0, 155.0, 160.0, 168.0, 175.0], 3)
    pace = {"state": "screened", "band": "well_above", "score": 1.8}
    v = screening.verdict("farm_inputs", level, pace)
    assert v["rung"] == "converging"
    assert v["worth_a_look"] is True


def test_pace_alone_is_the_earlier_signal_not_the_top_rung():
    level = reference_state(160.0, [150.0, 155.0, 165.0, 168.0, 175.0], 3)
    pace = {"state": "screened", "band": "well_above", "score": 1.4}
    v = screening.verdict("farm_inputs", level, pace)
    assert v["level_fired"] is False
    assert v["rung"] == "pace"
    assert v["worth_a_look"] is False


def test_an_indicator_with_one_screen_tops_out_at_that_screen():
    """us_drought has only the level screen: it must not claim convergence."""
    level = reference_state(80.0, [10.0, 20.0, 30.0, 40.0, 50.0], 3)
    v = screening.verdict("us_drought", level, {"state": "screened", "band": "well_above", "score": 2.0})
    assert v["screens"] == ["level"]
    assert v["pace_fired"] is False     # the pace screen is not meaningful here
    assert v["rung"] == "level"
    assert v["top_rung"] == "level"
    assert v["worth_a_look"] is True


def test_an_unscreened_indicator_says_so_rather_than_claiming_a_gap():
    v = screening.verdict("food_insecurity", {}, {})
    assert v["rung"] == "not_screened"
    assert v["flagged"] is False
    assert screening.aggregate_verdict("food_insecurity", [{"level": {}, "pace": {}}])["rung"] == "not_screened"


def test_every_configured_frame_names_only_known_screens_and_gives_a_reason():
    for ind_id, f in screening._cfg()["frames"].items():
        assert set(f["screens"]) <= {"level", "pace"}, ind_id
        assert f["why"].strip(), ind_id


def test_an_unknown_indicator_falls_back_to_the_level_screen():
    sc = screening.screens_for("something_new")
    assert sc["screens"] == ["level"]
    assert sc["why"]


# ------------------------------------------------------------------ aggregates

def test_a_panel_takes_the_highest_rung_any_line_reaches():
    """One of fifteen foods setting off both checks must not read as clear."""
    quiet = {"level": {"state": "within_reference_range", "n_years": 5}, "pace": {"state": "screened", "band": "usual", "score": 0.0}}
    both = {"level": reference_state(9.0, [1.0, 2.0, 3.0, 4.0, 5.0], 3), "pace": {"state": "screened", "band": "well_above", "score": 1.5}}
    agg = screening.aggregate_verdict("store_prices", [quiet, quiet, both] + [quiet] * 12)
    assert agg["rung"] == "converging"
    assert agg["counts"] == {"n": 15, "level": 1, "pace": 1, "converging": 1}


def test_a_panel_where_every_line_lacks_history_says_so():
    thin = {"level": {"state": "insufficient_data", "n_years": 1}, "pace": {"state": "insufficient_data"}}
    agg = screening.aggregate_verdict("store_prices", [thin, thin])
    assert agg["rung"] == "insufficient"


# ------------------------------------------------------------------ persistence

def test_persistence_counts_only_an_unbroken_run():
    hist = [{"flagged": False}, {"flagged": True}, {"flagged": True}, {"flagged": True}]
    assert screening.persistence(hist, True)["runs"] == 3
    assert screening.persistence(hist, False)["runs"] == 0
    assert screening.persistence([], True) == {"runs": 0, "new": True}


def test_persistence_words_only_speak_when_there_is_a_run():
    assert screening.persistence_words({"runs": 0}, True, "monthly").startswith("This is the first")
    assert "4 months" in screening.persistence_words({"runs": 4}, True, "monthly")
    assert screening.persistence_words({"runs": 4}, False, "monthly") is None


# ------------------------------------------------------------------ deterioration bands

@pytest.mark.parametrize("base,current,expected", [
    (50.0, 60.0, True),    # 20% move on a large base clears the 15% bar
    (50.0, 55.0, False),   # 10% does not
    (30.0, 36.0, True),    # 20% move on a mid base clears the 20% bar
    (30.0, 34.0, False),   # 13% does not
    (4.0, 5.0, True),      # 25% move on a small base clears the 25% bar
    (4.0, 4.8, False),     # 20% does not, because the base is small
])
def test_deterioration_bar_rises_as_the_base_falls(base, current, expected):
    assert screening.is_deterioration(current, base) is expected


def test_deterioration_is_undefined_without_a_usable_base():
    assert screening.is_deterioration(5.0, 0.0) is None
    assert screening.is_deterioration(None, 10.0) is None
