# STATUS — Current Head

## Snapshot (2026-03-18)
- Sim-Deaktivierung ist als Legacy-Scope gesetzt; der Runtime-Flag-Pfad ist dokumentiert.
- Founder-Setup ist auf genau `1/1` gestellt (`sim.founderBudget = 1`).
- UI ist auf Null-Adapter reduziert (`src/game/ui/ui.js` ist no-op, kein Build, kein Event-Binding).
- Tick-Determinismus im Runtime-Loop ist gehaertet (kein dt-cap, kein catchup-cap, tick-genauer catch-up via `while (acc >= stepMs)`).
- Bewegung ist im Browser-Live-Flow als verifizierter Teil der Gameplay-Probe markiert.
- Render-Feintuning (`renderAlpha`) ist noch ausstehend.

## Verifizierter Ist-Stand
- Sim-Runtime-Flag im aktuellen Head: `SIM_RUNTIME_DISABLED = false` in `src/app/main.js` (Abweichung zur gesetzten Legacy-Scope-Formulierung "Sim deaktiviert").
- Tick-Loop: `dt = Math.max(0, ts - lastTs)` und `while (acc >= stepMs)`.
- UI-Adapter: `setRenderInfo`, `sync` und Panel-Installer sind neutralisiert.
- Foundation-Eligibility verlangt exakt `founderBudget === 1` und `founderPlaced === 1`.

## Gates / Nachweise (aktuell gruen)
- `node tools/run-all-tests.mjs --full`
- `node tests/test-deterministic-genesis.mjs`
- `node tests/test-step-chain-determinism.mjs`
- `node tests/test-readmodel-determinism.mjs`
- `node tests/test-kernel-replay-truth.mjs`

## Bereinigt in diesem Sync
- Veraltete offene Punkte und erledigte Legacy-Referenzen entfernt.
- Statustext auf aktuellen Head reduziert (kein Legacy-Roadmap-Scrollblock).

## Naechste Session Startpaket
1. Einstieg: `docs/llm/ENTRY.md` -> `docs/WORKFLOW.md` -> diese `docs/STATUS.md`.
2. Scope fuer die naechste Arbeit: `ui+sim+versioning` (nur falls Pfade wirklich betroffen sind).
3. Preflight vor Schreiben:
   - `node tools/llm-preflight.mjs classify --paths <task-pfade>`
   - `node tools/llm-preflight.mjs entry --paths <task-pfade> --mode work`
   - `node tools/llm-preflight.mjs ack --paths <task-pfade>`
   - `node tools/llm-preflight.mjs check --paths <task-pfade>`
4. Startpunkt im Code:
   - `src/app/main.js` (Sim-Flag, Tick-Loop, Renderpfad)
   - `src/game/ui/ui.js` (neutraler Adapter)
   - `src/game/ui/ui.panels.js` / `src/game/ui/ui.feedback.js` (neutrale Verdrahtungs-Stubs)
5. Offener Arbeitsrest fuer den naechsten Block:
   - `renderAlpha`-Interpolation implementierungsnah festziehen und sichtbar pruefbar machen.
   - `24` Ticks/Sekunde als klare Laufzeitbasis im Browserfluss halten.
   - Erste interpolierte Zellbewegung im Browser sichtbar machen und als Replay-/Determinismus-vertraeglich dokumentieren.
