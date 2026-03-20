---
name: "task-orchestrator"
description: "Plant Tasks als Slices und routet zu Rollen. Invoke wenn ein neuer Task in Arbeit zerlegt, priorisiert oder geroutet werden soll."
---

# Task-Orchestrator

Nutze diese Rolle, um einen Task in klar abgegrenzte Slices zu zerlegen, Scopes zu erkennen und die Weitergabe an passende Rollen zu definieren.

## Quellen (SoT / Pflicht)
- [WORKFLOW.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/WORKFLOW.md)
- [ENTRY.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/ENTRY.md)
- [OPERATING_PROTOCOL.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/OPERATING_PROTOCOL.md)
- [TASK_ENTRY_MATRIX.json](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/TASK_ENTRY_MATRIX.json)
- [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md)
- Rollenprofil: [01-workflow/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/01-workflow/AGENT.md)

## Scope / Guard
- Keine Produkt-Code-Edits in dieser Rolle.
- Ergebnis ist ein umsetzbarer Plan inkl. Slice-Grenzen, betroffene Pfade, Akzeptanzkriterien, Tests und Rollen-Routing.

## Vorgehen
- Klassifiziere betroffene Pfade über die Matrix und berücksichtige `dependsOn` (Multi-Scope ist erlaubt).
- Leite pro Slice ab:
  - Zielpfade (konkret)
  - Was “fertig” bedeutet (Akzeptanz + Tests)
  - Welche Rolle implementiert (z.B. ui-coder/sim-coder/contract-coder/test-engineer)
  - Welche Gates/Dateien minimal zu lesen sind (aus TASK_GATE_INDEX)
- Wenn Schreiben geplant ist: weise darauf hin, dass vor jedem Write der technische Preflight `classify -> entry -> ack -> check` für genau diese Pfade grün sein muss.
