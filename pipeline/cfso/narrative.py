"""Plain-language summaries built by fixed rules, not by a language model.

Every sentence is assembled from a validated indicator or event and carries
the IDs of the evidence it rests on. Wording rules (from the project's
writing guide): one idea per sentence, every number with its period and
source, no "crisis" language, and "no new data" is never written as
"conditions unchanged".
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

from . import transmission
from .core import iso, read_json, words, write_json
from .indicators import long_date

SITE = "https://bdzion.github.io/canada-food-system-observatory/"
SCENARIO_ORDER = ["rail", "phosphate", "drought", "avian-flu", "export", "cyber", "workforce"]
SCENARIO_TITLE = {
    "rail": "The main rail line to Vancouver closes", "phosphate": "Fertilizer imports are cut before seeding", "drought": "A severe drought hits the Prairies",
    "avian-flu": "Bird flu reaches a major poultry region", "export": "A major buyer closes its market", "cyber": "A cyberattack takes a grocery distributor offline",
    "workforce": "Illness spreads through meat-plant workers",
}
PRAIRIES = {"AB", "SK", "MB"}
STATE_WORDS = {
    "within_reference_range": "normal for the time of year",
    "outside_reference_range_review": "unusual for the time of year",
    "insufficient_data": "not enough past data to compare",
    "official_notice_active": "alerts in effect",
    "none_active": "no alerts in effect",
    "observed": "observed",
    "source_unavailable": "source unavailable",
}


def join_names(xs: list[str]) -> str:
    if len(xs) <= 1:
        return "".join(xs)
    if len(xs) > 4:
        return ", ".join(xs[:3]) + " and others"
    return ", ".join(xs[:-1]) + " and " + xs[-1]


def _ind(inds: list[dict], i: str) -> dict | None:
    return next((x for x in inds if x["id"] == i), None)


def _card(ind: dict | None) -> dict | None:
    if not ind:
        return None
    h = ind.get("headline", {})
    return {"id": ind["id"], "title": ind.get("title"), "role": ind.get("role"), "state": h.get("state"),
            "direction": h.get("direction"), "text": h.get("text"), "period": h.get("period_label"),
            "observation_end": h.get("observation_end"), "scenario": ind.get("scenario") or None}


def situation(release_id: str, now: datetime, inds: list[dict], events: dict, links: list[dict],
              sources: list[dict], prev: dict | None, prev_events: dict, ongoing: list[dict] | None = None,
              trans: dict | None = None) -> dict:
    items = events["items"]
    g = {k: _ind(inds, k) for k in ("grain_stocks", "grain_exports", "produce_prices", "food_affordability", "food_recalls", "weather_alerts",
                                    "sea_lanes", "ports", "world_fertilizer", "world_prices", "diesel", "farm_inputs", "store_prices",
                                    "provincial_prices", "food_insecurity", "rail_freight", "work_stoppages", "exchange_rate",
                                    "prairie_drought", "us_drought")}
    ongoing = ongoing or []
    stale = {x["id"] for x in sources if x["health"] in ("stale", "error")}

    def note(ind: dict) -> str:
        # The indicator's own headline text now carries the lateness sentence
        # (build.mark_lateness), so adding one here would repeat it.
        return ""
    glob = [e for e in items if e["kind"] == "global_hazard"]
    current_glob = [e for e in glob if e.get("is_current")] or glob[:8]
    l1 = [e for e in current_glob if (e.get("canada_link") or {}).get("level") == "L1"]
    notices = [e for e in items if e["kind"] == "gov_notice"]

    # ---- headline sentences, each tied to its evidence
    head = []
    for d in ongoing:
        head.append({"theme": "Ongoing: " + d.get("theme", d["title"]), "text": d["summary"][0] + " " + d["live"]["text"],
                     "evidence": [d["id"], d["live"].get("indicator") or ""], "link": "/threats/ongoing"})
    if g["world_fertilizer"]:
        head.append({"theme": "Fertilizer", "text": g["world_fertilizer"]["headline"]["text"] + note(g["world_fertilizer"]), "evidence": ["world_fertilizer"], "link": "/indicators/world_fertilizer"})
    if g["grain_stocks"]:
        head.append({"theme": "Grain in storage", "text": g["grain_stocks"]["headline"]["text"] + note(g["grain_stocks"]), "evidence": ["grain_stocks"], "link": "/indicators/grain_stocks"})
    if g["grain_exports"]:
        head.append({"theme": "Grain shipped", "text": g["grain_exports"]["headline"]["text"] + note(g["grain_exports"]), "evidence": ["grain_exports"], "link": "/indicators/grain_exports"})
    if g["produce_prices"]:
        head.append({"theme": "Fresh produce", "text": g["produce_prices"]["headline"]["text"] + note(g["produce_prices"]), "evidence": ["produce_prices"], "link": "/indicators/produce_prices"})
    if g["food_affordability"]:
        head.append({"theme": "Grocery bills", "text": g["food_affordability"]["headline"]["text"] + note(g["food_affordability"]), "evidence": ["food_affordability"], "link": "/indicators/food_affordability"})
    tr = (trans or {}).get("chains") or []
    moved = [c for c in tr if c.get("stage_reached")]
    if moved:
        c = moved[0]
        head.append({"theme": "How far it has travelled",
                     "text": (f"Of the {len(tr)} chains of knock-on effects we follow, {len(moved)} show readings that "
                              f"have moved along them. The furthest is “{c['title'].lower()}”, where the evidence has "
                              f"reached {c['stage_reached_label'].lower()}."),
                     "evidence": [w["indicator"] for s in c["stages"] for w in s["watch"] if w["firing"]][:5],
                     "link": f"/threats/{c['id']}"})
    if current_glob:
        nd = len(current_glob)
        txt = (f"The Global Disaster Alert and Coordination System, run by the United Nations and the European Commission, lists {words(nd)} serious disaster{'s' if nd != 1 else ''} around the world. "
               + (f"{words(len(l1), True)} {'is' if len(l1) == 1 else 'are'} in countries Canada buys food or farm supplies from. "
                  "That tells us where to look; it does not mean Canada is affected."
                  if l1 else "None is in a country that supplies a large share of the foods and farm supplies we track."))
        head.append({"theme": "Disasters abroad", "text": txt, "evidence": [e["id"] for e in l1[:5]], "link": "/threats/abroad"})

    # ---- four columns: what is happening -> where it could reach Canada -> what absorbs it -> who feels it
    happening = [c for c in (_card(g["sea_lanes"]), _card(g["weather_alerts"]), _card(g["prairie_drought"]), _card(g["us_drought"]),
                             _card(g["food_recalls"]), _card(g["work_stoppages"])) if c]
    if current_glob:
        happening.append({"id": "global_hazards", "title": "Disasters abroad", "role": "signal",
                          "state": "official_notice_active", "text": f"{words(len(current_glob), True)} serious disaster{'s' if len(current_glob) != 1 else ''} listed worldwide in recent weeks; {words(len(l1))} in countries that supply Canada.",
                          "period": "Last checked " + long_date(now.date().isoformat()), "scenario": None})
    if notices:
        n30 = [n for n in notices if n["date"] >= (now.date() - timedelta(days=30)).isoformat()]
        happening.append({"id": "gov_notices", "title": "Government announcements", "role": "signal", "state": "official_notice_active",
                          "text": f"{len(n30)} announcement{'s' if len(n30) != 1 else ''} about food or farming from Agriculture and Agri-Food Canada, the Canadian Food Inspection Agency or Public Safety Canada in the last 30 days.",
                          "period": "Last 30 days", "scenario": None})
    reach, seen_pairs = [], set()
    for e in l1:
        top0 = e["canada_link"]["commodities"][0]
        pair = (top0["iso3"], top0["hs"])
        if pair in seen_pairs or len(reach) >= 4:
            continue  # two cyclones in the same country add no new supplier link
        seen_pairs.add(pair)
        top = e["canada_link"]["commodities"][0]
        more = len(e["canada_link"]["commodities"]) - 1
        reach.append({"id": e["id"], "title": e["title"], "level": "L1",
                      "text": (f"{top['country']} supplied {top['share'] * 100:.0f}% of the {top['label'].lower()} Canada imported in {top['year']}"
                               + (f", and {words(more)} other product{'s' if more != 1 else ''} we track." if more else ".")
                               + (f" {top['country']} is a large country, so the disaster may be far from where these are grown." if top.get("large_country") else "")),
                      "scenario": top.get("scenario")})
    reach += [c for c in (_card(g["world_fertilizer"]), _card(g["world_prices"]), _card(g["diesel"]), _card(g["exchange_rate"])) if c]
    absorbs = [c for c in (_card(g["grain_stocks"]), _card(g["grain_exports"]), _card(g["rail_freight"]), _card(g["ports"]),
                           _card(g["farm_inputs"]), _card(g["produce_prices"])) if c]
    feels = [c for c in (_card(g["food_affordability"]), _card(g["store_prices"]), _card(g["provincial_prices"]), _card(g["food_insecurity"])) if c]

    # ---- questions worth asking (prompts, not prescriptions)
    qs = []
    gx, gs = g["grain_exports"], g["grain_stocks"]
    if gx and gx["headline"].get("direction") == "below":
        qs.append({"text": "Grain is leaving the ports more slowly than in any recent year at this time. Is the cause rail, ports, weather or weaker sales?", "scenario": "rail"})
    if gs and gs["headline"].get("direction") == "above":
        qs.append({"text": "There is more grain in storage than in any recent year at this time. Is that a comfortable reserve, or grain waiting for trains and ships?", "scenario": "rail"})
    if gs and gs["headline"].get("direction") == "below":
        qs.append({"text": "There is less grain in storage than in any recent year at this time. How much room is left if deliveries are disrupted?", "scenario": "rail"})
    pp = g["produce_prices"]
    if pp and pp["headline"].get("above"):
        hi = [i.get("short") or i["label"] for i in pp.get("items", []) if i.get("direction") == "above"]
        names = join_names(hi)
        qs.append({"text": f"Wholesale prices for {names} are higher than in any recent year at this time. Is the cause weather where they are grown, the exchange rate, or something else?", "scenario": None})
    fa = g["food_affordability"]
    if fa and fa["headline"].get("direction") == "food_faster":
        qs.append({"text": "Grocery prices are rising faster than wages. Which households feel this first, and are income supports and food banks keeping up?", "scenario": None})
    wf = g["world_fertilizer"]
    if wf and wf["headline"].get("direction") == "above":
        qs.insert(0, {"text": "World fertilizer prices are higher than at this time in any of the past five years. Have farmers booked fertilizer for spring seeding, and at what price?", "scenario": "phosphate"})
    sl = g["sea_lanes"]
    if sl and any(i.get("direction") == "below" for i in sl.get("items", [])):
        names = join_names([("" if i["label"].startswith("The ") else "the ") + i["label"] for i in sl["items"] if i.get("direction") == "below"])
        qs.append({"text": f"Fewer ships than usual are passing through {names}. Which Canadian imports and exports use these routes, and what are the alternatives?", "scenario": "phosphate"})
    ds = g["diesel"]
    if ds and ds["headline"].get("direction") == "above":
        qs.append({"text": "Diesel costs more than at this time in any recent year, after inflation. How much of that reaches farm costs and grocery prices, and how soon?", "scenario": None})
    fert = [e for e in l1 if any(c["group"] == "inputs" for c in e["canada_link"]["commodities"])]
    if fert:
        qs.append({"text": f"A disaster has hit a country that supplies Canadian farms with {fert[0]['canada_link']['commodities'][0]['label'].lower()}. If supply is disrupted, would it be before spring seeding?", "scenario": "phosphate"})
    if not qs:
        qs.append({"text": "None of the readings we track is unusual this week. Which weak point would you check first if that changed?", "scenario": None})

    # ---- one stress test to explore this week, with the reason
    # The cascade decides this now: the chain whose readings have travelled
    # furthest is the one worth looking at, and its reason is the evidence.
    wx = g["weather_alerts"]
    prairie_warn = bool(wx and set(wx["headline"].get("by_province", {})) & PRAIRIES)
    furthest = ((trans or {}).get("chains") or [None])[0]
    if furthest and furthest.get("stage_reached"):
        pick = furthest["id"]
        why = (f"the readings along it have reached “{furthest['stage_reached_label'].lower()}”, "
               "further than any other chain we follow")
    elif fert:
        pick, why = "phosphate", "a disaster has hit a country that supplies Canadian fertilizer or fuel"
    elif any(d["live"]["state"] == "still_showing" for d in ongoing):
        pick, why = "phosphate", "a sea lane that carries much of the world's fertilizer is still largely closed"
    elif prairie_warn and now.month in (5, 6, 7, 8):
        pick, why = "drought", "weather alerts are in effect on the Prairies during the growing season"
    else:
        wk = now.isocalendar()[1]
        pick, why = SCENARIO_ORDER[wk % len(SCENARIO_ORDER)], "no reading this week points to one threat in particular, so we feature a different one each week"

    # ---- what changed since the previous release
    changes = []
    prev_ids = {e["id"] for e in (prev_events or {}).get("items", [])}
    if prev_ids:
        new_ev = [e for e in items if e["id"] not in prev_ids]
        for kind, label in (("recall", "new food recall"), ("weather_alert", "new weather alert"), ("us_alert", "new US weather alert"),
                            ("gov_notice", "new government announcement"), ("global_hazard", "new disaster abroad")):
            n = [e for e in new_ev if e["kind"] == kind]
            if n:
                changes.append({"kind": "new_event", "text": f"{len(n)} {label}{'s' if len(n) != 1 else ''}", "ids": [e["id"] for e in n][:20], "link": "/threats/warnings" if kind != "global_hazard" else "/threats/abroad"})
    prev_cards = {c["id"]: c for col in (prev or {}).get("columns", {}).values() for c in col if isinstance(c, dict)}
    for col in (happening, [c for c in reach if c.get("role")], absorbs, feels):
        for c in col:
            p = prev_cards.get(c["id"])
            if p and p.get("observation_end") != c.get("observation_end") and c["id"] not in ("weather_alerts", "global_hazards", "gov_notices") and not c["id"].startswith(("GL-", "EQ-", "TC-", "FL-", "VO-", "DR-", "WF-")):
                changes.append({"kind": "new_observation", "text": f"New data for {c['title'].lower()} ({c['period']})", "ids": [c["id"]], "link": f"/indicators/{c['id']}"})
            if p and p.get("state") != c.get("state") and c.get("state") and p.get("state"):
                changes.append({"kind": "state_change", "text": f"{c['title']}: now {STATE_WORDS.get(c['state'], c['state'])} (before: {STATE_WORDS.get(p['state'], p['state'])})", "ids": [c["id"]], "link": f"/indicators/{c['id']}"})
    gaps = [{"source_id": s["id"], "health": s["health"],
             "text": (f"{s['provider']}: the latest update failed, so we show data up to {long_date(s['observation_end'])}." if s["health"] == "error"
                      else f"{s['provider']}: the newest data ({long_date(s['observation_end'])}) are older than this source usually is." if s["health"] == "stale"
                      else f"{s['provider']}: no data available.")}
            for s in sources if s["health"] != "ok"]
    return {
        "release_id": release_id,
        "headline": head,
        "columns": {"happening": happening, "reach": reach, "absorbs": absorbs, "feels": feels},
        "questions": qs[:5],
        "scenario_of_week": {"id": pick, "title": SCENARIO_TITLE[pick], "reason": why},
        "changes": changes,
        "gaps": gaps,
        "counts": {"global_current": len(current_glob), "global_l1": len(l1), "events": len(items),
                   "unusual": sum(1 for i in inds if i.get("headline", {}).get("state") == "outside_reference_range_review"),
                   "indicators": len(inds)},
        "ongoing": [{"id": d["id"], "title": d["title"], "since": d["since"], "days": d["days"], "live": d["live"],
                     "review_overdue": d["review_overdue"], "expired": d.get("expired")} for d in ongoing],
        "transmission": (transmission.summary(trans) if trans else None),
    }


# ------------------------------------------------------------------ weekly brief

def _last_complete_week(now: datetime) -> tuple[date, date, str]:
    today = now.date()
    end = today - timedelta(days=today.isoweekday())  # most recent Sunday before today
    start = end - timedelta(days=6)
    y, w, _ = start.isocalendar()
    return start, end, f"{y}-W{w:02d}"


def write_brief_if_due(out: Path, now: datetime, sit: dict, inds: list[dict], events: dict,
                       links: list[dict], sources: list[dict]) -> None:
    start, end, wid = _last_complete_week(now)
    jpath = out / "briefs" / f"{wid}.json"
    if jpath.exists():
        return
    s, e = start.isoformat(), end.isoformat()
    in_week = [x for x in events["items"] if x.get("date") and s <= x["date"][:10] <= e]
    changed = []
    for kind, label in (("recall", "Food recall notices (CFIA)"), ("gov_notice", "Government announcements"),
                        ("global_hazard", "Global hazard alerts (GDACS)")):
        xs = [x for x in in_week if x["kind"] == kind]
        if xs:
            changed.append({"theme": label, "count": len(xs),
                            "items": [{"title": x["title"], "date": x["date"], "url": x["url"], "id": x["id"]} for x in xs[:8]]})
    conditions = []
    for i in inds:
        h = i.get("headline", {})
        conditions.append({"id": i["id"], "title": i.get("title"), "text": h.get("text"), "period": h.get("period_label"),
                           "state": h.get("state"), "sources": i.get("source_ids", [])})
    glob = []
    for l in links:
        if l["level"] != "L1":
            continue
        ev = next((x for x in events["items"] if x["id"] == l["event_id"]), None)
        if ev and ev.get("date") and ev["date"] >= (start - timedelta(days=21)).isoformat():
            top = l["commodities"][0]
            glob.append({"title": ev["title"], "url": ev["url"], "level": "L1",
                         "text": f"{top['country']} supplied {top['share'] * 100:.0f}% of the {top['label'].lower()} Canada imported in {top['year']}. We do not yet know whether this disaster affects that supply."})
    brief = {
        "schema_version": "1.0.0", "id": wid, "week_start": s, "week_end": e,
        "prepared_at": iso(now), "release_id": sit.get("release_id"),
        "status": "A weekly summary prepared automatically from official data. It is a research product, not an official warning, and it has not been reviewed by an analyst.",
        "overview": [h["text"] for h in sit["headline"]],
        "changed": changed, "conditions": conditions, "global": glob[:8],
        "gaps": [g["text"] for g in sit["gaps"]],
        "questions": [q["text"] for q in sit["questions"]],
        "stress_test": sit["scenario_of_week"],
        "sources": [{"id": x["id"], "provider": x["provider"], "dataset": x["dataset"], "observation_end": x["observation_end"],
                     "url": x["documentation_url"]} for x in sources],
    }
    write_json(jpath, brief)
    (out / "briefs" / f"{wid}.md").write_text(brief_markdown(brief), encoding="utf-8")
    idx = sorted({p.stem for p in (out / "briefs").glob("*-W*.json")}, reverse=True)
    metas = []
    for b in idx:
        d = read_json(out / "briefs" / f"{b}.json", {})
        metas.append({"id": b, "week_start": d.get("week_start"), "week_end": d.get("week_end"),
                      "prepared_at": d.get("prepared_at"), "lead": (d.get("overview") or [""])[0]})
    write_json(out / "briefs" / "index.json", {"schema_version": "1.0.0", "briefs": metas})


def brief_markdown(b: dict) -> str:
    L = [f"# Canada Food System Observatory: weekly brief, {long_date(b['week_start'])} to {long_date(b['week_end'])}", "",
         f"**Week:** {b['id']}  ",
         f"**Prepared:** {b['prepared_at']} (data update {b['release_id']})  ",
         f"**Note:** {b['status']}", "", "## Summary", ""]
    L += [f"- {t}" for t in b["overview"]] + ["", "## New this week", ""]
    if b["changed"]:
        for c in b["changed"]:
            L.append(f"**{c['theme']}: {c['count']}**")
            L += [f"- [{i['title']}]({i['url']}) ({i['date']})" for i in c["items"]]
            L.append("")
    else:
        L += ["No new government notices were recorded this week.", ""]
    L += ["## Latest readings (each with its own data date)", ""]
    L += [f"- **{c['title']}** — {c['text']} *Data: {c['period']}.*" for c in b["conditions"]]
    L += ["", "## Disasters abroad in countries that supply Canada", ""]
    L += ([f"- [{g['title']}]({g['url']}) — {g['text']}" for g in b["global"]] or ["- None this week."])
    L += ["", "## Gaps in the data", ""] + ([f"- {g}" for g in b["gaps"]] or ["- All sources updated normally."])
    L += ["", "## Questions to ask", ""] + [f"- {q}" for q in b["questions"]]
    st = b["stress_test"]
    L += ["", "## A what-if to try", "",
          f"[{st['title']}]({SITE}#/threats/{st['id']}): we chose it because {st['reason']}. It is a simple illustration, not a forecast.",
          "", "## Sources", ""]
    L += [f"- {s['provider']}, {s['dataset']} (data to {s['observation_end'] or 'n/a'}): {s['url']}" for s in b["sources"]]
    return "\n".join(L) + "\n"


def write_feed(out: Path, now: datetime) -> None:
    idx = read_json(out / "briefs" / "index.json", {"briefs": []})
    items = []
    for b in idx["briefs"][:20]:
        pub = datetime.fromisoformat(b["prepared_at"].replace("Z", "+00:00")) if b.get("prepared_at") else now
        link = f"{SITE}#/briefs/{b['id']}"
        items.append(
            f"<item><title>{escape('Weekly brief ' + b['id'])}</title><link>{escape(link)}</link>"
            f"<guid isPermaLink=\"true\">{escape(link)}</guid><pubDate>{format_datetime(pub)}</pubDate>"
            f"<description>{escape(b.get('lead') or '')}</description></item>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
           "<title>Canada Food System Observatory: weekly brief</title>"
           f"<link>{SITE}</link><description>A weekly summary of official Canadian and global data on the food system. A research product, not an official warning service.</description>"
           f"<language>en-ca</language><lastBuildDate>{format_datetime(now)}</lastBuildDate>"
           + "".join(items) + "</channel></rss>\n")
    (out / "feed.xml").write_text(xml, encoding="utf-8")
