# LifexLab v2.3.0

Deterministisches Sandbox-Kolonie-Spiel mit CPU-Gegenspieler, DNA-Ressource, Evolution und Zonendesign.

Die Codebasis verwendet nur noch die kanonische Struktur. Aktive Dokumentation, Audit-Notizen und Handoff liegen gesammelt unter `docs/`.

## Starten

```bash
npm test
npm run serve
```

Danach `http://localhost:8080/` öffnen.

## Kanonische Struktur

- `src/app/` Browser-Entry
- `src/core/kernel/` deterministischer Kernel
- `src/core/runtime/` Runtime-Helfer
- `src/game/sim/` Simulation und Reducer
- `src/game/render/` Renderer
- `src/game/ui/` UI
- `src/project/` stabile projektseitige Entry-Punkte
- `tests/` Test-Suite
- `tools/` Hilfsprogramme und Redteam
- `docs/` operative Audit-, Governance- und Handoff-Dokumente

## Architekturregeln

- State schreibt nur über `dispatch()` und Patch-Anwendung.
- Renderer und UI schreiben keinen Gameplay-State direkt.
- Deterministische Quellen nur über Kernel-RNG, nie über `Math.random()` oder Zeitquellen.
- Neue Features laufen manifest-first über `src/project/project.manifest.js`.

## Verifikation

- `npm test` führt 21 Testdateien plus Redteam aus.
- `tests/test-version-traceability.mjs` prüft Versionskonsistenz.
- `tests/test-path-hygiene.mjs` blockiert alte Wrapper-Pfade in aktivem Code und operativer Doku.

Details: `docs/PROJECT_STRUCTURE.md`
