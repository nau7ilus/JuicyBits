# T25 – Agent als Kunde: Büro-Assistent beauftragt TenderScout

Stand: Sa 31.10.2026, ca. 03:00. Skript: `dev/assistant.mjs`, Aufruf `npm run assistant`.
Hintergrund und andere Zugangswege: `docs/tickets/T13/zugang-fuer-andere.md`. Beleg des ersten bezahlten Jobs: `docs/tickets/T13/beleg.md`.

## Idee
Ein Bauunternehmen hat einen Büro-Assistenten (hier: ein Skript). Der Assistent bucht im Namen des Büros den externen Agenten TenderScout auf Sokosumi Preprod, bezahlt ihn und legt den Bericht ab. Damit zeigt die Demo: Nicht nur Menschen, auch andere Agenten sind Kunden von TenderScout.

## Was das Skript zeigt
1. **Suche im Katalog:** liest den öffentlichen Katalog `https://api.preprod.sokosumi.com/v1/agents?limit=100&kind=cardano` (ohne Login) und findet TenderScout nach Namen oder per `--agent-id`. Zeigt Name, Anbieter, ID, Leistung, Preis. `sokosumi agents list` reicht nicht, die CLI zeigt nur die ersten 20 Agenten.
2. **Prüfung vor dem Bezahlen:** zeigt die Anfrage, wie sie gesendet wird (`{"prompt": <Dateiinhalt>}`), Kosten und Limit. Prüft einen Firmenpass lokal mit `tender/pass.mjs`. Bricht ab bei leerer Datei, mehr als 16.000 Zeichen, ungültigem Firmenpass, Preis über `--max-credits`, ohne Sokosumi-Login. Warnt bei E-Mail-Adressen. Dann Rückfrage `[j/N]`; ohne `--yes` wird nur nach „j“ gebucht.
3. **Buchung, genau einmal:** schreibt die Eingabe nach `.local/assistant-<Zeit>-input.json` und ruft `sokosumi --preprod agents hire <AGENT_ID> --input-file … --max-credits … --json`. Die Job-ID kommt sofort ins Journal `.local/assistant-<jobId>.json`. Kommt keine Job-ID zurück, wiederholt das Skript nicht, sondern nennt die Prüfung (siehe Grenzen).
4. **Warten und Ablegen:** fragt alle 15 s `sokosumi --preprod jobs get <JOB_ID> --details --json` ab (höchstens 30 min), meldet jeden Status einmal auf Deutsch, speichert den Bericht nach `.local/assistant-<jobId>.md`, zeigt ihn und schreibt eine kurze Notiz fürs Büro (Job-ID, Ablage, Bezahlung über Masumi-Escrow, Hash on-chain).

Alle Dateien unter `.local/` haben Modus 600 und sind per `.gitignore` ausgeschlossen.

## Befehle
```sh
sokosumi --preprod auth status --json                              # angemeldet? sonst: sokosumi --preprod auth login
printf 'n\n' | npm run assistant -- examples/p4-pi-informatik.prompt.txt   # Trockenlauf: Schritt 1-2, nichts gebucht
npm run assistant -- examples/p3-isarcode.pass.json                # bucht nach Rückfrage [j/N]
npm run assistant -- anfrage.txt --yes --max-credits 100           # ohne Rückfrage, mit Limit
npm run assistant -- anfrage.txt --agent-id 01a18f8f-7091-74ae-88a7-8b4856955f83
```
Eigene Anfrage: Textdatei mit Gewerk, Leistungen, Region in Bayern, Auftragswert, Referenzen und Zertifikaten. Keine Kontaktdaten.

## Kosten
- 100 Credits pro Auftrag, das sind 1 tUSDM (Testgeld auf Cardano Preprod, gemessen in T13).
- Abgebucht wird vom Sokosumi-Konto, mit dem die CLI angemeldet ist. Guthaben: https://preprod.sokosumi.com/billing?tab=credits. Die CLI 1.1.0 hat keinen Befehl für das Guthaben.
- `--max-credits` ist das Limit; Standard ist der Katalogpreis. Liegt der Preis darüber, bucht das Skript nicht.

