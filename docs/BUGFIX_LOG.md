# BUGFIX_LOG

## Format
- Datum
- Problem
- Ursache
- Fix
- Verifikation

## Aktiver Eintrag
- 2026-03-14
- Problem: Runtime-Canvas-Resize bei Offscreen-Transfer erzeugte wiederkehrende Render-Fehler.
- Ursache: Resize-Schreibzugriff auf transferierten Canvas.
- Fix: Guard + konservativer Fallback auf frischen Main-Canvas.
- Verifikation: Browser-Livecheck ohne Console-Errors, `npm test` gruen.
