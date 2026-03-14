# SESSION HANDOFF — LifexLab v2.3.0 Game Sandbox

## Stand

- kanonische Projektstruktur aktiv
- flache aktive Doku unter `docs/`
- operative Doku bereinigt
- Kern-, Dataflow- und Pfadhygiene-Checks grün
- Vollsuite aktuell nicht grün: `tests/test-faction-metrics.mjs` bricht in mindestens einem Seed
- Browser-Check für UI/UX grün, aber deterministic browser hooks fehlen noch (`window.render_game_to_text`, `window.advanceTime`)

## Aktive Struktur

- `src/app/`
- `src/core/`
- `src/game/`
- `src/project/`
- `tests/`
- `tools/`
- `docs/`

## Nächste sinnvolle Schritte

- `tests/test-faction-metrics.mjs` wieder grün bekommen
- `window.render_game_to_text` und `window.advanceTime` als testbare Browser-Entry-Hooks ergänzen
- Snapshot/Handoff nach erneut grünem `npm test` wieder auf verifizierten Stand ziehen
- Win-Bedingungen für Release-Build reaktivieren
- leere Altordner lokal löschen, sobald das Tooling Verzeichnislöschungen zulässt
