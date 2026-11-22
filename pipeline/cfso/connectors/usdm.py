"""US Drought Monitor (National Drought Mitigation Center, USDA, NOAA): weekly.

Share of each state in each drought category. The figures are cumulative:
"d1" is the share in moderate drought or worse. We track the US states that
grow much of Canada's imported fresh fruit and vegetables.
"""
from __future__ import annotations

from datetime import timedelta

from ..core import SourceError, config, fetch_json, iso, registry, utc_now

ID = "GL-05"


def run() -> dict:
    cfg = config()["us_growing"]
    now = utc_now().date()
    start = now - timedelta(days=365 * 6 + 30)
    out = {}
    for st, meta in cfg["states"].items():
        rows = fetch_json(registry()[ID]["endpoint"], params={
            "aoi": meta["fips"], "startdate": f"{start.month}/{start.day}/{start.year}",
            "enddate": f"{now.month}/{now.day}/{now.year}", "statisticsType": 1},
            headers={"Accept": "application/json"})
        if not isinstance(rows, list) or not rows:
            raise SourceError(f"no Drought Monitor rows for {st}")
        weeks = sorted(({"t": r["mapDate"][:10], "d0": r.get("d0"), "d1": r.get("d1"), "d2": r.get("d2"),
                         "d3": r.get("d3"), "d4": r.get("d4")} for r in rows), key=lambda x: x["t"])
        out[st] = {"label": meta["label"], "why": meta["why"], "weeks": weeks}
    end = max(s["weeks"][-1]["t"] for s in out.values())
    return {"source_id": ID, "retrieved_at": iso(utc_now()), "observation_end": end, "states": out}
