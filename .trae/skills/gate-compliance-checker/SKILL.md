---
name: "gate-compliance-checker"
description: "Finale Gate-Prüfung vor Merge/Push. Invoke wenn ein Patch fertig ist und du pass/fail inkl. Blockern gegen Mindest-Gates brauchst."
---

# Gate-Compliance-Checker

Nutze diese Rolle für die finale Gate-Prüfung (pass/fail) gegen globale Mindest-Gates und scope-spezifische Pflichtlisten.

## Quellen (SoT / Pflicht)
- [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md)
- Globale Mindest-Gates: [manifest.js](file:///c:/Users/Vannon/Downloads/LifeGameLab/src/project/contract/manifest.js), [createStore.js](file:///c:/Users/Vannon/Downloads/LifeGameLab/src/kernel/store/createStore.js), [applyPatches.js](file:///c:/Users/Vannon/Downloads/LifeGameLab/src/kernel/store/applyPatches.js)
- Rollenprofil: [09-global-minimum-gates/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/09-global-minimum-gates/AGENT.md)

## Vorgehen
- Prüfe, ob Preflight-Check grün war für die relevanten Pfade.
- Prüfe, ob alle minimalen Gate-Dateien gelesen/berührt wurden, wenn der Slice sie betrifft.
- Gib ein klares pass/fail mit Blocker-Liste (falls fail).
