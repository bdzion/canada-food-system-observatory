"""ECCC MSC GeoMet: weather alerts currently in effect.

The site also fetches this collection live in the visitor's browser (the API
allows cross-origin requests). This snapshot is the fallback and the record
used in briefs and the archive.
"""
from __future__ import annotations

import hashlib
from datetime import datetime

from ..core import SourceError, fetch_json, iso, registry, utc_now

ID = "CA-01"

# Alert types that bear directly on farms, livestock, harvest or transport.
FARM_RELEVANT = (
    "frost", "freez", "heat", "rainfall", "snowfall", "blizzard", "wind", "thunderstorm",
    "extreme cold", "winter storm", "flash freeze", "storm surge", "air quality", "smoke",
    "hurricane", "tropical", "dust", "flood", "squall", "arctic outflow", "weather",
)


def _simplify(coords, tol: float = 0.02):
    """Reduce polygon vertices so the snapshot stays small (about 2 km tolerance)."""
    def ring(r):
        if len(r) <= 8:
            return [[round(x, 3), round(y, 3)] for x, y in r]
        out = [r[0]]
        for p in r[1:-1]:
            q = out[-1]
            if abs(p[0] - q[0]) > tol or abs(p[1] - q[1]) > tol:
                out.append(p)
        out.append(r[-1])
        return [[round(x, 3), round(y, 3)] for x, y in out]
    return [ring(r) for r in coords]


def run() -> dict:
    url = registry()[ID]["endpoint"]
    data = fetch_json(url, params={"f": "json", "limit": 2000, "lang": "en"})
    feats = data.get("features")
    if feats is None:
        raise SourceError("GeoMet response has no features array")
    now = utc_now()
    alerts = {}
    for f in feats:
        p = f.get("properties", {})
        exp = p.get("expiration_datetime")
        try:
            if exp and datetime.fromisoformat(exp.replace("Z", "+00:00")) < now:
                continue  # expired notices are not "in effect"
        except ValueError:
            pass
        name = (p.get("alert_name_en") or "").strip()
        key = (name, p.get("province"), p.get("publication_datetime"))
        g = f.get("geometry") or {}
        geom = None
        if g.get("type") == "Polygon":
            geom = {"type": "Polygon", "coordinates": _simplify(g["coordinates"])}
        elif g.get("type") == "MultiPolygon":
            geom = {"type": "MultiPolygon", "coordinates": [_simplify(pg) for pg in g["coordinates"]]}
        a = alerts.setdefault(key, {
            "type": name,
            "alert_type": p.get("alert_type"),
            "province": p.get("province"),
            "issued": p.get("publication_datetime"),
            "expires": exp,
            "status": p.get("status_en"),
            "areas": [],
            "geometry": [],
            "farm_relevant": any(w in name.lower() for w in FARM_RELEVANT),
        })
        a["areas"].append(p.get("feature_name_en"))
        if geom:
            a["geometry"].append(geom)
    items = sorted(alerts.values(), key=lambda x: (x["province"] or "", x["type"]))
    # Stable IDs derived from content, so the same alert keeps its ID across runs.
    for a in items:
        a["id"] = "wx-" + hashlib.sha1(f"{a['type']}|{a['province']}|{a['issued']}".encode()).hexdigest()[:10]
        a["areas"] = sorted({x for x in a["areas"] if x})
    return {
        "source_id": ID,
        "retrieved_at": iso(now),
        "observation_end": now.date().isoformat(),
        "alerts": items,
    }
