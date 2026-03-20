# Contributing to LifeGameLab

Danke, dass du zu LifeGameLab beitragen willst.

## Development Setup
1. `npm install`
2. `npm run hooks:install`
3. Optional: `npm run llm:preflight:check`

## Branching
- Arbeite in Feature-Branches.
- Nutze klare Commit-Messages im Imperativ.
- Oeffne Pull Requests mit nachvollziehbarer Problem-/Loesungsbeschreibung.

## Pull Request Checklist
- Relevante Tests laufen lokal (`npm run test:quick` mindestens)
- Keine zufaelligen Format-/Refactor-Diffs
- Dokumentation aktualisiert, wenn Verhalten sich aendert
- Breaking Changes klar markiert

## Determinismus-Regeln
- Keine indirekten State-Mutationen aus der UI.
- State-Updates nur ueber definierte Action/Reducer-Pfade.
- Deterministische Ergebnisse haben Prioritaet vor kurzfristiger Bequemlichkeit.

## Prozesshinweis
Dieses Repository nutzt verbindliche Prozessregeln (siehe `RUNBOOK.md` und `docs/llm/ENTRY.md`).
Wenn du kritische Pfade aenderst, halte die dort definierte Pflichtkette ein.

## Kommunikationsstil
- Faktenbasiert, konkret, reproduzierbar.
- Diskussionen ueber Designentscheidungen bitte mit nachvollziehbaren Trade-offs.
