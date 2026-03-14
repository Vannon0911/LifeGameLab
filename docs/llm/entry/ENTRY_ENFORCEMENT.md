# Entry Enforcement

`docs/LLM_ENTRY.md` ist verpflichtend vor jeder technischen Umsetzung.

## Pflichtmechanik

- `node tools/llm-preflight.mjs ack --task <scope>` erzeugt lokales Ack in `.llm/entry-ack.json`.
- `npm run llm:ack` setzt das Standard-Ack fuer `testing`.
- `node tools/llm-preflight.mjs check` validiert:
  - Hash von `docs/LLM_ENTRY.md` gegen `docs/llm/entry/LLM_ENTRY_LOCK.json`
  - Vorhandensein spezialisierter Task-Entry-Dateien
  - gueltiges Ack mit passendem Entry-Hash
- `tools/run-test-suite.mjs` ruft `check` vor jeder Suite auf und bricht bei Fehler hart ab.

## Gueltigkeitsregel

- Ack ist nur gueltig, wenn der gespeicherte Entry-Hash exakt zum aktuellen Lock passt.
- Bei Aenderung an `docs/LLM_ENTRY.md` muss Lock aktualisiert und Ack neu gesetzt werden.
