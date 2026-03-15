# WORKFLOW

## Zweck
Dies ist der einzige menschliche Einstieg in die Projektdoku.
Top-Level-Doku bleibt absichtlich klein:

1. `docs/WORKFLOW.md`
2. `docs/PRODUCT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/STATUS.md`

LLM-spezifische Regeln leben getrennt unter `docs/llm/`.

## Pflichtfolge Fuer LLM-Arbeit

### LESEN
1. `docs/llm/ENTRY.md`
2. `docs/ARCHITECTURE.md`
3. `docs/STATUS.md`
4. Task ueber `docs/llm/TASK_ENTRY_MATRIX.json` klassifizieren
5. Genau einen passenden Task-Entry lesen

### PRUEFEN
- `node tools/llm-preflight.mjs classify --paths <paths>`
- `node tools/llm-preflight.mjs ack --paths <paths>`
- `node tools/llm-preflight.mjs check --paths <paths>`

### SCHREIBEN
- Kein Schreiben ohne gelesenen LLM-Entry plus Task-Entry.
- Kein Test ohne gueltiges Ack.
- Kein Task-Mix ueber mehrere Scopes ohne Subtasks.

### DOKU
- Nur diese vier Top-Level-Dateien sind kanonische Produkt-/Projekt-Doku.
- LLM-spezifische Protokolle bleiben unter `docs/llm/`.
- Historische Altdateien wurden absichtlich entfernt statt weiter mitgeschleppt.

## Harte Regeln
- `docs/STATUS.md` ist die einzige Status-, Bugfix-, Release- und Change-History.
- `docs/ARCHITECTURE.md` ist die einzige technische Snapshot-Doku.
- `docs/PRODUCT.md` ist die einzige Produkt- und Scope-Basis.
- Screenshots und Vergleichsbilder bleiben in `docs/assets/`, sind aber keine Text-Source-of-Truth.

## Abbruchregel
Wenn ein Task weder in `docs/STATUS.md` noch in `docs/PRODUCT.md` oder `docs/ARCHITECTURE.md` sauber einordenbar ist:
- nicht schreiben
- Scope-Luecke benennen
- Doku zuerst klaeren
