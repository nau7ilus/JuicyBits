# T11 – Abweichungen zu T5

Stand: Sa 31.10.2026, 02:55; Nachtrag P3 ca. 11:00. Rollen D mit B3. Testfälle: `examples/t5-expected.json`, Läufe im Wortlaut: `t5-eval-live.md`.

## Kurzfassung
- Mit Referenzen in P1 und P2 sind **B1 (Systemdach) und B3 (Stadtbücherei) in beiden Läufen GO**. Das Referenz-To-do aus dem Vorlauf entfällt.
- Lauf 1: 8 von 8 wie erwartet. Lauf 2: 7 von 8, 1 teilweise.
- Einzige Abweichung: **B5 Landtagsverwaltung (P3)** schwankte um die GO-Grenze (72, 67, Diagnose 64). Ursache vor allem dünne Nachweise im Profil P3 und fehlende Angaben in der Bekanntmachung, nicht der Prompt. **Nachtrag 11:00:** Mit vervollständigtem P3 (drei Referenzen, Umsatzband, Versicherungssumme) ist B5 in zwei weiteren Läufen GO (81, 73); siehe unten.
- Kein Prompt-Vorschlag für T20 (Begründung unten).

## Läufe
| Lauf | Befehl | Zeit (31.10.) | Ergebnis |
|---|---|---|---|
| Vorlauf | `npm run eval` | 30.10., 17:00 | 6 von 8, 2 teilweise (B1, B3) |
| Lauf 1 | `npm run eval` | 02:44–02:48 | 8 von 8 |
| Lauf 2 | `npm run eval` | 02:48–02:53 | 7 von 8, 1 teilweise (B5) |
| Diagnose | nur P3, gleicher `run()`-Aufruf wie `npm run eval`, gibt zusätzlich Teilpunkte aus (Skript nicht im Repo) | 02:53–02:55 | B5 64, GO MIT AUFLAGE |

Bewertungszeitpunkt in allen Läufen: 30.10.2026, 18:00 (`now` in `t5-expected.json`). Eve lief durchgehend ohne Neustart, `agent/instructions.md` wurde in diesem Ticket nicht geändert.

## Ergebnis
| Fall | erwartet | Ergebnis Lauf 1 | Lauf 2 | Ursache |
|---|---|---|---|---|
| B1 Systemdach, Bernau (P1) | GO | GO, 75 | GO, 75 | wie erwartet; mit drei Referenzen kein To-do mehr |
| Dachabdichtung, Bauamt Erlangen-Nürnberg (P1) | NO-GO | Vorfilter | Vorfilter | Auftragswert über dem Höchstwert (wie erwartet) |
| Stahlbau, CPV-Falle 4526 (P1) | NO-GO | Vorfilter | Vorfilter | Auftragswert über dem Höchstwert (wie erwartet) |
| B3 Stadtbücherei/VHS Ingolstadt (P2) | GO | GO, 75 | GO, 82 | wie erwartet; mit drei Referenzen kein To-do mehr |
| B4 AVA Augsburg, Frist 3 Tage (P2) | NO-GO | Vorfilter | Vorfilter | Frist kürzer als der Angebotsvorlauf von 7 Tagen (wie erwartet) |
| B5 Landtagsverwaltung, 100 PT (P3) | GO | GO, 72 | **GO MIT AUFLAGE, 67** | Grenzfall: Summe knapp über oder unter 70, kein To-do und kein K.O.; dünne Nachweise in P3 (siehe unten) |
| AIS.chat, 5,5 VZÄ (P3) | NO-GO | NO-GO, 39 | NO-GO, 39 | eigener Ausschluss „Gesamtteam > 2 VZÄ“ (wie erwartet) |
| Helpdesk DPMA, 2.800 Anwender (P3) | NO-GO | NO-GO, 38 | NO-GO, 39 | eigener Ausschluss „1st-Level-Helpdesk > 500 Endanwender“ (wie erwartet) |

Die T5-Referenzwerte (88, 91, 90) stammen aus der Zeit vor dem T6-Punkteschema und sind nicht direkt vergleichbar. Bei B1, B3 und B5 fehlen Auftragswert und Wettbewerbsdaten; dafür gilt laut `agent/instructions.md` die Mitte der Spanne (`groesse` 5 von 10, `gewinnchance` 5 von 10). Teilpunkte liegen nur für B5 vor (Diagnose). Werte um 75–82 statt um 90 sind deshalb erwartbar.

