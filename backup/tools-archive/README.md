# Archived tools (phase 1 → phase 2 migration)

These scripts produced the refactor and the earlier redesign phases. They are
kept for audit only and **must not be re-run**: their input paths
(`guardhai-prototype/…`) no longer exist, and re-running the splitters on the
already-split tree would corrupt it.

The source they operated on is preserved in `backup/single-file-app-2026-10-27/`
and `backup/prototype-original-2026-10-27.html`.

Active tooling now lives in `tools/`:

| file | purpose |
|---|---|
| `verify_app.py` | static integrity checks for the module tree |
| `pkg_redact.py` | credential redaction for the shipped archive |
| `run_tests.sh` | runs the three Playwright suites |
