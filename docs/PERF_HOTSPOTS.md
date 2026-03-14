# PERF_HOTSPOTS

Messung statt Bauchgefuehl.

## Quelle
- Kommando: `node tools/profile-core.mjs`
- Datum: 2026-03-14

## Ergebnis
- `32x32`: `6.005 ms_per_tick`
- `64x64`: `5.344 ms_per_tick`
- `96x96`: `8.887 ms_per_tick`

## Interpretation
- Der klare Hotspot liegt beim grossen Grid (`96x96`), nicht pauschal in "allen langen Tests".
- Determinismus-Tests sind lang wegen Wiederholung/Hash-Vergleich, nicht zwingend wegen Sim-Defekt.

## Naechste gezielte Messpunkte
1. `runRemoteClusterAttacks` gegen `N` und aktive Clusterzahl profilieren.
2. Birth-/Neighbour-Loop in `step.js` phasenweise mit Tick-Anteilen messen.
3. Renderkosten (`renderMsEma`) getrennt nach `quality` und `renderEvery` loggen.
