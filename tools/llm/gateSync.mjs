import { LLM_POLICY } from "./policy.mjs";

export function assertLlmGateSync(manifest) {
  const missing = [];
  if (!manifest?.actionSchema) missing.push("actionSchema");
  if (!manifest?.mutationMatrix) missing.push("mutationMatrix");
  if (!manifest?.stateSchema) missing.push("stateSchema");
  if (missing.length) {
    throw new Error(`LLM gate sync failed: manifest missing ${missing.join(", ")}`);
  }
  return {
    policySource: LLM_POLICY.source,
    invariants: [...LLM_POLICY.invariants],
  };
}
