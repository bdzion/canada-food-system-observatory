"""Connector tests against stored payloads in the shapes the providers send.

Before these, no connector's parsing was tested at all: a provider renaming a
column was caught only in production, weeks later, by the staleness flag. The
fixtures in tests/fixtures are real payload shapes, trimmed, with no
credentials in them.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from cfso.connectors import cgc, foodmfg, grainstocks, portwatch, statcan
from cfso.core import SourceError

FIX = Path(__file__).parent / "fixtures"


def fixture(name: str):
    p = FIX / name
    return json.loads(p.read_text(encoding="utf-8")) if p.suffix == ".json" else p.read_text(encoding="utf-8")


# ------------------------------------------------------------------ Grain Commission

def test_cgc_parses_the_current_title_case_headers():
    weeks = cgc.parse_crop_year(fixture("cgc_crop_year.csv"))
    assert set(weeks) == {"8", "9"}
    w9 = weeks["9"]
    assert w9["week_end"] == "2026-10-04"
    # Stocks are summed over every region, and the port regions again on their own.
    assert w9["stocks_total"] == pytest.approx(4182.2 + 1500.1 + 1260.0)
    assert w9["stocks_primary"] == pytest.approx(4182.2)
    assert w9["stocks_ports"] == pytest.approx(1500.1 + 1260.0)
    assert w9["exports_week"] == pytest.approx(1040.5)
    assert w9["deliveries_week"] == pytest.approx(1514.3)


def test_cgc_parses_the_older_snake_case_headers_identically():
    assert cgc.parse_crop_year(fixture("cgc_crop_year.csv")) == \
           cgc.parse_crop_year(fixture("cgc_crop_year_snake.csv"))


def test_cgc_ignores_year_to_date_rows():
    """A year-to-date export row would otherwise be added to the weekly total."""
    weeks = cgc.parse_crop_year(fixture("cgc_crop_year.csv"))
    assert weeks["9"]["exports_week"] == pytest.approx(1040.5)  # not 1040.5 + 9999.9


def test_cgc_keeps_a_blank_value_missing_rather_than_zero():
    weeks = cgc.parse_crop_year(fixture("cgc_crop_year.csv"))
    # The Churchill barley row has "-", so it contributes nothing at all and
    # does not drag the port total down to include a zero.
    assert weeks["9"]["stocks_ports"] == pytest.approx(1500.1 + 1260.0)


def test_cgc_rejects_a_file_missing_a_column_it_needs():
    bad = "Crop Year,Grain Week,Worksheet,Metric,Period,Region,Ktonnes\n2026-27,9,Summary,Stocks,Current Week,Vancouver,1\n"
    with pytest.raises(SourceError, match="missing columns"):
        cgc.parse_crop_year(bad)


def test_cgc_tolerates_a_non_numeric_week():
    weeks = cgc.parse_crop_year(
        "Crop Year,Grain Week,Week Ending Date,Worksheet,Metric,Period,Grain,Grade,Region,Ktonnes\n"
        "2026-27,Total,2026-10-04,Summary,Stocks,Current Week,Wheat,All,Vancouver,5\n"
        "2026-27,9,2026-10-04,Summary,Stocks,Current Week,Wheat,All,Vancouver,5\n")
    assert set(weeks) == {"9"}


# ------------------------------------------------------------------ PortWatch

def test_portwatch_retries_an_error_body_then_succeeds(monkeypatch):
    """ArcGIS answers failures with HTTP 200 and an error object, so core.fetch's
    retry never sees them. One transient error used to take the source down for
    a whole refresh cycle, and with it the only ongoing disruption's live check.
    """
    calls = []

    def fake(url, params=None, **kw):
        calls.append(params["resultOffset"])
        return fixture("portwatch_error.json") if len(calls) == 1 else fixture("portwatch_page.json")

    monkeypatch.setattr(portwatch, "fetch_json", fake)
    monkeypatch.setattr(portwatch.time, "sleep", lambda s: None)
    rows = portwatch._query("Daily_Chokepoints_Data", "portid IN ('chokepoint6')", "date,portid,n_total")
    assert len(calls) == 2
    assert [r["date"] for r in rows] == ["2026-11-01", "2026-11-02"]


def test_portwatch_gives_up_after_the_attempt_limit(monkeypatch):
    monkeypatch.setattr(portwatch, "fetch_json", lambda url, params=None, **kw: fixture("portwatch_error.json"))
    monkeypatch.setattr(portwatch.time, "sleep", lambda s: None)
    with pytest.raises(SourceError, match="Invalid URL"):
        portwatch._query("Daily_Chokepoints_Data", "1=1", "date")


def test_portwatch_pages_until_the_limit_is_not_exceeded(monkeypatch):
    pages = [{"features": [{"attributes": {"date": "2026-11-01", "portid": "c6"}}], "exceededTransferLimit": True},
             {"features": [{"attributes": {"date": "2026-11-02", "portid": "c6"}}], "exceededTransferLimit": False}]
    seen = []

    def fake(url, params=None, **kw):
        seen.append(params["resultOffset"])
        return pages[len(seen) - 1]

    monkeypatch.setattr(portwatch, "fetch_json", fake)
    rows = portwatch._query("Daily_Ports_Data", "1=1", "date,portid")
    assert seen == [0, 1]           # the offset advances by the rows received
    assert len(rows) == 2


# ------------------------------------------------------------------ Statistics Canada WDS

SERIES = {
    "inv_to_sales": {"coordinate": "1.8.1.3.0.0.0.0.0.0", "label": "Stock per dollar shipped", "unit": "ratio"},
    "finished_to_sales": {"coordinate": "1.9.1.3.0.0.0.0.0.0", "label": "Finished goods per dollar", "unit": "ratio"},
}


def test_wds_pull_reads_points_in_date_order_and_keeps_a_suppressed_value_missing(monkeypatch):
    monkeypatch.setattr(statcan, "fetch_json", lambda *a, **kw: fixture("statcan_wds.json"))
    out = statcan._pull(16100047, SERIES, 3, source_id="CA-12")
    assert [p["t"] for p in out["inv_to_sales"]["points"]] == ["2026-07-01", "2026-08-01", "2026-09-01"]
    assert out["inv_to_sales"]["points"][-1]["v"] == 0.98
    assert out["inv_to_sales"]["vector_id"] == 803267
    # A suppressed observation stays None; it is never read as zero.
    assert out["finished_to_sales"]["points"][1]["v"] is None


def test_wds_pull_matches_replies_to_coordinates_not_to_request_order(monkeypatch):
    reply = list(reversed(fixture("statcan_wds.json")))
    monkeypatch.setattr(statcan, "fetch_json", lambda *a, **kw: reply)
    out = statcan._pull(16100047, SERIES, 3, source_id="CA-12")
    assert out["inv_to_sales"]["coordinate"] == "1.8.1.3.0.0.0.0.0.0"
    assert out["finished_to_sales"]["coordinate"] == "1.9.1.3.0.0.0.0.0.0"


def test_wds_pull_raises_when_the_service_reports_a_failure(monkeypatch):
    monkeypatch.setattr(statcan, "fetch_json", lambda *a, **kw: fixture("statcan_wds_failed.json"))
    with pytest.raises(SourceError, match="WDS error"):
        statcan._pull(16100047, SERIES, 3, source_id="CA-12")


def test_wds_pull_raises_when_a_requested_coordinate_is_absent(monkeypatch):
    monkeypatch.setattr(statcan, "fetch_json", lambda *a, **kw: fixture("statcan_wds.json")[:1])
    with pytest.raises(SourceError, match="did not return coordinate"):
        statcan._pull(16100047, SERIES, 3, source_id="CA-12")


# ------------------------------------------------------------------ the two new sources

def test_food_manufacturing_connector_shape(monkeypatch):
    monkeypatch.setattr(statcan, "fetch_json", lambda *a, **kw: fixture("statcan_wds.json"))
    monkeypatch.setattr(foodmfg, "config", lambda: {"food_manufacturing": {"product": 16100047, "months": 3, "series": SERIES}})
    ext = foodmfg.run()
    assert ext["source_id"] == "CA-12"
    assert ext["observation_end"] == "2026-09-01"
    assert set(ext["series"]) == set(SERIES)


def test_grain_stocks_connector_shape(monkeypatch):
    monkeypatch.setattr(statcan, "fetch_json", lambda *a, **kw: fixture("statcan_wds.json"))
    monkeypatch.setattr(grainstocks, "config", lambda: {"grain_stocks": {"product": 32100013, "periods": 3, "series": SERIES}})
    ext = grainstocks.run()
    assert ext["source_id"] == "CA-11"
    assert ext["unit"] == "thousand tonnes"
    assert ext["observation_end"] == "2026-09-01"


def test_new_connectors_are_registered_with_their_registry_entries():
    from cfso.connectors import CONNECTORS
    from cfso.core import registry
    reg = registry()
    for sid in ("CA-11", "CA-12"):
        assert sid in CONNECTORS, sid
        assert sid in reg, sid
        assert reg[sid]["licence_url"].startswith("https://"), sid
        assert reg[sid]["stale_after_days"] > 0, sid


def test_every_connector_has_a_registry_entry_and_the_reverse():
    """A connector with no registry entry would crash source_health; an entry
    with no connector would be reported as permanently unavailable."""
    from cfso.connectors import CONNECTORS
    from cfso.core import registry
    assert set(CONNECTORS) == set(registry())
