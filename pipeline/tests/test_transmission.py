"""Tests for the transmission cascade.

The properties that matter are the ones that stop the chain overstating itself:
a downstream reading on its own is not evidence that a shock travelled, an
unwatched stage is not a clear one, a stage must move the way the chain says,
and a stage that was reached and has gone quiet is not the same as one that
never was.
"""
from __future__ import annotations

from datetime import datetime

import pytest

from cfso import transmission
from cfso.core import load_yaml

NOW = datetime(2026, 11, 24, 12, 0, 0)


def ind(iid, *, rung="clear", direction=None, band=None, items=None, late=False, title=None,
        screens=("level", "pace")):
    """An indicator in the shape build_indicators produces."""
    h = {"state": "within_reference_range", "direction": direction, "text": "…",
         "period_label": "September 2026", "observation_end": "2026-09-01", "value": 1.0,
         "unit": "index", "late": late, "age_days": 200 if late else 10,
         "late_note": "The source has stopped publishing." if late else None,
         "screen": {"rung": rung, "rung_label": rung, "screens": list(screens)}}
    if band:
        h["pace"] = {"state": "screened", "band": band}
    out = {"id": iid, "title": title or iid, "headline": h}
    if items:
        out["items"] = items
    return out


def item(iid, *, rung="clear", direction=None, band=None, label=None, context=False):
    it = {"id": iid, "label": label or iid, "direction": direction, "value": 1.0, "unit": "dollars",
          "t": "2026-09-01", "period": "September 2026", "context": context,
          "screen": {"rung": rung, "rung_label": rung, "screens": ["level", "pace"]}}
    if band:
        it["pace"] = {"state": "screened", "band": band}
    return it


def chain(t, cid):
    return next(c for c in t["chains"] if c["id"] == cid)


# ------------------------------------------------------------------ the config itself

def test_every_chain_matches_a_what_if_test_and_names_known_stages():
    cfg = load_yaml("transmission.yml")
    stage_ids = {s["id"] for s in cfg["stages"]}
    from cfso.narrative import SCENARIO_TITLE
    assert set(cfg["chains"]) == set(SCENARIO_TITLE), "a chain with no test, or a test with no chain"
    for cid, c in cfg["chains"].items():
        assert c["title"] and c["summary"], cid
        seen = [s["id"] for s in c["stages"]]
        assert set(seen) <= stage_ids, cid
        # Stages must be in the order the shared vocabulary defines, or the
        # contiguity rule would be meaningless.
        order = [s["id"] for s in cfg["stages"]]
        assert seen == sorted(seen, key=order.index), f"{cid} stages out of order"
        for st in c["stages"]:
            if not st.get("watch"):
                assert st.get("unwatched_why"), f"{cid}/{st['id']} is unwatched with no reason given"
            for w in st.get("watch") or []:
                assert w["why"].strip(), f"{cid}/{st['id']}/{w['indicator']}"
                assert set(w["rungs"]) <= {"level", "pace", "converging"}, w
                assert w.get("direction", "either") in ("up", "down", "either"), w
        for key, t in (c.get("triggers") or {}).items():
            assert key in transmission.TRIGGER_ORDER, key
            assert t["stage"] in seen, f"{cid} trigger {key} points at a stage it does not have"
            assert t["text"].strip()
        assert c.get("depends_on"), f"{cid} has no 'what would change our mind' entries"
        for d in c["depends_on"]:
            assert d["assumption"].strip() and d["would_change"].strip(), cid


def test_every_watched_indicator_exists_in_a_real_release():
    """A typo in transmission.yml would silently make a stage unreadable."""
    import json
    from pathlib import Path
    p = Path(__file__).parent.parent.parent / "public" / "data" / "indicators.json"
    if not p.exists():
        pytest.skip("no local release to check against")
    inds = {i["id"]: i for i in json.loads(p.read_text())["indicators"]}
    for cid, c in load_yaml("transmission.yml")["chains"].items():
        for st in c["stages"]:
            for w in st.get("watch") or []:
                assert w["indicator"] in inds, f"{cid}/{st['id']}: no indicator {w['indicator']}"
                if w.get("item"):
                    ids = {x["id"] for x in inds[w["indicator"]].get("items", [])}
                    assert w["item"] in ids, f"{cid}/{st['id']}: {w['indicator']} has no item {w['item']}"


