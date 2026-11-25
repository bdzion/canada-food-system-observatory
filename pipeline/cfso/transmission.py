"""How far along the food chain the evidence has reached, for each what-if test.

This is the piece that connects what the site watches to what it illustrates.
Before it, the seven what-if tests set their warning signs at fixed days of a
simulation and the site told the reader, in as many words, that the test did
not use the live figures.

What this module does NOT do is feed live readings into the models. The tests
remain illustrations whose settings the reader chooses, because driving a
seven-parameter illustrative model from live data would manufacture precision
the data cannot support and would make the output move under the reader's feet.
The cascade is a separate, parallel statement about what the readings show.

The design is taken from the European Drought Observatory's Combined Drought
Indicator (docs/benchmarking.md section 6), which classifies a place by which
link of the drought cascade its evidence has reached. Two features of it are
kept deliberately:

- memory: a stage depends on the readings now and on the stage at the previous
  release, so the stage does not flicker between updates and a disruption reads
  as one continuous thing;
- explicit easing: a chain that reached a stage and whose evidence has since
  returned to normal is not the same as one that was never affected.

Each stage also carries how many of the indicators watched there are firing, out
of how many, following ASAP's practice of publishing the machine evidence beside
the verdict. A stage reached on one of four indicators reads differently from one
reached on four of four.

Nothing here invents a reading. A stage with no indicator is reported as
unwatched, with the reason, rather than as clear: there is no open, current
Canadian data for animal disease or for cyber incidents at food businesses, and
saying "nothing to report" about an unwatched stage would be a lie of omission.
"""
from __future__ import annotations

from datetime import date, datetime

from .core import load_yaml
from .indicators import long_date
from .screening import RUNGS

#: Reached-ness of a stage, weakest first.
STATES = ["unwatched", "insufficient", "clear", "easing", "reached"]

TRIGGER_ORDER = ["watch", "ready", "act"]
TRIGGER_LABEL = {"watch": "Watch", "ready": "Get ready", "act": "Act now"}


def _directions(rung: str | None, pace: dict, level: dict) -> set[str]:
    """Which way this reading moved, according to whichever screen fired.

    The direction has to come from the screen that actually fired, not from
    either of them: a price at a five-year high that is now falling fast should
    not count as "rising" just because its level is high. Where both fired, both
    have to agree, or the reading is treated as giving no clear direction.
    """
    band = pace.get("band") or ""
    lvl = {"above": "up", "below": "down"}.get(level.get("direction"))
    pc = "up" if band.endswith("above") else ("down" if band.endswith("below") else None)
    if rung == "level":
        return {lvl} if lvl else set()
    if rung == "pace":
        return {pc} if pc else set()
    if rung == "converging":
        return {lvl} if (lvl and lvl == pc) else set()
    return set()


def _panel_directions(ind: dict, rung: str | None) -> set[str]:
    """For a panel, the direction of the lines that fired, if they agree.

    A panel's own summary direction is "some" when the main series is normal and
    another line is not, which says nothing about which way. The lines that
    fired do say — but only if they say the same thing. In a basket of fifteen
    foods, a few rising while a few fall is the ordinary state of affairs, and
    reading that as "prices are rising" would fire this stage on every chain
    every month. So a panel gives a direction only when every line that fired
    agrees on it. To watch one line in particular, name it with `item`.
    """
    dirs = []
    for it in ind.get("items", []):
        if it.get("context"):
            continue
        sc = it.get("screen") or {}
        if sc.get("rung") in ("level", "pace", "converging"):
            dirs.append(_directions(sc["rung"], it.get("pace") or {}, it))
    found = set().union(*dirs) if dirs else set()
    return found if len(found) == 1 else set()


def _dirs_match(want: str, dirs: set[str]) -> bool:
    if want in (None, "", "either"):
        return True
    return want in dirs


