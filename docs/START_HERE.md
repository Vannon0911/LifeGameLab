# START_HERE

## EINZIGER GLOBALER EINSTIEG
Diese Datei ist der einzige globale Einstieg fuer LLM-Arbeit in diesem Repo.

Alle anderen globalen Hinweise sind nachrangig.
Sie duerfen keine abweichenden Regeln, Reihenfolgen oder alternativen Arbeitsablaeufe definieren.

Wenn andere globale Dateien widersprechen:
- `START_HERE` hat Vorrang
- abweichende globale Regeln sind als veraltet zu behandeln

---

## PFLICHTREIHENFOLGE VOR JEDER OPERATIVEN ARBEIT

Vor jeder operativen Arbeit MUSS exakt diese Reihenfolge eingehalten werden:

1. `docs/LLM_ENTRY.md`
2. `docs/PROJECT_STRUCTURE.md`
3. `docs/PROJECT_CONTRACT_SNAPSHOT.md`
4. Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
5. Nur den passenden Task-Entry lesen:

- `docs/llm/ui/UI_TASK_ENTRY.md`
- `docs/llm/sim/SIM_TASK_ENTRY.md`
- `docs/llm/contracts/CONTRACT_TASK_ENTRY.md`
- `docs/llm/testing/TESTING_TASK_ENTRY.md`
- `docs/llm/versioning/VERSIONING_TASK_ENTRY.md`

Erst danach darf task-spezifische operative Arbeit beginnen.

---

## VERBINDLICHER ZYKLUS PRO (SUB)TASK

Jeder Task und jeder Subtask muss strikt in dieser Reihenfolge bearbeitet werden:

**LESEN -> PRUEFEN -> SCHREIBEN -> DOKU**

Diese Reihenfolge ist verpflichtend.
Sie darf nicht uebersprungen, verkürzt, zusammengelegt oder global fuer mehrere Tasks wiederverwendet werden.

---

## HARTE REGELN

- Kein **SCHREIBEN** ohne vorheriges Lesen von:
  - `docs/LLM_ENTRY.md`
  - passendem Task-Entry

- Kein **TEST** ohne gueltiges Ack:
  - `.llm/entry-ack.json`
  - Ack muss zum aktiv klassifizierten Task passen

- Kein **Taskwechsel** ohne:
  - neue Klassifikation
  - neues passendes Ack

- Grosse Aufgaben muessen in **Subtasks** zerlegt werden.
  Jeder Subtask durchlaeuft erneut:
  **LESEN -> PRUEFEN -> SCHREIBEN -> DOKU**

- Task-spezifische Doku hat Vorrang.

- `docs/MASTER_CHANGE_LOG.md` ist nur:
  - globale Fallback-Ansicht
  - vollständige Aenderungshistorie
  - Notfallreferenz, wenn keine engere task-spezifische Doku verfuegbar ist

- `docs/MASTER_CHANGE_LOG.md` ist **nicht** die primaere Arbeitsgrundlage fuer operative Tasks.

- Ohne korrekt gelesene Einstiegsdokumente und ohne passenden Task-Entry ist kein operativer Codezugriff erlaubt.

---

## ABRUCHREGEL

Wenn einer der Pflichtschritte fehlt, unklar ist oder nicht zum aktiven Task passt:

- kein Schreiben
- kein Test
- kein Patch
- kein Taskwechsel
- keine operative Umsetzung

Dann ist nur erlaubt:
- lesen
- klassifizieren
- fehlende Pflichtquellen nachziehen
- Abbruchgrund benennen

---

## AUSLEGUNGSREGEL

Diese Datei definiert den globalen LLM-Arbeitsrahmen.

Sie ist nicht als Empfehlung zu lesen, sondern als verbindliches Repo-Protokoll.
