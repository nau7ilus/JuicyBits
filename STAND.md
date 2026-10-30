# TenderScout – Stand und Testanleitung

Stand: Sa 31.10.2026, ca. 00:05. Für das ganze Team. Regeln und Befehle für Agenten: `AGENTS.md`.

## Kurzfassung
- Die Pipeline läuft von Anfang bis Ende: Firmenpass → Vorfilter → Bewertung nach T6 → Gegenprüfung → deutscher Bericht mit SHA-256.
- **Neu: Freitext statt JSON.** Kunden schreiben ihre Anfrage in normalen Sätzen. Der Coworker baut daraus den Firmenpass, fragt im Task nach („So habe ich Ihre Anfrage verstanden“, Status `INPUT_REQUIRED`) und bewertet nach „passt“ oder Korrekturen. Live geprüft: `docs/tickets/T12/freitext.md`. JSON-Firmenpässe funktionieren weiter ohne Rückfrage.
- **T12 ist erledigt:** Drei Sokosumi-Tasks (Preprod, Personal Workspace) sind durchgelaufen, Folgefrage als Kommentar wurde beantwortet. Beleg: `docs/tickets/T12/erster-task.md`.
- Daten: 14 Tage Bayern (16.–29.10.), 1566 Bekanntmachungen, 708 mit offener Angebotsfrist, Kontaktdaten geschwärzt.
- T5-Auswertung live: 6 von 8 Fällen wie erwartet, 2 teilweise (Erklärung unten).
- **Noch offen:** bezahlter Job auf Preprod (T13). Ohne T13 ist der Track nicht qualifiziert. Schrittplan mit Zeitschätzung: `docs/tickets/T13/plan.md`.

## Jetzt testen

### Einmalig (in WSL)
```sh
npm ci                       # in WSL; node_modules nicht mit Windows teilen (siehe Probleme)
cp .env.example .env         # nur falls noch keine .env da ist
npm run setup -- --check     # zeigt, was fehlt; ändert nichts
```
Für Tests ohne Sokosumi braucht ihr in `.env` nur `OPENAI_API_KEY` und `OPENAI_MODEL`. Ohne Key geht nur der Offline-Modus.

### Ohne Modell (sofort, kostet nichts)
```sh
npm test                                                    # 53 Tests
npm run scout -- examples/p1-alpendach.pass.json --offline  # Bericht mit Platzhalter-Bewertung
```

### Mit Modell, lokal
Terminal 1: `npm start` (Eve, wartet auf `server listening at http://127.0.0.1:21949/`)
Terminal 2, eins davon:
```sh
npm run try                                         # interaktiv: Firmenpass wählen, Felder ändern, Abgleich mit T5
npm run scout -- examples/p3-isarcode.pass.json     # ein Bericht, ca. 1,5 min
npm run eval                                        # alle T5-Fälle, ca. 4 min, Ergebnis in .local/eval.md
```
Nach Änderungen an `agent/instructions.md` Eve neu starten.

### Über Sokosumi (wie der Kunde es erlebt)
Nur vom Konto von D aus, bis der TUM-Workspace einen Seat hat (siehe Probleme). Drei Terminals in WSL:
```sh
npm start                                           # 1: Eve
npm run worker                                      # 2: Worker, wartet auf "Continuous worker running"
npm run task -- examples/p3-isarcode.pass.json      # 3: legt den Task an und wartet auf das Ergebnis (ca. 2 min)
```
`npm run task` schreibt den Bericht nach `.local/task-<id>.md`. Folgefrage stellen und Antwort lesen:
```sh
sokosumi --preprod tasks comment <TASK_ID> --comment "Warum ist Treffer 1 ein GO?" --json
sokosumi --preprod tasks events <TASK_ID> --json    # Antwort erscheint als Event des Coworkers, ca. 1 min
```
Teammitglieder ohne eigenes Setup: Firmenpass-JSON an D schicken, D legt den Task an und schickt Bericht und Task-ID zurück.

