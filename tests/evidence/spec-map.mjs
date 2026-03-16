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
    surface: "dispatch",
    replayCount: 1,
    truthAnchor: "after-forced-step",
    sotRefs: Object.freeze([
      "src/project/contract/manifest.js",
      "docs/ARCHITECTURE.md#determinismus",
    ]),
    legacyRefs: Object.freeze([]),
    counterexamplesBlocked: Object.freeze([
      "RUN_BENCHMARK",
      "SIM_STEP.force",
      "GEN_WORLD.extra payload keys",
    ]),
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
    surface: "dispatch",
    replayCount: 2,
    truthAnchor: "after-steps",
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
    steps: Object.freeze([
      Object.freeze({ id: "gen-world", kind: "dispatch", action: { type: "GEN_WORLD", payload: {} } }),
      Object.freeze({ id: "set-founder-brush", kind: "dispatch", action: { type: "SET_BRUSH", payload: { brushMode: "founder_place" } } }),
      Object.freeze({ id: "place-founders", kind: "placePlayerStartWindowSquare", size: 2 }),
      Object.freeze({ id: "after-founders", kind: "captureState", snapshot: "after-founders" }),
      Object.freeze({ id: "confirm-foundation", kind: "dispatch", action: { type: "CONFIRM_FOUNDATION", payload: {} } }),
      Object.freeze({ id: "confirm-core", kind: "dispatch", action: { type: "CONFIRM_CORE_ZONE", payload: {} } }),
      Object.freeze({ id: "after-core", kind: "captureState", snapshot: "after-core" }),
      Object.freeze({ id: "step-1", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-2", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-3", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "step-4", kind: "dispatch", action: { type: "SIM_STEP", payload: {} } }),
      Object.freeze({ id: "after-steps", kind: "captureState", snapshot: "after-steps" }),
    ]),
    assertions: Object.freeze([
      Object.freeze({ id: "founder-count", kind: "typedArrayCountEquals", snapshot: "after-founders", path: "world.founderMask", value: 1, expected: 4 }),
      Object.freeze({ id: "run-active", kind: "statePathEquals", snapshot: "after-core", path: "sim.runPhase", expected: "run_active" }),
      Object.freeze({ id: "running", kind: "statePathEquals", snapshot: "after-core", path: "sim.running", expected: true }),
      Object.freeze({ id: "alive-has-energy-shape", kind: "sameLength", snapshot: "after-steps", leftPath: "world.alive", rightPath: "world.E" }),
      Object.freeze({ id: "step-tick", kind: "statePathGte", snapshot: "after-steps", path: "sim.tick", expected: 4 }),
      Object.freeze({ id: "step-signature-moved", kind: "signatureChanged", fromSnapshot: "after-core", toSnapshot: "after-steps" }),
    ]),
    requiredArtifacts: Object.freeze([
      "after-founders.state",
      "after-core.state",
      "after-steps.state",
      "after-steps.read-model",
      "after-steps.signature-material",
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
    status: "active",
    purpose: "prove removed bypass surfaces stay absent and blocked",
  }),
  "tests/test-deterministic-genesis.mjs": Object.freeze({
    status: "active",
    purpose: "prove deterministic genesis-to-mainline replay",
  }),
  "tests/test-llm-contract.mjs": Object.freeze({
    status: "active",
    purpose: "prove entry/testing registry and gate references stay wired",
  }),
});

export const REGRESSION_TEST_FILES = Object.freeze(Object.keys(REGRESSION_TEST_STATUS));
