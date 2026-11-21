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

from .core import iso, read_json, write_json
from .indicators import long_date

SITE = "https://bdzion.github.io/canada-food-system-observatory/"
SCENARIO_ORDER = ["rail", "phosphate", "drought", "avian-flu", "export", "cyber", "workforce"]
SCENARIO_TITLE = {
    "rail": "Rail or port shutdown", "phosphate": "Fertilizer supply cut", "drought": "Prairie drought",
    "avian-flu": "Avian influenza", "export": "Export market closure", "cyber": "Cyberattack on food distribution",
    "workforce": "Meat-plant workforce outbreak",
}
PRAIRIES = {"AB", "SK", "MB"}
STATE_WORDS = {
    "within_reference_range": "within its usual range",
    "outside_reference_range_review": "outside its usual range (review suggested)",
    "insufficient_data": "not enough history to compare",
    "official_notice_active": "official notices active",
    "none_active": "no notices active",
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
              sources: list[dict], prev: dict | None, prev_events: dict) -> dict:
    items = events["items"]
    g = {k: _ind(inds, k) for k in ("grain_stocks", "grain_exports", "produce_prices", "food_affordability", "food_recalls", "weather_alerts")}
    glob = [e for e in items if e["kind"] == "global_hazard"]
    current_glob = [e for e in glob if e.get("is_current")] or glob[:8]
    l1 = [e for e in current_glob if (e.get("canada_link") or {}).get("level") == "L1"]
    notices = [e for e in items if e["kind"] == "gov_notice"]

    # ---- headline sentences, each tied to its evidence
    head = []
    if g["grain_stocks"]:
        head.append({"theme": "Buffers", "text": g["grain_stocks"]["headline"]["text"], "evidence": ["grain_stocks"], "link": "/indicators/grain_stocks"})
    if g["grain_exports"]:
        head.append({"theme": "Logistics", "text": g["grain_exports"]["headline"]["text"], "evidence": ["grain_exports"], "link": "/indicators/grain_exports"})
    if g["produce_prices"]:
        head.append({"theme": "Markets", "text": g["produce_prices"]["headline"]["text"], "evidence": ["produce_prices"], "link": "/indicators/produce_prices"})
    if g["food_affordability"]:
        head.append({"theme": "Households", "text": g["food_affordability"]["headline"]["text"], "evidence": ["food_affordability"], "link": "/indicators/food_affordability"})
    if current_glob:
        txt = (f"GDACS lists {len(current_glob)} orange or red hazard alert{'s' if len(current_glob) != 1 else ''} worldwide. "
               + (f"{len(l1)} {'is' if len(l1) == 1 else 'are'} in countries Canada has recently imported tracked foods or farm inputs from; "
                  "that is a supplier link, not evidence of an effect on Canada."
                  if l1 else "None is in a country that supplies a large share of the tracked imports."))
        head.append({"theme": "World", "text": txt, "evidence": [e["id"] for e in l1[:5]], "link": "/exposure"})

    # ---- four columns: what is happening -> where it could reach Canada -> what absorbs it -> who feels it
    happening = [c for c in (_card(g["weather_alerts"]), _card(g["food_recalls"])) if c]
    if current_glob:
        happening.append({"id": "global_hazards", "title": "Global hazard alerts", "role": "signal",
                          "state": "official_notice_active", "text": f"{len(current_glob)} orange or red GDACS alerts in the last few weeks.",
                          "period": "Last checked " + long_date(now.date().isoformat()), "scenario": None})
    if notices:
        n30 = [n for n in notices if n["date"] >= (now.date() - timedelta(days=30)).isoformat()]
        happening.append({"id": "gov_notices", "title": "Government announcements", "role": "signal", "state": "official_notice_active",
                          "text": f"{len(n30)} food-related news release{'s' if len(n30) != 1 else ''} from AAFC, CFIA or Public Safety Canada in the last 30 days.",
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
                      "text": (f"{top['country']} supplied {top['share'] * 100:.0f}% of Canada's {top['label'].lower()} imports by value in {top['year']}"
                               + (f", plus {more} other tracked product{'s' if more != 1 else ''}." if more else ".")
                               + (" Large country: the hazard may be far from where it is grown." if top.get("large_country") else "")),
                      "scenario": top.get("scenario")})
    absorbs = [c for c in (_card(g["grain_stocks"]), _card(g["grain_exports"]), _card(g["produce_prices"])) if c]
    feels = [c for c in (_card(g["food_affordability"]),) if c]

    # ---- questions worth asking (prompts, not prescriptions)
    qs = []
    gx, gs = g["grain_exports"], g["grain_stocks"]
    if gx and gx["headline"].get("direction") == "below":
        qs.append({"text": "Grain exports are slower than in any recent year for this point in the crop year. Is the cause rail, ports, weather or weaker sales?", "scenario": "rail"})
    if gs and gs["headline"].get("direction") == "above":
        qs.append({"text": "Commercial grain stocks are higher than usual. Is that a comfortable buffer, or grain waiting for transport?", "scenario": "rail"})
    if gs and gs["headline"].get("direction") == "below":
        qs.append({"text": "Commercial grain stocks are lower than usual. How much room is there if deliveries or imports are disrupted?", "scenario": "rail"})
    pp = g["produce_prices"]
    if pp and pp["headline"].get("above"):
        hi = [i.get("short") or i["label"] for i in pp.get("items", []) if i.get("direction") == "above"]
        names = join_names(hi)
        qs.append({"text": f"Wholesale prices for {names} are higher than in any recent year at this time of year. Is this weather in supplying regions, the exchange rate, or something else?", "scenario": None})
    fa = g["food_affordability"]
    if fa and fa["headline"].get("direction") == "food_faster":
        qs.append({"text": "Store food prices are rising faster than wages. Which households feel this first, and which buffers (income support, food banks) are under strain?", "scenario": None})
    fert = [e for e in l1 if any(c["group"] == "inputs" for c in e["canada_link"]["commodities"])]
    if fert:
        qs.append({"text": f"A hazard alert affects a country that supplies Canadian farm inputs ({fert[0]['canada_link']['commodities'][0]['label'].lower()}). Would a disruption land before spring seeding?", "scenario": "phosphate"})
    if not qs:
        qs.append({"text": "No tracked measure is outside its usual range this week. Which buffer would you test first if that changed?", "scenario": None})

    # ---- one stress test to explore this week, with the reason
    wx = g["weather_alerts"]
    prairie_warn = bool(wx and set(wx["headline"].get("by_province", {})) & PRAIRIES)
    if gx and gx["headline"].get("state") == "outside_reference_range_review":
        pick, why = "rail", "grain movement is outside its usual range this week"
    elif fert:
        pick, why = "phosphate", "a hazard alert affects a supplier of Canadian fertilizer or fuel"
    elif prairie_warn and now.month in (5, 6, 7, 8):
        pick, why = "drought", "weather alerts are in effect on the Prairies during the growing season"
    else:
        wk = now.isocalendar()[1]
        pick, why = SCENARIO_ORDER[wk % len(SCENARIO_ORDER)], "it is this week's turn in the rotation; no live measure points to a particular test"

    # ---- what changed since the previous release
    changes = []
    prev_ids = {e["id"] for e in (prev_events or {}).get("items", [])}
    if prev_ids:
        new_ev = [e for e in items if e["id"] not in prev_ids]
        for kind, label in (("recall", "new CFIA recall notice"), ("weather_alert", "new weather alert"),
                            ("gov_notice", "new government announcement"), ("global_hazard", "new global hazard alert")):
            n = [e for e in new_ev if e["kind"] == kind]
            if n:
                changes.append({"kind": "new_event", "text": f"{len(n)} {label}{'s' if len(n) != 1 else ''}", "ids": [e["id"] for e in n][:20], "link": "/events"})
    prev_cards = {c["id"]: c for col in (prev or {}).get("columns", {}).values() for c in col if isinstance(c, dict)}
    for col in (happening, absorbs, feels):
        for c in col:
            p = prev_cards.get(c["id"])
            if p and p.get("observation_end") != c.get("observation_end") and c["id"] not in ("weather_alerts", "global_hazards", "gov_notices"):
                changes.append({"kind": "new_observation", "text": f"New data: {c['title']} ({c['period']})", "ids": [c["id"]], "link": f"/indicators/{c['id']}"})
            if p and p.get("state") != c.get("state") and c.get("state") and p.get("state"):
                changes.append({"kind": "state_change", "text": f"{c['title']}: now {STATE_WORDS.get(c['state'], c['state'])} (was {STATE_WORDS.get(p['state'], p['state'])})", "ids": [c["id"]], "link": f"/indicators/{c['id']}"})
    gaps = [{"source_id": s["id"], "health": s["health"],
             "text": (f"{s['provider']}: last refresh failed; showing data to {long_date(s['observation_end'])}." if s["health"] == "error"
                      else f"{s['provider']}: newest data ({long_date(s['observation_end'])}) are older than usual for this source." if s["health"] == "stale"
                      else f"{s['provider']}: no data available.")}
            for s in sources if s["health"] != "ok"]
    return {
        "release_id": release_id,
        "headline": head,
        "columns": {"happening": happening, "reach": reach, "absorbs": absorbs, "feels": feels},
        "questions": qs[:4],
        "scenario_of_week": {"id": pick, "title": SCENARIO_TITLE[pick], "reason": why},
        "changes": changes,
        "gaps": gaps,
        "counts": {"global_current": len(current_glob), "global_l1": len(l1), "events": len(items)},
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
                         "text": f"{top['country']}: {top['share'] * 100:.0f}% of Canada's {top['label'].lower()} imports ({top['year']}). Specific impact unknown."})
    brief = {
        "schema_version": "1.0.0", "id": wid, "week_start": s, "week_end": e,
        "prepared_at": iso(now), "release_id": sit.get("release_id"),
        "status": "Research briefing; not an official emergency alert. Prepared automatically by fixed rules from the data release named here; not reviewed by an analyst.",
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
    L = [f"# Canada Food System Situation Update — {b['id']}", "",
         f"**Reporting week:** {long_date(b['week_start'])} to {long_date(b['week_end'])}  ",
         f"**Prepared at:** {b['prepared_at']} (release {b['release_id']})  ",
         f"**Status:** {b['status']}", "", "## National overview", ""]
    L += [f"- {t}" for t in b["overview"]] + ["", "## What changed this week", ""]
    if b["changed"]:
        for c in b["changed"]:
            L.append(f"**{c['theme']}: {c['count']}**")
            L += [f"- [{i['title']}]({i['url']}) ({i['date']})" for i in c["items"]]
            L.append("")
    else:
        L += ["No new official notices were recorded for this week.", ""]
    L += ["## Conditions (each with its own data period)", ""]
    L += [f"- **{c['title']}** — {c['text']} *Data: {c['period']}.*" for c in b["conditions"]]
    L += ["", "## Global developments with a Canadian supplier link", ""]
    L += ([f"- [{g['title']}]({g['url']}) — {g['text']}" for g in b["global"]] or ["- None this week."])
    L += ["", "## Evidence gaps", ""] + ([f"- {g}" for g in b["gaps"]] or ["- All sources refreshed normally."])
    L += ["", "## Questions worth asking", ""] + [f"- {q}" for q in b["questions"]]
    st = b["stress_test"]
    L += ["", "## Related stress test", "",
          f"[{st['title']}]({SITE}#/lab/{st['id']}) — chosen because {st['reason']}. Illustrative model; not a forecast.",
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
            f"<item><title>{escape('Situation update ' + b['id'])}</title><link>{escape(link)}</link>"
            f"<guid isPermaLink=\"true\">{escape(link)}</guid><pubDate>{format_datetime(pub)}</pubDate>"
            f"<description>{escape(b.get('lead') or '')}</description></item>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>'
           "<title>Canada Food System Observatory: weekly situation updates</title>"
           f"<link>{SITE}</link><description>Research briefings built from official Canadian and global data. Not an official alert service.</description>"
           f"<language>en-ca</language><lastBuildDate>{format_datetime(now)}</lastBuildDate>"
           + "".join(items) + "</channel></rss>\n")
    (out / "feed.xml").write_text(xml, encoding="utf-8")
