# Determinism / Repro Audit

Date: 2026-03-16
Repo: `C:\Users\Vannon\Downloads\LifeGameLab`
Base commit at audit start: `d8b5ea3`
Status: reproducibility is not fully trustworthy yet

## Scope

Full-project audit for:

- non-deterministic entropy in operative paths
- direct state or patch injection paths
- hidden or dev-only mutation systems
- suite coverage gaps that fake green confidence
- stale artifacts that corrupt audit evidence

Method:

- repo-wide static scan over `src/`, `tests/`, `tools/`, `docs/`
- targeted code inspection of reducer, runtime buffer, read-model, fog, player actions
- dynamic proof runs for critical mutation paths
- separate execution of tests not covered by `tools/test-suites.mjs`

## Executive Summary

The current codebase has two real runtime mutation surfaces that can fake reproducibility even when seed-based determinism is otherwise stable:

1. `APPLY_BUFFERED_SIM_STEP` is an open patch-ingestion action.
2. `DEV_BALANCE_RUN_AI` mutates live gameplay state outside normal player progression.

The current "full" test run is also not actually full. `node tools/run-all-tests.mjs --full` omits 19 test files. Two of those omitted tests fail right now:

- `tests/test-fog-intel-read-model.mjs`
- `tests/test-remote-reachability-gates.mjs`

That means "ALL_TESTS_OK" currently overstates proof coverage.

## Findings

### F1. Open patch injection via `APPLY_BUFFERED_SIM_STEP`

Severity: critical

Evidence:

- `src/project/contract/actionSchema.js:27`
  `APPLY_BUFFERED_SIM_STEP` accepts arbitrary object payload via `allowUnknown: true`.
- `src/project/contract/mutationMatrix.js:108`
  `APPLY_BUFFERED_SIM_STEP` is allowed to write broad `/world/` and `/sim/` paths.
- `src/game/sim/reducer/index.js:1095`
  reducer accepts `APPLY_BUFFERED_SIM_STEP`.
- `src/game/sim/reducer/index.js:1098`
  base checks only run if `baseRevision` / `baseSimTick` are present.
- `src/app/main.js:700`
  runtime dispatches `APPLY_BUFFERED_SIM_STEP` with only `{ patches }`.
- `src/app/main.js:445`
  raw store is exposed globally as `window.__lifeGameStore`.

Dynamic proof:

```json
{"beforeDna":0,"afterDna":123.456,"beforeTick":0,"afterTick":1}
```

This was produced by dispatching:

- `APPLY_BUFFERED_SIM_STEP`
- patch `/sim/playerDNA = before + 123.456`
- patch `/sim/tick = before + 1`

No base revision or base sim tick was required.

Causal consequence:

- identical seed + identical gameplay actions are no longer sufficient to reproduce a run if this action is reachable
- any injected script, console usage, or accidental helper can overwrite SIM-visible truth and still stay inside allowed patch keys
- determinism tests can be made to "pass" while operating on already-forced state
- buffered-step optimization is currently also an unguarded mutation backdoor because the runtime uses the same action shape

### F2. Dev mutation system changes live world state

Severity: high

Evidence:

- `src/project/contract/actionSchema.js:26`
  `DEV_BALANCE_RUN_AI` accepts arbitrary object payload via `allowUnknown: true`.
- `src/project/contract/mutationMatrix.js:107`
  action is allowed to mutate `/world/trait`, `/world/hue`, `/world/lineageMemory`, and dev vault fields.
- `src/game/sim/reducer/index.js:1255`
  reducer exposes `DEV_BALANCE_RUN_AI`.
- `src/game/sim/reducer/cpuActions.js:134`
  action writes `world/trait`.
- `src/game/sim/reducer/cpuActions.js:140`
  action writes `world/hue`.
- `src/app/main.js:551`
  runtime dispatch path exists.
- `src/app/main.js:602`
  dev controller is exposed globally as `window.__devBalance`.

