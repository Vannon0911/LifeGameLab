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

const QUICK_REGRESSION_TEST_FILES = Object.freeze([
  "tests/test-active-order-runtime.mjs",
  "tests/test-whole-repo-dispatch-truth.mjs",
  "tests/test-mapspec-function-rejection.mjs",
  "tests/test-mapspec-cycle-rejection.mjs",
  "tests/test-signature-nonserializable.mjs",
  "tests/test-setsize-negative.mjs",
  "tests/test-persistence-cycle-boot.mjs",
  "tests/test-redteam-kernel-hardening.mjs",
]);

export const EVIDENCE_SURFACES = Object.freeze({
  dispatch: "dispatch",
  browser: "browser",
  legacyNodeTest: "legacy-node-test",
});

export const TESTING_PREFLIGHT_PATHS = Object.freeze([
  "tests",
  "tools/llm-preflight.mjs",
  "devtools/run-test-suite.mjs",
  "devtools/run-all-tests.mjs",
  "devtools/test-suites.mjs",
  "devtools/evidence-runner.mjs",
]);

export const TESTING_PREFLIGHT_PATHS_ARG = TESTING_PREFLIGHT_PATHS.join(",");

export const EVIDENCE_SUITES = Object.freeze({
  quick: freezeList(QUICK_REGRESSION_TEST_FILES),
  claims: freezeList(CLAIM_SUITES.claims),
  regression: freezeList(REGRESSION_TEST_FILES),
  full: freezeList([]),
});

export const EVIDENCE_SUITE_ALIASES = Object.freeze({
  truth: "claims",
  audit: "regression",
  stress: "regression",
});

export const TEST_BUDGETS_MS = Object.freeze({
  quick: 480_000,
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
export const QUICK_REGRESSION_REGISTRY = freezeList(QUICK_REGRESSION_TEST_FILES);
export const CLAIM_REGISTRY = CLAIM_SCENARIOS_BY_ID;
export const REGRESSION_REGISTRY = REGRESSION_TEST_STATUS;
export const VERIFICATION_STATUS = Object.freeze({
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
});

export function resolveSuiteName(name) {
  const key = String(name || "claims").toLowerCase();
  return EVIDENCE_SUITE_ALIASES[key] || key;
}

export function isKnownSuite(name) {
  return Object.prototype.hasOwnProperty.call(EVIDENCE_SUITES, resolveSuiteName(name));
}
