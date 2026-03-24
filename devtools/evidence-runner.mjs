import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createStore } from "../src/kernel/store/createStore.js";
import { createNullDriver } from "../src/kernel/store/persistence.js";
import { stableStringify } from "../src/kernel/store/signature.js";
import { manifest as runtimeManifest } from "../src/game/manifest.js";
import { reducer, simStepPatch } from "../src/game/runtime/index.js";
import { buildLlmReadModel } from "../tools/llm/readModel.mjs";
import { getStartWindowRange, getWorldPreset } from "../src/game/sim/worldPresets.js";
import { createEvidenceAttestation, verifyEvidenceAttestation } from "./evidence-attestation.mjs";
import {
  EVIDENCE_POLICY,
  EVIDENCE_SUITES,
  CLAIM_REGISTRY,
  QUICK_REGRESSION_REGISTRY,
  REGRESSION_REGISTRY,
  TEST_BUDGETS_MS,
  TRACKED_REGRESSION_REPO_TESTS,
  VERIFICATION_STATUS,
  isKnownSuite,
  resolveSuiteName,
} from "./test-suites.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const currentTruthPath = path.join(root, "output", "current-truth.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const args = {
    suite: "claims",
    scenario: "",
    outDir: path.join(root, "output", "evidence"),
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--suite" && next) {
      args.suite = next;
      i += 1;
    } else if (arg === "--scenario" && next) {
      args.scenario = next;
      i += 1;
    } else if (arg === "--out-dir" && next) {
      args.outDir = path.resolve(root, next);
      i += 1;
    }
  }
  return args;
}

function sha256Buffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function sha256Text(text) {
  return sha256Buffer(Buffer.from(String(text), "utf8"));
}

function nowIso() {
  return new Date().toISOString();
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeSegment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function toSerializable(value) {
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (Array.isArray(value)) return value.map(toSerializable);
  if (!value || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value)) out[key] = toSerializable(value[key]);
  return out;
}

function getByPath(target, dotPath) {
  const parts = String(dotPath || "").split(".").filter(Boolean);
  let current = target;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function deepEqual(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function listRepoTests(relPath = "tests", out = []) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) return out;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    const normalized = relPath.split(path.sep).join("/");
    if (/\/test-[^/]+\.mjs$/.test(`/${normalized}`)) out.push(normalized);
    return out;
  }
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    listRepoTests(path.join(relPath, entry.name), out);
  }
  return out;
}

function assertLegacyInventory() {
  const repoTests = listRepoTests().sort();
  const tracked = [...TRACKED_REGRESSION_REPO_TESTS].sort();
  const untracked = repoTests.filter((rel) => !tracked.includes(rel));
  const missing = tracked.filter((rel) => !repoTests.includes(rel));
  if (!untracked.length && !missing.length) return;
  const details = [];
  if (untracked.length) details.push(`untracked=${untracked.join(",")}`);
  if (missing.length) details.push(`missing=${missing.join(",")}`);
  throw new Error(`Regression test inventory drift: ${details.join(" ")}`);
}

function assertScenarioRegistry() {
  for (const [id, scenario] of Object.entries(CLAIM_REGISTRY)) {
    assert(scenario.id === id, `Scenario id mismatch for ${id}`);
    assert(scenario.surface === "dispatch", `Unsupported claim surface '${scenario.surface}' in ${id}`);
    assert(Array.isArray(scenario.steps), `Scenario ${id} missing steps`);
    assert(Array.isArray(scenario.assertions), `Scenario ${id} missing assertions`);
  }
}

function resolveHeadSha() {
  const res = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  });
  if (res.error || res.status !== 0) return "unknown";
  return String(res.stdout || "").trim() || "unknown";
}

