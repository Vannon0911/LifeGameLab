import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createDeterministicStore, snapshotStore } from "../tests/support/liveTestKit.mjs";

const SELF_PATH = fileURLToPath(import.meta.url);

function readFlag(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) return fallback;
  return process.argv[index + 1];
}

function runScenario(seed, ticks) {
  const store = createDeterministicStore({ seed });
  store.dispatch({ type: "GEN_WORLD", payload: {} });
  const afterWorldGen = snapshotStore(store);

  store.dispatch({ type: "SET_UI", payload: { runPhase: "run_active" } });
  store.dispatch({ type: "TOGGLE_RUNNING", payload: { running: true } });
  for (let i = 0; i < ticks; i += 1) {
    store.dispatch({ type: "SIM_STEP", payload: {} });
  }

  const afterTicks = snapshotStore(store);
  return Object.freeze({
    seed,
    ticks,
    metaSeed: String(afterWorldGen.state?.meta?.seed ?? ""),
    worldgen: {
      signature: afterWorldGen.signature,
      signatureMaterialHash: afterWorldGen.signatureMaterialHash,
      readModelHash: afterWorldGen.readModelHash,
    },
    tickN: {
      signature: afterTicks.signature,
      signatureMaterialHash: afterTicks.signatureMaterialHash,
      readModelHash: afterTicks.readModelHash,
    },
  });
}

function runWorker(seed, ticks) {
  const result = runScenario(seed, ticks);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function runWorkerProcess(seed, ticks) {
  const result = spawnSync(
    process.execPath,
    [SELF_PATH, "--worker-seed", String(seed), "--ticks", String(ticks)],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    const stderr = String(result.stderr || "").trim();
    const stdout = String(result.stdout || "").trim();
    throw new Error(`worker failed for seed=${seed}: ${stderr || stdout || "unknown error"}`);
  }
  const raw = String(result.stdout || "").trim();
  const line = raw.split(/\r?\n/).filter(Boolean).at(-1);
  if (!line) throw new Error(`worker returned empty output for seed=${seed}`);
  return JSON.parse(line);
}

function runMatrix(seeds, ticks) {
  const pairs = [];
  for (const seed of seeds) {
    const runA = runWorkerProcess(seed, ticks);
    const runB = runWorkerProcess(seed, ticks);
    pairs.push({ seed, runA, runB });
  }

  const drifts = [];
  for (const pair of pairs) {
    const sameMetaSeed = pair.runA.metaSeed === pair.runB.metaSeed && pair.runA.metaSeed === pair.seed;
    const sameWorldgen = pair.runA.worldgen.signatureMaterialHash === pair.runB.worldgen.signatureMaterialHash;
    const sameTickN = pair.runA.tickN.signatureMaterialHash === pair.runB.tickN.signatureMaterialHash;
    if (!sameMetaSeed || !sameWorldgen || !sameTickN) {
      drifts.push({
        seed: pair.seed,
        sameMetaSeed,
        sameWorldgen,
        sameTickN,
      });
    }
  }

  const worldgenSet = new Set(pairs.map((pair) => pair.runA.worldgen.signatureMaterialHash));
  const tickNSet = new Set(pairs.map((pair) => pair.runA.tickN.signatureMaterialHash));

  const summary = Object.freeze({
    ticks,
    seedCount: seeds.length,
    driftCount: drifts.length,
    allStable: drifts.length === 0,
    uniqueWorldgenHashes: worldgenSet.size,
    uniqueTickHashes: tickNSet.size,
    drifts,
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exit(summary.allStable ? 0 : 1);
}

const workerSeed = readFlag("--worker-seed");
const ticks = Math.max(1, Number.parseInt(readFlag("--ticks", "100"), 10) || 100);

if (workerSeed) {
  runWorker(workerSeed, ticks);
} else {
  const seedFlag = readFlag("--seeds", "");
  const seeds = seedFlag
    ? seedFlag.split(",").map((part) => part.trim()).filter(Boolean)
    : ["mx-2026-001", "mx-2026-002", "mx-2026-003", "mx-2026-004", "mx-2026-005", "mx-2026-006", "mx-2026-007", "mx-2026-008"];
  runMatrix(seeds, ticks);
}
