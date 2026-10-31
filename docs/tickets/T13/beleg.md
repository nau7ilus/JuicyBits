# T13 – Bezahlter Job auf Preprod, Beleg

Gemessen am Sa 31.10.2026, 01:38–02:45 CET, Cardano Preprod. Zeiten aus MPS-API, Blockfrost (Blockzeit), `sokosumi --preprod jobs get` und ngrok-Mitschnitt.

## Ergebnis
TenderScout ist als Masumi-Agent registriert und steht in der Sokosumi-Preprod-Galerie. Ein Sokosumi-Nutzer hat ihn mit 100 Credits (1 tUSDM) gebucht. Sokosumi hat 1 tUSDM im Escrow gesperrt, TenderScout hat geliefert, der Ergebnis-Hash steht on-chain und stimmt mit dem Bericht überein.
Auszahlung an die Selling Wallet: **ausstehend** (frühestens nach `unlockTime` 03:15:27, Abschnitt „Auszahlung“).

## Weg und warum
- Der Template-Weg (bezahlter Coworker-Task mit `masumiPayment`-Event) zahlt Sokosumi noch nicht. CLI-README 1.1.0: „Implementation and live seller proof remain pending.“
- Stattdessen: Masumi-Agent mit öffentlicher MIP-003-API. Sokosumi ist der Käufer, bucht über die Galerie (`agents hire`) und zahlt aus seiner eigenen Purchasing Wallet.
- Coworker `JUICY_BIDS` bleibt unbezahlt (`PAID_TASKS_ENABLED=false`).

## Umgebung
- Masumi Payment Service 0.29.0 und Registry Service 0.26.0 per `masumi-services-dev-quickstart` (Docker in Ubuntu), Ports nur auf `127.0.0.1`, MPS auf `127.0.0.1:38127`.
- MIP-003-API `agent-api.mjs` auf `127.0.0.1:21950`, öffentlich über ngrok: `https://nursing-surfacing-crucial.ngrok-free.dev`.
- Eve, Worker, API und ngrok laufen in der tmux-Sitzung `tenderscout`.
- Frische, projekteigene Ressourcen: eigene Payment-DB, eigene Selling und Purchasing Wallet, eigener wallet-gebundener Runtime-Key (`canPay`, kein Admin, nur Preprod).

## IDs
| Was | Wert |
|---|---|
| Payment Source (V2, Preprod) | `cmvvoz52k00043qo0annkuxmy`, Contract `addr_test1wzs4e6wc95hkwezlccjw9mdvq0r0rsgx6zk34avptga3ftgn37w4g` |
| Selling Wallet | `addr_test1qzu2tvcjw02rx2v0qu9w9685rd4yld8a8wnkmv7f8707372dxevnevt2892fv2yqp4x40amq655fawu9hhx9vrrymfrsees0gh` |
| Registrierung (MPS) | `cmvvpsl3u000g01rtfk7o74b5`, Autor `JuicyBits`, Festpreis 1 tUSDM |
| `agentIdentifier` | `67ab0c92c4ac1610895a1c965ee50aba41a8f1513b15240723b3bd0b10d4c05ad26cee0122a06fd33fe15ef9c8764424b4feedc58eab5ee852000000` |
| Sokosumi-Agent | `01a18f8f-7091-74ae-88a7-8b4856955f83` (100 Credits) |
| Sokosumi-Job | `01a18f9c-a001-7131-8f2e-e07480950460` |
| MIP-003-Job (lokal) | `a2f61167-9885-4a90-a64b-358a75608020` |
| Käufer (Sokosumi, Lock-Inputs) | `addr_test1qz2aac04ekm83yyy6d0wwah870939s52a3d704saq7fqagm606t6gx6v3cg7sy9g652dvg2v5qf3mdmz0d9vl77shr6s0h5dsg` |

