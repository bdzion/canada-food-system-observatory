"""Government of Canada Recalls and Safety Alerts: CFIA food records.

The open-data file holds every recall since 2011 across all agencies. We keep
CFIA records only, group each "Issue" into a plain hazard type, and keep two
things: the recent notices (for the event list) and daily counts (for the
"compared with earlier years" view).

Caveat carried to the site: the file gives "Last updated", not the first
publication date. A recall that is updated later moves to its update date.
"""
from __future__ import annotations

from collections import Counter
from datetime import timedelta

from ..core import SourceError, config, fetch_json, iso, parse_date, registry, utc_now

ID = "CA-06"


def hazard_group(issue: str, groups: dict[str, list[str]]) -> str:
    t = (issue or "").lower()
    if not t.strip():
        return "unspecified"
    for g, words in groups.items():
        if any(w in t for w in words):
            return g
    return "other"


def run() -> dict:
    cfg = config()["recalls"]
    data = fetch_json(registry()[ID]["endpoint"])
    rows = data if isinstance(data, list) else next(iter(data.values()))
    if not isinstance(rows, list) or len(rows) < 1000:
        raise SourceError("recalls file is unexpectedly small or malformed")
    now = utc_now().date()
    keep, daily = [], Counter()
    seen = set()
    for r in rows:
        if r.get("Organization") != "CFIA":
            continue
        nid = str(r.get("NID") or "").strip()
        d = parse_date(r.get("Last updated") or "")
        if not nid or d is None or nid in seen:
            continue
        seen.add(nid)
        daily[d.isoformat()] += 1
        if d >= now - timedelta(days=120):
            keep.append({
                "id": f"recall-{nid}",
                "nid": nid,
                "title": " ".join((r.get("Title") or "").split()),
                "url": r.get("URL"),
                "date": d.isoformat(),
                "issue": (r.get("Issue") or "").strip() or None,
                "hazard": hazard_group(r.get("Issue") or "", cfg["hazard_groups"]),
                "category": r.get("Category"),
                "recall_class": (r.get("Recall class") or "").strip() or None,
            })
    if not daily:
        raise SourceError("no CFIA records found")
    keep.sort(key=lambda x: x["date"], reverse=True)
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": max(daily),
        "recent": keep,
        "daily_counts": dict(sorted(daily.items())),
    }
