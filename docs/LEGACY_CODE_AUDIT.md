# Legacy-Code-Suche (Schnell-Audit)

Stand: 2026-03-15

## Vorgehen

Für die Suche nach möglichem Legacy-/Backcompat-Code wurden im Repository folgende Pattern geprüft:

- `legacy`, `LEGACY_CONTEXT`
- `deprecated`, `@deprecated`
- `TODO`, `FIXME`, `HACK`, `obsolete`
- Backcompat-/Fallback-Indikatoren (`fallback`, `wrapper-ban`)

## Treffer mit hoher Relevanz

### 1) Aktive Legacy-Kontexte in der UI

- `src/game/ui/ui.constants.js`
  - Exportiert `LEGACY_CONTEXT` mit mehreren Legacy-IDs (`legacy_energie`, `legacy_harvest`, ...).
- `src/game/ui/ui.js`
  - Nutzt diese Legacy-Kontexte an mehreren Stellen im UI-Fluss.

**Einschätzung:** Eindeutiger, produktiv genutzter Legacy-Pfad im Frontend.

### 2) Tests, die Legacy-Pfade explizit absichern

- `tests/test-founder-placement.mjs`
  - Erwartet explizit: `lab PLACE_CELL must retain legacy placement`.
- `tests/test-bootstrap-gen-world.mjs`
  - Prüft, dass Lab-Modus den Legacy-Seed behält.
- `tests/test-wrapper-ban.mjs`
  - Enthält Guard gegen „legacy wrapper/backcompat references“.
- `tests/test-visibility-fog.mjs`
  - Kommentar erwähnt Legacy-Masks/Links.
- `tests/test-dna-zone-setup-gates.mjs`
  - Kommentar/Output bezieht sich auf Blockierung von Legacy-Aktionen.

**Einschätzung:** Legacy-Verhalten ist bewusst dokumentiert und testseitig geschützt.

## Treffer mit mittlerer Relevanz

- `tools/test-suites.mjs`
  - Referenz auf Fallback-Test (`test-render-worker-fallback.mjs`).
- `tests/test-render-worker-fallback.mjs`
  - Validiert Fallback-Hooks für Worker-Renderpfad.

**Einschätzung:** Eher Resilienz/Fallback als „Legacy“, aber potenziell Backcompat-nah.

## Was *nicht* gefunden wurde

- Keine klaren `@deprecated`-Marker in `src/`.
- Keine großflächigen `FIXME`-/`TODO`-Blöcke direkt in Runtime-Code, die explizit auf Legacy-Migration verweisen.

## Empfohlene nächste Schritte

1. `LEGACY_CONTEXT` zentral klassifizieren:
   - „behalten“, „ablösen“, oder „entfernen bis Version X“.
2. Legacy-Pfade in `src/game/ui/ui.js` pro Kontext in kleine, klar benannte Helper auslagern.
3. Für jeden bestätigten Legacy-Pfad ein Ticket mit Exit-Kriterium anlegen
   (z. B. „entfernbar, wenn Test A/B auf neuen Pfad umgestellt“).
4. `tests/test-wrapper-ban.mjs` um eine Positivliste ergänzen, falls bestimmte Backcompat-Hooks dauerhaft erlaubt bleiben sollen.
