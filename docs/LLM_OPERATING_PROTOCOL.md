# LLM Operating Protocol

## Pflichtmodus
- Manifest-first
- atomar
- scope-begrenzt
- deterministisch
- evidence-first

## Arbeitsreihenfolge vor jeder Änderung
1. `docs/LLM_ENTRY.md` lesen
2. betroffene Planstelle in `docs/TASK_SEQUENCE.md` prüfen
3. nur die `ALLOWED FILES` öffnen
4. exakt eine logische Änderung ausführen
5. genannte Tests laufen lassen
6. an `STOP`-Punkten nicht weiterspringen

## Harte Verbote
- keine Kernel-Änderungen
- keine verdeckten Zusatzänderungen
- keine Umbenennungen außerhalb des Plans
- keine UI-Logik, wenn SIM-Task
- keine SIM-Logik, wenn UI-Task
- keine Mutation außerhalb freigeschalteter Manifest-Pfade

## Änderungsstandard
Jede Änderung muss dokumentierbar sein als:
- Task-ID
- Ziel
- betroffene Datei(en)
- Änderung
- Tests
- Ergebnis

## Changelog-Regel
- `docs/MASTER_CHANGE_LOG.md` ist append-only.
- Bestehende Inhalte werden nicht gelöscht oder komprimiert.
- Korrekturen werden nur als zusätzliche Nachträge dokumentiert.

## Erfolgskriterium
Nicht „läuft irgendwie“, sondern:
- Contracts intakt
- Scope intakt
- Tests grün
- Reihenfolge eingehalten
