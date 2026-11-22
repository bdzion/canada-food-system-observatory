"""World Bank commodity prices (the "Pink Sheet"), monthly.

The workbook's address changes each year, so we read the current link from the
World Bank's commodity-markets page. Prices are nominal US dollars; indices
are 2010 = 100. Values marked "…" are missing, not zero.
"""
from __future__ import annotations

import re

from ..core import SourceError, cache_dir, config, fetch, iso, registry, utc_now

ID = "GL-04"
LINK = re.compile(r"https://thedocs\.worldbank\.org/[^\"'\s]*CMO-Historical-Data-Monthly\.xlsx")


def _num(v):
    return float(v) if isinstance(v, (int, float)) else None


def _month(v) -> str | None:
    m = re.fullmatch(r"(\d{4})M(\d{2})", str(v or "").strip())
    return f"{m.group(1)}-{m.group(2)}-01" if m else None


def _clean(h) -> str:
    return re.sub(r"\s*\*+\s*$", "", str(h or "")).strip()


def run() -> dict:
    import openpyxl  # imported here so the rest of the pipeline does not need it

    cfg = config()["worldbank"]
    page = fetch(cfg["page"]).decode("utf-8", "replace")
    found = LINK.findall(page)
    if not found:
        raise SourceError("could not find the Pink Sheet link on the World Bank page")
    url = found[0]
    path = fetch(url, dest=cache_dir() / "pink-sheet.xlsx")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    updated = None
    out = {"prices": {}, "indices": {}}

    ws = wb["Monthly Prices"]
    rows = list(ws.iter_rows(values_only=True))
    for r in rows[:5]:
        if r and isinstance(r[0], str) and r[0].startswith("Updated"):
            updated = r[0].replace("Updated on", "").strip()
    header = [_clean(h) for h in rows[4]]
    for key, spec in cfg["prices"].items():
        if spec["column"] not in header:
            raise SourceError(f"Pink Sheet has no column {spec['column']!r}")
        j = header.index(spec["column"])
        pts = [{"t": _month(r[0]), "v": _num(r[j])} for r in rows[6:] if _month(r[0])]
        out["prices"][key] = {"label": spec["label"], "unit": spec["unit"], "points": [p for p in pts if p["t"] >= "2014-01-01"]}

    ws = wb["Monthly Indices"]
    rows = list(ws.iter_rows(values_only=True))
    labels = []
    for j in range(len(rows[5])):
        parts = [_clean(rows[i][j]) for i in range(5, 9) if j < len(rows[i])]
        parts = [p for p in parts if p]
        labels.append(parts[-1] if parts else "")
    for key, spec in cfg["indices"].items():
        if spec["column"] not in labels:
            raise SourceError(f"Pink Sheet indices have no column {spec['column']!r}")
        j = labels.index(spec["column"])
        pts = [{"t": _month(r[0]), "v": _num(r[j])} for r in rows[9:] if _month(r[0])]
        out["indices"][key] = {"label": spec["label"], "unit": spec["unit"], "points": [p for p in pts if p["t"] >= "2014-01-01"]}

    ends = [p["t"] for g in out.values() for s in g.values() for p in s["points"] if p["v"] is not None]
    if not ends:
        raise SourceError("Pink Sheet had no values")
    return {"source_id": ID, "retrieved_at": iso(utc_now()), "observation_end": max(ends),
            "workbook_url": url, "updated": updated, **out}
