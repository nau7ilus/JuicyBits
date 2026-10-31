# T13 – Plan: bezahlter Preprod-Job (Masumi Payment Service + Sokosumi)

Stand: 2026-10-30, Recherche ohne Ausführung (Agent C, Stream S3). Alles mit `TODO (T13)` ist nicht aus der Doku belegt und muss D beim Setup prüfen.
Quellen (gelesen): Template-README https://github.com/masumi-network/tum-hackathon-quickstart ; MPS-Repo https://github.com/masumi-network/masumi-payment-service (README, `docs/configuration.md`, `docs/deployment.md`, `.env.example`, `prisma/schema.prisma`, `src/routes/api/*`, `smart-contracts/payment-v2/README.md` + `state_machine_diagram.md`) ; Quickstart-Compose https://github.com/masumi-network/masumi-services-dev-quickstart (README, `.env.example`, `docker-compose.yml`) ; Masumi-Doku unter https://www.masumi.network/dev/masumi/documentation/... (`docs.masumi.network` leitet dorthin um; viele alte Pfade liefern 404) ; Sokosumi-CLI-README via https://registry.npmjs.org/@masumi_network/sokosumi ; https://www.masumi.network/tum-hackathon ; https://dispenser.masumi.network ; https://docs.cardano.org/cardano-testnets/tools/faucet.

## 0. Was das Repo schon erwartet
- `docs/payment-state.json` mit `sourceId`, `walletId`, `sellerAddress` (gelesen von `payment-registration.mjs`).
- `docs/registration-state.json` wird von `payment-registration.mjs` geschrieben; `agent-api.mjs`/`paid-task.mjs` lesen daraus `agentIdentifier`, `supportedPaymentSourceIndex`, `sellerVkey`, `registrationState`/`registration.state === 'RegistrationConfirmed'`.
- `.env`: `MPS_URL` (Default `http://127.0.0.1:38127`, `MPS_PORT=38127`), `AGENT_API_PORT=21950`, `AGENT_AUTHOR`, `BLOCKFROST_API_KEY_PREPROD`, `PAID_TASKS_ENABLED`. `.local/mps.env` enthält `ADMIN_KEY`; `.local/mps-runtime.env` enthält `MPS_RUNTIME_TOKEN` (Rechte 600).
- Registrierung: `type:'Standard'`, `supportedPaymentSources:[{chain:'Cardano',network:'Preprod',paymentSourceType:'Web3CardanoV2',address:<smartContractAddress>,pricing:{pricingType:'Dynamic'}}]`, Preis pro Job als `RequestedFunds:[{unit:<tUSDM>,amount:'1000000'}]` (= 1 test USDM, 6 Dezimalen). MPS-Quelle bestätigt: bei `Dynamic` muss `RequestedFunds` nicht leer sein, bei `Fixed` muss es `null` sein; `supportedPaymentSourceIndex` ist für `Web3CardanoV2` Pflicht.
- Zeitfenster im Template (Payment: payBy +5/+10 min, submitResult +20, unlock +36, externalDispute +52) erfüllen die MPS-Mindestabstände (payByTime ≥ 5 min vor submitResultTime; submitResultTime ≥ 15 min in der Zukunft; unlockTime ≥ 15 min nach submitResultTime; externalDisputeUnlockTime ≥ 15 min nach unlockTime).

## 1. MPS auf Preprod aufsetzen (Schritt für Schritt)

### 1.1 Blockfrost-Key (5 min)
https://blockfrost.io → Login passwortlos → „+ ADD PROJECT" → Netzwerk **Cardano Preprod** wählen → „SAVE PROJECT" → `project_id` ist der Key (Quelle: https://blockfrost.dev/overview/getting-started). In `.env` als `BLOCKFROST_API_KEY_PREPROD` (Worker/`settlement.mjs`) und in die MPS-`.env`. Nie in Chat oder Git. Free-Tier-Limits: `TODO (T13)` (Pricing-Seite nicht lesbar).

