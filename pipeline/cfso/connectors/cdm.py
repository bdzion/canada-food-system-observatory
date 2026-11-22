"""Agriculture and Agri-Food Canada: Canadian Drought Monitor (monthly).

The monitor publishes one zipped GeoJSON per month with drought areas by
category, D0 (abnormally dry) to D4 (exceptional). The layers are nested:
the D1 area includes D2, D3 and D4. For each month we work out the share of
each Prairie agricultural zone in each category, using an equal-area
projection (Statistics Canada Lambert, EPSG:3347). Months already processed
are carried over from the last extract, so each run downloads only new files.

Assumptions: the zones are straight-line boxes south of 54°N (see config.yml);
they approximate, and do not trace, the agricultural region.
"""
from __future__ import annotations

import io
import json
import re
import zipfile

from ..core import SourceError, config, fetch, iso, utc_now

ID = "CA-09"
# Recent months come as one zip; older months as a folder of GeoJSON files.
FILE = re.compile(r'href="(cdm_(\d{2})(\d{2})_drought_areas(?:_json\.zip|/))"')
LAYER = re.compile(r'href="([^"]*_D[0-4]_LR\.geojson)"')
MAX_NEW = 48  # cap the first run; later runs fill in any gap


def _zones():
    from shapely import segmentize
    from shapely.geometry import box
    from shapely.ops import transform
    from pyproj import Transformer

    t = Transformer.from_crs(4326, 3347, always_xy=True).transform
    return {k: transform(t, segmentize(box(*z["bbox"]), 0.1)) for k, z in config()["cdm"]["zones"].items()}


def _layers(url: str) -> list[tuple[str, bytes]]:
    if url.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(fetch(url, timeout=240))) as z:
            return [(n, z.read(n)) for n in sorted(z.namelist()) if n.endswith("json")]
    html = fetch(url).decode("utf-8", "replace")
    return [(n, fetch(url + n, timeout=240)) for n in sorted(set(LAYER.findall(html)))]


def _epsg(d: dict) -> int:
    name = str(((d.get("crs") or {}).get("properties") or {}).get("name", "EPSG:4326"))
    m = re.search(r"(\d{4,5})$", name)
    return 4326 if ("CRS84" in name or not m) else int(m.group(1))


def _process(layers: list[tuple[str, bytes]], zones: dict, keep_geo: bool) -> tuple[dict, dict | None]:
    from shapely.geometry import mapping, shape
    from shapely.ops import transform, unary_union
    from pyproj import Transformer

    shares = {k: {} for k in zones}
    geo = {"type": "FeatureCollection", "features": []} if keep_geo else None
    if True:
        for name, raw in layers:
            m = re.search(r"_(D[0-4])_", name)
            if not m:
                continue
            lvl = m.group(1)
            d = json.loads(raw)
            src = _epsg(d)
            to_ea = Transformer.from_crs(src, 3347, always_xy=True).transform
            to_ll = Transformer.from_crs(src, 4326, always_xy=True).transform
            geoms = [shape(f["geometry"]).buffer(0) for f in d.get("features", []) if f.get("geometry")]
            if not geoms:
                for k in zones:
                    shares[k][lvl] = 0.0
                continue
            merged = unary_union(geoms)
            ea = transform(to_ea, merged)
            for k, zb in zones.items():
                shares[k][lvl] = round(100 * ea.intersection(zb).area / zb.area, 1)
            if keep_geo:
                ll = transform(to_ll, merged).simplify(0.06, preserve_topology=True)
                geo["features"].append({"type": "Feature", "properties": {"level": lvl}, "geometry": mapping(ll)})
    return shares, geo


def run(previous: dict | None = None) -> dict:
    cfg = config()["cdm"]
    now = utc_now()
    months = dict((previous or {}).get("months", {}))
    available = {}
    for y in range(cfg["first_year"], now.year + 1):
        try:
            html = fetch(f"{cfg['base']}{y}/").decode("utf-8", "replace")
        except SourceError:
            continue
        for fname, yy, mm in FILE.findall(html):
            available[f"20{yy}-{mm}"] = f"{cfg['base']}{y}/{fname}"
    if not available:
        raise SourceError("no Drought Monitor files listed")
    latest = max(available)
    todo = sorted(m for m in available if m not in months)[:MAX_NEW]
    if latest not in todo and not (previous or {}).get("latest_geo"):
        todo.append(latest)
    zones = _zones()
    geo = (previous or {}).get("latest_geo")
    for m in todo:
        shares, g = _process(_layers(available[m]), zones, keep_geo=(m == latest))
        months[m] = shares
        if g is not None:
            geo = {"month": m, **g}
    return {"source_id": ID, "retrieved_at": iso(now), "observation_end": f"{max(months)}-01",
            "zones": {k: z["label"] for k, z in cfg["zones"].items()},
            "months": dict(sorted(months.items())), "latest_geo": geo}
