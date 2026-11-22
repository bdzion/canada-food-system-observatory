"""Shared helpers: HTTP with retries, dates, robust statistics, JSON output.

Conventions used everywhere in the pipeline:
- Missing values are None, never 0.
- Percentage change with a zero or missing base is None ("not calculable").
- Timestamps are ISO 8601 in UTC; observation periods are plain dates.
"""
from __future__ import annotations

import json
import os
import re
import statistics
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import httpx
import yaml

from . import USER_AGENT

ROOT = Path(__file__).resolve().parent.parent


class SourceError(RuntimeError):
    """A source could not be fetched or failed validation."""


def load_yaml(name: str) -> dict:
    with open(ROOT / name, encoding="utf-8") as f:
        return yaml.safe_load(f)


def registry() -> dict[str, dict]:
    return {s["id"]: s for s in load_yaml("sources.yml")["sources"]}


def config() -> dict:
    return load_yaml("config.yml")


def utc_now() -> datetime:
    fixed = os.environ.get("CFSO_NOW")  # lets tests pin "now"
    if fixed:
        return datetime.fromisoformat(fixed).astimezone(timezone.utc)
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def client(timeout: float = 120.0) -> httpx.Client:
    # http1 only: some government servers drop long HTTP/2 streams through proxies.
    return httpx.Client(
        headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
        timeout=httpx.Timeout(timeout, connect=30.0),
        follow_redirects=True,
        http2=False,
    )


def fetch(url: str, *, params: dict | None = None, method: str = "GET", json_body: Any = None,
          attempts: int = 4, timeout: float = 180.0, dest: Path | None = None) -> bytes | Path:
    """Fetch a URL with bounded retries and exponential back-off.

    If `dest` is given the body is streamed to that file (for large downloads)
    and the path is returned; otherwise the body bytes are returned.
    """
    last: Exception | None = None
    for i in range(attempts):
        try:
            with client(timeout) as c:
                if dest is None:
                    r = c.request(method, url, params=params, json=json_body)
                    r.raise_for_status()
                    return r.content
                with c.stream(method, url, params=params, json=json_body) as r:
                    r.raise_for_status()
                    tmp = dest.with_suffix(dest.suffix + ".part")
                    with open(tmp, "wb") as f:
                        for chunk in r.iter_bytes(1 << 20):
                            f.write(chunk)
                    tmp.replace(dest)
                    return dest
        except (httpx.HTTPError, OSError) as e:  # network, timeout or HTTP status
            last = e
            status = getattr(getattr(e, "response", None), "status_code", None)
            if status is not None and 400 <= status < 500 and status != 429:
                break  # client errors will not fix themselves
            time.sleep(min(60, 3 * 2 ** i))
    raise SourceError(f"fetch failed for {url}: {sanitize(str(last))}")


def fetch_json(url: str, **kw) -> Any:
    body = fetch(url, **kw)
    try:
        return json.loads(body)
    except ValueError as e:
        raise SourceError(f"invalid JSON from {url}: {e}") from e


def sanitize(msg: str) -> str:
    """Strip anything that looks like a credential from an error message."""
    msg = re.sub(r"(subscription-key|api[_-]?key|token|key)=[^&\s]+", r"\1=***", msg, flags=re.I)
    return msg[:300]


# ---------------------------------------------------------------- statistics

def median(xs: Iterable[float | None]) -> float | None:
    v = [x for x in xs if x is not None]
    return statistics.median(v) if v else None


def pct_change(cur: float | None, base: float | None) -> float | None:
    if cur is None or base is None or base == 0:
        return None
    return 100.0 * (cur - base) / base


def rnd(x: float | None, nd: int = 1) -> float | None:
    return None if x is None else round(x, nd)


def reference_state(value: float | None, ref: list[float], min_years: int) -> dict:
    """Compare one value with the same period in earlier years.

    Returns the screening state used on the site. "Outside" means outside the
    full range (minimum to maximum) of the comparable earlier years. This is a
    deliberately conservative rule for a first release: it flags only values
    no earlier year matched. It is a prompt to look closer, not a finding.
    """
    ref = [r for r in ref if r is not None]
    if value is None:
        return {"state": "insufficient_data", "n_years": len(ref)}
    if len(ref) < min_years:
        return {"state": "insufficient_data", "n_years": len(ref)}
    lo, hi, med = min(ref), max(ref), statistics.median(ref)
    if value > hi:
        state, direction = "outside_reference_range_review", "above"
    elif value < lo:
        state, direction = "outside_reference_range_review", "below"
    else:
        state, direction = "within_reference_range", "within"
    return {
        "state": state, "direction": direction, "n_years": len(ref),
        "median": rnd(med, 2), "min": rnd(lo, 2), "max": rnd(hi, 2),
        "vs_median_pct": rnd(pct_change(value, med), 1),
    }


# ---------------------------------------------------------------- dates

def crop_year_of(d: date) -> str:
    """Canadian crop year label, e.g. 2026-2027 for 1 Aug 2026 to 31 Jul 2027."""
    y = d.year if d.month >= 8 else d.year - 1
    return f"{y}-{y + 1}"


def iso_week_label(d: date) -> str:
    y, w, _ = d.isocalendar()
    return f"{y}-W{w:02d}"


def parse_date(s: str) -> date | None:
    s = (s or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(s[:19] if "T" in s else s, fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
    except ValueError:
        return None


WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]


def words(n: int, cap: bool = False) -> str:
    """Numbers up to ten as words (Canadian Press style), larger ones as figures."""
    s = WORDS[n] if 0 <= n <= 10 else f"{n:,}"
    return s[0].upper() + s[1:] if cap else s


def days_between(a: date, b: date) -> int:
    return (b - a).days


# ---------------------------------------------------------------- output

def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    tmp.replace(path)


def read_json(path: Path, default: Any = None) -> Any:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def cache_dir() -> Path:
    p = Path(os.environ.get("CFSO_CACHE", ROOT / ".cache"))
    p.mkdir(parents=True, exist_ok=True)
    return p


def week_ago(d: date, n: int = 1) -> date:
    return d - timedelta(days=7 * n)
