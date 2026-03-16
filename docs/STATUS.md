# STATUS — v0.7.3

## Zweck
Diese Datei ist die einzige Status-, Bugfix-, Release- und Changelog-Quelle.
Sie wird append-only gepflegt.
Sie ist zugleich die globale Fallback-Ansicht fuer Governance- und Versioning-Fragen.

## Projektstand
- Phasen A bis F sind produktiv abgeschlossen.
- Phase G ist aktiv und auf Cleanup, Balance und RC-Haertung beschraenkt.
- Reproduzierbarkeit ist fuer den aktuellen W1-Scope wieder hart belegt: dispatch-only Claims, harte Payload-Validierung, kein globaler Browser-Storezugriff, kein Live-Vorspulen.
- Global ist das Projekt noch nicht vollstaendig bewiesen; die aktuelle Truth deckt nur den kleinen kanonischen W1-Scope ab.
- Neue Kernfeatures, neue Zone und neue Presets bleiben gesperrt.

## Aktive Release-Gates

### Verifiziert Gruen
- `node tools/run-all-tests.mjs --full`
- `node tools/evidence-runner.mjs --suite claims`
- `node tests/test-contract-no-bypass.mjs`
- `node tests/test-dispatch-error-state-stability.mjs`
- `node tests/test-deterministic-genesis.mjs`
- `node tests/test-step-chain-determinism.mjs`
- `node tests/test-readmodel-determinism.mjs`
- `node tests/test-sim-gate-contract.mjs`
- `node tests/test-llm-contract.mjs`
- Letzte Gegenprobe auf aktuellem Branch: 2026-03-16, Proof `docs/traceability/w1-proof-summary.md`

### Noch Offen
- W1-Truth auf weitere fachliche Bereiche ausdehnen, ohne neue Sonderpfade einzufuehren
- Fog-Intel-/Reachability-/Result-Logik in denselben kleinen deterministischen Evidence-Stil ueberfuehren
- Perf-Budgets sauber messen und einhalten
- Preset-Balance fuer `river_delta`, `dry_basin`, `wet_meadow`
- Migration-Sicherheit explizit gegenpruefen
- finale Release-Abnahme fuer Phase G dokumentieren

## Phasenstatus
- Phase A/B: Genesis, Core und Contract-Basis abgeschlossen
- Phase C: DNA-Zone und DNA-Flow abgeschlossen
- Phase D: Infrastruktur- und Sicht/Fog-Basis im Code vorhanden; Alt-TODO wurde in diese Statusdatei ueberfuehrt
- Phase E: kanonische Zonen und Pattern-State abgeschlossen
- Phase F: Tech-Gates, Progression und Result-only-Losepfade abgeschlossen
- Phase G: Cleanup, Perf, Balance und RC-Haertung aktiv

## Aktive Prioritaetenliste (Phase G)

### P0 (Blocker vor RC)
1. W1-Truth ohne Sonderpfade auf weitere Main-Run-Bereiche erweitern
2. Fog-Intel-/Reachability-Fehler im naechsten W1-Ausbau kausal beheben
3. Migration-Sicherheit explizit gegen neuen Drift pruefen
4. Perf-Budgets messen und regressionssicher machen
5. Preset-Balance fuer `river_delta`, `dry_basin`, `wet_meadow` abschliessen
6. finale RC-Abbruchkriterien dokumentieren

### P1 (RC-Haertung)
1. Legacy-Reste in Main-Run und Renderer weiter minimieren
2. Runtime/Test-Drift und Artefakt-Drift schliessen
3. Release-Checklist finalisieren

### P2 (Laufende Pflege)
1. Doku und Testbelege auf RC-Stand halten

## Atomare Test-TODO (fix, MVP unveraendert)

### Ziel
- dispatch-only Truth
- seed/hash-basierte Determinismusbeweise
- no-bypass Surface
- LLM Entry/Gate Pflicht

### Prioritaeten
- `P0`: Luecken schliessen, die falsches Gruen erlauben koennen
- `P1`: Determinismus-Beweise vertiefen (per-step, read-model)
- `P2`: Gate-Robustheit/Flake-Resistenz

### Atomare Tasks

