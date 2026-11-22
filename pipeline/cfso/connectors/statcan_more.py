"""Statistics Canada Web Data Service: further tables added in release 2.

Diesel and gasoline prices, retail prices of everyday foods, the farm input
price index, rail freight, grocery prices by province, food insecurity and
work stoppages. Each table is fetched on its own. If one fails, we keep that
table from the last good extract and record the error, so one slow table does
not hide the others.
"""
from __future__ import annotations

from ..core import SourceError, config, iso, sanitize, utc_now
from .statcan import _pull

ID = "CA-08"


def run(previous: dict | None = None) -> dict:
    groups = config()["statcan_groups"]
    prev = (previous or {}).get("groups", {})
    out, errors = {}, {}
    for name, spec in groups.items():
        try:
            out[name] = {"product_id": spec["product"], "series": _pull(spec["product"], spec["series"], spec["months"])}
        except Exception as e:  # keep the last good copy of this table
            errors[name] = sanitize(f"{type(e).__name__}: {e}")
            if name in prev:
                out[name] = prev[name]
    if not out:
        raise SourceError("no Statistics Canada table could be read")
    ends = {}
    for name, g in out.items():
        ends[name] = max(s["points"][-1]["t"] for s in g["series"].values())
    return {
        "source_id": ID, "retrieved_at": iso(utc_now()),
        # Tables follow different rhythms (monthly, quarterly, annual). The
        # monthly ones decide whether the source as a whole is up to date.
        "observation_end": max(ends.values()),
        "table_ends": ends, "groups": out, "group_errors": errors,
    }
