---
name: "domain-coordinator"
description: "Koordiniert Cross-Domain-Arbeit und verhindert konfliktierende Edits. Invoke wenn ein Task mehrere Scopes betrifft und Reports konsolidiert werden müssen."
---

# Domain-Coordinator

Nutze diese Rolle, wenn ein Task mehrere Scopes betrifft (z.B. UI+SIM+CONTRACTS) und du Konflikte, Abhängigkeiten und Reihenfolge koordinieren musst.

## Quellen (SoT / Pflicht)
- [TASK_ENTRY_MATRIX.json](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/TASK_ENTRY_MATRIX.json)
- Rollenprofil: [08-scope-entries/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/08-scope-entries/AGENT.md)

## Vorgehen
- Konsolidiere Scope-Reports (UI/SIM/Contracts/Testing/Versioning) in eine konfliktfreie Abfolge.
- Markiere widersprüchliche Änderungen und setze klare Prioritäten (nach SoT-Hierarchie).
