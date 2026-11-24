"""Statistics Canada table 32-10-0013: grain supply and disposition.

This is the only source the observatory has for grain held **on farms**, which
is most of Canada's grain. The Canadian Grain Commission feed (CA-05) covers
licensed commercial elevators and port terminals only: at 31 December 2025,
25.1 of 28.5 million tonnes of all-wheat stocks, 88%, were on farms.

Stocks are surveyed three times a year, at 31 December, 31 March and 31 July,
and published about ten weeks later, so this is a structural measure of the
buffer rather than an early-warning signal. Values are in thousand tonnes, the
same unit the Grain Commission indicator uses.
"""
from __future__ import annotations

from ..core import SourceError, config, iso, utc_now
from .statcan import _pull

ID = "CA-11"


def run() -> dict:
    cfg = config()["grain_stocks"]
    series = cfg["series"]
    out = _pull(cfg["product"], series, cfg["periods"], source_id=ID)
    ends = [s["points"][-1]["t"] for s in out.values() if s["points"]]
    if not ends:
        raise SourceError("no grain stock observations returned")
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": max(ends),
        "unit": "thousand tonnes",
        "series": out,
    }