Dynamic proof:

```json
{"beforeTraitSum":251.25,"afterTraitSum":251.267183,"beforeHueSum":8610,"afterHueSum":8612.377686,"applied":8}
```

Causal consequence:

- runs can diverge because of a dev-only mutation system, not because of the declared game rules
- trait and hue state can be pushed mid-run without normal progression, tech, or player interaction constraints
- audit evidence becomes ambiguous unless dev mutation is strictly quarantined from reproducibility claims

### F3. The declared full suite is not full

Severity: high

Evidence:

- `tools/test-suites.mjs:49`
- `tools/test-suites.mjs:50`
- `tools/test-suites.mjs:51`

The suite file only lists a subset of `tests/*.mjs`. A direct comparison against the `tests/` folder found 19 unregistered test files.

Unregistered tests audited manually:

- pass: `tests/test-confirm-foundation.mjs`
- pass: `tests/test-cpu-visibility-gating.mjs`
- pass: `tests/test-determinism-guard-policy.mjs`
- fail: `tests/test-fog-intel-read-model.mjs`
- pass: `tests/test-founder-placement.mjs`
- pass: `tests/test-freeze-contract.mjs`
- pass: `tests/test-freeze-progression.mjs`
- pass: `tests/test-genesis-action-gates.mjs`
- pass: `tests/test-loss-core-collapse.mjs`
- pass: `tests/test-loss-network-decay.mjs`
- pass: `tests/test-loss-vision-break.mjs`
- fail: `tests/test-remote-reachability-gates.mjs`
- pass: `tests/test-render-worker-fallback.mjs`
- pass: `tests/test-report-utils.mjs`
- pass: `tests/test-result-phase.mjs`
- pass: `tests/test-simstep-buffer-guard.mjs`
- pass: `tests/test-standard-infra-flow.mjs`
- pass: `tests/test-world-presets-determinism.mjs`
- pass: `tests/test-world-start-windows.mjs`

Causal consequence:

- `node tools/run-all-tests.mjs --full` is a partial gate, not a complete proof
- green suite output can hide real regressions in excluded files
- especially bad: excluded files include determinism-guard and buffer-guard tests, so some of the strongest determinism evidence is currently outside the mandatory gate

### F4. Fog intel is missing from the LLM read-model

Severity: high

Evidence:

- `docs/ARCHITECTURE.md:23`
  architecture claims the advisor/read-model is the shared truth for HUD, text diagnosis, and status panel
- `src/project/llm/readModel.js:12`
  `buildLlmReadModel(...)` exists
- `src/project/llm/readModel.js:15`
  read-model only calls `buildAdvisorModel(...)`
- `src/game/render/fogOfWar.js:113`
  `applyFogIntelToAdvisorModel(...)` exists but is not used in `readModel.js`
- `tests/test-fog-intel-read-model.mjs:84`
  test expects `cpuIntel.mode`
- `tests/test-fog-intel-read-model.mjs:85`
  test expects `cpuAlive === null` outside visibility

Observed failure:

- `tests/test-fog-intel-read-model.mjs`
- error: `Cannot read properties of undefined (reading 'mode')`

Causal consequence:

- `render_game_to_text` and any consumer of `buildLlmReadModel` can report CPU certainty without fog redaction parity
- text diagnostics and UI diagnostics no longer share one canonical truth
- reproducibility reports derived from read-model output can be wrong even when the world state itself is deterministic

### F5. Split placement and zone paint ignore sight / committed reachability gates

Severity: high

Evidence:

- `src/game/sim/playerActions.js:318`
  `handlePlaceSplitCluster(...)`
- `src/game/sim/playerActions.js:333`
  split unlock gate exists
- `src/game/sim/playerActions.js:336`
  command-score gate exists
- `src/game/sim/playerActions.js:458`
  `handleSetZone(...)`
- `src/game/sim/playerActions.js:474`
  zone paint writes `zoneMap[idx] = zoneType`

