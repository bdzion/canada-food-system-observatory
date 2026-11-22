"""Assemble one coherent public release from source extracts.

Order of work:
1. refresh each source (keeping the last good extract if a refresh fails);
2. build indicators, events and global-exposure links;
3. write the situation summary, the weekly brief, the RSS feed and the archive;
4. validate everything, then swap the new release into place in one step.
"""
from __future__ import annotations

import hashlib
import inspect
import os
import shutil
from datetime import date, datetime, timedelta
from pathlib import Path

from . import SCHEMA_VERSION
from .connectors import CONNECTORS
from .core import SourceError, config, iso, read_json, registry, sanitize, utc_now, write_json
from .exposure import link_events
from .indicators import (affordability_indicator, grain_indicator, produce_indicator,
                         recalls_indicator, weather_indicator)
from . import narrative, ongoing
from . import panels



# ------------------------------------------------------------------ refresh

def refresh_sources(old_dir: Path, only: set[str] | None = None) -> tuple[dict, dict]:
    """Run connectors. Returns (extracts, attempt_log)."""
    now = utc_now()
    prev_state = read_json(old_dir / "source-state.json", {}) or {}
    extracts, log = {}, {}
    for sid, (mod, min_hours) in CONNECTORS.items():
        prev = read_json(old_dir / "extracts" / f"{sid}.json")
        st = dict(prev_state.get(sid, {}))
        due = True
        if prev and st.get("last_success_at") and min_hours:
            last = datetime.fromisoformat(st["last_success_at"].replace("Z", "+00:00"))
            due = now - last >= timedelta(hours=min_hours)
        if only is not None and sid not in only:
            due = False
        if due:
            st["last_attempt_at"] = iso(now)
            try:
                kw = {"previous": prev} if "previous" in inspect.signature(mod.run).parameters else {}
                ext = mod.run(**kw)
                _check_extract(sid, ext)
                extracts[sid] = ext
                st.update(last_success_at=iso(now), error=None)
            except Exception as e:  # keep the last good extract; record why
                st["error"] = sanitize(f"{type(e).__name__}: {e}")
                if prev:
                    extracts[sid] = prev
        elif prev:
            extracts[sid] = prev
        log[sid] = st
    return extracts, log


def _check_extract(sid: str, ext: dict) -> None:
    if not isinstance(ext, dict) or ext.get("source_id") != sid:
        raise SourceError("extract has the wrong source id")
    if not ext.get("observation_end"):
        raise SourceError("extract has no observation date")


def source_health(log: dict, extracts: dict) -> list[dict]:
    today = utc_now().date()
    out = []
    for sid, reg in registry().items():
        st = log.get(sid, {})
        ext = extracts.get(sid)
        obs = ext.get("observation_end") if ext else None
        age = (today - date.fromisoformat(obs[:10])).days if obs else None
        if not ext:
            health = "unavailable"
        elif st.get("error"):
            health = "error"
        elif age is not None and age > reg["stale_after_days"]:
            health = "stale"
        else:
            health = "ok"
        out.append({
            "id": sid, "provider": reg["provider"], "dataset": reg["dataset"],
            "documentation_url": reg["documentation_url"], "endpoint": reg["endpoint"],
            "licence": reg["licence"], "licence_url": reg.get("licence_url"),
            "evidence_class": reg["evidence_class"], "expected_frequency": reg["expected_frequency"],
            "stale_after_days": reg["stale_after_days"], "browser_live": reg.get("browser_live", False),
            "registry_status": reg["status"], "health": health,
            "observation_end": obs, "age_days": age,
            "retrieved_at": ext.get("retrieved_at") if ext else None,
            "last_attempt_at": st.get("last_attempt_at"), "last_success_at": st.get("last_success_at"),
            "error": st.get("error"),
        })
    return out


# ------------------------------------------------------------------ indicators

