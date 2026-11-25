"""Ongoing disruptions: curated entries tied to live indicators.

The entry text is the team's summary of published sources. What the pipeline
adds is the live check: whether the indicator named in `live_check` still
shows the disruption, and whether the entry's review is overdue.
"""
from __future__ import annotations

from datetime import date, datetime

from .core import load_yaml
from .indicators import long_date

# An entry may not stand unreviewed for longer than this, however its own
# review interval is set. Borrowed from the IPC, which caps the validity of an
# analysis at twelve months whatever its analysts choose (docs/benchmarking.md).
MAX_VALIDITY_DAYS = 365


def _fmt(v: float, unit: str) -> str:
    """The reading in its own unit, so the sentence suits any indicator."""
    if unit in ("ships a day", "tonnes a day"):
        return f"about {v:,.0f} {unit}"
    if unit == "percent":
        return f"{v:.1f}%"
    if unit in ("dollars", "CAD"):
        return f"${v:,.2f}"
    if unit == "cents per litre":
        return f"{v:,.1f} cents a litre"
    if unit == "index":
        return f"{v:,.1f} on the index"
    if abs(v) >= 1e4:
        return f"{v:,.0f} {unit}"
    return f"{v:,.1f} {unit}"


def build(inds: list[dict], now: datetime) -> list[dict]:
    by = {i["id"]: i for i in inds}
    out = []
    for d in load_yaml("ongoing.yml").get("disruptions", []):
        lc = d.get("live_check") or {}
        ind = by.get(lc.get("indicator"))
        item = next((x for x in (ind or {}).get("items", []) if x["id"] == lc.get("item")), None)
        # Which direction counts as the disruption still being visible is a
        # property of the disruption, not of the code: a blockade shows up as
        # fewer ships, a shortage as higher prices.
        shows = lc.get("shows_when", "below")
        label = lc.get("label") or (ind or {}).get("title") or "Live check"
        unit = lc.get("unit") or (item or {}).get("unit") or (ind or {}).get("unit") or ""
        live = {"label": label, "indicator": lc.get("indicator"), "item": lc.get("item"),
                "unit": unit, "source_note": lc.get("source_note"), "state": "unknown",
                "text": "The live data for this disruption could not be read in this update."}
        if item and item.get("value") is not None:
            still = item.get("direction") == shows
            reading = _fmt(item["value"], unit)
            period = f"in the latest reading to {long_date(item['t'])}" if item.get("t") else "in the latest reading"
            if still:
                txt = f"Still showing in the data: {reading} {period}"
                if item.get("median") is not None:
                    txt += f", against a typical {_fmt(item['median'], unit)} for this time of year."
                else:
                    txt += "."
            else:
                txt = (f"Not showing as unusual in the latest data: {reading} {period}. "
                       "Check the sources below before treating the disruption as over.")
            live.update({"state": "still_showing" if still else "not_showing", "value": item["value"],
                         "median": item.get("median"), "t": item.get("t"), "spark": item.get("spark"),
                         "text": txt})
        reviewed = date.fromisoformat(d["last_reviewed"])
        age = (now.date() - reviewed).days
        overdue = age > d.get("review_every_days", 30)
        expired = age > MAX_VALIDITY_DAYS
        since = date.fromisoformat(d["since"])
        note = "Written by the observatory team from the sources listed"
        note += f" and last reviewed on {long_date(d['last_reviewed'])}."
        if expired:
            note += (f" It has not been reviewed for {age} days, past the {MAX_VALIDITY_DAYS}-day limit, "
                     "so treat the written summary as out of date.")
        elif overdue:
            note += " A review is overdue."
        note += " The live check updates automatically."
        out.append({
            "id": d["id"], "title": d["title"], "since": d["since"], "status": d["status"],
            "days": (now.date() - since).days, "last_reviewed": d["last_reviewed"],
            "review_age_days": age, "review_overdue": overdue, "expired": expired,
            "max_validity_days": MAX_VALIDITY_DAYS,
            "theme": d.get("theme") or d["title"],
            "scenario": d.get("scenario"), "summary": d["summary"], "reach": d.get("reach", []),
            "watch": [{"id": w, "title": by[w]["title"], "state": by[w]["headline"].get("state"),
                       "direction": by[w]["headline"].get("direction"), "text": by[w]["headline"].get("text")}
                      for w in d.get("watch", []) if w in by],
            "live": live, "sources": d.get("sources", []),
            "evidence_class": "author_judgement",
            "note": note,
        })
    return out
