# Playwright Debug Loop

Zweck: reproduzierbarer Browser-Loop fuer Main-Run-Checks mit sauberem Neustart pro Iteration.

## Verhalten
- startet jede Iteration in frischem Browser-Context
- klickt den Start-Button, falls der Run noch steht
- erhoeht danach `ticks/s` per `SET_SPEED`
- sweeped danach alle fuenf Freeze-Raeume als Raster: `lage`, `eingriffe`, `evolution`, `welt`, `labor`
- schreibt Boot-/Run-Screenshots, JSON-State und Console-Log unter `output/web-game/debug-loop`
- leert vor jedem Close `localStorage`, `sessionStorage`, `indexedDB`, `CacheStorage` und Cookies

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
