# T13 – TenderScout für andere zugänglich machen

Stand: Sa 31.10.2026, ca. 01:45. Frage des Teams: Wie erreichen andere Coworker, eigene KI-Assistenten und andere Teams unseren Agenten, auch auf der Plattform?
**Gemessen** ist nur, was in `STAND.md` und `docs/tickets/T12/` belegt ist. Alles andere ist **laut Doku, nicht gemessen** (Quellen unten).

## Zwei Wege

| | Coworker `JUICY_BIDS` (Sokosumi) | Agent `TenderScout` (Masumi) |
|---|---|---|
| Technik | Unser Worker holt Tasks ab (`npm run worker`) | MIP-003-API `npm run api` mit `/start_job`, `/status`, `/availability`, `/input_schema` |
| Preis | unbezahlt | 1 tUSDM pro Job, Cardano Preprod |
| Rückfrage zum Freitext | ja (gemessen, T12) | nein, Annahmen stehen im Bericht |
| Wer kommt ran | nur freigegebene Workspaces | Sokosumi-Nutzer (Galerie) und Agenten mit eigenem Masumi Node |
| Stand | läuft im Personal Workspace von D (gemessen, T12) | T13 registriert gerade, öffentliche https-URL über einen ngrok-Tunnel |

## 1. Coworker freigeben (Sokosumi)
- `--personal` erreicht nur den eigenen Personal Workspace (so lief T12).
- Freigabe je Organisations-Workspace:
  ```sh
  sokosumi --preprod coworkers connect 01a18ec1-7125-7246-8a2f-90a46c82b611 --vendor-id 01a18ebe-e267-70ca-86f0-cab0a0a26130 --workspace-id ORGANIZATION_ID --json
  ```
  `GRANTED` = fertig. `PENDING` = ein Owner oder Admin des Workspace muss zustimmen, danach `connect` noch einmal (CLI-README 1.1.0: „`PENDING` means a Workspace owner or admin must approve the request.“).
- Wer `connect` ausführt, muss Vendor-Admin (bei uns D) und Mitglied der Organisation sein.
- Danach können die Mitglieder dieses Workspace den Coworker auswählen und Tasks anlegen.
- Ein Worker bedient einen Workspace gleichzeitig: `SOKOSUMI_ORGANIZATION_ID` und `SOKOSUMI_ORGANIZATION_SLUG` in `.env`, Worker neu starten.
- TUM-Workspace (`tum-hackathon-u4ve65`): `taskSeatEligible: false` (gemessen, `STAND.md`). Erst Seat bei den Organisatoren holen.
- Für **alle** Sokosumi-Nutzer sichtbar nur nach Whitelisting durch Sokosumi-Admins („A new coworker is not available to users until it is whitelisted.“, „Creating and whitelisting coworkers is admin-only.“). Ein Antrag für Entwickler ist nicht dokumentiert.

## 2. Eigene KI-Assistenten und Skripte
**Sokosumi-MCP-Server** `https://mcp.sokosumi.com/mcp`, Login per OAuth mit dem Sokosumi-Konto. Passt für Assistenten mit MCP-Client (z. B. Claude Desktop).

| Tool | Wofür |
|---|---|
| `list_coworkers`, `create_coworker_task` | Task an `JUICY_BIDS` (nur in einem freigegebenen Workspace) |
| `list_task_events`, `create_task_event` | Rückfrage lesen, mit „passt“ oder Korrekturen antworten |
| `list_agents`, `create_job`, `get_job` | Job direkt beim Galerie-Agenten `TenderScout` |
| `add_job_to_task` | Agent-Job an einen Task hängen („primarily for coworker tokens“) |

**CLI** für Skripte. Anmeldung: `sokosumi --preprod auth login` (OAuth) oder ein Nutzer-API-Key über `auth login --api-key-stdin`, nie als Argument.
```sh
# Coworker-Task in einem freigegebenen Workspace
sokosumi --preprod tasks create --organization-slug SLUG --coworker-id 01a18ec1-7125-7246-8a2f-90a46c82b611 --name "TenderScout Anfrage" --description "$(cat anfrage.txt)" --status READY --json
# Bezahlter Agent-Job; einziges Eingabefeld ist "prompt" (Firmenpass als JSON-Text)
node -e "process.stdout.write(JSON.stringify({prompt:require('fs').readFileSync(process.argv[1],'utf8')}))" examples/p3-isarcode.pass.json > .local/hire-input.json
sokosumi --preprod agents hire 01a18f8f-7091-74ae-88a7-8b4856955f83 --input-file .local/hire-input.json --max-credits 100 --json
sokosumi --preprod jobs get JOB_ID --details --json
```
Preis: 100 Credits pro Auftrag, das entspricht dem Festpreis von 1 tUSDM (gemessen 31.10., Katalog und `agents hire`).

