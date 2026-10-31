# JuicyBids – Stand und Testanleitung

Stand: Sa 31.10.2026, ca. 11:15. Für das ganze Team. Regeln und Befehle für Agenten: `AGENTS.md`.

## Kurzfassung
- **T13 ist komplett belegt, Track qualifiziert.** JuicyBids ist als Masumi-Agent auf Cardano Preprod registriert und steht in der Sokosumi-Galerie (100 Credits = 1 tUSDM); Registrierung und Galerie-Eintrag tragen noch den alten Namen „TenderScout“ (nach T13 eingefroren). Ein bezahlter Job lief am 31.10. um 02:39–03:26 durch: Sokosumi hat 1 tUSDM im Escrow gesperrt, der Ergebnis-Hash steht on-chain und passt zum Bericht, und um 03:26 hat der MPS **1,000000 tUSDM netto an unsere Selling Wallet** ausgezahlt (geprüft 10:52 mit `npm run receipt`). Beleg mit allen Tx-Hashes: `docs/tickets/T13/beleg.md`. Kasse: `docs/einnahmen.md`.
- **Neu 31.10., 11:15: Agent beauftragt Agent.** Bei dünnen Freitext-Anfragen mit Firmenname kann JuicyBids einen Recherche-Agenten aus der Sokosumi-Galerie buchen und aus eigenen Credits bezahlen (`tender/research.mjs`, Konfiguration `RESEARCH_AGENT_ID`, `RESEARCH_MAX_CREDITS`, `RESEARCH_TIMEOUT_MINUTES` in `.env`). Funde füllen nur Lücken und stehen als „aus Recherche:“ in den Annahmen; Job-ID und Credits werden genannt. Die Eingabe folgt dem Schema des fremden Agenten (`RESEARCH_INPUT_TEMPLATE`, Platzhalter `{company}` `{location}` `{trade}` `{brief}`). Gebaut, 8 Unit-Tests. **Kein Live-Lauf, nichts abgebucht:** am 31.10. zwischen 11:05 und 11:30 mit Budget bis 400 Credits elf Galerie-Agenten geprüft. Company Researcher, Midesk, Statista Key Insight, Statista Research, Reddit Research: `input-schema` 404/422. Basic News Research, LinkedIn Analysis, Statista Single Answer: `/start_job` antwortet nicht MIP-003-konform (ZodError). PersonaTwin, Chronos News (beide Einträge): 502 beim Start. AI-Aura: lehnt jede Eingabe mit 422 ab, Schema unbekannt (zehn Feldnamen probiert). Die On-chain-Registry (Policy `67ab0c92…`, 1057 Assets) nennt keinen weiteren Recherche-Agenten mit erreichbarer URL. Sobald ein Agent funktioniert: ID, Credits und Template in `.env`, Worker neu starten, `npm run task -- examples/p4-pi-informatik.prompt.txt`.
- **Neu 31.10., 11:45: Bericht als Dashboard und PDF.** Markdown und PDF beginnen mit Kopfzeile, Schlagzeile („N Ausschreibungen, die Sie realistisch gewinnen können.“), Firmenpass-Streifen (Gewerk, Region, Auftragsgröße, frei ab, Nachweise), Hinweis „Bezahlt auf Cardano“, Ergebnistabelle (Ausschreibung mit Auftraggeber und wichtigster Auflage, Frist, Wert, GO-Badge, Punkte als Balken, Link „Öffnen“), Summenzeile und zwei Kästen „NO-GO. Darum.“ und „So entsteht die Punktzahl.“; danach die Treffer im Detail mit vier Block-Balken. `npm run scout -- <pass> --pdf` schreibt zusätzlich `.local/report-<zeit>.md` und `.pdf` (`tender/pdf.mjs`, pdfkit 0.20.2, A4, gezeichnete Balken, SHA-256 des Markdown im Fuß). **Seit 12:45 kommt das PDF beim Kunden an:** Sokosumi nimmt nur Text, deshalb schreiben bezahlter Job und Coworker das PDF nach `.local/reports/<Job- oder Task-ID>.pdf`, und der Bericht enthält oben den Link `AGENT_PUBLIC_URL/reports/<ID>.pdf` (`tender/delivery.mjs`). `agent-api.mjs` hat dafür eine reine Lese-Route bekommen; die vier MIP-003-Endpunkte, Zahlung und Hash sind unverändert, der Link steht im gehashten Bericht. Scheitert das PDF, geht der Bericht ohne Link raus. Hinweis: ngrok-free zeigt Browsern vor dem PDF eine Warnseite („Visit Site“ klicken). Live geprüft 13:05: Sokosumi-Task `01a191d3-0d64-75ad-87e5-60b561e29c9b` enthielt den Link, der Download über die ngrok-URL lieferte `application/pdf`, 19.375 Bytes. Der bezahlte Weg nutzt denselben Code (`scout(…,{reportId})`), ist aber nicht neu bezahlt getestet. Beispiel eines vollständigen Laufs: `examples/ergebnis/`. Worker und API laufen in tmux jetzt in `while true`-Schleifen und starten nach jedem Ende neu (vorher stoppte die Schleife, weil `tee` den Exit-Code verschluckte und der Worker bei SIGTERM mit 0 endet). 74 Tests grün.
- **Neuer Name:** TenderScout heißt jetzt JuicyBids (Repo, Doku, Berichte, Prompt). Nur das On-chain-NFT, der Galerie-Eintrag und die gelieferten Belege behalten „TenderScout“.
- Bezahlt wird über den **Masumi-Agenten** (MIP-003-API, öffentlich per ngrok), nicht über den Coworker. Sokosumi bezahlt Coworker-Tasks noch nicht (CLI-README 1.1.0). Der Coworker `JUICY_BIDS` läuft weiter unbezahlt.
- Wie andere Teams, Coworker und KI-Assistenten JuicyBids buchen: `docs/tickets/T13/zugang-fuer-andere.md`. Büro-Assistent als Kunde (T25): `npm run assistant`.
- Die Pipeline läuft von Anfang bis Ende: Firmenpass → Vorfilter → Bewertung nach T6 → Gegenprüfung → deutscher Bericht mit SHA-256.
- **Neu: Freitext statt JSON.** Kunden schreiben ihre Anfrage in normalen Sätzen. Der Coworker baut daraus den Firmenpass, fragt im Task nach („So habe ich Ihre Anfrage verstanden“, Status `INPUT_REQUIRED`) und bewertet nach „passt“ oder Korrekturen. Live geprüft: `docs/tickets/T12/freitext.md`. JSON-Firmenpässe funktionieren weiter ohne Rückfrage.
- **T12 ist erledigt:** Drei Sokosumi-Tasks (Preprod, Personal Workspace) sind durchgelaufen, Folgefrage als Kommentar wurde beantwortet. Beleg: `docs/tickets/T12/erster-task.md`.
- Daten: 14 Tage Bayern (16.–29.10.), 1566 Bekanntmachungen, 708 mit offener Angebotsfrist, Kontaktdaten geschwärzt.
- T5-Auswertung live (31.10.): Lauf 1 8 von 8, Lauf 2 7 von 8 (B5 mit dünnem P3 bei 64–77). Seit 11:00 hat P3 drei fiktive Referenzen, Umsatzband und Versicherungssumme: Lauf 3 und 4 je 8 von 8, B5 bei 81 und 73 (`docs/tickets/T11/t5-eval-live.md`).

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

