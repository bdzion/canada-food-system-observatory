"""UN Comtrade public preview: Canada's annual imports by partner.

For each HS heading in config.yml we fetch Canada's reported imports for the
latest year available and compute each partner's share of import value.

Limits carried to the site:
- Annual, published with a lag of a year or more; this is a historical
  supplier pattern, not a record of current shipments.
- Shares are by customs value (US dollars). The largest partner by value need
  not be the largest by weight.
- Country of origin as recorded by Canada; goods routed through the United
  States may be attributed to it.
"""
from __future__ import annotations

import time

from ..core import SourceError, config, fetch_json, iso, registry, utc_now

ID = "GL-01"
PARTNERS_URL = "https://comtradeapi.un.org/files/v1/app/reference/partnerAreas.json"


def _partners() -> dict[int, dict]:
    data = fetch_json(PARTNERS_URL)
    return {p["id"]: {"iso3": p.get("PartnerCodeIsoAlpha3"), "name": (p.get("text") or "").strip()}
            for p in data.get("results", [])}


def _year(hs: str, year: int) -> list[dict]:
    data = fetch_json(registry()[ID]["endpoint"], params={
        "reporterCode": 124, "period": year, "cmdCode": hs, "flowCode": "M",
        "customsCode": "C00", "motCode": 0, "partner2Code": 0,
    })
    if data.get("error"):
        raise SourceError(f"Comtrade error for {hs}/{year}: {data['error']}")
    return data.get("data") or []


def run(previous: dict | None = None) -> dict:
    cfg = config()["exposure"]
    names = _partners()
    year_now = utc_now().year
    out, failures = {}, []
    for c in cfg["commodities"]:
        hs = c["hs"]
        rows, used = [], None
        for y in (year_now - 1, year_now - 2, year_now - 3):
            try:
                rows = _year(hs, y)
            except SourceError:
                rows = []
            time.sleep(1.2)  # stay well inside the public rate limit
            if any(r.get("partnerCode") == 0 for r in rows):
                used = y
                break
        if not used:
            failures.append(hs)
            if previous and hs in previous.get("commodities", {}):
                out[hs] = previous["commodities"][hs]
            continue
        world = next(r for r in rows if r.get("partnerCode") == 0)
        total = world.get("primaryValue")
        partners = []
        for r in rows:
            pc = r.get("partnerCode")
            if pc in (0, None) or r.get("primaryValue") in (None, 0):
                continue
            meta = names.get(pc, {"iso3": None, "name": str(pc)})
            partners.append({
                "code": pc, "iso3": meta["iso3"], "name": meta["name"],
                "value_usd": round(r["primaryValue"]),
                "net_kg": round(r["netWgt"]) if r.get("netWgt") else None,
                "share": round(r["primaryValue"] / total, 4) if total else None,
            })
        partners.sort(key=lambda p: -p["value_usd"])
        out[hs] = {
            **c, "year": used, "total_value_usd": round(total) if total else None,
            "estimated_flag": bool(world.get("isQtyEstimated")),
            "partners": partners[:25],
        }
    if not out:
        raise SourceError("no Comtrade data could be retrieved")
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": f"{max(v['year'] for v in out.values())}-12-31",
        "commodities": out,
        "failed": failures,
    }
