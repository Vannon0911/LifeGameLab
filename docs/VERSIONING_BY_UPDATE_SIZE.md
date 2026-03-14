# Versioning By Update Size

Zweck: einheitliche Versionierung und Commit-Struktur pro Updategroesse.

## Regelwerk

- `patch`:
  - nur Bugfixes, kleine UI-Korrekturen, Tests, Doku, Tooling-Haertung
  - keine neue Main-Run-Mechanik, kein Contract-Bruch
  - Version: `2.x.(z+1)`

- `minor`:
  - neue oder spuerbar veraenderte Main-Run-Funktionalitaet ohne Schema-Bruch
  - Parameter-Tuning mit Gameplay-Auswirkung, neue Regressionstests fuer diese Pfade
  - Version: `2.(y+1).0`

- `major`:
  - Contract-/Schema-Bruch oder inkompatible Laufzeitveraenderung
  - `SCHEMA_VERSION` wird erhoeht, `APP_VERSION`-Major muss folgen
  - Version: `(x+1).0.0`

## Commit-Format

- Pflichtpraefix: `patch:`, `minor:`, `major:`
- Beispiel:
  - `patch: persist ui activeTab/panelOpen sync`
  - `minor: tune recycle_patch and add function loop regression test`
  - `major: schema v3 contract migration`

## Reihenfolge pro Release

1. Fachliche Aenderungen in groessengetrennten Commits (`patch`/`minor`/`major`).
2. Danach Release-Commit mit Versionsbump und Doku-Sync:
   - `package.json`
   - `src/project/contract/manifest.js` (`APP_VERSION`)
   - `README.md`
   - `index.html`
   - `docs/BUGFIX_LOG.md`
   - `docs/MASTER_CHANGE_LOG.md`
   - `docs/PROJECT_CONTRACT_SNAPSHOT.md`
3. Pflichtchecks:
   - `npm run test:quick`
   - `npm run test:truth`
