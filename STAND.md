# TenderScout – Stand und Testanleitung

Stand: Fr 30.10.2026, ca. 21:30. Für das ganze Team. Regeln und Befehle für Agenten: `AGENTS.md`.

## Kurzfassung
- Die Pipeline läuft lokal von Anfang bis Ende mit OpenAI: Firmenpass → Vorfilter → Bewertung nach T6 → Gegenprüfung → deutscher Bericht mit SHA-256.
- Daten: 14 Tage Bayern (16.–29.10.), 1566 Bekanntmachungen, 864 Ausschreibungen, Kontaktdaten geschwärzt.
- T5-Auswertung live: 6 von 8 Fällen wie erwartet, 2 teilweise (Erklärung unten).
- **Noch nicht gemacht:** Anbindung an Sokosumi (T12) und bezahlter Job (T13). Ohne T13 ist der Track nicht qualifiziert.

## Jetzt testen

### Einmalig
```sh
npm ci                       # in dem System, in dem ihr testet (WSL oder Windows), node_modules nicht teilen
cp .env.example .env         # nur falls noch keine .env da ist
npm run setup -- --check     # zeigt, was fehlt; ändert nichts
```
In `.env` braucht ihr für Tests nur `OPENAI_API_KEY` und `OPENAI_MODEL`. Ohne Key geht nur der Offline-Modus.

### Ohne Modell (sofort, kostet nichts)
```sh
npm test                                                    # 53 Tests, 3 schlagen nur unter Windows fehl (siehe unten)
npm run scout -- examples/p1-alpendach.pass.json --offline  # Bericht mit Platzhalter-Bewertung
```

### Mit Modell
Terminal 1: `npm start` (Eve, wartet auf `server listening at http://127.0.0.1:21949/`)
Terminal 2, eins davon:
```sh
npm run try                                         # interaktiv: Firmenpass wählen, Felder ändern, Abgleich mit T5
npm run scout -- examples/p3-isarcode.pass.json     # ein Bericht, ca. 1,5 min
npm run eval                                        # alle T5-Fälle, ca. 4 min, Ergebnis in .local/eval.md
```
Nach Änderungen an `agent/instructions.md` Eve neu starten.

### Eigenen Fall testen
1. Firmenpass als JSON anlegen, Vorlage: `examples/p1-alpendach.pass.json`, Felder: `docs/firmenpass.md`.
2. `npm run scout -- <datei> --offline` zeigt Fehler im Firmenpass.
3. Mit Modell laufen lassen, Ergebnis gegen die Bekanntmachung prüfen (Link im Bericht).
4. Für dauerhafte Testfälle: Skill `.claude/skills/tender-test-cases/SKILL.md`.

### Neue Daten
Exporte (OCDS und eForms pro Tag) von Hand nach `data/inbox/` laden, dann `npm run data:import`. Anleitung: `data/README.md`.

## Stand je Ticket

| Ticket | Inhalt | Stand |
|---|---|---|
| T1 | Setup | Node 24, Sokosumi CLI 1.0.4 und Preprod-Login laufen unter Windows; OpenAI läuft. **Offen:** Vendor und Coworker anlegen, `COWORKER_ID`; Node 24 in WSL |
| T2 | Datenquelle | fertig: OCDS + eForms, Import `data/import.mjs` |
| T3 | CPV-Codes | Katalog aus T4 in `tender/trades.mjs`, Branchencodes aus T6; Abgleich mit offizieller CPV-Liste offen (B1) |
| T4, T9 | Firmenpass | fertig: `tender/pass.mjs`, Felder in `docs/firmenpass.md` (inkl. Radius, Kapazität, Wünsche) |
| T5 | Testfälle | fertig, ins Firmenpass-Format übertragen: `examples/` |
| T6 | Bewertungskriterien | fertig: Prompt `agent/instructions.md`, Punkte und Deckelungen in `tender/assess.mjs` |
| T7, T8 | Laden, Vorfilter | fertig: CPV-Stufen A–F, Frist, Region, Wert, Angebotsvorlauf, max. 25 Kandidaten |
| T10 | Bewertung + Bericht | fertig, live geprüft: `docs/tickets/T10/p3-isarcode-live-report.md` |
| T11 | Qualitätstest | begonnen: `docs/tickets/T11/t5-eval-live.md` |
| T12 | Erster Sokosumi-Job | **offen** (siehe nächste Schritte) |
| T13 | Bezahlter Job | **offen** |
| T14–T17 | Pitch, Video, Devfolio, README | nicht in diesem Repo sichtbar |
| T18 | Gegenprüfung | fertig: `tender/verify.mjs` |
| T19 | SHA-256 | fertig: JSON-Footer im Bericht |
| T20 | Prompt-Tuning | begonnen: To-do-Regel geschärft |
| T24, T25 | PDF, Agent als Kunde | offen (Could) |

