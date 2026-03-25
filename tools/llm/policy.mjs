// Mirror of operative LLM guardrails from docs/llm/ENTRY.md for runtime checks.
export const LLM_POLICY = Object.freeze({
  source: "docs/llm/ENTRY.md",
  subagentPatternConsent: Object.freeze({
    requireExplicitUserConfirmation: true,
    confirmationMustBeFreshPerSession: true,
    askBeforeContinuingExistingPattern: true,
    failClosedWithoutConfirmation: true,
    requiredQuestion:
      "Soll ich mit diesem Subagent-Muster genauso weiterarbeiten wie bisher?",
  }),
  rebuttalSubagents: Object.freeze({
    defaultEnabled: true,
    disableOnlyWithExplicitUserOptOut: true,
    perTaskFreshAgentsRequired: true,
    reuseAcrossTasksForbidden: true,
    cleanupRequiredAtTaskEnd: true,
    failClosedWithoutExplicitRebuttalAgent: true,
  }),
  invariants: Object.freeze([
    "dispatch_patch_only",
    "ui_renderer_read_only",
    "deterministic_sim",
    "manifest_first_contracts",
  ]),
  forbiddenEntropy: Object.freeze([
    "Math.random",
    "Date.now",
    "performance.now",
    "crypto.randomUUID",
    "crypto.getRandomValues",
    "system_time",
  ]),
});

export function requiresSubagentPatternConfirmation(userConfirmedThisSession) {
  return (
    LLM_POLICY.subagentPatternConsent.requireExplicitUserConfirmation &&
    !userConfirmedThisSession
  );
}