### Bezahlt über die Sokosumi-Galerie (T13, kostet 100 Credits)
Läuft nur, solange auf dem Rechner von D die tmux-Sitzung `juicybids` (Eve, API, ngrok, Worker) und Docker (Masumi Payment Service) laufen. Zuschauen: `tmux attach -t juicybids` (Fenster mit Strg+b, 0–3; abkoppeln mit Strg+b, d).
```sh
npm run assistant -- examples/p3-isarcode.pass.json     # Büro-Assistent (T25): sucht JuicyBids (Galerie-Name „TenderScout“), fragt nach, bucht, holt den Bericht
# oder direkt (Datei {"prompt": "<Freitext oder Firmenpass>"}):
sokosumi --preprod agents hire 01a18f8f-7091-74ae-88a7-8b4856955f83 --input-file anfrage.json --max-credits 100 --json
sokosumi --preprod jobs get <JOB_ID> --json            # payment_pending → processing → completed, ca. 5 min
npm run receipt -- <MIP-003-Job-ID>                     # nach ca. 36 min: Auszahlung an die Selling Wallet prüfen (Job-ID aus .local/standard-jobs/)
```
In Sokosumi Web: Agentengalerie, „TenderScout“ suchen (so heißt JuicyBids dort; der Galerie-Eintrag ist nach T13 eingefroren). Er steht weit hinten, solange er wenige Jobs hat; `sokosumi agents list` zeigt nur die ersten 20 Agenten. Bezahlte Jobs fragen nicht nach, die Annahmen stehen im Bericht.

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
| T11 | Qualitätstest | fertig für T5: 2 Live-Läufe am 31.10., `docs/tickets/T11/abweichungen.md`, Rohdaten `docs/tickets/T11/t5-eval-live.md` |
| T12 | Erster Sokosumi-Job | **fertig**: `docs/tickets/T12/erster-task.md` (3 Tasks, Kommentar beantwortet); Freitext mit Rückfrage: `docs/tickets/T12/freitext.md` |
| T13 | Bezahlter Job | **fertig**: Registrierung on-chain, Galerie, bezahlter Job mit Lock- und Result-Tx, `docs/tickets/T13/beleg.md`. Auszahlung belegt: Withdraw-Tx `831aa978…e279` um 03:26, +1,000000 tUSDM an der Selling Wallet (`docs/einnahmen.md`) |
| T14–T17 | Pitch, Video, Devfolio, README | nicht in diesem Repo sichtbar; README ist noch leer |
| T18 | Gegenprüfung | fertig: `tender/verify.mjs` |
| T19 | SHA-256 | fertig: JSON-Footer im Bericht |
| T20 | Prompt-Tuning | To-do-Regel geschärft; nach den Läufen vom 31.10. keine weitere Prompt-Änderung nötig (Beobachtungspunkte in `docs/tickets/T11/abweichungen.md`) |
| T24 | PDF-Export | fertig 31.10.: `tender/pdf.mjs`, Auslieferung als Link über eine Lese-Route in `agent-api.mjs` (MIP-003-Endpunkte unverändert) |
| T25 | Agent als Kunde | gebaut: `npm run assistant`, `docs/tickets/T25/agent-als-kunde.md`; Buchung bis zum Ende noch nicht gemessen |

