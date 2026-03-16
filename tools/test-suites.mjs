import {
  CLAIM_SCENARIOS,
  CLAIM_SCENARIOS_BY_ID,
  CLAIM_SUITES,
  EVIDENCE_SCOPE,
  REGRESSION_TEST_FILES,
  REGRESSION_TEST_STATUS,
  SOT_SOURCES,
} from "../tests/evidence/spec-map.mjs";

function freezeList(list) {
  return Object.freeze([...list]);
}

export const EVIDENCE_SURFACES = Object.freeze({
  dispatch: "dispatch",
  browser: "browser",
  legacyNodeTest: "legacy-node-test",
});

export const TESTING_PREFLIGHT_PATHS = Object.freeze([
  "tests",
  "tools/llm-preflight.mjs",
  "tools/run-test-suite.mjs",
  "tools/run-all-tests.mjs",
  "tools/test-suites.mjs",
  "tools/evidence-runner.mjs",
]);

export const TESTING_PREFLIGHT_PATHS_ARG = TESTING_PREFLIGHT_PATHS.join(",");

export const EVIDENCE_SUITES = Object.freeze({
  claims: freezeList(CLAIM_SUITES.claims),
  regression: freezeList(REGRESSION_TEST_FILES),
  full: freezeList([]),
});

export const EVIDENCE_SUITE_ALIASES = Object.freeze({
  quick: "claims",
  truth: "claims",
  audit: "regression",
  stress: "regression",
});

export const TEST_BUDGETS_MS = Object.freeze({
  claims: 240_000,
  regression: 1_200_000,
  full: 1_500_000,
});

export const EVIDENCE_POLICY = Object.freeze({
  scope: EVIDENCE_SCOPE,
  trustedSources: freezeList(SOT_SOURCES),
  forbiddenPaths: freezeList([
    "LAB_AUTORUN",
    "APPLY_BUFFERED_SIM_STEP",
    "DEV_BALANCE_RUN_AI",
    "direct reducer()",
    "direct simStepPatch()",
    "direct applyWinConditions()",
    "state injection",
    "patch injection",
    "tamper injection",
  ]),
  officialSuites: freezeList(["claims", "full"]),
  regressionSuites: freezeList(["regression", "full"]),
});

export const TRACKED_REGRESSION_REPO_TESTS = freezeList(Object.keys(REGRESSION_TEST_STATUS));
export const TRACKED_CLAIMS = freezeList(CLAIM_SCENARIOS.map((scenario) => scenario.id));
export const CLAIM_REGISTRY = CLAIM_SCENARIOS_BY_ID;
export const REGRESSION_REGISTRY = REGRESSION_TEST_STATUS;

export function resolveSuiteName(name) {
  const key = String(name || "claims").toLowerCase();
  return EVIDENCE_SUITE_ALIASES[key] || key;
}

export function isKnownSuite(name) {
  return Object.prototype.hasOwnProperty.call(EVIDENCE_SUITES, resolveSuiteName(name));
}
