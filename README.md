# LifeGameLab v2.5.0

![Version](https://img.shields.io/badge/version-2.5.0-0ea5e9)
![Tests](https://img.shields.io/badge/tests-npm%20test-green)
![Determinismus](https://img.shields.io/badge/sim-deterministisch-22c55e)

Deterministisches Zell-Strategieprodukt: autonome Kolonieentwicklung, fokussierte Eingriffe, klare Missionsführung statt Klick-Spam.

![LifeGameLab Gameplay](docs/assets/lifegamelab-home.png)

## Was es ist

`LifeGameLab` ist kein klassisches RTS. Du steuerst eine lebende Linie über Prioritäten, Evolution, Split-Seeds und Zonen. Die Kolonie wächst primär selbst. Dein Job ist Lesen, Lenken, Stabilisieren.

## Produkt-Highlights

- Mobile-first Shell (Bottom-Dock + Sheet), Desktop als Mission-Control
- Klare Top-Signale: `Kolonie`, `DNA`, `Risiko`, `Run-Pfad`, `Engpass`
- Deterministischer Advisor fuer `Run-Pfad`, Engpass, Blocker und naechsten Ausbauhebel
- Sichtbare Strukturreife: Einzelzellen -> 2x2-Biomodule -> Koloniekerne
- Deterministischer Kernel mit harten Manifest-/Schema-/Mutation-Gates
- Echte Diagnose-Scanner fuer `energy`, `toxin`, `nutrient`, `territory`, `conflict`
- Browser-Hooks fuer QA/Automation: `window.render_game_to_text`, `window.advanceTime`

## Screens

| Home | Desktop Status |
| --- | --- |
| ![Home](docs/assets/lifegamelab-home.png) | ![Desktop Status](docs/assets/lifegamelab-desktop-status.png) |

| Mobile Shell | Mobile Sheet |
| --- | --- |
| ![Mobile Control](docs/assets/lifegamelab-mobile-control.png) | ![Mobile Sheet](docs/assets/lifegamelab-mobile-sheet.png) |

| Status Panel | Evolution Panel |
| --- | --- |
| ![Status Panel](docs/assets/lifegamelab-panel-status.png) | ![Evolution Panel](docs/assets/lifegamelab-panel-evolution.png) |

| Tools Panel | Systems Panel |
| --- | --- |
| ![Tools Panel](docs/assets/lifegamelab-panel-tools.png) | ![Systems Panel](docs/assets/lifegamelab-panel-systems.png) |

## Viewport-Vergleich (Playwright)

Automatisch erstellt am **14.03.2026** via Playwright gegen `http://127.0.0.1:8080/`.

| Desktop 1536x960 | Mobile 390x844 |
| --- | --- |
| ![Desktop 1536 Home](docs/assets/compare-desktop-1536x960-home.png) | ![Mobile 390 Home](docs/assets/compare-mobile-390x844-home.png) |

| Desktop Tools | Mobile Tools |
| --- | --- |
| ![Desktop Tools](docs/assets/compare-desktop-1536x960-werkzeuge.png) | ![Mobile Tools](docs/assets/compare-mobile-390x844-werkzeuge.png) |

| Desktop Evolution | Mobile Systeme |
| --- | --- |
| ![Desktop Evolution](docs/assets/compare-desktop-1536x960-evolution.png) | ![Mobile Systeme](docs/assets/compare-mobile-390x844-systeme.png) |

Vollständige Capture-Matrix (alle Größen/Ansichten):
- [docs/GITHUB_MEDIA_INDEX.md](docs/GITHUB_MEDIA_INDEX.md)

## Schnellstart

```bash
npm test
py -m http.server 8080
```

Dann im Browser öffnen: `http://127.0.0.1:8080/`

Optional:

```bash
npm run serve
npm run test:quick
npm run test:truth
npm run test:stress
```

## Steuerung

- `Leertaste`: Start/Pause
- `N`: neue Welt
- `S`: Status öffnen
- `E`: Evolution öffnen
- Maus/Touch: Werkzeuge, Split-Seeds, Zonen

## Qualitätsgates

- `npm test` = Quick-Suite (truth/stress bewusst aus, um grosse Testlaeufe nicht implizit zu triggern)
- `npm run test:full` = Quick + Truth + Stress
- Keine Zufallsquellen außerhalb Kernel-RNG
- State-Änderungen nur via `dispatch()` + Patches
- Contract-Tests für String-/Dataflow-/Wrapper-Hardening aktiv

## Repo-Struktur

- `src/app/` Bootstrap + Loop
- `src/core/` deterministischer Kernel + Runtime
- `src/game/` Sim, Renderer, UI
- `src/project/` Manifest + projektseitige Entry-Points
- `tests/` Gates, Determinismus, Gameplay, Contracts
- `tools/` Profiling, Debug, Redteam
- `docs/` Architektur, Governance, Handoff

## Aktueller Engineering-Status (ehrlich)

- Contract-/Gate-Härtung ist umgesetzt und testgrün.
- Main-Run ist jetzt staerker auf `ernten -> investieren -> ausbauen -> Engpaesse loesen` verdrahtet.
- Win-Mode-Lock, Placement-Cost-Default und Global-Learning-Default stuetzen jetzt den Main Run statt den Sandbox-Fall.
- Performance-Ziel aus dem letzten Implementierungsplan (`>=10%` je Profilfall) ist noch offen.

Details: `docs/PROJECT_STRUCTURE.md`, `docs/PROJECT_CONTRACT_SNAPSHOT.md`, `docs/SESSION_HANDOFF.md`
