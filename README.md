# LifeGameLab v2.3.0

Deterministisches Zell-Strategiespiel über autonome Kolonien, Evolution, Ressourcenfluss und territoriale Kontrolle.

![LifeGameLab Gameplay](docs/assets/lifegamelab-home.png)

## Spielidee

In `LifeGameLab` steuerst du keine einzelne Figur, sondern eine lebende Kolonie. Wachstum läuft primär autonom, während du Prioritäten, Evolution, Split-Seeds und territoriale Eingriffe setzt. Das Ziel ist kein hektisches Klicken, sondern das Lesen, Lenken und Stabilisieren eines lebenden Systems.

## Rework-Stand

- mobile-first Shell mit Bottom-Dock und Bottom-Sheet
- Desktop als `Mission Control` mit permanenter rechter Statusfläche
- klare Produktsignale statt KPI-Chaos: `Kolonie`, `DNA`, `Risiko`, `Directive`, `Mission`
- sichtbare Strukturreife von Einzelzellen über `2x2`-Biomodule bis zu Koloniekernen
- separater `Lab`-Bereich für Benchmark, Lernsystem und Kernparameter

## Screens

| Desktop Statusraum | Mobile Control Sheet |
| --- | --- |
| ![Desktop Statusraum](docs/assets/lifegamelab-desktop-status.png) | ![Mobile Status Sheet](docs/assets/lifegamelab-mobile-sheet.png) |

| Mobile Shell |
| --- |
| ![Mobile Shell](docs/assets/lifegamelab-mobile-control.png) |

## Produktkern

- Echtzeit-Kolonie auf Canvas mit autonomem Wachstum und lesbarer Missionsführung
- deterministische Simulationslogik für reproduzierbare Läufe und Balancing
- DNA-/Energie-Ökonomie mit Stage-Fortschritt, Doctrine-Fokus und Siegpfaden
- fokussierter Evolution-Tree statt losem Pseudo-Tech-Listing
- Mobile- und Desktop-UI mit getrenntem Spiel- und Lab-Kontext
- umfangreiche Test-Suite inklusive Determinismus-, Gate- und Redteam-Checks

## Lokal starten

```bash
npm test
py -m http.server 8080
```

Dann im Browser `http://127.0.0.1:8080/` öffnen.

Wenn `python3` sauber auf deinem System liegt, funktioniert auch `npm run serve`.

## Steuerung

- `Leertaste`: Start/Pause
- `N`: neue Welt
- `S`: Status öffnen
- `E`: Evolution öffnen
- Maus oder Touch: Werkzeuge, Split-Seeds und Zonen im Spielfeld einsetzen

## Repo-Struktur

- `src/app/`: Bootstrap und Game Loop
- `src/core/`: deterministischer Kernel und Runtime-Helfer
- `src/game/`: Simulation, Renderer und UI
- `src/project/`: projektseitige Entry-Points und Manifest
- `tests/`: Regressionen, Determinismus und Smoke-Checks
- `tools/`: Profiling, Debugging und Redteam-Skripte
- `docs/`: Architektur-, Governance- und Handoff-Dokumente

## Qualität

- `npm test` fährt die komplette Suite
- `npm run test:quick` deckt UI-Vertrag und Smoke-Test ab
- keine Zufallsquellen außerhalb des Kernel-RNG
- State-Änderungen nur über `dispatch()` und Patch-Anwendung
- Browser-Hooks `window.render_game_to_text` und `window.advanceTime` bleiben für QA und LLM-Entry vorhanden

Details: `docs/PROJECT_STRUCTURE.md`
