"""Canada Food System Observatory data pipeline.

Each connector fetches one official source, validates it, and returns plain
records. `cfso.run` assembles a release: indicators, events, global exposure,
the situation summary, the weekly brief, the RSS feed and the archive.
"""

SCHEMA_VERSION = "1.0.0"
USER_AGENT = (
    "CanadaFoodSystemObservatory/1.0 (research prototype; "
    "https://github.com/bdzion/canada-food-system-observatory; mbodrudd@uoguelph.ca)"
)
