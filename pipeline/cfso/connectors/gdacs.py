"""GDACS: orange and red global hazard alerts.

GDACS alert levels estimate humanitarian impact. They say nothing about
farms, exports or Canada. The Canadian connection is added separately, in
exposure.py, and only at the level the evidence supports.
"""
from __future__ import annotations

import ast
import re
from datetime import timedelta

from ..core import SourceError, config, fetch_json, iso, parse_date, registry, utc_now

ID = "GL-02"
TYPE_NAME = {"EQ": "Earthquake", "TC": "Tropical cyclone", "FL": "Flood", "DR": "Drought",
             "VO": "Volcanic eruption", "WF": "Wildfire"}


def _countries(p: dict) -> list[dict]:
    raw = p.get("affectedcountries")
    out = []
    if isinstance(raw, str):
        try:
            raw = ast.literal_eval(raw)
        except (ValueError, SyntaxError):
            raw = None
    if isinstance(raw, list):
        for c in raw:
            if isinstance(c, dict) and c.get("iso3"):
                out.append({"iso3": c["iso3"], "name": c.get("countryname") or c["iso3"]})
    if not out and p.get("iso3"):
        out.append({"iso3": p["iso3"], "name": p.get("country") or p["iso3"]})
    return out


def run() -> dict:
    cfg = config()["gdacs"]
    now = utc_now()
    since = (now - timedelta(days=cfg["lookback_days"])).date().isoformat()
    data = fetch_json(registry()[ID]["endpoint"], params={
        "eventlist": ";".join(cfg["event_types"]),
        "alertlevel": ";".join(cfg["alert_levels"]),
        "fromDate": since,
    })
    feats = data.get("features")
    if feats is None:
        raise SourceError("GDACS response has no features")
    events, seen = [], set()
    for f in feats:
        p = f.get("properties", {})
        eid = f"{p.get('eventtype')}-{p.get('eventid')}"
        if eid in seen:
            continue
        seen.add(eid)
        geom = f.get("geometry") or {}
        coords = geom.get("coordinates") if geom.get("type") == "Point" else None
        sev = p.get("severitydata")
        if isinstance(sev, str):
            try:
                sev = ast.literal_eval(sev)
            except (ValueError, SyntaxError):
                sev = None
        url = p.get("url")
        if isinstance(url, str):
            try:
                url = ast.literal_eval(url)
            except (ValueError, SyntaxError):
                url = None
        report = url.get("report") if isinstance(url, dict) else None
        start, end = parse_date(p.get("fromdate") or ""), parse_date(p.get("todate") or "")
        events.append({
            "id": f"gdacs-{eid}",
            "event_type": TYPE_NAME.get(p.get("eventtype"), p.get("eventtype")),
            "name": re.sub(r"(,\s*)+,", ",", " ".join((p.get("name") or "").split())).replace(" and ", " and "),
            "alert_level": p.get("alertlevel"),
            "from": start.isoformat() if start else None,
            "to": end.isoformat() if end else None,
            "is_current": str(p.get("iscurrent")).lower() == "true",
            "countries": _countries(p),
            "severity_text": (sev or {}).get("severitytext") if isinstance(sev, dict) else None,
            "point": [round(coords[0], 3), round(coords[1], 3)] if coords else None,
            "url": report or f"https://www.gdacs.org/report.aspx?eventtype={p.get('eventtype')}&eventid={p.get('eventid')}",
        })
    events.sort(key=lambda e: (e["to"] or e["from"] or ""), reverse=True)
    return {
        "source_id": ID,
        "retrieved_at": iso(now),
        "observation_end": now.date().isoformat(),
        "events": events,
    }