What is missing in those handlers:

- no current visibility check
- no committed anchor / reachable infrastructure check

Expected behavior is captured in:

- `tests/test-remote-reachability-gates.mjs:87`
  split must stay blocked without current visibility
- `tests/test-remote-reachability-gates.mjs:93`
  split must stay blocked without committed anchor
- `tests/test-remote-reachability-gates.mjs:105`
  zone paint must stay blocked outside sight

Observed failure:

- `tests/test-remote-reachability-gates.mjs`
- assertion: `split cluster must stay blocked without current visibility`

Causal consequence:

- player actions can mutate off-sight or unreachable territory
- the code violates the sight/infrastructure semantics documented in UI and fog flows
- progression comparisons become untrustworthy because hidden-space actions can alter future states that should have been inaccessible

### F6. Generated audit artifact is stale

Severity: low

Evidence:

- `output\reports\function-inventory.txt:460`
  still lists deleted helper `tests/support/phaseFTestUtils.mjs | patchClusterRunRequirements`

Causal consequence:

- artifact-based reviews can report obsolete bypass helpers as still present
- cleanup status becomes ambiguous unless generated reports are regenerated or clearly version-stamped

### F7. Command adapter wiring is drifted and test coverage is misleading

Severity: medium

Evidence:

- `src/project/llm/commandAdapter.js:21`
  adapter exists
- `src/core/kernel/store.js:12`
  store reads adapter from `options.actionAdapter` or `project.adaptAction`
- `src/app/main.js:28`
  runtime passes `actionAdapter: createLlmCommandAdapter()` inside the project object, not `options`

Observed result:

- `LLM_COMMAND` is not actually wired into the runtime store via `src/app/main.js`
- current adapter test only validates the adapter in isolation

Causal consequence:

- runtime behavior and tested behavior are not the same
- future whitelisting or wrapper policy assumptions around LLM actions can silently fail to apply
- this is not a determinism breaker by itself, but it is a contract drift that weakens trust in audit surfaces

## Verified Non-Findings

These were checked and are currently not the blocker class requested:

- no operative use of `Math.random`, `Date.now`, `performance.now`, `crypto.randomUUID`, or `crypto.getRandomValues` was found inside reducer/simStep logic without the determinism guard
- `tests/test-determinism-guard-policy.mjs` passes when run directly
- `tests/test-simstep-buffer-guard.mjs` passes when run directly
- `tests/test-world-presets-determinism.mjs` passes when run directly
- no direct `APPLY_BUFFERED_SIM_STEP` dispatch remains in `tests/`
- no remaining references were found to `phaseFTestUtils`, `patchClusterRunRequirements`, or `noBypassProgression` in live test code

## Commands Run

Key verification commands:

- `node tools/run-all-tests.mjs --full`
- direct repo-wide `Select-String` scans over `src/`, `tests/`, `tools/`, `docs/`
- direct run of all 19 suite-excluded tests
- targeted proof scripts for `APPLY_BUFFERED_SIM_STEP`
- targeted proof scripts for `DEV_BALANCE_RUN_AI`

Key observed proof values:

- `APPLY_BUFFERED_SIM_STEP`: `playerDNA 0 -> 123.456`, `tick 0 -> 1`
- `DEV_BALANCE_RUN_AI`: `traitSum 251.25 -> 251.267183`, `hueSum 8610 -> 8612.377686`, `applied=8`

## Fix Order

If this repo is supposed to claim strict reproducibility, the causal order is:

1. Close or remove `APPLY_BUFFERED_SIM_STEP` as a public mutation surface.
2. Quarantine or remove `DEV_BALANCE_RUN_AI` from reproducibility-relevant runtime.
3. Register all currently omitted tests into `tools/test-suites.mjs`.
4. Fix `buildLlmReadModel(...)` so fog intel is part of the shared read-model truth.
5. Restore reachability / visibility gates for split and zone actions.
6. Regenerate stale generated reports after code cleanup.