def _reading(inds: dict, w: dict) -> dict | None:
    """Pull out the one reading a watch entry points at, with its screen."""
    ind = inds.get(w["indicator"])
    if not ind:
        return None
    h = ind.get("headline") or {}
    if w.get("item"):
        it = next((x for x in ind.get("items", []) if x.get("id") == w["item"]), None)
        if not it:
            return None
        isc = it.get("screen") or {}
        return {"title": f"{ind.get('title')}: {it.get('label')}", "screen": isc,
                "level": it, "pace": it.get("pace") or {}, "period": it.get("period"),
                "dirs": _directions(isc.get("rung"), it.get("pace") or {}, it),
                "observation_end": it.get("t"), "value": it.get("value"), "unit": it.get("unit"),
                "late": bool(h.get("late")), "late_note": h.get("late_note"), "age_days": h.get("age_days")}
    sc = h.get("screen") or {}
    dirs = _directions(sc.get("rung"), h.get("pace") or {}, h)
    if not dirs and ind.get("items"):
        dirs = _panel_directions(ind, sc.get("rung"))
    return {"title": ind.get("title"), "screen": sc, "level": h,
            "pace": h.get("pace") or {}, "period": h.get("period_label"), "dirs": dirs,
            "observation_end": h.get("observation_end"), "value": h.get("value"), "unit": h.get("unit"),
            "late": bool(h.get("late")), "late_note": h.get("late_note"), "age_days": h.get("age_days")}


def _evaluate_watch(inds: dict, w: dict) -> dict:
    """Is this one indicator saying what this stage is listening for?"""
    r = _reading(inds, w)
    base = {"indicator": w["indicator"], "item": w.get("item"), "why": w["why"],
            "rungs": w.get("rungs", []), "direction": w.get("direction", "either")}
    if r is None:
        return {**base, "state": "missing", "firing": False,
                "text": "This figure is not in the current update, so it says nothing either way."}
    sc = r["screen"]
    rung = sc.get("rung")
    on_rung = rung in w.get("rungs", [])
    matched = _dirs_match(w.get("direction", "either"), r["dirs"])
    firing = bool(on_rung and matched)
    if rung in (None, "not_screened"):
        state = "not_screened"
    elif rung == "insufficient":
        state = "insufficient"
    else:
        state = "firing" if firing else "quiet"
    return {**base, "state": state, "firing": firing, "rung": rung,
            "title": r["title"], "period": r["period"], "observation_end": r["observation_end"],
            "value": r["value"], "unit": r["unit"], "late": r["late"], "late_note": r["late_note"],
            "age_days": r["age_days"],
            "rung_label": sc.get("rung_label"),
            "direction_seen": "/".join(sorted(r["dirs"])) or r["level"].get("direction"),
            "text": r["level"].get("text") or ""}


def _stage_state(watches: list[dict], min_firing: int, unwatched_why: str | None) -> tuple[str, dict]:
    n_firing = sum(1 for w in watches if w["firing"])
    counts = {"watched": len(watches), "firing": n_firing,
              "quiet": sum(1 for w in watches if w["state"] == "quiet"),
              "unreadable": sum(1 for w in watches if w["state"] in ("insufficient", "missing", "not_screened")),
              "late": sum(1 for w in watches if w.get("late"))}
    if not watches:
        return "unwatched", counts
    if n_firing >= min_firing:
        return "reached", counts
    if counts["quiet"] == 0:
        # Nothing here could have spoken, so "clear" would overstate it.
        return "insufficient", counts
    return "clear", counts


def _chain_stage(stage_states: list[tuple[str, str]]) -> tuple[str | None, list[str]]:
    """The chain's position, and any downstream stage firing without support.

    A shock travelling along a chain leaves evidence at each link it passes, so
    a stage counts as part of the chain's position only if every stage before it
    is also reached or easing. This is the whole point of a cascade and not a
    scoreboard: egg prices being high is not evidence of an outbreak unless
    something upstream of the shop shelf says so too.

    An unwatched stage breaks the chain rather than passing it: when there is no
    figure for a link, we cannot know whether the shock passed through it, and
    assuming it did would turn a gap in the data into a finding.

    Returns (furthest contiguous stage, ids of unsupported downstream stages).
    """
    position, broken, unsupported = None, False, []
    for sid, st in stage_states:
        if st in ("reached", "easing") and not broken:
            if st == "reached":
                position = sid
            continue
        if st == "reached" and broken:
            unsupported.append(sid)
            continue
        broken = True
    return position, unsupported


