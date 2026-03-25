# LLM ENTRY

## Zweck
Dieser Einstieg ist der Pflicht-Dispatcher fuer jede LLM-Arbeit.
Er legt fest, wo die task-spezifischen Daten liegen, damit kein globaler Vollscan noetig ist.
Die kompakten, aufgeteilten Hard-Rules stehen in `docs/llm/SAFE_RULES.md` und sind verbindlich.

## Pflicht-Lesereihenfolge (ohne Vollscan)
1. `docs/WORKFLOW.md`
2. `docs/llm/ENTRY.md`
3. `docs/llm/TASK_ENTRY_MATRIX.json` (Task klassifizieren)
4. `docs/llm/entry/TASK_GATE_INDEX.md` (minimales Gate-Set je Task)
5. Passende Task-Entries fuer alle klassifizierten Scopes lesen:
   - `docs/llm/ui/UI_TASK_ENTRY.md`
   - `docs/llm/gameplay/GAMEPLAY_TASK_ENTRY.md`
   - `docs/llm/contracts/CONTRACT_TASK_ENTRY.md`
   - `docs/llm/testing/TESTING_TASK_ENTRY.md`
   - `docs/llm/versioning/VERSIONING_TASK_ENTRY.md`
6. Globale Mindest-Gates lesen:
   - `src/game/contracts/manifest.js`
   - `src/kernel/store/createStore.js`
   - `src/kernel/store/applyPatches.js`

## Preflight-Vertrag
- Jeder Task wird ueber `docs/llm/TASK_ENTRY_MATRIX.json` dependency-basiert als `taskScope[]` klassifiziert.
- Die technische Pflichtkette ist immer exakt `orchestrator(PARENT ONLY) -> classify -> entry -> ack -> check -> commit`.
- Bei `Entry hash drift` oder `Read-order drift` zuerst `node tools/llm-preflight.mjs update-lock` ausfuehren und danach die Pflichtkette vollstaendig neu starten.
- Bei Pfadwechsel ist Auto-Reclassify Pflicht; Scope-Erweiterung ist erlaubt und keine Ambiguitaet.
- Wenn Evidenz fuer eine Annahme unklar bleibt, ist vor `GO` eine aktive Rueckfrage an den User Pflicht.
- `entry`, `ack` und `check` blockieren Schreiboperationen; reine Read-/Analyse-/Testlaeufe bleiben erlaubt.
- Commits werden aus isoliertem Stage gebaut; Multi-Scope-Commits sind erlaubt, wenn die Pfade kausal gekoppelt sind.
- Ein `check`-Fehler blockiert Schreiben. Testlaeufe bleiben moeglich und liefern weiterhin Wahrheit.
- Der Chat-Trigger `entry` ist nur der menschliche Startimpuls. Die technische Wahrheit lebt ausschliesslich in `tools/llm-preflight.mjs`.
- Vor jedem Commit muessen betroffene Dokuquellen inklusive relevanter Stringmatrix-/Inventar-Dateien nachgezogen und am Ende des Arbeitsschritts erneut auf Aktualitaet geprueft werden.
- Nach jedem komplett abgeschlossenen Task (inklusive aller waehrenddessen aufgetretenen Nebenfixes) folgt nach `check` ein Commit; der naechste Task startet verpflichtend mit dem Orchestrator-Schritt ueber `agents/orchestrator/orchestrator.mjs` (PARENT ONLY).

## Red-Team Evidence
- Open bypass/conflict points (API preflight off-switch, dry-run preflight skip, empty paths, fail-open scan resolution, rebuttal opt-out) and the need for bypass regression tests are captured by the documented subagent runs; see consolidated findings `RT-01`..`RT-07` in `docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:115`‑`140` for exact evidence links.
- Security conflict between the hard Preflight chain requirement and the runtime skips, plus the Rebuttal opt-out gap, is detailed under `RT-01`..`RT-05` with per-agent commands/evidence at `docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:20`‑`112`.
- Prioritized remediation steps S1..S6 map directly to the consolidated TODO list in `docs/llm reports/REDTEAM_SUBAGENTS_2026-03-25.md:143`‑`150`.

## Kernel- Und Manifest-Pflichtgate (SoT)
- `src/game/contracts/manifest.js` ist Source of Truth fuer Felder, Actions und Contract-Kette.
- `src/kernel/store/createStore.js` und `src/kernel/store/applyPatches.js` sind Pflichtgate fuer State-Mutationen.
- Diese drei Dateien gehoeren in jede Pflicht-Lesereihenfolge, auch wenn der Haupttask UI/Testing ist.

## Main Loop (Kernel-SoT)
- WorldGen (seed-basiert): `GEN_WORLD` erzeugt den Startzustand deterministisch aus `meta.seed`.
- MapBuilder (optional): `RUN_PHASE.MAP_BUILDER` fuer kontrollierte Karten-Overrides.
- RunActive (RTS/RPG Loop): `SIM_STEP` mutiert nur bei `RUN_PHASE.RUN_ACTIVE`.

