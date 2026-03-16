# TRACEABILITY

## Zweck
Diese Ablage haelt nur die kleinstmoeglichen Repo-internen Nachweise, die fuer Rueckverfolgung des aktuellen kanonischen Zustands noetig sind.

## Regeln
- Keine Screenshots, keine Vergleichsbilder, keine Massenausgaben aus `output/`.
- Nur kleine Textbelege, auf die `docs/STATUS.md`, `docs/ARCHITECTURE.md` oder `README.md` direkt verweisen.
- Wenn ein neuer offizieller Vollbeleg den alten ersetzt, darf der alte Beleg entfernt werden, sobald `STATUS.md` auf den neuen zeigt.

## Aktueller W1-Beleg
- Vollbeleg: `docs/traceability/w1-proof-summary.md`
- Herkunft: offizieller Lauf `node tools/run-all-tests.mjs --full`
- Zweck: claim-scoped W1-Truth fuer `no_bypass_surface`, `genesis_mainline_deterministic` und die aktuelle LLM-/Regression-Gate-Linie.