#### P0
0. `P0-T0` LLM-Entry-Regelrahmen und Entry-Contract-Test haerten; unsaubere Formulierungen und stiller Pfaddrift duerfen keinen Regelbruch mehr erlauben. `[done 2026-03-16]`
1. `P0-T1` `tests/test-contract-no-bypass.mjs` um negativen `SET_BRUSH`-Fall erweitern. `[done 2026-03-16]`
2. `P0-T2` `tests/test-contract-no-bypass.mjs` um negativen `SET_UI`-Fall erweitern. `[done 2026-03-16]`
3. `P0-T3` `tests/test-contract-no-bypass.mjs` um negativen `SET_PHYSICS`-Fall erweitern. `[done 2026-03-16]`
4. `P0-T4` `tests/test-contract-no-bypass.mjs` um negativen `SET_GLOBAL_LEARNING`-Fall erweitern. `[done 2026-03-16]`
5. `P0-T5` Neues `tests/test-dispatch-error-state-stability.mjs` (kein Drift bei Fehl-Dispatch). `[done 2026-03-16]`
6. `P0-T6` `tests/test-deterministic-genesis.mjs` um `same-seed` Replay-Block erweitern. `[done 2026-03-16]`
7. `P0-T7` `tests/test-deterministic-genesis.mjs` um `cross-seed` Divergenzblock erweitern. `[done 2026-03-16]`
8. `P0-T8` `tests/test-deterministic-genesis.mjs` um per-step Hash-Anker erweitern (`after-core`, `step-1`, `step-4`). `[done 2026-03-16]`
9. `P0-T9` `tests/evidence/spec-map.mjs` aktualisieren (neue Tests `active`). `[done 2026-03-16]`
10. `P0-T10` Registry-Konsistenz erzwingen (`tests/test-*.mjs` == `REGRESSION_TEST_STATUS` == `EVIDENCE_SUITES.regression`). `[done 2026-03-16]`
11. `P0-T11` Vollnachweis laufen lassen: `node tools/run-all-tests.mjs --full`. `[done 2026-03-16]`
12. `P0-T12` Ergebnis fixieren: Manifestpfad + Kernhashes dokumentieren; bei Rot ersten Brecher als naechsten atomaren Task ausweisen. `[done 2026-03-16]`

#### P1
13. `P1-T13` Neues `tests/test-step-chain-determinism.mjs` (Replay pro Step, nicht nur Endzustand). `[done 2026-03-16]`
14. `P1-T14` Neues `tests/test-readmodel-determinism.mjs` (ReadModel-Hash als eigener Pflichtanker). `[done 2026-03-16]`

#### P2
15. `P2-T15` `tests/test-llm-contract.mjs` auf Flake-Resistenz pruefen (stabile Preconditions, keine impliziten Dateinamenannahmen). `[done 2026-03-16]`

### Bindende Reihenfolge
1. `T0`
2. `T1-T4`
3. `T5`
4. `T6-T8`
5. `T9-T10`
6. `T11-T12`
7. danach `T13-T14`
8. danach `T15`

### Abnahmekriterien
- Kein Task wird gemischt umgesetzt; genau ein atomarer Scope pro Commit.
- Kein Fake-Gruen: neue Tests muessen begruendet rot brechen oder reproduzierbar gruen belegen.
- Kein Bypass-Backdoor-Pfad wird durch Tests geduldet.
- `run-all-tests --full` bleibt offizieller Abschlussnachweis.

## Release-Plan (Phase G -> RC)

### Milestone R1 (P0 schliessen)
1. Perf-Budgets:
   `tests/test-performance-budgets.mjs` anlegen/aktivieren und in `truth` oder `stress` registrieren.
2. Preset-Balance:
   `tests/test-preset-balance.mjs` + reproduzierbares Balance-Reporting fuer `river_delta`, `dry_basin`, `wet_meadow`.
3. Migration-Sicherheit:
   `tests/test-migration-safety.mjs` mit klaren Drift-Regeln (Schema, strict-Pfade, Snapshot-Stabilitaet).
4. Gate:
   `npm run test:quick`, `npm run test:truth`, `npm run test:stress` muessen nach den Aenderungen weiter gruen bleiben.

### Milestone R2 (P1/P2 RC-Haertung)
1. Legacy-Entkopplung:
   verbleibende `LEGACY_CONTEXT`-Pfade in UI/Renderer weiter reduzieren oder explizit als bewusst verbleibend klassifizieren.
