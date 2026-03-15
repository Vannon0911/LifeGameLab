# LifeGameLab V1 Freeze-Handover

## Arbeitsregel
- Dieses Dokument ist die massgebliche Rework-Basis. Nicht auf alte Begriffe, fruehere Preset-Namen oder fruehere UI-Modelle zurueckfallen.
- Wenn Legacy-Code, Altbegriffe oder bestehende UI diesem Plan widersprechen, gilt in dieser Reihenfolge: Main-Run-Produktlogik vor Legacy, Contract-first vor Implementierung, kanonische Weltansicht vor Diagnoseansichten, organische Spielerinteraktionen vor devigen Einzeltools, Delete-don't-hide im Main-Run.

## Zusammenfassung
- LifeGameLab V1 ist ein deterministisches Koloniespiel mit genau einem Main-Run, genau einer kanonischen Weltansicht, festen Presets und contract-first Erweiterungen.
- Operativer Reducerpfad bleibt `src/game/sim/reducer/index.js`; `src/game/sim/reducer.js` bleibt reine Compatibility-Fassade.
- Die kanonische Preset- und Freeze-Source-of-Truth lebt nur hier.

## Aktiver Restphasen-Stand
- Phase A bis E sind abgeschlossen.
- Phase F ist der naechste produktive Block und wird ueber `docs/PHASE_F_TODO.md` gesteuert.
- Phase G bleibt gesperrt bis `tests/test-phase-f-progression-integrity.mjs` existiert und gruen ist.
- Kanonische Restphasen-Doku ab jetzt: `docs/PHASE_F_TODO.md`, `docs/PHASE_G_TODO.md`.
- Produkt- und Designrahmen fuer neue Arbeit: `docs/CONCEPT_BASIS.md`.

## Produktleitplanke
- `docs/CONCEPT_BASIS.md` ist die feste Produktbasis fuer Spielerfantasie, Systemgrammatik, Muster-/Fusionsrolle, Win-Condition-Zwang und Erweiterungslogik.
- Fehlende Systeme werden nicht frei erfunden. Wenn Contract-/Phasen-Doku etwas nicht definieren, bleibt die Arbeit innerhalb der Konzeptbasis oder markiert die Luecke offen.
- Die Konzeptbasis ersetzt keine Contract- oder Phase-Gates. Bei Konflikten gewinnen Contract-Invarianten und aktive Phase-TODOs.

## Testlage 2026-03-15
- Verifiziert gruen: `npm run test:quick`
- Verifiziert gruen: `npm run test:truth`
- Verifiziert gruen: `node tests/test-phase-e-integrity.mjs`
- Verifiziert gruen: `node tests/test-release-candidate-integrity.mjs`
- Weiterhin fehlend: `tests/test-phase-f-progression-integrity.mjs`
- `tests/test-release-candidate-integrity.mjs` ist jetzt in `tools/test-suites.mjs` unter `truth` registriert.
- `tests/test-phase-e-integrity.mjs` ist jetzt ebenfalls in `tools/test-suites.mjs` unter `truth` registriert.

## Verbindliche Produkt- und Architekturentscheidungen
- Main-Run-Raeume sind exakt und ausschliesslich: `lage`, `eingriffe`, `evolution`, `welt`, `labor`.
- Raumbedeutungen:
  `lage` = Koloniezustand, Ziele, Warnungen, Lageinterpretation.
  `eingriffe` = semantische Main-Run-Handlungen, keine Roh-Tools, keine Diagnosemodi.
  `evolution` = Freischaltungen, Doctrine, Entwicklungsweg, Gates.
  `welt` = Preset, Seed, Weltgroesse, Main-Run-taugliche Weltwahl.
  `labor` = Benchmark, Diagnose, Physics-Tuning, Roh-Brushes, alternative Modi.