def build(inds: list[dict], now: datetime, previous: dict | None = None) -> dict:
    """Evaluate every chain against the current readings.

    `previous` is the last published transmission.json, used for memory: a stage
    the chain had reached, whose evidence has since gone quiet, is reported as
    easing rather than simply dropping back to clear.
    """
    cfg = load_yaml("transmission.yml")
    by_id = {i["id"]: i for i in inds}
    stage_meta = {s["id"]: s for s in cfg["stages"]}
    prev_chains = {c["id"]: c for c in (previous or {}).get("chains", [])}
    out = []

    for cid, chain in cfg["chains"].items():
        prev = prev_chains.get(cid, {})
        prev_states = {s["id"]: s.get("state") for s in prev.get("stages", [])}
        prev_reached = {s["id"] for s in prev.get("stages", []) if s.get("state") in ("reached", "easing")}
        stages, pairs = [], []
        for st in chain["stages"]:
            meta = stage_meta[st["id"]]
            watches = [_evaluate_watch(by_id, w) for w in (st.get("watch") or [])]
            state, counts = _stage_state(watches, st.get("min_firing", 1), st.get("unwatched_why"))
            # Memory: a stage that was reached and has gone quiet is easing, not
            # clear. It stays easing until it is reached again or the entry is
            # rebuilt, so a reader can see a disruption as one continuous thing.
            if state in ("clear", "insufficient") and st["id"] in prev_reached:
                state = "easing"
            oldest = [w["observation_end"] for w in watches if w.get("observation_end")]
            stages.append({
                "id": st["id"], "label": meta["label"], "what": meta["what"], "link": st.get("link"),
                "state": state, "previous_state": prev_states.get(st["id"]),
                "counts": counts, "min_firing": st.get("min_firing", 1),
                "unwatched_why": st.get("unwatched_why"),
                "oldest_observation": min(oldest) if oldest else None,
                "any_late": any(w.get("late") for w in watches),
                "watch": watches,
            })
            pairs.append((st["id"], state))

        reached, unsupported = _chain_stage(pairs)
        for s in stages:
            s["unsupported"] = s["id"] in unsupported
        # Which of the three warning signs the readings currently support. A
        # sign needs its stage to be part of the chain's position, not merely
        # firing on its own, and it is marked when the evidence under it is
        # older than its source normally publishes.
        in_position = set()
        for sid, st in pairs:
            if st in ("reached", "easing"):
                in_position.add(sid)
            else:
                break
        signs = []
        for key in TRIGGER_ORDER:
            t = (chain.get("triggers") or {}).get(key)
            if not t:
                continue
            s = next((x for x in stages if x["id"] == t["stage"]), None)
            firing = [w for w in (s["watch"] if s else []) if w["firing"]]
            supported = bool(s and s["state"] == "reached" and s["id"] in in_position
                             and len(firing) >= t.get("min_firing", 1))
            all_late = bool(firing) and all(w.get("late") for w in firing)
            signs.append({
                "id": key, "label": TRIGGER_LABEL[key], "stage": t["stage"],
                "stage_label": stage_meta[t["stage"]]["label"], "min_firing": t.get("min_firing", 1),
                "text": t["text"], "supported": supported,
                "rests_on_late_data": supported and all_late,
                "fired_without_support": bool(s and s["state"] == "reached" and s["id"] not in in_position),
                "stage_state": s["state"] if s else "unknown",
                "firing": len(firing),
                "watched": s["counts"]["watched"] if s else 0,
                "evidence": [{"indicator": w["indicator"], "item": w.get("item"), "title": w.get("title"),
                              "rung": w.get("rung"), "period": w.get("period"), "late": w.get("late")}
                             for w in firing],
            })
        highest = next((s["id"] for s in reversed(signs) if s["supported"]), None)
        unwatched = [s["id"] for s in stages if s["state"] == "unwatched"]
        late = [s["id"] for s in stages if s["any_late"]]
        out.append({
            "id": cid, "title": chain["title"], "summary": chain["summary"],
            "stage_reached": reached,
            "stage_reached_label": stage_meta[reached]["label"] if reached else None,
            "sign_supported": highest,
            "sign_supported_label": TRIGGER_LABEL[highest] if highest else None,
            "stages": stages, "signs": signs,
            "depends_on": chain.get("depends_on", []),
            "unwatched_stages": unwatched, "late_stages": late, "unsupported_stages": unsupported,
            "rests_on_late_data": any(s["supported"] and s["rests_on_late_data"] for s in signs),
            "text": _chain_words(chain, stages, reached, highest, stage_meta, unwatched, late, unsupported),
        })
    out.sort(key=lambda c: (-_rank(c), c["id"]))
    return {
        "generated_at": now.isoformat(),
        "stages": cfg["stages"],
        "chains": out,
        "note": ("Each chain shows how far along the food chain the published readings have reached. "
                 "The stages and the levels that count as a reading speaking are the research team's "
                 "judgement, not measurements, and no Canadian threshold for any of them has been "
                 "validated against past events. The readings themselves are published figures, and "
                 "each one is named so it can be checked. This is not a forecast and not a warning: "
                 "only the responsible agency can issue a warning."),
    }


