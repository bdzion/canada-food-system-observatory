"""AAFC InfoHort daily wholesale prices (Toronto terminal market).

We follow a fixed basket of exact quote series (config.yml). For each series
and day we keep the reported low and high price and their midpoint.

Why a midpoint: most quotes in these series have low = high; where they differ,
the midpoint is a neutral one-number summary for trend lines. The site always
shows the low-high range next to it.

History: the 55-week file covers about a year. For "normal for this week" we
also read AAFC's multi-year archive files once a month and keep weekly means
per series and year.
"""
from __future__ import annotations

import csv
import io
import zipfile
from collections import defaultdict
from datetime import date, timedelta

from ..core import SourceError, cache_dir, config, fetch, iso, parse_date, registry, utc_now

ID = "CA-03"


def _key(r: dict) -> tuple:
    return (
        r["CentreEn_CentreAn"].strip(), r["CmdtyEn_PrdtAn"].strip(), r["VrtyEn_VrteAn"].strip(),
        r["GradeEn_CtgryAn"].strip(), r["Cntry_Pays"].strip(), r["ProvState_ProvEtat"].strip(),
        r["PkgTypeEn_EmpqtgAn"].strip(),
    )


def _series_keys(cfg: dict) -> dict[tuple, str]:
    m = cfg["market"]
    return {
        (m, s["commodity"], s["variety"], s["grade"], s["country"], s["province"], s["package"]): s["id"]
        for s in cfg["series"]
    }


def _price(s: str) -> float | None:
    try:
        v = float((s or "").strip())
    except ValueError:
        return None
    return v if v > 0 else None


def scan(lines, keys: dict[tuple, str], since: date | None = None) -> dict[str, dict[str, dict]]:
    """Return {series_id: {date: {lo, hi, mid}}} for matching rows."""
    out: dict[str, dict[str, dict]] = defaultdict(dict)
    for r in csv.DictReader(lines):
        sid = keys.get(_key(r))
        if not sid:
            continue
        d = parse_date(r["Date"])
        if d is None or (since and d < since):
            continue
        lo, hi = _price(r["LowPrice_PrixMin"]), _price(r["HighPrice_PrixMax"])
        if lo is None and hi is None:
            continue
        lo = lo if lo is not None else hi
        hi = hi if hi is not None else lo
        out[sid][d.isoformat()] = {"lo": lo, "hi": hi, "mid": round((lo + hi) / 2, 2)}
    return out


def weekly_means(daily: dict[str, dict]) -> dict[str, dict[str, float]]:
    """{date: {...}} -> {iso_year: {iso_week: mean midpoint}}."""
    acc: dict[tuple, list] = defaultdict(list)
    for ds, v in daily.items():
        y, w, _ = date.fromisoformat(ds).isocalendar()
        acc[(y, w)].append(v["mid"])
    res: dict[str, dict[str, float]] = defaultdict(dict)
    for (y, w), vs in acc.items():
        res[str(y)][str(w)] = round(sum(vs) / len(vs), 3)
    return res


def _history(keys: dict[tuple, str], urls: list[str]) -> dict[str, dict]:
    hist: dict[str, dict] = defaultdict(dict)
    for url in urls:
        dest = cache_dir() / url.rsplit("/", 1)[-1]
        fetch(url, dest=dest, timeout=600)
        with zipfile.ZipFile(dest) as z:
            name = next(n for n in z.namelist() if n.lower().endswith(".csv"))
            with z.open(name) as f:
                part = scan(io.TextIOWrapper(f, encoding="utf-8-sig", newline=""), keys)
        for sid, days in part.items():
            hist[sid].update(days)
    return {sid: weekly_means(days) for sid, days in hist.items()}


def run(previous: dict | None = None) -> dict:
    cfg = config()["infohort"]
    reg = registry()[ID]
    keys = _series_keys(cfg)
    dest = cache_dir() / "infohort-55wk.csv"
    fetch(reg["endpoint"], dest=dest, timeout=600)
    with open(dest, encoding="utf-8-sig", newline="") as f:
        recent = scan(f, keys)
    if not recent:
        raise SourceError("none of the configured InfoHort series were found; check config.yml")
    today = utc_now().date()
    prev = previous or {}
    hist = prev.get("history_weekly")
    built = prev.get("history_built")
    stale = not built or (today - date.fromisoformat(built)) > timedelta(days=30)
    basket_changed = set(prev.get("series_ids", [])) != set(keys.values())
    if not hist or stale or basket_changed:
        try:
            hist = _history(keys, reg["archive_endpoints"])
            built = today.isoformat()
        except SourceError:
            if not hist:
                hist, built = {}, None  # comparisons will report "not enough history"
    meta = {s["id"]: {k: s[k] for k in ("label", "commodity", "variety", "grade", "country", "province", "package", "link")}
            for s in cfg["series"]}
    series = {}
    for sid in keys.values():
        days = recent.get(sid, {})
        pts = [{"t": d, **v} for d, v in sorted(days.items())]
        series[sid] = {**meta[sid], "market": cfg["market"], "points": pts}
    ends = [s["points"][-1]["t"] for s in series.values() if s["points"]]
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": max(ends),
        "series_ids": list(keys.values()),
        "series": series,
        "history_weekly": hist,
        "history_built": built,
    }