2. RC-Checklist finalisieren:
   eindeutiger Go/No-Go-Block in dieser Datei mit allen Pflichtgates und Abbruchkriterien.
3. Gate:
   `node tests/test-phase-g-cleanup.mjs` und `node tests/test-release-candidate-integrity.mjs` gruen.

### Milestone R3 (RC-Freeze)
1. Doku-Sync:
   `README.md`, `docs/ARCHITECTURE.md`, `docs/STATUS.md` ohne Drift.
2. Finale Gegenprobe:
   Full run `quick/truth/stress` plus RC-Integritaetstest dokumentiert.
3. Release-Entscheid:
   RC nur bei komplett gruener Gate-Lage; sonst NO-GO mit dokumentierter Restliste.

## Naechste Session Startpaket
- Ziel: auf den naechsten RC-Block wechseln, ohne erneute Gate-Suche.
- LLM-Leseweg bis Gate verifiziert am 2026-03-15:
  `WORKFLOW -> docs/llm/ENTRY.md -> docs/llm/OPERATING_PROTOCOL.md -> TASK_ENTRY_MATRIX -> TASK_GATE_INDEX -> task-entry -> classify/ack/check`.
- Handshake ist aktuell (`.llm/entry-ack.json`): `versioning`, `testing`, `ui`, `sim`, `contracts` vorhanden.
- Sicherheitsnachweis aktuell: `node tests/test-llm-contract.mjs`, `node tests/test-sim-gate-contract.mjs` und `node tools/run-all-tests.mjs --full` gruen (2026-03-16); P0-T0 bis P2-T15 sind dokumentiert abgeschlossen.
- Startkommandos fuer die naechste Session:
  1. `node tools/llm-preflight.mjs classify --paths <task-pfade>`
  2. `node tools/llm-preflight.mjs entry --paths <task-pfade> --mode work`
  3. `node tools/llm-preflight.mjs ack --paths <task-pfade>`
  4. `node tools/llm-preflight.mjs check --paths <task-pfade>`
  5. danach erst schreiben/testen.
- Commit-/Push-Guard aktivieren: `npm run hooks:install` (einmal pro Clone).
- Wichtiger Hinweis: `src/project/contract/manifest.js` klassifiziert matrix-bedingt mehrdeutig (`contracts` + `versioning`); fuer Vertragsarbeit deshalb disjunkte Contract-Pfade nutzen (z. B. `src/project/contract/stateSchema.js`) oder Task strikt trennen.

## Bugfix-Log

### 2026-03-15
- Problem: Verifikation angefragt, ob die zuletzt eingefuehrte Chunk-Logik fuer grosse Pflanzen-Scans im Worldgen die Laufzeitlogik bricht.
- Ursache: Unsicherheit nach der Umstellung auf deterministische Scan-Batches in `placePlants()`.
- Fix: Keine Codeaenderung an der Sim-Logik; stattdessen gezielte Re-Validierung der Determinismus- und Quick-Suites fuer den Worldgen-/Runtime-Pfad durchgefuehrt.
- Verifikation: `node tests/test-world-presets-determinism.mjs`, `node tests/test-determinism-per-tick.mjs`, `npm run test:quick` gruen.

### 2026-03-15
- Problem: `tests/test-invariants.mjs` fiel reproduzierbar mit `link on dead tile`.
- Ursache: organische CPU-Links in `src/game/sim/network.js` konnten bis exakt `1.0` wachsen und wirkten dadurch wie committed Infrastruktur.
- Fix: dynamische Links bleiben jetzt strikt unter `COMMITTED_INFRA_THRESHOLD`; echte Player-Infrastruktur darf weiter `1` sein.
- Verifikation: `tests/test-network-commit-threshold.mjs` neu, `npm run test:quick` gruen.

### 2026-03-15
- Problem: Main-Run trug weiter tote UI-/Renderer- und Labor-Ableger.
- Ursache: Legacy-Kontexte und Roh-Brush-Schutz waren nicht hart genug gekapselt.
- Fix: Cleanup in `src/game/ui/ui.js` und `src/game/render/renderer.js`, Labor-only-Guards nachgezogen, `SET_WIN_MODE` aus Main-Run-Action-Surface entfernt.
- Verifikation: `node tests/test-phase-g-cleanup.mjs` gruen, `npm run test:truth` gruen.