def build_indicators(ex: dict) -> tuple[list[dict], dict[str, dict]]:
    inds, series = [], {}
    today = utc_now().date()

    def add(fn, *a, **k):
        try:
            if fn.__module__.endswith("panels"):
                k = {kk: vv for kk, vv in k.items() if kk != "ind_id"}
            ind, ser = fn(*a, **k)
        except Exception as e:  # a builder failure must not sink the release
            ind_id = k.get("ind_id") or getattr(fn, "__name__", "indicator")
            inds.append({"id": ind_id, "title": ind_id.replace("_", " ").capitalize(), "role": "unknown",
                         "headline": {"state": "source_unavailable", "text": f"Could not be computed: {sanitize(str(e))}"}})
            return
        inds.append(ind)
        series[ind["id"]] = ser

    if "CA-05" in ex:
        add(grain_indicator, ex["CA-05"], "stocks_total", ind_id="grain_stocks", title="Grain in storage", role="buffer",
            question="Is there more or less grain in the country's elevators and ports than usual for this time of year?",
            definition=("Wheat, canola and other grains held in licensed grain elevators across the Prairies and at port terminals, "
                        "as reported each week by the Canadian Grain Commission."),
            how=("We add up all grain in storage at the end of the latest week and compare the total with the same week "
                 "in each of the past five crop years."),
            not_show=("Grain still on farms, which is most of Canada's grain, and food further along the chain. A high number can mean "
                      "a comfortable reserve, or grain that cannot move. Read it alongside grain shipped through ports."),
            sentence="Grain elevators and port terminals held {v} million tonnes of grain in {span}.",
            sub={"stocks_primary": "In country elevators on the Prairies", "stocks_ports": "In port terminals"})
        add(grain_indicator, ex["CA-05"], "exports_week", ind_id="grain_exports", title="Grain shipped through ports", role="flow",
            question="Is grain leaving Canada's ports at a normal pace?",
            definition=("Grain and oilseeds shipped abroad from port terminals in Vancouver, Prince Rupert, Thunder Bay, "
                        "the St. Lawrence and elsewhere, reported each week by the Canadian Grain Commission."),
            how=("We add up the latest four weeks, because ships arrive unevenly, and compare the total with the same "
                 "four weeks in each of the past five crop years."),
            not_show=("Why the pace changed. A slowdown can come from rail or port problems, weather, a smaller harvest or weaker sales. "
                      "Grain sent to the United States by rail or truck is not included."),
            sentence="Ports shipped {v} million tonnes of grain abroad in {span}.", rolling=4)
    if "CA-03" in ex:
        add(produce_indicator, ex["CA-03"], ex.get("CA-04"))
    if "CA-04" in ex:
        add(affordability_indicator, ex["CA-04"])
    if "CA-06" in ex:
        add(recalls_indicator, ex["CA-06"], today)
    if "CA-01" in ex:
        add(weather_indicator, ex["CA-01"])
    # Added in release 2.
    if "GL-03" in ex:
        add(panels.chokepoints_indicator, ex["GL-03"], ind_id="sea_lanes")
        add(panels.ports_indicator, ex["GL-03"], ind_id="ports")
    if "GL-04" in ex:
        add(panels.world_fertilizer_indicator, ex["GL-04"], ind_id="world_fertilizer")
        add(panels.world_food_energy_indicator, ex["GL-04"], ind_id="world_prices")
    if "CA-08" in ex:
        g = ex["CA-08"]["groups"]
        if "diesel" in g:
            add(panels.diesel_indicator, ex["CA-08"], ex.get("CA-04"), ind_id="diesel")
        if "farm_inputs" in g:
            add(panels.farm_inputs_indicator, ex["CA-08"], ind_id="farm_inputs")
        if "retail" in g:
            add(panels.retail_indicator, ex["CA-08"], ex.get("CA-04"), ind_id="store_prices")
        if "provinces_food_cpi" in g:
            add(panels.provinces_indicator, ex["CA-08"], ex.get("CA-04"), ind_id="provincial_prices")
        if "food_insecurity" in g:
            add(panels.food_insecurity_indicator, ex["CA-08"], ind_id="food_insecurity")
        if "rail" in g:
            add(panels.rail_indicator, ex["CA-08"], ind_id="rail_freight")
        if "stoppages" in g:
            add(panels.stoppages_indicator, ex["CA-08"], ind_id="work_stoppages")
    if "CA-10" in ex:
        add(panels.exchange_indicator, ex["CA-10"], ind_id="exchange_rate")
    if "CA-09" in ex:
        add(panels.prairie_drought_indicator, ex["CA-09"], ind_id="prairie_drought")
    if "GL-05" in ex:
        add(panels.us_drought_indicator, ex["GL-05"], ind_id="us_drought")
    return inds, series


# ------------------------------------------------------------------ events

