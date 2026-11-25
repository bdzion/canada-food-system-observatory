"""Statistics Canada table 16-10-0047: food manufacturing inventories.

The processing link of the chain had one live figure, food recalls, which is a
safety signal and not a buffer. The inventory-to-sales ratio is a published
monthly measure of how much stock food processors hold against what they are
shipping, which is the closest available reading of how much that link can
absorb before shortages reach stores.

Unadjusted series are used, not seasonally adjusted ones, because every
comparison on this site is with the same month in earlier years.
"""
from __future__ import annotations

from ..core import SourceError, config, iso, utc_now
from .statcan import _pull

ID = "CA-12"


def run() -> dict:
    cfg = config()["food_manufacturing"]
    out = _pull(cfg["product"], cfg["series"], cfg["months"], source_id=ID)
    ends = [s["points"][-1]["t"] for s in out.values() if s["points"]]
    if not ends:
        raise SourceError("no food manufacturing observations returned")
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": max(ends),
        "series": out,
    }