## Was sich gegenüber dem Vorlauf geändert hat
| Fall | Vorlauf 30.10. 17:00 | Jetzt (Lauf 1 / Lauf 2) |
|---|---|---|
| B1 Systemdach (P1) | GO MIT AUFLAGE, 62; To-do: drei Referenzen über Bietergemeinschaft | GO, 75 / GO, 75; kein To-do |
| B3 Stadtbücherei (P2) | GO MIT AUFLAGE, 65; To-do: Bietergemeinschaft mit drei Referenzen | GO, 75 / GO, 82; kein To-do |
| B5 Landtagsverwaltung (P3) | GO, 75 | GO, 72 / GO MIT AUFLAGE, 67 |
| AIS.chat, DPMA (P3) | NO-GO, 39 und 39 | NO-GO, 39 und 38 / 39 und 39 |
| Vorfilter-Fälle | ausgeschlossen | unverändert ausgeschlossen |

Geändert wurde für Lauf 1 und 2 nur `references` in `examples/p1-alpendach.pass.json` und `examples/p2-isarglanz.pass.json`. P3 wurde erst für den Nachtrag (Lauf 3 und 4) vervollständigt, siehe unten.

## Neue Referenzen (fiktiv)
Alle Referenzen sind für den Test erfunden. Der Firmenpass hat kein Feld zur Kennzeichnung; vermerkt ist das in `examples/README.md`. Auftraggeber sind nur allgemein beschrieben (keine echten Namen, keine Kontaktdaten).

| Profil | Forderung der Bekanntmachung | Referenzen |
|---|---|---|
| P1 AlpenDach | B1: 3 Referenzen aus den letzten 5 Jahren (Formblatt 444: Leistungsgegenstand, Leistungsanteil, eigene Arbeitnehmer, technische Besonderheiten, Auftragswert); Leistung: Systemdach REI30 1.370 m², Auffangnetz, Dachverblechung | 2025 Bauhofhalle, Gemeinde Lkr. Rosenheim, Systemdach REI 30 ca. 1.250 m² mit Auffangnetz und Verblechung, 285.000 €, CPV 45261213 · 2024 Turnhalle Mittelschule Lkr. Traunstein, Systemdach mit Dämmung ca. 1.600 m², 340.000 €, CPV 45261410 · 2023 Gewerbehalle (privat) bei Rosenheim, Systemdach REI 30 ca. 900 m², Verblechung, Auffangnetze, 160.000 €, CPV 45261300 |
| P2 IsarGlanz | B3: 3 Referenzen aus den letzten fünf abgeschlossenen Geschäftsjahren, davon mindestens 2 vergleichbare Reinigungsleistungen in öffentlichen oder privaten Einrichtungen; Leistung: 5.664 m² NGF, 48 Monate | 2025 Gymnasium mit Turnhalle, Lkr. Eichstätt, ca. 6.200 m² NGF, 2023–2026, 330.000 €, CPV 90919300 · 2024 Stadtteilbibliothek, Oberbayern, ca. 2.400 m² NGF, 2022–2025, 165.000 €, CPV 90911200 · 2023 privater Bildungsträger Ingolstadt, ca. 3.500 m² NGF, 2021–2024, 190.000 €, CPV 90919200 |

Alle Werte liegen innerhalb `max_value_eur` und der Kapazitätsangaben der Profile (P1: bis 1.800 m² Dachfläche, 8 Mitarbeiter; P2: bis 8.000 m² NGF, 18 Reinigungskräfte).

## Verbleibende Abweichung: B5 (P3)
Teilpunkte im Diagnoselauf (Summe 64, CPV-Stufe A = 5 Punkte, kein To-do, kein K.O.):

| Kriterium | Punkte | Grund laut Daten und Profil |
|---|---|---|
| `zulassung` | 8 / 10 | keine Präqualifikation, Eigenerklärung reicht |
| `referenzen` | 5 / 15 | P3 hat eine Referenz ohne Jahr, Wert und CPV („EVB-IT Projekterfahrung Öffentlicher Sektor Bayern“); B5 verlangt in `selectionCriteria` keine Referenzen |
| `leistungsfaehigkeit` | 5 / 10 | P3 ohne `revenue_band_eur` und `liability_insurance_eur` |
| `leistungstext` | 5 / 5 | Kernleistung |
| `kapazitaet` | 5 / 10 | B5 nennt keinen Beginn (Prompt: „5 Beginn unbekannt“) |
| `entfernung` | 5 / 5 | München |
| `groesse` | 5 / 10 | Auftragswert fehlt in der Bekanntmachung |
| `gewinnchance` | 3 / 10 | Zuschlag 100 % Preis, `price_positioning` fehlt in P3 |
| `aufwand` | 3 / 5 | Qualitätskonzept verlangt |
| `risiko_abzug` | 0 | keine Sicherheitsleistung |