## T5-Auswertung (live, OpenAI, 31.10., zwei Läufe)
P1 und P2 haben jetzt fiktive Referenzen (gekennzeichnet in `examples/README.md`). Details: `docs/tickets/T11/abweichungen.md`.

| Fall | T5 erwartet | Lauf 1 | Lauf 2 |
|---|---|---|---|
| B1 Systemdach (P1) | GO | GO 75 | GO 75 |
| B3 Stadtbücherei (P2) | GO | GO 75 | GO 82 |
| B5 Softwareentwicklung Landtagsverwaltung (P3) | GO | GO 72 | GO MIT AUFLAGE 67 |
| AIS.chat 5,5 VZÄ (P3), Helpdesk DPMA (P3) | NO-GO | NO-GO 39 / 38 | NO-GO 39 / 39 |
| B2 Dachabdichtung, Stahlbau (P1), B4 AVA Augsburg (P2) | NO-GO | Vorfilter | Vorfilter |

B5 schwankte mit dem alten P3 zwischen 64 und 77 (auch bezahlter Job: 68). Ursache war das dünne Profil (eine Referenz ohne Jahr, Wert und CPV), nicht der Prompt. Seit 31.10., 11:00 hat P3 drei Referenzen mit Jahr, Wert und CPV, `revenue_band_eur` und `liability_insurance_eur`; danach zwei Läufe 8 von 8 mit B5 bei 81 und 73. Die Bekanntmachung nennt weiter keinen Wert und keinen Beginn, ein Ausreißer nach unten bleibt möglich.

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
- 3 Template-Tests schlagen unter Windows fehl (Pfadtrenner, Dateirechte); in WSL sind alle 66 grün.
- **JuicyBids ist nur erreichbar, solange der Rechner von D läuft:** tmux-Sitzung `juicybids` (Eve, API, ngrok, Worker) und Docker (MPS). Die URL `https://nursing-surfacing-crucial.ngrok-free.dev` steht unveränderlich im Registrierungs-NFT; eine neue Tunnel-URL heißt neu registrieren.
- **Wenig Speicher:** Ubuntu hat 3,9 GB RAM (`.wslconfig`: `memory=4GB`), nachts waren nur 58 MB frei und der Swap voll. Die MIP-003-API ist daran zweimal mit `ENOMEM` abgestürzt (03:24 und 10:55). Seit 11:00 laufen API und Worker in tmux in einer `until`-Schleife und starten sich nach einem Absturz selbst neu. Dauerhafte Abhilfe: `.wslconfig` auf 6–8 GB und `wsl --shutdown` (beendet alles, danach Docker Desktop, tmux `juicybids` und die Claude-Sitzung neu starten); vor Demo und Video machen, nicht währenddessen.
- **Setup neu starten** (nach Reboot oder `wsl --shutdown`): Docker Desktop starten (MPS und Registry kommen per `restart: unless-stopped` von selbst), dann in WSL im Repo:
  ```sh
  tmux new-session -d -s juicybids -n eve 'npm start 2>&1 | tee -a .local/eve.log'
  tmux new-window -t juicybids -n api 'while true; do npm run api 2>&1 | tee -a .local/api.log; sleep 5; done'
  tmux new-window -t juicybids -n ngrok 'ngrok http --domain=nursing-surfacing-crucial.ngrok-free.dev 21950'
  tmux new-window -t juicybids -n worker 'while true; do npm run worker 2>&1 | tee -a .local/worker.log; sleep 5; done'
  curl -s -H 'ngrok-skip-browser-warning: 1' https://nursing-surfacing-crucial.ngrok-free.dev/availability   # erwartet "available"
  ```
  Den Worker erst starten, wenn Eve auf Port 21949 antwortet (Eve braucht 1–2 min zum Bauen), sonst stirbt er mit `ECONNREFUSED`; die Schleife fängt das inzwischen ab.
