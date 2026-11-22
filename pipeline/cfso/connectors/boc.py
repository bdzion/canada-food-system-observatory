"""Bank of Canada Valet API: daily exchange rates.

A weaker Canadian dollar makes imported food and farm inputs dearer. We keep
monthly averages for comparisons and the last 120 business days for detail.
"""
from __future__ import annotations

from collections import defaultdict

from ..core import SourceError, config, fetch_json, iso, registry, utc_now

ID = "CA-10"


def run() -> dict:
    cfg = config()["boc"]
    names = ",".join(cfg["series"])
    url = registry()[ID]["endpoint"].format(series=names)
    d = fetch_json(url, params={"start_date": cfg["start"]})
    obs = d.get("observations") or []
    if not obs:
        raise SourceError("Valet returned no observations")
    out = {}
    for key, meta in cfg["series"].items():
        daily = []
        for o in obs:
            v = (o.get(key) or {}).get("v")
            if v not in (None, ""):
                daily.append((o["d"], float(v)))
        if not daily:
            raise SourceError(f"no values for {key}")
        by_m = defaultdict(list)
        for t, v in daily:
            by_m[t[:7]].append(v)
        monthly = [{"t": m + "-01", "v": round(sum(v) / len(v), 5), "n_days": len(v)} for m, v in sorted(by_m.items())]
        out[key] = {"label": meta["label"], "unit": meta["unit"], "monthly": monthly,
                    "daily": [{"t": t, "v": v} for t, v in daily[-120:]]}
    end = max(s["daily"][-1]["t"] for s in out.values())
    return {"source_id": ID, "retrieved_at": iso(utc_now()), "observation_end": end, "series": out}
