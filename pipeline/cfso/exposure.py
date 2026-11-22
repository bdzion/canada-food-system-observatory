"""Global-to-Canada relevance screening (the "Canada Relevance Filter").

Linkage levels (concept note, section 10.2):
  L0  No Canadian connection established from available data.
  L1  Canada historically imports a tracked commodity from an affected country.
  L2  The event overlaps a documented producing area or corridor.     (analyst review)
  L3  A reliable source confirms an effect on that supply chain.        (analyst review)
  L4  Canadian data show a specified consequence.                       (analyst review)

The pipeline assigns only L0 or L1, because those need nothing but data we
hold. Higher levels need evidence about places and effects that an automated
rule cannot establish, so the site shows them as "needs review" steps.
"""
from __future__ import annotations

from .core import config

LARGE = {"USA", "CHN", "IND", "BRA", "RUS", "AUS", "MEX", "ARG", "IDN", "KAZ", "COD", "DZA", "SAU", "SDN", "PER", "TUR", "IRN"}


def link_events(gdacs: dict | None, comtrade: dict | None, infohort: dict | None) -> list[dict]:
    if not gdacs:
        return []
    cfg = config()["exposure"]
    thr = cfg["min_partner_share"]
    comm = (comtrade or {}).get("commodities", {})
    produce_origin = {}
    for s in (infohort or {}).get("series", {}).values():
        produce_origin.setdefault(s["country"], []).append(s["label"])
    links = []
    for ev in gdacs["events"]:
        isos = {c["iso3"] for c in ev["countries"]}
        hits = []
        for hs, c in comm.items():
            for p in c["partners"]:
                if p["iso3"] in isos and p["share"] is not None and p["share"] >= thr:
                    hits.append({"hs": hs, "label": c["label"], "group": c["group"], "country": p["name"],
                                 "iso3": p["iso3"], "share": p["share"], "year": c["year"],
                                 "scenario": c.get("scenario") or None})
        hits.sort(key=lambda h: -h["share"])
        for h in hits:
            # A country-level match is weakest in large, diverse countries, where a
            # hazard can be far from where the product is grown or shipped.
            h["large_country"] = h["iso3"] in LARGE
        level = "L1" if hits else "L0"
        links.append({
            "event_id": ev["id"],
            "level": level,
            "commodities": hits,
            "phrase": ("Canada buys from this country. We do not yet know whether this disaster affects that supply."
                       if hits else "No direct link found: Canada buys little or none of the products we track from this country."),
            "next_evidence": ([
                "Did the disaster hit the areas where these products are grown or shipped from?",
                "Has a reliable source reported damage to farms, ports or exports?",
                "Do Canadian prices or import figures show a change that the disaster explains?",
            ] if hits else [
                "Canada could still feel it through world prices or shipping routes. This check covers only direct imports of the products we track.",
            ]),
        })
    return links
