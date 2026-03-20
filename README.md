# LifeGameLab

Deterministisches Browser-RTS mit einem radikalen Startpunkt: Du beginnst mit genau einer Zelle.
Keine Menueschlachten, kein Tutorial-Zirkus, nur direkte Kontrolle, reproduzierbare Simulation und harte Entscheidungen zwischen kurzfristiger Oekonomie und langfristiger Infrastruktur.

## Projektstatus
- Phase: Core-Gameplay und Determinismus-Fundament aktiv
- Fokus: sichtbare Interpolation im Runtime-Flow und durchgaengiger Worker-Order-Loop
- Tech: Vanilla JavaScript (ESM), seedbasiertes Sim-Modell, 24 Ticks/Sekunde

## Kernprinzipien
- Determinismus zuerst: gleicher Seed + gleiche Inputs => gleicher Verlauf
- Emergenz statt Klicklisten: Funktionen entstehen aus Zellmustern
- Strategische Spannung: Worker behalten (Cashflow) vs. Worker binden (Skalierung)
- Faire Matches: vergleichbare Startchancen ohne triviale Spiegelung

## Quick Start
### Voraussetzungen
- Node.js 18+
- npm 9+

### Setup
```bash
npm install
npm run hooks:install
```

### Lokal starten
```bash
npm run serve
```
Dann im Browser oeffnen: `http://localhost:8080`

## Tests
```bash
npm run test:quick
npm test
```

## Architektur- und Prozessdokumente
- [RUNBOOK](./RUNBOOK.md)
- [Workflow](./docs/WORKFLOW.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Status](./docs/STATUS.md)

## Repository-Struktur
- `src/` - Runtime, Simulation, Store, UI-Adapter
- `tests/` - deterministische Verifikation und Contracts
- `tools/` - Test-Orchestrierung, Preflight, Guarding
- `docs/` - Architektur, Prozess, Scope-Gates

## Mitmachen
Contributions sind willkommen. Bitte zuerst [CONTRIBUTING](./CONTRIBUTING.md) lesen.

## Sicherheit
Wenn du eine Schwachstelle findest, lies bitte [SECURITY](./SECURITY.md) fuer den Responsible-Disclosure-Prozess.

## Changelog
Aenderungen werden in [CHANGELOG](./CHANGELOG.md) gepflegt.

## Code of Conduct
Siehe [CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md).

## Repository
GitHub: [Vannon0911/LifeGameLab](https://github.com/Vannon0911/LifeGameLab)