### 1.2 Option A (empfohlen, Doku „quickest start"): Docker Compose
Installationsseite: https://www.masumi.network/dev/masumi/documentation/get-started/install-masumi-node
```sh
git clone https://github.com/masumi-network/masumi-services-dev-quickstart.git
cd masumi-services-dev-quickstart
cp .env.example .env
docker compose up -d
docker compose ps -a      # setup-Container müssen "Exited (0)" zeigen
docker logs masumi-payment-setup   # zeigt EINMALIG die generierten Wallet-Mnemonics
```
In `.env` setzen (Namen aus `.env.example` des Quickstart): `ADMIN_KEY` (≥ 15 Zeichen), `ENCRYPTION_KEY` (≥ 20, besser 32: `openssl rand -hex 32`; **nie nachträglich ändern**, sonst sind die Wallets nicht mehr entschlüsselbar), `BLOCKFROST_API_KEY_PREPROD` (ohne ihn bricht der Seed ab). Optional: `SELLING_WALLET_PREPROD_MNEMONIC`, `PURCHASE_WALLET_PREPROD_MNEMONIC`, `COLLECTION_WALLET_PREPROD_ADDRESS` (leer → Selling Wallet empfängt Zahlungen). `DATABASE_URL` setzt das Compose selbst.
Startet: `postgres-registry` (Host-Port 5432), `postgres-payment` (5433), `registry-service` (3000), `payment-service` (3001, Image `ghcr.io/masumi-network/masumi-payment-service:0.29.0`). Erststart baut Setup-Images aus GitHub-Quellen (mehrere Minuten). Port-5432-Konflikt → Host-Port in `docker-compose.yml` ändern. Reset nur mit `docker compose down -v` (löscht alles inkl. Wallets).
**Achtung Port:** MPS lauscht auf 3001, unser `.env.example` erwartet `MPS_URL=http://127.0.0.1:38127`. Entweder `MPS_URL=http://127.0.0.1:3001` in `.env` setzen oder das Port-Mapping im Compose auf `127.0.0.1:38127:3001` ändern. Doku-Hinweis (`docs/deployment.md`): Loopback-Bindung behalten, MPS spricht nur HTTP.

### 1.3 Option B: lokaler Node ohne Docker (MPS-README)
Voraussetzungen laut README: Node.js 20+, pnpm, PostgreSQL 13+ (Masumi-Doku nennt abweichend Node 18+/PostgreSQL 15 und `npm`).
```sh
git clone https://github.com/masumi-network/masumi-payment-service.git
cd masumi-payment-service
pnpm install
cp .env.example .env        # DATABASE_URL, ENCRYPTION_KEY, ADMIN_KEY, BLOCKFROST_API_KEY_PREPROD, PORT (Default 3001)
pnpm run prisma:migrate
pnpm run prisma:seed        # legt Admin-Key + Preprod-Payment-Source + Wallets an; Mnemonics werden einmalig ausgegeben
pnpm -C frontend run build  # nötig für /admin/
pnpm run dev
```
`DATABASE_URL`-Format laut Doku: `postgresql://user:password@localhost:5432/masumi?schema=public`. `ADMIN_KEY` explizit setzen – „the seed falls back to a public default if unset". Für Windows/WSL ist Option A deutlich weniger Fehlerquellen (PostgreSQL-Installation, pnpm).

### 1.4 Prüfen, Admin-UI, API-Doku
```sh
curl http://localhost:3001/api/v1/health     # erwartet {"status":"success","data":{"status":"ok"}}
```
Admin-Dashboard: `http://localhost:3001/admin` (Login mit `ADMIN_KEY`). API-Doku (Swagger): `http://localhost:3001/docs`. Alle API-Pfade beginnen mit `/api/v1/`, Auth-Header heißt `token`.

