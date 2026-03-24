# Changelog

Alle relevanten Aenderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format orientiert sich an Keep a Changelog und Semantic Versioning.

## [Unreleased]
### Added
- `devtools/determinism-seed-matrix.mjs` fuer deterministische Zwei-Prozess-Replay-Pruefung pro Seed.
- npm-Script `test:determinism:matrix` fuer reproduzierbare Seed-Matrix-Laeufe.

### Changed
- README erweitert um den Abschnitt "Kernel v1.5 Determinism Proof (App 0.9.0)" mit Funktionsprinzip, Beweisweg und Self-Test-Anleitung.
- Traceability-/Evidence-Claims auf RTS-Mainline (`claim.w1.rts_mainline_deterministic`) und `after-worldgen` als Truth-Anchor ausgerichtet.

## [0.9.0] - 2026-03-21
### Added
- Umfassender GitHub-Auftritt mit neuen Community- und Maintainer-Dateien
- `.github`-Issue-Templates fuer Bugs und Features
- Pull-Request-Template und Basis-CI-Workflow
- Dokumente: `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, `CODE_OF_CONDUCT.md`

### Changed
- `README.md` auf klaren GitHub-Einstieg und Projektstatus ausgerichtet
