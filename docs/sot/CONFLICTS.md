# SoT Conflict Register

## Zweck
Zentrale Konfliktliste fuer SoT/Doku/Code-Drifts.
Diese Datei ist das einzige Pflicht-Backlog fuer Governance-Konflikte.

## Statuswerte
- `open`: Konflikt bestaetigt, noch nicht entschieden
- `decided`: Zielbild entschieden, Umsetzung offen
- `fixed`: umgesetzt und verifiziert

## Prioritaet
- `P0`: blockiert sichere Arbeit
- `P1`: hohes Drift-Risiko
- `P2`: mittleres Drift-Risiko
- `P3`: kosmetisch/Begriffe

## Eintraege
| id | status | prio | thema | quelle(n) | ziel |
|---|---|---|---|---|---|
| C-001 | open | P0 | Veralteter Contract-Pfad in Governance-Dokus | `RUNBOOK.md`, `docs/wiki/*`, `docs/WIKI_EXPORT.md` | Alle Referenzen auf `src/game/contracts/manifest.js` vereinheitlichen |
| C-002 | open | P1 | `docs/sot/99_FUNCTION_MATRIX.md` driftet gegen Code | `docs/sot/99_FUNCTION_MATRIX.md`, `src/game/contracts/*`, `src/kernel/*` | Matrix auf aktuelle Funktionen/Pfade bringen |
| C-003 | open | P1 | `docs/sot/03` und `docs/sot/04` enthalten tote Datei-Referenzen | `docs/sot/03_SIMULATION.md`, `docs/sot/04_RUNTIME_RENDER_UI.md` | Tote Referenzen entfernen oder auf aktive Pfade mappen |
| C-004 | open | P1 | Runtime-Claims widersprechen Implementierung (`24 TPS frozen`, Phase-0, pattern* schema) | `docs/ARCHITECTURE.md`, `docs/sot/03_SIMULATION.md`, `docs/sot/04_RUNTIME_RENDER_UI.md`, `src/game/sim/reducer/core.js` | Entweder Code oder Doku eindeutig angleichen |
| C-005 | open | P1 | LLM-Preflight-Kette in Dokus nicht durchgaengig synchron | `RUNBOOK.md`, `docs/llm/*`, `agents/llm-entry-sequence/*` | Eine kanonische Kette, alle Sekundaerquellen angleichen |
| C-006 | open | P2 | SoT-Index-Metadaten sind veraltet | `docs/sot/00_INDEX.md` | Head/Datum/Manifest auf aktuellen verifizierten Stand bringen |
| C-007 | open | P2 | Tests/Evidence-Semantik uneinheitlich (`quick/full` Darstellung) | `devtools/test-suites.mjs`, `devtools/evidence-runner.mjs` | Suite-Semantik klar dokumentieren und Fehlermeldungen korrigieren |

## Arbeitsregel
Pro Governance-PR nur Eintraege aus dieser Liste bearbeiten und am Ende je Eintrag `status` aktualisieren.
