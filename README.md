# Data releases

This branch holds the processed data for the Canada Food System Observatory.
Each commit is one release, written by the scheduled pipeline in `main`
(`.github/workflows/refresh-and-deploy.yml`). `data/manifest.json` lists every
public file with its checksum; `data/extracts/` holds the cleaned source extracts
the release was built from; `data/briefs/` and `data/archive/` are never rewritten.
