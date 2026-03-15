# UPDATE NOTE — v2.6.0

## Kernpunkt
- Der Main Run hat jetzt seine Post-DNA-Struktur: kanonische Zonen, deterministische Pattern-Auswertung und echte Progressions-/Loss-Gates statt losen Telemetrie-Hoffnungen.

## Sichtbare Aenderungen
- Core-, DNA- und Infrastruktur-Commits schreiben jetzt in ein kanonisches Zonensystem.
- Patterns werden deterministisch erkannt und als `patternCatalog` / `patternBonuses` fuer Main-Run, Advisor und Progression bereitgestellt.
- Der Tech-Kaufpfad liest statische `runRequirements` direkt aus dem Tech-Tree statt implizite Sonderfaelle zu verteilen.
- Neue Result-only-Losepfade machen Main-Run-Fehlerhaerte explizit: `core_collapse`, `vision_break`, `network_decay`.
- Advisor und UI zeigen jetzt Pattern-/Infra-Status, blockierte Tech-Gruende und Result-Reason-Labels konsistent aus derselben Wahrheit.

## Technische Konsequenzen
- `tests/test-phase-e-integrity.mjs` und `tests/test-phase-f-progression-integrity.mjs` sind als harte `truth`-Gates verankert.
- Phase-F-Loss-Coverage wurde auf einen parametrischen Test zusammengezogen, statt drei fast identische Dateien mit denselben Assertions zu pflegen.
- `quick` und `truth` laufen auf dem aktuellen Stand gruen.

## Nicht in diesem Release geloest
- Kein Phase-G-Cleanup des grossen Reducers.
- Kein finales Preset-Balancing fuer `river_delta`, `dry_basin`, `wet_meadow`.
- Keine RC-Freigabe; G bleibt der noch offene Release-Block.
