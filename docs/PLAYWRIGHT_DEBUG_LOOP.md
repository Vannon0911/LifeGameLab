# Playwright Debug Loop

Zweck: reproduzierbarer Browser-Loop fuer Main-Run-Checks und Labor-/Benchmark-Debugging mit sauberem Neustart pro Iteration.

## Verhalten
- startet jede Iteration in frischem Browser-Context
- klickt den Start-Button, falls der Run noch steht
- erhoeht danach `ticks/s` per `SET_SPEED`
- sweeped danach alle fuenf Freeze-Raeume als Raster: `lage`, `eingriffe`, `evolution`, `welt`, `labor`
- prueft im Live-Debug `labor` zusaetzlich auf Benchmark-Phasen, Statuswechsel und Export-Buttons
- schreibt Boot-/Run-Screenshots, JSON-State und Console-Log unter `output/web-game/debug-loop`
- leert vor jedem Close `localStorage`, `sessionStorage`, `indexedDB`, `CacheStorage` und Cookies

## Manueller Live-Loop
1. Browser frisch oeffnen und auf `http://127.0.0.1:8091/` navigieren.
2. Bootzustand lesen: kein falscher Kollaps-/Nullzustand, keine Console-Errors.
3. Run starten und `ticks/s` auf `24` setzen.
4. Raeume live durchgehen: `lage`, `eingriffe`, `evolution`, `welt`, `labor`.
   Nach Welt-/Labor-Controls sofort gegenpruefen, dass Paneltexte nicht auf altem State haengen:
   Preset, Seed, Groesse, Geschwindigkeit, Render-Modus und Overlay muessen ohne sichtbaren Stale-Frame nachziehen.
5. In `labor` den Benchmark starten und beobachten:
   `Start Benchmark` muss zu laufendem Status wechseln.
   Der Status muss Phasen wie `setup_main`, `main`, `worker_init`, `worker` sichtbar machen.
   Nach Abschluss muessen JSON/CSV-Buttons aktiv werden.
6. Vor Browser-Close immer Storage/Caches/Cookies loeschen.

## Aufruf

```bash
npm run debug:playwright -- --url http://127.0.0.1:8091/ --iterations 2 --speed 24 --advance-ms 2000
```

## Artefakte
- `iter-01-boot.png` / `iter-01-boot.json`
- `iter-01-run.png` / `iter-01-run.json`
- `iter-01-console.json`
- `iter-01-panel-lage.png` bis `iter-01-panel-labor.png`
- `summary.json`

## Hinweise
- Das Script erwartet ein global verfuegbares Playwright unter `%APPDATA%\\npm\\node_modules\\playwright`.
- Alternativ kann `PLAYWRIGHT_MODULE` auf `playwright/index.mjs` zeigen.