- Nach T13 eingefroren: Zahlungsstrecke, Endpunkte, Masumi-Konfiguration. Der Coworker-Bezahlweg (`paid-task.mjs`, `PAID_TASKS_ENABLED`) sendet `RequestedFunds`, das der MPS bei Festpreis ablehnt; er bleibt aus.
- `sokosumi agents list` zeigt nur die ersten 20 Agenten, `--search` sucht nur darin. Vollständige Liste: `curl -s "https://api.preprod.sokosumi.com/v1/agents?limit=100&kind=cardano"`.
- Ersatzweg `npm run buy` (eigener MPS kauft über die Purchasing Wallet, 30 tADA und 5 tUSDM liegen dort): gebaut, nicht live gelaufen.

## Nächste Schritte (kritischer Pfad)
1. ~~T13 abschließen~~ erledigt 31.10., 10:52 (Auszahlung belegt, siehe oben).
2. **Rechner und Prozesse bis zur Bewertung am Laufen halten** (D): tmux `juicybids`, Docker, Laptop wach. Vor Demo und Video `sokosumi --preprod auth status --json` und `curl -s https://nursing-surfacing-crucial.ngrok-free.dev/availability`.
3. **T21 Video** (B4, D liefert Aufnahmen): Sokosumi-Galerie mit JuicyBids (Eintrag „TenderScout“), bezahlter Job `01a18f9c-a001-7131-8f2e-e07480950460` mit Ergebnis, Tx-Hashes im Preprod-Explorer.
4. **Freitext live nachprüfen** (D): Korrektur-Task einmal wiederholen, ob die überholten Standard-Annahmen jetzt fehlen.
5. **TUM-Seat** (D): Organisatoren um Seat bitten, dann Coworker verbinden (siehe Probleme).
6. ~~P3 vervollständigen~~ erledigt 31.10., 11:06 (zwei Läufe 8 von 8).
7. **Daten** (B1): Export vom 30.10. (und 31.10.) nach `data/inbox/`, `npm run data:import`.
8. **T16/T23 Devfolio** (B4): mit den Zahlen und Grenzen aus `README.md` (T17/T22 ist seit 31.10., 11:00 geschrieben) und `docs/evidence.md`.

## Fragen an Masumi (Stand nach T13)
- Hash des Ergebnisses on-chain: **ja, gemessen.** Die Submit-Result-Tx `e3bfe72f…2c01` hat `resultHash` `aa1beef4…0104` geschrieben, gleich dem Hash des gelieferten Berichts.
- Unter dem Angebotspreis abrechnen: **nein** laut Contract (voller Withdraw oder voller Refund). Festpreis 1 tUSDM.
- Käufer-Freigabe für Coworker-Tasks in Sokosumi: laut CLI-README geplant, nicht live. T13 lief deshalb über den Masumi-Agenten in der Galerie; Sokosumi war der Käufer.
- Offen: ob Sokosumi den Ergebnis-Hash in der Web-Oberfläche als „verifiziert“ zeigt (Formel wie `hashResult` in Sokosumi, nicht im Web geprüft).