def build_events(ex: dict, links: list[dict]) -> dict:
    items = []
    wx = ex.get("CA-01")
    if wx:
        for a in wx["alerts"]:
            items.append({
                "id": a["id"], "kind": "weather_alert", "evidence_class": "official_alert", "source_id": "CA-01",
                "issuer": "Environment and Climate Change Canada", "title": a["type"].capitalize(),
                "date": (a["issued"] or "")[:10], "end": (a["expires"] or "")[:10], "place": a["province"],
                "areas": a["areas"][:12], "n_areas": len(a["areas"]), "url": "https://weather.gc.ca/warnings/index_e.html",
                "farm_relevant": a["farm_relevant"], "alert_type": a.get("alert_type"),
                "impact_status": "impact_not_established",
            })
    rc = ex.get("CA-06")
    if rc:
        for r in rc["recent"][:80]:
            items.append({
                "id": r["id"], "kind": "recall", "evidence_class": "official_notice", "source_id": "CA-06",
                "issuer": "Canadian Food Inspection Agency", "title": r["title"], "date": r["date"],
                "place": "CA", "url": r["url"], "hazard": r["hazard"], "issue": r["issue"],
                "recall_class": r["recall_class"], "impact_status": "impact_not_established",
            })
    gc = ex.get("CA-07")
    if gc:
        for n in gc["items"]:
            if not n["relevant"]:
                continue
            items.append({
                "id": n["id"], "kind": "gov_notice", "evidence_class": "official_notice", "source_id": "CA-07",
                "issuer": n["department"], "title": n["title"], "date": n["date"], "place": "CA", "url": n["url"],
                "impact_status": "not_applicable",
            })
    gd = ex.get("GL-02")
    lk = {l["event_id"]: l for l in links}
    if gd:
        for e in gd["events"]:
            items.append({
                "id": e["id"], "kind": "global_hazard", "evidence_class": "official_alert", "source_id": "GL-02",
                "issuer": "Global Disaster Alert and Coordination System", "title": e["name"], "event_type": e["event_type"], "alert_level": e["alert_level"],
                "date": e["from"], "end": e["to"], "is_current": e["is_current"],
                "place": ", ".join(c["name"] for c in e["countries"][:6]) + (" and others" if len(e["countries"]) > 6 else ""),
                "countries": e["countries"], "point": e["point"], "url": e["url"], "severity_text": e["severity_text"],
                "canada_link": lk.get(e["id"]), "impact_status": "impact_not_established",
            })
    us = ex.get("GL-06")
    if us:
        for a in us["alerts"]:
            items.append({
                "id": a["id"], "kind": "us_alert", "evidence_class": "official_alert", "source_id": "GL-06",
                "issuer": "US National Weather Service", "title": f"{a['event']}, {a['state_label']}",
                "date": (a.get("onset") or "")[:10], "end": (a.get("expires") or "")[:10], "place": a["state"],
                "areas": a["areas"], "n_areas": a["n_zones"], "url": a["url"], "why": a["why"],
                "impact_status": "impact_not_established",
            })
    items.sort(key=lambda x: x.get("date") or "", reverse=True)
    geo = []
    if wx:
        for a in wx["alerts"]:
            for g in a["geometry"]:
                geo.append({"type": "Feature", "geometry": g,
                            "properties": {"id": a["id"], "type": a["type"], "province": a["province"], "alert_type": a.get("alert_type")}})
    return {"items": items, "weather_geo": {"type": "FeatureCollection", "features": geo}}


# ------------------------------------------------------------------ release

def _round_geo(obj, nd: int = 3):
    """Round coordinates (about 100 m at 3 decimals) to keep the web map light."""
    if isinstance(obj, list):
        return [_round_geo(x, nd) for x in obj]
    if isinstance(obj, float):
        return round(obj, nd)
    if isinstance(obj, dict):
        return {k: _round_geo(v, nd) for k, v in obj.items()}
    return obj


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def validate(new: Path) -> None:
    must = ["manifest.json", "sources.json", "indicators.json", "events.json", "exposure.json", "situation.json"]
    for m in must:
        obj = read_json(new / m)
        if obj is None:
            raise SourceError(f"release is missing or has invalid {m}")
        if m != "sources.json" and obj.get("schema_version") != SCHEMA_VERSION:
            raise SourceError(f"{m} has the wrong schema version")
    inds = read_json(new / "indicators.json")["indicators"]
    for i in inds:
        if not i.get("headline", {}).get("text"):
            raise SourceError(f"indicator {i.get('id')} has no headline text")
    for e in read_json(new / "events.json")["items"]:
        if not e.get("url") or not e.get("source_id") or not e.get("evidence_class"):
            raise SourceError(f"event {e.get('id')} lacks provenance")
    man = read_json(new / "manifest.json")
    for name, meta in man["files"].items():
        if sha256(new / name) != meta["sha256"]:
            raise SourceError(f"checksum mismatch for {name}")


