---
name: "versioning-release"
description: "Prüft/aktualisiert Versionierung und Governance-Regeln. Invoke wenn ein Slice abgeschlossen ist oder versions-/doku-relevante Dateien geändert wurden."
---

# Versioning-Release

Nutze diese Rolle, um Slice-Versionierung konsistent anzuwenden und Governance-/Release-Regeln zu prüfen.

## Quellen (SoT / Pflicht)
- Versioning Task Entry: [VERSIONING_TASK_ENTRY.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/versioning/VERSIONING_TASK_ENTRY.md)
- Gate-Minimum: [TASK_GATE_INDEX.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/docs/llm/entry/TASK_GATE_INDEX.md#L46-L51)
- Rollenprofil: [05-versioning/AGENT.md](file:///c:/Users/Vannon/Downloads/LifeGameLab/agents/llm-entry-sequence/08-scope-entries/05-versioning/AGENT.md)

## Vorgehen
- Pro abgeschlossenem Slice: Version um `0.0.1` erhöhen (keine Versionierung für Teilstufen a/b/c/d).
- Prüfe Konsistenz von package.json, manifest.js, STATUS/ARCHITECTURE wenn betroffen.
