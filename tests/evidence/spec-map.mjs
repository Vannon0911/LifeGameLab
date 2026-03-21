export const EVIDENCE_SCOPE = "w1";

export const SOT_SOURCES = Object.freeze([
  "src/game/contracts/manifest.js",
  "docs/PRODUCT.md",
  "docs/ARCHITECTURE.md",
  "docs/STATUS.md",
]);

export const CLAIM_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "claim.w1.no_bypass_surface",
    status: "verified",
    budgetMs: 90_000,
    surface: "dispatch",
    replayCount: 1,
    truthAnchor: "after-invalid",
    sotRefs: Object.freeze([
      "src/game/contracts/manifest.js",
      "docs/ARCHITECTURE.md#determinismus",
    ]),
    legacyRefs: Object.freeze([]),
    counterexamplesBlocked: Object.freeze([
      "RUN_BENCHMARK",
      "SIM_STEP.force",
      "GEN_WORLD.extra payload keys",
      "SET_BRUSH.invalid brushMode",
      "SET_UI.unknown keys",
      "SET_PHYSICS.unknown keys",
      "SET_GLOBAL_LEARNING.unknown keys",
    ]),
    counterProbe: Object.freeze({
      kind: "negative_payload_block_and_signature_stability",
      intent: "verifies forbidden payload perturbations are rejected without state/signature drift",
      checks: Object.freeze([
        "blocked-game-mode.errorMatched === true",
        "blocked-force.errorMatched === true",
        "before-invalid.signature == after-invalid.signature",
      ]),
    }),
    steps: Object.freeze([
      Object.freeze({ id: "gen-world", kind: "dispatch", action: { type: "GEN_WORLD", payload: {} } }),
      Object.freeze({ id: "before-invalid", kind: "captureState", snapshot: "before-invalid" }),
      Object.freeze({ id: "blocked-game-mode", kind: "dispatchExpectError", action: { type: "GEN_WORLD", payload: { gameMode: "lab_autorun" } }, expectedMessage: "is not allowed" }),
      Object.freeze({ id: "blocked-force", kind: "dispatchExpectError", action: { type: "SIM_STEP", payload: { force: true } }, expectedMessage: "is not allowed" }),
      Object.freeze({ id: "after-invalid", kind: "captureState", snapshot: "after-invalid" }),
      Object.freeze({ id: "blocked-benchmark", kind: "dispatchExpectError", action: { type: "RUN_BENCHMARK", payload: {} }, expectedMessage: "Unknown action type: RUN_BENCHMARK" }),
    ]),
    assertions: Object.freeze([
      Object.freeze({ id: "tick-still-zero", kind: "statePathEquals", snapshot: "after-invalid", path: "sim.tick", expected: 0 }),
      Object.freeze({ id: "signature-stable", kind: "signatureStable", fromSnapshot: "before-invalid", toSnapshot: "after-invalid" }),
      Object.freeze({ id: "game-mode-key-blocked", kind: "stepResultPathEquals", step: "blocked-game-mode", path: "errorMatched", expected: true }),
      Object.freeze({ id: "force-key-blocked", kind: "stepResultPathEquals", step: "blocked-force", path: "errorMatched", expected: true }),
      Object.freeze({ id: "benchmark-blocked", kind: "stepResultPathEquals", step: "blocked-benchmark", path: "errorMatched", expected: true }),
    ]),
    requiredArtifacts: Object.freeze([
      "before-invalid.state",
      "before-invalid.read-model",
      "after-invalid.state",
      "after-invalid.read-model",
      "blocked-game-mode.error",
      "blocked-force.error",
      "blocked-benchmark.error",
    ]),
  }),
  Object.freeze({
    id: "claim.w1.rts_mainline_deterministic",
    status: "verified",
    budgetMs: 120_000,
    surface: "dispatch",
    replayCount: 2,
    truthAnchor: "after-worldgen",
    sotRefs: Object.freeze([
      "src/game/contracts/manifest.js",
      "docs/PRODUCT.md#main-run",
      "docs/STATUS.md",
    ]),
    legacyRefs: Object.freeze([]),
    counterexamplesBlocked: Object.freeze([
      "state injection",
      "patch injection",
      "direct reducer()",
      "direct simStepPatch()",
    ]),
    counterProbe: Object.freeze({
      kind: "replay_consistency_with_perturbation_guard",
      intent: "verifies deterministic replay anchor stability and blocks reducer/simStep injection vectors",
      checks: Object.freeze([
        "attempt[1].truthAnchor == attempt[2].truthAnchor",
        "counterexamplesBlocked contains direct reducer()/simStepPatch()/state injection/patch injection",
      ]),
    }),
    steps: Object.freeze([
      Object.freeze({ id: "gen-world", kind: "dispatch", action: { type: "GEN_WORLD", payload: {} } }),
      Object.freeze({ id: "capture-after-worldgen", kind: "captureState", snapshot: "after-worldgen" }),
      Object.freeze({ id: "set-run-active", kind: "dispatch", action: { type: "SET_UI", payload: { runPhase: "run_active" } } }),
      Object.freeze({ id: "toggle-running", kind: "dispatch", action: { type: "TOGGLE_RUNNING", payload: { running: true } } }),
      Object.freeze({ id: "after-bootstrap", kind: "captureState", snapshot: "after-bootstrap" }),
      Object.freeze({ id: "step-1", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "capture-step-1", kind: "captureState", snapshot: "step-1" }),
      Object.freeze({ id: "step-2", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-3", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-4", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "capture-step-4", kind: "captureState", snapshot: "step-4" }),
    ]),
    assertions: Object.freeze([
      Object.freeze({ id: "worldgen-run-active", kind: "statePathEquals", snapshot: "after-worldgen", path: "sim.runPhase", expected: "run_active" }),
      Object.freeze({ id: "worldgen-not-running", kind: "statePathEquals", snapshot: "after-worldgen", path: "sim.running", expected: false }),
      Object.freeze({ id: "run-active", kind: "statePathEquals", snapshot: "after-bootstrap", path: "sim.runPhase", expected: "run_active" }),
      Object.freeze({ id: "running", kind: "statePathEquals", snapshot: "after-bootstrap", path: "sim.running", expected: true }),
      Object.freeze({ id: "alive-has-energy-shape", kind: "sameLength", snapshot: "step-4", leftPath: "world.alive", rightPath: "world.E" }),
      Object.freeze({ id: "step-tick", kind: "statePathGte", snapshot: "step-4", path: "sim.tick", expected: 4 }),
      Object.freeze({ id: "step-signature-moved", kind: "signatureChanged", fromSnapshot: "after-bootstrap", toSnapshot: "step-4" }),
    ]),
    requiredArtifacts: Object.freeze([
      "after-worldgen.state",
      "after-worldgen.read-model",
      "after-worldgen.signature-material",
      "after-bootstrap.state",
      "step-1.state",
      "step-1.read-model",
      "step-1.signature-material",
      "step-4.state",
      "step-4.read-model",
      "step-4.signature-material",
    ]),
  }),
]);