- Delete-don't-hide gilt hart fuer den Main-Run: alte Main-Run-Kontexte duerfen nicht als tote Renderzweige weiterexistieren; sie werden entfernt oder exakt migriert. Das gilt nicht fuer `labor`.
- Alte Kontexte, die im Main-Run nicht als Parallelpfad ueberleben duerfen: `status`, `tools`, `systems`, `energie`, `harvest`, `zonen`, `welt` in alter Form, `sieg`.
- Main-Run-Renderpfad ist ausschliesslich `combined`. Diagnose-Overlays und alternative Modi bleiben Labor-only.
- Die kanonische Weltansicht kodiert verbindlich: Licht = Helligkeit, Ressourcen = Saettigung, Wasser = Feuchte/Glanz/Uferlesbarkeit, Toxin = kranke Verfaerbung/Sickern/Entsaettigung, Produktion = Groesse/Dichte/Form, Reaktion = Pulse/Rueckzug/Verdichtung.
- Das Grid bleibt Simulationslogik und Datenraster, wird visuell aber entdominisiert; keine Excel-Rasteroptik.
- Weltmodell: `meta.worldPresetId` mit Default `river_delta`, `world.water: Float32Array(N)`, `world.biomeId: Int8Array(N)`. `world.W` bleibt toxisches Feld und wird niemals als Wasser uminterpretiert.
- Preset-IDs sind final und exklusiv: `river_delta`, `dry_basin`, `wet_meadow`. Verbotene Alt-Namen bleiben verworfen: `verdant_delta`, `ash_basin`, `fractured_wetlands`.
- Biome sind V1-fest: `barren_flats`, `riverlands`, `wet_forest`, `dry_plains`, `toxic_marsh` mit IDs `0..4`. Jedes Biom braucht mindestens eine mechanische Signatur in mindestens einem dieser Bereiche: Wachstum, Regeneration, Yield, Risiko, Wasserverhalten, Toxintransport, Pflanzenverhalten.
- Worldgen bleibt deterministisch ueber `(seed, worldPresetId)` und folgt fest: Preset laden, Basisparameter, Wasser, Licht, Fertilitaet, Biome, Pflanzen/Landmarks, Founder/Spawn.
- Neue Main-Run-Actions sind: `SET_WORLD_PRESET`, `HARVEST_PULSE`, `PRUNE_CLUSTER`, `RECYCLE_PATCH`, `SEED_SPREAD`.
- Contract-Reihenfolge ist verbindlich: zuerst `stateSchema`, `actionSchema`, `mutationMatrix`, `simGate`, danach `dataflow`, danach `manifest`.
- Implementierung neuer Main-Run-Felder oder Actions vor vollstaendigem Contract ist unzulaessig.

## Kritische Architekturgrenzen
- `seededStartPhysics()` in `src/game/sim/reducer/index.js` wird nicht neu gebaut. Presets erweitern Startphysik nur ueber Config-Overrides.
- `globalLearning` und `mergeWorldLearningIntoBank()` in `src/game/sim/reducer/techTreeOps.js` bleiben adaptive CPU-Basis und werden nicht ersetzt.
- `expandWorldPreserve()` in `src/game/sim/reducer/worldRules.js` muss im `copy1`-Block `world.water` und `world.biomeId` mitfuehren.
- Phase A bleibt contract-first: `GAME_MODE`, `RUN_PHASE`, `BRUSH_MODE.FOUNDER_PLACE`, `CONFIRM_FOUNDATION`, `meta.gameMode`, `sim.runPhase`, `sim.founderBudget`, `sim.founderPlaced`, `world.founderMask`, `world.visibility` und `world.explored` muessen zuerst in IDs, State, Gates und Metrics verankert werden, bevor Worldgen, Runtime oder UI darauf umgestellt werden.

## Progression und Main-Run-Interaktionen
- `HARVEST_CELL`, rohe Brush-Modi, Diagnose-Controls und direkte Paint-Interaktionen bleiben technisch kompatibel, aber nur fuer `labor`.
- `HARVEST_CELL` ist kein zulaessiger Main-Run-Progressionsmotor und darf nicht ueber UI-, Reward- oder Stage-Logik indirekt wieder zentralisiert werden.
- Stage-Progression wird von `totalHarvested` entkoppelt und auf `stageProgressScore` umgestellt. Gewichte: DNA total `30%`, Prozess-Yields `25%`, Stabilitaet/Dichte `25%`, Oeko/Wasser/Biom `20%`.
- Harte Gates:
  Stage 2: `playerAliveCount >= 8`, `playerEnergyNet > 0`.
  Stage 3: mindestens `2` Yield-Kategorien `> 0`, `meanWaterField >= 0.10`.
  Stage 4: `clusterRatio >= 0.12`, mindestens `2` Biome aktiv genutzt.
  Stage 5: alle `4` Signalgruppen jeweils mindestens `60%` ihres Zielwerts, kein Kollaps-/Critical-Risk.
- Score-Schwellen: Stage 2 `>= 0.22`, Stage 3 `>= 0.44`, Stage 4 `>= 0.68`, Stage 5 `>= 0.86`.
- `playerStage` ist monoton nicht fallend. Nur `stageProgressScore` darf schwanken.

## Testplan und Failure-Bedingungen
- Contract-Gates muessen hart failen, wenn neue Felder oder Actions ohne vollstaendigen Eintrag in `stateSchema`, `actionSchema`, `mutationMatrix`, `simGate`, `dataflow` oder `manifest` eingefuehrt werden.
- UI-Konsolidierung muss nachweisbar machen: Main-Run zeigt genau fuenf Raeume und keine weiteren Legacy-Kontextzweige.
- Main-Run-UI und Main-Run-Dispatchpfade muessen hart verhindern: keine Dispatches zu `HARVEST_CELL` und keine Dispatches zu Roh-Brushes.
- Progressionstests muessen explizit beweisen: `totalHarvested` allein erhoeht `playerStage` nie mehr; hohe Scores ohne Pflicht-Gates erhoehen Stage nicht; `playerStage` faellt nie zurueck.
- Determinismustests muessen bitgleich beweisen: gleiches `(seed, preset)` erzeugt identische `water`-, `biomeId`- und Spawn-Felder; gleiches Seed mit anderem Preset erzeugt reproduzierbar andere Welten.