### 2026-03-14
- Problem: Main Run war in mehreren UI-/Read-Model-/Default-Pfaden inkonsistent und zu sandbox-lastig.
- Ursache: Advisor, HUD, Win-Mode-Steuerung, Overlays und Defaults waren nicht auf einen gemeinsamen Laufzeitvertrag gezogen.
- Fix: deterministisches Advisor-Modell als Source of Truth, Main-Run-Defaults geschaerft, Win-Mode-Lock nach Tick 0, echte Diagnose-Overlays und fokussierte Vertrags-Tests.
- Verifikation: `npm run test:quick` gruen, inklusive `test-advisor-model`, `test-overlay-diagnostics`, `test-string-contract`, `test-version-traceability`.

## Append-Only Change Log

### 2026-03-16 session `repro-audit-and-bugfix-plan`
- Versionierung bewusst nicht angehoben; `0.7.3` bleibt Produkt-Truth, bis der Repro-Auditblock kausal geschlossen ist.
- Statustruth gehaertet: alte breite Suite-Laeufe sind nicht mehr die Quelle von Wahrheit; W1 lebt nur noch ueber den kleinen offiziellen Proof-Pfad.

### 2026-03-16 session `w1-dispatch-only-truth-cut`
- Globale Browser-Surfaces entfernt: kein `window.__lifeGameStore`, kein `window.__worldStateLog`, kein `window.__lifeGamePerfStats`, kein `window.render_game_to_text`, kein `window.advanceTime`.
- `src/app/runtime/publicApi.js` geloescht; Live-Client hat keine offizielle Test- oder Debug-Sonderoberflaeche mehr.
- `tools/evidence-runner.mjs` auf dispatch-only Evidence reduziert; Browser-Claims und global-hook-basierte Debugpfade sind nicht mehr Teil der offiziellen Truth.
- Aktive Testlinie auf drei kleine Beweise reduziert: `test-contract-no-bypass`, `test-deterministic-genesis`, `test-llm-contract`.
- Voll-Gate belegt mit `node tools/run-all-tests.mjs --full`, Proof `docs/traceability/w1-proof-summary.md`.

### 2026-03-16 session `p0-entry-hardening-and-hash-proof`
- Entry-Governance gehaertet: `docs/WORKFLOW.md`, `docs/llm/ENTRY.md`, `docs/llm/OPERATING_PROTOCOL.md` verbieten jetzt mehrdeutige Scope-Wechsel, unscharfe Preflight-Folgen und Weiterarbeit nach `check`-Rot explizit.
- `tools/llm-preflight.mjs` meldet Pfaddrift jetzt kausal statt indirekt ueber Proof-Mismatch; `session.classifiedPaths` und `ack.classifiedPaths` werden explizit gegen die aktive Pfadmenge verifiziert.
- P0-Testlinie auf vier kleine Pflichtbeweise erweitert:
  - `tests/test-contract-no-bypass.mjs` deckt jetzt auch negative `SET_BRUSH`, `SET_UI`, `SET_PHYSICS` und `SET_GLOBAL_LEARNING`-Faelle mit stabilen Hashankern ab.
  - neues `tests/test-dispatch-error-state-stability.mjs` beweist `revisionCount`-, `signatureMaterial`- und `readModel`-Stabilitaet bei Fehl-Dispatch.
  - `tests/test-deterministic-genesis.mjs` prueft jetzt `same-seed`, `cross-seed` sowie die festen Anker `after-core`, `step-1`, `step-4`.
  - `tests/test-llm-contract.mjs` erzwingt wording contract, explizite Pfaddrift-Fehler und wiederholbar gruene `check`-Rotation.
- Evidence-/Registry-Sync nachgezogen: `tests/evidence/spec-map.mjs` fuehrt die vier aktiven Pflichtbeweise mit standardisierten Namen und Zwecken.
- Offizieller Vollnachweis erneut grün: `node tools/run-all-tests.mjs --full`, Manifest `output/evidence/2026-03-16T20-08-05-025Z-full-60d00ec1/manifest.json`, Proof `docs/traceability/w1-proof-summary.md`.

