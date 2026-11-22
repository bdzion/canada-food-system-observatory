"""Ongoing disruptions: curated entries tied to live indicators.

The entry text is the team's summary of published sources. What the pipeline
adds is the live check: whether the indicator named in `live_check` still
shows the disruption, and whether the entry's review is overdue.
"""
from __future__ import annotations

from datetime import date, datetime

from .core import load_yaml
from .indicators import long_date


def build(inds: list[dict], now: datetime) -> list[dict]:
    by = {i["id"]: i for i in inds}
    out = []
    for d in load_yaml("ongoing.yml").get("disruptions", []):
        lc = d.get("live_check") or {}
        ind = by.get(lc.get("indicator"))
        item = next((x for x in (ind or {}).get("items", []) if x["id"] == lc.get("item")), None)
        live = {"label": lc.get("label"), "indicator": lc.get("indicator"), "state": "unknown",
                "text": "The live data for this disruption could not be read in this update."}
        if item and item.get("value") is not None:
            below = item.get("direction") == "below"
            live = {
                "label": lc.get("label"), "indicator": lc.get("indicator"), "state": "still_showing" if below else "not_showing",
                "value": item["value"], "median": item.get("median"), "t": item.get("t"), "spark": item.get("spark"),
                "text": (f"Still showing in the data: about {item['value']:.0f} ships a day in the four weeks to {long_date(item['t'])}, "
                         f"against a typical {item['median']:.0f} for this time of year." if below and item.get("median") else
                         f"Not showing as unusual in the latest data: about {item['value']:.0f} ships a day in the four weeks to "
                         f"{long_date(item['t'])}. Check the sources before treating the disruption as over."),
            }
        reviewed = date.fromisoformat(d["last_reviewed"])
        overdue = (now.date() - reviewed).days > d.get("review_every_days", 30)
        since = date.fromisoformat(d["since"])
        out.append({
            "id": d["id"], "title": d["title"], "since": d["since"], "status": d["status"],
            "days": (now.date() - since).days, "last_reviewed": d["last_reviewed"], "review_overdue": overdue,
            "scenario": d.get("scenario"), "summary": d["summary"], "reach": d.get("reach", []),
            "watch": [{"id": w, "title": by[w]["title"], "state": by[w]["headline"].get("state"),
                       "direction": by[w]["headline"].get("direction"), "text": by[w]["headline"].get("text")}
                      for w in d.get("watch", []) if w in by],
            "live": live, "sources": d.get("sources", []),
            "evidence_class": "author_judgement",
            "note": ("Written by the observatory team from the sources listed"
                     + f" and last reviewed on {long_date(d['last_reviewed'])}." + (" A review is overdue." if overdue else "")
                     + " The live check updates automatically."),
        })
    return out