### Freitext-Anfrage über Sokosumi (empfohlen für Demo und Video)
```sh
npm run task -- examples/p4-pi-informatik.prompt.txt                  # zeigt die Rückfrage, dann selbst antworten:
sokosumi --preprod tasks comment <TASK_ID> --comment "passt" --json   # oder Korrekturen im Text
npm run task -- examples/p4-pi-informatik.prompt.txt --answer "passt" # antwortet automatisch
```
Eigene Anfrage: Textdatei anlegen (z. B. `examples/meine-firma.prompt.txt`) oder in Sokosumi Web einen Task an den Coworker `JUICY_BIDS` mit Freitext als Beschreibung anlegen. Ohne Antwort fährt der Worker nach 30 min mit den Annahmen fort (`INTAKE_WAIT_MINUTES`). Lokal ohne Sokosumi: `npm run scout -- examples/p4-pi-informatik.prompt.txt` (keine Rückfrage, Annahmen stehen im Bericht).

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
| T1 | Setup | fertig in WSL: Node 24, Sokosumi CLI **1.1.0**, Preprod-Login, Vendor und Coworker `JUICY_BIDS`, `COWORKER_ID` in `.env`, Worker-Credential im Vault |
| T2 | Datenquelle | fertig: OCDS + eForms, Import `data/import.mjs` |
| T3 | CPV-Codes | Katalog aus T4 in `tender/trades.mjs`, Branchencodes aus T6; Abgleich mit offizieller CPV-Liste offen (B1) |
| T4, T9 | Firmenpass | fertig: `tender/pass.mjs`, Felder in `docs/firmenpass.md` |
| T5 | Testfälle | fertig: `examples/` |
| T6 | Bewertungskriterien | fertig: Prompt `agent/instructions.md`, Punkte und Deckelungen in `tender/assess.mjs` |
| T7, T8 | Laden, Vorfilter | fertig: CPV-Stufen A–F, Frist, Region, Wert, Angebotsvorlauf, max. 25 Kandidaten |
| T10 | Bewertung + Bericht | fertig, live geprüft: `docs/tickets/T10/p3-isarcode-live-report.md` |
| T11 | Qualitätstest | begonnen: `docs/tickets/T11/t5-eval-live.md` |
| T12 | Erster Sokosumi-Job | **fertig**: `docs/tickets/T12/erster-task.md` (3 Tasks, Kommentar beantwortet); Freitext mit Rückfrage: `docs/tickets/T12/freitext.md` |
| T13 | Bezahlter Job | **offen**, Plan: `docs/tickets/T13/plan.md` (ca. 3–4 h, MPS-Setup, Registrierung, Zahlung, Receipt) |
| T14–T17 | Pitch, Video, Devfolio, README | nicht in diesem Repo sichtbar; README ist noch leer |
| T18 | Gegenprüfung | fertig: `tender/verify.mjs` |
| T19 | SHA-256 | fertig: JSON-Footer im Bericht |
| T20 | Prompt-Tuning | begonnen: To-do-Regel geschärft |
| T24, T25 | PDF, Agent als Kunde | offen (Could) |

## T5-Auswertung (live, OpenAI, 30.10. 17:00)

| Fall | T5 erwartet | Ergebnis |
|---|---|---|
| B5 Softwareentwicklung Landtagsverwaltung (P3) | GO | GO, 75 (auch im Sokosumi-Task, 23:12) |
| AIS.chat 5,5 VZÄ (P3), Helpdesk DPMA (P3) | NO-GO | NO-GO (eigene Ausschlüsse) |
| B2 Dachabdichtung (P1), Stahlbau (P1), B4 AVA Augsburg (P2) | NO-GO | vom Vorfilter aussortiert (Wert über Höchstwert, Frist unter 7 Tagen) |
| B1 Systemdach (P1), B3 Stadtbücherei (P2) | GO | GO MIT AUFLAGE, 62 und 65 (Sokosumi-Task P1: 58) |