# ------------------------------------------------------------------ contiguity

def test_a_downstream_reading_alone_does_not_move_the_chain():
    """Egg prices being high is not evidence of an outbreak.

    This was the first version's worst failure: the avian influenza chain
    reported "Act now" from egg prices, with nothing upstream at all.
    """
    inds = [ind("food_mfg_inventory", rung="clear"),
            ind("store_prices", items=[item("eggs", rung="converging", direction="above", band="well_above"),
                                       item("chicken", rung="clear")])]
    c = chain(transmission.build(inds, NOW), "avian-flu")
    assert c["stage_reached"] is None
    assert c["sign_supported"] is None
    assert c["unsupported_stages"] == ["household"]
    assert "nothing upstream" in c["text"]


def test_a_contiguous_cascade_moves_the_chain_and_supports_a_sign():
    inds = [ind("work_stoppages", rung="level", direction="above"),
            ind("diesel", rung="clear"),
            ind("rail_freight", rung="level", direction="below"),
            ind("grain_exports", rung="clear"), ind("ports", rung="clear"),
            ind("grain_stocks", rung="clear"), ind("food_mfg_inventory", rung="clear"),
            ind("store_prices", rung="clear")]
    c = chain(transmission.build(inds, NOW), "rail")
    assert c["stage_reached"] == "flow"
    assert c["sign_supported"] == "ready"
    assert [s["id"] for s in c["signs"] if s["supported"]] == ["watch", "ready"]


def test_an_unwatched_stage_breaks_the_chain_rather_than_passing_it():
    """With no figure for a link we cannot know the shock passed through it."""
    inds = [ind("food_mfg_inventory", rung="level", direction="below"),
            ind("store_prices", rung="clear")]
    c = chain(transmission.build(inds, NOW), "cyber")
    assert [s["state"] for s in c["stages"]][0] == "unwatched"
    assert c["stage_reached"] is None
    assert c["unsupported_stages"] == ["buffer"]
    assert "no figure at all" in c["text"]


# ------------------------------------------------------------------ direction

def test_direction_must_match_what_the_chain_is_listening_for():
    """A rail blockage shows as grain PILING UP, so the direction is not obvious."""
    up = transmission.build([ind("grain_stocks", rung="level", direction="above")], NOW)
    down = transmission.build([ind("grain_stocks", rung="level", direction="below")], NOW)
    buf = lambda t: next(s for s in chain(t, "rail")["stages"] if s["id"] == "buffer")
    assert buf(up)["counts"]["firing"] == 1       # piling up: a blockage
    assert buf(down)["counts"]["firing"] == 0     # emptying: not this chain


def test_direction_comes_from_the_screen_that_fired():
    """A five-year high that is now falling fast must not count as rising."""
    assert transmission._directions("level", {"band": "well_below"}, {"direction": "above"}) == {"up"}
    assert transmission._directions("pace", {"band": "well_below"}, {"direction": "above"}) == {"down"}
    # Where both fired they have to agree, or there is no clear direction.
    assert transmission._directions("converging", {"band": "well_below"}, {"direction": "above"}) == set()
    assert transmission._directions("converging", {"band": "well_above"}, {"direction": "above"}) == {"up"}


def test_a_panel_gives_a_direction_only_when_its_firing_lines_agree():
    """In a basket of fifteen foods, some up and some down is the normal state."""
    mixed = ind("store_prices", items=[item("a", rung="level", direction="above"),
                                       item("b", rung="level", direction="below")])
    agreed = ind("store_prices", items=[item("a", rung="level", direction="above"),
                                        item("b", rung="level", direction="above")])
    assert transmission._panel_directions(mixed, "level") == set()
    assert transmission._panel_directions(agreed, "level") == {"up"}


def test_a_context_line_cannot_give_a_panel_its_direction():
    i = ind("food_mfg_inventory", items=[item("inv_to_sales", rung="clear"),
                                         item("all_mfg", rung="level", direction="below", context=True)])
    assert transmission._panel_directions(i, "level") == set()


# ------------------------------------------------------------------ memory and easing

