# GitHub Media Index

Playwright-Captures für Vergleichsansichten von Desktop, Tablet und Mobile.

## Capture-Matrix

### Desktop 1536x960
- `home`: ![desktop home](assets/compare-desktop-1536x960-home.png)
- `status`: ![desktop status](assets/compare-desktop-1536x960-status.png)
- `evolution`: ![desktop evolution](assets/compare-desktop-1536x960-evolution.png)
- `werkzeuge`: ![desktop tools](assets/compare-desktop-1536x960-werkzeuge.png)
- `systeme`: ![desktop systems](assets/compare-desktop-1536x960-systeme.png)

### Desktop 1280x720
- `home`: ![desktop 1280 home](assets/compare-desktop-1280x720-home.png)
- `status`: ![desktop 1280 status](assets/compare-desktop-1280x720-status.png)
- `werkzeuge`: ![desktop 1280 tools](assets/compare-desktop-1280x720-werkzeuge.png)

### Tablet 834x1112
- `home`: ![tablet home](assets/compare-tablet-834x1112-home.png)
- `status`: ![tablet status](assets/compare-tablet-834x1112-status.png)
- `werkzeuge`: ![tablet tools](assets/compare-tablet-834x1112-werkzeuge.png)

### Mobile 390x844
- `home`: ![mobile 390 home](assets/compare-mobile-390x844-home.png)
- `status`: ![mobile 390 status](assets/compare-mobile-390x844-status.png)
- `evolution`: ![mobile 390 evolution](assets/compare-mobile-390x844-evolution.png)
- `werkzeuge`: ![mobile 390 tools](assets/compare-mobile-390x844-werkzeuge.png)
- `systeme`: ![mobile 390 systems](assets/compare-mobile-390x844-systeme.png)

### Mobile 360x640
- `home`: ![mobile 360 home](assets/compare-mobile-360x640-home.png)
- `status`: ![mobile 360 status](assets/compare-mobile-360x640-status.png)
- `werkzeuge`: ![mobile 360 tools](assets/compare-mobile-360x640-werkzeuge.png)

## Reproduzierbar erzeugen

1. Server starten:
   - `python -m http.server 8080`
2. Playwright-Flow gegen `http://127.0.0.1:8080/` laufen lassen.
3. Bilder landen unter `docs/assets/compare-*.png`.
