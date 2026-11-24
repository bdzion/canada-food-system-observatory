"""Statistics Canada Web Data Service: CPI and LFS hourly wages.

Series are pinned by product ID and coordinate (see config.yml). We store the
published index levels and wage rates, then compute year-over-year changes
ourselves from the same series, so the arithmetic is reproducible.
"""
from __future__ import annotations

from ..core import SourceError, config, fetch_json, iso, parse_date, registry, utc_now

ID = "CA-04"


def _pull(product: int, series: dict, n: int, source_id: str = ID) -> dict:
    url = registry()[source_id]["endpoint"]
    body = [{"productId": product, "coordinate": s["coordinate"], "latestN": n} for s in series.values()]
    resp = fetch_json(url, method="POST", json_body=body)
    out = {}
    # The WDS returns one object per requested coordinate, not always in request order.
    by_coord = {}
    for item in resp:
        if item.get("status") != "SUCCESS":
            raise SourceError(f"WDS error for product {product}: {item.get('object')}")
        obj = item["object"]
        by_coord[obj["coordinate"]] = obj
    for key, s in series.items():
        obj = by_coord.get(s["coordinate"])
        if obj is None:
            raise SourceError(f"WDS did not return coordinate {s['coordinate']}")
        pts = []
        for p in obj["vectorDataPoint"]:
            d = parse_date(p["refPer"])
            v = p.get("value")
            # symbolCode/statusCode flag suppressed or unreliable values; keep them as missing.
            if p.get("statusCode") not in (0, None) and v is None:
                v = None
            pts.append({"t": d.isoformat(), "v": v, "release": p.get("releaseTime")})
        pts.sort(key=lambda x: x["t"])
        if not pts:
            raise SourceError(f"no observations for {key}")
        out[key] = {
            "label": s["label"], "unit": s.get("unit"), "product_id": product, "coordinate": s["coordinate"],
            "vector_id": obj.get("vectorId"), "points": pts,
        }
    return out


def run() -> dict:
    cfg = config()["statcan"]
    cpi = _pull(cfg["cpi_product"], cfg["cpi_series"], cfg["months"])
    wages = _pull(cfg["wages_product"], cfg["wages_series"], cfg["months"])
    ends = [s["points"][-1]["t"] for s in list(cpi.values()) + list(wages.values())]
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": max(ends),
        "cpi": cpi,
        "wages": wages,
    }
