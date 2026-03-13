# MANDATORY READING — KERNEL & SAFETY GATES

**STOP.** Bevor du auch nur eine Zeile Code schreibst, musst du verstehen:
Dieses Projekt ist **kein Spielplatz**, sondern ein **deterministisches System** mit harten Contract-Gates.

## 1. Die 3 Goldenen Regeln (Verletzung = Abbruch)

1.  **KERNEL IST GESETZ (`src/core/kernel`):**
    *   Niemals direkt den State mutieren. Nur Patches via `dispatch`.
    *   Der Kernel erzwingt Schemas. Was nicht im Schema steht, existiert nicht.
    *   Dateien in `src/core/kernel` dürfen **NICHT** verändert werden, es sei denn, du arbeitest am Kernel selbst (und hast die Erlaubnis).

2.  **MANIFEST IST VERTRAG (`src/project/project.manifest.js`):**
    *   Neue Daten? → Erst ins `stateSchema`.
    *   Neue Action? → Erst ins `actionSchema`.
    *   Neuer Schreibzugriff? → Erst in die `mutationMatrix`.
    *   **Ohne Manifest-Update läuft nichts.**

3.  **DETERMINISMUS IST PFLICHT:**
    *   **KEIN** `Math.random()`.
    *   **KEIN** `Date.now()`.
    *   Nur `rngStreams` aus dem Context verwenden.

## 2. Dein Arbeitsmodus

*   **Lesen vor Schreiben:** Öffne und lies `docs/LLM_ENTRY.md`.
*   **Validieren vor Committen:** Führe Tests aus.
*   **Keine Annahmen:** Wenn du einen Pfad nicht findest, STOPPE und melde es. Rate nicht.

**Bestätige:** "Ich habe die Mandatory Reading gelesen und werde die Gates respektieren."
