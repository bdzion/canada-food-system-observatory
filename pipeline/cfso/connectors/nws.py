"""US National Weather Service: active alerts in key US growing states.

We keep only alert types that can harm crops in the field or stop trucks
(frost, freeze, heat, flood, wind, fire weather, winter storms, tropical
storms). An alert is a forecast warning, not evidence of damage.
"""
from __future__ import annotations

import hashlib

from ..core import SourceError, config, fetch_json, iso, registry, utc_now

ID = "GL-06"


def run() -> dict:
    cfg = config()["us_growing"]
    states = list(cfg["states"])
    d = fetch_json(registry()[ID]["endpoint"], params={"area": ",".join(states), "status": "actual"})
    feats = d.get("features")
    if feats is None:
        raise SourceError("NWS returned no feature list")
    keep = [k.lower() for k in cfg["crop_alerts"]]
    groups = {}
    for f in feats:
        p = f.get("properties") or {}
        ev = p.get("event") or ""
        low = ev.lower()
        # Coastal, beach and marine alerts and plain statements do not bear on farms or highways.
        if not any(k in low for k in keep) or any(x in low for x in ("coastal", "beach", "marine", "rip current", "statement")):
            continue
        codes = (p.get("geocode") or {}).get("UGC") or []
        sts = sorted({c[:2] for c in codes if c[:2] in states}) or ["?"]
        # One line per alert type and state, so a storm with 40 zones counts once.
        for st in sts:
            key = (ev, st)
            g = groups.setdefault(key, {"event": ev, "state": st, "n_zones": 0, "areas": [], "severity": p.get("severity"),
                                        "onset": p.get("onset") or p.get("effective"), "expires": p.get("ends") or p.get("expires")})
            g["n_zones"] += len([c for c in codes if c.startswith(st)])
            for a in (p.get("areaDesc") or "").split(";"):
                a = a.strip()
                if a and a not in g["areas"] and len(g["areas"]) < 12:
                    g["areas"].append(a)
            g["onset"] = min(filter(None, [g["onset"], p.get("onset") or p.get("effective")]), default=None)
            g["expires"] = max(filter(None, [g["expires"], p.get("ends") or p.get("expires")]), default=None)
    alerts = []
    for (ev, st), g in sorted(groups.items()):
        g["id"] = "nws-" + hashlib.sha1(f"{ev}|{st}|{(g['onset'] or '')[:10]}".encode()).hexdigest()[:12]
        g["state_label"] = cfg["states"].get(st, {}).get("label", st)
        g["why"] = cfg["states"].get(st, {}).get("why", "")
        g["url"] = f"https://alerts.weather.gov/search?area={st}"
        alerts.append(g)
    return {"source_id": ID, "retrieved_at": iso(utc_now()), "observation_end": iso(utc_now()), "alerts": alerts}
