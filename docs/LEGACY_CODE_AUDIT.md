# Legacy-Code-Suche (Schnell-Audit)

Stand: 2026-03-20

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

### 2) Aktuelle Tests, die Legacy-/Compat-Verhalten indirekt absichern

- `tests/test-llm-contract.mjs`
  - Verhindert Referenzen auf das entfernte Legacy-Action-String `PLACE_CELL`.
- `tests/test-slice-a-contract-scaffold.mjs`
  - Erzwingt explizite Legacy-Koexistenz im Contract (`deprecatedActionMode`, Legacy-/Scaffold-Aktionen, Removal-Gates).
- `tests/test-mapspec-builder-pipeline.mjs`
  - Prüft, dass `SET_WORLD_PRESET` weiter die Legacy-Map-Source-Semantik auf `map.spec` spiegelt.
- `tests/test-mapspec-gen-world.mjs`
  - Prüft Legacy-Preset-Sync und Fallback-Normalisierung im neuen MapSpec-Weg.

**Einschätzung:** Legacy-Verhalten ist weiterhin abgesichert, aber anders als in der alten Audit-Notiz: nicht mehr über die früher genannten Einzeltests, sondern vor allem über Contract-, MapSpec- und Naming-Guards.

## Treffer mit mittlerer Relevanz

- `tools/test-suites.mjs`
  - Führt weiterhin einen `legacy-node-test` als separaten Evidenz-Surface.
- `tools/evidence-runner.mjs`
  - Referenziert den Legacy-Surface weiterhin explizit für Nachweisläufe.

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
4. Die Audit-Datei selbst regelmäßig gegen den aktuellen Testbaum spiegeln; die bisher erwähnten Einzeltests existieren am aktuellen Head nicht mehr.
