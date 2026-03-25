# Test Environment Status

## Scope
- `tests/*`
- `devtools/*`
- `tools/check-llm-pipeline.mjs`
- `tools/llm-preflight.mjs`

## Sync Rules
- `docs/STATUS.md:29-31` requires explicit runner headroom, wording clarity, and doc freshness before closing work.
- `docs/STATUS.md:37-39` records that evidence runs and registry inventory must stay synchronized with live runtime/test paths.
- `docs/STATUS.md:76-79` keeps the wrapped regression run and quick hardening current as slices evolve.

## 2026-03-25 Audit Hardening
- Aggregate runner now defaults to `full` unless a narrower suite is explicitly requested.
- Runner preflight audit warnings are fail-closed in `devtools/run-all-tests.mjs` and `devtools/run-test-suite.mjs`.
- `devtools/test-suites.mjs` now derives `TESTING_PREFLIGHT_PATHS` directly from `docs/llm/TASK_ENTRY_MATRIX.json` to keep testing-scope classification mechanically synced.
- `devtools/evidence-runner.mjs` now compares every replay attempt against the first anchor instead of silently trusting attempts beyond `2`.
- `tests/evidence/spec-map.mjs` now constructs claim/regression registries through duplicate-key guards so silent overwrite drift cannot hide in the registry layer.

## Remaining Watchpoints
- Evidence artifacts still include wall-clock timestamps and attestation timestamps; outcome determinism is enforced, but byte-identical artifact reproduction still requires a future dedicated clock/input freeze.
- Visual Playwright evidence remains inherently environment-sensitive and should stay isolated from default deterministic regression judgments unless its harness is explicitly stabilized.
