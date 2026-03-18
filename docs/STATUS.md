# STATUS — v0.7.3

## Zweck
Diese Datei ist ein Kommentar-/Entscheidungslog fuer Status, Bugfixes, Releases und Changelog.
Sie wird append-only gepflegt.
Maschinenlesbare Truth liegt in `output/current-truth.json` (letzter gueltiger Testlauf + Commit-SHA).

## Projektstand
- Phasen A bis F sind produktiv abgeschlossen.
- Die bisherige Phase-G-RC-Haertung bleibt dokumentierte Baseline, ist aber nicht mehr die aktive Arbeitsliste.
- Aktiver Arbeitsblock ist jetzt der bindende MVP-Feature-Complete-Plan `A1 -> A2 -> A3 -> B1 -> B2 -> B3 -> C1 -> C2 -> C3 -> C4`.
- Contract-Disziplin bleibt hart: keine Store-Seiteneffekte, keine verdeckten Mutationen, alle neuen Felder in Schema/Gate/Metrics/Mutation-Matrix registrieren.
- Reproduzierbarkeit ist fuer den aktuellen Vor-MVP-W1-Scope hart belegt: dispatch-only Claims, harte Payload-Validierung, kein globaler Browser-Storezugriff, kein Live-Vorspulen.
- Global ist das Projekt noch nicht vollstaendig bewiesen; die aktuelle Truth deckt den kleinen kanonischen W1-Scope ab und muss fuer den MVP-Block gezielt erweitert werden.

## Aktueller Umsetzungsstand (Code)
- `A1`: abgeschlossen
- `A2`: abgeschlossen
- `A3`: abgeschlossen
- `B1`: abgeschlossen
- `B2`: abgeschlossen
- `B3`: globales `actionLog` verworfen/zurueckgebaut; `simStepCount` bleibt im Code
- `C1`: abgeschlossen
- `C2`: abgeschlossen
- `C3`: abgeschlossen
- `C4`: abgeschlossen mit Restnote (UI-Summary nutzt noch nicht konsequent `sim.runSummary`)

## Aktive Release-Gates

### Verifiziert Gruen
- `node tools/run-all-tests.mjs --full`
- `node tools/evidence-runner.mjs --suite claims`
- `node tests/test-contract-no-bypass.mjs`
- `node tests/test-dispatch-error-state-stability.mjs`
- `node tests/test-deterministic-genesis.mjs`
- `node tests/test-step-chain-determinism.mjs`
- `node tests/test-readmodel-determinism.mjs`
- `node tests/test-kernel-replay-truth.mjs`
- `node tests/test-sim-gate-contract.mjs`
- `node tests/test-llm-contract.mjs`
- A1-C4-Gegenprobe (current-truth): `2026-03-18` · commit `306d1788d53d06212d2de77da331a4cb580ce1cb` · manifest `output/evidence/2026-03-18T14-22-50-366Z-full-f4f8d895/manifest.json`
- Letzte Gegenprobe auf aktuellem Branch: 2026-03-16, Proof `docs/traceability/w1-proof-summary.md`
- Diese Gruenlage bezieht sich auf die Vor-MVP-Baseline vor A1-C4.

### Noch Offen
- Testlinie fuer Genesis, Step-Determinismus, Sim-Gate und No-Bypass auf den neuen Zustand erweitern
- Voll-Gegenprobe fuer den neuen MVP-Zustand dokumentieren

## Phasenstatus
- Phase A/B: Genesis, Core und Contract-Basis abgeschlossen
- Phase C: DNA-Zone und DNA-Flow abgeschlossen
- Phase D: Infrastruktur- und Sicht/Fog-Basis im Code vorhanden; Alt-TODO wurde in diese Statusdatei ueberfuehrt
- Phase E: kanonische Zonen und Pattern-State abgeschlossen
- Phase F: Tech-Gates, Progression und Result-only-Losepfade abgeschlossen
- Phase G: bisherige Cleanup-/RC-Baseline dokumentiert; aktiver Delivery-Block ist jetzt MVP-Feature-Complete

