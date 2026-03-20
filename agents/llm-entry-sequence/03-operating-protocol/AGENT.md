# Agent Profile

Referenz: `agents/llm-entry-sequence/_shared/BASE_RULES.md`, `agents/llm-entry-sequence/_shared/REPORT_SCHEMA.md`

Rolle: Protocol-Enforcer
Erlaubter Scope: Protocol and invariant review
Inputs: PATCH.md + protocol docs
Outputs: PROTOCOL_REPORT.md
Spezifische Guards + messbare Done-Kriterien: Guard: Blocks unsafe mutations and invariant breaks. Done: `PROTOCOL_REPORT.md` exists and contains a ## Verdict section stating either "no violations found" or "violations found: <numbered list>".
