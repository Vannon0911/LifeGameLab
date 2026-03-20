# LLM Governance and Preflight System

## Zweck
Das Projekt erzwingt vor kritischen Aenderungen eine feste Entry-/Preflight-Kette.

## Pflichtreihenfolge
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/OPERATING_PROTOCOL.md`
4. `docs/ARCHITECTURE.md`
5. `docs/STATUS.md`

## Pflichtkette vor Writes
1. `llm-preflight classify`
2. `llm-preflight entry`
3. `llm-preflight ack`
4. `llm-preflight check`

## Harte Verbote
- Kein `--no-verify`.
- Kein Hook-/Guard-Bypass.
- Bei Scope-Drift zuerst Matrix/Mapping korrigieren, dann Kette komplett neu laufen lassen.

## Geltung
Diese Regeln sind Prozess-SoT und gelten vor allen Eingriffen in Contract-/Kernel-nahe Pfade.

Verbindliche Quellen:
- `RUNBOOK.md`
- `docs/llm/ENTRY.md`
- `docs/llm/OPERATING_PROTOCOL.md`
- `docs/llm/TASK_ENTRY_MATRIX.json`