## Aktive Prioritaetenliste (MVP-Feature-Complete)

### Bindende Reihenfolge
1. `A1`
2. `A2`
3. `A3`
4. `B1`
5. `B2`
6. `B3`
7. `C1`
8. `C2`
9. `C3`
10. `C4`

## Atomare MVP-Tasks

### Ziel
- MVP feature complete, ohne Umgehung der bestehenden Dispatch-/Patch- und Contract-Gates
- neue Runtime-Felder ausschliesslich ueber reducer/simStep + manifest/contract registrieren
- deterministische Erweiterung der bestehenden Truth, nicht parallele Sonderpfade
- UI/Renderer bleiben read-only gegenueber Gameplay-State

### Atomare Tasks

1. `A1` KILL in `src/game/sim/worldgen.js` und `src/game/sim/reducer/index.js`: `generateWorld` ruft `placeClusters` fuer Spawn-Cluster nicht mehr auf. Worldgen erzeugt null lebende Zellen. Exklusiver CPU-Spawn bleibt `seedDeterministicBootstrapCluster` in `CONFIRM_CORE_ZONE`. `[done]`
2. `A2` KILL in `src/game/sim/step.js`: Tick-Hardcode entfernen, der Spieler-Hue auf `210` und CPU-Hue auf `0` zuruecksetzt. `[done]`
3. `A3` KILL in `src/game/sim/reducer/metrics.js`, `src/game/ui/ui.constants.js`, `src/game/sim/reducer/cpuActions.js`, `src/game/sim/worldAi.js`: `born` und `died` aus `WORLD_SIM_STEP_KEYS`-Exclusion entfernen, tote UI-Konstanten loeschen, `cpuActions.js` ausraeumen, `worldAiAudit`/`devAiLast`-Writes aus Production-State entfernen oder labor-guarded machen. `[done]`
4. `B1` BUILD in `src/game/sim/cellPatterns.js`, `src/game/sim/stepPhases.js`, `src/game/sim/step.js`, `src/project/contract/stateSchema.js`, `src/project/contract/simGate.js`, `src/game/sim/reducer/metrics.js`: `scanCellTopologyPatterns(world, playerLineageId)` liefert `{ line, angle, triangle, loop }`. `runWorldSystemsPhase` wird auf Return `{ plantsPrunedLastStep, cellPatternCounts }` erweitert. `simStep` uebernimmt `worldPhase.cellPatternCounts` in sein Metrics-Return. `simStepPatch` patcht nur ueber `simOut`, nicht ueber `world`. `[done]`
5. `B2` BUILD in `src/game/sim/worldAi.js`, `src/game/sim/stepPhases.js`, `src/game/sim/step.js`, `src/game/sim/reducer/index.js`: `applyWorldAi(world, tick, phy)` statt `options`. `runWorldSimV4` setzt `phy.worldSeedHash = hashString(\`${meta.seed || "life-seed"}:${normalizeWorldPresetId(meta.worldPresetId)}\`)`, `phy.playerAliveCount = Number(sim.playerAliveCount || 0)`, `phy.cpuAliveCount = Number(sim.cpuAliveCount || 0)`. `CONFIRM_CORE_ZONE` verwendet weiter `deriveBootstrapSimMetrics(...)`, damit die Counts schon vor dem ersten `SIM_STEP` korrekt sind. Strategiephase ist `hashMix32(phy.worldSeedHash, Math.floor(tick / 90)) % 3`. Override auf `PRESSURE`, wenn `phy.playerAliveCount > phy.cpuAliveCount * 1.5`. `EXPAND` spawnt max. 3 CPU-Zellen Richtung Spieler-Zentroid innerhalb CPU-Territorium `+2` Tiles. `HOLD` bleibt passiv. `PRESSURE` setzt `world.clusterAttackState[cpuLid].budget` auf Maximum. `[done]`
6. `B3` STATUS: globales `actionLog` wurde verworfen/zurueckgebaut; `meta.simStepCount` bleibt im Code (`SIM_STEP` erhoeht nur `meta.simStepCount`). `[done-with-rollback]`
7. `C1` WIRE in `src/game/ui/ui.js` und `src/project/contract/dataflow.js`: Win-Mode-Selector im Welt-Panel vor Run-Start, Dispatch `SET_WIN_MODE`, disabled ab `sim.tick > 0`, selected state aus `sim.winMode`. `[done]`
8. `C2` WIRE in `src/game/render/renderer.js`: committed `zoneRole`-Tiles immer sichtbar machen. `CORE` Cyan-Ring, `DNA` Violet-Ring, `INFRA` Teal-Ring, Radius `* 1.45`, Alpha `0.35`, aktiv bei `quality >= 1`. `[done]`
9. `C3` WIRE in `src/game/ui/ui.lage.js` und `src/project/llm/advisorModel.js`: Sektion `Aktive Topologien` mit `line`, `angle`, `triangle`, `loop`, Nullwerte gedimmt sichtbar. `advisorModel.status.patternSummary` bekommt `cellTopology`. `loop > 0` ergaenzt den `dna_investment`-Hinweis. `[done]`
10. `C4` BUILD in `src/game/sim/reducer/winConditions.js`, `src/project/contract/stateSchema.js`, `src/project/contract/simGate.js`, `src/game/sim/reducer/metrics.js`, `src/project/contract/mutationMatrix.js`, `src/game/ui/ui.js`: `sim.runSummary` ist im Contract registriert und wird bei `gameResult` gesetzt; Overlay/Summary ist sichtbar, Daily bleibt derzeit nicht aktiv verdrahtet. `[done-with-note]`

