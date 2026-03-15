import { startEvidenceCase } from "./support/liveTestKit.mjs";
startEvidenceCase("test-determinism-guard-policy.mjs");
import { createStore } from "../src/core/kernel/store.js";
import * as manifest from "../src/project/project.manifest.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

{
  let threw = false;
  try {
    createStore(
      manifest,
      { reducer: () => [], simStep: () => [] },
      { guardDeterminism: false },
    );
  } catch (err) {
    threw = String(err?.message || "").includes("guardDeterminism cannot be disabled");
  }
  assert(threw, "createStore must reject guardDeterminism=false");
}

{
  const store = createStore(manifest, {
    reducer: (_state, action) => {
      if (action.type === "SET_SPEED") {
        crypto.randomUUID();
      }
      return [];
    },
    simStep: () => [],
  });

  let blocked = false;
  try {
    store.dispatch({ type: "SET_SPEED", payload: 1 });
  } catch (err) {
    blocked = String(err?.message || "").includes("Non-deterministic source blocked: crypto.randomUUID()");
  }
  assert(blocked, "crypto.randomUUID must be blocked by determinism guard");
}

console.log("DETERMINISM_GUARD_POLICY_OK guard is mandatory and blocks crypto entropy");
