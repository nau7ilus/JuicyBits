# Freitext-Eingang mit Rückfrage – Beleg

Gemessen am Fr 30.10.2026, 23:48–23:55 CET, Sokosumi Preprod, Personal Workspace, Coworker `JUICY_BIDS`. Eingabe: `examples/p4-pi-informatik.prompt.txt` (Freitext eines Nutzers, kein JSON).

## Ablauf
1. Der Nutzer legt einen Task mit Freitext an.
2. Der Worker erkennt, dass kein Firmenpass vorliegt. Das Modell erstellt daraus einen Firmenpass, der Code ergänzt fehlende Pflichtfelder und nennt sie als Annahmen. Für fehlende Kernangaben stellt der Code Rückfragen.
3. Der Coworker postet „So habe ich Ihre Anfrage verstanden“ und setzt den Task auf `INPUT_REQUIRED`.
4. Der Nutzer antwortet im Task mit „passt“ oder mit Korrekturen.
5. Der Coworker setzt den Task zurück auf `RUNNING`, bewertet und schließt mit dem Bericht ab. Der Bericht enthält den Abschnitt „So wurde Ihre Anfrage verstanden“.

**Core akzeptiert `INPUT_REQUIRED` und den erneuten Wechsel auf `RUNNING`, gesendet mit dem Coworker-Schlüssel.** Das war vorher nicht dokumentiert.

## Tasks

| Task-ID | Antwort des Nutzers | Rückfrage | Abschluss | Ergebnis |
|---|---|---|---|---|
| `01a18eff-7d07-752d-968f-5f36d27b786c` | „passt“ | 23:48:14 | 23:50:16 | 0 GO, 20 GO MIT AUFLAGE (Annahmen: 10.000–500.000 €, ab heute, keine Zertifikate) |
| `01a18f01-fbd5-76d7-8ae6-34346cd53687` | Leistungen, Ausschlüsse, ISO 27001, München, 50.000–300.000 €, ab 01.12.2026, eine Referenz | 23:50:46 | 23:55:04 | 0 GO, 14 GO MIT AUFLAGE, 11 NO-GO; Landtag und PAB-Datenbank je 66 |
| `01a18f01-f584-712e-91f2-93d659504f48` | (JSON-Firmenpass P3, keine Rückfrage) | – | ca. 23:52 | 1 GO, Landtagsverwaltung 73, wie bisher |

Berichte: `p4-freitext-passt-report.md`, `p4-freitext-korrektur-report.md`.

## Befunde
- Mit Korrekturen wird die Liste kürzer und genauer (20 auf 14 Treffer, mehr NO-GO durch die Ausschlüsse). Ein GO entsteht erst mit Referenzen; ohne drei vergleichbare Referenzen bleibt es bei GO MIT AUFLAGE.
- Im Korrektur-Bericht stehen noch Standard-Annahmen der ersten Runde („Verfügbar ab: heute“, „Auftragswert geschätzt“). Behoben danach im Code (`applyAnswer` entfernt überholte Standard-Annahmen, Test in `tender/intake.test.mjs`), noch nicht live wiederholt.
- Dauer: Rückfrage nach ca. 12 s, Bewertung nach Bestätigung ca. 2 min.