### 1.5 Payment Source, Selling Wallet, `sourceId`/`walletId`/Adresse/vkey auslesen
Der Seed legt die Preprod-Payment-Source und je eine Selling- und Purchasing-Wallet an; nichts manuell anlegen (AGENTS.md: frische, projekteigene Ressourcen – diese DB ist frisch).
```sh
curl -H "token: $ADMIN_KEY" "http://localhost:3001/api/v1/payment-source?take=100"
```
Antwort: `data.PaymentSources[]` mit `id` (→ `sourceId`), `network` (`Preprod`), `smartContractAddress`, `policyId`, `SellingWallets[]`/`PurchasingWallets[]` mit `id` (→ `walletId`), `walletAddress` (→ `sellerAddress`), `walletVkey` (→ `sellerVkey`). Laut Doku heißt das Typfeld `paymentType`, im MPS-Code/Template `paymentSourceType` (`Web3CardanoV2`) – das Template sucht die Source rekursiv nach `id`, also unkritisch; die Source muss aber `Web3CardanoV2` sein. `TODO (T13)`: prüfen, ob der Seed von 0.29.0 eine V2-Source anlegt (Template-Registrierung setzt V2 voraus).
```sh
curl -H "token: $ADMIN_KEY" "http://localhost:3001/api/v1/wallet?walletType=Selling&id=$WALLET_ID"
```
liefert `walletVkey`, `walletAddress` (Admin-Recht nötig; `includeSecret=true` gäbe den Mnemonic – nicht nötig, nicht loggen). Alternativ Admin-UI → „Wallets" → Selling Wallet → vKey kopieren (so beschreibt es https://www.masumi.network/dev/masumi/documentation/get-started/register-agent).
Dann anlegen: `docs/payment-state.json` = `{"sourceId":"…","walletId":"…","sellerAddress":"addr_test1…"}`; `.local/mps.env` = `ADMIN_KEY=…` (chmod 600).

## 2. Funding
- **Test-ADA:** Cardano-Faucet https://docs.cardano.org/cardano-testnets/tools/faucet – Aktion „receive test ada", Preprod-Adresse eintragen, API-Key leer lassen, „Receive test ada"; „Funds will be in the testnet account you specified within a few minutes." Betrag/Limit stehen nicht auf der Seite (Drittquellen: 10 000 tADA, 1× pro 24 h – `TODO (T13)` unbestätigt). Masumi nennt zusätzlich „Faucet by Masumi" https://dispenser.masumi.network („Claim ADA and USDM", Netzwerk „Testnet", braucht einen **Verification Code aus der Registrierun
gs-E-Mail**, sendet zusätzlich 5 ADA Collateral in zweiter Transaktion) – welche Registrierung gemeint ist: `TODO (T13)`.
- **Selling Wallet:** braucht nur ADA für Gebühren (Registrierungs-NFT-Mint, Submit-Result- und Withdraw-Transaktionen). Doku: „a small amount of ADA"; MPS-Low-Balance-Default für Preprod ist 5 ADA. Empfehlung: eine Faucet-Anforderung (reichlich); mindestens ≥ 20 tADA halten.
- **Purchasing Wallet (nur für Fallback 4.4):** ADA für Gebühren + 1 tUSDM pro Job.
- **Test-USDM:** Der Käufer zahlt 1 tUSDM, Unit `16a55b2a349361ff88c03788f93e1e966e5d689605d044fef722ddde0014df10745553444d` – von Masumi als Preprod-tUSDM bestätigt (register-agent- und list-agent-on-sokosumi-Seite; 6 Dezimalen). Im Template-Fluss ist der Käufer **Sokosumi** (siehe 4.1), die Selling Wallet braucht keine tUSDM. Bezugsquelle für eigene tUSDM: nur der Masumi-Dispenser (s. o.); die Top-up-Seite behauptet widersprüchlich „USDM is not available on the Preprod network" (veraltet). Ohne Dispenser-Code: `TODO (T13)`, im Discord/Hackathon-Team fragen.