function writeCurrentTruth({ manifestPath, runId, suite, finishedAt }) {
  ensureDir(path.dirname(currentTruthPath));
  const payload = {
    updatedAt: finishedAt,
    source: "devtools/evidence-runner.mjs",
    commitSha: resolveHeadSha(),
    runId,
    suite,
    manifestPath: path.relative(root, manifestPath).split(path.sep).join("/"),
  };
  fs.writeFileSync(currentTruthPath, `${stableStringify(payload)}\n`, "utf8");
}

class EvidenceJournal {
  constructor(eventsPath) {
    this.eventsPath = eventsPath;
    this.seq = 0;
    this.prevHash = "0".repeat(64);
  }

  append({ scenarioId, stepId, kind, payload }) {
    const record = {
      seq: this.seq + 1,
      scenarioId,
      stepId: stepId || "",
      kind,
      payload: toSerializable(payload),
      timestamp: nowIso(),
      prevHash: this.prevHash,
    };
    const hash = sha256Text(stableStringify(record));
    const fullRecord = { ...record, hash };
    fs.appendFileSync(this.eventsPath, `${stableStringify(fullRecord)}\n`, "utf8");
    this.seq += 1;
    this.prevHash = hash;
    return fullRecord;
  }
}

function createLogger(runDir) {
  const stdoutPath = path.join(runDir, "stdout.log");
  const stderrPath = path.join(runDir, "stderr.log");
  fs.writeFileSync(stdoutPath, "", "utf8");
  fs.writeFileSync(stderrPath, "", "utf8");
  return {
    stdoutPath,
    stderrPath,
    out(line) {
      const text = `${String(line)}\n`;
      fs.appendFileSync(stdoutPath, text, "utf8");
      process.stdout.write(text);
    },
    err(line) {
      const text = `${String(line)}\n`;
      fs.appendFileSync(stderrPath, text, "utf8");
      process.stderr.write(text);
    },
    appendStdout(text) {
      if (text) fs.appendFileSync(stdoutPath, String(text), "utf8");
    },
    appendStderr(text) {
      if (text) fs.appendFileSync(stderrPath, String(text), "utf8");
    },
  };
}

function writeArtifact(runCtx, { scenarioId, label, ext, mimeType, data }) {
  const bytes = Buffer.isBuffer(data)
    ? data
    : Buffer.from(typeof data === "string" ? data : stableStringify(toSerializable(data)), "utf8");
  const sha256 = sha256Buffer(bytes);
  const cleanExt = ext.startsWith(".") ? ext : `.${ext}`;
  const relPath = path.posix.join("artifacts", `${sha256}${cleanExt}`);
  const absPath = path.join(runCtx.runDir, relPath);
  ensureDir(path.dirname(absPath));
  if (!fs.existsSync(absPath)) fs.writeFileSync(absPath, bytes);
  const artifact = Object.freeze({
    scenarioId,
    label,
    sha256,
    mimeType,
    bytes: bytes.byteLength,
    relPath,
  });
  runCtx.artifacts.push(artifact);
  return artifact;
}