export const CLAIM_SCENARIOS_BY_ID = Object.freeze(
  Object.fromEntries(CLAIM_SCENARIOS.map((scenario) => [scenario.id, scenario])),
);

export const CLAIM_SUITES = Object.freeze({
  claims: Object.freeze(CLAIM_SCENARIOS.map((scenario) => scenario.id)),
});

export const REGRESSION_TEST_STATUS = Object.freeze({
  "tests/test-active-order-runtime.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove extracted active-order runtime preserves abort, wait, blocked, progress, and completion branches",
    counterProbe: "active-order branch perturbations are caught without relying only on broad replay drift",
  }),
  "tests/test-contract-no-bypass.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove removed bypass surfaces stay absent and negative dispatch payloads stay state-stable",
    counterProbe: "negative dispatch payload perturbation remains blocked and state-stable",
  }),
  "tests/test-dispatch-error-state-stability.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove failing dispatches keep state, signature material, read model, and revision stable",
    counterProbe: "error-path perturbations do not mutate state/signature/revision",
  }),
  "tests/test-deterministic-genesis.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove same-seed replay and cross-seed divergence for worldgen, tick1, and tick4 replay anchors",
    counterProbe: "cross-seed perturbation must diverge while same-seed replay remains identical",
  }),
  "tests/test-readmodel-determinism.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "P1 / Artefakt-/Read-Model-Drift: prove read-model hashes stay replay-stable at after-founders, after-core, step-1, and step-4",
    counterProbe: "read-model hash perturbation check across replay attempts",
  }),
  "tests/test-kernel-replay-truth.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove seed + action replay yields stable signature chain and cross-seed divergence",
    counterProbe: "signature chain diverges under seed perturbation and matches under identical replay",
  }),
  "tests/test-sim-gate-contract.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove simGate rejects numeric coercion for boolean sim fields and keeps canonical zone array contracts without duplicate source definitions",
    counterProbe: "boolean coercion perturbation remains rejected by simGate",
  }),
  "tests/test-step-chain-determinism.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "P1 / Runtime-Test-Drift: prove per-step signature, signature-material, read-model, and revision anchors stay replay-stable",
    counterProbe: "step-sequence perturbation breaks anchors while replayed sequence stays stable",
  }),
  "tests/test-llm-contract.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove entry/testing registry, wording contract, path-drift guard, and repeated check rotation stay wired",
    counterProbe: "registry/path perturbation is detected and reported as drift",
  }),
  "tests/test-slice-a-contract-scaffold.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove Slice A contract scaffolding is complete, classified, and no-op safe before reducer wiring lands",
    counterProbe: "scaffold action dispatch must keep signature and read model stable before implementation",
  }),
  "tests/test-mapspec-gen-world.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove Slice B MapSpec compilation drives SET_MAPSPEC and GEN_WORLD deterministically while legacy preset sync stays intact",
    counterProbe: "different MapSpec inputs diverge while same-seed same-MapSpec replay stays identical",
  }),
  "tests/test-mapspec-function-rejection.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove SET_MAPSPEC rejects function-valued contract fields without state drift",
    counterProbe: "function payload perturbation is blocked before it can enter map.spec",
  }),
  "tests/test-mapspec-cycle-rejection.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove SET_MAPSPEC rejects cyclic payloads without stack overflow or state drift",
    counterProbe: "cyclic payload perturbation is rejected by strict schema validation",
  }),
  "tests/test-mapspec-dispatch-sources.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove SET_MAPSPEC has a live UI dispatch source and dataflow remains truthful",
    counterProbe: "dispatch source drift between dataflow and UI code is detected as regression",
  }),
  "tests/test-mapspec-builder-pipeline.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove builder flow mutates only map/meta on SET_MAPSPEC and rebuilds world only via GEN_WORLD",
    counterProbe: "world rebuild perturbations are blocked until GEN_WORLD is dispatched",
  }),
  "tests/test-mapspec-builder-phase.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove RUN_PHASE.MAP_BUILDER gates tile edits, forces manual tilePlan writes, and only applies builder overrides on GEN_WORLD",
    counterProbe: "SET_MAP_TILE perturbations stay blocked outside map_builder and become live only after explicit phase entry",
  }),
  "tests/test-signature-nonserializable.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove signature material generation fails closed on non-serializable and circular values",
    counterProbe: "function and cycle perturbations throw instead of collapsing to the same signature",
  }),
  "tests/test-setsize-negative.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove invalid SET_SIZE inputs are rejected without state mutation",
    counterProbe: "negative and zero dimension perturbations stay no-op under the wired gate path",
  }),
  "tests/test-persistence-cycle-boot.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove cyclic persisted payloads fail closed to a safe default state on boot",
    counterProbe: "poisoned persistence perturbation cannot crash store boot or preserve invalid map state",
  }),
  "tests/test-redteam-kernel-hardening.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove a chained red-team attack set cannot poison MapSpec, signature, SET_SIZE, or persistence and still leaves a valid recovery path",
    counterProbe: "function payload, cycle payload, invalid SET_SIZE, and poisoned persistence perturbations are blocked without preventing later valid world boot",
  }),
  "tests/test-longrun-determinism.mjs": Object.freeze({
    status: "verified",
    budgetMs: 300_000,
    purpose: "prove deterministic stability on long-running step chains and controlled cross-seed divergence",
    counterProbe: "longrun seed perturbation diverges while same-seed longrun remains identical",
  }),
  "tests/test-persistence-drivers.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove null/web/meta-only persistence drivers respect contracts and reject tampered payloads",
    counterProbe: "tampered persistence payload resets to safe defaults and cannot force invalid replay state",
  }),
  "tests/test-persistence-map-builder-reload.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove default web persistence keeps mapspec tilePlan builder edits across reload and reapplies them on GEN_WORLD",
    counterProbe: "builder tilePlan perturbation is preserved in persisted map state instead of being dropped on reload",
  }),
  "tests/test-ui-foundation-e2e.mjs": Object.freeze({
    status: "verified",
    budgetMs: 360_000,
    purpose: "prove browser UI mainline flow enforces foundation gating and reaches run_active via visible controls",
    counterProbe: "UI foundation_not_ready step blocks confirm before valid founder placement",
  }),
  "tests/test-ui-click-placement-e2e.mjs": Object.freeze({
    status: "verified",
    budgetMs: 360_000,
    purpose: "prove live canvas click input places a founder tile through the mounted UI modules",
    counterProbe: "runtime click without a valid paint/input bridge does not mutate founder state",
  }),
  "tests/test-ui-map-builder-expertmode-e2e.mjs": Object.freeze({
    status: "verified",
    budgetMs: 360_000,
    purpose: "prove mounted Map Builder controls force expertMode=true on enter and restore the prior expertMode value on exit",
    counterProbe: "expertMode drift after a builder toggle cycle is detected as regression",
  }),
  "tests/test-runtime-boundaries.mjs": Object.freeze({
    status: "verified",
    budgetMs: 90_000,
    purpose: "prove runtime code stays isolated from deleted project/core facades and dev-only llm tooling",
    counterProbe: "forbidden import boundary regression is detected before removed facades can quietly re-enter runtime",
  }),
});

export const REGRESSION_TEST_FILES = Object.freeze(Object.keys(REGRESSION_TEST_STATUS));
