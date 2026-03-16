# Determinism / Repro Bugfix Plan

Date: 2026-03-16
Repo: `C:\Users\Vannon\Downloads\LifeGameLab`
Source report: `docs/audits/2026-03-16-determinism-repro-audit.md`
Status: prioritized execution plan

## Goal

Repair the codebase so that reproducibility claims are actually provable:

- same seed + same declared action stream => same state evolution
- no live mutation path can alter `/world/` or `/sim/` outside the declared game loop
- "full" test means full coverage of repo tests, not a curated subset
- read-model output, fog rules, and player action gates all describe the same truth

## Non-Negotiable Rules

1. No state-forcing, truth-setting, injected patches, or hidden mutation helpers.
2. No "green" claim until the mandatory test gate really includes all repo tests.
3. No dev-only mutation system in the reproducibility proof path.
4. If a blocker reveals an architectural conflict, stop, document the conflict, and resolve the cause instead of reopening a mutation shortcut.

## Priority Order

The order below is causal, not cosmetic.

### P0. Make the test gate honest first

Why first:

- The current `--full` gate is false evidence.
- If this stays broken, later fixes can still hide behind partial green output.

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\tools\test-suites.mjs`
- new suite-completeness guard test or equivalent tooling check
- repo scan of `tests/*.mjs`

Required work:

1. Register every real test file in the mandatory suite set.
2. Add a suite-completeness guard so future `tests/*.mjs` additions fail the gate if not registered.
3. Keep explicit exclusions only if they are proven non-test utilities and are documented in code.
4. Re-run the previously omitted tests as part of the normal loop, not as a side audit.

Acceptance:

- `node tools/run-all-tests.mjs --full` covers all real repo tests.
- Missing registration of a new test file fails the gate immediately.
- Current known failing tests stay visible inside the mandatory run:
  - `tests/test-fog-intel-read-model.mjs`
  - `tests/test-remote-reachability-gates.mjs`

Stop condition:

- If some files in `tests/` are helpers and not executable tests, create a narrow explicit allowlist and document why each file is excluded.

### P1. Remove the open buffered-step mutation surface

Why second:

- `APPLY_BUFFERED_SIM_STEP` is the strongest direct trust break.
- It allows arbitrary broad state mutation under a legitimate action name.

Primary decision:

- Treat `APPLY_BUFFERED_SIM_STEP` as an artifact candidate under `code-stability-guard`.
- Short-term priority is correctness, not optimization.

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\src\project\contract\actionSchema.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\project\contract\mutationMatrix.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\game\sim\reducer\index.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\core\runtime\simStepBuffer.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\app\main.js`
- buffered-step related tests

Required work:

1. Disarm the public action path first.
2. Remove the action from the public action contract, or make it impossible for external dispatch to submit arbitrary patch payloads.
3. Remove the runtime callsite that dispatches buffered patches directly.
4. Run with direct `SIM_STEP` only until a compliant optimization exists.
5. Only after correctness is restored, decide whether to:
   - keep the buffer disabled, or
   - redesign buffering as a non-public optimization with strict base-state proof and no arbitrary patch ingestion
6. Review raw runtime exposure of `window.__lifeGameStore` and reduce it to read-only diagnostics or explicit debug-only exposure if it still exposes prohibited mutation paths.

Acceptance:

- No externally dispatchable action can write arbitrary `/world/` or `/sim/` patches.
- The audit proof dispatch can no longer alter `playerDNA` or `tick`.
- Buffered-step tests pass without reopening a public patch-apply channel.

Stop condition:

- If removing the buffer causes perf regression or loop instability, keep correctness and determinism, leave optimization disabled, and solve performance separately. Do not reopen the patch action.

### P2. Remove the live dev mutation system from runtime truth

Why third:

- `DEV_BALANCE_RUN_AI` is a second live mutation channel that can alter world state outside declared progression.
- As long as it exists in the runtime path, reproducibility claims remain ambiguous.

Primary decision:

- Audit as artifact candidate.
- Default target is removal from live runtime.

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\src\project\contract\actionSchema.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\project\contract\mutationMatrix.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\game\sim\reducer\index.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\game\sim\reducer\cpuActions.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\app\main.js`

Required work:

1. Remove the runtime dispatch path.
2. Remove the global control surface `window.__devBalance`.
3. Remove the action schema and mutation contract entry from live runtime.
4. Remove or migrate the reducer-side mutation logic.
5. If the balancing logic is still useful, move it into an offline analysis tool that operates on snapshots and cannot mutate the live app state.

Acceptance:

- No live runtime path can mutate trait or hue through dev balancing.
- The audit proof action no longer changes live world state.
- The app runs and tests pass without depending on the dev mutation system.

Stop condition:

- If removing this reveals that normal gameplay relies on it for survival or diversity, stop and fix the real sim balance. Do not reintroduce the dev mutator as a hidden crutch.

### P3. Fix the real logic bugs that the honest gate exposes

Why after P0-P2:

- These are real gameplay/read-model bugs, but the proof path must be cleaned first.
- Otherwise the suite can still be green for the wrong reason.

#### P3a. Fog intel must be wired into the read-model

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\src\project\llm\readModel.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\game\render\fogOfWar.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\tests\test-fog-intel-read-model.mjs`

Required work:

1. Make `buildLlmReadModel(...)` compose through the same fog intel redaction path used for advisor truth.
2. Ensure hidden CPU information is redacted outside visibility and precise only when visible.
3. Keep one shared truth path. Do not duplicate redaction rules in multiple places.

Acceptance:

- `tests/test-fog-intel-read-model.mjs` passes.
- Read-model text output and UI fog diagnostics describe the same visible/hidden CPU truth.

Stop condition:

- If read-model and UI depend on different semantic sources, extract a shared helper and rewire both sides to it before continuing.

#### P3b. Split placement and zone paint must obey sight and committed reach

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\src\game\sim\playerActions.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\tests\test-remote-reachability-gates.mjs`
- related visibility / action-gate tests

Required work:

1. Add current-visibility checks to `PLACE_SPLIT_CLUSTER` and `SET_ZONE`.
2. Add committed-anchor or reachable-infrastructure gating where the test expects it.
3. Make the gating logic derive from actual world state, not from injected flags.
4. Re-run related player action and visibility suites after the fix.

Acceptance:

- `tests/test-remote-reachability-gates.mjs` passes.
- Off-sight or unreachable actions produce zero patches.
- Valid visible reachable actions still produce patches.

Stop condition:

- If the reachability model is ambiguous, stop and resolve the canonical rule in one helper instead of adding local ad-hoc checks per action.

### P4. Fix runtime/test drift so tested behavior matches shipped behavior

Why here:

- This is not the primary trust break, but it corrupts the meaning of some green tests.

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\src\app\main.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\core\kernel\store.js`
- `C:\Users\Vannon\Downloads\LifeGameLab\src\project\llm\commandAdapter.js`
- adapter/runtime integration tests

Required work:

1. Fix the `createStore(...)` wiring so the runtime uses the same adapter path that tests claim to validate.
2. Add one integration-level test through the real store/runtime wiring.
3. Remove misleading isolated confidence if the runtime path stays different for a documented reason.

Acceptance:

- Tested adapter path and shipped adapter path are the same.
- Integration test fails if runtime wiring drifts again.

Stop condition:

- If the runtime intentionally must not use the adapter, delete or rewrite the misleading test and document the actual architecture. Do not keep a false-positive test.

### P5. Regenerate stale artifacts and close the audit loop

Why last:

- Generated evidence is only useful after code truth is repaired.

Scope:

- `C:\Users\Vannon\Downloads\LifeGameLab\output\reports\function-inventory.txt`
- any generated audit inventories or trace artifacts
- audit report update

Required work:

1. Regenerate stale generated inventories.
2. Remove references to deleted helpers from generated outputs.
3. Update the audit report from "findings open" to "fixed / residual risk" with evidence.

Acceptance:

- Generated reports no longer list deleted helper paths.
- The audit report contains final proof status per finding.

## Verification Matrix

These checks are mandatory before claiming the system is fixed.

### Static checks

1. No live action contract entry remains for the removed mutation channels.
2. No live runtime dispatch path remains for those channels.
3. No global runtime helper remains that can reactivate the removed mutation systems.
4. The mandatory suite definition accounts for all real tests in `tests/`.

### Dynamic proof checks

1. Re-run the original `APPLY_BUFFERED_SIM_STEP` proof attempt and confirm it cannot mutate state anymore.
2. Re-run the original `DEV_BALANCE_RUN_AI` proof attempt and confirm it cannot mutate live world state anymore.
3. Run determinism suites with fixed seeds and compare repeated outputs.

### Full gate checks

1. `node tools/run-all-tests.mjs --full`
2. direct run of determinism tests if they are not already individually asserted in suite logs
3. repeat the full run at least twice when investigating drift-sensitive behavior

## Execution Notes

- Do not mix optimization work with truth repair.
- Do not "fix" failing tests by weakening assertions.
- Do not add new escape hatches while removing old ones.
- If a phase exposes a deeper design conflict, stop at that phase and write the blocker down with files, reason, and options.

## Artifact Candidate Decisions

These are the expected decisions unless new evidence contradicts them.

1. `APPLY_BUFFERED_SIM_STEP`
   - Type: `action`
   - Expected decision: `migrate`, with immediate `disarm`
   - Reason: current purpose is optimization, but current shape is a public arbitrary patch channel

2. `DEV_BALANCE_RUN_AI`
   - Type: `action/system`
   - Expected decision: `remove` from live runtime, optional `migrate` to offline tooling
   - Reason: current purpose is dev balancing, not shipped deterministic gameplay

## Definition of Done

The bugfix plan is complete only when all of the following are true:

1. The test gate is honest.
2. The two live mutation surfaces are gone from the reproducibility path.
3. The two currently excluded failing tests pass inside the mandatory suite.
4. Runtime wiring matches what tests claim to validate.
5. Generated evidence is current.
6. A repeated deterministic run produces the same proof outcome without any hidden mutation hooks.