### 2026-03-16 session `p0-repetition-proof`
- Wiederholungsprobe fuer den kanonischen `testing`-Scope erneut grün: `classify -> entry -> ack -> check` plus `node tools/run-all-tests.mjs --full`.
- Neuer Vollnachweis: `output/evidence/2026-03-16T20-18-21-400Z-full-c2fce4ba/manifest.json`.
- Ergebnis blieb stabil: `evidence_match`, Claims `match`, Regression `match`; nur die Event-Chain-Root rotierte erwartungsgemaess neu.

### 2026-03-16 session `p1-drift-probes-promoted-to-truth`
- `tests/test-step-chain-determinism.mjs` ist jetzt offizielle Regression-Truth mit Einordnung `P1 / Runtime-Test-Drift`.
- `tests/test-readmodel-determinism.mjs` ist jetzt offizielle Regression-Truth mit Einordnung `P1 / Artefakt-/Read-Model-Drift`.
- Registry/Suite wurden synchronisiert, damit `node tools/run-all-tests.mjs --full` beide Tests offiziell kennt; der bisherige Drift `realer Test existiert, aber Voll-Gate kennt ihn nicht` ist fuer diese beiden Tests geschlossen.
- Wiederholungsprobe danach erneut grün: `output/evidence/2026-03-16T20-29-41-219Z-full-9ceb4c82/manifest.json`.
- Dieser Nachtrag bedeutet nur, dass die beiden P1-Drift-Tests jetzt offizielle Truth sind; er behauptet nicht, dass der gesamte Repro-/RC-Audit bereits abgeschlossen ist.

### 2026-03-16 session `sim-gate-contract-hardening`
- `src/project/contract/simGate.js` fuehrt jetzt explizite `booleanKeys`, `stringKeys` und `objectKeys`, damit `zone2Unlocked`, `dnaZoneCommitted` und `infrastructureUnlocked` nicht mehr still ueber Zahl-Coercion durch das Gate rutschen.
- `src/game/sim/gate.js` liest diese Typlisten direkt aus dem Contract und blockiert numerische Payloads fuer Boolean-Felder jetzt kausal mit `expected boolean`.
- Stille Doppeldefinitionen fuer `zoneRole`, `zoneId` und `zoneMeta` wurden in `src/project/contract/simGate.js` und `src/game/sim/worldgen.js` entfernt; kanonisch bleiben `Int8Array` fuer `zoneRole` und `Uint16Array` fuer `zoneId`.
- Neuer Regressionstest `tests/test-sim-gate-contract.mjs` ist aktiv und verankert Boolean-Gate-Haertung plus eindeutige Zone-Array-Contracts.
- Neuer Vollnachweis danach erneut grün: `output/evidence/2026-03-16T20-56-41-704Z-full-01b86177/manifest.json`.

### 2026-03-16 session `p2-llm-contract-flake-hardening`
- `tests/test-llm-contract.mjs` sichert und restauriert jetzt den vorhandenen Workspace-`.llm`-Zustand, statt `entry-ack.json`, `entry-session.json` und `entry-proof/` blind als globale Vorbedingung zu loeschen.
- Dadurch prueft der Test seine Preconditions weiter hart, greift aber nicht mehr destruktiv in fremde aktive Session-Artefakte ein.
- Wichtige Einsicht aus der Verifikation: `test-llm-contract` und `run-all-tests --full` duerfen nicht parallel gegen denselben `.llm`-Ordner laufen; seriell bleibt die Linie stabil gruen.
- Neuer Vollnachweis danach erneut grün: `output/evidence/2026-03-16T21-00-47-345Z-full-dda33471/manifest.json`.

### 2026-03-15 session `entry-naming-and-backup-anchor-audit`
- Entry-Benennung fuer technische Checks entkoppelt: `llm:entry|ack|check` ersetzt durch `llm:preflight:start|ack|check`, damit Chat-Entry (Prozess) und CLI-Preflight (Technik) nicht verwechselt werden.
- Sicheres Backup-Anchor-Audit automatisiert: neues Script `tools/backup-anchor-audit.mjs` plus `npm run backup:audit`, `npm run backup:audit:apply` und `npm run backup:audit:fix-local`.
- Audit-Regeln: mindestens ein echter (non-main) Pre-Rewrite-Tag, canonical Anchor-Tag (`backup-main-pre-rewrite-anchor`) und Fail bei Backup-Branches, die auf `main` zeigen.

