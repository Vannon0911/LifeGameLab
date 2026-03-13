# LifeGameLab v2.3.0

Deterministisches Strategie-Sandbox-Spiel über wachsende Zellkolonien, Evolution, Ressourcenfluss und territoriale Kontrolle.

![LifeGameLab Gameplay](docs/assets/lifegamelab-home.png)

## Spielidee

In `LifeGameLab` steuerst du keine einzelne Figur, sondern eine lebende Kolonie. Du setzt Zellen, formst Zonen, steuerst die Energiebilanz und entwickelst Archetypen, während eine CPU-Fraktion parallel um Raum und Ressourcen kämpft.

## Produktkern

- Echtzeit-Sandbox auf Canvas mit sofort spielbarer Simulation
- deterministische Simulationslogik für reproduzierbare Läufe und Balancing
- DNA-/Energie-Ökonomie mit Stage-Fortschritt und Siegpfaden
- Zonen, Evolution, Weltparameter und Debug-Werkzeuge direkt in der UI
- Worker-basiertes Rendering und umfangreiche Test-Suite

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
- Maus oder Touch: Zellen und Zonen direkt im Spielfeld platzieren

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

Details: `docs/PROJECT_STRUCTURE.md`
