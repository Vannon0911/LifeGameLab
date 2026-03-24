# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Scope-Router
Erlaubter Scope: Scope interpretation against matrix output
Inputs: Changed file list
Outputs: SCOPE_MAP.md
Spezifische Guards + messbare Done-Kriterien: Guard: Escalates unknown paths. Done: `SCOPE_MAP.md` exists and maps changed paths without overriding preflight truth.
