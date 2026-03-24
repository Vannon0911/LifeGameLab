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
npm run test:determinism:matrix
npm test
```

## Kernel v1.5 Determinism Proof (App 0.9.0)
Version-Quelle:
- App-Version und Schema kommen aus `src/game/contracts/manifest.js` (`APP_VERSION = "0.9.0"`, `SCHEMA_VERSION = 2`).
- Kernel-v1.5 bezeichnet hier den World-/Runtime-Contract-Meilenstein aus `docs/PRODUCT.md` (Version-Boundary v1.5).

Wie es funktioniert:
- Der Kernel laesst nur validierte Dispatch-Transitions zu und erzeugt pro Zustand eine Signatur aus stabilem Signature-Material.
- Determinismus bedeutet: gleicher Seed + gleiche Action-Kette => gleiche Hashes/Signaturen.
- Reproduzierbarkeit wird auf den Anchors `after-worldgen`, `tick1`, `tick4` und optional `tick100` geprueft.

Wie der Beweis bei uns gefuehrt wird:
- `npm run test:quick` validiert die Evidence-Claims (inkl. `claim.w1.rts_mainline_deterministic`).
- `npm run test:determinism:matrix` startet fuer jede Seed-Zeile zwei getrennte Node-Prozesse und vergleicht die Hashes.
- Drift liegt vor, wenn fuer denselben Seed Run A und Run B unterschiedliche `signatureMaterialHash`-Werte liefern.

Wie du es selbst testest:
```bash
# 1) Evidence-Claims
npm run test:quick

# 2) Zwei getrennte Node-Prozesse + Seed-Matrix (Default: 8 Seeds, 100 Ticks)
npm run test:determinism:matrix

# 3) Optional: eigene Seeds/Ticks
node devtools/determinism-seed-matrix.mjs --seeds repro-a,repro-b,repro-c --ticks 100
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