B1 und B3: Beide Ausschreibungen verlangen drei Referenzen, die T5-Profile haben keine. Nach T6 ist das eine behebbare Lücke. Mit `references` in P1 und P2 sollten beide GO werden (B3 liefert die Referenzen, dann `npm run eval`).

## Wie die Bewertung funktioniert
- Vorfilter (Code): offene Ausschreibung, Bayern, Frist offen, CPV-Stufe A–E, Wert im Bereich, Angebotsvorlauf. Pro Verfahren nur die neueste Bekanntmachung.
- Modell: vergibt Teilpunkte (Eignung 35, Leistbarkeit 25, Wirtschaftlichkeit 25, Risiko 15), nennt K.O.-Gründe und To-dos.
- Code: rechnet Summe und Deckelungen, entscheidet GO (ab 70), GO MIT AUFLAGE (40–69), NO-GO. Bericht zeigt nur GO und GO MIT AUFLAGE.
- Fakten (Frist, Wert, CPV, Auftraggeber, Link) kommen immer aus den Daten, nie vom Modell.
- Freitext: `tender/intake.mjs`. Das Modell extrahiert Firmenname, Gewerk, Leistungen, Teamgröße. Der Code setzt Standardwerte (Bayern, ab heute, Auftragswert 10.000 € bis Teamgröße × 100.000 €, leere Zertifikatslisten) und nennt sie als Annahmen. Fehlende Leistungsdetails, Referenzen, Zertifikate, Auftragsgröße und Firmensitz fragt der Code nach. Details: `docs/firmenpass.md`, Abschnitt „Freitext statt JSON“.
- Sokosumi: Der Worker holt den Task, ruft die Pipeline mit der Task-Beschreibung (Firmenpass-JSON) auf und liefert den Bericht als Ergebnis. Kommentare beantwortet er aus derselben Modellsitzung; gab es keine (kein Kandidat, ungültiger Firmenpass), öffnet er eine neue mit dem Bericht als Kontext.

## Bekannte Probleme und Grenzen
- Dünne Freitext-Anfragen ergeben lange Listen mit vielen GO MIT AUFLAGE (P4 mit „passt“: 20). Mit Antworten auf die Rückfragen wird die Liste kürzer; ein GO braucht meist Referenzen. Für die Demo die Korrektur-Variante zeigen.
- Die Rückfrage gibt es nur über den Sokosumi-Worker. Bezahlte Jobs (MIP-003, Frist 20 min) und `npm run scout` laufen ohne Rückfrage mit Annahmen.
- **Sokosumi CLI 1.0.4 funktioniert nicht mehr** für `tasks create --personal` (Core antwortet 404 für `/v1/users/me/workspace-access`). Projektversion ist 1.1.0; `npm run setup` prüft darauf. Der Skill `tum-hackathon-agent` nennt noch 1.0.4.
- **node_modules nicht teilen:** Das Repo liegt unter `/mnt/c`. Ein unter Windows installiertes `node_modules` hat keine Linux-Bindings (Eve startet nicht: „Cannot find native binding“), und `npm ci` aus WSL scheitert, solange Windows die `.node`-Datei sperrt. Heute wurde nur `@rolldown/binding-linux-x64-gnu@1.2.12` nachinstalliert (ohne Änderung an package.json/lock), dabei ist das Windows-Binding weggefallen. Empfehlung: Eve und Worker nur in WSL laufen lassen; wer unter Windows testen will, braucht dort ein eigenes `npm ci` und dann wieder in WSL `npm install --no-save @rolldown/binding-linux-x64-gnu@1.2.12`.
- **TUM-Workspace:** `sokosumi --preprod workspaces check 01a17942-e6dd-724f-bae6-458b6a0f715a` meldet `taskSeatEligible: false`. Ohne Seat können dort keine Tasks laufen. Bei den Organisatoren anfragen; danach `sokosumi --preprod coworkers connect 01a18ec1-7125-7246-8a2f-90a46c82b611 --vendor-id 01a18ebe-e267-70ca-86f0-cab0a0a26130 --workspace-id 01a17942-e6dd-724f-bae6-458b6a0f715a --json`, auf `GRANTED` warten, `SOKOSUMI_ORGANIZATION_ID`/`_SLUG` (`tum-hackathon-u4ve65`) in `.env`, Worker neu starten.
- Der Worker listet Tasks mit dem OAuth-Login des Kontos. Vor Demo und Video `sokosumi --preprod auth status --json` prüfen und bei Bedarf `sokosumi --preprod auth login`.
- Wettbewerb, Preisanker und Folgepotenzial (T6) fehlen mangels Zuschlagsdaten; das Modell setzt die Mitte der Spanne.
- Vertragsstrafen, Preisgleitklauseln und Zahlungsbedingungen stehen meist nur in den Vergabeunterlagen; sie erscheinen als „Unklar“.
- Modellantworten schwanken leicht (B5 lag zwischen 69 und 77, Systemdach zwischen 58 und 62). Testfälle mit Grenzwerten mehrfach laufen lassen.
- Ein Lauf mit 25 Kandidaten dauert ca. 1,5–2 min, die Antwort auf einen Kommentar ca. 1 min.
- Daten enden am 29.10. Neue Tage nur per Hand-Download.
- 3 Template-Tests schlagen unter Windows fehl (Pfadtrenner, Dateirechte); in WSL sind alle 53 grün.