### 2026-03-15 session `version-correction-0.7.3`
- Produktversion als neue Truth auf `0.7.3` gesetzt (ersetzt bisherige `2.6.0` Anzeigen).
- Synchronisiert: `package.json`, `package-lock.json`, `src/project/contract/manifest.js`, `README.md`, `index.html`, `docs/ARCHITECTURE.md`, `docs/STATUS.md`.
- `tests/test-version-traceability.mjs` entkoppelt von der alten Regel `APP_VERSION.major == SCHEMA_VERSION`; Schema bleibt separat versioniert.

### 2026-03-15 session `determinism-drift-audit-hardening`
- Session-Audit hat drei Drift-Risiken bestaetigt: (1) `guardDeterminism` war abschaltbar, (2) `simStepBuffer` lief ohne Determinismus-Guard, (3) Entropie-Policy fehlte bei `crypto.randomUUID` und `crypto.getRandomValues`.
- Fix umgesetzt:
  - `src/core/kernel/store.js`: Guard nicht mehr deaktivierbar, Crypto-Entropie im Guard blockiert.
  - `src/core/runtime/simStepBuffer.js`: Reducer + simStep im Buffer laufen jetzt im gleichen Guard-Kontext; Debug-Compute fuer Testnachweis exponiert.
  - `src/project/llm/policy.js`: Entropie-Blockliste um `performance.now`, `crypto.randomUUID`, `crypto.getRandomValues` erweitert.
  - `tests/test-determinism-guard-policy.mjs` und `tests/test-simstep-buffer-guard.mjs` neu als harte Drift-Regressionstests.
  - `tools/test-suites.mjs` erweitert, damit beide neuen Tests im quick-Gate verpflichtend laufen.
- Verifikation: `npm test` gruen nach den Aenderungen.

### 2026-03-15 session `release-plan-rc-phase-g`
- Konkreten Release-Plan fuer Phase G in drei Milestones (R1 P0, R2 RC-Haertung, R3 RC-Freeze) dokumentiert.
- Gates und Exit-Kriterien pro Milestone explizit als Startanweisung fuer die naechste Session festgehalten.

### 2026-03-15 e6020d4 `fix: restore llm lock and dataflow dispatch mapping after rebase`
- `docs/llm/entry/LLM_ENTRY_LOCK.json` nach Rebase-Konflikt wieder auf gueltigen Stand gebracht.
- `src/project/contract/dataflow.js` mit fehlender UI-Dispatchquelle fuer `SET_WIN_MODE` synchronisiert.
- Quick-Gegenprobe danach wieder gruen.

### 2026-03-15 session `status-sync-after-rebase`
- `docs/STATUS.md` auf Ist-Stand nachgezogen (Prioritaeten, aktuelle Gegenprobe, Rebase-Fix).
- Verifikation auf aktuellem Stand bestaetigt: `npm run test:truth`, `npm run test:stress` gruen.

### 2026-03-15 46556d6 `major clean`
- UI- und Renderer-Cleanup fuer Phase G umgesetzt
- `tests/test-phase-g-cleanup.mjs` angelegt
- `tools/test-suites.mjs` um Cleanup-Gate erweitert
- Debug-Loop-Artefakte aktualisiert

### 2026-03-15 9a5ae91 `test now green`
- Phase-G-Status und Gegenprobe dokumentiert
- Truth-Suite nachgezogen
- Debug-Loop-Artefakte fuer gruene Gegenprobe aktualisiert

### 2026-03-15 b630ae9 `test and fixes`
- Schwellenfehler in `src/game/sim/network.js` behoben
- `tests/test-network-commit-threshold.mjs` angelegt
- `tools/playwright-debug-loop.mjs` gehaertet

### 2026-03-15 b81bc3f `patch: docs: close phase f and open phase g`
- Phase F offiziell geschlossen
- Phase G als aktiver Release-Block geoeffnet

### 2026-03-15 e7dc96b `patch: tests: merge phase f loss coverage`
- Phase-F-Losepfade in fokussierte Tests ueberfuehrt
- Truth-Suite fuer Progressions-/Lose-Integritaet ausgebaut

## Versioning-Regel
- Versionsaenderungen muessen zu `package.json`, `src/project/project.manifest.js`, `README.md`, `index.html`, `docs/ARCHITECTURE.md` und dieser Datei passen.
- Kleinere Governance- oder Cleanup-Aenderungen ohne neue Produktoberflaeche brauchen nicht automatisch einen Versionssprung.