Gemessene Summen für B5 mit dem alten P3: 69–77 (laut `STAND.md`), 75 (Vorlauf), 72, 67, 64. Die Summe lag also seit jeher an der GO-Grenze; wenige Punkte Modellschwankung entschieden über GO oder GO MIT AUFLAGE.

Wahrscheinliche Ursache: **Profil P3** (eine Referenz ohne Jahr, Wert und CPV; kein Umsatzband, keine Versicherungssumme) und **Daten** (B5 ohne Auftragswert und Beginn). Beides drückte die Summe auf 64–75; dazu kam die bekannte Modellschwankung.

### Nachtrag 31.10., ca. 11:00: P3 vervollständigt
P3 hat jetzt drei fiktive Referenzen 2023–2025 mit Jahr, Wert (62.000–145.000 €), CPV (72262000, 72230000, 72212000) und Auftraggeberart (zwei öffentlich, eine privat; agile Java/TypeScript-Entwicklung nach EVB-IT, Abrechnung nach PT) sowie `revenue_band_eur` `250k-1M` und `liability_insurance_eur` 1.000.000 (vermerkt in `examples/README.md`). Zwei Läufe `npm run eval` danach (Lauf 3 und 4 in `t5-eval-live.md`): **B5 GO 81 und GO 73**, alle 8 Fälle wie erwartet. Die Summe liegt damit über der 70er-Grenze, in Lauf 4 aber nur um 3 Punkte; die Datenlücken der Bekanntmachung (kein Auftragswert, kein Beginn, Zuschlag 100 % Preis) bleiben und halten B5 bei den Ankerwerten 5/10 für `groesse` und `kapazitaet`. Nebenwirkung: Bei DPMA nennt das Modell den geforderten Jahresumsatz von 1,4 Mio. € jetzt als K.O. gegen das Umsatzband, statt ihn als „unklar“ zu behandeln; das Ergebnis NO-GO bleibt.

## Weitere Beobachtung (ohne Einfluss auf das Ergebnis)
- DPMA, Lauf 2: Zusätzlich zum eigenen Ausschluss nennt das Modell als K.O. „Der geforderte durchschnittliche Jahresumsatz von mindestens 1.400.000 Euro ist im Firmenpass nicht belegt“. P3 hat kein `revenue_band_eur`, der Umsatz ist also unklar. Nach `agent/instructions.md` ist ein „unklar“ weder K.O. noch To-do; die Regel steht bereits im Prompt, das Modell hat sie in diesem Lauf nicht befolgt. Das Ergebnis bleibt NO-GO wegen des eigenen Ausschlusses.

## T20: Prompt
Kein Änderungsvorschlag. Keine Abweichung ist eindeutig vom Prompt verursacht:
- B1 und B3 sind mit Profildaten behoben; der Prompt hat die fehlenden Referenzen richtig als To-do gewertet.
- B5 fällt durch Profil- und Datenlücken an die Grenze; die verwendeten Ankerwerte (Beginn unbekannt = 5, Wert unbekannt = 5) entsprechen dem Prompt.
- DPMA verletzt eine bestehende Regel, ohne Folgen für das Ergebnis.

Für T20 beobachten (kein Vorschlag; Grundlage ist nur ein Diagnoselauf):
- Teilpunkte zwischen den Ankerwerten (`referenzen` 5 bei Ankern 15/8/0, `leistungsfaehigkeit` 5 bei 10/6/0). Für „Ausschreibung verlangt keine Referenzen“ gibt der Prompt keinen Anker.
- `gewinnchance` 3 statt der Mitte der Spanne, obwohl Preisposition und Wettbewerb unbekannt sind.

Vor einer Prompt-Änderung zuerst P3 vervollständigen und die Teilpunkte über mindestens zwei Läufe vergleichen. `npm run eval` gibt keine Teilpunkte aus; dafür ist ein Diagnoselauf wie oben nötig.