## 3. Agent-Weg (Masumi, bezahlt)
- **Galerie (gemessen):** Auf Preprod hat Sokosumi TenderScout ohne Formular übernommen, 3 Minuten nach der Registrierung (Sync alle 5 min). Sokosumi-Agent-ID `01a18f8f-7091-74ae-88a7-8b4856955f83`. Achtung: `sokosumi agents list` zeigt nur die ersten 20 Agenten, sortiert nach Anzahl Jobs. Vollständig: `curl -s "https://api.preprod.sokosumi.com/v1/agents?limit=100&kind=cardano"`. Für Mainnet nennt die Doku ein Formular.
- **Andere Coworker** holen einen Galerie-Agenten per `add_job_to_task` in ihren Task.
- **Ohne Sokosumi, per Masumi-MCP-Server:** Tools `list_agents`, `hire_agent`, `check_job_status`, `get_job_full_result`. Dafür braucht man einen eigenen Masumi Node, Registry- und Payment-Token, Python 3.10+ und `uv`.
- **Ohne Sokosumi, direkt per MIP-003** (Doku „Enable Agent Collaboration“):
  1. `GET /payment-information` auf der API des Agenten. **Den Endpunkt hat unsere API nicht.** Die Zahlungsdaten (`blockchainIdentifier`, `sellerVKey`, Fristen) stehen bei uns in der Antwort von `/start_job` (`agent-api.mjs`). Sokosumi als Käufer kam damit aus (bezahlter Job am 31.10., `beleg.md`). Andere Käufer nach dieser Anleitung: nicht getestet.
  2. `POST /start_job` bei uns: `identifier_from_purchaser` (14–26 Hex-Zeichen) und `input_data.prompt`.
  3. `POST /purchase` beim eigenen Masumi Node. Danach `GET /purchase` dort beobachten.
  4. Ergebnis mit `GET /status?job_id=…` bei uns abholen.

## 4. Grenzen
- Die API-URL steht im Registrierungs-NFT (bei uns `apiBaseUrl`, on-chain `api_url`). Die Doku sagt: „NFT metadata is immutable once confirmed on-chain; it can only be updated by burning and re-minting.“ Neue Tunnel-URL heißt neu registrieren, mit neuem `agentIdentifier`. Alte Links brechen.
- Solange andere buchen sollen, müssen der Tunnel, `npm run api`, Eve (`npm start`) und der MPS laufen. Für den Coworker laufen Eve und `npm run worker`.
- Das Ergebnis muss 20 min nach Anlage der Zahlung on-chain stehen (`submitResultTime` in `agent-api.mjs`).
- Dass ein Coworker einen anderen Coworker beauftragt, ist nicht dokumentiert.
- Sokosumi bezahlt Coworker-Tasks noch nicht (CLI-README 1.1.0: „Implementation and live seller proof remain pending.“).
- Bezahlte Agent-Jobs laufen ohne Rückfrage. Die Annahmen stehen im Bericht.

## 5. Für Demo und Devfolio: So bucht ein anderes Team TenderScout
1. In Sokosumi Preprod die Agentengalerie öffnen, `TenderScout` suchen (steht weit hinten, solange er wenige Jobs hat), Freitext oder Firmenpass einfügen und 100 Credits (1 tUSDM) bezahlen.
2. Oder per CLI: `sokosumi --preprod agents hire 01a18f8f-7091-74ae-88a7-8b4856955f83 --input-file hire-input.json --max-credits 100 --json` (Datei wie in Abschnitt 2). Gemessen am 31.10., `beleg.md`.
3. Oder mit dem Büro-Assistenten aus T25: `npm run assistant -- <anfrage.txt|firmenpass.json>` (`docs/tickets/T25/agent-als-kunde.md`).
4. Oder im eigenen Assistenten mit dem Sokosumi-MCP-Server: „Beauftrage TenderScout mit diesem Firmenpass“ (`create_job`). Nicht getestet.
5. Beleg, dass der Verkäufer bezahlt wurde: `npm run receipt -- <jobId>`. Das Skript liest MPS und Blockfrost und schreibt nichts.

Ehrlich formulieren: Den Coworker gibt es nur in freigegebenen Workspaces, bezahlt wird über den Masumi-Agenten. Gemessen ist Schritt 2 (CLI-Buchung, `beleg.md`); Galerie im Web, Büro-Assistent und MCP sind nicht gemessen.

## Quellen
- CLI-README 1.1.0 (lokal: `$(dirname "$(sokosumi skills path)")/README.md`) und Skill `skills/agents/SKILL.md` im CLI-Paket
- https://www.masumi.network/dev/sokosumi/documentation/coworkers
- https://www.masumi.network/dev/sokosumi/mcp
- https://www.masumi.network/dev/masumi/documentation/how-to-guides/list-agent-on-sokosumi
- https://www.masumi.network/dev/masumi/documentation/how-to-guides/how-to-enable-agent-collaboration
- https://www.masumi.network/dev/masumi/documentation/technical-documentation/_masumi-mcp-server
- https://www.masumi.network/dev/masumi/documentation/technical-documentation/agent-identity-nft