## Zuschauen
- Im Terminal: Statusmeldungen des Skripts. Ablauf in T13 (gemessen): Ereignisse `INITIATED` → `AWAITING_PAYMENT` → `RUNNING` → `COMPLETED`, Job-Status `payment_pending` → `completed`, Dauer ca. 5 min.
- Selbst abfragen: `sokosumi --preprod jobs get <JOB_ID> --details --json`. Der Bericht steht in `job.result`.
- Alle Jobs zu TenderScout: `sokosumi --preprod jobs list --search 01a18f8f-7091-74ae-88a7-8b4856955f83 --json`.
- In Sokosumi Web (Preprod) unter den Jobs des Kontos. Genauer Pfad der Job-Seite: `TODO (T25)`.
- Anbieterseite (Zahlung, Ergebnis-Hash, Auszahlung): `docs/tickets/T13/beleg.md`, `npm run receipt`.

## Für echte KI-Assistenten: Sokosumi-MCP (laut Doku, nicht gemessen)
Statt des Skripts kann ein Assistent mit MCP-Client (z. B. Claude Desktop) TenderScout direkt buchen:
- Server `https://mcp.sokosumi.com/mcp`, Login per OAuth mit dem Sokosumi-Konto.
- Tools `list_agents` (TenderScout finden), `create_job` (Auftrag mit dem Feld `prompt`), `get_job` (Ergebnis abholen).
- `add_job_to_task` hängt den Agent-Job an einen Sokosumi-Task, z. B. wenn ein Coworker TenderScout als Unterauftrag holt.
- Beispiel an den Assistenten: „Beauftrage TenderScout auf Sokosumi mit dieser Anfrage, höchstens 100 Credits, und leg mir den Bericht ab.“
- Ob der MCP-Server Preprod-Agenten anbietet und welche Felder `create_job` erwartet: `TODO (T25)`, vor der Demo prüfen.

## Gemessen und nicht gemessen
- **Gemessen (31.10., ca. 02:50):** Schritt 1–2 mit `examples/p4-pi-informatik.prompt.txt`, Antwort „n“, nichts gebucht. Abbrüche bei Limit 50, ungültigem Firmenpass, unbekannter Option und unbekannter Agent-ID.
- **Gemessen in T13 (von Hand):** dieselben CLI-Befehle `agents hire` und `jobs get` mit Firmenpass P3.
- **Nicht gemessen:** ein bezahlter Lauf des Skripts von Anfang bis Ende; ein bezahlter Job mit Freitext; der MCP-Weg.

## Grenzen
- Unklare Buchung (keine Job-ID, Netzwerkfehler): nicht neu starten. Erst `sokosumi --preprod jobs list --search <AGENT_ID> --json` oder Sokosumi Web prüfen, sonst wird doppelt bezahlt.
- Bezahlte Jobs fragen nicht nach. Bei Freitext setzt TenderScout Standardwerte und nennt sie im Bericht als Annahmen. Für eine kurze Liste einen vollständigen Firmenpass oder eine genaue Anfrage schicken.
- TenderScout muss beim Anbieter laufen: Tunnel, `npm run api`, Eve, Masumi Payment Service (`docs/tickets/T13/zugang-fuer-andere.md`, Abschnitt Grenzen). Das Ergebnis muss 20 min nach Anlage der Zahlung on-chain stehen, sonst geht der Betrag an den Käufer zurück (Refund laut Doku und Smart Contract, nicht gemessen; `STAND.md`, offene Fragen).
- Namen der Fehlerzustände (abgebrochen, erstattet) sind nicht gemessen. Das Skript erkennt sie an Wörtern wie `fail`, `cancel`, `refund`: `TODO (T25)`.
- Der Katalog wird nur als erste Seite (100 Einträge) gelesen; heute sind es 93 Agenten. Weitere Seiten: `TODO (T25)`.
- Die lokale Firmenpass-Prüfung nutzt TenderScout-Code aus diesem Repo. Ein fremder Assistent hat ihn nicht; bei ihm lehnt erst TenderScout eine ungültige Eingabe ab.
- Der Assistent ist ein Skript ohne Modell. Er entscheidet nichts über die Ausschreibungen; das tut TenderScout.
- Abdeckung wie im Bericht: Bayern, oberhalb der EU-Schwellenwerte vollständig, unterhalb nur teilweise.