## Transaktionen (Preprod)
| Schritt | Tx-Hash | Blockzeit (CET) | Block |
|---|---|---|---|
| Registrierung (NFT-Mint) | `beb3b3b464e4e80d740bf122397c4d51011bbf65edf70f7fc1fe39db2ba0bff7` | 02:21:44 | 5355250 |
| Umbuchung Selling → Purchasing (30 tADA, 5 tUSDM; nur für den Ersatzweg) | `67404bb0dd3fbf6d61b88662e616dfe934cab2e662e4f38de2f842e750c251f3` | 02:32:18 | 5355278 |
| FundsLocked (Sokosumi sperrt 1 tUSDM im Contract) | `92e32c3194fbac1c52c5c813c5f1fdd985e28d4ae3575331bb6efd36ae6ebb79` | 02:41:25 | 5355308 |
| ResultSubmitted (Ergebnis-Hash on-chain) | `e3bfe72f48d969287ccd72374a51f7b72823c38d2ddd6d53a52c5e967abf2c01` | 02:43:38 | 5355314 |
| Withdraw an Selling Wallet | ausstehend | – | – |

## Ablauf
| Zeit (CET) | Ereignis |
|---|---|
| 02:20:46 | `POST /registry` → `RegistrationRequested` |
| 02:21:53 | `RegistrationConfirmed` (ca. 1 min) |
| 02:24:30 | erster Registry-Health-Check `GET /availability` von außen, danach etwa alle 2 min |
| 02:25:04 | Sokosumi importiert TenderScout in die Galerie (Sync alle 5 min) |
| 02:39:25 | `sokosumi --preprod agents hire … --input-file … --max-credits 100` mit Firmenpass P3; Sokosumi ruft `/input_schema` und `/start_job` |
| 02:41:25 | Lock-Tx im Block; 02:41:53 erkennt der MPS `FundsLocked`, Modelllauf startet |
| 02:43:38 | Submit-Result-Tx im Block; 02:44:15 bestätigt, Job lokal `completed` |
| 02:44:32 | Sokosumi holt `/status` mit Ergebnis ab, Job `completed` |

Zeitfenster: `payByTime` 02:49:27, `submitResultTime` 02:59:27, `unlockTime` 03:15:27, `externalDisputeUnlockTime` 03:31:27.

## Hashes
- `inputHash` `c8be72c1a18687734e6ef2014c59db3f4a9a4a6f5b6c117f26f9d9306e99e98e`
- `resultHash` on-chain `aa1beef463d049640701fc5448c2a5bd4d4704e24e0526f2f1171d288bd40104`, gleich dem Hash im Job und gleich dem neu berechneten Hash des gelieferten Berichts.
- Formel wie Sokosumi `hashResult`: `sha256(identifierFromPurchaser + ";" + JSON.stringify(result).slice(1,-1))` (`standard-hash.mjs`).

## Gelieferter Bericht
`p3-isarcode-paid-report.md` (23.463 Zeichen, bei Sokosumi und lokal gleich lang): 0 GO, 12 GO MIT AUFLAGE, 25 Kandidaten geprüft, 13 NO-GO. Die Landtagsverwaltung (B5) liegt bei 68 und damit knapp unter der GO-Schwelle 70. In T12 waren es 75; bekannte Streuung 69–77 (STAND.md).

## Auszahlung
Ausstehend. Prüfung: `npm run receipt -- a2f61167-9885-4a90-a64b-358a75608020` (bestätigte Withdraw-Tx im MPS, Blockfrost-UTxOs, Netto-tUSDM an der Selling Wallet).

## Befunde
- Die CLI listet nur die ersten 20 Agenten (`agents list`, keine Seitenwahl). TenderScout war deshalb nicht zu sehen, obwohl er in der Galerie stand. Vollständige Liste: `curl -s "https://api.preprod.sokosumi.com/v1/agents?limit=100&kind=cardano"`.
- Sokosumi fragt `/status` einmal pro Minute ab. Zwischen unserem `completed` und Sokosumis `completed` liegen deshalb bis zu 60 s.
- Der Coworker-Bezahlweg in `paid-task.mjs` sendet `RequestedFunds`, das MPS bei Festpreis ablehnt. Er ist abgeschaltet und wird nach T13 nicht mehr angefasst.
- Ersatzweg `npm run buy` (eigener MPS als Käufer) ist gebaut, aber nicht live gelaufen.
