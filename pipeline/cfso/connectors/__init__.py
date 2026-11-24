"""One module per official source. Each exposes run(previous=None) -> extract dict."""
from . import (boc, cdm, cgc, comtrade, foodmfg, gcnews, gdacs, geomet, grainstocks, infohort, nws,
               portwatch, recalls, statcan, statcan_more, usdm, worldbank)

# Source ID -> (module, minimum hours between refreshes). Annual trade data
# does not need checking several times a day.
CONNECTORS = {
    "CA-01": (geomet, 0),
    "CA-03": (infohort, 0),
    "CA-04": (statcan, 0),
    "CA-05": (cgc, 0),
    "CA-06": (recalls, 0),
    "CA-07": (gcnews, 0),
    "GL-01": (comtrade, 24 * 14),
    "GL-02": (gdacs, 0),
    # Added in release 2.
    "CA-08": (statcan_more, 6),
    "CA-09": (cdm, 12),
    "CA-10": (boc, 0),
    "GL-03": (portwatch, 0),
    "GL-04": (worldbank, 24),
    "GL-05": (usdm, 12),
    "GL-06": (nws, 0),
    # Added in release 3. Both publish slowly, so there is nothing to gain from
    # checking them more than once a day.
    "CA-11": (grainstocks, 24),
    "CA-12": (foodmfg, 12),
}