def test_a_stage_that_was_reached_and_went_quiet_reads_as_easing():
    quiet = [ind("work_stoppages", rung="clear"), ind("diesel", rung="clear"),
             ind("rail_freight", rung="clear"), ind("grain_exports", rung="clear"),
             ind("ports", rung="clear"), ind("grain_stocks", rung="clear"),
             ind("food_mfg_inventory", rung="clear"), ind("store_prices", rung="clear")]
    previous = {"chains": [{"id": "rail", "stages": [{"id": "pressure", "state": "reached"},
                                                     {"id": "flow", "state": "clear"},
                                                     {"id": "buffer", "state": "clear"},
                                                     {"id": "household", "state": "clear"}]}]}
    c = chain(transmission.build(quiet, NOW, previous), "rail")
    assert next(s for s in c["stages"] if s["id"] == "pressure")["state"] == "easing"
    assert "it has since gone quiet" in c["text"]


def test_easing_still_lets_the_cascade_through_to_a_later_stage():
    """A shock that has moved on from its first stage has not stopped."""
    inds = [ind("work_stoppages", rung="clear"), ind("diesel", rung="clear"),
            ind("rail_freight", rung="level", direction="below"),
            ind("grain_exports", rung="clear"), ind("ports", rung="clear"),
            ind("grain_stocks", rung="clear"), ind("food_mfg_inventory", rung="clear"),
            ind("store_prices", rung="clear")]
    previous = {"chains": [{"id": "rail", "stages": [{"id": "pressure", "state": "reached"}]}]}
    c = chain(transmission.build(inds, NOW, previous), "rail")
    assert c["stage_reached"] == "flow"


def test_memory_records_the_previous_state_of_each_stage():
    previous = {"chains": [{"id": "rail", "stages": [{"id": "pressure", "state": "reached"}]}]}
    c = chain(transmission.build([ind("diesel", rung="clear")], NOW, previous), "rail")
    assert next(s for s in c["stages"] if s["id"] == "pressure")["previous_state"] == "reached"


# ------------------------------------------------------------------ lateness

def test_a_sign_resting_only_on_late_data_says_so():
    inds = [ind("work_stoppages", rung="level", direction="above", late=True),
            ind("diesel", rung="clear", late=True)]
    c = chain(transmission.build(inds, NOW), "rail")
    assert c["sign_supported"] == "watch"
    assert c["rests_on_late_data"] is True
    assert "where the chain stood when the data stopped" in c["text"]


def test_a_sign_with_fresh_evidence_is_not_marked_late():
    inds = [ind("work_stoppages", rung="level", direction="above", late=False)]
    c = chain(transmission.build(inds, NOW), "rail")
    assert c["rests_on_late_data"] is False


# ------------------------------------------------------------------ honesty about gaps

def test_a_stage_whose_readings_are_all_unreadable_is_not_called_clear():
    inds = [ind("prairie_drought", rung="insufficient"), ind("us_drought", rung="insufficient")]
    c = chain(transmission.build(inds, NOW), "drought")
    assert next(s for s in c["stages"] if s["id"] == "pressure")["state"] == "insufficient"


def test_a_missing_indicator_says_nothing_either_way():
    c = chain(transmission.build([], NOW), "rail")
    w = c["stages"][0]["watch"][0]
    assert w["state"] == "missing"
    assert w["firing"] is False


def test_a_fully_unwatched_chain_says_it_cannot_be_checked():
    cfg = load_yaml("transmission.yml")
    assert any(not st.get("watch") for st in cfg["chains"]["cyber"]["stages"])
    t = transmission.build([], NOW)
    for c in t["chains"]:
        assert c["text"].strip()
        # No chain may ever claim a stage without naming what put it there.
        if c["stage_reached"]:
            s = next(x for x in c["stages"] if x["id"] == c["stage_reached"])
            assert any(w["firing"] for w in s["watch"])


def test_the_release_note_says_what_is_judgement_and_what_is_measured():
    note = transmission.build([], NOW)["note"]
    assert "judgement" in note
    assert "not a forecast" in note


def test_summary_counts_chains_that_have_moved():
    inds = [ind("work_stoppages", rung="level", direction="above")]
    s = transmission.summary(transmission.build(inds, NOW))
    assert s["n_chains"] == 7
    assert s["n_moving"] == 1
    assert s["furthest"][0]["id"] == "rail"
