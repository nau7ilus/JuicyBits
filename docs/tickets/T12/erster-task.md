# T12 – Erster Sokosumi-Job (unbezahlt), Beleg

Gemessen am Fr 30.10.2026, 23:11–23:15 CET, Sokosumi Preprod, Personal Workspace des Kontos von D. Alle Zeiten aus `sokosumi --preprod tasks get|events … --json`.

## Umgebung
- WSL Ubuntu, Node 24.22.2, Sokosumi CLI **1.1.0**, Eve 0.71.0 mit OpenAI-Modell (`npm start`), ein Worker (`npm run worker`).
- Vendor `JUICY_BIDS` (`01a18ebe-e267-70ca-86f0-cab0a0a26130`), Coworker `JUICY_BIDS` (`01a18ec1-7125-7246-8a2f-90a46c82b611`), Zugriff im Personal Workspace: verfügbar.
- Tasks angelegt mit `npm run task -- <firmenpass.json>` (`dev/task.mjs`), Ergebnis vom Worker über `sokosumi runtime complete … --result-file`.

## Tasks

| Task-ID | Name | Angelegt (CET) | RUNNING | COMPLETED | Ergebnis |
|---|---|---|---|---|---|
| `01a18edd-c588-7522-80a2-3eb847f4232c` | TenderScout p3-isarcode 2026-10-30 | 23:11:01 | 23:11:05 | 23:12:24 | 2 GO, 4 GO MIT AUFLAGE, 25 Kandidaten geprüft; Landtagsverwaltung GO 75 |
| `01a18edf-7d77-7743-a692-2660815aadd6` | TenderScout p1-alpendach 2026-10-30 | 23:12:53 | – | 23:14:54 | 0 GO, 5 GO MIT AUFLAGE (Systemdach 58, To-do Referenzen) |
| `01a18edf-8fd1-700e-a647-8b8dde20626d` | TenderScout Test ungültiger Firmenpass | 23:12:58 | – | 23:13:51 | „Firmenpass ungültig“ mit zwei Fehlern (`states`, `available_from`) |

Berichte wie vom Worker geliefert: `p3-isarcode-sokosumi-report.md`, `p1-alpendach-sokosumi-report.md`, `ungueltiger-firmenpass-sokosumi-report.md` (SHA-256 im JSON-Footer).

## Folgefrage als Kommentar
- 23:12:50 Nutzerkommentar auf Task 1: „Warum ist die Softwareentwicklung für die Landtagsverwaltung ein GO, obwohl der Wert nicht angegeben ist?“
- 23:13:44 Antwort des Coworkers (Event, Fließtext): „Der fehlende Wert ist nach den Bewertungsvorgaben kein Ausschlussgrund: Bei unbekanntem Wert erhält die Größenbewertung 5 Punkte. Außerdem sind die genannten 100 Personentage pro Jahr grundsätzlich innerhalb der angegebenen Kapazität von 80 bis 200 Personentagen, und die Softwareentwicklungsleistung passt zum Firmenprofil. Der Starttermin bleibt allerdings unklar; deshalb ist das Ergebnis kein Nachweis, dass der Auftrag sicher wirtschaftlich oder kapazitiv passt.“

## Befunde
- Mit CLI **1.0.4** schlug `tasks create --personal` fehl: Core antwortete `404 route_not_found` für `GET /v1/users/me/workspace-access`. Mit 1.1.0 lief derselbe Aufruf. Deshalb ist 1.1.0 die Projektversion (AGENTS.md, `npm run setup`). Die drei Runtime-Module, die `sokosumi-runtime.mjs` importiert, sind in 1.1.0 vorhanden.
- Das Worker-Credential war bereits im CLI-Vault (Worker startete ohne Fehler), kein erneuter `key-import`.
- Laufzeit pro Task mit 25 Kandidaten: ca. 80–120 s. Die Antwort auf die Folgefrage kam nach 54 s.
- Nicht erfüllt: TUM-Workspace. `workspaces check` meldet `taskSeatEligible: false`; ohne Seat können Teammitglieder dort keine Tasks anlegen. Beantragen bei den Organisatoren, danach `coworkers connect … --workspace-id 01a17942-e6dd-724f-bae6-458b6a0f715a`.
