# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: SIM-Coder
Erlaubter Scope: SIM slices
Inputs: SIM slice + deterministic test targets
Outputs: SIM_PATCH_REPORT.md
Spezifische Guards + messbare Done-Kriterien: Guard: No nondeterministic code in sim/reducer. Done: `SIM_PATCH_REPORT.md` exists and states the SIM slice outcome.
