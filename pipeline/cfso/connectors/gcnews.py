"""Government of Canada News Centre (canada.ca news API).

We keep titles, dates, departments and links only. These records show what a
department announced; they are not evidence that an announced measure worked.
"""
from __future__ import annotations

from ..core import SourceError, config, fetch_json, iso, parse_date, registry, utc_now

ID = "CA-07"

# Words that make a release relevant to food-system monitoring. Ministerial
# itineraries and general announcements without these words are skipped.
RELEVANT = (
    "food", "farm", "agricultur", "grain", "crop", "livestock", "poultry", "avian", "influenza",
    "fertil", "drought", "flood", "wildfire", "rail", "port", "supply chain", "trade",
    "tariff", "export", "import", "recall", "inspection", "disease", "pest", "emergency management",
    "cyber", "critical infrastructure", "food price", "fish", "dairy", "beef", "pork", "canola",
    "wheat", "biosecurity", "lanternfly", "swine", "outbreak",
)


DEPT_PHRASES = (
    "agriculture and agri-food canada", "agriculture and agri-food", "minister of agriculture",
    "canadian food inspection agency", "public safety canada", "emergency management exemplary service",
)


def run() -> dict:
    reg = registry()[ID]
    pick = config()["gcnews"]["pick"]
    items, ok = [], 0
    for dept, name in reg["departments"].items():
        try:
            data = fetch_json(reg["endpoint"], params={
                "dept": dept, "sort": "publishedDate", "orderBy": "desc", "pick": pick, "format": "json",
            })
        except SourceError:
            continue
        ok += 1
        for e in (data.get("feed") or {}).get("entry") or []:
            title = " ".join((e.get("title") or "").split())
            text = (title + " " + (e.get("teaser") or "")).lower()
            # Department names and titles would match every release; remove them first.
            for phrase in DEPT_PHRASES:
                text = text.replace(phrase, " ")
            d = parse_date(e.get("publishedDate") or "")
            if not d or not e.get("link"):
                continue
            items.append({
                "id": "gc-" + e["link"].rstrip("/").rsplit("/", 1)[-1].replace(".html", "")[:80],
                "title": title,
                "url": e["link"],
                "date": d.isoformat(),
                "department": name,
                "relevant": any(w in text for w in RELEVANT),
            })
    if ok == 0:
        raise SourceError("no department feed could be read")
    items.sort(key=lambda x: x["date"], reverse=True)
    return {
        "source_id": ID,
        "retrieved_at": iso(utc_now()),
        "observation_end": items[0]["date"] if items else None,
        "items": items,
    }