## Harte Invarianten
- State nur ueber `dispatch()` plus Patches
- Kernel bleibt einziger Keeper
- Renderer und UI bleiben read-only gegen Gameplay-State
- kein `Math.random()` oder `Date.now()` in Reducer oder SimStep
- neue Felder und Actions zuerst im Manifest und Contract
- UMGEHUNG IST STRENG VERBOTEN OHNE VORHERIGE RUECKSPRACHE. Das gilt insbesondere fuer direkte State-/Patch-Injektion in Tests oder Runtime-Flows.
- kein `--no-verify`, kein Hook-Bypass, kein Guard-Bypass (`SKIP`, `HUSKY=0` oder aehnlich). Bei Blockade gilt: Scope-/Matrix-Regeln korrigieren, dann erneut `classify -> entry -> ack -> check`.
- Terminologie: Produkt- und UI-Texte nutzen `worker` als kanonische Einheit; Legacy-`cell` Strings bleiben nur fuer kompatible Action-IDs bis zur vollstaendigen Ablösung.

## Globale Referenzquellen (bei Scope-Betroffenheit)
- `docs/PRODUCT.md`: Produkt- und Scope-Basis
- `docs/ARCHITECTURE.md`: technische Snapshot-Wahrheit
- `output/current-truth.json`: maschinenlesbare Truth (`manifest + commit SHA`)
- `docs/STATUS.md`: Kommentar-/Entscheidungslog fuer Gates, Bugfixes, Release- und Change-Stand
- `docs/traceability/rebuild-string-matrix.md` und `docs/traceability/rebuild-preparation-inventory.md`: nachziehen, sobald der Task ihre Aussagen oder Referenzketten veraendert

## ADVERSARIAL EXECUTION MODE

- Default ist immer: explizite Widerlegungs-Subagents AN.
- Ausschalten nur bei ausdruecklichem User-Opt-out (`no subagents`); Schweigen ist niemals Opt-out.
- Jede Annahme → sofort 1 neuer Subagent zur Widerlegung, nie derselbe weiterverwendet
- Nächster Punkt → neuer Subagent, keine Wiederverwendung
- Subagent-Ergebnisse nicht auslesen bis expliziter Trigger
- Zusammenfassung nur auf expliziten Befehl
- Nur Ursachenanalyse — kein stiller Fix ohne Freigabe
- Keine Codeänderung ohne explizite Freigabe pro Datei/Funktion
- Nur bestätigte Laufpfade — keine Nebenpfade
- Keine Wrapper- oder Scheinlösungen
- Inkonsistenz-Format: Symptom → Root Cause → Evidence (Datei:Zeile) → Impact → Freigabebedarf

## SUBAGENT PATTERN CONSENT GATE (HART)

- Bevor ein bestehendes Subagent-Muster weitergefuehrt wird, muss die Parent-LLM den User aktiv fragen:
  - `Soll ich mit diesem Subagent-Muster genauso weiterarbeiten wie bisher?`
- Ohne explizite User-Bestaetigung gilt fail-closed:
  - keine Fortsetzung des alten Subagent-Orchestrierungsmodus
  - nur read-only Planung/Status bis zur Bestaetigung
- Die Bestaetigung ist session-gebunden und muss bei unklarer Lage erneut eingeholt werden.

## FILE-SCAN ORCHESTRATION GATE (HART)

- Gilt vor jedem Dateiscannerlauf, Datei-Parsing, Datei-Interpretationsschritt und jeder semantischen Ableitung aus Dateiinhalten.
- Parent-LLM darf Dateiinhalt lesen, aber keine unvalidierte Annahme als Fakt behandeln.
- Jede Annahme/Hypothese/implizite Deutung wird sofort an einen frischen Subagent zur Widerlegung delegiert.
- Subagent muss von Beginn an aus Parent-Kontext initialisiert werden (nicht optional, nicht nachtraeglich).
- Erst nach Gegenpruefung darf die Parent-LLM Aussagen weiterverwenden.
- Ein Punkt/Annahme = ein neuer Subagent; keine Wiederverwendung.
- Kein Direktschluss aus Dateitext auf Intention, Struktur, Bedeutung oder Fehlerursache ohne Subagent-Gegenpruefung.

## AKTIVE RUECKFRAGEPFLICHT FUER ANNAHMEN (HART)

- Subagent-Widerlegung ersetzt keine aktive User-Rueckfrage, wenn die Evidenz danach weiter uneindeutig bleibt.
- Fuer jede offene Annahme muss die Parent-LLM die Rueckfrage explizit formulieren:
  - `Annahme: <kurz und testbar>`
  - `Evidenzluecke: <Datei/Quelle oder "keine harte Evidenz">`
  - `Rueckfrage: <konkrete Ja/Nein- oder Entweder/Oder-Frage>`
- Ohne beantwortete Rueckfrage: kein `GO`, kein Schreiben, kein Commit.

## Definition Of Done
- Contract und Gates intakt
- Determinismus intakt
- Pfadhygiene intakt
- Doku und Code synchron
- passende Tests gruen
- aktiver Task-Preflight gueltig und driftfrei fuer den benutzten Scope
- Versionsregel eingehalten: pro abgeschlossenem Slice `+0.0.1`; Teilstufen `a/b/c/d` nur als Dokumentanhang
- Wenn alle enthaltenen Schritte abgeschlossen sind, gilt verpflichtend: erst `check`, dann Commit; der Folgeablauf startet mit `agents/orchestrator/orchestrator.mjs` (PARENT ONLY).
