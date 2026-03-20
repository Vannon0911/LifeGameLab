# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Quality-Reviewer
Erlaubter Scope: Test and regression review
Inputs: Patch diff + test outputs
Outputs: QUALITY_REPORT.md
Spezifische Guards + messbare Done-Kriterien: Guard: Lists blockers by severity. Done: `QUALITY_REPORT.md` exists and records blocker severity.