function createRunContext(args) {
  const suite = resolveSuiteName(args.suite);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${sanitizeSegment(suite)}-${randomBytes(4).toString("hex")}`;
  const runDir = path.join(args.outDir, runId);
  ensureDir(runDir);
  ensureDir(path.join(runDir, "artifacts"));
  return {
    args,
    suite,
    runId,
    runDir,
    journal: new EvidenceJournal(path.join(runDir, "events.jsonl")),
    logger: createLogger(runDir),
    artifacts: [],
    startedAt: nowIso(),
  };
}

function createDispatchHarness() {
  const store = createStore(
    runtimeManifest,
    { reducer, simStep: simStepPatch },
    { storageDriver: createNullDriver() },
  );
  return { type: "dispatch", store, snapshots: new Map(), stepResults: new Map() };
}

function snapshotDispatchState(runCtx, scenarioId, harness, snapshotName) {
  const state = harness.store.getState();
  const signature = harness.store.getSignature();
  const signatureMaterial = harness.store.getSignatureMaterial();
  const readModel = buildLlmReadModel(state, null);
  const serialState = toSerializable(state);
  const serialReadModel = toSerializable(readModel);
  const stateArtifact = writeArtifact(runCtx, {
    scenarioId,
    label: `${snapshotName}.state`,
    ext: ".json",
    mimeType: "application/json",
    data: serialState,
  });
  const readModelArtifact = writeArtifact(runCtx, {
    scenarioId,
    label: `${snapshotName}.read-model`,
    ext: ".json",
    mimeType: "application/json",
    data: serialReadModel,
  });
  const signatureMaterialArtifact = writeArtifact(runCtx, {
    scenarioId,
    label: `${snapshotName}.signature-material`,
    ext: ".txt",
    mimeType: "text/plain",
    data: signatureMaterial,
  });
  const record = Object.freeze({
    snapshot: snapshotName,
    state: serialState,
    readModel: serialReadModel,
    signature,
    artifacts: Object.freeze({
      state: stateArtifact,
      readModel: readModelArtifact,
      signatureMaterial: signatureMaterialArtifact,
    }),
  });
  harness.snapshots.set(snapshotName, record);
  runCtx.journal.append({
    scenarioId,
    stepId: snapshotName,
    kind: "capture_state",
    payload: {
      signature,
      stateArtifact: stateArtifact.relPath,
      readModelArtifact: readModelArtifact.relPath,
      signatureMaterialArtifact: signatureMaterialArtifact.relPath,
    },
  });
  return record;
}

function getPlayerStartWindowSquareTiles(state, size = 1) {
  const preset = getWorldPreset(state.meta.worldPresetId);
  const range = getStartWindowRange(preset.startWindows.player, state.world.w, state.world.h);
  const out = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) out.push({ x: range.x0 + x, y: range.y0 + y });
  }
  return out;
}

function executeDispatchStep(runCtx, scenario, harness, step) {
  if (step.kind === "dispatch") {
    const before = harness.store.getSignature();
    harness.store.dispatch(step.action);
    const after = harness.store.getSignature();
    runCtx.journal.append({
      scenarioId: scenario.id,
      stepId: step.id,
      kind: "dispatch",
      payload: { action: step.action, beforeSignature: before, afterSignature: after },
    });
    return;
  }

  if (step.kind === "dispatchExpectError") {
    const before = harness.store.getSignature();
    let threw = false;
    let message = "";
    try {
      harness.store.dispatch(step.action);
    } catch (error) {
      threw = true;
      message = String(error?.message || error);
    }
    assert(threw, `${scenario.id}:${step.id} expected dispatch failure`);
    const errorMatched = step.expectedMessage ? message.includes(step.expectedMessage) : true;
    assert(errorMatched, `${scenario.id}:${step.id} expected error including '${step.expectedMessage}', got '${message}'`);
    const after = harness.store.getSignature();
    const payload = Object.freeze({ action: step.action, beforeSignature: before, afterSignature: after, errorMatched, message });
    harness.stepResults.set(step.id, payload);
    const artifact = writeArtifact(runCtx, {
      scenarioId: scenario.id,
      label: `${step.id}.error`,
      ext: ".json",
      mimeType: "application/json",
      data: payload,
    });
    runCtx.journal.append({
      scenarioId: scenario.id,
      stepId: step.id,
      kind: "dispatch_expected_error",
      payload: { ...payload, artifact: artifact.relPath },
    });
    return;
  }

  if (step.kind === "placePlayerStartWindowSquare") {
    const tiles = getPlayerStartWindowSquareTiles(harness.store.getState(), step.size || 1);
    for (const tile of tiles) {
      harness.store.dispatch({ type: "PLACE_WORKER", payload: { x: tile.x, y: tile.y, remove: !!step.remove } });
    }
    runCtx.journal.append({
      scenarioId: scenario.id,
      stepId: step.id,
      kind: "place_player_start_window_square",
      payload: { size: step.size || 1, remove: !!step.remove, tiles },
    });
    return;
  }

  if (step.kind === "captureState") {
    snapshotDispatchState(runCtx, scenario.id, harness, step.snapshot);
    return;
  }

  throw new Error(`Unsupported dispatch step kind '${step.kind}' in scenario ${scenario.id}`);
}

function verifyRequiredArtifacts(runCtx, scenarioId, requiredArtifacts) {
  for (const label of requiredArtifacts || []) {
    const present = runCtx.artifacts.some((artifact) => artifact.scenarioId === scenarioId && artifact.label === label);
    assert(present, `${scenarioId}: missing required artifact '${label}'`);
  }
}

function typedArrayCountEquals(target, expectedValue) {
  if (!Array.isArray(target) && !ArrayBuffer.isView(target)) return 0;
  let total = 0;
  for (let i = 0; i < target.length; i += 1) {
    if ((Number(target[i] || 0) | 0) === (Number(expectedValue) | 0)) total += 1;
  }
  return total;
}

function assertDispatchScenario(scenario, harness) {
  for (const assertion of scenario.assertions) {
    if (assertion.kind === "statePathEquals") {
      const snapshot = harness.snapshots.get(assertion.snapshot);
      const actual = getByPath(snapshot?.state, assertion.path);
      assert(deepEqual(actual, assertion.expected), `${scenario.id}:${assertion.id} expected ${assertion.path}=${stableStringify(assertion.expected)} got ${stableStringify(actual)}`);
      continue;
    }
    if (assertion.kind === "statePathGte") {
      const snapshot = harness.snapshots.get(assertion.snapshot);
      const actual = Number(getByPath(snapshot?.state, assertion.path));
      assert(actual >= Number(assertion.expected), `${scenario.id}:${assertion.id} expected ${assertion.path} >= ${assertion.expected}, got ${actual}`);
      continue;
    }
    if (assertion.kind === "stepResultPathEquals") {
      const stepResult = harness.stepResults.get(assertion.step);
      const actual = getByPath(stepResult, assertion.path);
      assert(deepEqual(actual, assertion.expected), `${scenario.id}:${assertion.id} expected ${assertion.path}=${stableStringify(assertion.expected)} got ${stableStringify(actual)}`);
      continue;
    }
    if (assertion.kind === "typedArrayCountEquals") {
      const snapshot = harness.snapshots.get(assertion.snapshot);
      const actual = typedArrayCountEquals(getByPath(snapshot?.state, assertion.path), assertion.value);
      assert(actual === Number(assertion.expected), `${scenario.id}:${assertion.id} expected count ${assertion.expected}, got ${actual}`);
      continue;
    }
    if (assertion.kind === "sameLength") {
      const snapshot = harness.snapshots.get(assertion.snapshot);
      const left = getByPath(snapshot?.state, assertion.leftPath);
      const right = getByPath(snapshot?.state, assertion.rightPath);
      assert(left?.length === right?.length, `${scenario.id}:${assertion.id} expected same length for ${assertion.leftPath} and ${assertion.rightPath}`);
      continue;
    }
    if (assertion.kind === "signatureStable" || assertion.kind === "signatureChanged") {
      const fromSnapshot = harness.snapshots.get(assertion.fromSnapshot);
      const toSnapshot = harness.snapshots.get(assertion.toSnapshot);
      const changed = fromSnapshot?.signature !== toSnapshot?.signature;
      if (assertion.kind === "signatureStable") {
        assert(!changed, `${scenario.id}:${assertion.id} expected signature stability`);
      } else {
        assert(changed, `${scenario.id}:${assertion.id} expected signature change`);
      }
      continue;
    }
    throw new Error(`Unsupported dispatch assertion '${assertion.kind}' in scenario ${scenario.id}`);
  }
}

async function runDispatchScenario(runCtx, scenario, mode) {
  const attempts = [];
  const attemptCount = Math.max(1, Number(scenario.replayCount || 1));

  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    const harness = createDispatchHarness();
    runCtx.journal.append({
      scenarioId: scenario.id,
      stepId: `attempt-${attempt}`,
      kind: "scenario_attempt_start",
      payload: { mode, attempt, surface: scenario.surface },
    });
    for (const step of scenario.steps) executeDispatchStep(runCtx, scenario, harness, step);
    assertDispatchScenario(scenario, harness);
    verifyRequiredArtifacts(runCtx, scenario.id, scenario.requiredArtifacts);
    const truthAnchor = scenario.truthAnchor ? harness.snapshots.get(scenario.truthAnchor) : null;
    const proof = truthAnchor ? {
      snapshot: scenario.truthAnchor,
      signature: truthAnchor.signature,
      readModelHash: truthAnchor.artifacts.readModel.sha256,
      stateHash: truthAnchor.artifacts.state.sha256,
    } : null;
    attempts.push({ attempt, truthAnchor: proof });
    runCtx.journal.append({
      scenarioId: scenario.id,
      stepId: `attempt-${attempt}`,
      kind: "scenario_attempt_ok",
      payload: attempts[attempts.length - 1],
    });
  }

  if (attempts.length === 2) {
    const left = attempts[0].truthAnchor;
    const right = attempts[1].truthAnchor;
    assert(left && right, `${scenario.id}: missing truth anchor for deterministic replay`);
    assert(left.signature === right.signature, `${scenario.id}: replay signature drift ${left.signature} != ${right.signature}`);
    assert(left.readModelHash === right.readModelHash, `${scenario.id}: replay read-model hash drift ${left.readModelHash} != ${right.readModelHash}`);
    assert(left.stateHash === right.stateHash, `${scenario.id}: replay state hash drift ${left.stateHash} != ${right.stateHash}`);
    runCtx.journal.append({
      scenarioId: scenario.id,
      stepId: "replay-compare",
      kind: "replay_compare_ok",
      payload: left,
    });
  }

  return Object.freeze({
    claimId: scenario.id,
    surface: scenario.surface,
    mode,
    outcome: "match",
    attempts,
    sotRefs: scenario.sotRefs,
    legacyRefs: scenario.legacyRefs,
    counterexamplesBlocked: scenario.counterexamplesBlocked || [],
  });
}

function runRegressionFile(runCtx, relPath) {
  const mapping = REGRESSION_REGISTRY[relPath];
  const abs = path.join(root, relPath);
  assert(fs.existsSync(abs), `Regression target missing: ${relPath}`);
  const budgetMs = Number(mapping?.budgetMs || 0);
  const timeoutMs = budgetMs > 0
    ? Math.max(120_000, budgetMs + 15_000)
    : 120_000;
  const startedAt = Date.now();
  runCtx.journal.append({
    scenarioId: relPath,
    stepId: "regression-start",
    kind: "regression_test_start",
    payload: { mapping },
  });
  const res = spawnSync(process.execPath, [abs], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: timeoutMs,
  });
  runCtx.logger.appendStdout(res.stdout || "");
  runCtx.logger.appendStderr(res.stderr || "");
  const stdoutArtifact = writeArtifact(runCtx, {
    scenarioId: relPath,
    label: "regression.stdout",
    ext: ".log",
    mimeType: "text/plain",
    data: res.stdout || "",
  });
  const stderrArtifact = writeArtifact(runCtx, {
    scenarioId: relPath,
    label: "regression.stderr",
    ext: ".log",
    mimeType: "text/plain",
    data: res.stderr || "",
  });
  if (res.error) throw res.error;
  const outcome = res.status === 0 ? "match" : "mismatch";
  const elapsedMs = Date.now() - startedAt;
  if (budgetMs > 0) {
    assert(elapsedMs <= budgetMs, `Regression test budget exceeded: ${relPath} elapsed=${elapsedMs}ms budget=${budgetMs}ms`);
  }
  runCtx.journal.append({
    scenarioId: relPath,
    stepId: "regression-finish",
    kind: "regression_test_finish",
    payload: {
      outcome,
      exitCode: res.status,
      elapsedMs,
      budgetMs: budgetMs || null,
      stdoutArtifact: stdoutArtifact.relPath,
      stderrArtifact: stderrArtifact.relPath,
    },
  });
  return Object.freeze({
    id: relPath,
    surface: "legacy-node-test",
    mode: "regression",
    outcome,
    exitCode: Number(res.status ?? 1),
    elapsedMs,
    budgetMs: budgetMs || null,
    mapping,
  });
}

function selectRunPlan(args) {
  const suite = resolveSuiteName(args.suite);
  if (!args.scenario) {
    if (suite === "quick") {
      return Object.freeze([
        Object.freeze({ kind: "claims", mode: "claims", ids: EVIDENCE_SUITES.claims }),
        Object.freeze({ kind: "regression", mode: "regression", files: QUICK_REGRESSION_REGISTRY }),
      ]);
    }
    if (suite === "full") {
      return Object.freeze([
        Object.freeze({ kind: "claims", mode: "claims", ids: EVIDENCE_SUITES.claims }),
        Object.freeze({ kind: "regression", mode: "regression", files: EVIDENCE_SUITES.regression }),
      ]);
    }
    if (suite === "regression") {
      return Object.freeze([Object.freeze({ kind: "regression", mode: "regression", files: EVIDENCE_SUITES.regression })]);
    }
    if (!isKnownSuite(suite)) throw new Error(`Unknown suite '${args.suite}'. Use claims, regression, or full.`);
    return Object.freeze([Object.freeze({ kind: "claims", mode: "claims", ids: EVIDENCE_SUITES.claims })]);
  }

  if (CLAIM_REGISTRY[args.scenario]) {
    return Object.freeze([Object.freeze({ kind: "claims", mode: "claims", ids: [args.scenario] })]);
  }
  if (REGRESSION_REGISTRY[args.scenario]) {
    return Object.freeze([Object.freeze({ kind: "regression", mode: "regression", files: [args.scenario] })]);
  }
  throw new Error(`Unknown scenario '${args.scenario}'.`);
}

function collectUnverifiedFromPlan(plan) {
  const unverified = [];
  for (const batch of plan) {
    if (batch.kind === "claims") {
      for (const id of batch.ids) {
        const scenario = CLAIM_REGISTRY[id];
        const status = String(scenario?.status || VERIFICATION_STATUS.UNVERIFIED).toLowerCase();
        if (status !== VERIFICATION_STATUS.VERIFIED) {
          unverified.push({ kind: "claim", id, status });
        }
      }
      continue;
    }
    if (batch.kind === "regression") {
      for (const file of batch.files) {
        const mapping = REGRESSION_REGISTRY[file];
        const status = String(mapping?.status || VERIFICATION_STATUS.UNVERIFIED).toLowerCase();
        if (status !== VERIFICATION_STATUS.VERIFIED) {
          unverified.push({ kind: "regression", id: file, status });
        }
      }
    }
  }
  return unverified;
}

function assertVerificationMetadataForPlan(plan) {
  const missingCounterProbes = [];
  for (const batch of plan) {
    if (batch.kind === "claims") {
      for (const id of batch.ids) {
        const scenario = CLAIM_REGISTRY[id];
        const status = String(scenario?.status || VERIFICATION_STATUS.UNVERIFIED).toLowerCase();
        if (status === VERIFICATION_STATUS.VERIFIED && (!scenario?.counterProbe || typeof scenario.counterProbe !== "object")) {
          missingCounterProbes.push(`claim:${id}`);
        }
      }
      continue;
    }
    if (batch.kind === "regression") {
      for (const file of batch.files) {
        const mapping = REGRESSION_REGISTRY[file];
        const status = String(mapping?.status || VERIFICATION_STATUS.UNVERIFIED).toLowerCase();
        if (status === VERIFICATION_STATUS.VERIFIED && !String(mapping?.counterProbe || "").trim()) {
          missingCounterProbes.push(`regression:${file}`);
        }
      }
    }
  }
  if (missingCounterProbes.length) {
    throw new Error(`Verification metadata invalid: verified entries require counterProbe metadata: ${missingCounterProbes.join(", ")}`);
  }
}

async function runPlan(runCtx, plan) {
  const claimResults = [];
  const regressionResults = [];

  for (const batch of plan) {
    if (batch.kind === "claims") {
      for (const id of batch.ids) {
        const scenario = CLAIM_REGISTRY[id];
        assert(scenario, `Missing claim '${id}'`);
        const status = String(scenario.status || VERIFICATION_STATUS.UNVERIFIED).toLowerCase();
        runCtx.logger.out(`[evidence] claim=${scenario.id} registryStatus=${status.toUpperCase()} mode=${batch.mode} surface=${scenario.surface}`);
        const startedAt = Date.now();
        const result = await runDispatchScenario(runCtx, scenario, batch.mode);
        const elapsedMs = Date.now() - startedAt;
        const budgetMs = Number(scenario?.budgetMs || 0);
        if (budgetMs > 0) {
          assert(elapsedMs <= budgetMs, `Claim budget exceeded: ${scenario.id} elapsed=${elapsedMs}ms budget=${budgetMs}ms`);
        }
        claimResults.push(Object.freeze({ ...result, elapsedMs, budgetMs: budgetMs || null }));
      }
      continue;
    }
    if (batch.kind === "regression") {
      for (const file of batch.files) {
        const status = String(REGRESSION_REGISTRY[file]?.status || VERIFICATION_STATUS.UNVERIFIED).toLowerCase();
        runCtx.logger.out(`[evidence] regression=${file} registryStatus=${status.toUpperCase()}`);
        regressionResults.push(runRegressionFile(runCtx, file));
      }
    }
  }

  return { claimResults, regressionResults };
}

function summarizeResults(results) {
  const match = results.filter((entry) => entry.outcome === "match").length;
  const mismatch = results.filter((entry) => entry.outcome !== "match").length;
  return Object.freeze({
    outcome: results.length === 0 ? "not_run" : (mismatch === 0 ? "match" : "mismatch"),
    total: results.length,
    match,
    mismatch,
  });
}

function collectCounterexamplesBlocked(results) {
  const items = new Set();
  for (const result of results) {
    for (const counterexample of result.counterexamplesBlocked || []) items.add(counterexample);
  }
  return Object.freeze([...items].sort());
}

async function main() {
  const args = parseArgs(process.argv);
  const runCtx = createRunContext(args);
  assertScenarioRegistry();
  assertLegacyInventory();

  const suite = resolveSuiteName(args.suite);
  const plan = selectRunPlan(args);
  assertVerificationMetadataForPlan(plan);
  const unverified = collectUnverifiedFromPlan(plan);
  if (unverified.length) {
    const details = unverified.map((entry) => `${entry.kind}:${entry.id}`).join(", ");
    throw new Error(`Verification gate blocked: unverified tests are invalid for execution: ${details}`);
  }
  const startedMs = Date.now();
  let claimResults = [];
  let regressionResults = [];
  let exitCode = 0;
  let failure = null;

  runCtx.journal.append({
    scenarioId: "_run",
    stepId: "start",
    kind: "run_start",
    payload: {
      runId: runCtx.runId,
      scope: EVIDENCE_POLICY.scope,
      suite,
      requestedScenario: args.scenario || null,
      trustedSources: EVIDENCE_POLICY.trustedSources,
      forbiddenPaths: EVIDENCE_POLICY.forbiddenPaths,
      plan,
    },
  });

  try {
    ({ claimResults, regressionResults } = await runPlan(runCtx, plan));
    const claimFailures = claimResults.filter((entry) => entry.outcome !== "match");
    const regressionFailures = regressionResults.filter((entry) => entry.outcome !== "match");
    exitCode = claimFailures.length || regressionFailures.length ? 1 : 0;
  } catch (error) {
    exitCode = 1;
    failure = { message: String(error?.message || error), stack: String(error?.stack || "") };
    runCtx.logger.err(`[evidence] failure=${failure.message}`);
    runCtx.journal.append({
      scenarioId: "_run",
      stepId: "failure",
      kind: "run_failure",
      payload: failure,
    });
  }

  const finishedAt = nowIso();
  const elapsedMs = Date.now() - startedMs;
  const stdoutHash = sha256Buffer(fs.readFileSync(runCtx.logger.stdoutPath));
  const stderrHash = sha256Buffer(fs.readFileSync(runCtx.logger.stderrPath));
  const claimStatus = summarizeResults(claimResults);
  const regressionStatus = summarizeResults(regressionResults);
  const counterexamplesBlocked = collectCounterexamplesBlocked(claimResults);
  const overallOutcome = exitCode === 0 ? "evidence_match" : "evidence_mismatch";
  const verificationPolicy = {
    rule: "only_verified_tests_are_valid",
    blockedIfUnverified: true,
    unverifiedCount: unverified.length,
    budgetPolicy: "hard_fail_on_budget_exceeded",
    attestationPolicy: "ed25519_manifest_attestation_required_on_match",
  };
  const manifestPayload = {
    runId: runCtx.runId,
    scope: EVIDENCE_POLICY.scope,
    suite,
    requestedScenario: args.scenario || null,
    startedAt: runCtx.startedAt,
    finishedAt,
    elapsedMs,
    outcome: overallOutcome,
    claimStatus,
    regressionStatus,
    claims: claimResults,
    regressionResults,
    counterexamplesBlocked,
    trustedSources: EVIDENCE_POLICY.trustedSources,
    forbiddenPaths: EVIDENCE_POLICY.forbiddenPaths,
    failure,
    stdout: { relPath: "stdout.log", sha256: stdoutHash },
    stderr: { relPath: "stderr.log", sha256: stderrHash },
    artifacts: runCtx.artifacts,
    eventChainRootHash: runCtx.journal.prevHash,
    budgets: TEST_BUDGETS_MS,
    verificationPolicy,
  };
  if (overallOutcome === "evidence_match") {
    manifestPayload.attestation = {
      relPath: "attestation.json",
      status: "verified",
    };
  }
  const manifestPath = path.join(runCtx.runDir, "manifest.json");
  fs.writeFileSync(manifestPath, `${stableStringify(toSerializable(manifestPayload))}\n`, "utf8");
  if (overallOutcome === "evidence_match") {
    const attestation = createEvidenceAttestation({
      manifestPath,
      commitSha: resolveHeadSha(),
      runId: runCtx.runId,
      suite,
      outcome: overallOutcome,
      verificationPolicy,
    });
    const attestationPath = path.join(runCtx.runDir, "attestation.json");
    fs.writeFileSync(attestationPath, `${stableStringify(attestation)}\n`, "utf8");
    verifyEvidenceAttestation({ attestation, manifestPath });
    writeCurrentTruth({
      manifestPath,
      runId: runCtx.runId,
      suite,
      finishedAt,
    });
  }

  runCtx.journal.append({
    scenarioId: "_run",
    stepId: "finish",
    kind: "run_finish",
    payload: { outcome: overallOutcome, claimStatus, regressionStatus, manifest: "manifest.json" },
  });

  runCtx.logger.out(`[evidence] run=${runCtx.runId} suite=${suite} outcome=${overallOutcome} claims=${claimStatus.outcome} regression=${regressionStatus.outcome} manifest=${manifestPath}`);
  process.exit(exitCode);
}

main().catch((error) => {
  console.error(`EVIDENCE_RUNNER_FAIL ${String(error?.stack || error)}`);
  process.exit(1);
});