## 3. Registrierung (`/registry`)
```sh
node --env-file=.env --env-file=.local/mps.env payment-registration.mjs key       # wallet-scoped ReadAndPay-Key → .local/mps-runtime.env
node --env-file=.env --env-file=.local/mps.env payment-registration.mjs register  # POST /api/v1/registry (braucht AGENT_AUTHOR)
node --env-file=.env --env-file=.local/mps.env payment-registration.mjs           # GET /registry?network=Preprod… bis state RegistrationConfirmed
```
- On-chain: MPS baut eine Cardano-Transaktion und **mintet ein NFT mit den Agent-Metadaten** in die Selling Wallet (Gebühr in ADA). Zustände (Prisma-Enum): `RegistrationRequested → RegistrationInitiated → RegistrationConfirmed` (oder `RegistrationFailed`; Metadaten ändern = Deregistrieren/NFT burnen + neu registrieren).
- Dauer laut Doku: Preprod „around 5 to 15 minutes". Zusätzlich greift der Hintergrundjob `REGISTER_AGENT_INTERVAL` (Doku: Default 300 s). Budget: 30 min.
- `agentIdentifier`: ist beim POST noch `null`; erscheint in `GET /registry` (`data.Assets[].agentIdentifier`) bzw. Admin-UI „AI Agents", sobald bestätigt. Das Template-Skript (3. Aufruf) schreibt ihn in `docs/registration-state.json`. Er beginnt mit der `policyId` der Payment Source (MPS prüft das beim Payment).
- `supportedPaymentSourceIndex`: Index in `supportedPaymentSources` des Registry-Eintrags; das Template registriert genau eine Quelle → erwartbar `0`. Nach Bestätigung aus `GET /registry` (Feld `supportedPaymentSources`) gegenprüfen und zusammen mit `sellerVkey` (= `walletVkey` der Selling Wallet) manuell in `docs/registration-state.json` eintragen (README: „actual supportedPaymentSourceIndex"). `TODO (T13)`: Indexbasis 0 bestätigen.
- Der Registrierungs-`apiBaseUrl` ist `http://127.0.0.1:21950` (Template, `registration-config.mjs`) – von außen nicht erreichbar; für den Sokosumi-Task-Fluss egal, für den MIP-003-Fallback (4.4) muss der Käufer lokal sein.

## 4. Bezahlter Lauf
### 4.1 Ablauf im Template (Sokosumi-Task)
1. `npm run api` (MIP-003-API, nutzt `.local/mps-runtime.env`), `PAID_TASKS_ENABLED=true` in `.env`, `npm run worker` neu starten. `isPaidReady()` verlangt `registration-state.json` mit `RegistrationConfirmed` und den Runtime-Key.
2. Task anlegen wie in T12 (`sokosumi --preprod tasks create … --status READY --json`). Worker startet den Task (`runtime start`), dann `paid.advance`: `POST /api/v1/payment` (Angebot: 1 tUSDM, Zeitfenster s. 0) → speichert `blockchainIdentifier` etc.
3. Worker postet ein Task-Event `masumiPayment` (signiertes Angebot: `blockchainIdentifier`, `agentIdentifier`, `sellerVkey`, Zeiten, `inputHash`, `Amounts`, `PaymentSource`) via Core `POST /v1/tasks/{id}/events`. Der **Käufer ist Sokosumi**: laut CLI-README genehmigt „the Task billing owner" jedes Festpreisangebot; die Sokosumi-Seite lockt dann die Mittel im Escrow. **Risiko:** dieselbe README (1.1.0) nennt diesen Fluss „planned, not implemented" / „Live seller proof pending". Wie der Käufer im Web-UI freigibt: `TODO (T13)` – vor dem Lauf im Sokosumi-Preprod-UI am Task prüfen, ob ein Zahlungs-Approve angeboten wird.
4. Worker pollt `POST /api/v1/payment/resolve-blockchain-identifier` bis `onChainState === 'FundsLocked'` mit bestätigter Transaktion (Doku: 30–120 s für Bestätigung). Dann läuft `scout()` (Deadline `submitResultTime`, 20 min nach Payment-Anlage – Modell-Lauf muss darin fertig werden).
5. `POST /api/v1/payment/submit-result` mit `submitResultHash` = SHA-256-Hex (64 Zeichen) des Ergebnistexts. MPS setzt `NextAction.requestedAction = SubmitResultRequested` und sendet die Transaktion im nächsten Job-Zyklus; Worker wartet auf `onChainState === 'ResultSubmitted'` und `resultHash` gleich dem eigenen Hash, dann Task-Event `status: COMPLETED` mit dem Bericht als `comment`.
6. Auszahlung: Seller-`Withdraw` ist erst **nach `unlockTime`** (36 min nach Anlage) erlaubt; MPS macht das automatisch (`AUTO_WITHDRAW_PAYMENTS` Default `true`), Ziel ist die Collection-Adresse oder die Selling Wallet. `onChainState` wird `Withdrawn`.
7. Seller-Receipt: Worker ruft Core `GET /v1/tasks/{id}/receipt` (`settlement.mjs`); `settled` ist nur `true`, wenn `Withdrawn` (oder `DisputedWithdrawn` mit Seller-Auszahlung); `settled:false` ist gültig; nur gesettelte Receipts tragen `txHash` (kann trotzdem `null` sein). Dann Blockfrost `GET https://cardano-preprod.blockfrost.io/api/v0/txs/{txHash}/utxos` (Header `project_id`) und Netto-tUSDM an `sellerAddress` > 0. Manuell: `sokosumi --preprod runtime receipt TASK_ID --coworker-id COWORKER_ID --json` (aus CLI-README 1.1.0; Verfügbarkeit in 1.0.4: `TODO (T13)`).
Evidenz für `docs/evidence.md`: Task-ID, `blockchainIdentifier`, Lock-Tx, Submit-Result-Tx, Withdraw-`txHash`, Receipt-JSON, Blockfrost-Netto.

### 4.2 Was MPS auf Käuferseite tut (zum Verständnis, Doku core-concepts/payments)
`GET /payment-information` (Registry) → `POST /start_job` beim Agenten (Nonce `identifier_from_purchaser`, 14–26 Hex) → `POST /purchase` beim Käufer-MPS (inputHash, Zeiten, Betrag) → Escrow `FundsLocked` → Verkäufer `ResultSubmitted` → nach `unlockTime` `Completed`/Withdraw. Refund nur vor `unlockTime` (`POST /purchase/request-refund`), sonst Dispute an das Masumi-Team.

### 4.3 Zeitlinie eines Laufs
t0 Payment angelegt → ≤ t0+5/10 min Käufer lockt → +1–3 min FundsLocked bestätigt → Modell (≤ ~10 min) → submit-result → +1–3 min ResultSubmitted → COMPLETED-Event → t0+36 min Withdraw erlaubt → Job-Zyklus + Bestätigung → Receipt `settled`. Realistisch **60–90 min** vom Task bis zum verifizierten Receipt.

### 4.4 Fallback, falls Sokosumi das `masumiPayment`-Event nicht bezahlt
Eigener Käufer über die MIP-003-API (`agent-api.mjs`, Port 21950) und die Purchasing Wallet desselben MPS: `POST /start_job` → Antwort in `POST /api/v1/purchase` des MPS einspeisen (Felder laut MIP-003/Doku: `blockchainIdentifier`, `agentIdentifier`, `sellerVkey`, `inputHash`, Zeiten, `identifierFromPurchaser`, `RequestedFunds`/`Amounts`, `paymentSourceType`, `supportedPaymentSourceIndex`; genaue Body-Namen aus `http://localhost:3001/docs` ablesen – `TODO (T13)`). Braucht 1 tUSDM + ADA in der Purchasing Wallet (Dispenser). Ergebnis ist dann ein bezahlter Preprod-Job ohne Sokosumi-Task; in Devfolio ehrlich so benennen. Payment-Pfad/Endpunkte dafür nicht ändern (AGENTS.md).

## 5. Antworten auf die offenen Fragen in STAND.md
1. **Wird der Ergebnis-Hash on-chain gespeichert?** Ja. Der V2-Payment-Contract hat `result_hash` im Datum; die Transition `SubmitResult` (FundsLocked → ResultSubmitted) verlangt „New `result_hash` is non-empty" im fortgeführten Script-Output; `Withdraw` verlangt einen nicht-leeren Hash, `WithdrawRefund` einen leeren. MPS schickt den Hash aus `submit-result` als Transaktion (`SubmitResultRequested → SubmitResultInitiated`), die Doku formuliert: „seller submitted the result hash on-chain". Der Hash kann bis `external_dispute_unlock_time` vom Verkäufer ersetzt werden und wird bei `AuthorizeRefund` geleert – „Bericht an Zahlung gebunden" gilt also für den final ausgezahlten Zustand. Quellen: `smart-contracts/payment-v2/README.md`, `state_machine_diagram.md`, https://www.masumi.network/dev/masumi/core-concepts/payments.
2. **Kann der Verkäufer unter dem Angebotspreis abrechnen?** Nach Contract und API: nein. Seller-`Withdraw` muss (bei gesetzter `seller_return_address`) mindestens den gesamten Contract-Wert minus `collateral_return_lovelace` an den Verkäufer zahlen; es gibt keinen Teil-Auszahlungspfad und keinen Preis-Parameter in `submit-result`. Alternativen sind nur Ganz-oder-gar-nicht: `AuthorizeRefund` (voller Refund an den Käufer) oder im Dispute die Admin-Aufteilung (`WithdrawDisputed`, Masumi-Team). Konsequenz: Festpreis 1 tUSDM beibehalten; bei 0 verifizierten Treffern trotzdem voller Preis (Ergebnis „0 Treffer" ist laut AGENTS.md gültig). Offizielle Masumi-Bestätigung: `TODO (T13)`.

## 6. Zeitplan und Top-Fehlerquellen
| Schritt | Dauer |
|---|---|
| 1.1 Blockfrost-Key | 5 min |
| 1.2 Compose-Erststart (Build aus GitHub) | 15–25 min |
| 1.4/1.5 Health, IDs auslesen, `payment-state.json`, `.local/mps.env` | 15 min |
| 2 Faucet (Selling Wallet, ggf. Purchasing Wallet) | 10 min + Wartezeit |
| 3 Key + Register + Bestätigung | 10 min + 5–30 min warten |
| 4 bezahlter Lauf bis Receipt | 60–90 min |
| Evidenz dokumentieren | 15 min |
| **Summe** | **ca. 3–4 h, mit Puffer ein Abend** |

Top-Fehlerquellen:
1. Sokosumi-Käuferseite (Approve des `masumiPayment`-Angebots) nicht live → Fallback 4.4 vorbereiten, bevor der Abend knapp wird.
2. Keine tUSDM beschaffbar (Dispenser braucht Verification-Code) → nur relevant für 4.4; früh klären.
3. Registrierung bleibt `RegistrationRequested`: Selling Wallet ohne ADA, Blockfrost-Key fürs falsche Netz, Job-Intervall. Erst registrieren, wenn die Faucet-ADA sichtbar ist.
4. `ENCRYPTION_KEY` geändert oder `docker compose down -v` → Wallets weg; Mnemonics aus `docker logs masumi-payment-setup` sichern (nur in `.local/`).
5. `MPS_URL`/Port (3001 vs. 38127) und Port-5432-Konflikt in WSL.
6. Zeitfenster: Modell-Lauf > 20 min nach Payment-Anlage → `Result deadline expired`; vorher `--offline`-Lauf messen, Prefilter auf ≤ 25 Notices.
7. Uhrzeit in WSL versetzt (Zeitfenster-Prüfungen des MPS) → `date -u` gegen eine Referenz prüfen.
8. MPS-Versionsdrift: Template-Kommentar bezieht sich auf einen bestimmten MPS-Build (`forceLayer`-Signatur); Compose pinnt 0.29.0. Bei `purchasePayload`-Fehlern Version notieren, nicht patchen.
9. Keine Secrets in Git: `.env`, `.local/`, Mnemonics, `docs/registration-state.json` enthält keine Secrets, aber `payment-state.json`/`registration-state.json` nur mit eigenen IDs committen.
10. Nach erfolgreichem T13 Payment-Pfad einfrieren (AGENTS.md).