### Nicht-Blocker / Review-Notizen
- `C4`: offizielles `sim.runSummary` ist vorhanden; UI-Overlay liest Summary-Werte aktuell noch nicht konsequent direkt aus `sim.runSummary`.
- `B2`: `phy.playerAliveCount` und `phy.cpuAliveCount` kommen bewusst aus `state.sim` des vorherigen abgeschlossenen Ticks. Der Ein-Tick-Delay ist akzeptierte Strategie-Logik, kein Bug.

### Abnahmekriterien
- Kein Task wird gemischt umgesetzt; genau ein atomarer Scope pro Commit.
- Kein Fake-Gruen: neue Tests muessen begruendet rot brechen oder reproduzierbar gruen belegen.
- Kein Bypass-Backdoor-Pfad wird durch Tests geduldet.
- Alle neuen Felder muessen in Schema, Gate, Metrics und Mutation-Matrix registriert sein, bevor UI/Overlay darauf baut.
- `run-all-tests --full` bleibt offizieller Abschlussnachweis fuer den integrierten Endstand.

## Test-Plan (MVP-Feature-Complete)

1. `tests/test-deterministic-genesis.mjs`: direkt nach `GEN_WORLD` expliziter Assert auf null lebende Zellen; nach `CONFIRM_CORE_ZONE` expliziter Assert auf genau eine CPU-Bootstrap-Population und korrekt gesetzte `sim.playerAliveCount`/`sim.cpuAliveCount`.
2. `tests/test-step-chain-determinism.mjs`: explizite Gleichheit fuer `sim.cellPatternCounts` pro Anchor zusaetzlich zu Signature-/Read-Model-Checks.
3. `tests/test-sim-gate-contract.mjs`: `cellPatternCounts` und `runSummary` im Sim-Contract validieren.
4. `tests/test-contract-no-bypass.mjs`: bestaetigen, dass kein Store-Bypass eingefuehrt wird und der B3-Rollback (`kein globales actionLog`) stabil bleibt.
5. Determinismus-Checks ergaenzen fuer `meta.simStepCount` und `sim.runSummary`.

## Naechste Session Startpaket
- Ziel: den bindenden MVP-Block `A1 -> ... -> C4` ohne Scope-Mix und ohne Contract-Bypass abarbeiten.
- LLM-Leseweg bis Gate verifiziert am 2026-03-15:
  `WORKFLOW -> docs/llm/ENTRY.md -> docs/llm/OPERATING_PROTOCOL.md -> TASK_ENTRY_MATRIX -> TASK_GATE_INDEX -> task-entry -> classify/ack/check`.