def run(data_dir: Path, only: set[str] | None = None) -> dict:
    data_dir = Path(data_dir)
    now = utc_now()
    release_id = now.strftime("%Y%m%dT%H%MZ")
    new = data_dir.parent / (data_dir.name + ".new")
    if new.exists():
        shutil.rmtree(new)
    new.mkdir(parents=True)
    # Carry forward the history that must never be rewritten.
    for keep in ("briefs", "archive"):
        if (data_dir / keep).exists():
            shutil.copytree(data_dir / keep, new / keep)

    extracts, log = refresh_sources(data_dir, only)
    for sid, ext in extracts.items():
        write_json(new / "extracts" / f"{sid}.json", ext)
    write_json(new / "source-state.json", log)
    sources = source_health(log, extracts)
    write_json(new / "sources.json", sources)

    inds, series = build_indicators(extracts)
    for sid, ser in series.items():
        write_json(new / "series" / f"{sid}.json", {"schema_version": SCHEMA_VERSION, **ser})
    links = link_events(extracts.get("GL-02"), extracts.get("GL-01"), extracts.get("CA-03"))
    events = build_events(extracts, links)
    exposure = {
        "schema_version": SCHEMA_VERSION, "release_id": release_id,
        "min_partner_share": config()["exposure"]["min_partner_share"],
        "commodities": list((extracts.get("GL-01") or {}).get("commodities", {}).values()),
        "links": links,
        "produce_origins": [{"id": k, "label": v["label"], "country": v["country"], "link": v.get("link")}
                            for k, v in (extracts.get("CA-03") or {}).get("series", {}).items()],
    }
    ongoing_items = ongoing.build(inds, now)
    prev_sit = read_json(data_dir / "situation.json")
    prev_events = read_json(data_dir / "events.json", {}) or {}
    sit = narrative.situation(release_id, now, inds, events, links, sources, prev_sit, prev_events, ongoing_items)

    common = {"schema_version": SCHEMA_VERSION, "release_id": release_id, "generated_at": iso(now)}
    write_json(new / "indicators.json", {**common, "indicators": inds})
    write_json(new / "events.json", {**common, "items": events["items"]})
    write_json(new / "weather-alerts.geojson", events["weather_geo"])
    write_json(new / "exposure.json", exposure)
    write_json(new / "situation.json", {**common, **sit})
    write_json(new / "ongoing.json", {**common, "items": ongoing_items})
    cdm = extracts.get("CA-09")
    if cdm and cdm.get("latest_geo"):
        write_json(new / "drought.geojson", _round_geo(cdm["latest_geo"]))

    # Weekly brief: written once for each completed ISO week, never overwritten.
    narrative.write_brief_if_due(new, now, sit, inds, events, links, sources)
    narrative.write_feed(new, now)
    # Daily archive snapshot (latest run of the day wins) for the "time machine".
    day = now.date().isoformat()
    write_json(new / "archive" / f"{day}.json", {**common, "situation": sit,
               "indicators": [{"id": i["id"], "title": i.get("title"), "role": i.get("role"), "headline": i.get("headline")} for i in inds]})
    idx = sorted({p.stem for p in (new / "archive").glob("*.json") if p.stem != "index"})
    write_json(new / "archive" / "index.json", {"schema_version": SCHEMA_VERSION, "days": idx})

    files = {}
    for p in sorted(new.rglob("*")):
        if p.is_file() and p.name != "manifest.json" and "extracts" not in p.parts:
            rel = p.relative_to(new).as_posix()
            if rel.startswith(("archive/", "briefs/", "series/")) and rel not in ("archive/index.json", "briefs/index.json"):
                continue  # large or historical; checked by their own index files
            files[rel] = {"sha256": sha256(p), "bytes": p.stat().st_size}
    manifest = {
        **common,
        "git_sha": os.environ.get("GITHUB_SHA"),
        "run_url": (f"{os.environ['GITHUB_SERVER_URL']}/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{os.environ['GITHUB_RUN_ID']}"
                    if os.environ.get("GITHUB_RUN_ID") else None),
        "sources_ok": sum(1 for s in sources if s["health"] == "ok"),
        "sources_total": len(sources),
        "files": files,
    }
    write_json(new / "manifest.json", manifest)
    validate(new)

    # Atomic-enough swap: the old release stays intact until the new one validates.
    old = data_dir.parent / (data_dir.name + ".old")
    if old.exists():
        shutil.rmtree(old)
    if data_dir.exists():
        data_dir.rename(old)
    new.rename(data_dir)
    if old.exists():
        shutil.rmtree(old)
    return manifest
