# Phase F TODO

Zweck: Tech-Tree, Progression und Objectives auf das Rework ausrichten.

## Status

- Produktiv strikt gesperrt bis Phase E stabil voll gemerged ist.
- Erlaubt vor Produktivstart:
  - TODO-/Prompt-/Testmatrix-/Smoke-Vorbereitung
  - Progressions-/Objective-Testdesign vorbereiten
  - UI-/Advisor-Slots benennen ohne Produktivumschaltung
- Nicht erlaubt vor Produktivstart:
  - kein produktiver Tech-Tree-Rewrite
  - kein produktives Objective-/Lose-Rework
  - keine Vorab-Migration alter Progressionsquellen

## Zielbild

- Unlock-Quellen werden an DNA, Infrastruktur und Pattern angebunden.
- Stage-Progression passt zum Rework statt zu Altmetriken.
- Objectives, Win und Lose spiegeln den neuen Run sauber.
- Phase F bleibt begrenzt und eroeffnet keinen neuen Content-Berg.

## Harte Reihenfolge

1. Phase E vollstaendig und stabil mergen.
2. Phase F nur auf stabiler E-Basis starten.
3. `tests/test-phase-f-progression-integrity.mjs` ist Pflicht-Gate vor Phase-G-Start.

## Ticket-Reihenfolge

### F1 Tech-Tree-Vertrag
- [ ] neue Lanes einfuehren
- [ ] alte IDs mappen oder migrieren
- [ ] Tests + Doku aktualisieren

### F2 Unlock-Quellen
- [ ] DNA anbinden
- [ ] Infrastruktur anbinden
- [ ] Pattern anbinden
- [ ] Defense anbinden
- [ ] Expansion anbinden
- [ ] Tests + Doku aktualisieren

### F3 Stage-Rework
- [ ] `deriveStageState()` neu kalibrieren
- [ ] neue Gates
- [ ] monotone Stage-Progression
- [ ] Tests + Doku aktualisieren

### F4 Objectives / Win / Lose
- [ ] preset-spezifische Ziele
- [ ] Kernkollaps-Lose
- [ ] Sichtbruch-Lose
- [ ] Netzzerfall-Lose
- [ ] Tests + Doku aktualisieren

### F5 UI / Advisor
- [ ] gleiche Sprache im ganzen Spiel
- [ ] alte Freeze-Vokabeln entfernen
- [ ] Tests + Doku aktualisieren

### F6 Post-F-Integritaetstest
- [ ] `tests/test-phase-f-progression-integrity.mjs` anlegen
- [ ] in `truth`-Suite aufnehmen

### F7 Finalisierung
- [ ] `progress.md` aktualisieren
- [ ] `docs/MASTER_CHANGE_LOG.md` aktualisieren
- [ ] `docs/SESSION_HANDOFF.md` nachziehen
- [ ] Scope-Check: kein neuer Content-Berg

## Pflicht-Gate Nach Phase F

- Datei: `tests/test-phase-f-progression-integrity.mjs`
- Suite: `truth`
- Pflichtbeweise:
  - gleiche Unlock-Inputs => identische Progression
  - `playerStage` bleibt monoton
  - neue Unlock-Quellen schlagen durch, Altmetriken alleine nicht
  - Objectives/Win/Lose bleiben deterministisch reproduzierbar

## Harte Nicht-Ziele

- kein neuer Content-Berg
- keine neue CPU-Architektur
- kein Renderer-Grundumbau
- keine Preset-Explosion
