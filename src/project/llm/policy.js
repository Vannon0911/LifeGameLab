// Mirror of operative LLM guardrails from docs/LLM_ENTRY.md for runtime checks.
export const LLM_POLICY = Object.freeze({
  source: "docs/LLM_ENTRY.md",
  invariants: Object.freeze([
    "dispatch_patch_only",
    "ui_renderer_read_only",
    "deterministic_sim",
    "manifest_first_contracts",
  ]),
  forbiddenEntropy: Object.freeze(["Math.random", "Date.now", "system_time"]),
});
