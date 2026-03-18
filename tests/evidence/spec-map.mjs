export const EVIDENCE_SCOPE = "w1";

export const SOT_SOURCES = Object.freeze([
  "src/project/contract/manifest.js",
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
      "src/project/contract/manifest.js",
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
    id: "claim.w1.genesis_mainline_deterministic",
    status: "verified",
    budgetMs: 120_000,
    surface: "dispatch",
    replayCount: 2,
    truthAnchor: "step-4",
    sotRefs: Object.freeze([
      "src/project/contract/manifest.js",
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
      Object.freeze({ id: "set-founder-brush", kind: "dispatch", action: { type: "SET_BRUSH", payload: { brushMode: "founder_place" } } }),
      Object.freeze({ id: "place-founders", kind: "placePlayerStartWindowSquare", size: 1 }),
      Object.freeze({ id: "after-founders", kind: "captureState", snapshot: "after-founders" }),
      Object.freeze({ id: "confirm-foundation", kind: "dispatch", action: { type: "CONFIRM_FOUNDATION", payload: {} } }),
      Object.freeze({ id: "confirm-core", kind: "dispatch", action: { type: "CONFIRM_CORE_ZONE", payload: {} } }),
      Object.freeze({ id: "after-core", kind: "captureState", snapshot: "after-core" }),
      Object.freeze({ id: "step-1", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "capture-step-1", kind: "captureState", snapshot: "step-1" }),
      Object.freeze({ id: "step-2", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-3", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-4", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "capture-step-4", kind: "captureState", snapshot: "step-4" }),
    ]),
    assertions: Object.freeze([
      Object.freeze({ id: "founder-count", kind: "typedArrayCountEquals", snapshot: "after-founders", path: "world.founderMask", value: 1, expected: 1 }),
      Object.freeze({ id: "run-active", kind: "statePathEquals", snapshot: "after-core", path: "sim.runPhase", expected: "run_active" }),
      Object.freeze({ id: "running", kind: "statePathEquals", snapshot: "after-core", path: "sim.running", expected: true }),
      Object.freeze({ id: "alive-has-energy-shape", kind: "sameLength", snapshot: "step-4", leftPath: "world.alive", rightPath: "world.E" }),
      Object.freeze({ id: "step-tick", kind: "statePathGte", snapshot: "step-4", path: "sim.tick", expected: 4 }),
      Object.freeze({ id: "step-signature-moved", kind: "signatureChanged", fromSnapshot: "after-core", toSnapshot: "step-4" }),
    ]),
    requiredArtifacts: Object.freeze([
      "after-founders.state",
      "after-core.state",
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
    purpose: "prove same-seed replay and cross-seed divergence with after-core, step-1, and step-4 hash anchors",
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
  "tests/test-longrun-determinism.mjs": Object.freeze({
    status: "verified",
    budgetMs: 240_000,
    purpose: "prove deterministic stability on long-running step chains and controlled cross-seed divergence",
    counterProbe: "longrun seed perturbation diverges while same-seed longrun remains identical",
  }),
  "tests/test-persistence-drivers.mjs": Object.freeze({
    status: "verified",
    budgetMs: 120_000,
    purpose: "prove null/web/meta-only persistence drivers respect contracts and reject tampered payloads",
    counterProbe: "tampered persistence payload resets to safe defaults and cannot force invalid replay state",
  }),
  "tests/test-ui-foundation-e2e.mjs": Object.freeze({
    status: "verified",
    budgetMs: 360_000,
    purpose: "prove browser UI mainline flow enforces foundation gating and reaches run_active via visible controls",
    counterProbe: "UI foundation_not_ready step blocks confirm before valid founder placement",
  }),
});

export const REGRESSION_TEST_FILES = Object.freeze(Object.keys(REGRESSION_TEST_STATUS));
