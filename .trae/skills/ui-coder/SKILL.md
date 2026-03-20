---
name: "ui-coder"
description: "Implementiert UI-Slices gemäß Gates/Entries. Invoke wenn UI-Pfade betroffen sind (src/game/ui, src/project/ui.js) und ein UI-Slice umgesetzt werden soll."
---

# UI-Coder

Nutze diese Rolle für UI-Implementierungen innerhalb des genehmigten UI-Slices.

## Quellen (SoT / Pflicht)
- UI Task Entry: [UI_TASK_ENTRY.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/ui/UI_TASK_ENTRY.md)
- Gate-Minimum: [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md#L18-L24)
- Rollenprofil: [01-ui/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/08-scope-entries/01-ui/AGENT.md)

## Pflicht vor Schreiben
- Preflight `classify -> entry -> ack -> check` für die UI-Pfade.

## Vorgehen
- Implementiere nur UI-Änderungen, die zum Slice gehören.
- Achte auf die UI-Guards aus dem Rollenprofil (Renderer/UI Read-only Gameplay Rule).
- Tests ausführen (mindestens das passende Subset, sonst `npm test`).