## T5-Auswertung (live, OpenAI)

| Fall | T5 erwartet | Ergebnis |
|---|---|---|
| B5 Softwareentwicklung Landtagsverwaltung (P3) | GO | GO, 75 |
| AIS.chat 5,5 VZÄ (P3), Helpdesk DPMA (P3) | NO-GO | NO-GO (eigene Ausschlüsse) |
| B2 Dachabdichtung (P1), Stahlbau (P1), B4 AVA Augsburg (P2) | NO-GO | vom Vorfilter aussortiert (Wert über Höchstwert, Frist unter 7 Tagen) |
| B1 Systemdach (P1), B3 Stadtbücherei (P2) | GO | GO MIT AUFLAGE, 62 und 65 |

B1 und B3: Beide Ausschreibungen verlangen drei Referenzen, die T5-Profile haben keine. Nach T6 ist das eine behebbare Lücke. Mit `references` in P1 und P2 sollten beide GO werden (B3).

## Wie die Bewertung funktioniert
- Vorfilter (Code): offene Ausschreibung, Bayern, Frist offen, CPV-Stufe A–E, Wert im Bereich, Angebotsvorlauf. Pro Verfahren nur die neueste Bekanntmachung.
- Modell: vergibt Teilpunkte (Eignung 35, Leistbarkeit 25, Wirtschaftlichkeit 25, Risiko 15), nennt K.O.-Gründe und To-dos.
- Code: rechnet Summe und Deckelungen, entscheidet GO (ab 70), GO MIT AUFLAGE (40–69), NO-GO. Bericht zeigt nur GO und GO MIT AUFLAGE.
- Fakten (Frist, Wert, CPV, Auftraggeber, Link) kommen immer aus den Daten, nie vom Modell.

## Bekannte Probleme und Grenzen
- 3 Template-Tests schlagen unter Windows fehl (Pfadtrenner, Dateirechte). Laufzeit ist nicht betroffen; unter WSL sollten sie grün sein (noch nicht geprüft).
- Unter Windows ruft der Worker `sokosumi` direkt auf; das kann an der `.cmd`-Datei scheitern. Für T12 deshalb WSL nutzen oder vorher testen.
- Wettbewerb, Preisanker und Folgepotenzial (T6) fehlen mangels Zuschlagsdaten; das Modell setzt die Mitte der Spanne.
- Vertragsstrafen, Preisgleitklauseln und Zahlungsbedingungen stehen meist nur in den Vergabeunterlagen; sie erscheinen als „Unklar“.
- Modellantworten schwanken leicht (B5 lag zwischen 69 und 77). Testfälle mit Grenzwerten mehrfach laufen lassen.
- Ein Lauf mit 25 Kandidaten dauert ca. 1,5 min.
- Daten enden am 29.10. Neue Tage nur per Hand-Download.
- `npm run setup` erwähnt `OPENAI_BASE_URL`; der Agent nutzt sie nicht mehr (Eve-OpenAI-Anbindung, Standard-Endpunkt).
- `npm run try` zählt in der Zusammenfassung „gelistet“ inklusive NO-GO.

## Nächste Schritte (kritischer Pfad)
1. **T12** (D): Vendor und Coworker anlegen (Skill `tum-hackathon-agent`, Schritt 2), `COWORKER_ID` in `.env`. Dann im Code `answer` durch `scout` ersetzen in `worker.mjs` (Ergebnis und `createPaidAdapter`) und `agent-api.mjs`, Eingabeschema in `agent-api.mjs` auf „Firmenpass (JSON)“. `npm start` + `npm run worker`, Task mit Firmenpass als Beschreibung anlegen, Folgefrage als Kommentar testen.
2. **T13** (D): Preprod-Zahlung nach Template-README, Tx-Hash und Seller-Receipt in `docs/evidence.md`. Danach Zahlungsstrecke einfrieren.
3. **T11/T20** (B3, D): P1 und P2 mit Referenzen ergänzen, `npm run eval`, Abweichungen in `docs/tickets/T11/abweichungen.md`.
4. **T17/T22, T16/T23** (B3, B4): README und Devfolio mit den Zahlen und Grenzen von oben; Belege aus `docs/`.

## Offene Fragen an Masumi
- Wird ein Hash des Ergebnisses bei Abschluss on-chain gespeichert? (betrifft „Bericht an Zahlung gebunden“)
- Kann der Verkäufer unter dem Angebotspreis abrechnen? Bis zur Antwort: Festpreis 1 test USDM wie im Template.
