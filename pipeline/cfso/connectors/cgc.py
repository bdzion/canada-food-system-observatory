"""Canadian Grain Commission: Grain Statistics Weekly.

One CSV per crop year (1 August to 31 July). We aggregate four weekly
measures, in thousand tonnes, summed over all grains:

- stocks_total:   commercial stocks (Summary worksheet), all locations
- stocks_primary: stocks in Prairie primary (country) elevators
- stocks_ports:   stocks in port terminal elevators
- exports_week:   exports from port terminals in the week
- deliveries_week: producer deliveries into primary elevators in the week

Grain week n of one crop year is compared with week n of earlier crop years,
which keeps harvest timing aligned. Earlier crop years do not change, so they
are downloaded once and kept in the extract.
"""
from __future__ import annotations

import csv
import io
from collections import defaultdict

from ..core import SourceError, config, crop_year_of, fetch, iso, parse_date, registry, utc_now

ID = "CA-05"
PARSER_VERSION = 2  # bump when parse_crop_year changes, so cached years are re-read
PORTS = {"Vancouver", "Prince Rupert", "Churchill", "Thunder Bay", "Bay & Lakes", "St. Lawrence"}

# Older files use snake_case headers; newer ones use title case. Normalise both.
HEADER = {
    "crop year": "crop_year", "crop_year": "crop_year",
    "grain week": "week", "grain_week": "week",
    "week ending date": "week_end", "week_ending_date": "week_end",
    "worksheet": "worksheet", "metric": "metric", "period": "period",
    "grain": "grain", "grade": "grade", "region": "region", "ktonnes": "kt",
}


def _num(s: str) -> float | None:
    s = (s or "").strip().replace(",", "")
    if s in ("", "-", "--"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_crop_year(text: str) -> dict:
    """Aggregate one crop-year CSV into weekly measures."""
    rd = csv.DictReader(io.StringIO(text))
    rd.fieldnames = [HEADER.get(h.strip().lower(), h.strip().lower()) for h in rd.fieldnames or []]
    need = {"week", "week_end", "worksheet", "metric", "period", "region", "kt"}
    if not need.issubset(rd.fieldnames):
        raise SourceError(f"CGC CSV missing columns: {need - set(rd.fieldnames)}")
    weeks: dict[int, dict] = defaultdict(lambda: defaultdict(float))
    seen: dict[int, set] = defaultdict(set)
    ends: dict[int, str] = {}
    for r in rd:
        if r["period"] != "Current Week":
            continue
        try:
            w = int(r["week"])
        except ValueError:
            continue
        v = _num(r["kt"])
        if v is None:
            continue
        d = parse_date(r["week_end"])
        if d:
            ends[w] = d.isoformat()
        ws, m, reg = r["worksheet"], r["metric"], r["region"]
        if ws == "Summary" and m in ("Stocks", "Commercial Stocks"):  # renamed in 2025-26
            weeks[w]["stocks_total"] += v
            seen[w].add("stocks_total")
            if reg == "Primary Elevators":
                weeks[w]["stocks_primary"] += v
                seen[w].add("stocks_primary")
            elif reg in PORTS:
                weeks[w]["stocks_ports"] += v
                seen[w].add("stocks_ports")
        elif ws == "Terminal Exports" and m == "Exports":
            weeks[w]["exports_week"] += v
            seen[w].add("exports_week")
        elif ws == "Primary" and m == "Deliveries":
            weeks[w]["deliveries_week"] += v
            seen[w].add("deliveries_week")
    out = {}
    for w in sorted(weeks):
        # A measure absent from a week's file stays missing; it is not zero.
        out[str(w)] = {"week_end": ends.get(w), **{k: round(weeks[w][k], 1) for k in seen[w]}}
    return out


def _url(crop_year: str) -> str:
    a, b = crop_year.split("-")
    return registry()[ID]["endpoint"].format(crop_year=f"{a}-{b[2:]}")


def _get(crop_year: str) -> dict:
    text = fetch(_url(crop_year), timeout=240).decode("utf-8-sig", errors="replace")
    return parse_crop_year(text)


def run(previous: dict | None = None) -> dict:
    n = config()["cgc"]["history_crop_years"]
    today = utc_now().date()
    current = crop_year_of(today)
    y0 = int(current[:4])
    years = {current: _get(current)}
    if not years[current]:
        # Early August: the new crop year may not have a file yet. Fall back one year.
        raise SourceError(f"no weeks published yet for {current}")
    prev = previous or {}
    prev_hist = prev.get("crop_years", {}) if prev.get("parser_version") == PARSER_VERSION else {}
    for k in range(1, n + 1):
        cy = f"{y0 - k}-{y0 - k + 1}"
        cached = prev_hist.get(cy)
        # Re-download the most recent completed year once more in case of late revisions.
        if cached and k > 1:
            years[cy] = cached
            continue
        try:
            years[cy] = _get(cy)
        except SourceError:
            if cached:
                years[cy] = cached
            # A missing history year reduces the comparison sample; it is reported as n_years.
    latest_week = max(int(w) for w in years[current])
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": years[current][str(latest_week)]["week_end"],
        "parser_version": PARSER_VERSION,
        "current_crop_year": current,
        "latest_week": latest_week,
        "crop_years": years,
    }