def _rank(chain: dict) -> int:
    order = {None: 0, "pressure": 1, "flow": 2, "buffer": 3, "household": 4}
    return order.get(chain["stage_reached"], 0)


def _chain_words(chain: dict, stages: list[dict], reached: str | None, sign: str | None,
                 stage_meta: dict, unwatched: list[str], late: list[str],
                 unsupported: list[str] | None = None) -> str:
    """One plain paragraph a reader can act on, or decline to act on."""
    unsupported = unsupported or []
    if reached is None:
        if all(s["state"] == "unwatched" for s in stages):
            return ("We have no live figure for any stage of this chain, so this test cannot be checked "
                    "against the data at all. What it would take is listed below.")
        base = "Nothing has travelled along this chain: the earliest stage we can read is quiet."
    else:
        s = next(x for x in stages if x["id"] == reached)
        c = s["counts"]
        base = (f"The readings along this chain have reached the stage “{s['label'].lower()}”: "
                f"{c['firing']} of the {c['watched']} figures we watch there {'is' if c['firing'] == 1 else 'are'} "
                "saying so. " + s["what"])
        if sign:
            base += f" On the team's judgement that matches the “{TRIGGER_LABEL[sign].lower()}” sign below."
            fired = [w for st in stages if st["id"] == reached for w in st["watch"] if w["firing"]]
            if fired and all(w.get("late") for w in fired):
                base += (" Every figure putting it there is older than its source normally publishes, so this is "
                         "where the chain stood when the data stopped, not where it stands today. Check the sources "
                         "before treating it as current.")
        else:
            base += " That does not yet match any of the three warning signs below."
    if unsupported:
        names = ", ".join(f"“{stage_meta[u]['label'].lower()}”" for u in unsupported)
        base += (f" A reading further down the chain, at {names}, has also moved — but nothing upstream of it has, "
                 "so this chain is not the explanation. Look for another cause, such as prices across the board.")
    easing = [s["label"].lower() for s in stages if s["state"] == "easing"]
    if easing:
        base += (" Earlier in this disruption the evidence reached " + ", ".join(easing)
                 + "; it has since gone quiet, which is not the same as never having happened.")
    if unwatched:
        names = ", ".join(stage_meta[u]["label"].lower() for u in unwatched)
        base += (f" We have no figure at all for {'the stage' if len(unwatched) == 1 else 'the stages'} "
                 f"“{names}”, so a shock could be under way there and this chain would stay quiet.")
    if late:
        names = ", ".join(stage_meta[u]["label"].lower() for u in late)
        base += (f" Some of the figures behind “{names}” are older than their source normally publishes, "
                 "so read this as the last position we could measure, not the current one.")
    return base


def summary(t: dict) -> dict:
    """A short digest for the overview and the weekly brief."""
    chains = t["chains"]
    moving = [c for c in chains if c["stage_reached"]]
    return {
        "n_chains": len(chains),
        "n_moving": len(moving),
        "n_unwatched": sum(1 for c in chains if len(c["unwatched_stages"]) == len(c["stages"])),
        "furthest": ([{"id": c["id"], "title": c["title"], "stage": c["stage_reached"],
                       "stage_label": c["stage_reached_label"], "sign": c["sign_supported"],
                       "sign_label": c["sign_supported_label"]} for c in moving[:3]]),
        "text": (f"Of the {len(chains)} chains we follow, {len(moving)} show readings that have moved along them."
                 if moving else
                 f"None of the {len(chains)} chains we follow shows readings that have moved along it."),
    }
