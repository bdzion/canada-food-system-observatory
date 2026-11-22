"""IMF PortWatch: daily ship transits at sea-lane chokepoints and port calls.

PortWatch estimates daily vessel counts and cargo from ship-tracking (AIS)
signals. We read the public ArcGIS feature services, page through results,
and after the first run fetch only the last few weeks.
"""
from __future__ import annotations

from datetime import date, timedelta

from ..core import SourceError, config, fetch_json, iso, registry, utc_now

ID = "GL-03"
PAGE = 1000


def _query(layer: str, where: str, fields: str) -> list[dict]:
    base = registry()[ID]["endpoint"]
    rows, off = [], 0
    while True:
        d = fetch_json(f"{base}/{layer}/FeatureServer/0/query", params={
            "where": where, "outFields": fields, "orderByFields": "date", "returnGeometry": "false",
            "f": "json", "resultOffset": off, "resultRecordCount": PAGE})
        if "error" in d:
            raise SourceError(f"PortWatch error: {d['error'].get('message')}")
        feats = d.get("features") or []
        rows += [f["attributes"] for f in feats]
        if not feats or not d.get("exceededTransferLimit"):
            return rows
        off += len(feats)


def _since(prev: dict | None, key: str, ids, start: str) -> str:
    """Earliest date any configured entity still needs (new entities need the full history)."""
    out = []
    for pid in ids:
        days = ((prev or {}).get(key, {}).get(pid) or {}).get("days") or {}
        # Missing, or only a short recent stretch (an entity added later): fetch everything.
        if not days or min(days) > (date.fromisoformat(start) + timedelta(days=60)).isoformat():
            return start
        out.append((date.fromisoformat(max(days)) - timedelta(days=21)).isoformat())
    return min(out) if out else start


def run(previous: dict | None = None) -> dict:
    cfg = config()["portwatch"]
    out = {"chokepoints": {}, "ports": {}}
    # Chokepoints: number of transits by ship type, and estimated capacity (deadweight tonnes).
    since = _since(previous, "chokepoints", cfg["chokepoints"], cfg["start"])
    ids = ",".join(f"'{k}'" for k in cfg["chokepoints"])
    rows = _query("Daily_Chokepoints_Data", f"portid IN ({ids}) AND date >= '{since}'",
                  "date,portid,n_total,n_tanker,n_dry_bulk,n_container,capacity")
    for pid, name in cfg["chokepoints"].items():
        days = dict(((previous or {}).get("chokepoints", {}).get(pid, {}) or {}).get("days", {}))
        for r in rows:
            if r["portid"] == pid and r.get("date"):
                days[r["date"][:10]] = [r.get("n_total"), r.get("n_tanker"), r.get("n_dry_bulk"), r.get("n_container"), r.get("capacity")]
        out["chokepoints"][pid] = {"name": name, "fields": ["all", "tanker", "dry_bulk", "container", "capacity_dwt"],
                                   "days": dict(sorted(days.items()))}
    # Canadian ports: port calls and estimated tonnes loaded (exports) and unloaded (imports).
    since = _since(previous, "ports", cfg["ports"], cfg["start"])
    ids = ",".join(f"'{k}'" for k in cfg["ports"])
    rows = _query("Daily_Ports_Data", f"portid IN ({ids}) AND date >= '{since}'",
                  "date,portid,portcalls,import,export,export_dry_bulk")
    for pid, name in cfg["ports"].items():
        days = dict(((previous or {}).get("ports", {}).get(pid, {}) or {}).get("days", {}))
        for r in rows:
            if r["portid"] == pid and r.get("date"):
                rec = [r.get("portcalls"), r.get("import"), r.get("export"), r.get("export_dry_bulk")]
                old = days.get(r["date"][:10])
                # Guard against duplicate rows for one port and day: keep the larger record.
                if old is None or (rec[0] or 0) >= (old[0] or 0):
                    days[r["date"][:10]] = rec
        out["ports"][pid] = {"name": name, "fields": ["port_calls", "import_t", "export_t", "export_dry_bulk_t"],
                             "days": dict(sorted(days.items()))}
    ends = [max(p["days"]) for grp in out.values() for p in grp.values() if p["days"]]
    if not ends:
        raise SourceError("PortWatch returned no days")
    return {"source_id": ID, "retrieved_at": iso(utc_now()), "observation_end": max(ends), **out}