## Nächste Schritte (kritischer Pfad)
0. **Freitext live nachprüfen** (D): Korrektur-Task einmal wiederholen, ob die überholten Standard-Annahmen jetzt fehlen (Fix nach dem Live-Test).
1. **T13** (D, mit Freigabe je Schritt): `docs/tickets/T13/plan.md` abarbeiten: MPS per Docker Compose, Selling Wallet mit Test-ADA, `AGENT_AUTHOR` in `.env`, `payment-registration.mjs key|register`, Registrierung bestätigen lassen, `npm run api`, `PAID_TASKS_ENABLED=true`, bezahlter Task, Receipt prüfen. Tx-Hash und Receipt nach `docs/evidence.md`. Regel aus `tickets.json`: Läuft T13 bis 01:00 nicht, schlafen; Masumi-Support ist morgen früh erreichbar.
2. **TUM-Seat** (D): Organisatoren um Seat bitten, dann Coworker verbinden (siehe Probleme).
3. **T11/T20** (B3, D): P1 und P2 mit `references` ergänzen, `npm run eval`, Abweichungen in `docs/tickets/T11/abweichungen.md`.
4. **Daten** (B1): Export vom 30.10. (und 31.10.) nach `data/inbox/`, `npm run data:import`.
5. **T17/T22, T16/T23** (B3, B4): README und Devfolio mit den Zahlen und Grenzen von oben; Belege aus `docs/tickets/`.

## Offene Fragen an Masumi
Antworten laut Doku und Smart Contract (recherchiert in `docs/tickets/T13/plan.md`), von Masumi noch nicht bestätigt:
- Hash des Ergebnisses on-chain: **ja**, `submit-result` schreibt `result_hash` in das Contract-Datum; der Bericht ist damit an die Zahlung gebunden.
- Unter dem Angebotspreis abrechnen: **nein**, der Seller-Withdraw zahlt den vollen Contract-Wert oder es gibt einen vollständigen Refund. Festpreis bleibt 1 test USDM wie im Template.
- Neu: Käufer-Freigabe des Angebots in Sokosumi (Task billing owner approves quote) ist laut CLI-README geplant, nicht live. Ob der bezahlte Task über Sokosumi oder nur über MIP-003 (`npm run api`) läuft, muss T13 zeigen.