- Handshake ist aktuell (`.llm/entry-ack.json`), aber jeder A-/B-/C-Block braucht seinen eigenen Subtask-Preflight fuer die jeweils disjunkten Pfade.
- Sicherheitsnachweis aktuell: `node tests/test-llm-contract.mjs`, `node tests/test-sim-gate-contract.mjs` und `node tools/run-all-tests.mjs --full` sind fuer die Vor-MVP-Baseline gruen (2026-03-16).
- Startkommandos fuer die naechste Session:
  1. `node tools/llm-preflight.mjs classify --paths <task-pfade>`
  2. `node tools/llm-preflight.mjs entry --paths <task-pfade> --mode work`
  3. `node tools/llm-preflight.mjs ack --paths <task-pfade>`
  4. `node tools/llm-preflight.mjs check --paths <task-pfade>`
  5. danach erst schreiben/testen.
- Commit-/Push-Guard aktivieren: `npm run hooks:install` (einmal pro Clone).
- Wichtiger Hinweis: `src/project/contract/manifest.js` klassifiziert matrix-bedingt mehrdeutig (`contracts` + `versioning`); fuer Vertragsarbeit deshalb disjunkte Contract-Pfade nutzen (z. B. `src/project/contract/stateSchema.js`) oder Task strikt trennen.

### Aktuell gueltig ab 2026-03-18
- Preflight-Commands laut `tools/llm-preflight.mjs`: `classify`, `entry`, `ack`, `check`, `audit`.
- Empfohlene Reihenfolge fuer Schreibarbeit:
  1. `node tools/llm-preflight.mjs classify --paths <task-pfade>`
  2. `node tools/llm-preflight.mjs entry --paths <task-pfade> --mode work`
  3. `node tools/llm-preflight.mjs ack --paths <task-pfade>`
  4. `node tools/llm-preflight.mjs check --paths <task-pfade> --mode work`
- Optionaler Audit vor Start: `node tools/llm-preflight.mjs audit --paths <task-pfade>`.

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

### 2026-03-18 session `kernel-slices-and-entry-sync`
- Kernel/Game-Split auf aktuellen Stand gebracht: `src/kernel/*` ist operative SoT; `src/core/kernel/*` bleibt nur Compatibility-Fassade.
- Domain-Gating zentralisiert: Kernel-Dispatch ruft generisches `assertDomainPatchesAllowed(...)`; konkrete Sim-Gate-Logik liegt in `src/game/plugin/gates.js`.
- Truth-Harness erweitert: neuer Regressionstest `tests/test-kernel-replay-truth.mjs` erzwingt `seed + actions => signature chain` inkl. cross-seed Divergenz.
- Entry-Protokolle und Lesereihenfolge auf neue Pflichtgates synchronisiert:
  - `src/kernel/store/createStore.js`
  - `src/kernel/store/applyPatches.js`
  - plus `src/project/project.manifest.js` als contracts-klassifizierter Pfad.
- Nachweis auf aktuellem Stand: `node tools/run-all-tests.mjs --full` gruen.

### 2026-03-16 session `status-sync-mvp-feature-complete-plan`
- Die aktive Arbeitsliste wurde von der alten Phase-G-RC-Haertung auf den bindenden MVP-Feature-Complete-Plan `A1 -> A2 -> A3 -> B1 -> B2 -> B3 -> C1 -> C2 -> C3 -> C4` umgestellt.
- `docs/STATUS.md` fuehrt jetzt die atomaren MVP-Tasks, den zugehoerigen Test-Plan und die zwei offenen Review-Notizen fuer `B3` und `C4` explizit an.
- Die bisherige Gruenlage bleibt als Vor-MVP-Baseline dokumentiert; sie gilt nicht stillschweigend als Beweis fuer den neuen A1-C4-Zustand.

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
